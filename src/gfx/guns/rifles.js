import {GunBuilder, TINT, B, P, K, W, WD, rake, ring, barrel, triggerGroup, rifleStock, buttStock, pistolGrip, rifleBolt, frontPost, rearNotch, peep, bands, bipod, jacket, longHands, vm} from './parts.js';

// ------------------------------------------------ bolt-action rifles (stripper-clip reloads)
function boltRifle(id, o) {
  const g = new GunBuilder(id);
  rifleStock(g, o.stock);
  const front = o.stock.front;
  if (o.guard !== false) g.extrude([[.11, -.004], [front - .04, -.004], [front - .04, .011], [front - .06, .015], [.15, .016], [.13, .012]], .03, {r: .005, bevel: .004, mat: 'wood', tint: WD, wear: .4, at: [0, 0, o.guardStart || 0]});
  if (o.hex) g.lathe([[0, -.06], [.0155, -.06], [.0155, .135], [0, .135]], {seg: 6, phi: [Math.PI / 6, Math.PI * 2]});
  else g.lathe([[0, -.06], [.0135, -.06], [.0142, -.045], [.0142, .135], [.0125, .148], [0, .148]], {seg: 18});
  barrel(g, .148, o.muzzle, .0105, .0078);
  g.box(-.03, -.016, .11, -.004, .03, {r: .003});
  g.box(.0, -.055, .075, -.046, .03, {r: .003, tint: B});
  bands(g, o.bands);
  if (o.nose) g.box(front - .004, -.03, front + .03, .008, .03, {r: .005});
  if (o.lug) g.box(front + .02, -.024, front + .05, -.012, .012, {r: .002, chalk: false});
  rearNotch(g, o.rear, .0215);
  frontPost(g, o.muzzle - .03, .0215, {ears: !o.hood, hood: o.hood});
  triggerGroup(g, .07, -.05);
  if (o.disc) g.lathe([[0, -.002], [.012, -.002], [.012, .002], [0, .002]], {seg: 12, chalk: false, xf: geo => { geo.rotateY(Math.PI / 2); geo.translate(.023, -.06, .36); }});
  rifleBolt(g, {bent: o.bent, dust: o.dust, handleF: o.handleF ?? -.07});
  g.use('static');
  g.anchor('muzzle', 0, 0, o.muzzle + .002).anchor('eject', .016, .012, .03).anchor('sight', 0, .0215, o.rear + .004);
  longHands(g, {grip: [-.1, -.058], fore: [o.fore, -.04], foreW: .044, trigger: .85});
  g.vm = vm('rifle', o.vm || {});
  g.kind = 'bolt';
  return g;
}
export const springfield = () => boltRifle('springfield', {stock: {rear: -.62, front: .5, drop: .15}, muzzle: .66, bands: [.24, .44], rear: .0, nose: true, fore: .3, vm: {adsDist: .2}});
export const arisaka = () => boltRifle('arisaka', {stock: {rear: -.64, front: .52, drop: .15, tint: TINT.woodDark}, muzzle: .66, bands: [.22, .45], rear: .17, dust: true, lug: true, fore: .3});
export const mosin = () => boltRifle('mosin', {stock: {rear: -.66, front: .6, drop: .17}, muzzle: .76, bands: [.26, .54], rear: .17, hex: true, hood: true, fore: .34, handleF: -.08});
export const kar98k = () => boltRifle('kar98k', {stock: {rear: -.62, front: .46, drop: .15, pg: 1}, muzzle: .6, bands: [.3], rear: .17, bent: true, hood: true, nose: true, lug: true, disc: true, fore: .28});

