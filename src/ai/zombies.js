import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const GROANS = ['zombie_groan_01', 'zombie_groan_02', 'zombie_groan_03', 'zombie_groan_04', 'zombie_groan_05'];
const WALK_CLIP_SPEED = 1.0;   // m/s the walk clip looks right at timeScale 1
const ATTACK_RATE = 2.1;       // attack clip (3.5 s) sped up to ~1.7 s
const ATTACK_HIT_AT = .42;     // fraction of the attack clip where the blow lands
const MELEE_RANGE = 1.15, MELEE_HIT_RANGE = 1.75;

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _sphere = new THREE.Sphere(), _frustum = new THREE.Frustum(), _m = new THREE.Matrix4();

// Pool of rigged zombies (SkeletonUtils clones sharing geometry/material) with a
// small state machine: rise -> chase (flow field) -> window -> tear -> vault -> chase -> attack / dead.
export class Zombies {
  constructor({scene, camera, nav, barricades, player, audio, quality, hooks}) {
    Object.assign(this, {scene, camera, nav, barricades, player, audio, hooks});
    this.cap = quality.zombieCap; this.lodDistance = quality.zombieLod; this.pool = []; this.active = [];
    this.flowTimer = 0; this.groanGate = 0; this.frame = 0; this.source = -1;
  }
  init(asset) {
    this.asset = asset;
    for (let i = 0; i < this.cap; i++) this.pool.push(this.create(i));
  }
  create(id) {
    const root = SkeletonUtils.clone(this.asset.scene);
    let main = null; root.traverse(o => { if (o.isSkinnedMesh && !main) main = o; });
    let lod = null;
    if (this.asset.lodGeometry) {
      lod = new THREE.SkinnedMesh(this.asset.lodGeometry, main.material);
      lod.position.copy(main.position); lod.quaternion.copy(main.quaternion); lod.scale.copy(main.scale);
      lod.frustumCulled = false; main.parent.add(lod); lod.bind(main.skeleton, main.bindMatrix); lod.visible = false;
    }
    const group = new THREE.Group(); group.add(root); group.visible = false; this.scene.add(group);
    const mixer = new THREE.AnimationMixer(root), clips = this.asset.clips, actions = {};
    for (const name of ['idle', 'walk', 'attack', 'death']) {
      const a = mixer.clipAction(clips[name]);
      if (name === 'attack' || name === 'death') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      actions[name] = a;
    }
    const bone = n => root.getObjectByName(n);
    return {
      id, group, root, main, lod, mixer, actions, current: null, mixAcc: 0,
      bones: {head: bone('Head'), headEnd: bone('head_end'), hips: bone('Hips'), neck: bone('neck'), lf: bone('LeftFoot'), rf: bone('RightFoot')},
      alive: false, state: 'free',
    };
  }
  get count() { return this.active.length; }
  get living() { return this.active.filter(z => z.alive).length; }
  play(z, name, {fade = .25, rate = 1, restart = false} = {}) {
    const a = z.actions[name]; a.timeScale = rate;
    if (z.current === name && !restart) return a;
    const prev = z.current && z.actions[z.current];
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
    if (prev && prev !== a) prev.crossFadeTo(a, fade, false); else a.fadeIn(fade);
    z.current = name; return a;
  }
  spawn({x, y, health, speed}) {
    const z = this.pool.pop(); if (!z) return null;
    const node = this.nav.nodeAt(x, y, 0, 2); if (node < 0) { this.pool.push(z); return null; }
    const [cx, cy] = this.nav.center(node);
    Object.assign(z, {x: cx, z: -cy, y: -1.9, heading: Math.random() * Math.PI * 2, node, health, maxHealth: health, speed, alive: true,
      state: 'rise', t: 0, attackCd: 0, groan: 1 + Math.random() * 5, bar: null, stuckT: 0, stuckX: cx, stuckZ: -cy, runner: speed > 2});
    for (const a of Object.values(z.actions)) a.stop(); z.current = null;
    this.play(z, 'idle', {fade: 0}); z.mixer.update(Math.random() * 3);
    z.group.visible = true; z.group.position.set(z.x, z.y, z.z); this.active.push(z);
    return z;
  }
  release(z) {
    z.alive = false; z.state = 'free'; z.group.visible = false;
    if (z.bar?.occupant === z) z.bar.occupant = null; z.bar = null;
    const i = this.active.indexOf(z); if (i >= 0) this.active.splice(i, 1); this.pool.push(z);
  }
  killAll() { for (const z of [...this.active]) this.release(z); }
  portalCost = p => {
    const bar = p.bar;
    if (p.reverse) return bar.boards > 0 ? Infinity : 3;
    return 2.5 + bar.boards * 1.2 + (bar.occupant ? 2 : 0) + bar.climb * 1.5;
  };
  updateFlow() {
    const p = this.player;
    this.source = this.nav.nodeAt(p.x, -p.z, p.feet, 4);
    this.nav.flow(this.source, this.portalCost);
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    this.frame++;
    if ((this.flowTimer -= dt) <= 0) { this.flowTimer = .25; this.updateFlow(); }
    this.groanGate = Math.max(0, this.groanGate - dt);
    const p = this.player;
    for (const z of this.active) this.think(z, dt, p);
    this.separate();
    // Visibility, LOD and animation throttling.
    this.camera.updateMatrixWorld();
    _frustum.setFromProjectionMatrix(_m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    const cx = this.camera.position.x, cz = this.camera.position.z;
    for (const z of this.active) {
      z.group.position.set(z.x, z.y, z.z); z.group.rotation.y = z.heading;
      const d = Math.hypot(z.x - cx, z.z - cz);
      _sphere.center.set(z.x, z.y + .9, z.z); _sphere.radius = 1.2;
      const visible = d < 70 && _frustum.intersectsSphere(_sphere);
      z.group.visible = visible; z.dist = d;
      if (z.lod) { const far = d > this.lodDistance; z.main.visible = !far; z.lod.visible = far; }
      z.mixAcc += dt;
      const every = !visible ? 0 : d > 26 ? 3 : d > 14 ? 2 : 1;
      if (every && this.frame % every === (z.id % every)) { z.mixer.update(Math.min(z.mixAcc, .25)); z.mixAcc = 0; }
      else if (!visible && z.mixAcc > 1) { z.mixer.update(z.mixAcc); z.mixAcc = 0; }
    }
  }
  think(z, dt, p) {
    z.t += dt; z.attackCd = Math.max(0, z.attackCd - dt);
    const dx = p.x - z.x, dz = p.z - z.z, dist = Math.hypot(dx, dz), sameFloor = Math.abs(p.feet - z.y) < 1.3;
    if (z.alive && (z.groan -= dt) <= 0) {
      z.groan = 3 + Math.random() * 6;
      if (this.groanGate <= 0 && dist < 40) { this.groanGate = .45; this.audio?.at(z.runner && Math.random() < .5 ? 'zombie_groan_06' : GROANS[(Math.random() * GROANS.length) | 0], z.x, z.y + 1.6, z.z, {volume: .9, rate: .9 + Math.random() * .2, ref: 2.5}); }
    }
    switch (z.state) {
      case 'rise': {
        z.y = Math.min(this.nav.h[z.node], -1.9 + z.t * 1.6);
        if (z.t > 1.25) { z.state = 'chase'; z.y = this.nav.h[z.node]; }
        return;
      }
      case 'dead': {
        if (z.t > 3.2) z.y -= dt * .7;
        if (z.t > 5) this.release(z);
        return;
      }
      case 'attack': {
        if (sameFloor) this.face(z, dx, dz, dt * 6);
        if (!z.hitDone && z.t >= z.attackLen * ATTACK_HIT_AT) {
          z.hitDone = true;
          const reach = z.bar ? Math.hypot(p.x - z.bar.inside[0], -p.z - z.bar.inside[1]) < 1.6 : dist < MELEE_HIT_RANGE && sameFloor;
          this.audio?.at('zombie_attack_swipe', z.x, z.y + 1.3, z.z, {ref: 3});
          if (reach) this.hooks.hurt?.(z);
        }
        if (z.t >= z.attackLen) { z.state = z.bar ? 'tear' : 'chase'; z.t = 0; z.attackCd = .35; z.tearT = .4; }
        return;
      }
      case 'window': {
        const bar = z.bar, [ox, oy] = z.reverse ? bar.inside : bar.outside;
        const tx = ox - z.x, tz = -oy - z.z, d = Math.hypot(tx, tz);
        if (z.reverse && bar.boards > 0) { z.state = 'chase'; z.bar = null; return; }
        if (bar.occupant && bar.occupant !== z) {
          if (d < 1.6) { this.play(z, 'idle'); this.face(z, tx, tz, dt * 3); return; } // queue behind the zombie at the window
        } else if (d < 1.4) bar.occupant = z;
        if (d < .22) {
          z.state = z.reverse ? 'vault' : 'tear'; z.t = 0; z.tearT = .8;
          if (z.reverse) this.startVault(z);
          return;
        }
        this.move(z, tx / d, tz / d, Math.min(z.speed, 1.4), dt, true);
        this.play(z, 'walk', {rate: Math.min(z.speed, 1.4) / WALK_CLIP_SPEED});
        return;
      }
      case 'tear': {
        const bar = z.bar;
        this.face(z, bar.normal[0], -bar.normal[1], dt * 6);
        if (bar.boards <= 0) { this.startVault(z); return; }
        // Swipe at the player through the window if they stand right at it.
        const pIn = Math.hypot(p.x - bar.inside[0], -p.z - bar.inside[1]) < 1.3 && Math.abs(p.feet - bar.floorH) < 1;
        if ((z.tearT -= dt) <= 0) {
          z.tearT = 1.55;
          if (pIn) { this.startAttack(z); return; }
          this.play(z, 'attack', {rate: 2.4, restart: true, fade: .12});
          z.pendingTear = .45;
        }
        if (z.pendingTear !== undefined && (z.pendingTear -= dt) <= 0) {
          z.pendingTear = undefined;
          if (this.barricades.tear(bar)) { this.audio?.at('window_plank_tear', bar.center[0], bar.floorH + 1.4, -bar.center[1], {ref: 3.5}); this.hooks.boards?.(bar); }
        }
        return;
      }
      case 'vault': {
        const v = z.vault; v.t = Math.min(1, v.t + dt / v.dur); const t = v.t;
        if (v.climb) {
          // Climb straight up the outside wall, then step in over the sill.
          const up = Math.min(1, t / .72), across = Math.max(0, (t - .72) / .28);
          const lo = v.fy, hi = v.ty;
          z.y = v.reverse ? hi + (lo - hi) * Math.max(0, (t - .28) / .72) : lo + (hi - lo + .05) * up;
          const k = v.reverse ? Math.min(1, t / .28) : across;
          z.x = v.fx + (v.tx - v.fx) * k; z.z = v.fz + (v.tz - v.fz) * k;
        } else {
          z.x = v.fx + (v.tx - v.fx) * t; z.z = v.fz + (v.tz - v.fz) * t;
          z.y = v.fy + (v.ty - v.fy) * t + Math.sin(Math.PI * t) * (v.sill + .25);
        }
        if (t >= 1) {
          const bar = z.bar; if (bar.occupant === z) bar.occupant = null;
          z.bar = null; z.state = 'chase'; z.t = 0; z.y = v.ty;
          z.node = this.nav.nodeAt(z.x, -z.z, z.y, 3);
          z.stuckT = 0;
        }
        return;
      }
      case 'chase': {
        if (sameFloor && dist < MELEE_RANGE && z.attackCd <= 0) { this.startAttack(z); return; }
        const nav = this.nav, here = nav.nodeAt(z.x, -z.z, z.y, 1);
        if (here >= 0) z.node = here;
        const node = z.node;
        const via = node >= 0 ? nav.via[node] : -1;
        if (via >= 0) {
          const portal = nav.portals[via];
          z.bar = portal.bar; z.reverse = portal.reverse; z.state = 'window'; z.t = 0; return;
        }
        let ax, az;
        const next = node >= 0 ? nav.parent[node] : -1;
        if ((sameFloor && dist < 2.2 && node >= 0 && nav.dist[node] < 3.2) || node === this.source) { ax = dx; az = dz; }
        else if (next >= 0) {
          let aim = next;
          for (let k = 0; k < 2; k++) { const n2 = nav.parent[aim]; if (n2 < 0 || nav.via[aim] >= 0 || Math.abs(nav.h[n2] - nav.h[aim]) > .45) break; aim = n2; }
          const [cx, cy] = nav.center(aim); ax = cx - z.x; az = -cy - z.z;
        } else if (sameFloor && dist < 10) { ax = dx; az = dz; }
        else { this.play(z, 'idle'); this.stuck(z, dt, dist); return; }
        const l = Math.hypot(ax, az) || 1;
        this.move(z, ax / l, az / l, z.speed, dt);
        this.play(z, 'walk', {rate: z.speed / WALK_CLIP_SPEED});
        if (node >= 0) z.y += (nav.h[node] - z.y) * Math.min(1, dt * 8);
        this.stuck(z, dt, dist);
        return;
      }
    }
  }
  stuck(z, dt, dist) {
    z.stuckT += dt;
    if (z.stuckT < 7) return;
    const moved = Math.hypot(z.x - z.stuckX, z.z - z.stuckZ);
    z.stuckT = 0; z.stuckX = z.x; z.stuckZ = z.z;
    if (moved < .6 && dist > 9 && !z.group.visible) this.hooks.respawn?.(z); // stuck out of sight: re-enter from a spawn zone
  }
  startAttack(z) {
    z.state = 'attack'; z.t = 0; z.hitDone = false;
    const a = this.play(z, 'attack', {rate: ATTACK_RATE, restart: true, fade: .12});
    z.attackLen = a.getClip().duration / ATTACK_RATE;
  }
  startVault(z) {
    const bar = z.bar, rev = z.reverse, portal = rev ? bar.portalBack : bar.portal;
    const [tx, ty] = this.nav.center(portal.to); // land on a walkable cell (props may sit right under a window)
    z.vault = {t: 0, fx: z.x, fz: z.z, tx, tz: -ty, fy: z.y, ty: rev ? bar.outsideH : bar.floorH, sill: bar.sill, climb: bar.climb > 1, reverse: rev, dur: bar.climb > 1 ? 2.6 : 1.05};
    z.state = 'vault'; z.t = 0;
    this.play(z, 'walk', {rate: 1.6});
  }
  face(z, dx, dz, k) {
    const target = Math.atan2(dx, dz); let d = target - z.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d)); z.heading += d * Math.min(1, k);
  }
  move(z, ux, uz, speed, dt, free = false) {
    this.face(z, ux, uz, dt * 7);
    const step = speed * dt, nx = z.x + ux * step, nz = z.z + uz * step;
    if (free || this.walkable(nx, nz, z.y) || !this.walkable(z.x, z.z, z.y)) { z.x = nx; z.z = nz; }
    else if (this.walkable(nx, z.z, z.y)) z.x = nx;
    else if (this.walkable(z.x, nz, z.y)) z.z = nz;
  }
  walkable(x, z, y) { return this.nav.nodeAt(x, -z, y, 0) >= 0; }
  separate() {
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (!a.alive || a.state === 'vault' || a.state === 'rise') continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (!b.alive || b.state === 'vault' || b.state === 'rise' || Math.abs(a.y - b.y) > 1) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 > .36 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), push = (.6 - d) * .5, ux = dx / d * push, uz = dz / d * push;
        if (a.state !== 'tear' && this.walkable(a.x - ux, a.z - uz, a.y)) { a.x -= ux; a.z -= uz; }
        if (b.state !== 'tear' && this.walkable(b.x + ux, b.z + uz, b.y)) { b.x += ux; b.z += uz; }
      }
    }
  }
  // Keep the player from walking through zombies.
  pushPlayer(player) {
    for (const z of this.active) {
      if (!z.alive || z.state === 'rise' || Math.abs(player.feet - z.y) > 1.2) continue;
      const dx = player.x - z.x, dz = player.z - z.z, d = Math.hypot(dx, dz);
      if (d > .62 || d < 1e-4) continue;
      const k = (.62 - d) / d, nx = player.x + dx * k, nz = player.z + dz * k;
      if (!player.blocked(nx, player.z)) player.x = nx;
      if (!player.blocked(player.x, nz)) player.z = nz;
    }
  }
  // ---------------------------------------------------------------- combat
  // Ray (origin o, unit dir d) against every living zombie's head sphere and body capsules.
  hitTest(o, d, maxDist) {
    let best = null;
    const O = _v.set(o.x, o.y, o.z), D = _w.set(d.x, d.y, d.z);
    for (const z of this.active) {
      if (!z.alive || z.state === 'rise' && z.t < .6) continue;
      // Broad phase: distance from ray to the zombie's vertical axis.
      const rx = z.x - o.x, rz = z.z - o.z, along = rx * d.x + rz * d.z;
      if (along < -1 || along > maxDist + 1) continue;
      z.group.updateMatrixWorld(true);
      const b = z.bones, P = k => b[k].getWorldPosition(new THREE.Vector3());
      const head = P('head').lerp(P('headEnd'), .42), hips = P('hips'), neck = P('neck'), feet = P('lf').add(P('rf')).multiplyScalar(.5);
      const tests = [
        [raySphere(O, D, head, .17), true],
        [rayCapsule(O, D, hips, neck, .25), false],
        [rayCapsule(O, D, hips, feet.lerp(hips, .1), .18), false],
      ];
      for (const [t, isHead] of tests) if (t !== null && t < maxDist && (!best || t < best.distance)) best = {distance: t, zombie: z, head: isHead};
    }
    return best;
  }
  damage(z, amount, head) {
    if (!z.alive) return false;
    z.health -= amount;
    if (z.health > 0) return false;
    z.alive = false; z.state = 'dead'; z.t = 0;
    if (z.bar?.occupant === z) z.bar.occupant = null; z.bar = null;
    const a = this.play(z, 'death', {rate: 1.35, restart: true, fade: .1}); void a;
    this.audio?.at('zombie_death', z.x, z.y + 1, z.z, {ref: 3});
    return true;
  }
}

