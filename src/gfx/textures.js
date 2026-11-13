import * as THREE from 'three';
// Procedural, tileable canvas textures (all original; no external assets).
// Each texture returns {map, bump} (bump may be null). Generated once at load.

let seedState = 1337;
const rand = () => { seedState = (seedState * 1664525 + 1013904223) >>> 0; return seedState / 4294967296; };
const reseed = s => { seedState = s >>> 0 || 1; };

// Tileable smooth value noise layer: `cells` lattice cells across the texture.
function layer(size, cells, seed) {
  reseed(seed);
  const lat = new Float32Array(cells * cells); for (let i = 0; i < lat.length; i++) lat[i] = rand();
  const out = new Float32Array(size * size), k = cells / size;
  for (let y = 0; y < size; y++) {
    const fy = y * k, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
    const y0 = (iy % cells) * cells, y1 = ((iy + 1) % cells) * cells;
    for (let x = 0; x < size; x++) {
      const fx = x * k, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
      const x0 = ix % cells, x1 = (ix + 1) % cells;
      const a = lat[y0 + x0], b = lat[y0 + x1], c = lat[y1 + x0], d = lat[y1 + x1];
      out[y * size + x] = (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
    }
  }
  return out;
}
function fbm(size, baseCells, octaves, seed, gain = .5) {
  const out = new Float32Array(size * size); let amp = 1, total = 0, cells = baseCells;
  for (let o = 0; o < octaves; o++) {
    const l = layer(size, Math.min(cells, size), seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += l[i] * amp;
    total += amp; amp *= gain; cells *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function finish(size, rgb, height, {repeat = true, anisotropy = 4, alpha = null, srgb = true} = {}) {
  const make = (fill) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size); fill(img.data); ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy; return t;
  };
  const map = make(d => { for (let i = 0, n = size * size; i < n; i++) { d[i * 4] = rgb[i * 3] * 255; d[i * 4 + 1] = rgb[i * 3 + 1] * 255; d[i * 4 + 2] = rgb[i * 3 + 2] * 255; d[i * 4 + 3] = alpha ? alpha[i] * 255 : 255; } });
  if (srgb) map.colorSpace = THREE.SRGBColorSpace;
  const bump = height ? make(d => { for (let i = 0, n = size * size; i < n; i++) { const v = height[i] * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } }) : null;
  return {map, bump};
}

function paint(size, fn) {
  const rgb = new Float32Array(size * size * 3), h = new Float32Array(size * size);
  const out = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x; fn(x, y, i, out);
    rgb[i * 3] = clamp(out[0]); rgb[i * 3 + 1] = clamp(out[1]); rgb[i * 3 + 2] = clamp(out[2]); h[i] = clamp(out[3]);
  }
  return {rgb, h};
}

// Thin random crack lines drawn into a height/darkness mask.
function cracks(size, count, seed, maskOut, strength = 1) {
  reseed(seed);
  for (let c = 0; c < count; c++) {
    let x = rand() * size, y = rand() * size, a = rand() * Math.PI * 2; const len = 30 + rand() * size * .5;
    for (let s = 0; s < len; s++) {
      a += (rand() - .5) * .7; x = (x + Math.cos(a) + size) % size; y = (y + Math.sin(a) + size) % size;
      const i = (y | 0) * size + (x | 0); maskOut[i] = Math.max(maskOut[i], strength * (1 - s / len * .5));
    }
  }
}

export function concrete(size = 512, tint = [.50, .49, .46], seed = 11) {
  const big = fbm(size, 4, 4, seed), fine = fbm(size, 64, 3, seed + 7), streak = layer(size, 32, seed + 3), pits = fbm(size, 128, 2, seed + 9);
  const crack = new Float32Array(size * size); cracks(size, 6, seed + 5, crack, .8);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    let v = .82 + (big[i] - .5) * .35 + (fine[i] - .5) * .18;
    const stain = smooth(.55, .8, big[(i + size * 37) % (size * size)]) * .25;
    const form = Math.abs(((y / size) * 2) % 1 - .5) < .006 ? .1 : 0; // formwork joints
    const pit = pits[i] > .78 ? .25 : 0;
    v = v - stain - form - pit * .6 - crack[i] * .35;
    o[0] = tint[0] * v; o[1] = tint[1] * v; o[2] = tint[2] * v;
    o[3] = .55 + (fine[i] - .5) * .5 - pit * .5 - crack[i] * .6 - form * 2;
  });
  // vertical rain streaks
  reseed(seed + 99);
  for (let s = 0; s < 40; s++) {
    const x0 = (rand() * size) | 0, w = 1 + (rand() * 5) | 0, len = rand() * size * .6, d = .05 + rand() * .12;
    for (let y = 0; y < len; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * size + x % size) * 3; const f = d * (1 - y / len); rgb[i] *= 1 - f; rgb[i + 1] *= 1 - f; rgb[i + 2] *= 1 - f * .9; }
  }
  return finish(size, rgb, h);
}

