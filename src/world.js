import {WALLS, FLOORS, RAMPS, RAILS, DOORS, OBSTACLES, FENCES, AREAS, BARRICADES} from './map/kestrel.js';
import {wallPieces, wallFrame, wallRect, toWorldBox} from './map/geometry.js';

export const PLAYER = 1, BULLET = 2, BOTH = 3;
const CELL = 4;

// Collision + walkable-surface model for a two-floor map.
// Colliders are AABBs in world space (X, Y up, Z = -planY).
export class World {
  constructor() {
    this.colliders = []; this.grid = new Map(); this.surfaces = [];
    this.doorOpenings = new Map(); this.barricadeOpenings = new Map();
    this.build();
  }
  key(i, j) { return i * 73856093 ^ j * 19349663; }
  add(box, flags = BOTH, tag = null) {
    const c = {...box, flags, tag, id: this.colliders.length};
    this.colliders.push(c);
    for (let i = Math.floor(c.minX / CELL); i <= Math.floor(c.maxX / CELL); i++)
      for (let j = Math.floor(c.minZ / CELL); j <= Math.floor(c.maxZ / CELL); j++) {
        const k = this.key(i, j); if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(c);
      }
    return c;
  }
  removeTag(tag) { for (const c of this.colliders) if (c.tag === tag) c.disabled = true; }
  near(x, z, r) {
    const out = new Set();
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const list = this.grid.get(this.key(i, j)); if (list) for (const c of list) if (!c.disabled) out.add(c);
      }
    return out;
  }
  build() {
    for (const wall of WALLS) {
      const {solids, openings} = wallPieces(wall);
      for (const s of solids) this.add(toWorldBox(s.rect, s.zb, s.zt), BOTH, 'wall');
      for (const o of openings) {
        if (o.kind === 'window') { this.barricadeOpenings.set(o.barricade, {...o, wall}); this.add(toWorldBox(o.rect, o.zb, o.zt), PLAYER, 'window:' + o.barricade); }
        if (o.kind === 'door') { this.doorOpenings.set(o.door, {...o, wall}); }
      }
    }
    for (const fence of FENCES) {
      const f = wallFrame({...fence, t: .12});
      const cuts = [f.u0, ...fence.gaps.flatMap(g => [g.at - g.w / 2, g.at + g.w / 2]), f.u1];
      for (let i = 0; i < cuts.length; i += 2) this.add(toWorldBox(wallRect(f, cuts[i], cuts[i + 1], .2), 0, fence.h + .4), PLAYER, 'fence');
      for (const g of fence.gaps) {
        const rect = wallRect(f, g.at - g.w / 2, g.at + g.w / 2, .2);
        this.barricadeOpenings.set(g.barricade, {rect, zb: 0, zt: fence.h, fence: true, frame: f, at: g.at, w: g.w});
        this.add(toWorldBox(rect, 0, fence.h + .4), PLAYER, 'window:' + g.barricade);
      }
    }
    for (const b of BARRICADES) if (b.rail) {
      const [x, y] = b.rail; const rect = [x - .08, y - 1.5, x + .08, y + 1.5];
      this.barricadeOpenings.set(b.id, {rect, zb: 3.8, zt: 3.8 + 1.1, rail: true, at: y, w: 3});
      this.add(toWorldBox(rect, 3.8, 3.8 + 2.2), PLAYER, 'window:' + b.id);
    }
    for (const r of RAILS) this.add(toWorldBox(r.rect, r.base, r.base + r.h), r.full ? BOTH : PLAYER, 'rail');
    for (const o of OBSTACLES) { const b = o.floor ? 3.8 : 0; this.add(toWorldBox(o.rect, b, b + o.h), BOTH, 'obstacle:' + o.id); }
    for (const d of DOORS) {
      const box = this.doorBox(d);
      if (box) d.collider = this.add(box, BOTH, 'door:' + d.id);
    }
    for (const fl of FLOORS) {
      const [x0, y0, x1, y1] = fl.rect;
      this.surfaces.push({minX: x0, maxX: x1, minZ: -y1, maxZ: -y0, h: fl.h, bottom: fl.fromGround ? 0 : fl.h - (fl.thin ? .2 : .35)});
      this.add(toWorldBox(fl.rect, fl.fromGround ? 0 : fl.h - (fl.thin ? .2 : .35), fl.h), BULLET, 'floor');
    }
    for (const r of RAMPS) {
      const [x0, y0, x1, y1] = r.rect;
      this.surfaces.push({minX: x0, maxX: x1, minZ: -y1, maxZ: -y0, ramp: true, low: r.low, high: r.high, h: r.h, bottom: 0});
      this.add(toWorldBox(r.rect, 0, r.h * .5), BULLET, 'ramp');
    }
  }
  doorBox(d) {
    if (d.debris) return toWorldBox(d.debris, 0, 2.3);
    const o = [...this.doorOpenings.values()].find(o => o.door === d.id);
    if (!o) return null;
    d.opening = o;
    return toWorldBox(o.rect, o.zb, o.zt);
  }
  openDoor(d) { this.removeTag('door:' + d.id); d.open = true; }
  surfaceHeight(s, x) {
    if (!s.ramp) return s.h;
    const t = Math.max(0, Math.min(1, (x - s.low) / (s.high - s.low)));
    return t * s.h;
  }
  groundAt(x, z, feet, step = .5) {
    let g = 0;
    for (const s of this.surfaces) {
      if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
      const h = this.surfaceHeight(s, x);
      if (h <= feet + step && h > g) g = h;
    }
    return g;
  }
  blocked(x, z, feet, r, step = .45, height = 1.78) {
    const lo = feet + step, hi = feet + height;
    for (const c of this.near(x, z, r + .1)) {
      if (!(c.flags & PLAYER)) continue;
      if (c.maxY <= lo || c.minY >= hi) continue;
      const cx = Math.max(c.minX, Math.min(x, c.maxX)), cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
    }
    for (const s of this.surfaces) {
      const cx = Math.max(s.minX, Math.min(x, s.maxX)), cz = Math.max(s.minZ, Math.min(z, s.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 >= r * r) continue;
      const top = this.surfaceHeight(s, cx);
      if (top <= lo || s.bottom >= hi) continue;
      // Stepping onto a surface is fine if its height at our own position is reachable.
      if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && this.surfaceHeight(s, x) <= lo) continue;
      return true;
    }
    return false;
  }
  raycast(o, d, max, mask = BULLET) {
    let best = null;
    for (const c of this.colliders) {
      if (c.disabled || !(c.flags & mask)) continue;
      let near = 0, far = max, axis = -1, sign = 0;
      const mins = [c.minX, c.minY, c.minZ], maxs = [c.maxX, c.maxY, c.maxZ], os = [o.x, o.y, o.z], ds = [d.x, d.y, d.z];
      let miss = false;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(ds[i]) < 1e-9) { if (os[i] < mins[i] || os[i] > maxs[i]) { miss = true; break; } continue; }
        let a = (mins[i] - os[i]) / ds[i], b = (maxs[i] - os[i]) / ds[i], s = -1;
        if (a > b) { [a, b] = [b, a]; s = 1; }
        if (a > near) { near = a; axis = i; sign = s; }
        far = Math.min(far, b); if (near > far) { miss = true; break; }
      }
      if (miss || near > max) continue;
      if (!best || near < best.distance) {
        const normal = {x: 0, y: 0, z: 0}; if (axis >= 0) normal[['x', 'y', 'z'][axis]] = sign;
        best = {distance: near, normal, collider: c};
      }
    }
    return best;
  }
  areaAt(x, z, feet) {
    const floor = feet > 2 ? 1 : 0, y = -z;
    for (const a of AREAS) {
      if (a.floor !== floor) continue;
      const [x0, y0, x1, y1] = a.rect;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return a;
    }
    return null;
  }
}
