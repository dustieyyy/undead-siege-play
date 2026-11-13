import {GunBuilder, TINT, B, P, K, W, WD, rake, ring, barrel, triggerGroup, rifleStock, buttStock, pistolGrip, frontPost, rearNotch, bipod, jacket, longHands, verticalLeft, vm} from './parts.js';

const MG = (o = {}) => vm('mg', {beltOut: [0, -.05, .0], ...o});
// Belt box (part 'mag') hung off the left of the receiver + a short belt of rounds feeding in.
function beltBox(g, f, {w = .1, h = .1, d = .055, x = -.075, y = -.06, n = 6} = {}) {
  g.part('mag', [x, y, f]);
  g.box(f - w / 2, y - h, f + w / 2, y, d, {at: [x, 0, 0], r: .006, mat: 'park', tint: TINT.sleeve});
  g.box(f - w / 2 + .004, y - .004, f + w / 2 - .004, y + .004, d + .004, {at: [x, 0, 0], r: .002, mat: 'park', tint: P});
  g.box(f - .02, y + .004, f + .02, y + .012, .01, {at: [x, 0, 0], r: .003, tint: K});
  for (let i = 0; i < n; i++) { const t = i / (n - 1), xx = x + .02 + t * (-x - .02), yy = y + .01 + t * (-y - .012); g.rod([xx, yy, f - .028], [xx, yy, f + .03], .0042, {seg: 6, mat: 'brass', tint: TINT.brass}); for (const df of [-.016, .016]) g.rod([xx, yy, f + df - .003], [xx, yy, f + df + .003], .0052, {seg: 6, mat: 'dark', tint: K}); }
  g.use('static');
}
// Hinged feed cover (part 'cover', pivot at its front, swings up).
function feedCover(g, f0, f1, top, w, o = {}) {
  g.part('cover', [0, top, f1]);
  g.extrude([[f0, top - .01], [f1, top - .01], [f1, top + .004], [f0 + .01, top + .008], [f0, top + .002]], w, {r: .003, bevel: .002, mat: 'park', tint: o.tint || P});
  if (o.sight) rearNotch(g, f0 + .01, top + .02, {base: .012});
  g.use('static');
}

