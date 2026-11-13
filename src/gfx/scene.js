import * as THREE from 'three';
import {DOORS, BARRICADES, WALLBUYS, SUPPLY_CRATES, PERKS, POWER, SPAWN_ZONES, SECRETS, F2, UPPER_TOP, HANGAR_WALL, AREAS} from '../map/kestrel.js';
import {inRect} from '../map/geometry.js';
import {Batcher} from './batch.js';
import {buildWalls, buildFloors, buildStairs, buildRails, buildRoofs, buildFences, rbox, HANGAR_ARCH} from './architecture.js';
import {MOON_DIR} from './atmosphere.js';
import * as P from './props.js';
import {Kit, FACE, rnd} from './props.js';
import * as T from './textures.js';

const glowTex = T.radialGlow();

// Builds the whole Kestrel Field visual world and owns its dynamic parts.
export class MapVisuals {
  constructor(scene, M, world, quality) {
    this.scene = scene; this.M = M; this.world = world; this.q = quality;
    this.root = new THREE.Group(); this.root.name = 'kestrel'; scene.add(this.root);
    this.anchors = []; this.anims = []; this.doors = new Map(); this.power = false; this.time = 0;
    // Dynamic materials
    this.mat = {
      runwayLens: new THREE.MeshBasicMaterial({color: 0x2a2116}),
      morseDot: new THREE.MeshBasicMaterial({color: 0x2a2116}), morseDash: new THREE.MeshBasicMaterial({color: 0x2a2116}),
      floodLens: new THREE.MeshBasicMaterial({color: 0x23262a}),
      powerLamp: new THREE.MeshBasicMaterial({color: 0xff3020}),
    };
    Object.assign(M, this.mat); for (const k in this.mat) this.mat[k].userData.scale = [1, 1];
    const B = new Batcher(M); this.B = B;
    this.buildGround(B);
    buildWalls(B); buildFloors(B); buildStairs(B); buildRails(B); buildRoofs(B); buildFences(B);
    this.furnishOps(B); this.furnishMess(B); this.furnishWalkway(B); this.furnishDepot(B); this.furnishYard(B);
    this.furnishHangar(B); this.furnishTower(B); this.furnishQuarters(B); this.furnishLoft(B); this.buildExterior(B);
    this.buildPerks(B); this.buildCrates(B); this.buildPower(B); this.buildWallBuys();
    this.staticMeshes = B.flush(this.root);
    this.buildDoors(); this.buildBarricades(); this.buildSpawnMarkers(); this.buildGlows();
  }

  light(x, y, h, color, intensity, distance, o = {}) {
    const a = {pos: new THREE.Vector3(x, h, -y), color: new THREE.Color(color), intensity, distance, flicker: o.flicker || 0, mode: o.mode || 'always', seed: rnd() * 100, glow: o.glow ?? .9, strobe: o.strobe || 0, level: 1, id: o.id};
    this.anchors.push(a); return a;
  }

  buildGround(B) {
    const g = new THREE.PlaneGeometry(320, 320, 1, 1); g.rotateX(-Math.PI / 2);
    B.add('ground', g, 20, -.07, 0, {world: true, shadow: false});
    // Runway, taxiway, apron, concrete aprons around the buildings
    rbox(B, 'runway', [-120, -31, 160, -17], -.07, -.035, {shadow: false});
    rbox(B, 'runway', [52, -17, 64, 18], -.07, -.04, {shadow: false});
    rbox(B, 'runway', [16, -12, 52, -8.2], -.07, -.045, {shadow: false});
    rbox(B, 'concreteFloor', [-11, 12, 27, 13.4], -.07, -.04, {shadow: false});
    // Painted runway threshold bars (faded)
    for (let i = 0; i < 8; i++) rbox(B, 'concreteDark', [-60 + i * 1.6, -29.8, -59.2 + i * 1.6, -18.2], -.035, -.03, {shadow: false});
    for (let x = -100; x < 150; x += 12) rbox(B, 'concreteDark', [x, -24.15, x + 6, -23.85], -.035, -.03, {shadow: false});
  }

  furnishOps(B) {
    const k = new Kit(B);
    // Field radio desk (Morse egg) in the SW corner
    P.desk(k.at(2.2, 1.0, 0, FACE.N)); P.radioSet(k.at(2.0, 1.1, .78, FACE.N)); P.chair(k.at(2.2, 2.0, 0, FACE.N + .3));
    P.papers(B, 1.2, .5, 3.2, 1.5, 6, .78);
    B.box('wire', 3.5, 2.2, -.3, .02, 2.6, .02, {shadow: false}); // antenna lead up the wall
    // Overturned desks + toppled cabinets = small loop in the middle
    P.desk(k.at(7.7, 6.05, 0, FACE.S + .05), true); P.desk(k.at(7.0, 6.0, 0, FACE.N - .1));
    P.filing(k.at(11.1, 4.2, 0, FACE.E), true); P.filing(k.at(11.1, 3.0, 0, FACE.W + .2));
    P.chair(k.at(5.5, 7.1, 0, .9), true); P.chair(k.at(9.6, 6.9, 0, 2.2));
    P.papers(B, 4, 3, 12, 9, 26);
    // Lockers along the west wall (north of the Mess door), map board, crates
    for (let i = 0; i < 4; i++) P.locker(k.at(.45, 8.3 + i * .55, 0, FACE.E), i === 2);
    const board = k.at(.2, 2.6, 1.0, FACE.E);
    board.box('woodDark', 0, .7, 0, 2.2, 1.3, .05); board.add('paper', new THREE.PlaneGeometry(2.0, 1.1), 0, .7, .03, {keepUV: true, shadow: false});
    P.crate(k.at(15.1, 1.0, 0, .1), 1.1, .8, .8); P.crate(k.at(15.0, 1.1, .8, -.15), .8, .6, .6); P.ammoBox(k.at(14.0, .6, 0, .4)); P.ammoBox(k.at(14.2, .8, .28, .1));
    P.sandbagWall(B, 1.8, .45, 4.2, .45, 2); P.sandbagWall(B, 5.8, .45, 8.2, .45, 2);
    P.sandbagWall(B, 2.8, 11.55, 5.2, 11.55, 2);
    P.debris(B, 12.5, 8.6, 1.2, 14); P.planks(B, 10.6, 8.2, 3);
    // Ceiling bulbs
    P.cagedBulb(k.at(4, 8, F2 - .7)); P.cagedBulb(k.at(11.5, 3.5, F2 - .7)); P.cagedBulb(k.at(4, 2.8, F2 - .7), false);
    this.light(4, 8, F2 - 1.1, 0xffb766, 6, 11, {flicker: .15});
    this.light(11.5, 3.5, F2 - 1.1, 0xffb766, 6, 11, {flicker: .4, strobe: .02});
    this.light(2.0, 1.4, 1.1, 0xffa040, 1.2, 3, {glow: .3});
  }

