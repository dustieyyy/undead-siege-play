import {GunBuilder, TINT, B, P, K, W, WD, ring, barrel, triggerGroup, rifleStock, longHands, vm} from './parts.js';
export function trench() {
  const g = new GunBuilder('trench');
  // straight-grip stock
  g.extrude([[-.56, -.02], [-.3, -.02], [-.12, -.018], [-.07, -.012], [-.07, -.04], [-.1, -.055], [-.2, -.065], [-.56, -.155]], .044,
    {r: [.012, .02, .02, .006, .02, .02, .03, .012], bevel: .007, seg: 3, curve: 4, mat: 'wood', tint: W, wear: .45});
  g.box(-.572, -.157, -.558, -.018, .046, {r: .004, mat: 'rubber', tint: TINT.rubber});
  // receiver with loading port underneath and ejection port on the right
  g.extrude([[-.075, -.042], [.12, -.042], [.12, .014], [.1, .022], [-.06, .022], [-.075, .012]], .038, {r: [.006, .004, .004, .008, .01, .006], bevel: .003, tint: B});
  g.box(.0, -.002, .08, .016, .003, {at: [.0185, 0, 0], r: .002, mat: 'dark', tint: K, chalk: false});
  g.box(-.02, -.043, .09, -.041, .022, {r: .002, mat: 'dark', tint: K, chalk: false});
  // barrel + magazine tube + ventilated heat shield
  g.lathe([[0, .12], [.0118, .12], [.0115, .68], [.0122, .685], [.0122, .7], [0, .7]], {at: [0, .004, 0], seg: 16});
  g.lathe([[0, .12], [.0102, .12], [.0102, .6], [.011, .605], [.011, .615], [0, .615]], {at: [0, -.026, 0], seg: 12});
  g.lathe([[0, .14], [.0162, .14], [.0162, .5], [0, .5]], {at: [0, .006, 0], seg: 14, phi: [-Math.PI * .1, Math.PI * 1.2], mat: 'park', tint: P, wear: .5});
  for (let i = 0; i < 8; i++) for (const a of [-.55, 0, .55]) g.sphere([Math.sin(a) * .0164, .006 + Math.cos(a) * .0164, .17 + i * .042], .0035, {mat: 'dark', tint: K, seg: 6});
  g.box(.56, -.03, .6, .006, .016, {r: .003}); // bayonet lug / barrel clamp
  g.box(.68, .012, .69, .019, .004, {r: .001, chalk: false});
  g.sphere([0, .0225, .686], .0032, {mat: 'brass', tint: TINT.brass, seg: 8});
  triggerGroup(g, .02, -.042);
  // pump (ribbed walnut slide)
  g.part('pump', [0, -.026, .3]);
  const pr = [[0, .25]]; for (let i = 0; i < 8; i++) pr.push([.021, .26 + i * .02], [.0235, .265 + i * .02], [.0235, .272 + i * .02], [.021, .277 + i * .02]); pr.push([.02, .42], [0, .42]);
  g.lathe(pr.map(([r, l]) => [r, l]), {at: [0, -.026, 0], seg: 14, mat: 'wood', tint: W, wear: .5});
  g.rod([0, -.014, .25], [0, -.014, .13], .004, {seg: 8, chalk: false}); // action bar
  g.use('static');
  g.anchor('muzzle', 0, .004, .7).anchor('eject', .02, .006, .04).anchor('sight', 0, .0262, -.06);
  longHands(g, {grip: [-.11, -.05], gripRake: -.35, fore: [.34, -.03], foreW: .048, trigger: .85});
  g.vm = {hip: [.14, -.125, -.42], hipRot: [.03, .2, -.1], adsDist: .2, kick: 16, back: .07, rise: .14, punch: .03, flash: .2, eject: 'shell', ejectVel: [1.6, 1.4, .1],
    pumpTravel: .085, reloadRot: [.1, .1, .65], reloadPos: [-.03, .05, .04], portHand: [-.03, -.075, -.04], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]};
  g.kind = 'shotgun';
  return g;
}


// Double-barreled (side-by-side) break-action shotgun; barrels + forend hinge down for reloads.
export function doublebarrel() {
  const g = new GunBuilder('doublebarrel');
  g.extrude([[-.6, -.02], [-.3, -.02], [-.12, -.016], [-.06, -.01], [-.06, -.044], [-.1, -.056], [-.2, -.068], [-.6, -.16]], .044, {r: [.012, .02, .02, .006, .02, .02, .03, .012], bevel: .007, seg: 3, curve: 4, mat: 'wood', tint: W, wear: .45});
  g.box(-.612, -.162, -.598, -.018, .046, {r: .004, mat: 'rubber', tint: TINT.rubber});
  g.extrude([[-.065, -.044], [.03, -.04], [.03, .016], [-.05, .016], [-.065, .006]], .044, {r: [.006, .004, .004, .006, .006], bevel: .003, tint: B, wear: 1});
  g.box(-.05, .012, -.02, .02, .012, {r: .003, tint: K}); // top lever
  for (const f of [-.02, .0]) { g.part('trigger', [0, -.044, -.01]); g.extrude([[f, -.044], [f + .008, -.044], [f + .006, -.058], [f + .002, -.064], [f - .002, -.06]], .006, {r: .0015, chalk: false}); }
  g.use('static');
  g.extrude([[-.04, -.044], [.04, -.044], [.035, -.062], [.01, -.072], [-.04, -.066]], .01, {r: .004, holes: [[[-.032, -.048], [.032, -.048], [.028, -.058], [.008, -.066], [-.032, -.061]]], chalk: false});
  g.part('barrels', [0, -.02, .03]);
  for (const s of [-1, 1]) g.lathe([[0, .03], [.0128, .03], [.0124, .1], [.0116, .7], [.0122, .704], [.0122, .71], [.009, .71], [0, .705]], {at: [s * .0124, .002, 0], seg: 16});
  g.box(.04, .012, .7, .016, .006, {r: .0015}); // rib
  g.sphere([0, .018, .69], .003, {mat: 'brass', tint: TINT.brass, seg: 8});
  g.extrude([[.04, -.008], [.3, -.008], [.3, -.026], [.24, -.034], [.06, -.036], [.04, -.03]], .036, {r: .008, bevel: .005, mat: 'wood', tint: W, wear: .5});
  for (const s of [-1, 1]) g.rod([s * .0124, .002, .032], [s * .0124, .002, .036], .0108, {seg: 10, mat: 'brass', tint: TINT.brass});
  g.use('static');
  g.anchor('muzzle', 0, .002, .712).anchor('eject', .0, .01, .03).anchor('sight', 0, .0215, -.04);
  longHands(g, {grip: [-.11, -.05], gripRake: -.35, fore: [.2, -.03], foreW: .04, trigger: .85});
  g.vm = vm('rifle', {adsDist: .2, kick: 18, back: .08, rise: .16, punch: .035, flash: .2, eject: 'none', reloadRot: [.25, .15, .2], reloadPos: [-.02, .04, .04], portHand: [-.03, .06, .02]});
  g.kind = 'break';
  return g;
}
