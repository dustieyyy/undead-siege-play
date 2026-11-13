import {GunBuilder, TINT} from './kit.js';
export {GunBuilder, TINT};
// Shared parts for the WWII-style weapon set. Gun space: origin at the rear of the receiver
// (bolt face area) on the bore axis; forward = f (-Z), up = y, lateral = x; meters.
export const B = TINT.blued, P = TINT.park, K = TINT.black, W = TINT.wood, WD = TINT.woodDark;
// Grip rake: shear points below v0 backwards as they go down.
export const rake = (k = .3, v0 = -.014) => ({pts: pts => pts.map(([u, v]) => [v < v0 ? u + (v - v0) * k : u, v]), pt: ([x, v, f]) => [x, v, v < v0 ? f + (v - v0) * k : f]});
export const ring = (g, f, r, len, o = {}) => g.lathe([[0, f], [r, f], [r, f + len], [0, f + len]], {seg: 14, chalk: false, ...o});
// Barrel with a crowned muzzle. y = bore height.
export function barrel(g, f0, f1, r0, r1, o = {}) {
  return g.lathe([[0, f0], [r0, f0], [r0 * .96, f0 + .04], [r1, f1 - .01], [r1 * 1.06, f1 - .006], [r1 * 1.06, f1], [r1 * .55, f1], [0, f1 - .002]], {seg: o.seg || 14, at: [0, o.y || 0, 0], tint: o.tint || B, mat: o.mat || 'blued', ...o});
}
// Guard ring + trigger blade (dynamic part 'trigger'). f = front of the guard, v = bottom of the action.
export function triggerGroup(g, f, v, {guard = .055, mat = 'blued', tint = B, depth = .028} = {}) {
  g.extrude([[f - guard, v + .004], [f, v + .004], [f, v - .012], [f - .012, v - depth], [f - guard + .01, v - depth], [f - guard, v - .012]], .01,
    {r: [.002, .003, .006, .01, .008, .006], holes: [[[f - guard + .006, v - .002], [f - .006, v - .002], [f - .006, v - .011], [f - .016, v - depth + .006], [f - guard + .012, v - depth + .006], [f - guard + .006, v - .012]]], mat, tint, chalk: false});
  g.part('trigger', [0, v, f - guard * .45]);
  g.extrude([[f - guard * .5, v + .002], [f - guard * .38, v + .002], [f - guard * .42, v - .014], [f - guard * .5, v - .02], [f - guard * .56, v - .018], [f - guard * .52, v - .008]], .006, {r: .0015, chalk: false});
  g.use('static');
}
// Parametric one-piece rifle stock (butt, comb, wrist, forend). pg = semi pistol grip.
export function rifleStock(g, {rear = -.66, front = .5, drop = .16, fore = .04, pg = 0, width = .044, tint = W, top = -.012, buttTop = -.026, mat = 'wood'} = {}) {
  const pts = [[rear, buttTop], [rear * .64, buttTop + .004], [-.17, top - .006], [-.07, top], [front - .04, top], [front, top - .004], [front, top - fore * .45], [front * .6, -fore], [.08, -fore - .006], [.02, -fore - .008],
    [-.05, -.05], [-.11, -.074 - pg * .03], [-.15 - pg * .02, -.07 - pg * .02], [-.3, -.085], [rear, -drop]];
  g.extrude(pts, width, {r: [.012, .02, .03, .02, .004, .006, .006, .02, .02, .01, .02, pg ? .012 : .02, .02, .03, .012], bevel: .007, seg: 3, curve: 4, mat, tint, wear: .45});
  g.box(rear - .012, -drop - .002, rear + .002, buttTop + .002, width + .002, {r: .004, mat: 'dark', tint: K});
}
// Butt stock only (for guns with pistol grips): from the receiver back.
export function buttStock(g, {from = -.08, rear = -.55, top = .012, drop = .14, width = .042, mat = 'wood', tint = W, plate = 'dark'} = {}) {
  g.extrude([[from, top], [rear, top - .03], [rear, -drop], [rear * .45 + from * .55, -drop * .5], [from, -.035]], width, {r: [.006, .012, .012, .03, .006], bevel: .007, seg: 3, mat, tint, wear: .45});
  g.box(rear - .012, -drop - .002, rear + .002, top - .028, width + .002, {r: .004, mat: plate, tint: plate === 'rubber' ? TINT.rubber : K});
}
export function pistolGrip(g, f, v, {len = .1, rakeK = .3, width = .032, mat = 'wood', tint = W} = {}) {
  const R = rake(rakeK, v);
  g.extrude(R.pts([[f - .045, v + .004], [f + .012, v + .004], [f + .01, v - .01], [f, v - len], [f - .036, v - len], [f - .052, v - .01]]), width, {r: [.004, .004, .006, .012, .01, .006], bevel: .004, mat, tint, wear: .5});
}
// Bolt assembly (part 'bolt'): body + handle + knob. bent = turned-down handle (Kar98k-style).
export function rifleBolt(g, {f = -.06, len = .1, r = .0085, handleF = -.07, bent = false, knob = .011, dust = false} = {}) {
  g.part('bolt', [0, 0, 0]);
  g.lathe([[0, f - len * .45], [r, f - len * .45], [r * 1.05, f - len * .35], [r * 1.05, f + len * .55], [0, f + len * .55]], {seg: 12, chalk: false});
  g.lathe([[0, f - len * .58], [r * 1.2, f - len * .58], [r * 1.4, f - len * .48], [r * 1.4, f - len * .42], [0, f - len * .42]], {seg: 12, chalk: false, tint: K});
  const end = bent ? [.036, -.034, handleF - .006] : [.05, -.02, handleF - .004];
  if (bent) { g.rod([.006, -.002, handleF], [.03, -.012, handleF - .002], .0042, {seg: 8}); g.rod([.03, -.012, handleF - .002], end, .0042, {seg: 8}); }
  else g.rod([.006, -.002, handleF], end, .0042, {seg: 8});
  g.sphere([end[0] + (bent ? .002 : .004), end[1] - .004, end[2]], knob, {seg: 10});
  if (dust) g.box(-.03, .006, .1, .02, .032, {r: .004, chalk: false, tint: B}); // sliding dust cover rides with the bolt
  g.use('static');
}
export function frontPost(g, f, top, {ears = true, hood = false, width = .016} = {}) {
  g.box(f - .012, top - .016, f + .006, top - .009, width, {r: .002, chalk: false});
  if (ears) for (const s of [-1, 1]) g.box(f - .012, top - .012, f + .006, top + .004, .003, {at: [s * .0075, 0, 0], r: .001, chalk: false});
  if (hood) g.lathe([[.0085, f - .014], [.0105, f - .014], [.0105, f + .006], [.0085, f + .006], [.0085, f - .014]], {at: [0, top - .002, 0], seg: 12, chalk: false});
  g.box(f - .006, top - .012, f, top, .0026, {r: .0006, chalk: false});
}
export function rearNotch(g, f, top, {len = .012, width = .02, base = .008} = {}) {
  for (const s of [-1, 1]) g.box(f, top - base, f + len, top + .002, .006, {at: [s * .0055, 0, 0], r: .001, chalk: false});
  g.box(f, top - base, f + len, top - .003, width, {r: .001, chalk: false});
}
export function peep(g, f, top, {tint = K} = {}) {
  for (const s of [-1, 1]) g.box(f - .006, top - .013, f + .002, top + .002, .003, {at: [s * .0058, 0, 0], r: .001, chalk: false, tint});
  g.lathe([[.0021, f - .003], [.0046, f - .003], [.0046, f + .002], [.0021, f + .002], [.0021, f - .003]], {at: [0, top, 0], seg: 14, tint, chalk: false});
}
export function bands(g, list, {top = .018, bottom = -.044, width = .047, tint = B} = {}) { for (const f of list) g.box(f, bottom, f + .016, top, width, {r: .004, tint}); }
export function bipod(g, f, y, {len = .26, spread = .02, tint = B} = {}) {
  for (const s of [-1, 1]) g.rod([s * .01, y - .006, f], [s * spread, y - .02, f - len], .0035, {seg: 6, tint});
  g.box(f - .015, y - .014, f + .015, y + .008, .03, {r: .004, tint});
}
// Perforated jacket: tube with rows of dark holes. phi: arc of holes around the top.
export function jacket(g, f0, f1, r, {y = 0, rows = 3, n = 8, spread = 1.1, tint = B, mat = 'blued', hole = .0045} = {}) {
  g.lathe([[0, f0], [r, f0], [r, f1], [r * .8, f1 + .006], [0, f1 + .006]], {at: [0, y, 0], seg: 16, tint, mat});
  for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
    const a = rows > 1 ? -spread + j * 2 * spread / (rows - 1) : 0, fz = f0 + (i + .5) * (f1 - f0) / n;
    for (const side of [1, -1]) { if (side < 0 && Math.abs(a) < .01) continue; const aa = a * side; g.sphere([Math.sin(aa + (side < 0 ? 0 : 0)) * r * 1.002, y + Math.cos(aa) * r, fz], hole, {mat: 'dark', tint: K, seg: 6}); if (rows === 1) break; }
  }
}
// Hands for a rifle: right on the wrist/pistol grip, left under the forend (gun space [x, y, f]).
export function longHands(g, {grip = [-.1, -.06], gripRake = -.55, fore = [.3, -.04], foreW = .044, trigger = .85, leftYaw = 0, leftDrop = 0, left} = {}) {
  g.hands = {
    right: {pos: [.034, grip[1] - .012, grip[0] - .075], rot: [gripRake, .05, 0], curl: [1.2, 1.32, 1.35, 1.4], index: trigger, thumb: [1.25, -1.5], armG: [.45, -.5, -1], web: [.024, .024, .022]},
    left: left || {pos: [-foreW / 2 - .03, fore[1] - .028 - leftDrop, fore[0] - .02], rot: [.15, -1.45 + leftYaw, 1.25], curl: [1.05, 1.15, 1.2, 1.25], thumb: [.35, -.2], armG: [-.55, -.45, -1]},
  };
}
// A vertical foregrip hold (Thompson / MG pistol grips for the support hand).
export const verticalLeft = (f, v, {x = -.0, rakeR = -.1} = {}) => ({pos: [x - .033, v - .012, f - .07], rot: [rakeR, -.05, 0], curl: [1.25, 1.35, 1.38, 1.42], thumb: [1.25, -1.5], armG: [-.5, -.5, -1], web: [.024, .024, .022]});
// Default viewmodel specs per family (overridden per gun).
export const VM = {
  rifle: {hip: [.14, -.125, -.42], hipRot: [.03, .2, -.1], adsDist: .24, kick: 12, back: .055, rise: .1, punch: .022, flash: .14, eject: 'rifle', ejectVel: [1.8, 1.6, .2],
    reloadRot: [.18, .12, -.35], reloadPos: [-.04, .04, .03], clipHand: [-.03, .095, -.01], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32], boltLift: 1.15, boltTravel: .085},
  semi: {hip: [.14, -.125, -.42], hipRot: [.03, .2, -.1], adsDist: .12, kick: 10, back: .045, rise: .08, punch: .015, flash: .13, eject: 'rifle', ejectVel: [1.8, 1.7, .2],
    charge: .06, magOut: [0, -.18, .02], reloadRot: [.18, .2, .4], reloadPos: [-.03, .04, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]},
  smg: {hip: [.14, -.13, -.4], hipRot: [.03, .2, -.1], adsDist: .2, kick: 5, back: .025, rise: .035, punch: .006, flash: .09, eject: 'smg', ejectVel: [1.7, 1.6, .2],
    openBolt: .05, charge: .06, magOut: [0, -.22, .0], reloadRot: [.15, .25, .55], reloadPos: [-.02, .05, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]},
  mg: {hip: [.15, -.135, -.44], hipRot: [.03, .2, -.1], adsDist: .18, kick: 7, back: .035, rise: .04, punch: .009, flash: .15, eject: 'rifle', ejectVel: [1.7, 1.7, .2],
    charge: .07, magOut: [0, -.22, .02], reloadRot: [.12, .2, .5], reloadPos: [-.03, .05, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]},
  pistol: {hip: [.15, -.15, -.52], hipRot: [.03, .1, -.04], adsDist: .32, kick: 10, back: .035, rise: .16, punch: .01, flash: .085, slideTravel: .03,
    eject: 'pistol', ejectVel: [1.6, 1.8, .3], magOut: [0, -.16, -.05], magHand: [-.035, -.15, -.06], reloadRot: [.2, .22, .32], reloadPos: [-.035, .015, .03], sprintPos: [-.04, -.04, .04], sprintRot: [-.4, .45, .3]},
};
export const vm = (fam, o = {}) => ({...VM[fam], ...o});