// PTRS-41: semi-auto anti-tank rifle, huge barrel with a muzzle brake, bipod, padded butt.
export function ptrs41() {
  const g = new GunBuilder('ptrs41');
  g.extrude([[-.08, .03], [.22, .03], [.24, .018], [.24, -.05], [-.08, -.05], [-.1, -.03]], .05, {r: [.008, .008, .006, .006, .006, .01], bevel: .004, mat: 'park', tint: P});
  g.box(.02, -.075, .14, -.05, .046, {r: .006, mat: 'park', tint: P}); // magazine housing (hinged floor)
  barrel(g, .24, 1.1, .02, .015, {seg: 16});
  for (let i = 0; i < 4; i++) ring(g, .3 + i * .03, .024, .012, {tint: B});
  g.lathe([[0, 1.1], [.026, 1.1], [.026, 1.18], [0, 1.18]], {seg: 12, tint: K});
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.box(1.11 + i * .022, -.008, 1.124 + i * .022, .008, .006, {at: [s * .024, 0, 0], r: .001, mat: 'dark', tint: K, chalk: false});
  g.rod([0, .02, .28], [0, .02, .7], .007, {seg: 8, tint: B}); // gas tube
  buttStock(g, {from: -.08, rear: -.72, top: .02, drop: .19, width: .05, mat: 'park', tint: P, plate: 'rubber'});
  g.extrude([[-.62, .0], [-.42, .0], [-.42, -.12], [-.62, -.17]], .06, {r: .02, bevel: .01, mat: 'leather', tint: TINT.glove, wear: .3}); // shoulder pad
  pistolGrip(g, -.06, -.05, {len: .1});
  triggerGroup(g, .0, -.05);
  g.box(.26, .03, .3, .05, .02, {r: .003}); g.box(.27, .05, .3, .056, .016, {r: .001, chalk: false});
  frontPost(g, 1.0, .048, {ears: true});
  g.box(.98, .02, 1.0, .03, .02, {r: .003});
  bipod(g, .72, -.02, {len: .4, spread: .03});
  g.box(.5, .03, .6, .05, .03, {r: .006, mat: 'wood', tint: W}); // carry handle
  g.part('cbolt', [0, 0, 0]);
  g.box(.0, .02, .08, .032, .012, {at: [.03, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, 1.18).anchor('eject', .03, .02, .05).anchor('sight', 0, .056, .29);
  g.hands = {
    right: {pos: [.034, -.08, -.145], rot: [-.45, .05, 0], curl: [1.2, 1.32, 1.35, 1.4], index: .85, thumb: [1.25, -1.5], armG: [.45, -.5, -1], web: [.024, .024, .022]},
    left: {pos: [-.06, -.09, .1], rot: [.15, -1.45, 1.25], curl: [1.05, 1.15, 1.2, 1.25], thumb: [.35, -.2], armG: [-.55, -.45, -1]},
  };
  g.vm = vm('rifle', {hip: [.16, -.15, -.5], adsDist: .2, kick: 22, back: .09, rise: .2, punch: .05, flash: .3, clipHand: [-.03, .1, -.02]});
  g.kind = 'ptrs';
  return g;
}

// ------------------------------------------------ semi-auto rifles
function semiRifle(id, o) {
  const g = new GunBuilder(id);
  rifleStock(g, o.stock);
  g.extrude([[.1, -.004], [o.stock.front - .04, -.004], [o.stock.front - .04, .012], [.12, .016], [.1, .01]], .03, {r: .005, bevel: .004, mat: 'wood', tint: WD, wear: .4});
  g.extrude([[-.065, -.014], [.12, -.014], [.12, .012], [.1, .018], [-.05, .018], [-.065, .01]], .028, {r: [.002, .002, .004, .006, .006, .004], bevel: .0025, mat: o.recMat || 'park', tint: o.recTint || P});
  barrel(g, .12, o.muzzle, .0098, .0078);
  if (o.brake) { g.lathe([[0, o.muzzle], [.012, o.muzzle], [.012, o.muzzle + .05], [0, o.muzzle + .05]], {seg: 12, tint: K}); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.box(o.muzzle + .006 + i * .014, -.006, o.muzzle + .012 + i * .014, .006, .004, {at: [s * .011, 0, 0], r: .001, mat: 'dark', tint: K, chalk: false}); }
  if (o.gasTop) g.rod([0, .02, .12], [0, .02, o.stock.front], .006, {seg: 8, tint: B});
  if (o.gasBottom) g.box(o.stock.front - .1, -.02, o.muzzle - .03, -.008, .014, {r: .004});
  if (o.cover) for (let i = 0; i < 6; i++) for (const s of [-1, 1]) g.box(o.cover[0] + i * .025, .002, o.cover[0] + i * .025 + .012, .01, .004, {at: [s * .0155, 0, 0], r: .001, mat: 'dark', tint: K, chalk: false});
  bands(g, o.bands || []);
  if (o.peep) peep(g, o.rear, .028); else rearNotch(g, o.rear, .028);
  frontPost(g, o.muzzle - .02, .028, {ears: !o.hood, hood: o.hood});
  g.box(o.muzzle - .035, -.01, o.muzzle - .015, .018, .016, {r: .003});
  triggerGroup(g, .02, -.046, {mat: 'park', tint: P});
  if (o.clip) { // en-bloc: clip visible on top of the follower (part 'mag' = the clip)
    g.part('mag', [0, -.0, .03]);
    g.box(.01, -.012, .07, .01, .02, {r: .002, chalk: false, tint: B});
    for (let i = 0; i < 3; i++) g.rod([(i - 1) * .0055, .008, .012], [(i - 1) * .0055, .008, .068], .0045, {seg: 8, mat: 'brass', tint: TINT.brass});
  } else {
    g.part('mag', [0, -.04, .06]);
    g.extrude([[.03, -.014], [.09, -.014], [.088, -.04 - o.mag], [.032, -.044 - o.mag]], .026, {r: .004, bevel: .002});
    g.box(.03, -.05 - o.mag, .092, -.04 - o.mag, .03, {r: .003, tint: K});
  }
  g.part('cbolt', [0, 0, 0]);
  g.box(.02, -.004, .12, .006, .006, {at: [.017, 0, 0], r: .002, chalk: false});
  g.box(.1, -.006, .118, .01, .014, {at: [.022, 0, 0], r: .003, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, o.muzzle + (o.brake ? .05 : .002)).anchor('eject', .016, .012, .02).anchor('sight', 0, .028, o.rear + .001);
  longHands(g, {grip: [-.07, -.054], fore: [o.fore, -.036], foreW: .042, trigger: .85});
  g.vm = vm('semi', {magHand: [-.035, -.09 - o.mag, -.02], adsDist: o.peep ? .07 : .2, ...(o.vm || {})});
  g.kind = id === 'garand' ? 'enbloc' : 'semi';
  return g;
}
export const svt40 = () => semiRifle('svt40', {recMat: 'blued', recTint: B, stock: {rear: -.6, front: .38, drop: .15}, muzzle: .6, brake: true, gasTop: true, cover: [.14], mag: .05, rear: .14, hood: true, fore: .24, bands: [.36]});
export const g43 = () => semiRifle('g43', {recMat: 'blued', recTint: B, stock: {rear: -.6, front: .4, drop: .15, pg: 1}, muzzle: .62, gasTop: true, mag: .06, rear: .12, hood: true, fore: .26, bands: [.26]});
export const garand = () => semiRifle('garand', {stock: {rear: -.62, front: .44, drop: .15, pg: .6}, muzzle: .66, gasBottom: true, clip: true, mag: 0, rear: -.035, peep: true, fore: .28, bands: [.28],
  vm: {clipHand: [-.03, .09, .0], reloadRot: [.18, .12, -.35], reloadPos: [-.04, .04, .03]}});
// M1A1 carbine: paratrooper folding stock (wire frame + pistol grip), short wood forend, 15-round mag.
export function m1a1() {
  const g = new GunBuilder('m1a1');
  g.extrude([[-.07, -.012], [.33, -.012], [.36, -.016], [.36, -.03], [.2, -.038], [.07, -.042], [-.04, -.046], [-.07, -.04]], .04, {r: .008, bevel: .006, seg: 3, mat: 'wood', tint: W, wear: .45});
  pistolGrip(g, -.06, -.04, {len: .095});
  for (const y of [-.02, -.075]) g.rod([.0, y, -.1], [0, y + (y < -.05 ? .025 : 0), -.47], .0045, {seg: 8, tint: B});
  g.box(-.49, -.1, -.46, .0, .026, {r: .006, tint: B});
  g.extrude([[-.4, -.022], [-.18, -.02], [-.18, -.008], [-.4, -.01]], .03, {r: .005, bevel: .003, mat: 'leather', tint: TINT.glove, wear: .3});
  g.extrude([[.1, -.004], [.3, -.004], [.3, .012], [.12, .015], [.1, .01]], .03, {r: .005, bevel: .004, mat: 'wood', tint: WD, wear: .4});
  g.extrude([[-.065, -.014], [.11, -.014], [.11, .012], [.09, .017], [-.05, .017], [-.065, .01]], .028, {r: [.002, .002, .004, .006, .006, .004], bevel: .0025, mat: 'park', tint: P});
  barrel(g, .11, .46, .0095, .0078);
  g.box(.29, -.02, .32, .006, .03, {r: .003, mat: 'park', tint: P});
  g.box(.3, -.018, .4, -.008, .012, {r: .003, tint: B});
  g.box(-.05, .015, -.025, .022, .016, {r: .002, mat: 'park', tint: P});
  peep(g, -.037, .028);
  frontPost(g, .468, .028);
  triggerGroup(g, .02, -.046, {mat: 'park', tint: P});
  g.part('mag', [0, -.04, .06]);
  g.extrude([[.04, -.014], [.085, -.014], [.083, -.09], [.042, -.094]], .024, {r: .004, bevel: .002});
  g.box(.04, -.1, .087, -.09, .028, {r: .003, tint: K});
  g.part('cbolt', [0, 0, 0]);
  g.box(.02, -.004, .12, .006, .006, {at: [.017, 0, 0], r: .002, chalk: false});
  g.box(.1, -.006, .118, .01, .014, {at: [.022, 0, 0], r: .003, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .462).anchor('eject', .016, .012, .02).anchor('sight', 0, .028, -.036);
  longHands(g, {grip: [-.09, -.05], gripRake: -.35, fore: [.22, -.036], foreW: .04, trigger: .85});
  g.vm = vm('semi', {adsDist: .07, magHand: [-.035, -.11, -.02], kick: 8});
  g.kind = 'semi';
  return g;
}

// ------------------------------------------------ assault rifles
export function stg44() {
  const g = new GunBuilder('stg44');
  g.extrude([[-.09, -.03], [.24, -.03], [.24, .012], [.2, .02], [-.06, .02], [-.09, .012]], .032, {r: [.004, .004, .004, .008, .008, .004], bevel: .003, mat: 'park', tint: P});
  for (let i = 0; i < 4; i++) g.box(-.05 + i * .06, -.022, -.03 + i * .06, .012, .0335, {r: .002, mat: 'park', tint: P, chalk: false});
  g.extrude([[.12, -.03], [.3, -.03], [.31, -.018], [.31, .006], [.12, .006]], .036, {r: .006, bevel: .004, mat: 'park', tint: P}); // handguard
  g.rod([0, .022, .2], [0, .022, .38], .0075, {seg: 10, tint: B}); // gas tube
  barrel(g, .3, .5, .0095, .0085);
  g.lathe([[0, .5], [.0115, .5], [.0115, .515], [0, .515]], {seg: 12, tint: K});
  frontPost(g, .38, .036, {hood: true});
  g.box(.355, .0, .39, .028, .016, {r: .004});
  g.box(.0, .02, .05, .03, .022, {r: .003, mat: 'park', tint: P}); rearNotch(g, .03, .036, {len: .012, base: .006});
  buttStock(g, {from: -.09, rear: -.48, top: .012, drop: .13, width: .042});
  pistolGrip(g, .0, -.03, {len: .1, mat: 'wood', tint: TINT.woodDark});
  triggerGroup(g, .05, -.03, {mat: 'park', tint: P});
  g.part('mag', [0, -.05, .14]);
  const curve = []; for (let i = 0; i <= 6; i++) { const t = i / 6; curve.push([.11 + t * .06 + t * t * .03, -.03 - t * .2]); }
  const back = curve.map(([u, v]) => [u + .036, v - .002]).reverse();
  g.extrude([...curve, ...back], .022, {r: .004, bevel: .002});
  g.part('cbolt', [0, 0, 0]);
  g.box(.14, .004, .16, .016, .016, {at: [-.02, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .515).anchor('eject', .017, .006, .06).anchor('sight', 0, .036, .036);
  longHands(g, {grip: [-.03, -.04], gripRake: -.35, fore: [.24, -.03], foreW: .036, trigger: .9});
  g.vm = vm('smg', {adsDist: .2, kick: 6, back: .03, rise: .045, flash: .11, eject: 'rifle', openBolt: 0, magOut: [0, -.24, .06], magHand: [-.035, -.2, -.1]});
  g.kind = 'assault';
  return g;
}
export function fg42() {
  const g = new GunBuilder('fg42');
  g.extrude([[-.1, -.028], [.2, -.028], [.2, .014], [.17, .02], [-.08, .02], [-.1, .012]], .03, {r: [.004, .004, .004, .008, .008, .004], bevel: .003, mat: 'park', tint: P});
  g.extrude([[.06, -.06], [.26, -.05], [.27, -.03], [.27, -.01], [.06, -.028]], .034, {r: .008, bevel: .004, mat: 'wood', tint: W, wear: .5}); // forend
  barrel(g, .2, .52, .009, .008);
  g.lathe([[0, .52], [.012, .52], [.012, .57], [0, .57]], {seg: 12, tint: K});
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.box(.53 + i * .012, -.004, .536 + i * .012, .004, .003, {at: [s * .011, 0, 0], r: .001, mat: 'dark', tint: K, chalk: false});
  bipod(g, .5, -.01, {len: .3, spread: .016});
  // steep pistol grip, thin sloped butt
  pistolGrip(g, .0, -.03, {len: .11, rakeK: .55, mat: 'wood', tint: TINT.woodDark});
  triggerGroup(g, .04, -.03, {mat: 'park', tint: P});
  g.extrude([[-.1, .0], [-.42, -.03], [-.43, -.12], [-.4, -.13], [-.18, -.06], [-.1, -.03]], .03, {r: .01, bevel: .005, mat: 'wood', tint: W});
  g.box(-.11, .02, -.08, .045, .012, {r: .002}); g.box(.44, .0, .46, .046, .01, {r: .002});
  rearNotch(g, -.1, .052, {base: .006}); frontPost(g, .45, .052);
  g.part('mag', [-.03, .0, .06]);
  g.extrude([[.03, -.008], [.085, -.008], [.085, .012], [.03, .012]], .14, {at: [-.085, 0, 0], r: .004, bevel: .002, chalk: false});
  g.part('cbolt', [0, 0, 0]);
  g.box(.12, -.004, .14, .008, .014, {at: [.022, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .57).anchor('eject', .018, .006, .05).anchor('sight', 0, .052, -.095);
  longHands(g, {grip: [-.04, -.04], gripRake: -.55, fore: [.18, -.05], foreW: .034, trigger: .9});
  g.vm = vm('mg', {adsDist: .22, kick: 7, flash: .13, magOut: [-.22, -.02, .0], magHand: [-.17, -.01, -.02], magPalm: [1, 0, 0], magFingers: [0, .2, -1]});
  g.kind = 'assault';
  return g;
}
