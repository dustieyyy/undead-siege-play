import * as THREE from 'three';
import {F2, UPPER_TOP, HANGAR_WALL} from '../map/kestrel.js';

// Kit = batcher + local transform. Local axes: x right, y up, z = prop front.
// rot is yaw (0 = front faces plan south / world +z, PI = north, PI/2 = east, -PI/2 = west).
export const FACE = {S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2};
export class Kit {
  constructor(B, m = new THREE.Matrix4()) { this.B = B; this.m = m; }
  at(x, y, h = 0, rot = 0, tilt = null) {
    const m = new THREE.Matrix4().makeRotationY(rot);
    if (tilt) m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt[0] || 0, 0, tilt[1] || 0)));
    m.setPosition(x, h, -y);
    return new Kit(this.B, m);
  }
  local(lx, ly, lz, rot = 0, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, rot, rz, 'YXZ')); m.setPosition(lx, ly, lz);
    return new Kit(this.B, this.m.clone().multiply(m));
  }
  box(mat, x, y, z, w, h, d, o = {}) { return this.B.box(mat, x, y, z, w, h, d, {...o, parent: this.m}); }
  cyl(mat, x, y, z, rt, rb, h, seg = 12, o = {}) { return this.B.add(mat, new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), x, y, z, {...o, parent: this.m}); }
  add(mat, geo, x, y, z, o = {}) { return this.B.add(mat, geo, x, y, z, {...o, parent: this.m}); }
}

let s = 9001;
export const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const jitter = a => (rnd() - .5) * a;

