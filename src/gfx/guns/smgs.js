import {GunBuilder, TINT, B, P, K, W, WD, rake, ring, barrel, triggerGroup, buttStock, pistolGrip, frontPost, rearNotch, jacket, longHands, verticalLeft, vm} from './parts.js';

// Thompson (M1928-style): wood butt, vertical foregrip, finned barrel, compensator, 30-round stick.
export function thompson() {
  const g = new GunBuilder('thompson');
  g.extrude([[-.1, -.03], [.16, -.03], [.16, .02], [.13, .026], [-.08, .026], [-.1, .016]], .036, {r: [.004, .004, .006, .01, .01, .006], bevel: .003, tint: B});
  g.box(.0, .0, .08, .016, .003, {at: [.0185, 0, 0], r: .002, mat: 'dark', tint: K, chalk: false});
  barrel(g, .16, .38, .0095, .009, {y: .004});
  for (let i = 0; i < 10; i++) ring(g, .17 + i * .012, .0145, .006, {at: [0, .004, 0]});
  g.lathe([[0, .38], [.013, .38], [.013, .44], [0, .44]], {seg: 12, at: [0, .004, 0], tint: K});
  for (let i = 0; i < 4; i++) g.box(.39 + i * .012, .014, .396 + i * .012, .02, .008, {r: .001, mat: 'dark', tint: K, chalk: false});
  buttStock(g, {from: -.1, rear: -.45, top: .016, drop: .13, width: .04});
  pistolGrip(g, .0, -.03, {len: .1, rakeK: .25});
  triggerGroup(g, .05, -.03, {mat: 'blued', tint: B});
  // vertical foregrip
  g.extrude(rake(-.1, -.03).pts([[.22, -.004], [.27, -.004], [.27, -.03], [.262, -.11], [.23, -.11], [.222, -.03]]), .034, {r: [.004, .004, .01, .012, .012, .01], bevel: .004, mat: 'wood', tint: W, wear: .5});
  g.box(.2, -.012, .3, .002, .02, {r: .003});
  g.box(-.07, .026, -.05, .04, .016, {r: .002}); rearNotch(g, -.07, .043, {base: .006});
  g.box(.39, .016, .4, .043, .0028, {r: .0008, chalk: false});
  g.part('mag', [0, -.05, .1]);
  g.extrude([[.07, -.03], [.105, -.03], [.103, -.22], [.072, -.22]], .022, {r: .003, bevel: .002});
  g.part('cbolt', [0, 0, 0]);
  g.box(.0, .026, .02, .036, .01, {r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .004, .44).anchor('eject', .02, .006, .04).anchor('sight', 0, .043, -.06);
  longHands(g, {grip: [-.03, -.04], gripRake: -.25, trigger: .9, left: verticalLeft(.246, -.03, {rakeR: .1})});
  g.vm = vm('smg', {adsDist: .2, magHand: [-.03, -.2, -.05]});
  g.kind = 'smg';
  return g;
}
// MP40: ribbed tubular receiver, bakelite grip frame, folded underfolding stock, resting bar, mag below.
export function mp40() {
  const g = new GunBuilder('mp40');
  g.lathe([[0, -.12], [.0175, -.12], [.019, -.11], [.019, .14], [.0175, .15], [0, .15]], {seg: 18, at: [0, -.004, 0], tint: B});
  for (let i = 0; i < 6; i++) ring(g, -.1 + i * .022, .0198, .008, {at: [0, -.004, 0], tint: B});
  barrel(g, .15, .33, .0105, .0092, {y: -.004});
  g.box(.16, -.03, .2, -.016, .014, {r: .003, tint: K}); // resting bar
  g.lathe([[.0085, .31], [.0115, .31], [.0115, .325], [.0085, .325], [.0085, .31]], {at: [0, .014, 0], seg: 10, chalk: false});
  g.box(.312, .008, .32, .022, .0028, {r: .0008, chalk: false});
  g.box(-.1, .012, -.085, .02, .016, {r: .002}); rearNotch(g, -.1, .024, {base: .006});
  g.extrude([[-.06, -.03], [.12, -.03], [.12, -.012], [-.06, -.012]], .03, {r: .004, bevel: .003, mat: 'park', tint: K});
  pistolGrip(g, .0, -.03, {len: .1, mat: 'park', tint: K});
  triggerGroup(g, .055, -.03, {mat: 'park', tint: K});
  g.box(.07, -.06, .11, -.028, .03, {r: .003, tint: B});
  for (const y of [-.035, -.05]) g.rod([.0, y, -.0], [0, y, .18], .004, {seg: 8, tint: B});
  g.box(.17, -.06, .19, -.03, .03, {r: .004, tint: K});
  g.part('mag', [0, -.06, .09]);
  g.extrude([[.072, -.05], [.106, -.05], [.104, -.235], [.074, -.235]], .022, {r: .003, bevel: .002});
  g.part('cbolt', [0, 0, 0]);
  g.box(-.06, .0, -.04, .01, .014, {at: [-.024, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, -.004, .33).anchor('eject', .02, .004, .02).anchor('sight', 0, .024, -.094);
  longHands(g, {grip: [-.03, -.04], gripRake: -.32, trigger: .9, left: {pos: [-.045, -.13, .05], rot: [-.1, .1, .25], curl: [1.25, 1.35, 1.4, 1.45], thumb: [1.1, -1.4], armG: [-.5, -.4, -1]}});
  g.vm = vm('smg', {adsDist: .22, magHand: [-.03, -.2, -.05]});
  g.kind = 'smg';
  return g;
}
// Type 100: full wood stock, perforated jacket, magazine from the left side.
export function type100() {
  const g = new GunBuilder('type100');
  g.extrude([[-.5, -.02], [-.12, -.014], [-.06, -.01], [.2, -.01], [.2, -.035], [.04, -.04], [-.05, -.045], [-.11, -.07], [-.18, -.07], [-.5, -.14]], .042, {r: [.012, .02, .02, .006, .006, .02, .02, .02, .02, .012], bevel: .007, seg: 3, mat: 'wood', tint: W, wear: .45});
  g.lathe([[0, -.06], [.0155, -.06], [.0155, .12], [0, .12]], {seg: 16, tint: B});
  jacket(g, .12, .33, .0145, {rows: 3, n: 6, spread: .9});
  barrel(g, .33, .36, .0085, .0085);
  g.box(.3, -.026, .34, -.01, .012, {r: .002, chalk: false}); // bayonet lug
  triggerGroup(g, .05, -.042);
  g.box(-.05, .014, -.03, .022, .014, {r: .002}); rearNotch(g, -.05, .026, {base: .006}); frontPost(g, .33, .026);
  g.part('mag', [-.02, 0, .04]);
  g.extrude([[.02, -.006], [.06, -.006], [.062, .01], [.022, .012]], .16, {at: [-.09, 0, 0], r: .004, bevel: .002, chalk: false});
  g.part('cbolt', [0, 0, 0]);
  g.box(.0, -.004, .016, .008, .014, {at: [.022, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .36).anchor('eject', .02, .004, .02).anchor('sight', 0, .026, -.045);
  longHands(g, {grip: [-.1, -.056], fore: [.16, -.036], foreW: .042, trigger: .9});
  g.vm = vm('smg', {adsDist: .2, magOut: [-.22, -.02, .0], magHand: [-.18, -.01, .0], magPalm: [1, 0, 0], magFingers: [0, .2, -1]});
  g.kind = 'smg';
  return g;
}
// PPSh-41: wood stock, perforated jacket with a slanted muzzle brake, 71-round drum.
export function ppsh() {
  const g = new GunBuilder('ppsh');
  g.extrude([[-.52, -.02], [-.14, -.012], [-.08, -.006], [.05, -.006], [.05, -.04], [-.03, -.045], [-.08, -.07], [-.16, -.07], [-.52, -.14]], .044, {r: [.012, .02, .02, .006, .01, .02, .02, .02, .012], bevel: .007, seg: 3, mat: 'wood', tint: W, wear: .45});
  g.extrude([[-.08, -.014], [.1, -.014], [.1, .02], [.08, .026], [-.06, .026], [-.08, .016]], .034, {r: [.004, .004, .004, .008, .008, .004], bevel: .003, tint: B});
  jacket(g, .1, .32, .0165, {y: .004, rows: 3, n: 7, spread: 1.0});
  g.extrude([[.32, -.012], [.36, -.012], [.345, .022], [.32, .022]], .036, {r: .003, tint: B}); // slanted brake
  triggerGroup(g, .04, -.03);
  g.box(-.04, .026, -.02, .038, .014, {r: .002}); rearNotch(g, -.04, .04, {base: .006}); frontPost(g, .335, .04, {hood: true});
  g.part('mag', [0, -.07, .07]);
  g.lathe([[0, -.02], [.066, -.02], [.07, -.014], [.07, .016], [.066, .022], [0, .022]], {seg: 22, chalk: false, xf: geo => { geo.rotateY(Math.PI / 2); geo.translate(0, -.1, -.07); }});
  g.box(.05, -.04, .09, -.012, .03, {r: .004});
  g.part('cbolt', [0, 0, 0]);
  g.box(.02, .012, .04, .02, .01, {at: [.018, 0, 0], r: .003, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .004, .36).anchor('eject', .018, .02, .03).anchor('sight', 0, .04, -.032);
  longHands(g, {grip: [-.1, -.05], fore: [.03, -.044], foreW: .044, trigger: .9, left: {pos: [-.06, -.09, -.01], rot: [-.1, .2, .5], curl: [1.1, 1.2, 1.3, 1.35], thumb: [1.0, -1.2], armG: [-.5, -.4, -1]}});
  g.vm = vm('smg', {adsDist: .22, kick: 4, magOut: [-.01, -.2, .02], magHand: [-.06, -.16, -.03]});
  g.kind = 'smg';
  return g;
}
