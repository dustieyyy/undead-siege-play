import * as THREE from 'three';
import * as T from './textures.js';

// Sky dome with moving clouds + moon, moonlight, ground fog sheets, dust, and a
// fixed-size pool of point lights assigned to the nearest light anchors each frame
// (constant light count => no shader recompiles, bounded per-pixel cost).
export const LIGHT_SCALE = 4;
export const MOON_DIR = new THREE.Vector3(-.42, .55, .72).normalize();

export class Atmosphere {
  constructor(scene, camera, quality, anchors, buildingRects) {
    this.scene = scene; this.camera = camera; this.q = quality; this.anchors = anchors; this.time = 0;
    const fogColor = new THREE.Color(0x161d25);
    scene.fog = new THREE.FogExp2(fogColor, .025);
    scene.background = fogColor;
    this.buildSky(fogColor);
    this.hemi = new THREE.HemisphereLight(0x4a5c74, 0x1a1612, .8); scene.add(this.hemi);
    const moon = new THREE.DirectionalLight(0x9db2d8, 1.6);
    moon.position.copy(MOON_DIR).multiplyScalar(70).add(new THREE.Vector3(21, 0, -2)); moon.target.position.set(21, 0, -2);
    if (quality.shadows) {
      moon.castShadow = true; moon.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
      const c = moon.shadow.camera; c.left = -46; c.right = 46; c.top = 30; c.bottom = -30; c.near = 10; c.far = 150;
      moon.shadow.bias = -.0006; moon.shadow.normalBias = .04;
    }
    scene.add(moon, moon.target); this.moon = moon;
    this.pool = [];
    for (let i = 0; i < quality.lights; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.castShadow = false; scene.add(l); this.pool.push(l); }
    if (quality.fogSheets) this.buildFogSheets(buildingRects);
    this.buildDust(quality.particles);
  }

  buildSky(fogColor) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {uTime: {value: 0}, uMoon: {value: MOON_DIR.clone()}, uHorizon: {value: fogColor.clone()}},
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * .99999; }`,
      fragmentShader: `
        varying vec3 vDir; uniform float uTime; uniform vec3 uMoon; uniform vec3 uHorizon;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 d = normalize(vDir); float up = max(d.y, 0.);
          vec3 zenith = vec3(.028,.038,.06);
          vec3 col = mix(uHorizon, zenith, pow(up, .55));
          float md = max(dot(d, normalize(uMoon)), 0.);
          col += vec3(.55,.62,.75) * pow(md, 900.) * 3.0;      // moon disc
          col += vec3(.25,.30,.40) * pow(md, 40.) * .35;        // halo
          col += vec3(.12,.15,.2) * pow(md, 6.) * .25;
          vec2 uv = d.xz / (d.y + .25) * 1.6 + vec2(uTime*.012, uTime*.004);
          float c = smoothstep(.45, .85, fbm(uv));
          vec3 cloudCol = mix(vec3(.05,.06,.08), vec3(.28,.31,.38), pow(md, 8.) + .15);
          col = mix(col, cloudCol, c * smoothstep(0., .25, up) * .85);
          // stars
          float s = step(.9975, h(floor(d.xz / (d.y+.3) * 220.))) * smoothstep(.1,.5,up) * (1.-c);
          col += s * .6;
          col = mix(uHorizon, col, smoothstep(-.02, .12, d.y));
          gl_FragColor = vec4(col, 1.);
          #include <colorspace_fragment>
        }`
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat); this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  buildFogSheets(rects) {
    const tex = T.fogNoise(256); tex.map.wrapS = tex.map.wrapT = THREE.RepeatWrapping;
    this.sheets = [];
    const inside = (x, y) => rects.some(r => x > r[0] - 1 && x < r[2] + 1 && y > r[1] - 1 && y < r[3] + 1);
    for (const [hgt, op, scale, speed] of [[.22, .16, 26, .010], [.55, .11, 34, -.007], [1.0, .07, 44, .005]]) {
      const geos = [];
      for (let x = -60; x < 110; x += 5) for (let y = -60; y < 60; y += 5) {
        if (inside(x + 2.5, y + 2.5)) continue;
        const g = new THREE.PlaneGeometry(5, 5); g.rotateX(-Math.PI / 2); g.translate(x + 2.5, hgt, -(y + 2.5));
        const uv = g.attributes.uv, p = g.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale);
        geos.push(g);
      }
      const geo = mergeSimple(geos);
      const map = tex.map.clone(); map.needsUpdate = true;
      const mat = new THREE.MeshBasicMaterial({color: 0x56616e, alphaMap: map, transparent: true, opacity: op, depthWrite: false, fog: true});
      const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 4; this.scene.add(mesh);
      this.sheets.push({mesh, map, speed});
    }
  }

  buildDust(n) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - .5) * 24;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({color: 0xbfb7a6, size: .035, map: T.radialGlow(32), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending}));
    this.dust.frustumCulled = false; this.scene.add(this.dust); this.dustVel = Float32Array.from({length: n * 3}, (_, i) => (Math.random() - .5) * (i % 3 === 1 ? .05 : .12));
  }

  update(dt) {
    this.time += dt;
    this.sky.position.copy(this.camera.position); this.sky.material.uniforms.uTime.value = this.time;
    if (this.sheets) for (const s of this.sheets) { s.map.offset.x += s.speed * dt; s.map.offset.y += s.speed * .6 * dt; }
    // Dust drifts and wraps around the camera.
    const p = this.dust.geometry.attributes.position, a = p.array, c = this.camera.position;
    for (let i = 0; i < a.length; i += 3) {
      a[i] += this.dustVel[i] * dt; a[i + 1] += this.dustVel[i + 1] * dt + Math.sin(this.time + i) * .002; a[i + 2] += this.dustVel[i + 2] * dt;
      for (let k = 0; k < 3; k++) { const half = k === 1 ? 6 : 12, rel = a[i + k] - c.getComponent(k); if (rel > half) a[i + k] -= half * 2; else if (rel < -half) a[i + k] += half * 2; }
    }
    p.needsUpdate = true;
    // Assign the light pool to the nearest active anchors.
    const cam = this.camera.position;
    const cands = [];
    for (const a of this.anchors) {
      if (a.intensity <= 0 || a.level <= .001) continue;
      const d = a.pos.distanceTo(cam) - a.distance * .35;
      cands.push([d, a]);
    }
    cands.sort((x, y) => x[0] - y[0]);
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i], c2 = cands[i];
      if (!c2) { l.intensity = 0; continue; }
      const a = c2[1]; l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance; l.intensity = a.intensity * a.level * LIGHT_SCALE;
    }
  }
}

function mergeSimple(geos) {
  let count = 0; for (const g of geos) count += g.index.count;
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2); let o = 0;
  for (const g of geos) {
    const idx = g.index.array, p = g.attributes.position, u = g.attributes.uv;
    for (let i = 0; i < idx.length; i++, o++) { const j = idx[i]; pos[o * 3] = p.getX(j); pos[o * 3 + 1] = p.getY(j); pos[o * 3 + 2] = p.getZ(j); uv[o * 2] = u.getX(j); uv[o * 2 + 1] = u.getY(j); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
