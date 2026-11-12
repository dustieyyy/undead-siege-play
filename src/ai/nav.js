import {F2} from '../map/kestrel.js';

// Two-layer navigation grid (ground + upper floor) sampled from the collision world,
// plus "portals" for barricaded windows. A Dijkstra flow field is grown from the
// player so every zombie can read its next step in O(1).
export const CELL = .5;
const X0 = -22, Y0 = -24, X1 = 62, Y1 = 24, RADIUS = .3, MAX_DH = .62;
const SQ2 = Math.SQRT2;

export class NavGrid {
  constructor(world) {
    this.world = world;
    this.W = Math.round((X1 - X0) / CELL); this.H = Math.round((Y1 - Y0) / CELL); this.N = this.W * this.H;
    const total = this.N * 2;
    this.walk = new Uint8Array(total); this.h = new Float32Array(total);
    this.dist = new Float32Array(total).fill(Infinity); this.parent = new Int32Array(total).fill(-1);
    this.via = new Int16Array(total).fill(-1); // portal index used to step from this node toward the player
    this.portals = []; this.portalsTo = new Map();
    this.heap = new Heap(total);
    this.ramps = world.surfaces.filter(s => s.ramp);
    this.sample(0, 0, this.W, this.H);
    this.version = 0;
  }
  // --- coordinates (plan x/y; world z = -y)
  cellOf(x, y) { return [Math.floor((x - X0) / CELL), Math.floor((y - Y0) / CELL)]; }
  index(i, j, layer) { return layer * this.N + j * this.W + i; }
  center(n) { const c = n % this.N, i = c % this.W, j = (c / this.W) | 0; return [X0 + (i + .5) * CELL, Y0 + (j + .5) * CELL]; }
  layerOf(n) { return n >= this.N ? 1 : 0; }
  rampHeight(x, z) {
    for (const s of this.ramps) if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) return this.world.surfaceHeight(s, x);
    return 0;
  }
  sample(i0, j0, i1, j1) {
    const w = this.world;
    for (let j = Math.max(0, j0); j < Math.min(this.H, j1); j++) for (let i = Math.max(0, i0); i < Math.min(this.W, i1); i++) {
      const x = X0 + (i + .5) * CELL, y = Y0 + (j + .5) * CELL, z = -y;
      const a = this.index(i, j, 0), b = this.index(i, j, 1);
      const h0 = this.rampHeight(x, z);
      this.h[a] = h0; this.walk[a] = w.blocked(x, z, h0, RADIUS) ? 0 : 1;
      const h1 = w.groundAt(x, z, F2, .5);
      this.h[b] = h1; this.walk[b] = h1 >= 3 && !w.blocked(x, z, h1, RADIUS) ? 1 : 0;
    }
    this.version++;
  }
  // Re-sample a plan rect after a door/debris opens.
  refreshRect([x0, y0, x1, y1], pad = 1) {
    const [i0, j0] = this.cellOf(Math.min(x0, x1) - pad, Math.min(y0, y1) - pad), [i1, j1] = this.cellOf(Math.max(x0, x1) + pad, Math.max(y0, y1) + pad);
    this.sample(i0, j0, i1 + 1, j1 + 1);
  }
  // Nearest walkable node to a plan point at height y (searches outward a few rings).
  nodeAt(x, y, height, maxRing = 3) {
    const [ci, cj] = this.cellOf(x, y);
    let best = -1, bestD = Infinity;
    for (let r = 0; r <= maxRing; r++) {
      for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || i < 0 || j < 0 || i >= this.W || j >= this.H) continue;
        for (let l = 0; l < 2; l++) {
          const n = this.index(i, j, l); if (!this.walk[n]) continue;
          const dh = Math.abs(this.h[n] - height); if (dh > 1.2) continue;
          const [cx, cy] = this.center(n); const d = (cx - x) ** 2 + (cy - y) ** 2 + dh * dh * 4;
          if (d < bestD) { bestD = d; best = n; }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  // Portal: a zombie standing on `from` can cross the barricade to `to` (one step closer to the player).
  addPortal(p) { p.index = this.portals.length; this.portals.push(p); if (!this.portalsTo.has(p.to)) this.portalsTo.set(p.to, []); this.portalsTo.get(p.to).push(p); return p; }
  // Dijkstra from the player's node outward. parent[n] = next node toward the player.
  flow(source, portalCost) {
    const {dist, parent, via, walk, h, W, H, N, heap} = this;
    dist.fill(Infinity); parent.fill(-1); via.fill(-1);
    if (source < 0) return;
    dist[source] = 0; heap.clear(); heap.push(source, 0);
    while (heap.size) {
      const u = heap.pop(), du = dist[u]; if (heap.lastKey > du) continue;
      const l = u >= N ? 1 : 0, c = u - l * N, i = c % W, j = (c / W) | 0, hu = h[u];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        for (let nl = 0; nl < 2; nl++) {
          const v = nl * N + nj * W + ni; if (!walk[v] || Math.abs(h[v] - hu) > MAX_DH) continue;
          if (di && dj) { // no corner cutting
            const a = j * W + ni, b = nj * W + i;
            if (!(walk[a] && Math.abs(h[a] - hu) < MAX_DH || walk[N + a] && Math.abs(h[N + a] - hu) < MAX_DH)) continue;
            if (!(walk[b] && Math.abs(h[b] - hu) < MAX_DH || walk[N + b] && Math.abs(h[N + b] - hu) < MAX_DH)) continue;
          }
          const nd = du + (di && dj ? SQ2 : 1) * CELL;
          if (nd < dist[v]) { dist[v] = nd; parent[v] = u; via[v] = -1; heap.push(v, nd); }
        }
      }
      // Same cell on the other layer (ramp cells exist on both).
      const o = l ? u - N : u + N;
      if (walk[o] && Math.abs(h[o] - hu) < .05 && du < dist[o]) { dist[o] = du; parent[o] = u; via[o] = -1; heap.push(o, du); }
      const ps = this.portalsTo.get(u);
      if (ps) for (const p of ps) {
        const nd = du + portalCost(p); const v = p.from;
        if (nd < dist[v]) { dist[v] = nd; parent[v] = u; via[v] = p.index; heap.push(v, nd); }
      }
    }
  }
}

// Binary min-heap keyed by float priority (duplicates allowed; stale entries skipped by caller cost check).
class Heap {
  constructor(cap) { this.items = new Int32Array(cap * 4); this.keys = new Float32Array(cap * 4); this.size = 0; }
  clear() { this.size = 0; }
  push(item, key) {
    if (this.size >= this.items.length) { const a = new Int32Array(this.items.length * 2); a.set(this.items); this.items = a; const k = new Float32Array(this.keys.length * 2); k.set(this.keys); this.keys = k; }
    let i = this.size++; const it = this.items, ks = this.keys;
    while (i > 0) { const p = (i - 1) >> 1; if (ks[p] <= key) break; it[i] = it[p]; ks[i] = ks[p]; i = p; }
    it[i] = item; ks[i] = key;
  }
  pop() {
    const it = this.items, ks = this.keys, top = it[0], topKey = ks[0], last = it[--this.size], lk = ks[this.size];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1; if (c >= this.size) break;
      if (c + 1 < this.size && ks[c + 1] < ks[c]) c++;
      if (ks[c] >= lk) break;
      it[i] = it[c]; ks[i] = ks[c]; i = c;
    }
    it[i] = last; ks[i] = lk; this.lastKey = topKey; return top;
  }
}
