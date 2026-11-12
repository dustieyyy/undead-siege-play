// Shared wall/opening splitting used by both collision and rendering, so what
// you see is exactly what you collide with.
export const DEFAULT_T = .4;

export function wallFrame(wall) {
  const [ax, ay] = wall.a, [bx, by] = wall.b;
  const horizontal = ay === by;
  const t = wall.t ?? DEFAULT_T;
  const u0 = horizontal ? Math.min(ax, bx) : Math.min(ay, by);
  const u1 = horizontal ? Math.max(ax, bx) : Math.max(ay, by);
  const c = horizontal ? ay : ax;
  // Extend by half thickness so corners close.
  return {horizontal, t, u0: u0 - t / 2, u1: u1 + t / 2, c};
}

// Rect along the wall between u-range, as plan [x0,y0,x1,y1].
export function wallRect(frame, ua, ub, thick = frame.t) {
  return frame.horizontal ? [ua, frame.c - thick / 2, ub, frame.c + thick / 2] : [frame.c - thick / 2, ua, frame.c + thick / 2, ub];
}

export function wallPieces(wall) {
  const f = wallFrame(wall);
  const base = wall.base ?? 0, top = base + wall.h;
  const openings = (wall.openings || []).map(o => ({...o, u0: o.at - o.w / 2, u1: o.at + o.w / 2, zb: base + o.sill, zt: Math.min(top, base + o.top)}));
  const cuts = new Set([f.u0, f.u1]);
  for (const o of openings) { cuts.add(Math.max(f.u0, o.u0)); cuts.add(Math.min(f.u1, o.u1)); }
  const us = [...cuts].sort((a, b) => a - b);
  const solids = [];
  for (let i = 0; i < us.length - 1; i++) {
    const a = us[i], b = us[i + 1];
    if (b - a < 1e-4) continue;
    const mid = (a + b) / 2;
    let spans = [[base, top]];
    for (const o of openings) {
      if (mid <= o.u0 || mid >= o.u1) continue;
      const next = [];
      for (const [s, e] of spans) {
        if (o.zt <= s || o.zb >= e) { next.push([s, e]); continue; }
        if (o.zb > s) next.push([s, o.zb]);
        if (o.zt < e) next.push([o.zt, e]);
      }
      spans = next;
    }
    for (const [s, e] of spans) if (e - s > 1e-3) solids.push({rect: wallRect(f, a, b), zb: s, zt: e});
  }
  return {frame: f, solids, openings: openings.map(o => ({...o, rect: wallRect(f, o.u0, o.u1)}))};
}

export const toWorldBox = (rect, zb, zt) => ({
  minX: Math.min(rect[0], rect[2]), maxX: Math.max(rect[0], rect[2]),
  minY: zb, maxY: zt,
  minZ: -Math.max(rect[1], rect[3]), maxZ: -Math.min(rect[1], rect[3]),
});
export const W = (x, y) => ({x, z: -y}); // plan -> world XZ
export const inRect = (rect, x, y, pad = 0) => x >= rect[0] - pad && x <= rect[2] + pad && y >= rect[1] - pad && y <= rect[3] + pad;
