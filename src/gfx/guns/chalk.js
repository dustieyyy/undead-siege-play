import * as THREE from 'three';

// Chalk outline for a wall-buy, traced from the gun's own side profiles (muzzle to the right).
export function chalkTexture(profiles, seed = 1) {
  const W = 1024, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const polys = profiles.flatMap(p => [p.pts, ...(p.holes || [])]).filter(p => p.length > 2);
  for (const pts of polys) for (const [u, v] of pts) { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
  const sc = Math.min((W - 90) / (x1 - x0), (H - 70) / (y1 - y0)), ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
  const X = u => ox + (u - x0) * sc, Y = v => H - (oy + (v - y0) * sc);
  // faint fill so the silhouette reads from a distance
  g.fillStyle = 'rgba(230,224,205,.07)';
  for (const p of profiles) { g.beginPath(); p.pts.forEach(([u, v], i) => i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))); g.closePath(); g.fill(); }
  g.lineJoin = 'round'; g.lineCap = 'round';
  // several jittery passes = chalky strokes
  for (let pass = 0; pass < 4; pass++) {
    g.strokeStyle = `rgba(238,232,212,${pass ? .3 : .7})`; g.lineWidth = pass ? 3 : 5;
    for (const pts of polys) {
      g.beginPath();
      const j = pass ? 3 : 1;
      pts.forEach(([u, v], i) => { const x = X(u) + (rnd() - .5) * j, y = Y(v) + (rnd() - .5) * j; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.closePath(); g.stroke();
    }
  }
  // chalk grain: knock out random specks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(0,0,0,${.3 + rnd() * .5})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 1.5); }
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
