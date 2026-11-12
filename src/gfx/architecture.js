import * as THREE from 'three';
import {WALLS, FLOORS, RAMPS, RAILS, AREAS, FENCES, F2, UPPER_TOP, HANGAR_WALL, HANGAR_PEAK} from '../map/kestrel.js';
import {wallPieces, inRect} from '../map/geometry.js';

// Helpers: plan rect -> world box via batcher.
export const rbox = (B, mat, rect, y0, y1, o = {}) => {
  const [x0, p0, x1, p1] = rect;
  return B.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, -(p0 + p1) / 2, Math.abs(x1 - x0), y1 - y0, Math.abs(p1 - p0), {world: true, ...o});
};

function indoorSide(wall, f, side) {
  const floor = (wall.base ?? 0) > 1 ? 1 : 0, mid = (f.u0 + f.u1) / 2;
  const [x, y] = f.horizontal ? [mid, f.c + side * .6] : [f.c + side * .6, mid];
  return AREAS.some(a => !a.outdoor && a.floor === floor && inRect(a.rect, x, y));
}

export function buildWalls(B) {
  for (const wall of WALLS) {
    const {frame: f, solids, openings} = wallPieces(wall);
    const plus = indoorSide(wall, f, 1), minus = indoorSide(wall, f, -1);
    const split = wall.inner && plus !== minus;
    for (const s of solids) {
      if (!split) { rbox(B, plus && minus && wall.inner ? wall.inner : wall.mat, s.rect, s.zb, s.zt); continue; }
      // Two layers: outer material outside, inner (painted) inside.
      const [x0, y0, x1, y1] = s.rect, t = f.t;
      const innerSide = plus ? 1 : -1;
      const half = (lo, hi) => f.horizontal ? [x0, lo, x1, hi] : [lo, y0, hi, y1];
      const c = f.c;
      const outerR = innerSide > 0 ? half(c - t / 2, c + t / 2 - .06) : half(c - t / 2 + .06, c + t / 2);
      const innerR = innerSide > 0 ? half(c + t / 2 - .06, c + t / 2) : half(c - t / 2, c - t / 2 + .06);
      rbox(B, wall.mat, outerR, s.zb, s.zt);
      // Inner skin is inset at the ends so it doesn't poke out at corners.
      const inset = r => f.horizontal ? [r[0] + .001, r[1], r[2] - .001, r[3]] : [r[0], r[1] + .001, r[2], r[3] - .001];
      rbox(B, wall.inner, inset(innerR), s.zb + .001, s.zt - .001);
    }
    for (const o of openings) decorateOpening(B, wall, f, o);
    // Plinth / skirting strip outside the bunker.
    if (wall.mat === 'concrete' && (wall.base ?? 0) === 0) {
      const r = f.horizontal ? [f.u0, f.c - .28, f.u1, f.c + .28] : [f.c - .28, f.u0, f.c + .28, f.u1];
      rbox(B, 'concreteDark', r, 0, .35);
    }
  }
}