// Type 99 LMG: top-loaded curved box, wood butt with monopod, bipod, finned barrel, carry handle.
export function type99() {
  const g = new GunBuilder('type99');
  g.extrude([[-.1, -.05], [.2, -.05], [.2, .016], [.18, .024], [-.08, .024], [-.1, .014]], .046, {r: [.006, .004, .004, .01, .01, .006], bevel: .003, mat: 'park', tint: P});
  buttStock(g, {from: -.1, rear: -.6, top: .01, drop: .15, width: .044});
  g.rod([0, -.1, -.4], [0, -.16, -.4], .006, {seg: 8, tint: K});
  pistolGrip(g, .0, -.05, {len: .1});
  triggerGroup(g, .03, -.05, {mat: 'park', tint: P});
  barrel(g, .2, .78, .012, .011, {y: .004});
  for (let i = 0; i < 12; i++) ring(g, .22 + i * .014, .019, .006, {at: [0, .004, 0]});
  g.lathe([[0, .78], [.015, .78], [.015, .83], [.012, .835], [0, .835]], {seg: 14, at: [0, .004, 0], tint: K});
  g.lathe([[0, .2], [.008, .2], [.008, .6], [0, .6]], {seg: 10, at: [0, -.024, 0]});
  g.box(.58, -.03, .6, .014, .03, {r: .003});
  bipod(g, .6, -.03, {len: .3, spread: .03});
  g.rod([0, .03, .22], [0, .06, .26], .005, {seg: 8, tint: K}); g.rod([0, .06, .26], [0, .06, .34], .006, {seg: 8, mat: 'wood', tint: W}); g.rod([0, .06, .34], [0, .02, .38], .005, {seg: 8, tint: K});
  // sights are offset to the left of the top magazine (as on the real gun)
  const SX = -.034;
  g.box(-.09, .01, -.05, .03, .03, {at: [SX * .6, 0, 0], r: .003}); g.box(-.085, .01, -.06, .046, .012, {at: [SX, 0, 0], r: .002});
  for (const s of [-1, 1]) g.box(-.08, .04, -.068, .05, .004, {at: [SX + s * .0055, 0, 0], r: .001, chalk: false});
  g.box(.74, .0, .76, .03, .014, {at: [SX * .5, 0, 0], r: .002}); g.box(.75, .02, .76, .05, .003, {at: [SX, 0, 0], r: .0008, chalk: false});
  g.box(.745, .02, .765, .042, .012, {at: [SX, 0, 0], r: .001, chalk: false});
  g.part('mag', [0, .05, .07]);
  const curve = []; for (let i = 0; i <= 5; i++) { const t = i / 5; curve.push([.03 - t * .03 - t * t * .015, .024 + t * .12]); }
  g.extrude([...curve, ...curve.map(([u, v]) => [u + .085, v]).reverse()], .03, {r: .004, bevel: .002});
  g.part('cbolt', [0, 0, 0]);
  g.box(.1, -.012, .12, .004, .016, {at: [.03, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .004, .835).anchor('eject', .024, -.02, .05).anchor('sight', SX, .05, -.075);
  longHands(g, {grip: [-.03, -.06], gripRake: -.35, fore: [.24, -.03], foreW: .046, trigger: .9});
  g.vm = MG({hip: [.17, -.13, -.44], adsDist: .2, magOut: [0, .2, .02], magHand: [-.01, .17, -.01], reloadRot: [.05, .3, .75], reloadPos: [-.04, -.02, .02], magPalm: [0, -1, 0], magFingers: [.3, 0, -1]});
  g.kind = 'mg';
  return g;
}

export function bar() {
  const g = new GunBuilder('bar');
  g.extrude([[-.62, -.022], [-.4, -.018], [-.16, -.016], [-.09, -.012], [-.09, -.05], [-.12, -.07], [-.2, -.075], [-.62, -.16]], .046,
    {r: [.012, .02, .02, .006, .02, .02, .03, .012], bevel: .007, seg: 3, curve: 4, mat: 'wood', tint: W, wear: .45});
  g.box(-.632, -.162, -.618, -.02, .048, {r: .004, mat: 'dark', tint: K});
  // heavy box receiver
  g.extrude([[-.095, -.055], [.21, -.055], [.21, .016], [.19, .026], [-.08, .026], [-.095, .016]], .046, {r: [.006, .004, .004, .01, .01, .006], bevel: .003, mat: 'park', tint: P});
  for (let i = 0; i < 4; i++) g.box(-.06 + i * .055, -.045, -.04 + i * .055, .01, .0475, {r: .002, mat: 'park', tint: P, chalk: false}); // rivets/ribs
  g.box(.0, -.002, .1, .016, .003, {at: [.0235, 0, 0], r: .002, mat: 'dark', tint: K, chalk: false});
  // wood forend, gas cylinder, finned barrel, flash hider
  g.extrude([[.21, -.05], [.42, -.045], [.43, -.035], [.43, -.004], [.21, -.004]], .044, {r: [.004, .01, .006, .004, .004], bevel: .005, mat: 'wood', tint: WD, wear: .5});
  g.lathe([[0, .21], [.0125, .21], [.0118, .8], [0, .8]], {seg: 14, at: [0, .004, 0]});
  for (let i = 0; i < 9; i++) ring(g, .44 + i * .016, .0175, .007, {at: [0, .004, 0]});
  g.lathe([[0, .43], [.008, .43], [.008, .72], [0, .72]], {seg: 10, at: [0, -.022, 0]});
  g.lathe([[0, .8], [.0145, .8], [.0145, .845], [.0125, .85], [0, .85]], {seg: 14, at: [0, .004, 0], tint: K});
  g.box(.705, -.03, .72, .015, .03, {r: .003}); // gas block
  // rear sight
  g.box(-.07, .026, -.04, .034, .02, {r: .002, mat: 'park', tint: P});
  for (const sd of [-1, 1]) g.box(-.066, .03, -.044, .046, .004, {at: [sd * .0055, 0, 0], r: .001, chalk: false, tint: K});
  g.box(.775, .012, .8, .03, .012, {r: .002, chalk: false, tint: K});
  g.box(.783, .02, .792, .042, .003, {r: .0008, chalk: false});
  // folded bipod legs along the barrel
  for (const s of [-1, 1]) g.rod([s * .012, -.012, .74], [s * .02, -.03, .5], .0035, {seg: 6});
  g.box(.73, -.03, .76, -.008, .034, {r: .004});
  // pistol grip + trigger
  g.extrude(rake(.3, -.014).pts([[-.06, -.05], [.0, -.05], [-.004, -.06], [-.018, -.15], [-.052, -.15], [-.07, -.06]]), .034, {r: [.004, .004, .006, .012, .01, .006], bevel: .004, mat: 'wood', tint: W, wear: .5});
  triggerGroup(g, .03, -.054, {mat: 'park', tint: P});
  // 20-round box magazine
  g.part('mag', [0, -.07, .09]);
  g.extrude([[.05, -.04], [.13, -.04], [.13, -.12], [.054, -.124]], .034, {r: .005, bevel: .003});
  for (let i = 0; i < 3; i++) g.box(.058 + i * .025, -.11, .068 + i * .025, -.05, .0355, {r: .002, chalk: false});
  // charging handle (left)
  g.part('cbolt', [0, 0, 0]);
  g.box(.08, -.01, .1, .004, .016, {at: [-.028, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .004, .85).anchor('eject', .024, .006, .05).anchor('sight', 0, .042, -.055);
  longHands(g, {grip: [-.09, -.06], gripRake: -.35, fore: [.33, -.05], foreW: .046, trigger: .9});
  g.vm = {hip: [.15, -.135, -.44], hipRot: [.03, .2, -.1], adsDist: .18, kick: 7, back: .035, rise: .04, punch: .009, flash: .15, eject: 'rifle', ejectVel: [1.7, 1.7, .2],
    charge: .07, magOut: [0, -.22, .02], magHand: [-.04, -.17, .03], reloadRot: [.12, .2, .5], reloadPos: [-.03, .05, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]};
  g.kind = 'mg';
  return g;
}

// DP-28: pan magazine on top, conical perforated jacket, wooden butt, bipod, no pistol grip.
export function dp28() {
  const g = new GunBuilder('dp28');
  rifleStock(g, {rear: -.62, front: -.06, drop: .16, fore: .03});
  g.extrude([[-.07, -.045], [.16, -.045], [.16, .016], [.14, .024], [-.06, .024], [-.07, .014]], .044, {r: [.006, .004, .004, .01, .01, .006], bevel: .003, tint: B});
  triggerGroup(g, .02, -.045);
  g.extrude([[-.04, -.045], [.02, -.045], [.02, -.06], [-.04, -.06]], .03, {r: .004, tint: B});
  const jp = [[0, .16], [.03, .16], [.03, .2], [.022, .55], [0, .55]];
  g.lathe(jp, {seg: 18, at: [0, -.004, 0], tint: B});
  for (let i = 0; i < 7; i++) for (const a of [-1.1, -.5, .5, 1.1]) { const r = .03 - (i + .5) * .0012; g.sphere([Math.sin(a) * r, -.004 + Math.cos(a) * r, .22 + i * .045], .005, {mat: 'dark', tint: K, seg: 6}); }
  barrel(g, .55, .68, .0105, .0095, {y: -.004});
  g.lathe([[0, .66], [.014, .66], [.014, .7], [.008, .71], [0, .71]], {seg: 14, at: [0, -.004, 0], tint: K});
  g.box(.62, .0, .65, .05, .012, {r: .002}); frontPost(g, .64, .07, {hood: true});
  g.box(.19, .02, .24, .06, .02, {r: .003}); rearNotch(g, .2, .07, {base: .012});
  bipod(g, .5, -.03, {len: .3, spread: .03});
  g.box(.3, -.06, .36, -.03, .036, {r: .008, mat: 'wood', tint: W});
  // pan magazine (part 'mag') – flat disc in two layers
  g.part('mag', [0, .04, .06]);
  g.lathe([[0, .03], [.12, .03], [.125, .036], [.125, .046], [.06, .058], [0, .06]], {seg: 28, chalk: false, xf: geo => { geo.rotateX(Math.PI / 2); geo.translate(0, 0, -.06); }, mat: 'park', tint: P});
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.box(.06 + Math.cos(a) * .09 - .004, .044, .06 + Math.cos(a) * .09 + .004, .05, .02, {at: [Math.sin(a) * .09, 0, 0], r: .002, chalk: false}); }
  g.part('cbolt', [0, 0, 0]);
  g.box(.12, -.03, .14, -.018, .016, {at: [.03, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, -.004, .71).anchor('eject', .0, -.05, .04).anchor('sight', 0, .07, .205);
  longHands(g, {grip: [-.11, -.05], trigger: .9, fore: [.33, -.05], foreW: .036});
  g.vm = MG({hip: [.16, -.15, -.44], adsDist: .34, magOut: [-.05, .18, .02], magHand: [-.03, .11, -.01], reloadRot: [.05, .3, .75], reloadPos: [-.04, -.02, .02], magPalm: [0, -1, 0], magFingers: [.3, 0, -1], ejectVel: [.3, -1.2, .1]});
  g.kind = 'mg';
  return g;
}

// MG42: stamped receiver, perforated square barrel shroud, black polymer-look butt, belt box, feed cover.
export function mg42() {
  const g = new GunBuilder('mg42');
  g.extrude([[-.1, -.045], [.16, -.045], [.16, .02], [-.08, .02], [-.1, .01]], .046, {r: [.006, .004, .004, .006, .006], bevel: .003, mat: 'park', tint: K});
  buttStock(g, {from: -.1, rear: -.5, top: .01, drop: .13, width: .042, mat: 'park', tint: K});
  pistolGrip(g, -.02, -.045, {len: .1, mat: 'park', tint: K});
  triggerGroup(g, .01, -.045, {mat: 'park', tint: K});
  g.extrude([[.16, -.03], [.55, -.03], [.55, .028], [.16, .028]], .046, {r: .006, bevel: .003, mat: 'park', tint: P});
  for (let i = 0; i < 7; i++) { g.box(.19 + i * .05, -.012, .225 + i * .05, .012, .047, {r: .006, mat: 'dark', tint: K, chalk: false}); g.box(.19 + i * .05, .0285, .225 + i * .05, .03, .02, {r: .005, mat: 'dark', tint: K, chalk: false}); }
  barrel(g, .55, .62, .01, .01);
  g.lathe([[0, .6], [.02, .6], [.02, .66], [.016, .66], [0, .66]], {seg: 14, tint: K});
  bipod(g, .52, -.03, {len: .32, spread: .03});
  frontPost(g, .54, .05, {ears: true}); g.box(.53, .028, .55, .04, .012, {r: .002});
  feedCover(g, -.05, .14, .03, .046, {sight: true, tint: K});
  beltBox(g, .06, {x: -.08, y: -.06});
  g.part('cbolt', [0, 0, 0]);
  g.box(.06, -.01, .08, .006, .016, {at: [.03, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .66).anchor('eject', .0, -.05, .05).anchor('sight', 0, .05, -.03);
  longHands(g, {grip: [-.05, -.05], gripRake: -.3, trigger: .9, fore: [.24, -.03], foreW: .046});
  g.vm = MG({hip: [.17, -.14, -.46], adsDist: .2, kick: 6, back: .03, rise: .035, flash: .16, ejectVel: [.3, -1.2, .1]});
  g.kind = 'belt';
  return g;
}

// M1919: round perforated jacket, tall receiver, rear stock (A6-style), carry handle, belt box.
export function m1919() {
  const g = new GunBuilder('m1919');
  g.extrude([[-.12, -.06], [.2, -.06], [.2, .026], [-.1, .026], [-.12, .016]], .048, {r: [.006, .004, .004, .006, .006], bevel: .003, mat: 'park', tint: P});
  for (let i = 0; i < 4; i++) g.box(-.08 + i * .07, -.05, -.07 + i * .07, .016, .0495, {r: .002, mat: 'park', tint: P, chalk: false});
  g.extrude([[-.12, .0], [-.46, -.03], [-.47, -.12], [-.44, -.13], [-.24, -.07], [-.12, -.05]], .04, {r: .01, bevel: .005, mat: 'park', tint: K});
  pistolGrip(g, -.06, -.06, {len: .1});
  triggerGroup(g, -.03, -.06, {mat: 'park', tint: P});
  jacket(g, .2, .58, .023, {rows: 3, n: 9, spread: 1.4, hole: .005});
  barrel(g, .58, .66, .0105, .01);
  g.lathe([[0, .64], [.016, .64], [.016, .68], [0, .68]], {seg: 14, tint: K});
  bipod(g, .56, -.024, {len: .32, spread: .03});
  g.rod([0, .03, .18], [0, .06, .22], .005, {seg: 8, tint: K}); g.rod([0, .06, .22], [0, .06, .32], .0065, {seg: 8, mat: 'wood', tint: W}); g.rod([0, .06, .32], [0, .023, .36], .005, {seg: 8, tint: K});
  frontPost(g, .2, .05, {ears: true}); g.box(.18, .026, .2, .04, .014, {r: .002});
  feedCover(g, -.08, .16, .036, .048, {sight: true});
  beltBox(g, .06, {x: -.085, y: -.07, h: .11});
  g.part('cbolt', [0, 0, 0]);
  g.box(.04, -.01, .06, .006, .016, {at: [.03, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .68).anchor('eject', .0, -.06, .05).anchor('sight', 0, .056, -.065);
  longHands(g, {grip: [-.09, -.06], gripRake: -.35, trigger: .9, fore: [.3, -.03], foreW: .046});
  g.vm = MG({hip: [.17, -.14, -.46], adsDist: .2, kick: 7, flash: .16, ejectVel: [.3, -1.2, .1]});
  g.kind = 'belt';
  return g;
}
