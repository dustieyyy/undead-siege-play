import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {fbm, paint, finish, reseed, rand, clamp, mix, smooth} from '../textures.js';

// ---------------------------------------------------------------- textures
// Small tileable canvas textures for weapons and arms. UVs on extruded parts are
// in meters, so `repeat` sets the physical tile size.
let TEX = null;
function scratches(size, n, seed, h, strength) {
  reseed(seed);
  for (let k = 0; k < n; k++) {
    let x = rand() * size, y = rand() * size; const a = rand() * Math.PI, len = 8 + rand() * 50, dx = Math.cos(a), dy = Math.sin(a);
    for (let s = 0; s < len; s++) { const i = ((y | 0) % size) * size + ((x | 0) % size); h[i] = Math.min(1, h[i] + strength); x = (x + dx + size) % size; y = (y + dy + size) % size; }
  }
}
export function gunTextures() {
  if (TEX) return TEX;
  const S = 256;
  const tex = (rgb, h, rep, srgb = true) => { const t = finish(S, rgb, h, {srgb}); for (const m of [t.map, t.bump]) if (m) m.repeat.set(rep, rep); return t; };
  // Steel: fine grain + scratches. map ~ grey (multiplied with the vertex tint).
  const sN = fbm(S, 32, 4, 901), sh = new Float32Array(S * S); scratches(S, 140, 902, sh, .5);
  const steel = paint(S, (x, y, i, o) => { const v = .9 + sN[i] * .07 + sh[i] * .16; o[0] = o[1] = o[2] = v; o[3] = .5 + sN[i] * .3 - sh[i] * .3; });
  const steelRough = paint(S, (x, y, i, o) => { const v = .75 + sN[i] * .25 - sh[i] * .35; o[0] = o[1] = o[2] = v; o[3] = 0; });
  // Parkerized: speckled phosphate.
  const pN = fbm(S, 64, 3, 911), pS = fbm(S, 128, 2, 912);
  const park = paint(S, (x, y, i, o) => { const v = .8 + pN[i] * .12 + (pS[i] > .62 ? .1 : 0); o[0] = o[1] = o[2] = v; o[3] = pS[i]; });
  // Walnut wood: long grain along u.
  const wN = fbm(S, 8, 4, 921), wF = fbm(S, 64, 2, 922);
  const wood = paint(S, (x, y, i, o) => {
    const g = Math.sin((y / S) * Math.PI * 2 * 5 + wN[i] * 7) * .5 + .5, fine = wF[i];
    const ring = smooth(.3, 1, g); const base = mix(.3, .22, ring) * (.88 + fine * .24);
    o[0] = base * 1.38; o[1] = base * .86; o[2] = base * .52; o[3] = ring * .6 + fine * .4;
  });
  // Checkered grip: diamond pyramids.
  const checker = paint(S, (x, y, i, o) => {
    const n = 16, u = (x / S) * n, v = (y / S) * n, a = Math.abs(((u + v) % 1) - .5), b = Math.abs(((u - v + n) % 1) - .5);
    const h = 1 - Math.max(a, b) * 2; o[0] = o[1] = o[2] = .85 + h * .15; o[3] = h;
  });
  // Leather glove.
  const lN = fbm(S, 24, 4, 931), lC = new Float32Array(S * S); scratches(S, 60, 932, lC, .35);
  const leather = paint(S, (x, y, i, o) => { const v = .72 + lN[i] * .3 - lC[i] * .18; o[0] = v; o[1] = v * .93; o[2] = v * .85; o[3] = lN[i] * .7 + lC[i] * .5; });
  // Wool sleeve: twill weave.
  const fN = fbm(S, 32, 3, 941);
  const wool = paint(S, (x, y, i, o) => {
    const tw = Math.sin((x + y) * Math.PI * 2 / 6) * .5 + .5, cross = Math.sin(y * Math.PI * 2 / 3) * .5 + .5;
    const v = .78 + tw * .12 + fN[i] * .18 + cross * .04; o[0] = v; o[1] = v; o[2] = v * .92; o[3] = tw * .6 + fN[i] * .4;
  });
  TEX = {
    steel: tex(steel.rgb, steel.h, 14), steelRough: tex(steelRough.rgb, null, 14, false), park: tex(park.rgb, park.h, 22),
    wood: tex(wood.rgb, wood.h, 3.2), checker: tex(checker.rgb, checker.h, 30), leather: tex(leather.rgb, leather.h, 9), wool: tex(wool.rgb, wool.h, 7),
  };
  return TEX;
}

