import * as THREE from 'three';

// Muzzle flash / smoke textures (procedural canvas, cached).
let TEX = null;
export function flashTextures() {
  if (TEX) return TEX;
  const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const star = mk(128, 128, (g, w) => {
    const c = w / 2;
    const rad = g.createRadialGradient(c, c, 0, c, c, c); rad.addColorStop(0, 'rgba(255,250,230,1)'); rad.addColorStop(.18, 'rgba(255,214,140,.95)'); rad.addColorStop(.45, 'rgba(255,140,40,.35)'); rad.addColorStop(1, 'rgba(255,90,0,0)');
    g.fillStyle = rad; g.fillRect(0, 0, w, w);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + (i % 2) * .2, len = c * (i % 2 ? .7 : .98);
      g.save(); g.translate(c, c); g.rotate(a);
      const lg = g.createLinearGradient(0, 0, len, 0); lg.addColorStop(0, 'rgba(255,230,170,.9)'); lg.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(0, -6); g.lineTo(len, 0); g.lineTo(0, 6); g.closePath(); g.fill(); g.restore();
    }
  });
  const flame = mk(64, 128, (g, w, h) => {
    for (let i = 0; i < 3; i++) {
      const lg = g.createRadialGradient(w / 2, h * .1, 2, w / 2, h * .35, h * .6);
      lg.addColorStop(0, 'rgba(255,240,200,.95)'); lg.addColorStop(.35, 'rgba(255,170,70,.6)'); lg.addColorStop(1, 'rgba(255,90,10,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(w / 2 - 10 + i * 2, 0); g.quadraticCurveTo(w * (.1 + i * .3), h * .5, w / 2, h); g.quadraticCurveTo(w * (.9 - i * .3), h * .5, w / 2 + 10 - i * 2, 0); g.fill();
    }
  });
  const smoke = mk(64, 64, (g, w) => {
    for (let i = 0; i < 10; i++) {
      const x = w / 2 + (Math.random() - .5) * 18, y = w / 2 + (Math.random() - .5) * 18, r = 10 + Math.random() * 14;
      const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(220,220,220,.35)'); rg.addColorStop(1, 'rgba(220,220,220,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, w);
    }
  });
  TEX = {star, flame, smoke};
  return TEX;
}

// Ejected brass / shotgun hulls: world-space instanced pools with simple bounce physics.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _hidden = new THREE.Matrix4().makeScale(0, 0, 0);
export class Brass {
  constructor(scene, q) {
    const n = (q.particles || 900) < 300 ? 10 : 26;
    const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    // unit casing (rifle-ish bottleneck), ~0.05 m long; pistol rounds are scaled down per instance
    const casing = lathe([[0, -.025], [.0062, -.025], [.0062, -.0232], [.0055, -.022], [.006, -.02], [.006, .008], [.0042, .013], [.0035, .014], [.0035, .025], [0, .025]], 8);
    const hull = lathe([[0, -.03], [.0112, -.03], [.0112, -.016], [.0105, -.016], [.0105, .03], [0, .03]], 9);
    const col = (geo, split, a, b) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const k = p.getY(i) < split ? a : b; c.set(k, i * 3); } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); };
    col(hull, -.015, [.75, .55, .25], [.45, .05, .03]);
    const brassMat = new THREE.MeshStandardMaterial({color: 0xd8aa5a, metalness: .45, roughness: .35, emissive: 0x2a1a06});
    const hullMat = new THREE.MeshStandardMaterial({vertexColors: true, metalness: .2, roughness: .5, emissive: 0x120404});
    this.pools = {};
    for (const [k, geo, mat, size] of [['rifle', casing, brassMat, n], ['shell', hull, hullMat, Math.ceil(n / 2)]]) {
      const mesh = new THREE.InstancedMesh(geo, mat, size); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
      for (let i = 0; i < size; i++) mesh.setMatrixAt(i, _hidden);
      scene.add(mesh); this.pools[k] = {mesh, items: [], next: 0, size};
    }
    this.onBounce = null;
  }
  spawn(kind, pos, vel) {
    const pool = this.pools[kind === 'shell' ? 'shell' : 'rifle'], scale = kind === 'pistol' ? .55 : kind === 'smg' ? .62 : 1;
    const it = {pos: pos.clone(), vel: vel.clone(), rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), spin: new THREE.Vector3(14 + Math.random() * 10, (Math.random() - .5) * 20, 8 + Math.random() * 8), age: 0, bounces: 0, scale, slot: pool.next, rest: false};
    pool.items = pool.items.filter(o => o.slot !== it.slot); pool.items.push(it); pool.next = (pool.next + 1) % pool.size;
  }
  update(dt, floor) {
    for (const pool of Object.values(this.pools)) {
      if (!pool.items.length) continue;
      for (let i = pool.items.length - 1; i >= 0; i--) {
        const o = pool.items[i]; o.age += dt;
        if (!o.rest) {
          o.vel.y -= 9.8 * dt; o.pos.addScaledVector(o.vel, dt); o.rot.addScaledVector(o.spin, dt);
          const r = .006 * o.scale;
          if (o.pos.y < floor + r && o.vel.y < 0) {
            o.pos.y = floor + r; o.bounces++;
            if (o.bounces === 1) this.onBounce?.(o.pos, o.scale);
            o.vel.y = -o.vel.y * .32; o.vel.x *= .55; o.vel.z *= .55; o.spin.multiplyScalar(.5);
            if (o.bounces > 2 || Math.abs(o.vel.y) < .25) { o.rest = true; o.rot.x = Math.PI / 2; o.rot.z = 0; }
          }
        }
        const fade = o.age > 6 ? Math.max(0, 1 - (o.age - 6) / .6) : 1;
        if (fade <= 0) { pool.mesh.setMatrixAt(o.slot, _hidden); pool.items.splice(i, 1); continue; }
        _q.setFromEuler(_e.set(o.rot.x, o.rot.y, o.rot.z)); _s.setScalar(o.scale * fade);
        pool.mesh.setMatrixAt(o.slot, _m.compose(o.pos, _q, _s));
      }
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

// Muzzle smoke wisps: a few soft sprites drifting up and fading.
export class Smoke {
  constructor(scene, q, tex) {
    const n = (q.particles || 900) < 300 ? 4 : 10;
    this.items = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, color: 0xb8b4ac, transparent: true, depthWrite: false, opacity: 0}));
      s.visible = false; scene.add(s); this.items.push({s, age: 9, life: 1, vel: new THREE.Vector3(), size: 1});
    }
    this.next = 0;
  }
  spawn(p, k = 1) {
    for (let j = 0; j < (k > 1.3 ? 2 : 1); j++) {
      const it = this.items[this.next]; this.next = (this.next + 1) % this.items.length;
      it.s.position.copy(p); it.age = 0; it.life = 1.1 + Math.random() * .6; it.size = .07 * k; it.k = k;
      it.vel.set((Math.random() - .5) * .15, .22 + Math.random() * .15, (Math.random() - .5) * .15); it.s.visible = true; it.s.material.rotation = Math.random() * 6;
    }
  }
  update(dt) {
    for (const it of this.items) {
      if (it.age >= it.life) { if (it.s.visible) it.s.visible = false; continue; }
      it.age += dt; const f = it.age / it.life;
      it.s.position.addScaledVector(it.vel, dt); it.vel.multiplyScalar(1 - dt * .8);
      it.s.scale.setScalar(it.size * (1 + f * 3.5)); it.s.material.opacity = .28 * (1 - f) * Math.min(1, it.age * 12) * Math.min(1.4, it.k);
    }
  }
}