export function crate(k, w = 1, h = .8, d = .8, mat = 'crateWood') {
  k.box(mat, 0, h / 2, 0, w, h, d);
  for (const y of [.06, h - .06]) k.box('woodDark', 0, y, 0, w + .02, .1, d + .02, {shadow: false});
  for (const x of [-w / 2 + .05, w / 2 - .05]) k.box('woodDark', x, h / 2, 0, .1, h, d + .02, {shadow: false});
}
export function ammoBox(k) { k.box('metalOD', 0, .14, 0, .45, .28, .22); k.box('darkSteel', 0, .29, 0, .2, .03, .05, {shadow: false}); }
export function jerrycan(k) { k.box('metalOD', 0, .24, 0, .17, .48, .35); k.box('darkSteel', 0, .5, -.06, .04, .05, .18, {shadow: false}); }
export function drum(k, mat = 'metalOD', tipped = false) {
  const kk = tipped ? k.local(0, .29, 0, 0, Math.PI / 2) : k.local(0, .44, 0);
  kk.cyl(mat, 0, 0, 0, .29, .29, .88, 16);
  for (const y of [-.2, .2]) kk.cyl('darkSteel', 0, y, 0, .3, .3, .03, 16, {shadow: false});
  kk.cyl('rust', 0, .44, 0, .27, .27, .02, 14, {shadow: false});
}
const bagGeo = () => new THREE.SphereGeometry(.5, 9, 6);
export function sandbag(k, x, y, z, r = 0) { k.add('burlap', bagGeo(), x, y, z, {sx: .56, sy: .2, sz: .32, ry: r, shadow: true}); }
export function sandbagWall(B, x0, y0, x1, y1, rows = 3, h0 = 0) {
  const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
  const k = new Kit(B).at(x0, y0, h0, ang);
  const n = Math.max(1, Math.round(len / .52));
  for (let r = 0; r < rows; r++) for (let i = 0; i < n - (r % 2); i++) sandbag(k, (i + .5 + (r % 2) * .5) * len / n, .1 + r * .19, jitter(.06), jitter(.25));
}
export function desk(k, overturned = false) {
  const kk = overturned ? k.local(0, .38, 0, 0, Math.PI / 2 * .98) : k;
  kk.box('woodDark', 0, .75, 0, 1.5, .05, .75);
  for (const x of [-.52, .52]) { kk.box('metalGray', x, .37, 0, .42, .74, .7); for (const y of [.2, .42, .62]) kk.box('darkSteel', x, y, .355, .36, .015, .01, {shadow: false}); }
}
export function chair(k, tipped = false) {
  const kk = tipped ? k.local(0, .22, 0, 0, Math.PI / 2) : k;
  kk.box('woodDark', 0, .45, 0, .42, .04, .42);
  kk.box('woodDark', 0, .7, -.2, .42, .45, .04);
  for (const x of [-.18, .18]) for (const z of [-.18, .18]) kk.box('darkSteel', x, .22, z, .03, .45, .03, {shadow: false});
}
export function filing(k, lying = false) {
  const kk = lying ? k.local(0, .31, 0, 0, -Math.PI / 2) : k;
  kk.box('metalOD', 0, .65, 0, .48, 1.3, .62);
  for (let i = 0; i < 4; i++) { kk.box('darkSteel', 0, .17 + i * .32, .312, .42, .012, .005, {shadow: false}); kk.box('steel', 0, .3 + i * .32, .32, .12, .03, .02, {shadow: false}); }
}
export function locker(k, ajar = false) {
  k.box('metalOD', 0, .93, 0, .5, 1.85, .48);
  for (let i = 0; i < 4; i++) k.box('darkSteel', 0, 1.55 + i * .05, .245, .3, .012, .005, {shadow: false});
  if (ajar) k.box('metalOD', .2, .93, .32, .04, 1.75, .45, {ry: .7});
  else k.box('darkSteel', .2, 1, .245, .02, .12, .01, {shadow: false});
}
export function radioSet(k) {
  k.box('metalOD', 0, .2, 0, .62, .4, .36);
  k.box('darkSteel', 0, .22, .181, .56, .32, .01, {shadow: false});
  for (const [x, y] of [[-.18, .28], [0, .28], [.18, .28], [-.12, .12], [.12, .12]]) k.cyl('steel', x, y, .2, .03, .03, .03, 10, {rx: Math.PI / 2, shadow: false});
  k.box('bulbWarm', .2, .1, .187, .08, .04, .005, {shadow: false});
  k.box('darkSteel', -.42, .06, .05, .2, .08, .1); // handset
  k.cyl('steel', .28, .7, -.1, .006, .006, .7, 4, {shadow: false}); // antenna
}
export function messTable(k, len = 4) {
  k.box('wood', 0, .76, 0, .9, .06, len);
  for (const z of [-len / 2 + .3, len / 2 - .3]) { k.box('woodDark', 0, .37, z, .7, .74, .08); }
  k.box('woodDark', 0, .2, 0, .08, .08, len - .6);
  for (const x of [-.75, .75]) { k.box('wood', x, .45, 0, .3, .05, len - .1); for (const z of [-len / 2 + .3, len / 2 - .3]) k.box('woodDark', x, .22, z, .26, .45, .06, {shadow: false}); }
}
export function stove(k, ceiling) {
  k.cyl('darkSteel', 0, .6, 0, .32, .28, .9, 14);
  k.cyl('darkSteel', 0, 1.1, 0, .2, .32, .2, 14);
  k.box('ember', 0, .45, .3, .16, .1, .02, {shadow: false});
  for (const a of [0, 2.1, 4.2]) k.box('darkSteel', Math.cos(a) * .22, .08, Math.sin(a) * .22, .05, .16, .05);
  k.cyl('darkSteel', 0, (1.2 + ceiling) / 2, 0, .07, .07, ceiling - 1.2, 10);
}
export function bunk(k) {
  for (const x of [-.42, .42]) for (const z of [-1, 1]) k.box('darkSteel', x, .9, z, .05, 1.8, .05);
  for (const y of [.42, 1.38]) {
    k.box('darkSteel', 0, y, 0, .9, .06, 2.05);
    k.box('mattress', 0, y + .09, 0, .82, .12, 1.95);
    k.box('blanket', 0, y + .16, .2, .84, .04, 1.4, {shadow: false});
    k.box('mattress', 0, y + .19, -.78, .55, .1, .32, {shadow: false});
  }
}
export function bed(k) {
  k.box('darkSteel', 0, .32, 0, .95, .06, 2.05);
  for (const x of [-.45, .45]) for (const z of [-1, 1]) k.box('darkSteel', x, .3, z, .05, .6, .05);
  k.box('darkSteel', 0, .7, -1.02, .95, .5, .04);
  k.box('mattress', 0, .42, 0, .88, .14, 1.95); k.box('blanket', 0, .51, .25, .9, .05, 1.4, {shadow: false});
}
export function shelf(k, w = 2, h = 2.2, d = .6, levels = 4, fill = true) {
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) k.box('metalGray', x, h / 2, z, .05, h, .05);
  for (let i = 0; i < levels; i++) {
    const y = .1 + i * (h - .2) / (levels - 1);
    k.box('metalGray', 0, y, 0, w, .03, d);
    if (!fill || i === levels - 1) continue;
    let x = -w / 2 + .15;
    while (x < w / 2 - .3) {
      const r = rnd(), bw = .25 + rnd() * .35;
      if (r < .45) k.box('crateWood', x + bw / 2, y + .02 + bw * .35, jitter(.1), bw, bw * .7, d * .8, {shadow: false});
      else if (r < .75) k.cyl('metalOD', x + .1, y + .14, jitter(.15), .09, .09, .25, 10, {shadow: false});
      else k.box('canvas', x + bw / 2, y + .1, 0, bw, .18, d * .7, {shadow: false});
      x += bw + .06 + rnd() * .15;
    }
  }
}
export function cagedBulb(k, on = true, drop = .35) {
  k.cyl('darkSteel', 0, -.02, 0, .1, .1, .04, 10, {shadow: false});
  k.cyl('wire', 0, -drop / 2, 0, .008, .008, drop, 4, {shadow: false});
  k.add(on ? 'bulbWarm' : 'bulbOff', new THREE.SphereGeometry(.07, 10, 8), 0, -drop - .05, 0, {shadow: false});
  for (const y of [-drop + .02, -drop - .12]) k.add('wire', new THREE.TorusGeometry(.11, .006, 4, 14), 0, y, 0, {rx: Math.PI / 2, shadow: false});
  for (let i = 0; i < 4; i++) k.box('wire', Math.cos(i * 1.57) * .11, -drop - .05, Math.sin(i * 1.57) * .11, .008, .16, .008, {shadow: false});
}
export function lantern(k) {
  k.box('darkSteel', 0, .05, 0, .16, .03, .16); k.box('darkSteel', 0, .33, 0, .14, .04, .14);
  k.add('bulbWarm', new THREE.CylinderGeometry(.045, .055, .2, 8), 0, .19, 0, {shadow: false});
  for (const [x, z] of [[-.06, -.06], [.06, -.06], [-.06, .06], [.06, .06]]) k.box('darkSteel', x, .19, z, .012, .28, .012, {shadow: false});
}
export function floodlight(k, lensMat) {
  k.box('darkSteel', 0, 0, -.25, .1, .1, .5);
  k.cyl('metalGray', 0, 0, .05, .3, .22, .35, 14, {rx: Math.PI / 2});
  k.cyl(lensMat, 0, 0, .23, .27, .27, .02, 14, {rx: Math.PI / 2, shadow: false});
}
export function tireStack(k, n = 4) { for (let i = 0; i < n; i++) k.add('rubber', new THREE.TorusGeometry(.38, .14, 8, 16), jitter(.08), .14 + i * .27, jitter(.08), {rx: Math.PI / 2}); }
export function workbench(k, w = 3) {
  k.box('wood', 0, .9, 0, w, .07, .8);
  for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-.33, .33]) k.box('woodDark', x, .45, z, .08, .9, .08);
  k.box('woodDark', 0, .2, 0, w - .2, .04, .7);
  k.box('woodDark', 0, 1.4, -.38, w, 1, .04); // pegboard
  for (let i = 0; i < 6; i++) k.box('steel', -w / 2 + .4 + i * (w - .8) / 5, 1.3 + jitter(.3), -.35, .04, .3 + rnd() * .2, .02, {shadow: false});
  k.box('darkSteel', w / 2 - .4, 1.02, .1, .2, .18, .14); // vise
  k.box('metalRed', -w / 2 + .5, 1.03, .1, .5, .2, .22); // toolbox
  ammoBox(k.local(0, .95, .15, .3));
}
export function engineStand(k) {
  k.box('darkSteel', 0, .3, 0, 1.2, .08, 1.2);
  for (const x of [-.45, .45]) k.box('darkSteel', x, .55, 0, .08, .55, .08);
  const e = k.local(0, 1.0, 0, 0, Math.PI / 2);
  e.cyl('steel', 0, 0, 0, .28, .28, .45, 14);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; e.cyl('darkSteel', Math.cos(a) * .42, 0, Math.sin(a) * .42, .09, .1, .32, 8); }
  e.cyl('steel', 0, .35, 0, .08, .08, .4, 8);
}
export function propeller(k) {
  k.cyl('darkSteel', 0, 0, 0, .14, .14, .25, 10, {rx: Math.PI / 2});
  for (let i = 0; i < 3; i++) k.box('metalGray', 0, 0, 0, .18, 1.5, .04, {rz: i * 2.094, order: 'XYZ'});
}
export function chainHang(k, len = 2.5) { for (let i = 0; i < len / .12; i++) k.add('steel', new THREE.TorusGeometry(.05, .012, 4, 8), 0, -i * .1, 0, {ry: i % 2 ? Math.PI / 2 : 0, shadow: false}); }
export function papers(B, x0, y0, x1, y1, n, h = 0) {
  for (let i = 0; i < n; i++) B.box('paper', x0 + rnd() * (x1 - x0), h + .005 + i * .0005, -(y0 + rnd() * (y1 - y0)), .21, .004, .29, {ry: rnd() * 6.28, shadow: false});
}
export function debris(B, x, y, r, n, h = 0) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, d = rnd() * r, sz = .08 + rnd() * .25;
    const mat = rnd() < .5 ? 'concreteDark' : rnd() < .5 ? 'woodDark' : 'rust';
    B.box(mat, x + Math.cos(a) * d, h + sz * .3, -(y + Math.sin(a) * d), sz * (1 + rnd()), sz * .6, sz, {ry: rnd() * 6, rx: jitter(.4), shadow: false});
  }
}
export function planks(B, x, y, n, h = 0) { for (let i = 0; i < n; i++) B.box('plankH', x + jitter(1), h + .03 + i * .04, -(y + jitter(1)), 1.8 + rnd(), .04, .18, {ry: rnd() * 6.28, rz: jitter(.1), uvScale: [1, 1]}); }