function decorateOpening(B, wall, f, o) {
  const along = (u0, u1, thick, c = f.c) => f.horizontal ? [u0, c - thick / 2, u1, c + thick / 2] : [c - thick / 2, u0, c + thick / 2, u1];
  const t = f.t + .04;
  if (o.kind === 'window') {
    // Timber frame + protruding sill + concrete lintel.
    rbox(B, 'woodDark', along(o.u0, o.u0 + .09, t), o.zb, o.zt);
    rbox(B, 'woodDark', along(o.u1 - .09, o.u1, t), o.zb, o.zt);
    rbox(B, 'woodDark', along(o.u0 - .05, o.u1 + .05, t + .14), o.zb - .06, o.zb + .02);
    if (wall.mat !== 'hangar') rbox(B, 'concreteDark', along(o.u0 - .15, o.u1 + .15, f.t + .06), o.zt, o.zt + .16);
    else rbox(B, 'rust', along(o.u0 - .1, o.u1 + .1, f.t + .06), o.zt, o.zt + .08);
  } else if (o.kind === 'obs') {
    rbox(B, 'concreteDark', along(o.u0 - .1, o.u1 + .1, f.t + .16), o.zb - .08, o.zb);
    rbox(B, 'concreteDark', along(o.u0 - .1, o.u1 + .1, f.t + .1), o.zt, o.zt + .14);
  } else if (o.kind === 'door' || o.kind === 'open') {
    const mat = wall.mat === 'plank' ? 'woodDark' : 'darkSteel';
    rbox(B, mat, along(o.u0 - .06, o.u0 + .04, t), o.zb, o.zt + .06);
    rbox(B, mat, along(o.u1 - .04, o.u1 + .06, t), o.zb, o.zt + .06);
    rbox(B, mat, along(o.u0 - .06, o.u1 + .06, t), o.zt, o.zt + .1);
    if (o.zb === (wall.base ?? 0)) rbox(B, 'concreteDark', along(o.u0, o.u1, f.t + .02), o.zb, o.zb + .02);
  }
}

export function buildFloors(B) {
  // Ground interior floors (top at y=0, the ground plane sits slightly below).
  const g = [[AREAS[0].rect, 'concreteFloor'], [AREAS[1].rect, 'woodFloor'], [AREAS[2].rect, 'plankFloor'], [AREAS[3].rect, 'concreteFloor'], [AREAS[5].rect, 'concreteFloor']];
  for (const [rect, mat] of g) rbox(B, mat, rect, -.06, 0, {shadow: false});
  for (const fl of FLOORS) {
    if (fl.fromGround) { rbox(B, fl.rect[0] > 20 ? 'metalGray' : 'concrete', fl.rect, 0, fl.h - .04); rbox(B, fl.mat, fl.rect, fl.h - .04, fl.h); continue; }
    if (fl.mat === 'grating') {
      rbox(B, 'grating', fl.rect, fl.h - .03, fl.h, {shadow: true});
      const [x0, y0, x1, y1] = fl.rect;
      // Stringers under the grating
      rbox(B, 'darkSteel', [x0, y0, x1, y0 + .12], fl.h - .3, fl.h - .03);
      rbox(B, 'darkSteel', [x0, y1 - .12, x1, y1], fl.h - .3, fl.h - .03);
      for (let x = x0 + .5; x < x1; x += 1.2) rbox(B, 'darkSteel', [x, y0, x + .08, y1], fl.h - .2, fl.h - .03);
      continue;
    }
    if (fl.thin) {
      rbox(B, fl.mat, fl.rect, fl.h - .06, fl.h);
      const [x0, y0, x1, y1] = fl.rect;
      if (fl.mat === 'plankFloor') { // timber joists + steel beam under loft
        for (let x = x0 + .3; x < x1; x += .9) rbox(B, 'woodDark', [x, y0, x + .1, y1], fl.h - .26, fl.h - .06);
        rbox(B, 'darkSteel', [x0, y0, x1, y0 + .25], fl.h - .5, fl.h - .06);
      } else rbox(B, 'concrete', fl.rect, fl.h - .22, fl.h - .06);
      continue;
    }
    rbox(B, fl.mat, fl.rect, fl.h - .04, fl.h);
    rbox(B, 'concrete', fl.rect, fl.h - .35, fl.h - .04);
  }
  // Ceiling beams under the bunker slab (ground floor) and roof (upper floor).
  for (let y = 2; y < 12; y += 2.5) {
    rbox(B, 'concrete', [-10, y, 16, y + .35], F2 - .7, F2 - .35);
    rbox(B, 'woodDark', [-10, y, 16, y + .25], UPPER_TOP - .3, UPPER_TOP);
  }
}