export function painted(size = 512, seed = 21) {
  // v spans 3.8 m: lower dado (0..1.15 m) olive green, upper pale gray-green; peeling + grime.
  const big = fbm(size, 6, 4, seed), fine = fbm(size, 64, 3, seed + 1), peel = fbm(size, 12, 4, seed + 2);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const vy = 1 - y / size; const m = vy * 3.8;
    const lower = m < 1.15, stripe = Math.abs(m - 1.15) < .035;
    let c = lower ? [.25, .30, .22] : [.56, .58, .52];
    if (stripe) c = [.17, .16, .13];
    const grime = (1 - smooth(0, 1.3, m)) * .3 + smooth(.6, .95, big[i]) * .16 + smooth(3.0, 3.8, m) * .2;
    const p = peel[i] > .76 + (lower ? .02 : 0);
    let base = p ? [c[0] * .78 + .07, c[1] * .78 + .07, c[2] * .78 + .06] : c;
    const n = (fine[i] - .5) * .1;
    o[0] = base[0] * (1 - grime) + n; o[1] = base[1] * (1 - grime) + n; o[2] = base[2] * (1 - grime) + n;
    o[3] = (p ? .35 : .6) + n;
  });
  return finish(size, rgb, h);
}

export function brick(size = 512, seed = 31, white = false) {
  const fine = fbm(size, 64, 3, seed), big = fbm(size, 4, 3, seed + 1), per = layer(size, 64, seed + 2);
  const rows = 12, cols = 6; // texture = 1.2 m: brick 0.2 x 0.1 incl mortar
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const ry = y / size * rows, row = Math.floor(ry), fy = ry - row;
    const rx = x / size * cols + (row % 2) * .5, col = Math.floor(rx), fx = rx - col;
    const mortar = fy < .1 || fx < .05;
    const id = ((row * 31 + (col % cols) * 17) % 64);
    const bv = per[id * 8 + row % 8];
    let c;
    if (white) c = mortar ? [.62, .60, .56] : [.70 - bv * .12, .69 - bv * .12, .64 - bv * .1];
    else c = mortar ? [.42, .40, .37] : [.38 + bv * .14, .19 + bv * .06, .13 + bv * .04];
    const soot = smooth(.6, .9, big[i]) * .28, n = (fine[i] - .5) * .14;
    o[0] = c[0] * (1 - soot) + n; o[1] = c[1] * (1 - soot) + n; o[2] = c[2] * (1 - soot) + n;
    o[3] = mortar ? .2 : .65 + n;
  });
  return finish(size, rgb, h);
}

export function planks(size = 512, seed = 41, {count = 6, tint = [.42, .36, .28], gray = .45, vertical = false} = {}) {
  const grain = fbm(size, 8, 4, seed), fine = fbm(size, 128, 2, seed + 1), knots = layer(size, 24, seed + 2), per = layer(size, 32, seed + 3);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const a = vertical ? x : y, b = vertical ? y : x;
    const pp = a / size * count, p = Math.floor(pp), fp = pp - p;
    const gap = fp < .04 || fp > .97;
    const pv = per[(p * 5) % 32 + 3 * size];
    const lines = Math.sin((b / size * 3 + grain[(vertical ? x : y) * size % (size * size) + (vertical ? y : x)] * 14 + p * 3.1) * 6.283 * 2) * .5 + .5;
    const knot = knots[i] > .86 ? .35 : 0;
    let v = .75 + lines * .18 + (fine[i] - .5) * .2 - knot + (pv - .5) * .3;
    const c = [mix(tint[0], gray, .5) * v, mix(tint[1], gray * .95, .5) * v, mix(tint[2], gray * .9, .5) * v];
    if (gap) { c[0] *= .25; c[1] *= .25; c[2] *= .25; }
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = gap ? 0 : .6 + lines * .2 - knot * .5;
  });
  return finish(size, rgb, h);
}