// ---------------------------------------------------------------- materials
let MATS = null;
export function gunMaterials() {
  if (MATS) return MATS;
  const T = gunTextures();
  const std = o => new THREE.MeshStandardMaterial({vertexColors: true, ...o});
  MATS = {
    blued: std({metalness: .78, roughness: .5, map: T.steel.map, bumpMap: T.steel.bump, bumpScale: .12, roughnessMap: T.steelRough.map}),
    park: std({metalness: .4, roughness: .72, map: T.park.map, bumpMap: T.park.bump, bumpScale: .3, envMapIntensity: .6}),
    dark: std({metalness: .4, roughness: .55, map: T.steel.map}),
    wood: new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .5, metalness: 0, map: T.wood.map, bumpMap: T.wood.bump, bumpScale: .4, clearcoat: .35, clearcoatRoughness: .45}),
    grip: std({metalness: .05, roughness: .55, map: T.checker.map, bumpMap: T.checker.bump, bumpScale: 1.4}),
    brass: std({metalness: 1, roughness: .28}),
    rubber: std({metalness: 0, roughness: .9, map: T.park.map}),
    glass: new THREE.MeshPhysicalMaterial({color: 0x1a2a2c, metalness: .2, roughness: .05, clearcoat: 1, envMapIntensity: 1.5}),
    leather: std({metalness: 0, roughness: .62, map: T.leather.map, bumpMap: T.leather.bump, bumpScale: .9}),
    wool: std({metalness: 0, roughness: .95, map: T.wool.map, bumpMap: T.wool.bump, bumpScale: .8}),
    skin: std({metalness: 0, roughness: .6}),
  };
  return MATS;
}

// Colour presets: [base, worn edge]
// Authored in sRGB, converted to linear (vertex colours are linear).
const lin = c => c.map(v => Math.pow(v, 2.2));
export const TINT = Object.fromEntries(Object.entries({
  blued: [[.24, .25, .29], [.66, .66, .68]], park: [[.25, .26, .24], [.5, .5, .47]], black: [[.17, .17, .18], [.42, .42, .44]],
  wood: [[1, 1, 1], [1.1, 1.06, 1]], woodDark: [[.82, .78, .76], [.96, .92, .88]], grip: [[.4, .28, .22], [.52, .4, .32]], gripBlack: [[.2, .2, .2], [.34, .34, .34]],
  brass: [[.9, .74, .42], [.96, .86, .62]], rubber: [[.24, .23, .22], [.3, .29, .28]], glove: [[.34, .23, .15], [.46, .33, .22]], sleeve: [[.3, .3, .2], [.35, .35, .24]],
  red: [[.68, .16, .1], [.75, .3, .2]], skin: [[.85, .7, .6], [.88, .72, .62]],
}).map(([k, [a, b]]) => [k, [lin(a), lin(b)]]));