export function buildStairs(B) {
  for (const r of RAMPS) {
    const [x0, y0, x1, y1] = r.rect, dir = Math.sign(r.high - r.low), n = 20, run = Math.abs(r.high - r.low) / n;
    const steel = r.id !== 'ops-stairs';
    for (let i = 0; i < n; i++) {
      const xa = r.low + dir * i * run, xb = xa + dir * run, top = (i + 1) * r.h / n;
      const rect = [Math.min(xa, xb), y0, Math.max(xa, xb), y1];
      if (!steel) { rbox(B, 'concrete', rect, 0, top); rbox(B, 'concreteDark', [rect[0], y0, rect[2], y1], top - .03, top); }
      else {
        rbox(B, 'grating', rect, top - .04, top);
        rbox(B, 'rust', [Math.min(xa, xb), y0, Math.min(xa, xb) + .05, y1], top - .08, top); // nosing
        // Sheet skirting under the treads on the open side so the stair reads as solid.
        rbox(B, 'hangar', [rect[0], y0 - .02, rect[2], y0 + .02], 0, top - .04);
      }
    }
    if (steel) {
      // Stringers along both sides (sloped boxes).
      const len = Math.hypot(Math.abs(r.high - r.low), r.h), ang = Math.atan2(r.h, r.high - r.low);
      for (const yy of [y0 + .05, y1 - .05]) B.box('darkSteel', (r.low + r.high) / 2, r.h / 2, -yy, len, .25, .08, {rz: ang, order: 'XYZ'});
    }
  }
}

// Iron railings: posts + rails. Rails that run along a ramp follow its slope.
export function buildRails(B) {
  const rampAt = (x, y) => {
    for (const r of RAMPS) {
      const [x0, y0, x1, y1] = r.rect;
      if (x < x0 - .01 || x > x1 + .01 || y < y0 - .3 || y > y1 + .3) continue;
      return Math.max(0, Math.min(1, (x - r.low) / (r.high - r.low))) * r.h;
    }
    return null;
  };
  for (const r of RAILS) {
    const [x0, y0, x1, y1] = r.rect, horiz = (x1 - x0) > (y1 - y0);
    const len = horiz ? x1 - x0 : y1 - y0, n = Math.max(2, Math.ceil(len / 1.2) + 1);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x = horiz ? x0 + t * (x1 - x0) : (x0 + x1) / 2, y = horiz ? (y0 + y1) / 2 : y0 + t * (y1 - y0);
      const base = r.full ? (rampAt(x, y) ?? 0) : r.base;
      pts.push([x, y, base]);
      B.box('darkSteel', x, base + .5, -y, .05, 1, .05);
    }
    for (let i = 0; i < n - 1; i++) {
      const [ax, ay, ab] = pts[i], [bx, by, bb] = pts[i + 1];
      const dx = bx - ax, dy = by - ay, dz = bb - ab, hl = Math.hypot(dx, dy), l = Math.hypot(hl, dz);
      const pitch = Math.atan2(dz, hl);
      for (const hgt of [1.0, .5]) B.box('steel', (ax + bx) / 2, (ab + bb) / 2 + hgt, -(ay + by) / 2, l, .05, .05, {ry: Math.atan2(dy, dx), rz: pitch, order: 'YZX'});
    }
  }
}

