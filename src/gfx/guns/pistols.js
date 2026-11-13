import {GunBuilder, TINT, B, P, K, W, rake, ring, barrel, vm} from './parts.js';
// Pistols. Slide pistols share one parametric builder; the Nambu and the revolver are their own.
const R = rake(.3, -.014), rk = R.pts, rkp = R.pt;
const PISTOL_HANDS = (dy = 0, df = 0) => ({
  right: {pos: [.031, -.058 + dy, -.043 + df], rot: [-.29, 0, 0], curl: [1.2, 1.35, 1.35, 1.4], index: .95, thumb: [1.25, -1.6], arm: [.3, -.35, 1], web: [.024, .024, .022]},
  left: {pos: [-.047, -.078 + dy, -.035 + df], rot: [-.29, 0, 0], curl: [1.25, 1.3, 1.35, 1.4], thumb: [.25, .2], arm: [-.35, -.35, 1]},
});
function slidePistol(id, {L = .205, H = .031, frameTint = P, frameMat = 'park', slideTint = B, gripTint = TINT.wood, gripMat = 'grip', serr = 'fine', gripSafety = true, openTop = false, hammerSpur = true, wide = .024} = {}) {
  const g = new GunBuilder(id), FL = L - .005;
  g.extrude(rk([[-.016, -.006], [-.004, .001], [FL, .001], [FL, -.013], [.104, -.013], [.064, -.016], [.05, -.112], [.046, -.118], [-.002, -.12], [-.006, -.114], [-.017, -.03]]), .025,
    {r: [.006, .002, .002, .003, .002, .004, .008, .004, .004, .004, .01], mat: frameMat, tint: frameTint});
  g.extrude([[.058, -.012], [.106, -.012], [.106, -.03], [.092, -.046], [.058, -.046]], .009,
    {r: [.002, .004, .006, .01, .004], holes: [[[.066, -.017], [.099, -.017], [.099, -.029], [.089, -.04], [.063, -.04]]], mat: frameMat, tint: frameTint});
  g.extrude(rk([[.052, -.024], [.043, -.106], [.002, -.108], [-.008, -.034], [.012, -.02]]), .031, {r: .006, mat: gripMat, tint: gripTint, wear: .6, chalk: false});
  for (const s of [-1, 1]) for (const [f, v] of [[.034, -.04], [.024, -.094]]) g.rod(rkp([s * .0154, v, f]), rkp([s * .0162, v, f]), .0035, {seg: 8});
  if (gripSafety) g.extrude([[-.02, -.004], [-.008, -.004], [-.01, -.03], [-.022, -.028], [-.026, -.01]], .02, {r: .003, mat: frameMat, tint: frameTint, chalk: false});
  g.rod([-.0135, -.006, .088], [-.0125, -.006, .088], .0028, {seg: 8});
  g.extrude([[.07, -.004], [.098, -.004], [.1, .002], [.07, .002]], .004, {at: [-.0138, 0, 0], r: .0015, chalk: false});
  // magazine
  g.part('mag', [0, -.04, .02]);
  g.extrude(rk([[.044, -.03], [.036, -.114], [.0, -.115], [-.003, -.03]]), .019, {mat: 'blued', tint: B, chalk: false});
  g.extrude(rk([[.048, -.115], [.047, -.123], [-.004, -.124], [-.006, -.115]]), .027, {r: .003, mat: 'blued', tint: B});
  g.rod(rkp([0, -.03, .01]), rkp([0, -.03, .03]), .004, {mat: 'brass', tint: TINT.brass, seg: 8});
  // slide
  g.part('slide', [0, 0, 0]);
  const sl = openTop ? [[-.002, .001], [L, .001], [L, .014], [L * .55, .016], [L * .5, H], [.008, H], [-.002, H - .004]] : [[-.002, .001], [L, .001], [L, H - .007], [L - .006, H], [.008, H], [-.002, H - .004]];
  g.extrude(sl, wide, {r: openTop ? [.002, .002, .003, .004, .004, .004, .002] : [.002, .002, .004, .006, .004, .002], bevel: .0016, tint: slideTint});
  const nS = serr === 'wide' ? 6 : 9, step = serr === 'wide' ? .007 : .0042;
  for (let i = 0; i < nS; i++) for (const s of [-1, 1]) g.box(.008 + i * step, .006, .008 + i * step + (serr === 'wide' && i % 2 ? .0035 : .0018), H - .004, .0016, {at: [s * (wide / 2 + .0004), 0, 0], r: .0003, bevel: .0003, chalk: false, tint: K, wear: .4});
  g.box(.098, .012, .138, H - .004, .003, {at: [wide / 2 - .0005, 0, 0], r: .0015, mat: 'dark', tint: K, chalk: false});
  g.rod([wide / 2 - .0015, .02, .1], [wide / 2 - .0015, .02, .124], .0042, {mat: 'brass', tint: TINT.brass, seg: 8});
  const fs = openTop ? L - .012 : L - .017;
  g.box(fs, openTop ? .014 : H - .001, fs + .01, H + .0055, .0028, {r: .001});
  for (const s of [-1, 1]) g.box(.006, H - .001, .016, H + .006, .006, {at: [s * .0055, 0, 0], r: .001, chalk: false});
  g.box(.006, H - .001, .016, H + .002, .006, {r: .0008, chalk: false});
  g.use('static');
  if (openTop) barrel(g, .1, L + .008, .0072, .0068, {y: .016, seg: 16});
  else g.lathe([[0, 0], [.0074, 0], [.0074, .008], [.0068, .0092], [.0046, .0092], [.0046, .002], [0, .002]], {at: [0, .016, L - .005], seg: 18});
  g.part('hammer', [0, .006, -.006]);
  g.extrude(hammerSpur ? [[-.002, .0], [.004, .002], [.002, .016], [-.006, .024], [-.014, .021], [-.01, .012]] : [[-.002, 0], [.004, .002], [.002, .014], [-.004, .019], [-.01, .016], [-.008, .008]], .008, {r: [.001, .002, .003, .004, .003, .003]});
  g.part('trigger', [0, -.014, .074]);
  g.extrude([[.07, -.013], [.078, -.013], [.076, -.026], [.072, -.034], [.068, -.033], [.069, -.024]], .006, {r: .0015, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .016, L + (openTop ? .01 : .009)).anchor('eject', .013, .02, .112).anchor('sight', 0, H + .0065, .01);
  g.hands = PISTOL_HANDS();
  g.vm = vm('pistol');
  g.kind = 'pistol';
  return g;
}
export const m1911 = () => slidePistol('m1911', {gripTint: TINT.grip});
export const tt33 = () => slidePistol('tt33', {L: .19, H: .029, wide: .022, serr: 'wide', gripTint: TINT.gripBlack, gripSafety: false, slideTint: B, frameTint: B, frameMat: 'blued'});
export const p38 = () => slidePistol('p38', {L: .2, H: .03, openTop: true, serr: 'none', gripTint: TINT.gripBlack, gripSafety: false, frameTint: K, frameMat: 'park', slideTint: K, hammerSpur: false});

// Nambu Type 14: slim frame, tubular receiver with a cocking knob, long barrel, big guard.
export function nambu() {
  const g = new GunBuilder('nambu');
  g.extrude(R.pts([[-.03, -.008], [.1, -.008], [.1, -.014], [.07, -.016], [.06, -.112], [.054, -.118], [.006, -.12], [-.002, -.114], [-.03, -.02]]), .024, {r: [.008, .002, .002, .004, .008, .004, .004, .004, .012], mat: 'blued', tint: B});
  g.extrude(R.pts([[.058, -.026], [.05, -.104], [.008, -.106], [-.01, -.034], [.012, -.022]]), .03, {r: .006, mat: 'wood', tint: W, wear: .6, chalk: false});
  g.extrude([[.06, -.012], [.13, -.012], [.13, -.03], [.1, -.06], [.06, -.06]], .009, {r: [.002, .004, .012, .02, .006], holes: [[[.068, -.018], [.123, -.018], [.123, -.029], [.098, -.053], [.066, -.053]]], tint: B});
  g.lathe([[0, -.035], [.0135, -.035], [.0135, .1], [.011, .104], [0, .104]], {seg: 16, at: [0, .006, 0]});
  barrel(g, .104, .225, .0082, .0074, {y: .006, seg: 14});
  g.box(.2, .014, .21, .022, .0028, {r: .0008, chalk: false});
  for (const s of [-1, 1]) g.box(-.02, .016, -.01, .024, .005, {at: [s * .005, 0, 0], r: .001, chalk: false});
  g.part('mag', [0, -.04, .03]);
  g.extrude(R.pts([[.054, -.03], [.046, -.114], [.012, -.115], [.008, -.03]]), .018, {chalk: false});
  g.extrude(R.pts([[.058, -.115], [.057, -.124], [.006, -.125], [.004, -.115]]), .026, {r: .003});
  g.part('cbolt', [0, 0, 0]);
  g.lathe([[0, -.05], [.0085, -.05], [.0095, -.045], [.0095, -.036], [0, -.036]], {seg: 12, at: [0, .006, 0], tint: K, chalk: false});
  g.part('trigger', [0, -.014, .084]);
  g.extrude([[.08, -.013], [.088, -.013], [.086, -.028], [.082, -.038], [.078, -.037], [.079, -.026]], .006, {r: .0015, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .006, .225).anchor('eject', .014, .016, .05).anchor('sight', 0, .022, -.015);
  g.hands = PISTOL_HANDS(-.002, .005);
  g.vm = vm('pistol', {openBolt: .022, slideTravel: 0, adsDist: .3});
  g.kind = 'pistol';
  return g;
}

// .357 Magnum revolver: solid frame, fluted swing-out cylinder, barrel with an underlug, spur hammer.
export function magnum() {
  const g = new GunBuilder('magnum');
  g.extrude(R.pts([[-.03, .0], [-.014, .028], [.03, .028], [.03, .006], [.075, .006], [.075, -.014], [.06, -.016], [.05, -.108], [.044, -.116], [-.004, -.118], [-.01, -.11], [-.03, -.03]]), .024, {r: [.006, .006, .002, .002, .002, .002, .004, .008, .004, .004, .006, .012], tint: B});
  g.extrude(R.pts([[.05, -.022], [.044, -.106], [.0, -.11], [-.014, -.04], [.004, -.016]]), .034, {r: .01, mat: 'wood', tint: W, wear: .6, chalk: false});
  g.extrude([[.036, -.012], [.084, -.012], [.084, -.03], [.07, -.046], [.036, -.046]], .009, {r: [.002, .004, .006, .01, .004], holes: [[[.044, -.017], [.077, -.017], [.077, -.029], [.067, -.04], [.041, -.04]]], tint: B});
  // barrel + full underlug + rib sight
  g.lathe([[0, .075], [.0095, .075], [.0095, .225], [.0058, .225], [0, .224]], {seg: 16, at: [0, .019, 0]});
  g.box(.075, .004, .225, .016, .016, {r: .004});
  g.box(.075, .028, .22, .031, .006, {r: .0015, chalk: false});
  g.box(.205, .028, .218, .037, .003, {r: .001, chalk: false});
  g.box(-.004, .028, .012, .034, .012, {r: .001, chalk: false});
  // cylinder (dynamic): rotates per shot, swings out to the left for reloads
  g.part('cylinder', [0, .012, .052]);
  g.lathe([[0, .032], [.018, .032], [.0195, .036], [.0195, .068], [.018, .072], [0, .072]], {seg: 18, at: [0, .012, 0], wear: .9});
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.box(.038, -.0025, .066, .0025, .003, {at: [Math.cos(a) * .0195, .012 + Math.sin(a) * .0195, 0], r: .001, chalk: false, mat: 'dark', tint: K}); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.rod([Math.cos(a) * .011, .012 + Math.sin(a) * .011, .03], [Math.cos(a) * .011, .012 + Math.sin(a) * .011, .033], .0042, {seg: 8, mat: 'brass', tint: TINT.brass}); }
  g.part('hammer', [0, .016, -.012]);
  g.extrude([[-.004, 0], [.004, .002], [.002, .016], [-.008, .026], [-.018, .024], [-.012, .012]], .007, {r: [.001, .002, .003, .004, .003, .003]});
  g.part('trigger', [0, -.012, .056]);
  g.extrude([[.052, -.012], [.06, -.012], [.058, -.026], [.054, -.034], [.05, -.033], [.051, -.024]], .006, {r: .0015, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .019, .226).anchor('eject', -.03, .012, .05).anchor('sight', 0, .037, .0);
  g.hands = PISTOL_HANDS(0, -.012);
  g.vm = vm('pistol', {slideTravel: 0, kick: 16, rise: .26, punch: .025, flash: .12, adsDist: .3, eject: 'none'});
  g.kind = 'revolver';
  return g;
}