export function corrugated(size = 512, seed = 51, tint = [.34, .36, .33]) {
  const big = fbm(size, 4, 4, seed), fine = fbm(size, 64, 3, seed + 1), rust = fbm(size, 10, 5, seed + 2);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const ridge = Math.sin(x / size * 16 * Math.PI * 2) * .5 + .5;  // 16 ridges per tile (2 m)
    const panel = (y % (size / 2)) < 3 ? .2 : 0;
    const rv = rust[i] * .7 + fine[i] * .3 + (y / size) * .12;
    const r = smooth(.62, .74, rv) * .85;
    const streak = smooth(.62, .75, rust[(x * 7) % size]) * .3;
    let c = [tint[0], tint[1], tint[2]];
    c = [mix(c[0], .33, r * .8), mix(c[1], .22, r * .8), mix(c[2], .14, r * .8)];
    const v = .7 + ridge * .35 + (fine[i] - .5) * .15 - panel - streak * .5 - (big[i] - .5) * .2;
    o[0] = c[0] * v; o[1] = c[1] * v; o[2] = c[2] * v; o[3] = ridge * .8 + (fine[i] - .5) * .1 - r * .1;
  });
  return finish(size, rgb, h);
}

export function floorConcrete(size = 512, seed = 61) {
  const big = fbm(size, 4, 5, seed), fine = fbm(size, 96, 3, seed + 1), oil = fbm(size, 8, 4, seed + 2);
  const crack = new Float32Array(size * size); cracks(size, 5, seed + 3, crack, 1);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const joint = (x % (size / 2) < 2) || (y % (size / 2) < 2);
    let v = .55 + (big[i] - .5) * .3 + (fine[i] - .5) * .16;
    const stain = smooth(.62, .82, oil[i]) * .4;
    v = v * (1 - stain) - crack[i] * .25 - (joint ? .18 : 0);
    o[0] = v * .92; o[1] = v * .9; o[2] = v * .85; o[3] = .5 + (fine[i] - .5) * .4 - crack[i] * .5 - (joint ? .4 : 0);
  });
  return finish(size, rgb, h);
}

export function ground(size = 512, seed = 71) {
  const big = fbm(size, 4, 5, seed), mid = fbm(size, 16, 4, seed + 1), fine = fbm(size, 128, 2, seed + 2), blades = layer(size, 256, seed + 3);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const mud = smooth(.45, .62, big[i] * .7 + mid[i] * .3);
    const grass = [.20 + mid[i] * .10, .22 + mid[i] * .10, .13 + fine[i] * .05];
    const dead = [.33, .29, .19];
    let g = [mix(grass[0], dead[0], smooth(.4, .7, mid[i])), mix(grass[1], dead[1], smooth(.4, .7, mid[i])), mix(grass[2], dead[2], smooth(.4, .7, mid[i]))];
    const m = [.19, .16, .12];
    const b = blades[i] > .6 ? 1.15 : .9;
    o[0] = mix(g[0] * b, m[0], mud); o[1] = mix(g[1] * b, m[1], mud); o[2] = mix(g[2] * b, m[2], mud);
    o[3] = (1 - mud) * (.5 + blades[i] * .4) + mud * .3 * fine[i];
  });
  return finish(size, rgb, h);
}