function archGeometry(x0, x1, phiA, phiB, segs, R, cy, cyPlan, inner = false) {
  const pos = [], nor = [], uv = [];
  for (let i = 0; i < segs; i++) {
    const a = phiA + (phiB - phiA) * i / segs, b = phiA + (phiB - phiA) * (i + 1) / segs;
    const pa = [Math.sin(a), Math.cos(a)], pb = [Math.sin(b), Math.cos(b)];
    const quad = [[x0, pa], [x1, pa], [x1, pb], [x0, pa], [x1, pb], [x0, pb]];
    for (const [x, [s, c]] of quad) {
      pos.push(x, cy + R * c, -(cyPlan + R * s)); nor.push(0, c, -s);
      uv.push(x / 2, (R * Math.atan2(s, c)) / 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export const HANGAR_ARCH = (() => {
  const y0 = -8.2, y1 = 14.2, chord = y1 - y0, rise = HANGAR_PEAK - HANGAR_WALL;
  const R = ((chord / 2) ** 2 + rise ** 2) / (2 * rise), cyPlan = (y0 + y1) / 2, cy = HANGAR_PEAK - R, alpha = Math.asin((chord / 2) / R);
  return {R, cyPlan, cy, alpha};
})();

export function buildRoofs(B) {
  // Bunker roof slab + parapet + vents
  rbox(B, 'concrete', [-10.2, -.2, 16.2, 12.2], UPPER_TOP, UPPER_TOP + .28);
  rbox(B, 'roofFelt', [-10, 0, 16, 12], UPPER_TOP + .28, UPPER_TOP + .3, {shadow: false});
  for (const r of [[-10.2, -.2, 16.2, .05], [-10.2, 11.95, 16.2, 12.2], [-10.2, -.2, -9.95, 12.2], [15.95, -.2, 16.2, 12.2]]) rbox(B, 'concrete', r, UPPER_TOP + .28, UPPER_TOP + .85);
  // Balcony canopy beam supports (concrete brackets under balcony)
  for (const x of [2.3, 8, 13.7]) rbox(B, 'concrete', [x - .2, -2.9, x + .2, 0], F2 - .7, F2 - .2);
  // Depot roof
  rbox(B, 'concrete', [15.8, -8.2, 25.8, 4.2], 3.6, 3.82);
  rbox(B, 'roofFelt', [16, -8, 25.8, 4], 3.82, 3.84, {shadow: false});
  rbox(B, 'brick', [15.8, -8.2, 25.8, -8], 3.6, 4.1); rbox(B, 'brick', [15.8, -8.2, 16, 4.2], 3.6, 4.1);
  // Covered walkway: corrugated roof on timber posts (sloped toward the north).
  B.box('hangarRoof', 21, 3.25, -6.05, 10.2, .05, 4.6, {rx: -.06, order: 'XYZ'});
  for (const x of [16.6, 21, 25.4]) for (const y of [4.25, 7.75]) B.box('woodDark', x, 1.6, -y, .18, 3.2, .18);
  for (const y of [4.25, 7.75]) B.box('woodDark', 21, 3.08, -y, 9.6, .2, .16);
  // Hangar arch with a few torn-out panels (moonlight pours through via the shadow map).
  const {R, cyPlan, cy, alpha} = HANGAR_ARCH;
  const holes = [[5, 12, 15], [8, 4, 7], [10, 15, 17], [3, 6, 8]];
  const strips = 13, xs = 25.8, xe = 52.2, segs = 24;
  for (let s = 0; s < strips; s++) {
    const xa = xs + (xe - xs) * s / strips, xb = xs + (xe - xs) * (s + 1) / strips;
    const hole = holes.find(h => h[0] === s);
    const phi = i => -alpha + 2 * alpha * i / segs;
    if (!hole) { B.add('hangarRoof', archGeometry(xa, xb, -alpha, alpha, segs, R, cy, cyPlan), 0, 0, 0, {keepUV: true}); continue; }
    B.add('hangarRoof', archGeometry(xa, xb, -alpha, phi(hole[1]), hole[1], R, cy, cyPlan), 0, 0, 0, {keepUV: true});
    B.add('hangarRoof', archGeometry(xa, xb, phi(hole[2]), alpha, segs - hole[2], R, cy, cyPlan), 0, 0, 0, {keepUV: true});
    // Jagged bent sheet hanging into the hole
    const mid = phi(hole[1]), g = archGeometry(xa, xa + (xb - xa) * .45, mid, mid + (phi(hole[2]) - mid) * .5, 2, R, cy, cyPlan);
    B.add('rust', g, 0, 0, 0, {keepUV: true});
  }
  // Steel arch ribs + wall columns every ~4.4 m
  for (let x = 26.4; x <= 51.8; x += 4.23) {
    const tor = new THREE.TorusGeometry(R - .18, .09, 4, 28, 2 * alpha);
    tor.rotateZ(Math.PI / 2 - alpha); tor.rotateY(Math.PI / 2);
    B.add('darkSteel', tor, x, cy, -cyPlan, {});
    for (const y of [-7.7, 13.7]) B.box('darkSteel', x, HANGAR_WALL / 2, -y, .22, HANGAR_WALL, .3);
  }
  // Tie beams across the hangar at wall-top height
  for (let x = 30.63; x < 51; x += 8.46) B.box('darkSteel', x, HANGAR_WALL - .2, -cyPlan, .14, .18, 22);
  // Gable walls
  for (const wx of [26, 52]) {
    const shape = new THREE.Shape();
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const p = -alpha + 2 * alpha * i / n, py = cyPlan + R * Math.sin(p), h = cy + R * Math.cos(p);
      if (i === 0) shape.moveTo(-py, HANGAR_WALL - .01); shape.lineTo(-py, h);
    }
    shape.lineTo(-(cyPlan + R * Math.sin(alpha)), HANGAR_WALL - .01);
    const geo = new THREE.ExtrudeGeometry(shape, {depth: .4, bevelEnabled: false});
    geo.rotateY(-Math.PI / 2);
    B.add('hangar', geo, wx + .2, 0, 0, {world: true});
  }
  // Ridge vent along the hangar crown
  B.box('rust', 39, HANGAR_PEAK + .15, -cyPlan, 26.4, .3, .9);
}

export function buildFences(B) {
  for (const fence of FENCES) {
    const [ax, ay] = fence.a, [bx, by] = fence.b, horiz = ay === by;
    const u0 = horiz ? Math.min(ax, bx) : Math.min(ay, by), u1 = horiz ? Math.max(ax, bx) : Math.max(ay, by), c = horiz ? ay : ax;
    const P = u => horiz ? [u, c] : [c, u];
    const runs = []; let start = u0;
    for (const g of [...fence.gaps].sort((a, b) => a.at - b.at)) { runs.push([start, g.at - g.w / 2]); start = g.at + g.w / 2; }
    runs.push([start, u1]);
    for (const [s, e] of runs) {
      const n = Math.max(1, Math.round((e - s) / 2.5));
      for (let i = 0; i <= n; i++) {
        const [x, y] = P(s + (e - s) * i / n);
        B.cyl('rust', x, fence.h / 2 + .1, -y, .045, .05, fence.h + .2, 8);
        // Barbed-wire arm angled outward
        const out = horiz ? (c < 0 ? -1 : 1) : (c < 0 ? -1 : 1);
        B.box('rust', x + (horiz ? 0 : out * .18), fence.h + .32, -(y + (horiz ? out * .18 : 0)), .04, .5, .04, horiz ? {rx: -out * .7, order: 'XYZ'} : {rz: -out * .7, order: 'XYZ'});
      }
      const [mx, my] = P((s + e) / 2), L = e - s;
      // Chain-link mesh panel (alpha tested) + top rail + lower plank skirt.
      B.box('chain', mx, 1.35 + .05, -my, horiz ? L : .02, fence.h - 1, horiz ? .02 : L, {world: true});
      B.box('rust', mx, fence.h + .05, -my, horiz ? L : .05, .05, horiz ? .05 : L);
      B.box('plankH', mx, .45, -my, horiz ? L : .06, .9, horiz ? .06 : L, {world: true});
      // Barbed wire strands
      const out = c < 0 ? -1 : 1;
      for (let k = 0; k < 3; k++) {
        const off = .08 + k * .12, hh = fence.h + .15 + k * .12;
        B.box('wire', mx + (horiz ? 0 : out * off), hh, -(my + (horiz ? out * off : 0)), horiz ? L : .012, .012, horiz ? .012 : L);
      }
    }
  }
}