export function truck(k) {
  // Original 1940s-style canvas-top cargo truck; length along local x (cab at +x).
  const wheel = (x, z, flat = false) => {
    const w = k.local(x, flat ? .44 : .5, z, 0, Math.PI / 2);
    w.cyl('rubber', 0, 0, 0, .5, .5, .3, 18); w.cyl('metalOD', 0, z > 0 ? .16 : -.16, 0, .26, .26, .02, 12, {shadow: false});
  };
  for (const x of [2.1, -.9, -1.9]) for (const z of [-1.05, 1.05]) wheel(x, z, x === -1.9 && z > 0);
  k.box('darkSteel', 0, .72, 0, 5.8, .2, 1.1);              // chassis
  k.box('metalOD', 2.35, 1.15, 0, 1.3, .8, 1.5);           // hood
  k.box('darkSteel', 3.02, 1.1, 0, .05, .7, 1.1, {shadow: false}); // grille
  for (let i = 0; i < 7; i++) k.box('steel', 3.05, 1.1, -.45 + i * .15, .02, .62, .03, {shadow: false});
  k.box('darkSteel', 3.1, .7, 0, .15, .18, 2.2);            // bumper
  for (const z of [-.55, .55]) k.cyl('glassDark', 3.0, 1.45, z, .11, .11, .08, 10, {rz: Math.PI / 2, shadow: false});
  for (const z of [-1.05, 1.05]) k.add('metalOD', new THREE.CylinderGeometry(.62, .62, .36, 12, 1, true, -Math.PI / 2, Math.PI), 2.1, .55, z, {rx: Math.PI / 2, ry: Math.PI / 2, order: 'YXZ'});
  k.box('metalOD', 1.25, 1.55, 0, 1.0, 1.55, 2.0);           // cab
  k.box('glassDark', 1.76, 1.95, 0, .03, .5, 1.7, {shadow: false}); // windshield
  k.box('darkSteel', 1.77, 1.95, 0, .05, .55, .06, {shadow: false});
  k.box('metalOD', 1.25, 2.35, 0, 1.05, .06, 2.05);
  k.box('woodDark', -1.35, 1.0, 0, 3.4, .1, 2.2);           // bed floor
  for (const z of [-1.08, 1.08]) k.box('wood', -1.35, 1.35, z, 3.4, .6, .06);
  k.box('wood', -3.02, 1.35, 0, .06, .6, 2.2);
  // canvas top on hoops
  const top = new THREE.CylinderGeometry(1.12, 1.12, 3.4, 16, 1, true, -Math.PI / 2, Math.PI);
  k.add('canvas', top, -1.35, 1.65, 0, {rz: Math.PI / 2, order: 'XYZ', sy: 1, sx: 1});
  for (const x of [-2.9, -1.35, .2]) k.add('darkSteel', new THREE.TorusGeometry(1.12, .02, 4, 16, Math.PI), x, 1.65, 0, {ry: Math.PI / 2, shadow: false});
  k.box('canvas', -3.04, 2.2, 0, .03, 1.1, 2.0, {rx: .05, shadow: false}); // rear flap
  k.cyl('rubber', -1.0, .4, -.95, .45, .45, .25, 14, {rx: 0, rz: 0}); // spare
  jerrycan(k.local(.5, .8, 1.25, Math.PI / 2));
}