export function runway(size = 512, seed = 81) {
  const big = fbm(size, 4, 5, seed), fine = fbm(size, 96, 3, seed + 1), moss = fbm(size, 24, 3, seed + 2);
  const crack = new Float32Array(size * size); cracks(size, 14, seed + 3, crack, 1);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const joint = (x % (size / 2) < 3) || (y % (size / 2) < 3);
    let v = .46 + (big[i] - .5) * .28 + (fine[i] - .5) * .18;
    const mg = (joint || crack[i] > .2) && moss[i] > .45 ? .6 : 0;
    v -= crack[i] * .2;
    o[0] = mix(v * .95, .2, mg); o[1] = mix(v * .94, .25, mg); o[2] = mix(v * .9, .14, mg); o[3] = .5 + (fine[i] - .5) * .4 - crack[i] * .6 - (joint ? .4 : 0);
  });
  return finish(size, rgb, h);
}

export function paintedMetal(size = 256, seed = 91, tint = [.27, .30, .22]) {
  const big = fbm(size, 4, 4, seed), fine = fbm(size, 64, 3, seed + 1), chip = fbm(size, 24, 4, seed + 2);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const c = chip[i] > .68; const r = smooth(.7, .8, big[i] * .5 + chip[i] * .5);
    let col = c ? [.30, .19, .11] : tint;
    const v = .85 + (fine[i] - .5) * .2 - smooth(.6, .9, big[i]) * .25;
    o[0] = mix(col[0], .35, r * .5) * v; o[1] = mix(col[1], .2, r * .5) * v; o[2] = mix(col[2], .1, r * .5) * v; o[3] = c ? .3 : .6;
  });
  return finish(size, rgb, h);
}

export function rust(size = 256, seed = 101) {
  const big = fbm(size, 6, 5, seed), fine = fbm(size, 64, 3, seed + 1);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const v = .6 + (fine[i] - .5) * .5; const t = big[i];
    o[0] = mix(.22, .45, t) * v; o[1] = mix(.12, .22, t) * v; o[2] = mix(.08, .1, t) * v; o[3] = fine[i];
  });
  return finish(size, rgb, h);
}

export function canvasCloth(size = 256, seed = 111, tint = [.33, .33, .23]) {
  const big = fbm(size, 4, 4, seed), fine = fbm(size, 32, 3, seed + 1);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const weave = ((x % 4 < 2) ^ (y % 4 < 2)) ? .04 : -.04;
    const v = .8 + weave + (fine[i] - .5) * .2 - smooth(.55, .85, big[i]) * .3;
    o[0] = tint[0] * v; o[1] = tint[1] * v; o[2] = tint[2] * v; o[3] = .5 + weave * 4;
  });
  return finish(size, rgb, h);
}

export function burlap(size = 256, seed = 121) {
  const big = fbm(size, 4, 4, seed), fine = fbm(size, 64, 2, seed + 1);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const weave = (Math.sin(x * 1.6) * Math.sin(y * 1.6)) * .08;
    const v = .8 + weave + (fine[i] - .5) * .25 - smooth(.5, .85, big[i]) * .35;
    o[0] = .42 * v; o[1] = .36 * v; o[2] = .25 * v; o[3] = .5 + weave * 4;
  });
  return finish(size, rgb, h);
}

export function chainLink(size = 256) {
  const rgb = new Float32Array(size * size * 3), a = new Float32Array(size * size);
  const cell = size / 8;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + y) % cell, v = (x - y + size * 4) % cell;
    const d = Math.min(u, cell - u, v, cell - v);
    const i = y * size + x; const on = d < 1.6;
    a[i] = on ? 1 : 0; rgb[i * 3] = .42; rgb[i * 3 + 1] = .40; rgb[i * 3 + 2] = .37;
  }
  return finish(size, rgb, null, {alpha: a});
}

export function grating(size = 256) {
  const rgb = new Float32Array(size * size * 3), a = new Float32Array(size * size);
  const fine = fbm(size, 32, 3, 131);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x; const bar = (x % 16) < 3 || (y % 32) < 3;
    a[i] = bar ? 1 : 0; const v = .35 + fine[i] * .15; rgb[i * 3] = v * 1.1; rgb[i * 3 + 1] = v * .9; rgb[i * 3 + 2] = v * .75;
  }
  return finish(size, rgb, null, {alpha: a});
}