  furnishMess(B) {
    const k = new Kit(B);
    P.messTable(k.at(-6.8, 5.5, 0, 0), 4); P.messTable(k.at(-3.2, 5.5, 0, 0), 4);
    for (const [x, y] of [[-6.8, 4.5], [-6.6, 6.2], [-3.1, 5.0]]) { const t = k.at(x, y, .79, rnd() * 6); t.cyl('metalGray', 0, .05, 0, .07, .06, .1, 10, {shadow: false}); }
    for (const [x, y] of [[-6.9, 5.5], [-3.3, 6.6]]) k.at(x, y, .79, rnd() * 3).box('metalGray', 0, .01, 0, .35, .02, .25, {shadow: false});
    P.chair(k.at(-5.0, 8.4, 0, 1.4), true);
    P.stove(k.at(-9.1, 10.9, 0, 0), F2 - .35);
    P.crate(k.at(-8.6, 9.4, 0, .2), .9, .6, .6);
    // Serving counter + shelves along the north wall
    rbox(B, 'wood', [-3.6, 11.0, -.6, 11.8], 0, .95); rbox(B, 'woodDark', [-3.7, 10.95, -.5, 11.8], .95, 1.0);
    P.shelf(k.at(-1.6, 11.55, 1.25, FACE.S), 2.4, 1.2, .35, 3);
    // Briefing board (blank original sketch map) on the east interior wall
    const board = k.at(-.18, 9.2, 1.0, FACE.W);
    board.box('woodDark', 0, .8, 0, 2.6, 1.6, .06); board.add('paper', new THREE.PlaneGeometry(2.4, 1.4), 0, .8, .035, {keepUV: true, shadow: false});
    P.chair(k.at(-1.5, 8.6, 0, FACE.E)); P.chair(k.at(-2.0, 9.6, 0, FACE.E + .4));
    P.papers(B, -9, 1, -1, 11, 12);
    P.cagedBulb(k.at(-5, 3.2, F2 - .7)); P.cagedBulb(k.at(-5, 9, F2 - .7));
    this.light(-5, 3.2, F2 - 1.1, 0xffb766, 5, 10, {flicker: .2});
    this.light(-5, 9, F2 - 1.1, 0xffb766, 4.5, 10, {flicker: .5, strobe: .03});
    this.light(-9.1, 10.7, .5, 0xff6a24, 2.2, 4, {flicker: .5, glow: .5});
  }

  furnishWalkway(B) {
    const k = new Kit(B);
    P.lantern(k.at(21, 6, 2.55)); B.box('wire', 21, 2.95, -6, .01, .5, .01, {shadow: false});
    this.light(21, 6, 2.6, 0xffaa55, 3.2, 8, {flicker: .25});
    P.crate(k.at(17.0, 7.3, 0, .3), .9, .7, .7); P.crate(k.at(25.3, 4.7, 0, -.2), .8, .6, .6);
    P.drum(k.at(17.0, 4.6, 0), 'rust');
    P.planks(B, 22.5, 7.2, 2);
  }

