import * as THREE from 'three';
import {BARRICADES, AREAS, F2} from '../map/kestrel.js';
import {inRect} from '../map/geometry.js';

export const BOARDS = 6;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

// Board state for every boarded window/fence gap/balcony end, plus the matching
// nav portal (outside -> inside) zombies use to break in.
export class Barricades {
  constructor(world, nav, visuals) {
    this.world = world; this.nav = nav; this.visuals = visuals; this.list = []; this.byId = new Map();
    this.mesh = visuals.boardMesh; this.anims = [];
    const m = new THREE.Matrix4();
    for (const b of BARRICADES) {
      const o = world.barricadeOpenings.get(b.id), vis = visuals.barricades.get(b.id); if (!o || !vis) continue;
      const area = AREAS.find(a => a.id === b.area), floorH = area.floor ? F2 : 0;
      const [x0, y0, x1, y1] = o.rect, horiz = (x1 - x0) > (y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      // Normal pointing into the barricade's own area.
      let n = horiz ? [0, 1] : [1, 0];
      if (!inRect(area.rect, cx + n[0] * .9, cy + n[1] * .9)) n = [-n[0], -n[1]];
      const inside = [cx + n[0] * .8, cy + n[1] * .8], outside = [cx - n[0] * .9, cy - n[1] * .9];
      const outsideH = b.rail || area.floor ? 0 : floorH;
      const bar = {
        id: b.id, data: b, area: b.area, floor: area.floor, floorH, center: [cx, cy], normal: n, inside, outside, outsideH,
        sill: Math.max(0, o.zb - floorH), climb: floorH - outsideH, boards: BOARDS, slots: vis.indices.map(i => ({i, base: mesh(this.mesh, i, m.clone()), on: true})),
        occupant: null, lastHit: 0,
      };
      const inN = nav.nodeAt(inside[0], inside[1], floorH, 3), outN = nav.nodeAt(outside[0], outside[1], outsideH, 3);
      if (inN >= 0 && outN >= 0) { bar.portal = nav.addPortal({from: outN, to: inN, bar, reverse: false}); bar.portalBack = nav.addPortal({from: inN, to: outN, bar, reverse: true}); }
      else console.warn('barricade without nav portal', b.id, inN, outN);
      this.list.push(bar); this.byId.set(b.id, bar);
    }
  }
  // Rip one board off (zombie). Returns true if a board came off.
  tear(bar) {
    const s = [...bar.slots].reverse().find(s => s.on); if (!s) return false;
    s.on = false; bar.boards--;
    const dir = new THREE.Vector3(-bar.normal[0], 0, bar.normal[1]);
    this.anims.push({s, t: 0, dur: .55, kind: 'tear', dir, spin: (Math.random() - .5) * 6});
    return true;
  }
  // Nail one board back on (player). Returns true if a board was added.
  rebuild(bar) {
    const s = bar.slots.find(s => !s.on); if (!s) return false;
    s.on = true; bar.boards++;
    const dir = new THREE.Vector3(bar.normal[0], 0, -bar.normal[1]);
    this.anims = this.anims.filter(a => a.s !== s);
    this.anims.push({s, t: 0, dur: .28, kind: 'build', dir});
    return true;
  }
  update(dt) {
    if (!this.anims.length) return;
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), e = new THREE.Euler();
    for (let k = this.anims.length - 1; k >= 0; k--) {
      const a = this.anims[k]; a.t = Math.min(1, a.t + dt / a.dur);
      a.s.base.decompose(p, q, sc);
      if (a.kind === 'tear') {
        if (a.t >= 1) { this.mesh.setMatrixAt(a.s.i, HIDDEN); this.anims.splice(k, 1); continue; }
        const t = a.t; p.addScaledVector(a.dir, t * 1.3); p.y += t * .5 - t * t * 1.6;
        q.multiply(new THREE.Quaternion().setFromEuler(e.set(t * a.spin, t * a.spin * .5, 0)));
      } else {
        const t = 1 - (1 - a.t) ** 3; p.addScaledVector(a.dir, (1 - t) * .9);
        if (a.t >= 1) this.anims.splice(k, 1);
      }
      m.compose(p, q, sc); this.mesh.setMatrixAt(a.s.i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  reset() { for (const b of this.list) { b.boards = BOARDS; for (const s of b.slots) { s.on = true; this.mesh.setMatrixAt(s.i, s.base); } } this.anims = []; this.mesh.instanceMatrix.needsUpdate = true; }
}
function mesh(instanced, i, m) { instanced.getMatrixAt(i, m); return m; }