export function planeWreck(k) {
  // Unmarked twin-engine transport, broken: fuselage along local x, nose at +x.
  const fus = k.local(0, 1.55, 0, 0, 0, -.06);
  fus.add('metalGray', new THREE.CylinderGeometry(1.35, 1.35, 7.5, 20, 1, true), 0, 0, 0, {rz: Math.PI / 2, order: 'XYZ'});
  fus.add('metalGray', new THREE.SphereGeometry(1.35, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 3.75, 0, 0, {rz: -Math.PI / 2, sy: 1.3, order: 'XYZ'});
  // cockpit glazing frames
  for (const z of [-.5, 0, .5]) fus.box('glassDark', 4.55, .75, z, .5, .32, .42, {rz: -.6, order: 'XYZ', shadow: false});
  // cabin windows (dark) both sides
  for (let i = 0; i < 6; i++) for (const z of [-1.34, 1.34]) fus.box('glassDark', -2.6 + i * .95, .35, z, .45, .35, .03, {shadow: false});
  // cargo door hanging open
  fus.box('metalGray', -2.4, -.2, 1.55, 1.6, 1.7, .05, {ry: .5});
  // torn rear edge: ring of jagged rust panels
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; fus.box('rust', -3.85, Math.sin(a) * 1.3, Math.cos(a) * 1.3, .3 + rnd() * .5, .7, .08, {rx: -a, order: 'XYZ', shadow: false}); }
  // Wings: stub on the near side, snapped wing lying on the floor on the far side.
  const wingGeo = () => new THREE.BoxGeometry(2.0, .22, 5.2);
  fus.add('metalGray', wingGeo(), .8, -.65, 2.9, {ry: .05});
  k.add('metalGray', wingGeo(), 1.1, .2, -3.0, {ry: -.25, rx: .12, sz: .75});
  // Engine nacelles + bent props
  for (const [z, y, tilt] of [[2.3, .9, 0], [-2.4, .35, .35]]) {
    const n = k.local(2.0, y, z, 0, 0, tilt);
    n.add('metalGray', new THREE.CylinderGeometry(.55, .45, 2.0, 14), 0, 0, 0, {rz: Math.PI / 2, order: 'XYZ'});
    n.cyl('darkSteel', 1.05, 0, 0, .5, .5, .12, 14, {rz: Math.PI / 2, order: 'XYZ'});
    for (let i = 0; i < 3; i++) n.box('darkSteel', 1.15, 0, 0, .05, 1.6, .2, {rx: i * 2.094 + .3, rz: .3 * (i - 1), order: 'XYZ'});
  }
  // Broken tail section with fin (plain, no markings), resting at an angle
  const tail = k.local(-5.0, .9, -.6, .35, 0, .18);
  tail.add('rust', new THREE.CylinderGeometry(.9, .45, 2.4, 14, 1, true), 0, 0, 0, {rz: Math.PI / 2, order: 'XYZ'});
  tail.box('metalGray', -.8, 1.3, 0, 1.4, 1.9, .1, {rz: -.35, order: 'XYZ'});
  tail.box('metalGray', -.9, .2, 0, 1.0, .08, 3.2);
  // Ground debris under the wreck
  for (let i = 0; i < 14; i++) k.box(rnd() < .5 ? 'metalGray' : 'rust', jitter(11), .03, jitter(6), .2 + rnd() * .9, .04, .2 + rnd() * .6, {ry: rnd() * 6, shadow: false});
}