  furnishDepot(B) {
    const k = new Kit(B);
    // Racks along the north wall
    for (const x of [17.6, 19.8, 22.0]) P.shelf(k.at(x, 3.4, 0, FACE.S), 2.1, 2.4, .8, 4);
    P.shelf(k.at(25.4, 2.1, 0, FACE.W), 2.8, 2.2, .7, 4);
    // Drum stack obstacle (SW) — 2 tiers + tipped drums
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) P.drum(k.at(16.95 + i * .6, -7.25 + j * .6, 0, rnd()), j % 2 ? 'metalRed' : 'metalOD');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) P.drum(k.at(17.25 + i * .6, -6.95 + j * .6, .9, rnd()), 'metalOD');
    P.drum(k.at(20.0, -5.2, 0, .5), 'rust', true); P.drum(k.at(23.2, -1.0, 0, 1.4), 'metalRed', true);
    // Hand fuel pump on a drum
    const pump = k.at(20.4, -7.1, 0, 0); P.drum(pump, 'metalRed'); pump.cyl('darkSteel', 0, 1.15, 0, .03, .03, .6, 8); pump.box('darkSteel', .15, 1.4, 0, .35, .04, .04);
    pump.add('rubber', new THREE.TorusGeometry(.25, .03, 6, 14), .4, .3, .35, {rx: Math.PI / 2, shadow: false});
    for (let i = 0; i < 5; i++) P.jerrycan(k.at(23.6 + i * .25, -7.55, 0, FACE.N));
    P.crate(k.at(24.6, -5.8, 0, .1), 1.2, .9, .9); P.crate(k.at(24.6, -5.8, .9, -.2), .9, .7, .7); P.crate(k.at(19.0, .6, 0, .4), 1, .8, .8);
    P.papers(B, 17, -6, 25, 2, 6);
    P.cagedBulb(k.at(21, -2, 3.55)); this.light(21, -2, 3.15, 0xffb766, 5, 10, {flicker: .3});
  }

  furnishYard(B) {
    const k = new Kit(B);
    P.truck(k.at(5.0, -7.5, 0, .04));
    // Sandbag emplacement obstacle + extra bag lines
    P.sandbagWall(B, -7, -10, -4, -10, 4); P.sandbagWall(B, -7, -7.6, -4, -7.6, 4);
    P.sandbagWall(B, -7, -10, -7, -7.6, 4); P.sandbagWall(B, -4, -10, -4, -7.6, 4);
    P.sandbagWall(B, -9.6, -11.6, -6.5, -11.6, 2); P.sandbagWall(B, 12.5, -11.6, 15.6, -11.6, 2);
    P.lampPole(k.at(-8.6, -1.2, 0, 0)); this.light(-7.65, -1.2, 5.6, 0xff9a3c, 9, 16, {flicker: .08, id: 'yard-pole'});
    P.cagedBulb(k.at(12, -.35, 3.15)); this.light(12, -.55, 2.8, 0xff9a3c, 3, 8, {flicker: .2});
    // Sodium flood on the bunker wall washing the truck loop
    P.floodlight(k.at(4.5, -.3, 3.3, FACE.S).local(0, 0, 0, 0, .7), 'bulbWarm'); this.light(4.5, -1.6, 3.0, 0xffa24a, 10, 15, {flicker: .05, glow: 1.1});
    P.tireStack(k.at(14.6, -2.2, 0), 3); P.tireStack(k.at(15.3, -3.1, 0), 2);
    P.crate(k.at(-8.9, -4.0, 0, .3), 1.1, .8, .8); P.crate(k.at(-8.7, -5.0, 0, -.2), .8, .6, .6);
    P.drum(k.at(14.9, -6.5, 0), 'rust'); P.drum(k.at(14.2, -6.9, 0), 'metalOD', true);
    P.planks(B, 0, -3, 3); P.debris(B, 9, -4, 2.5, 18);
    // Wall-buy board on the east fence
    rbox(B, 'plankH', [15.8, -11, 15.95, -9], .7, 2.3);
  }

  furnishHangar(B) {
    const k = new Kit(B);
    P.planeWreck(k.at(39, 3, 0, .06));
    P.workbench(k.at(36.5, -7.4, 0, FACE.N)); P.workbench(k.at(42, -7.4, 0, FACE.N));
    P.engineStand(k.at(44.1, -3.9, 0, .4));
    P.tireStack(k.at(27.6, 2.6, 0), 4); P.tireStack(k.at(27.9, 1.6, 0), 2);
    P.propeller(k.at(51.6, -2.5, 1.0, FACE.W).local(0, 0, 0, 0, 0, .3));
    for (const [x, y] of [[30.6, -7.5], [31.2, -7.5], [30.9, -6.95], [50.5, 1.1]]) P.drum(k.at(x, y, 0, rnd()), rnd() < .5 ? 'metalOD' : 'rust');
    P.crate(k.at(27.2, -3.0, 0, .2), 1.2, 1, 1); P.crate(k.at(27.2, -3.0, 1, -.3), .8, .6, .6);
    P.crate(k.at(46.8, -6.6, 0, .1), 1.4, 1.1, 1.1);
    const tarp = k.at(33, 10.0, 0, .2); tarp.box('tarp', 0, .6, 0, 2.2, 1.2, 1.4); tarp.box('tarp', 0, 1.22, 0, 2.3, .06, 1.5, {rx: .05});
    for (const x of [31, 39.5, 47]) P.chainHang(k.at(x, 3 + rnd() * 2, HANGAR_WALL - .3), 2.5 + rnd() * 1.5);
    P.debris(B, 39, -1, 4, 20); P.papers(B, 28, -6, 50, 8, 10); P.planks(B, 47, 2, 3);
    // Floodlights (power) high on the side walls
    for (const [x, y, r] of [[31, -7.55, FACE.S], [47, -7.55, FACE.S], [31, 13.55, FACE.N], [47, 13.55, FACE.N]]) {
      P.floodlight(k.at(x, y, 6.3, r).local(0, 0, 0, 0, .45), 'floodLens');
      this.light(x, y + (y < 0 ? 2.5 : -2.5), 5.2, 0xdfe8ff, 22, 24, {mode: 'power', glow: 1.3});
    }
    this.light(39, 3, 8.5, 0xc8d6ff, 16, 26, {mode: 'power', glow: 0});
    // Cold moon spill through the torn roof (before power) + generator glow
    this.light(36, 3, 6.5, 0x7088b0, 16, 24, {mode: 'pre', glow: 0});
    this.light(46, 6, 6.0, 0x7088b0, 12, 20, {mode: 'pre', glow: 0});
    this.buildShafts();
  }

  buildShafts() {
    // Fake volumetric moon shafts under the missing roof panels (additive, no depth write).
    const {R, cyPlan, cy, alpha} = HANGAR_ARCH, strips = 13, xs = 25.8, xe = 52.2, segs = 24;
    const mat = new THREE.MeshBasicMaterial({color: 0x8aa2c8, transparent: true, opacity: .028, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true});
    for (const [s, a, b] of [[5, 12, 15], [8, 4, 7], [10, 15, 17], [3, 6, 8]]) {
      const x = xs + (xe - xs) * (s + .5) / strips, phi = -alpha + 2 * alpha * ((a + b) / 2) / segs;
      const py = cyPlan + R * Math.sin(phi), top = cy + R * Math.cos(phi);
      const len = top / MOON_DIR.y, w = (xe - xs) / strips, d = 2 * alpha * (b - a) / segs * R;
      const geo = new THREE.BoxGeometry(w * .9, len, d * .9); geo.translate(0, -len / 2, 0);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, top, -py);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), MOON_DIR.clone());
      m.renderOrder = 5; this.root.add(m);
    }
  }

  furnishTower(B) {
    const k = new Kit(B), h = F2;
    rbox(B, 'woodDark', [1, .25, 6, 1.05], h + .76, h + .8); for (const x of [1.1, 5.9]) rbox(B, 'darkSteel', [x - .05, .3, x + .05, 1], h, h + .76);
    P.radioSet(k.at(4.6, .6, h + .8, FACE.N)); P.papers(B, 1.2, .3, 3.5, 1, 5, h + .8);
    const bino = k.at(7.6, .9, h, FACE.S); for (const a of [0, 2.1, 4.2]) bino.box('darkSteel', Math.cos(a) * .25, .7, Math.sin(a) * .25, .03, 1.4, .03, {rz: Math.cos(a) * .2, rx: -Math.sin(a) * .2, order: 'XYZ'});
    bino.cyl('darkSteel', -.08, 1.45, 0, .05, .05, .3, 10, {rx: Math.PI / 2}); bino.cyl('darkSteel', .08, 1.45, 0, .05, .05, .3, 10, {rx: Math.PI / 2});
    // Chart table
    const chart = k.at(7.5, 5.9, h, 0); chart.box('woodDark', 0, .88, 0, 2, .05, 1.4); for (const [x, z] of [[-.9, -.6], [.9, -.6], [-.9, .6], [.9, .6]]) chart.box('woodDark', x, .44, z, .07, .88, .07);
    chart.add('paper', new THREE.PlaneGeometry(1.7, 1.1), 0, .91, 0, {rx: -Math.PI / 2, keepUV: true, shadow: false});
    P.chair(k.at(6.3, 5.0, h, -.6)); P.chair(k.at(8.9, 6.6, h, 2.4), true);
    P.shelf(k.at(.55, 10.6, h, FACE.E), 2, 1.9, .6, 4);
    P.filing(k.at(15.5, 7.8, h, FACE.W)); P.filing(k.at(15.5, 8.4, h, FACE.W));
    P.sandbagWall(B, 7.0, 11.55, 9.2, 11.55, 2, h);
    for (let i = 0; i < 3; i++) P.ammoBox(k.at(13.8 + i * .5, .6, h, .2 * i));
    P.debris(B, 3, 8, 2, 10, h);
    P.cagedBulb(k.at(5, 6, UPPER_TOP - .3)); P.cagedBulb(k.at(12, 3, UPPER_TOP - .3));
    this.light(5, 6, UPPER_TOP - .7, 0xffb766, 4.5, 10, {flicker: .2});
    this.light(12, 3, UPPER_TOP - .7, 0xffb766, 4, 10, {flicker: .45, strobe: .03});
    // Balcony: sandbags at the base of the railing + spent shells
    P.sandbagWall(B, 3.0, -2.75, 6.5, -2.75, 1, h); P.sandbagWall(B, 9.5, -2.75, 13.0, -2.75, 1, h);
    P.crate(k.at(13.2, -.6, h, .3), .7, .5, .5);
  }

  furnishQuarters(B) {
    const k = new Kit(B), h = F2;
    P.bunk(k.at(-9.3, 1.45, h, 0)); P.bunk(k.at(-9.3, 3.95, h, 0)); P.bed(k.at(-5.35, 10.0, h, FACE.E));
    rbox(B, 'woodDark', [-4.2, 1, -2.4, 1.8], h + .74, h + .78); for (const [x, y] of [[-4.1, 1.1], [-2.5, 1.1], [-4.1, 1.7], [-2.5, 1.7]]) rbox(B, 'woodDark', [x - .03, y - .03, x + .03, y + .03], h, h + .74);
    P.chair(k.at(-3.3, 2.3, h, FACE.N)); P.papers(B, -4, 1.1, -2.6, 1.7, 4, h + .78);
    const lamp = k.at(-2.7, 1.4, h + .78); lamp.cyl('darkSteel', 0, .02, 0, .08, .1, .04, 10); lamp.cyl('darkSteel', 0, .2, 0, .012, .012, .36, 6); lamp.cyl('bulbWarm', 0, .38, 0, .05, .12, .12, 10, {open: true});
    this.light(-2.7, 1.4, h + 1.2, 0xffa860, 2.4, 6, {flicker: .1});
    for (let i = 0; i < 5; i++) P.locker(k.at(-3.0 + i * .5, 11.5, h, FACE.S), i === 2); // officer's locker (egg key) is the ajar one
    const rug = k.at(-5, 6, h + .005); rug.box('blanket', 0, 0, 0, 2.6, .01, 1.8, {shadow: false});
    const trunk = k.at(-8.9, 6.4, h, FACE.E); P.supplyCrate(trunk);
    P.debris(B, -6, 7, 2, 8, h); P.papers(B, -8, 6, -3, 9, 6, h);
    P.cagedBulb(k.at(-5, 6, UPPER_TOP - .3)); this.light(-5, 6, UPPER_TOP - .7, 0xffb766, 3.8, 9, {flicker: .35, strobe: .02});
  }

  furnishLoft(B) {
    const k = new Kit(B), h = F2;
    P.crate(k.at(38.6, 13.2, h, .1), 1.2, .9, .9); P.crate(k.at(39.7, 13.2, h, -.2), .9, .8, .8); P.crate(k.at(38.7, 13.2, h + .9, .4), .8, .5, .6);
    P.shelf(k.at(42.5, 13.5, h, FACE.S), 2.2, 2, .5, 4);
    k.at(30.8, 10.2, h).add('canvas', new THREE.TorusGeometry(.35, .1, 6, 14), 0, .1, 0, {rx: Math.PI / 2});
    P.drum(k.at(27.0, 13.2, h), 'metalOD'); P.drum(k.at(27.6, 13.4, h), 'rust');
    P.ammoBox(k.at(48, 10, h, .3)); P.planks(B, 44, 10.2, 2, h); P.debris(B, 36, 10, 1.5, 8, h);
    P.cagedBulb(k.at(40, 11.5, HANGAR_WALL)); this.light(40, 11.5, HANGAR_WALL - .5, 0xffc27a, 6, 12, {mode: 'power'});
    P.lantern(k.at(28, 7.0, h)); this.light(28, 7.0, h + .4, 0xffa44a, 2.0, 5, {flicker: .3});
  }

  buildExterior(B) {
    const k = new Kit(B);
    // Treeline (W) and scattered pines around the fog edge; dead trees at the crash site.
    const trees = [];
    for (let i = 0; i < 70; i++) trees.push([-16 - rnd() * 28, -40 + rnd() * 80]);
    for (let i = 0; i < 40; i++) trees.push([-20 + rnd() * 90, 24 + rnd() * 26]);
    for (let i = 0; i < 25; i++) trees.push([66 + rnd() * 25, -30 + rnd() * 60]);
    for (let i = 0; i < 30; i++) trees.push([-30 + rnd() * 110, -38 - rnd() * 18]);
    for (const [x, y] of trees) (rnd() < .72 ? P.tree : P.deadTree)(k.at(x, y, 0, rnd() * 6), 6 + rnd() * 6);
    for (let i = 0; i < 6; i++) P.deadTree(k.at(2 + rnd() * 38, 17 + rnd() * 5, 0, rnd() * 6), 4 + rnd() * 3);
    // Crash site (N): scattered wreckage of a second aircraft and spilled cargo
    const wing = k.at(18, 19.5, 0, .4, [.15, -.08]); wing.box('rust', 0, .3, 0, 6.5, .2, 1.8); wing.box('metalGray', 2.5, .6, 0, 1.2, .9, 1.6);
    const eng = k.at(26, 18.6, 0, 1.2); eng.add('rust', new THREE.CylinderGeometry(.6, .5, 1.8, 12), 0, .5, 0, {rz: Math.PI / 2 + .3, order: 'XYZ'});
    for (let i = 0; i < 8; i++) P.crate(k.at(6 + rnd() * 30, 16.5 + rnd() * 5, 0, rnd() * 6, [jitterR(), jitterR()]), .8 + rnd() * .5, .6, .7);
    P.debris(B, 20, 19, 10, 40);
    // Fuel dump (SE): drums, tarp, sandbags
    for (let i = 0; i < 26; i++) P.drum(k.at(33 + rnd() * 14, -15 + rnd() * 3.4, 0, rnd() * 6), rnd() < .3 ? 'metalRed' : rnd() < .5 ? 'rust' : 'metalOD', rnd() < .25);
    P.sandbagWall(B, 32, -11.0, 40, -11.0, 2); const tp = k.at(44, -13.5, 0, .3); tp.box('tarp', 0, .7, 0, 3, 1.4, 2); tp.box('tarp', 0, 1.43, 0, 3.1, .05, 2.1, {rx: .08});
    // Apron (E): windsock, fuel bowser trailer, lamp
    P.windsock(k.at(60, 16, 0), 'canvas');
    const bowser = k.at(57.5, -3, 0, FACE.N); bowser.add('metalOD', new THREE.CylinderGeometry(.85, .85, 3.6, 16), 0, 1.3, 0, {rx: Math.PI / 2}); bowser.box('darkSteel', 0, .4, 0, 1.4, .15, 3.8);
    for (const z of [-1.1, 1.1]) for (const x of [-.75, .75]) bowser.cyl('rubber', x, .4, z, .4, .4, .25, 14, {rz: Math.PI / 2, order: 'XYZ'});
    P.lampPole(k.at(53.5, 10, 0, FACE.E)); this.light(53.5, 9.0, 5.6, 0xff9a3c, 8, 16, {flicker: .1});
    // Telegraph poles along the old service road (W/N) and a radio mast on the bunker roof
    for (let i = 0; i < 7; i++) P.telegraphPole(k.at(-14, 30 - i * 11, 0, .1));
    const mast = k.at(14.5, 10.5, UPPER_TOP + .3);
    mast.cyl('rust', 0, 3, 0, .04, .04, 6, 6); mast.box('rust', 0, 5.4, 0, 1.2, .04, .04); mast.add('bulbRed', new THREE.SphereGeometry(.08, 8, 6), 0, 6.05, 0, {shadow: false});
    this.light(14.5, 10.5, UPPER_TOP + 6.35, 0xff2a1a, 0, 1, {glow: 1.2, strobe: 0, id: 'mast'});
    // Bunker exterior detailing: downpipes, conduit, vents, electrical boxes, sandbags under windows
    for (const [x, y] of [[-10.35, -.3], [16.35, -.3], [-10.35, 12.3], [16.35, 12.3]]) B.cyl('rust', x, 3.7, -y, .07, .07, 7.4, 8);
    for (const [x, y, r] of [[-3, 12.25, FACE.N], [11, 12.25, FACE.N], [-6.5, -.25, FACE.S]]) { const v = k.at(x, y, 6.2, r); v.box('darkSteel', 0, 0, 0, .8, .5, .08); for (let i = 0; i < 5; i++) v.box('steel', 0, -.2 + i * .1, .05, .7, .02, .02, {shadow: false}); }
    for (const [x, y, r] of [[13.6, -.25, FACE.S], [-10.25, 6, FACE.W], [16.25, 10, FACE.E]]) { const e2 = k.at(x, y, 1.6, r); e2.box('metalOD', 0, 0, 0, .5, .65, .18); e2.box('rust', 0, .9, -.04, .05, 1.2, .05); }
    rbox(B, 'rust', [-10, -.3, 16, -.24], 3.05, 3.1); rbox(B, 'rust', [-10, 12.24, 16, 12.3], 3.05, 3.1);
    for (const x of [-5, 4, 8.4]) P.sandbagWall(B, x - .9, 12.6, x + .9, 12.6, 3);
    for (const y of [3, 9]) P.sandbagWall(B, -10.6, y - .9, -10.6, y + .9, 3);
    for (const x of [32, 46]) P.sandbagWall(B, x - .9, -8.6, x + .9, -8.6, 3);
    // Barbed-wire coils and sandbag walls outside the fence; trench line in the field
    P.wireCoil(B, -12, -14, 18, -14); P.wireCoil(B, -12.5, -13.5, -12.5, 1);
    P.sandbagWall(B, -16, -6, -16, 2, 2); P.sandbagWall(B, 30, 16, 40, 16, 2);
    // Runway edge lamps (power) + the two Morse lamps
    for (let x = -60; x <= 100; x += 10) for (const y of [-17.3, -30.7]) P.runwayLamp(k.at(x, y, 0), 'runwayLens');
    for (const [i, m] of SECRETS.morseLamps.entries()) {
      const l = k.at(m.at[0], m.at[1], 0); l.cyl('darkSteel', 0, .4, 0, .08, .1, .8, 8); l.cyl(i ? 'morseDash' : 'morseDot', 0, .9, 0, .2, .2, .25, 14, {shadow: false}); l.cyl('darkSteel', 0, 1.05, 0, .22, .22, .05, 14);
      this.light(m.at[0], m.at[1], 1.0, 0xffb050, 0, 6, {glow: 1.8, id: 'morse-' + m.kind, mode: 'power'});
    }
  }

  buildPerks(B) {
    this.perkMats = new Map();
    for (const p of PERKS) {
      const mat = new THREE.MeshBasicMaterial({color: new THREE.Color(p.color).multiplyScalar(p.needsPower ? .12 : 1)}); mat.userData.scale = [1, 1];
      this.M['perk-' + p.id] = mat; this.perkMats.set(p.id, {mat, color: new THREE.Color(p.color), perk: p});
      const h = p.floor ? F2 : 0;
      P.perkMachine(new Kit(B).at(p.at[0], p.at[1], h, FACE[p.facing]), p.id, 'perk-' + p.id);
      p.anchor = this.light(p.at[0], p.at[1], h + 2.3, p.color, p.needsPower ? 0 : 2.2, 5, {mode: p.needsPower ? 'power' : 'always', glow: .9});
    }
  }

  buildCrates(B) {
    const stencil = new THREE.MeshBasicMaterial({map: T.stencil(), transparent: true, depthWrite: false, color: 0xd9a050}); stencil.userData.scale = [1, 1]; this.M.stencil = stencil;
    for (const c of SUPPLY_CRATES) {
      const h = c.floor ? F2 : 0, k = new Kit(B).at(c.at[0], c.at[1], h, c.rot);
      if (c.firstSpawn) {
        P.supplyCrate(k);
        k.add('stencil', new THREE.PlaneGeometry(.38, .38), 0, .3, .281, {keepUV: true, shadow: false});
        k.add('stencil', new THREE.PlaneGeometry(.45, .45), 0, .615, 0, {rx: -Math.PI / 2, keepUV: true, shadow: false});
        this.light(c.at[0], c.at[1], h + 1.2, 0xffa63a, 3.5, 6, {flicker: .15, glow: 1.4});
        // Faint amber beam marking the active spot
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.3, .62, (c.floor ? UPPER_TOP - F2 : F2) - .9, 16, 1, true), new THREE.MeshBasicMaterial({color: 0xffa040, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
        beam.position.set(c.at[0], h + ((c.floor ? UPPER_TOP - F2 : F2) - .9) / 2 + .55, -c.at[1]); beam.renderOrder = 5; this.root.add(beam); this.crateBeam = beam;
      } else {
        // Empty spot: stencilled floor marking + a few loose planks (placeholder for box moves).
        k.add('stencil', new THREE.PlaneGeometry(1.2, 1.2), 0, .01, 0, {rx: -Math.PI / 2, keepUV: true, shadow: false});
        P.planks(B, c.at[0], c.at[1], 2, h);
      }
    }
  }

  buildPower(B) {
    const k = new Kit(B), [x0, y0, x1, y1] = POWER.cage;
    P.generator(k.at(48.3, 9.65, 0, 0));
    // Chain-link cage (open on the south side where the lever panel is)
    rbox(B, 'chain', [x0, y0, x0 + .02, y1], 0, 2.5); rbox(B, 'chain', [x1 - .02, y0, x1, y1], 0, 2.5); rbox(B, 'chain', [x0, y1 - .02, x1, y1], 0, 2.5);
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) rbox(B, 'darkSteel', [x - .05, y - .05, x + .05, y + .05], 0, 2.55);
    rbox(B, 'darkSteel', [x0, y0 - .03, x1, y0 + .03], 2.45, 2.55);
    // Lever panel on a post at the cage mouth
    const [px, py] = POWER.at;
    rbox(B, 'darkSteel', [px - .06, py - .06, px + .06, py + .06], 0, 1.1);
    const panel = k.at(px, py, 1.1, FACE.S); panel.box('metalOD', 0, .3, 0, .5, .6, .2); panel.box('darkSteel', 0, .3, .101, .42, .5, .01, {shadow: false});
    panel.add('powerLamp', new THREE.SphereGeometry(.05, 10, 8), .17, .52, .12, {shadow: false});
    // Cables from the generator up the wall to the roof
    rbox(B, 'rubber', [49.9, 10.4, 50.0, 10.5], 0, HANGAR_WALL - .5);
    rbox(B, 'rubber', [32, 13.7, 50, 13.8], HANGAR_WALL - .6, HANGAR_WALL - .5);
    // The lever itself is dynamic
    const lever = new THREE.Group(); lever.position.set(px - .05, 1.4, -py + .12);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .04), this.M.steel); arm.position.y = .16; lever.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), this.M.metalRed); knob.position.y = .33; lever.add(knob);
    lever.rotation.x = -.5; this.root.add(lever); this.lever = lever;
    this.powerAnchor = this.light(px + .17, py, 1.62, 0xff2a14, 1.4, 3.5, {flicker: .1, glow: 1.0, mode: 'pre'});
    this.light(48.3, 9.6, 2.4, 0xff3a20, 1.6, 5, {flicker: .5, glow: 0, mode: 'pre'});
  }

  buildWallBuys() {
    // Chalk outline + price plaque on the wall (placeholders until weapons are added).
    this.wallbuyMeshes = [];
    for (const w of WALLBUYS) {
      const tex = T.chalkOutline(w.id), plate = plateTexture(String(w.cost), w.tier);
      const g = new THREE.Group(); g.position.set(w.at[0], (w.floor ? F2 : 0) + 1.45, -w.at[1]); g.rotation.y = FACE[w.facing];
      const out = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .47), new THREE.MeshStandardMaterial({map: tex, transparent: true, depthWrite: false, roughness: 1, emissive: 0x2a2620, emissiveMap: tex}));
      out.position.z = .03; g.add(out);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(.34, .16), new THREE.MeshStandardMaterial({map: plate, roughness: .8, emissive: 0x302820, emissiveMap: plate}));
      pl.position.set(0, -.42, .03); g.add(pl);
      this.root.add(g); this.wallbuyMeshes.push(g); g.userData.outline = out; g.userData.id = w.id;
    }
  }
  // Replace a placeholder outline with art traced from the real gun model.
  setWallbuyArt(id, tex) {
    const g = this.wallbuyMeshes.find(m => m.userData.id === id); if (!g) return;
    const m = g.userData.outline.material; m.map?.dispose(); m.map = tex; m.emissiveMap = tex; m.emissive.set(0x3a3428); m.needsUpdate = true;
    g.userData.outline.scale.set(1.12, 1.12, 1);
  }

  buildDoors() {
    for (const d of DOORS) {
      const group = new THREE.Group(); group.name = 'door:' + d.id; this.root.add(group);
      const B = new Batcher(this.M);
      if (d.debris) {
        const [x0, y0, x1, y1] = d.debris, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const k = new Kit(B).at(cx, cy, 0, 0);
        P.locker(k.local(-.2, .25, 0, .3, 0, Math.PI / 2 * .9)); P.crate(k.local(.5, 0, .6, .4), .9, .8, .8); P.crate(k.local(-.6, 0, -.7, -.3), .8, .7, .7);
        P.filing(k.local(.3, .7, -.5, 1.2), true); P.desk(k.local(.1, .6, .3, 2.1), true);
        for (let i = 0; i < 14; i++) P.sandbag(k, (rnd() - .5) * 1.6, .1 + Math.floor(i / 5) * .2, (rnd() - .5) * 2.2, rnd() * 3);
        for (let i = 0; i < 4; i++) k.box('plankH', (rnd() - .5), 1.1 + rnd() * .5, (rnd() - .5) * 2, 2.2, .04, .18, {ry: rnd() * 3, rz: (rnd() - .5) * .8, rx: (rnd() - .5), order: 'XYZ', uvScale: [1, 1]});
        d.style = 'debris';
      } else {
        const o = d.opening, f = o.wall, horiz = f.a[1] === f.b[1];
        const w = o.u1 - o.u0, h = o.zt - o.zb, cx = horiz ? (o.u0 + o.u1) / 2 : f.a[0], cy = horiz ? f.a[1] : (o.u0 + o.u1) / 2;
        const k = new Kit(B).at(cx, cy, o.zb, horiz ? 0 : Math.PI / 2);
        if (d.style === 'wood') {
          for (const s of [-1, 1]) {
            const leaf = k.local(s * w / 4, 0, 0);
            leaf.box('plank', 0, h / 2, 0, w / 2 - .03, h - .02, .07);
            for (const y of [.35, h - .35]) leaf.box('woodDark', 0, y, .05, w / 2 - .06, .14, .03);
            leaf.box('woodDark', 0, h / 2, .055, .12, h - .6, .025, {rz: s * .5, order: 'XYZ'});
            leaf.box('rust', -s * (w / 4 - .12), h / 2, .07, .05, .14, .04);
          }
        } else if (d.style === 'steel') {
          for (const s of [-1, 1]) {
            const leaf = k.local(s * w / 4, 0, 0);
            leaf.box('metalOD', 0, h / 2, 0, w / 2 - .02, h - .02, .09);
            for (let r = 0; r < 4; r++) for (const z of [-.05, .05]) leaf.box('darkSteel', 0, .3 + r * (h - .6) / 3, z, w / 2 - .12, .05, .01, {shadow: false});
            leaf.box('steel', -s * (w / 4 - .15), 1.05, .07, .05, .3, .05);
          }
          k.box('darkSteel', 0, h / 2, .0, .04, h, .1);
        } else if (d.style === 'shutter') {
          k.box('hangar', 0, h / 2, 0, w - .04, h - .02, .08, {uvScale: [.6, 1]});
          k.box('darkSteel', 0, .06, .05, w - .1, .1, .04);
          k.box('darkSteel', 0, h + .2, 0, w + .2, .3, .3);
        }
        // Cost plate above the door (both sides)
        if (d.cost) for (const side of [1, -1]) {
          const plate = new THREE.Mesh(new THREE.PlaneGeometry(.5, .22), new THREE.MeshStandardMaterial({map: plateTexture(String(d.cost), 0), roughness: .8, emissive: 0x3a3020, emissiveMap: plateTexture(String(d.cost), 0)}));
          plate.position.set(cx + (horiz ? 0 : side * .23), o.zt + .25, -(cy + (horiz ? -side * .23 : 0))); plate.rotation.y = horiz ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
          group.add(plate);
        }
      }
      for (const m of B.flush(group)) { m.matrixAutoUpdate = true; }
      this.doors.set(d.id, {data: d, group, t: 0, opening: false});
    }
  }
  openDoor(id) { const d = this.doors.get(id); if (d && !d.opening) { d.opening = true; d.t = 0; } }

  buildBarricades() {
    // One instanced mesh for all 138 boards (23 spots x 6). Indices are kept per spot
    // so zombies can tear boards off / players can repair next.
    const total = BARRICADES.length * 6;
    const geo = new THREE.BoxGeometry(1, .17, .045);
    const mesh = new THREE.InstancedMesh(geo, this.M.plankH, total);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    this.barricades = new Map(); let n = 0;
    for (const b of BARRICADES) {
      const o = this.world.barricadeOpenings.get(b.id); if (!o) { console.warn('missing barricade', b.id); continue; }
      const [x0, y0, x1, y1] = o.rect, horiz = (x1 - x0) > (y1 - y0);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = horiz ? x1 - x0 : y1 - y0, hgt = o.zt - o.zb;
      const idx = [];
      for (let i = 0; i < 6; i++) {
        const y = o.zb + hgt * (i + .5) / 6 + (rnd() - .5) * .05;
        e.set(0, horiz ? 0 : Math.PI / 2, (rnd() - .5) * .45, 'YXZ'); q.setFromEuler(e);
        const off = (i % 2 ? .05 : -.05);
        p.set(cx + (horiz ? (rnd() - .5) * .15 : off), y, -(cy + (horiz ? off : (rnd() - .5) * .15)));
        sc.set(w + .35 + rnd() * .2, 1, 1); m.compose(p, q, sc); mesh.setMatrixAt(n, m); idx.push(n++);
      }
      this.barricades.set(b.id, {data: b, indices: idx, boards: 6, center: new THREE.Vector3(cx, o.zb + hgt / 2, -cy)});
    }
    mesh.count = n; this.root.add(mesh); this.boardMesh = mesh;
  }

  buildSpawnMarkers() {
    this.spawnGroup = new THREE.Group(); this.spawnGroup.visible = false; this.root.add(this.spawnGroup);
    for (const z of SPAWN_ZONES) {
      const [x0, y0, x1, y1] = z.rect;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshBasicMaterial({color: 0xb02020, transparent: true, opacity: .28, depthWrite: false, fog: false}));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set((x0 + x1) / 2, .05, -(y0 + y1) / 2); this.spawnGroup.add(mesh);
    }
  }

  buildGlows() {
    for (const a of this.anchors) {
      if (!a.glow) continue;
      const mat = new THREE.SpriteMaterial({map: glowTex, color: a.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55});
      const s = new THREE.Sprite(mat); s.position.copy(a.pos); s.scale.setScalar(a.glow); s.renderOrder = 6; this.root.add(s); a.sprite = s;
    }
  }

  setPower(on) {
    this.power = on;
    this.mat.floodLens.color.set(on ? 0xf4f7ff : 0x23262a);
    this.mat.powerLamp.color.set(on ? 0x40ff60 : 0xff3020);
    for (const {mat, color, perk} of this.perkMats.values()) mat.color.copy(color).multiplyScalar(on || !perk.needsPower ? 1 : .12);
    for (const p of PERKS) if (p.needsPower) p.anchor.intensity = on ? 2.4 : 0;
    if (this.powerAnchor) { this.powerAnchor.color.set(on ? 0x40ff60 : 0xff2a14); }
    this.leverTarget = on ? .55 : -.5;
  }

  update(dt, camera) {
    this.time += dt; const t = this.time;
    // Door animations
    for (const d of this.doors.values()) {
      if (!d.opening || d.t >= 1) continue;
      d.t = Math.min(1, d.t + dt / .9); const e = 1 - (1 - d.t) ** 3, g = d.group;
      if (d.data.style === 'debris') { g.position.y = -2.6 * e; }
      else if (d.data.style === 'shutter') { g.position.y = 2.3 * e; }
      else { g.position.y = -2.8 * e; } // doors sink into the floor slot like classic barricade doors
      if (d.t >= 1) g.visible = false;
    }
    if (this.lever && this.leverTarget !== undefined) this.lever.rotation.x += (this.leverTarget - this.lever.rotation.x) * Math.min(1, dt * 8);
    // Runway lamps blink once power is on; Morse lamps flash a slow pattern.
    const blink = this.power && (Math.sin(t * 3) > -.2);
    this.mat.runwayLens.color.set(this.power ? (blink ? 0xffb860 : 0x6a4a20) : 0x2a2116);
    const pattern = [1, 0, 1, 1, 1, 0, 0, 0], step = Math.floor(t * 2.5) % pattern.length;
    for (const a of this.anchors) if (a.id?.startsWith('morse')) {
      const on = this.power && (a.id === 'morse-dot' ? pattern[step] : pattern[(step + 4) % 8]);
      a.intensity = on ? 3 : 0; (a.id === 'morse-dot' ? this.mat.morseDot : this.mat.morseDash).color.set(on ? 0xffc070 : this.power ? 0x5a3a18 : 0x2a2116);
    }
    const mast = this.anchors.find(a => a.id === 'mast'); if (mast) mast.level = (t % 2.2) < .25 ? 1 : 0;
    if (this.crateBeam) this.crateBeam.material.opacity = .045 + Math.sin(t * 1.7) * .015;
    // Light levels (flicker/strobe), shared with the light pool.
    for (const a of this.anchors) {
      let v = a.id === 'mast' ? a.level : 1;
      if (a.mode === 'power' && !this.power) v = 0;
      if (a.mode === 'pre' && this.power && a !== this.powerAnchor) v = 0;
      if (a.flicker) v *= 1 - a.flicker * Math.max(0, Math.sin(t * 13 + a.seed) * Math.sin(t * 7.3 + a.seed * 2)) ;
      if (a.strobe && Math.sin(t * .9 + a.seed) > .97) v *= (Math.sin(t * 60) > 0 ? 1 : .05);
      a.level = v;
      if (!a.sprite) continue;
      if (a.id?.startsWith('morse')) a.sprite.material.opacity = a.intensity > 0 ? .9 : 0;
      else if (a.id === 'mast') a.sprite.material.opacity = v * .9;
      else a.sprite.material.opacity = a.intensity > 0 ? .55 * v : 0;
    }
  }
}

const jitterR = () => (rnd() - .5) * .3;
function plateTexture(text, tier) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 56; const ctx = c.getContext('2d');
  ctx.fillStyle = ['#2c2a24', '#33403a', '#3e3524', '#4a2c22'][tier] || '#2c2a24'; ctx.fillRect(0, 0, 128, 56);
  ctx.strokeStyle = '#8c7a58'; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 122, 50);
  ctx.fillStyle = '#e0c48c'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 64, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