export function roofFelt(size = 256, seed = 141) {
  const big = fbm(size, 4, 4, seed), fine = fbm(size, 64, 3, seed + 1);
  const {rgb, h} = paint(size, (x, y, i, o) => {
    const v = .25 + (big[i] - .5) * .1 + (fine[i] - .5) * .1; const moss = smooth(.6, .8, big[i]);
    o[0] = mix(v, .16, moss); o[1] = mix(v, .2, moss); o[2] = mix(v * .95, .1, moss); o[3] = fine[i];
  });
  return finish(size, rgb, h);
}

export function fogNoise(size = 256, seed = 151) {
  const n = fbm(size, 4, 5, seed);
  const rgb = new Float32Array(size * size * 3).fill(1), a = new Float32Array(size * size);
  for (let i = 0; i < a.length; i++) a[i] = smooth(.3, .8, n[i]);
  return finish(size, rgb, null, {alpha: a, srgb: false});
}

export function radialGlow(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Blank briefing board / map sheets: hand-drawn-looking original shapes, no real maps or text.
export function boardSheet(size = 256, seed = 161) {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
  reseed(seed);
  ctx.fillStyle = '#b9ad8d'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1500; i++) { ctx.fillStyle = `rgba(60,45,25,${rand() * .06})`; ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 6, 2 + rand() * 6); }
  ctx.strokeStyle = 'rgba(70,60,45,.5)'; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, i * size / 10); ctx.lineTo(size, i * size / 10); ctx.moveTo(i * size / 10, 0); ctx.lineTo(i * size / 10, size); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(40,40,40,.7)'; ctx.lineWidth = 3; ctx.beginPath();
  let x = size * .1, y = size * .7; ctx.moveTo(x, y);
  for (let i = 0; i < 8; i++) { x += size * .1; y += (rand() - .5) * size * .2; ctx.lineTo(x, y); } ctx.stroke();
  ctx.strokeStyle = 'rgba(140,30,25,.8)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(rand() * size, rand() * size, 6 + rand() * 14, 0, Math.PI * 2); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Chalk outline for wall-buy placeholders (original silhouette, drawn procedurally).
export function chalkOutline(kind = 'rifle') {
  const w = 512, h = 160; const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h); ctx.strokeStyle = 'rgba(235,228,205,.92)'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,255,255,.4)'; ctx.shadowBlur = 4;
  const L = {rifle: [470, 18], carbine: [400, 22], shotgun: [420, 26], smg: [320, 30], squad: [470, 30], marksman: [480, 20]}[kind] || [400, 22];
  const x0 = (w - L[0]) / 2, y0 = h / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 8); ctx.lineTo(x0 + L[0] * .32, y0 - 12); ctx.lineTo(x0 + L[0] * .6, y0 - 14); ctx.lineTo(x0 + L[0], y0 - 10);
  ctx.lineTo(x0 + L[0], y0 - 2); ctx.lineTo(x0 + L[0] * .62, y0 - 2); ctx.lineTo(x0 + L[0] * .55, y0 + L[1]); ctx.lineTo(x0 + L[0] * .5, y0 + L[1]);
  ctx.lineTo(x0 + L[0] * .48, y0 + 4); ctx.lineTo(x0 + L[0] * .3, y0 + 6); ctx.lineTo(x0, y0 + 26); ctx.closePath(); ctx.stroke();
  if (kind === 'smg' || kind === 'squad') { ctx.beginPath(); ctx.rect(x0 + L[0] * .62, y0 + 2, 18, 40); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Original amber stencil glyphs (shapes only, no text) for the Supply Crate.
export function stencil() {
  const s = 256; const c = document.createElement('canvas'); c.width = c.height = s; const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, s, s); ctx.fillStyle = 'rgba(214,150,52,.9)';
  ctx.beginPath(); ctx.moveTo(s / 2, 30); ctx.lineTo(s - 50, s - 60); ctx.lineTo(50, s - 60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(s / 2, s / 2 + 15, 30, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(214,150,52,.9)'; ctx.fillRect(60, s - 45, s - 120, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export {fbm, paint, finish, reseed, rand, clamp, mix, smooth};