function raySphere(O, D, C, r) {
  const ox = O.x - C.x, oy = O.y - C.y, oz = O.z - C.z;
  const b = ox * D.x + oy * D.y + oz * D.z, c = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - c;
  if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t >= 0 ? t : null;
}
// Closest approach between the ray and segment AB; hit if within radius.
function rayCapsule(O, D, A, B, r) {
  const ux = B.x - A.x, uy = B.y - A.y, uz = B.z - A.z, wx = O.x - A.x, wy = O.y - A.y, wz = O.z - A.z;
  const a = 1, b = D.x * ux + D.y * uy + D.z * uz, c = ux * ux + uy * uy + uz * uz, d = D.x * wx + D.y * wy + D.z * wz, e = ux * wx + uy * wy + uz * wz;
  const den = a * c - b * b; let s = den > 1e-8 ? (b * e - c * d) / den : 0, t = den > 1e-8 ? (a * e - b * d) / den : e / c;
  t = Math.max(0, Math.min(1, t)); s = Math.max(0, b * t - d);
  const px = O.x + D.x * s - (A.x + ux * t), py = O.y + D.y * s - (A.y + uy * t), pz = O.z + D.z * s - (A.z + uz * t);
  return px * px + py * py + pz * pz <= r * r ? Math.max(0, s - r * .5) : null;
}