// ---------------------------------------------------------------- geometry helpers
function roundedShape(pts, radius = 0, holes = []) {
  const s = new THREE.Shape(); addPath(s, pts, radius);
  for (const h of holes) { const p = new THREE.Path(); addPath(p, h, radius * .6); s.holes.push(p); }
  return s;
}
function addPath(path, pts, r) {
  const n = pts.length;
  if (!r) { path.moveTo(...pts[0]); for (let i = 1; i < n; i++) path.lineTo(...pts[i]); path.closePath(); return; }
  const rr = Array.isArray(r) ? r : pts.map(() => r);
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), k = Math.min(rr[i], la * .45, lb * .45);
    const p1 = [p[0] + (a[0] - p[0]) / la * k, p[1] + (a[1] - p[1]) / la * k], p2 = [p[0] + (b[0] - p[0]) / lb * k, p[1] + (b[1] - p[1]) / lb * k];
    if (i === 0) path.moveTo(...p1); else path.lineTo(...p1);
    path.quadraticCurveTo(p[0], p[1], ...p2);
  }
  path.closePath();
}
// Vertex colours: blend base/worn by "edgeness" of the normal (bevels/rims wear first).
function tintGeometry(geo, tint, wear, axis) {
  const n = geo.attributes.normal, c = new Float32Array(n.count * 3), [base, worn] = tint;
  for (let i = 0; i < n.count; i++) {
    const a = Math.abs(axis === 'x' ? n.getX(i) : n.getZ(i));
    const e = a > .04 && a < .97 ? Math.min(1, (1 - Math.abs(a - .55) * 2.1)) : 0;
    const w = clamp(e * wear);
    c[i * 3] = mix(base[0], worn[0], w); c[i * 3 + 1] = mix(base[1], worn[1], w); c[i * 3 + 2] = mix(base[2], worn[2], w);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

// Gun builder: parts are authored as side profiles (u = forward, v = up, meters),
// extruded across the width (x). Geometry ends up in gun space: forward = -Z, up = +Y.
// The same profiles are reused to draw the chalk outlines on the wall-buy walls.
export class GunBuilder {
  constructor(id) { this.id = id; this.parts = new Map(); this.profiles = []; this.anchors = {}; this.part('static'); this.current = 'static'; }
  part(name, pivot = [0, 0, 0]) { if (!this.parts.has(name)) this.parts.set(name, {pivot, geos: new Map()}); this.current = name; return this; }
  use(name) { this.current = name; return this; }
  push(geo, mat, partName) {
    const p = this.parts.get(partName || this.current);
    if (geo.index) geo = geo.toNonIndexed();
    if (!p.geos.has(mat)) p.geos.set(mat, []); p.geos.get(mat).push(geo);
  }
  // Extruded side profile. at = [x(lateral centre), y, f(forward offset)].
  extrude(pts, width, {at = [0, 0, 0], r = .002, bevel = .0012, seg = 2, curve = 3, mat = 'blued', tint = TINT.blued, wear = .9, holes = [], chalk = true, part} = {}) {
    const shape = roundedShape(pts, r, holes);
    const bt = Math.min(bevel, width * .3);
    const geo = new THREE.ExtrudeGeometry(shape, {depth: Math.max(.0002, width - bt * 2), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bt * .9, bevelSegments: seg, curveSegments: curve});
    geo.translate(0, 0, -(width - bt * 2) / 2);
    geo.rotateY(Math.PI / 2); // shape x -> -Z (forward), extrusion -> X
    geo.translate(at[0], at[1], -at[2]);
    tintGeometry(geo, tint, wear, 'x');
    this.push(geo, mat, part);
    if (chalk) this.profiles.push({pts: pts.map(p => [p[0] + at[2], p[1] + at[1]]), holes: holes.map(h => h.map(p => [p[0] + at[2], p[1] + at[1]]))});
    return geo;
  }
  // Rounded box from a side rectangle [f0, v0, f1, v1].
  box(f0, v0, f1, v1, width, o = {}) { return this.extrude([[f0, v0], [f1, v0], [f1, v1], [f0, v1]], width, {r: Math.min(o.r ?? .0015, (f1 - f0) * .4, (v1 - v0) * .4), ...o}); }
  // Lathe along the forward axis. prof = [[radius, along], ...]; at = [x, y, f].
  lathe(prof, {at = [0, 0, 0], seg = 16, mat = 'blued', tint = TINT.blued, wear = .7, chalk = true, part, phi = [0, Math.PI * 2], xf} = {}) {
    const geo = new THREE.LatheGeometry(prof.map(([r, l]) => new THREE.Vector2(r, l)), seg, phi[0], phi[1]);
    geo.rotateX(-Math.PI / 2); // lathe height (Y) -> -Z (forward)
    geo.translate(at[0], at[1], -at[2]);
    if (xf) xf(geo);
    tintGeometry(geo, tint, wear, 'z');
    this.push(geo, mat, part);
    if (chalk) {
      const top = prof.map(([r, l]) => [l + at[2], at[1] + r]), bot = prof.map(([r, l]) => [l + at[2], at[1] - r]).reverse();
      this.profiles.push({pts: [...top, ...bot], holes: []});
    }
    return geo;
  }
  // Cylinder across an arbitrary axis (pins, knobs, rings): from a to b (gun space points [x, y, f]).
  rod(a, b, r, {seg = 10, mat = 'blued', tint = TINT.blued, wear = .5, part, cap = true} = {}) {
    const A = new THREE.Vector3(a[0], a[1], -a[2]), B = new THREE.Vector3(b[0], b[1], -b[2]), len = A.distanceTo(B);
    const geo = new THREE.CylinderGeometry(r, r, len, seg, 1, !cap);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    geo.applyQuaternion(q); geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    tintGeometry(geo, tint, wear, 'z'); this.push(geo, mat, part); return geo;
  }
  sphere(c, r, {mat = 'blued', tint = TINT.blued, part, seg = 10, scale = [1, 1, 1]} = {}) {
    const geo = new THREE.SphereGeometry(r, seg, Math.max(4, seg * .6 | 0)); geo.scale(...scale); geo.translate(c[0], c[1], -c[2]);
    tintGeometry(geo, tint, .3, 'z'); this.push(geo, mat, part); return geo;
  }
  anchor(name, x, y, f) { this.anchors[name] = new THREE.Vector3(x, y, -f); return this; }
  build(materials) {
    const root = new THREE.Group(); root.name = this.id; const parts = {}; let tris = 0;
    for (const [name, p] of this.parts) {
      const g = name === 'static' ? root : new THREE.Group();
      if (name !== 'static') { g.name = name; g.position.set(p.pivot[0], p.pivot[1], -p.pivot[2]); root.add(g); parts[name] = g; }
      for (const [mat, geos] of p.geos) {
        const merged = mergeGeometries(geos, false); for (const gg of geos) gg.dispose();
        if (name !== 'static') merged.translate(-p.pivot[0], -p.pivot[1], p.pivot[2]);
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, materials[mat]); mesh.frustumCulled = false; g.add(mesh);
        tris += merged.attributes.position.count / 3;
      }
    }
    return {root, parts, anchors: this.anchors, profiles: this.profiles, triangles: Math.round(tris)};
  }
}