export function generator(k) {
  k.box('darkSteel', 0, .1, 0, 2.6, .2, 2);                // skid
  k.box('metalOD', -.3, .65, 0, 1.6, .9, 1.4);             // engine block
  k.box('metalOD', .9, .75, 0, .6, 1.1, 1.5);              // radiator housing
  for (let i = 0; i < 8; i++) k.box('darkSteel', 1.21, .75, -.6 + i * .17, .02, .9, .04, {shadow: false});
  k.cyl('metalRed', -.3, 1.38, 0, .38, .38, 1.5, 16, {rz: Math.PI / 2, order: 'XYZ'}); // fuel tank
  k.cyl('darkSteel', -1.0, 1.8, .4, .07, .07, 1.5, 8);    // exhaust
  for (const [x, z] of [[-.6, .71], [-.2, .71]]) k.cyl('steel', x, .85, z, .08, .08, .03, 12, {rx: Math.PI / 2, shadow: false}); // gauges
  k.box('rubber', -1.25, .35, -.5, .5, .08, .08, {shadow: false});
}
export function perkMachine(k, kind, lampMat) {
  // Repurposed 1940s equipment, original shapes. Front faces local +z.
  if (kind === 'second-wind') { // field medical cabinet
    k.box('metalGray', 0, 1.0, 0, 1.0, 2.0, .55);
    k.box('glassDark', 0, 1.25, .28, .8, 1.0, .02, {shadow: false});
    for (let i = 0; i < 3; i++) k.box('darkSteel', 0, .85 + i * .33, .2, .8, .02, .3, {shadow: false});
    for (let i = 0; i < 9; i++) k.cyl(i % 2 ? 'bulbCold' : 'glassDark', -.3 + (i % 5) * .15, .92 + Math.floor(i / 5) * .33, .15, .04, .04, .12, 8, {shadow: false});
    k.box('darkSteel', 0, .35, .28, .8, .5, .02);
  } else if (kind === 'field-ration') { // ration dispenser built from stacked crates
    k.box('crateWood', 0, .45, 0, 1.0, .9, .7); k.box('crateWood', 0, 1.25, 0, .9, .7, .65);
    k.box('metalOD', 0, 1.85, 0, .7, .5, .55); k.box('darkSteel', 0, .95, .36, .4, .25, .04);
  } else if (kind === 'iron-lung') { // pressure tank with gauges
    k.cyl('metalRed', 0, 1.0, 0, .45, .45, 1.9, 18); k.cyl('darkSteel', 0, 2.0, 0, .3, .45, .2, 18);
    for (const a of [-.5, .5]) k.cyl('steel', Math.sin(a) * .46, 1.4, Math.cos(a) * .46, .09, .09, .04, 12, {rx: Math.PI / 2, ry: a, order: 'YXZ', shadow: false});
    k.cyl('darkSteel', .5, .6, 0, .05, .05, 1.0, 8);
  } else { // quickhand: field radio/tool cabinet
    k.box('metalOD', 0, .8, 0, .9, 1.6, .6); k.box('darkSteel', 0, 1.05, .31, .75, .6, .02);
    for (let i = 0; i < 5; i++) k.cyl('steel', -.28 + i * .14, 1.05, .33, .035, .035, .03, 8, {rx: Math.PI / 2, shadow: false});
    k.box('metalOD', 0, .4, .31, .75, .4, .02);
  }
  // Every machine has a caged lamp on top that lights when powered.
  const top = {['second-wind']: 2.05, ['field-ration']: 2.15, ['iron-lung']: 2.15, quickhand: 1.65}[kind];
  k.box('darkSteel', 0, top, 0, .25, .06, .25, {shadow: false});
  k.add(lampMat, new THREE.SphereGeometry(.1, 12, 8), 0, top + .12, 0, {shadow: false});
}
export function supplyCrate(k) {
  // Padlocked olive footlocker, amber stencil shapes (no text).
  k.box('metalOD', 0, .28, 0, 1.15, .52, .55);
  k.box('metalOD', 0, .57, 0, 1.17, .08, .57);
  for (const x of [-.5, .5]) k.box('darkSteel', x, .3, 0, .06, .6, .58, {shadow: false});
  k.box('darkSteel', 0, .4, .29, .09, .12, .03, {shadow: false});
  k.box('steel', 0, .3, .31, .07, .09, .03, {shadow: false});
  for (const x of [-.62, .62]) k.box('darkSteel', x, .4, 0, .04, .05, .22, {shadow: false});
}
export function tree(k, h = 9) {
  k.cyl('bark', 0, h / 2, 0, .1, .22, h, 7);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, r = (1 - t) * 2.2 + .3;
    k.add('pine', new THREE.ConeGeometry(r, h * .32, 8, 1, true), jitter(.2), h * .35 + t * h * .6, jitter(.2), {ry: rnd() * 6});
  }
}
export function deadTree(k, h = 7) {
  k.cyl('bark', 0, h / 2, 0, .06, .2, h, 6);
  for (let i = 0; i < 6; i++) { const y = h * (.4 + rnd() * .5), a = rnd() * 6.28; k.cyl('bark', Math.cos(a) * .6, y, Math.sin(a) * .6, .02, .05, 1.6 + rnd(), 4, {rz: Math.cos(a) * 1.0, rx: -Math.sin(a) * 1.0, order: 'XYZ', shadow: false}); }
}
export function telegraphPole(k) {
  k.cyl('woodDark', 0, 4, 0, .12, .15, 8, 8);
  k.box('woodDark', 0, 7.4, 0, 1.8, .12, .12);
  for (const x of [-.75, -.25, .25, .75]) k.cyl('glassDark', x, 7.52, 0, .03, .04, .1, 6, {shadow: false});
}
export function windsock(k, cloth) {
  k.cyl('rust', 0, 3, 0, .05, .07, 6, 8);
  k.add(cloth, new THREE.CylinderGeometry(.32, .14, 2.2, 12, 1, true), 1.1, 5.75, 0, {rz: Math.PI / 2 - .35, order: 'XYZ'});
  k.add('rust', new THREE.TorusGeometry(.32, .02, 4, 12), 0, 6, 0, {ry: Math.PI / 2, shadow: false});
}
export function lampPole(k, h = 6) {
  k.cyl('rust', 0, h / 2, 0, .07, .1, h, 8);
  k.box('rust', .45, h - .1, 0, 1.0, .07, .07);
  k.cyl('darkSteel', .95, h - .2, 0, .08, .32, .18, 12);
}
export function runwayLamp(k, lens) {
  k.cyl('darkSteel', 0, .15, 0, .05, .07, .3, 8);
  k.cyl(lens, 0, .34, 0, .09, .09, .08, 10, {shadow: false});
  k.cyl('darkSteel', 0, .4, 0, .1, .1, .03, 10, {shadow: false});
}
export function wireCoil(B, x0, y0, x1, y1) {
  const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), n = Math.round(len / .35);
  const k = new Kit(B).at(x0, y0, 0, ang);
  for (let i = 0; i < n; i++) k.add('wire', new THREE.TorusGeometry(.42, .01, 3, 14), (i + .5) * len / n, .4, 0, {ry: Math.PI / 2 + .25, shadow: false});
  for (let i = 0; i <= n / 6; i++) k.box('rust', i * 6 * len / n, .45, 0, .04, .9, .04);
}
