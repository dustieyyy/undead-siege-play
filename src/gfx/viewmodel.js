import * as THREE from 'three';
import {WEAPONS} from '../config.js';
import {GUN_BUILDERS} from './guns/index.js';
import {gunMaterials, TINT} from './guns/kit.js';
import {buildHand} from './guns/arms.js';
import {viewmodelLights} from './guns/lighting.js';
import {Brass, Smoke, flashTextures} from './guns/effects.js';

// First-person weapon pass: own scene + camera rendered after the world with a cleared
// depth buffer (no clipping into walls). Procedural animation (sway, bob, breathing,
// recoil springs, slide/bolt/pump, reloads, draw/holster, sprint, ADS).
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const seg = (t, a, b) => sm((t - a) / (b - a));
const V = (a = [0, 0, 0]) => new THREE.Vector3(a[0], a[1], a[2]);
// Orientation for a hand from its palm normal and finger direction (three.js gun axes, forward = -Z).
function handQ(palm, fingers, side) {
  const X = V(palm).normalize().multiplyScalar(side < 0 ? 1 : -1), Z = V(fingers).normalize().negate();
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize(); X.crossVectors(Y, Z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
const _q1 = new THREE.Quaternion();
const DEF = {
  hip: [.12, -.11, -.3], hipRot: [0, .1, 0], adsDist: .3, kick: 9, back: .04, rise: .1, punch: .012, flash: .1, slideTravel: 0,
  sprintPos: [-.02, -.05, .03], sprintRot: [-.42, .55, .3], reloadPos: [-.01, .02, .02], reloadRot: [.22, .2, .45],
  eject: 'rifle', ejectVel: [1.7, 1.5, .2],
};
export class Viewmodel {
  constructor(renderer, mainScene, mainCamera, quality) {
    this.r = renderer; this.mainCam = mainCamera; this.q = quality;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .01, 6);
    this.lights = viewmodelLights(this.scene, renderer, quality);
    this.mats = gunMaterials();
    this.tex = flashTextures();
    this.guns = {}; this.tris = {};
    for (const id of Object.keys(WEAPONS)) if (GUN_BUILDERS[id]) this.guns[id] = this.buildGun(id);
    this.brass = new Brass(mainScene, quality); this.smoke = new Smoke(mainScene, quality, this.tex.smoke);
    this.t = 0; this.recoil = {p: 0, v: 0}; this.sway = {x: 0, y: 0, vx: 0, vy: 0}; this.punch = {p: 0, v: 0};
    this.sprint = 0; this.adsE = 0; this.lastSeq = 0; this.flashT = 0; this.kickYaw = 0; this.cur = null; this.lastYaw = null; this.lastPitch = 0;
    this.outdoor = 0; this.pendingEject = null; this.flashLevel = 0;
    // compile every gun's programs once (no hitch on first swap)
    for (const g of Object.values(this.guns)) g.root.visible = true;
    renderer.compile(this.scene, this.camera);
    for (const g of Object.values(this.guns)) g.root.visible = false;
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); });
  }
  buildGun(id) {
    const g = GUN_BUILDERS[id](), built = g.build(this.mats), spec = {...DEF, ...(g.vm || {})};
    const root = new THREE.Group(); root.name = 'vm:' + id; root.add(built.root); root.visible = false; this.scene.add(root);
    let tris = built.triangles;
    const hands = {};
    for (const k of ['right', 'left']) {
      const h = g.hands?.[k]; if (!h) continue;
      const m = buildHand(k === 'right' ? 1 : -1, h).build(this.mats);
      const holder = new THREE.Group(); holder.add(m.root);
      holder.position.set(h.pos[0], h.pos[1], -h.pos[2]); holder.rotation.set(h.rot[0], h.rot[1], h.rot[2], 'YXZ');
      built.root.add(holder); tris += m.triangles;
      hands[k] = {holder, pos: holder.position.clone(), rot: holder.rotation.clone(), q: holder.quaternion.clone()};
    }
    const rest = {};
    // reload hand targets (orientation): palm-up under the mag, fingers-down over the action, palm-up at the loading port
    spec.magQ = handQ([0, 1, 0], [.35, .1, -1], -1); spec.clipQ = handQ([.2, 0, -1], [.15, -1, -.25], -1); spec.portQ = handQ([0, 1, .1], [.3, .15, -1], -1);
    for (const [n, p] of Object.entries(built.parts)) rest[n] = {pos: p.position.clone(), rot: p.rotation.clone()};
    // muzzle flash: camera-facing star + two crossed side flames, additive
    const flash = new THREE.Group(); flash.position.copy(built.anchors.muzzle); built.root.add(flash);
    const fm = new THREE.SpriteMaterial({map: this.tex.star, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffd9a0});
    const star = new THREE.Sprite(fm); star.scale.setScalar(spec.flash); flash.add(star);
    const sideMat = new THREE.MeshBasicMaterial({map: this.tex.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide, color: 0xffc888});
    const sideGeo = new THREE.PlaneGeometry(1, 1); sideGeo.translate(0, .5, 0); sideGeo.rotateX(-Math.PI / 2);
    for (const r of [0, Math.PI / 2]) { const s = new THREE.Mesh(sideGeo, sideMat); s.rotation.z = r; s.scale.set(spec.flash * .55, spec.flash * 1.7, 1); flash.add(s); }
    flash.visible = false;
    // shotgun: a shell carried by the left hand while loading
    let handShell = null;
    if (g.kind === 'shotgun' && hands.left) {
      handShell = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0105, .052, 10), new THREE.MeshStandardMaterial({color: 0x8a1c12, roughness: .55}));
      const head = new THREE.Mesh(new THREE.CylinderGeometry(.0112, .0112, .014, 10), new THREE.MeshStandardMaterial({color: 0xd4a85a, metalness: .9, roughness: .3})); head.position.y = -.026;
      handShell.add(hull, head); handShell.rotation.x = Math.PI / 2; handShell.position.set(.01, .03, -.075); handShell.visible = false;
      hands.left.holder.add(handShell);
    }
    this.tris[id] = tris;
    return {id, root, gun: built.root, parts: built.parts, rest, anchors: built.anchors, hands, spec, kind: g.kind, profiles: built.profiles, flash, star, handShell, tris};
  }
  profiles(id) { return this.guns[id]?.profiles || []; }
  update(dt, w, player, area) {
    const id = w.id, G = this.guns[id], c = WEAPONS[id], S = G.spec;
    if (this.cur !== G) { if (this.cur) this.cur.root.visible = false; G.root.visible = true; this.cur = G; this.lastSeq = w.shotSequence; }
    this.t += dt;
    // fired?
    if (w.shotSequence !== this.lastSeq) { this.lastSeq = w.shotSequence; this.onFire(G, c, w); }
    const adsT = w.adsT, adsE = sm(adsT); this.adsE = adsE;
    this.sprint += ((player.sprinting ? 1 : 0) - this.sprint) * Math.min(1, dt * 9);
    const sp = this.sprint * (1 - adsE);
    // look sway (angular velocity lag)
    if (this.lastYaw === null) { this.lastYaw = player.yaw; this.lastPitch = player.pitch; }
    let dyaw = player.yaw - this.lastYaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    const dp = player.pitch - this.lastPitch; this.lastYaw = player.yaw; this.lastPitch = player.pitch;
    const inv = dt > 0 ? 1 / dt : 0, tx = Math.max(-.09, Math.min(.09, dyaw * inv * .018)), ty = Math.max(-.07, Math.min(.07, dp * inv * .014));
    // springs (sub-stepped)
    const n = Math.max(1, Math.ceil(dt / .008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      this.sway.vx += ((tx - this.sway.x) * 90 - this.sway.vx * 13) * h; this.sway.x += this.sway.vx * h;
      this.sway.vy += ((ty - this.sway.y) * 90 - this.sway.vy * 13) * h; this.sway.y += this.sway.vy * h;
      this.recoil.v += (-this.recoil.p * 260 - this.recoil.v * 22) * h; this.recoil.p += this.recoil.v * h;
      this.punch.v += (-this.punch.p * 160 - this.punch.v * 18) * h; this.punch.p += this.punch.v * h;
    }
    // base pose: hip -> ADS (sight anchor on the view axis)
    const sight = G.anchors.sight;
    const P = V(S.hip).lerp(new THREE.Vector3(-sight.x, -sight.y, -S.adsDist - sight.z), adsE);
    const R = V(S.hipRot).multiplyScalar(1 - adsE);
    // sprint lower
    P.addScaledVector(V(S.sprintPos), sp); R.addScaledVector(V(S.sprintRot), sp);
    // draw / holster
    let d = 1; if (w.action === 'draw') d = sm(w.actionT); else if (w.action === 'holster') d = 1 - sm(w.actionT);
    P.y -= (1 - d) * .3; P.z += (1 - d) * .06; R.x -= (1 - d) * 1.05; R.z += (1 - d) * .2;
    // bob + breathing
    const amp = player.moving * (1 - adsE * .85) * (1 + this.sprint * .9), b = player.bob;
    P.x += Math.sin(b) * .011 * amp; P.y -= Math.abs(Math.cos(b)) * .01 * amp; R.z += Math.sin(b) * .028 * amp; R.y += Math.sin(b) * .012 * amp;
    const br = 1 - adsE * .8;
    P.y += Math.sin(this.t * 1.6) * .0018 * br; R.x += Math.sin(this.t * 1.6 + .6) * .007 * br; R.y += Math.sin(this.t * .85) * .005 * br;
    // sway
    const sw = 1 - adsE * .75;
    R.y += this.sway.x * sw; R.x += this.sway.y * sw; P.x += this.sway.x * .05 * sw; P.y -= this.sway.y * .03 * sw;
    // recoil
    const rc = this.recoil.p * (1 - adsE * .35);
    P.z += rc * S.back; R.x += rc * S.rise; R.y += rc * this.kickYaw; P.y += rc * .006;
    // parts + action animation
    this.animateParts(G, c, w, P, R);
    G.root.position.copy(P); G.root.rotation.set(R.x, R.y, R.z, 'YXZ');
    // scope
    const scoped = S.scope && adsE > .88;
    G.root.visible = !scoped; document.body.classList.toggle('scoped', !!scoped); document.body.classList.toggle('ads', adsE > .5);
    // flash
    this.flashT = Math.max(0, this.flashT - dt);
    const fl = this.flashT > 0 ? this.flashT / .05 : 0; this.flashLevel = fl;
    G.flash.visible = fl > 0;
    if (fl > 0) G.star.material.opacity = Math.min(1, fl * 1.3);
    G.root.updateMatrixWorld(true);
    const mw = G.flash.getWorldPosition(new THREE.Vector3());
    this.lights.flash.position.copy(mw); this.lights.flash.intensity = fl * 3.2;
    // lighting follows the area (warm work-lights inside, cold moon outside)
    this.outdoor += ((area?.outdoor ? 1 : 0) - this.outdoor) * Math.min(1, dt * 2);
    this.lights.setMood(this.outdoor);
    // delayed ejection (bolt/pump cycles)
    if (this.pendingEject && w.action === 'cycle' && w.actionT >= this.pendingEject.at) { this.eject(G, this.pendingEject.kind); this.pendingEject = null; }
    if (this.pendingEject && w.action !== 'cycle') this.pendingEject = null;
    this.brass.update(dt, player.feet);
    this.smoke.update(dt);
  }
  onFire(G, c, w) {
    const S = G.spec;
    this.recoil.v += S.kick * (.85 + Math.random() * .3); this.kickYaw = (Math.random() - .5) * .25;
    this.punch.v += S.punch * 60 * (1 - this.adsE * .4);
    this.flashT = .05; G.flash.rotation.z = Math.random() * 6.28; G.star.material.rotation = Math.random() * 6.28;
    G.star.scale.setScalar(S.flash * (1.3 + Math.random() * .6));
    G.root.updateMatrixWorld(true);
    if (c.cycle) this.pendingEject = w.gun.mag > 0 ? {at: G.kind === 'shotgun' ? .32 : .38, kind: S.eject} : null;
    if (!c.cycle) this.eject(G, S.eject);
    const m = this.toWorld(G.gun.localToWorld(G.anchors.muzzle.clone()));
    this.smoke.spawn(m, G.kind === 'shotgun' ? 1.6 : G.kind === 'squad' ? 1.2 : 1);
  }
  eject(G, kind) {
    const S = G.spec; G.root.updateMatrixWorld(true);
    const p = this.toWorld(G.gun.localToWorld(G.anchors.eject.clone()));
    const v = new THREE.Vector3(S.ejectVel[0] * (.8 + Math.random() * .4), S.ejectVel[1] * (.8 + Math.random() * .4), S.ejectVel[2] + (Math.random() - .5) * .5).transformDirection(this.mainCam.matrixWorld).multiplyScalar(Math.hypot(...S.ejectVel));
    this.brass.spawn(kind, p, v);
  }
  // viewmodel camera space -> world, keeping the same screen position under the world camera's FOV
  toWorld(p) {
    const k = Math.tan(THREE.MathUtils.degToRad(this.mainCam.fov) / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    p.x *= k; p.y *= k;
    this.mainCam.updateMatrixWorld(); return p.applyMatrix4(this.mainCam.matrixWorld);
  }
  animateParts(G, c, w, P, R) {
    const S = G.spec, parts = G.parts, rest = G.rest;
    for (const [nme, p] of Object.entries(parts)) { p.position.copy(rest[nme].pos); p.rotation.copy(rest[nme].rot); p.visible = true; }
    const L = G.hands.left;
    if (L) { L.holder.position.copy(L.pos); L.holder.quaternion.copy(L.q); }
    if (G.handShell) G.handShell.visible = false;
    const ts = w.time - w.lastShot;
    // slide / reciprocating bolt blowback
    const blow = ts < .022 ? ts / .022 : Math.max(0, 1 - (ts - .022) / .07);
    if (parts.slide) {
      let z = blow * S.slideTravel;
      if (w.gun.mag === 0 && w.action !== 'reload' && G.kind === 'pistol') z = S.slideTravel;
      if (w.action === 'reload' && w.reloadEmpty && G.kind === 'pistol') z = S.slideTravel * (1 - seg(w.actionT, .74, .78));
      parts.slide.position.z += z;
    }
    if (parts.hammer) parts.hammer.rotation.x += Math.min(1, blow * 2) * .9;
    if (parts.trigger) parts.trigger.rotation.x += ts < .1 ? .35 * (1 - ts / .1) : 0;
    if (parts.cbolt && S.openBolt) parts.cbolt.position.z += blow * S.openBolt;
    const t = w.actionT;
    if (w.action === 'reload') {
      if (c.reload === 'mag') this.reloadMag(G, S, t, P, R, w);
      else if (c.reload === 'clip') this.reloadClip(G, S, t, P, R);
      else this.reloadShells(G, S, t, P, R, w);
    } else if (w.action === 'cycle') {
      if (G.kind === 'shotgun') this.pumpAnim(G, S, seg(t, .04, .38) - seg(t, .45, .8), P, R, t);
      else this.boltAnim(G, S, t, P, R);
    }
  }
  reloadMag(G, S, t, P, R, w) {
    const tilt = seg(t, 0, .14) - seg(t, .84, 1), parts = G.parts, L = G.hands.left;
    P.addScaledVector(V(S.reloadPos), tilt); R.addScaledVector(V(S.reloadRot), tilt);
    const out = V(S.magOut);
    if (parts.mag) {
      const m = parts.mag;
      if (t < .3) m.position.addScaledVector(out, seg(t, .12, .3));
      else if (t < .42) m.visible = false;
      else m.position.addScaledVector(out, .5 * (1 - seg(t, .42, .62)));
      if (t > .3 && t < .42) m.visible = false;
    }
    if (L) {
      const down = V([.02, -.3, .1]), magHand = V(S.magHand || [0, -.12, .02]).sub(L.pos);
      const carry = magHand.clone().addScaledVector(out, .5 * (1 - seg(t, .42, .62)));
      let off;
      if (t < .32) off = down.clone().multiplyScalar(seg(t, .12, .3));
      else if (t < .42) off = down.clone().lerp(magHand.clone().addScaledVector(out, .5), seg(t, .32, .42));
      else if (t < .64) off = carry;
      else off = magHand.clone().lerp(new THREE.Vector3(), seg(t, .64, .84));
      L.holder.position.add(off);
      L.holder.quaternion.copy(L.q).slerp(S.magQ, seg(t, .3, .42) - seg(t, .62, .8));
    }
    if (G.parts.cbolt && S.charge) { const k = seg(t, .7, .75) - seg(t, .77, .8); G.parts.cbolt.position.z += k * S.charge; }
  }
  reloadClip(G, S, t, P, R) {
    const tilt = seg(t, 0, .12) - seg(t, .86, 1), L = G.hands.left;
    P.addScaledVector(V(S.reloadPos), tilt); R.addScaledVector(V(S.reloadRot), tilt);
    const open = seg(t, .08, .16) - seg(t, .82, .9), back = seg(t, .16, .26) - seg(t, .72, .8);
    if (G.parts.bolt) { G.parts.bolt.rotation.z += open * (S.boltLift ?? -1.3); G.parts.bolt.position.z += back * (S.boltTravel ?? .07); }
    if (L) {
      const to = V(S.clipHand || [-.01, .06, .1]).sub(L.pos), k = seg(t, .18, .3) - seg(t, .66, .8);
      const press = Math.max(0, Math.sin((t - .3) / .34 * Math.PI * 3)) * (t > .3 && t < .64 ? 1 : 0);
      L.holder.position.addScaledVector(to, k); L.holder.position.y -= press * .022 * k;
      L.holder.quaternion.copy(L.q).slerp(S.clipQ, k);
    }
  }
  reloadShells(G, S, t, P, R, w) {
    const ph = w.shellPhase, L = G.hands.left;
    const tilt = ph === 'start' ? sm(t) : ph === 'shell' ? 1 : 1 - seg(t, .45, 1);
    P.addScaledVector(V(S.reloadPos), tilt); R.addScaledVector(V(S.reloadRot), tilt);
    if (ph === 'shell' && L) {
      const to = V(S.portHand || [0, -.07, .1]).sub(L.pos), k = seg(t, 0, .38) - seg(t, .62, 1);
      L.holder.position.addScaledVector(to, k); L.holder.position.y += seg(t, .38, .55) * .03 * (1 - seg(t, .62, 1));
      L.holder.quaternion.copy(L.q).slerp(S.portQ, k);
      if (G.handShell) G.handShell.visible = t < .55;
      R.x += Math.sin(t * Math.PI) * .03;
    }
    if (ph === 'end') this.pumpAnim(G, S, seg(t, .05, .3) - seg(t, .34, .6), P, R, t);
  }
  pumpAnim(G, S, k, P, R) {
    const z = k * (S.pumpTravel ?? .08);
    if (G.parts.pump) G.parts.pump.position.z += z;
    if (G.hands.left) G.hands.left.holder.position.z += z;
    R.x += k * .04; P.z += k * .01;
  }
  boltAnim(G, S, t, P, R) {
    const open = seg(t, .04, .18) - seg(t, .66, .8), back = seg(t, .18, .38) - seg(t, .46, .64);
    if (G.parts.bolt) { G.parts.bolt.rotation.z += open * (S.boltLift ?? -1.3); G.parts.bolt.position.z += back * (S.boltTravel ?? .07); }
    const k = seg(t, 0, .15) - seg(t, .7, .95);
    R.z -= k * .14; R.x += k * .05; P.x -= k * .01; P.y -= k * .01;
  }
  render() {
    const r = this.r; r.autoClear = false; r.clearDepth(); r.render(this.scene, this.camera); r.autoClear = true;
  }
}
