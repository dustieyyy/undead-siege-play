import {GunBuilder, TINT} from './kit.js';

// Original procedural weapon models (no real-world trademarks). Gun space:
// origin near the rear of the receiver at bore-ish height, forward = -Z, up = +Y, meters.
// Each model returns anchors used by the viewmodel: muzzle, eject, sight (ADS eye point),
// rightHand / leftHand (hand poses), and dynamic parts (slide, mag, bolt, pump, trigger, hammer).

const B = TINT.blued, P = TINT.park, K = TINT.black;

// ---------------------------------------------------------------- service pistol
// Grip rake: shear everything below the frame rails backwards as it goes down.
const RAKE = .3, rk = pts => pts.map(([u, v]) => [v < -.014 ? u + (v + .014) * RAKE : u, v]), rkp = ([x, v, f]) => [x, v, v < -.014 ? f + (v + .014) * RAKE : f];
export function pistol() {
  const g = new GunBuilder('pistol');
  // Frame + grip (parkerized), slight grip rake.
  g.extrude(rk([[-.016, -.006], [-.004, .001], [.2, .001], [.2, -.013], [.104, -.013], [.064, -.016], [.05, -.112], [.046, -.118], [-.002, -.12], [-.006, -.114], [-.017, -.03]]), .025,
    {r: [.006, .002, .002, .003, .002, .004, .008, .004, .004, .004, .01], mat: 'park', tint: P});
  // Trigger guard ring
  g.extrude([[.058, -.012], [.106, -.012], [.106, -.03], [.092, -.046], [.058, -.046]], .009,
    {r: [.002, .004, .006, .01, .004], holes: [[[.066, -.017], [.099, -.017], [.099, -.029], [.089, -.04], [.063, -.04]]], mat: 'park', tint: P});
  // Grip panels (checkered), slightly proud of the frame on both sides
  g.extrude(rk([[.052, -.024], [.043, -.106], [.002, -.108], [-.008, -.034], [.012, -.02]]), .031, {r: .006, mat: 'grip', tint: TINT.grip, wear: .6, chalk: false});
  // Grip screws
  for (const s of [-1, 1]) for (const [f, v] of [[.034, -.04], [.024, -.094]]) g.rod(rkp([s * .0154, v, f]), rkp([s * .0162, v, f]), .0035, {seg: 8, part: 'static'});
  // Frame pins / slide stop (left) / safety (left rear)
  g.rod([-.0135, -.006, .088], [-.0125, -.006, .088], .0028, {seg: 8});
  g.extrude([[.07, -.004], [.098, -.004], [.1, .002], [.07, .002]], .004, {at: [-.0138, 0, 0], r: .0015, chalk: false});
  g.extrude([[-.012, -.004], [.006, -.004], [.008, .003], [-.012, .002]], .004, {at: [-.0138, -.004, 0], r: .0015, chalk: false});
  // Magazine well bottom / mag (dynamic)
  g.part('mag', [0, -.04, .02]);
  g.extrude(rk([[.044, -.03], [.036, -.114], [.0, -.115], [-.003, -.03]]), .019, {mat: 'blued', tint: B, chalk: false});
  g.extrude(rk([[.048, -.115], [.047, -.123], [-.004, -.124], [-.006, -.115]]), .027, {r: .003, mat: 'blued', tint: B});
  g.rod(rkp([0, -.03, .01]), rkp([0, -.03, .03]), .004, {mat: 'brass', tint: TINT.brass, seg: 8}); // top round
  // Slide (dynamic) with serrations, port, sights
  g.part('slide', [0, 0, 0]);
  g.extrude([[-.002, .001], [.205, .001], [.205, .024], [.199, .031], [.008, .031], [-.002, .027]], .024, {r: [.002, .002, .004, .006, .004, .002], bevel: .0016});
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) g.box(.008 + i * .0042, .006, .0098 + i * .0042, .027, .0016, {at: [s * .0124, 0, 0], r: .0003, bevel: .0003, chalk: false, tint: K, wear: .4});
  g.box(.098, .012, .138, .027, .003, {at: [.0115, 0, 0], r: .0015, mat: 'dark', tint: K, chalk: false}); // ejection port recess
  g.rod([.0105, .02, .1], [.0105, .02, .124], .0042, {mat: 'brass', tint: TINT.brass, seg: 8}); // brass visible in the port
  g.box(.188, .03, .198, .0365, .0028, {r: .001}); // front sight blade
  for (const s of [-1, 1]) g.box(.006, .03, .016, .037, .006, {at: [s * .0055, 0, 0], r: .001, chalk: false}); // rear sight ears
  g.box(.006, .03, .016, .033, .006, {r: .0008, chalk: false});
  // Barrel + bushing poking out the front
  g.part('static');
  g.lathe([[0, 0], [.0074, 0], [.0074, .008], [.0068, .0092], [.0046, .0092], [.0046, .002], [0, .002]], {at: [0, .016, .2], seg: 18});
  // Hammer (dynamic, pivots at its pin)
  g.part('hammer', [0, .006, -.006]);
  g.extrude([[-.002, .0], [.004, .002], [.002, .016], [-.006, .024], [-.014, .021], [-.01, .012]], .008, {r: [.001, .002, .003, .004, .003, .003]});
  // Trigger (dynamic)
  g.part('trigger', [0, -.014, .074]);
  g.extrude([[.07, -.013], [.078, -.013], [.076, -.026], [.072, -.034], [.068, -.033], [.069, -.024]], .006, {r: .0015, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .016, .214).anchor('eject', .013, .02, .112).anchor('sight', 0, .0375, .01);
  g.hands = {
    right: {pos: [.031, -.058, -.043], rot: [-.29, 0, 0], curl: [1.2, 1.35, 1.35, 1.4], index: .95, thumb: [1.25, -1.6], arm: [.3, -.35, 1], web: [.024, .024, .022]},
    left: {pos: [-.047, -.078, -.035], rot: [-.29, 0, 0], curl: [1.25, 1.3, 1.35, 1.4], thumb: [.25, .2], arm: [-.35, -.35, 1]},
  };
  g.vm = {hip: [.15, -.15, -.52], hipRot: [.03, .1, -.04], adsDist: .32, kick: 10, back: .035, rise: .16, punch: .01, flash: .085, slideTravel: .03,
    eject: 'pistol', ejectVel: [1.6, 1.8, .3], magOut: [0, -.16, -.05], magHand: [-.035, -.15, -.06], reloadRot: [.2, .22, .32], reloadPos: [-.035, .015, .03],
    sprintPos: [-.04, -.04, .04], sprintRot: [-.4, .45, .3]};
  g.kind = 'pistol';
  return g;
}

// ---------------------------------------------------------------- shared long-gun bits
const W = TINT.wood, WD = TINT.woodDark;
// Right hand on a stock wrist / pistol grip; left hand under a forend. Positions are gun space [x, y, f].
function longHands(g, {grip = [-.1, -.06], gripRake = -.55, fore = [.3, -.04], foreW = .044, trigger = .9, leftYaw = 0, leftDrop = 0} = {}) {
  g.hands = {
    right: {pos: [.034, grip[1] - .012, grip[0] - .075], rot: [gripRake, .05, 0], curl: [1.2, 1.32, 1.35, 1.4], index: trigger, thumb: [1.25, -1.5], armG: [.45, -.5, -1], web: [.024, .024, .022]},
    left: {pos: [-foreW / 2 - .03, fore[1] - .028 - leftDrop, fore[0] - .02], rot: [.15, -1.45 + leftYaw, 1.25], curl: [1.05, 1.15, 1.2, 1.25], thumb: [.35, -.2], armG: [-.55, -.45, -1]},
  };
}
function triggerGroup(g, f, v, {guard = .055, mat = 'blued', tint = B} = {}) {
  // guard ring + trigger blade at the bottom of the action (f = front of guard)
  g.extrude([[f - guard, v + .004], [f, v + .004], [f, v - .012], [f - .012, v - .028], [f - guard + .01, v - .028], [f - guard, v - .012]], .01,
    {r: [.002, .003, .006, .01, .008, .006], holes: [[[f - guard + .006, v - .002], [f - .006, v - .002], [f - .006, v - .011], [f - .016, v - .022], [f - guard + .012, v - .022], [f - guard + .006, v - .012]]], mat, tint, chalk: false});
  g.part('trigger', [0, v, f - guard * .45]);
  g.extrude([[f - guard * .5, v + .002], [f - guard * .38, v + .002], [f - guard * .42, v - .014], [f - guard * .5, v - .02], [f - guard * .56, v - .018], [f - guard * .52, v - .008]], .006, {r: .0015, chalk: false});
  g.use('static');
}
const ring = (g, f, r, len, o = {}) => g.lathe([[0, f], [r, f], [r, f + len], [0, f + len]], {seg: 14, chalk: false, ...o});

// ---------------------------------------------------------------- bolt-action rifle
export function bolt() {
  const g = new GunBuilder('bolt');
  // One-piece walnut stock: butt, comb, wrist, forend
  g.extrude([[-.66, -.026], [-.42, -.022], [-.17, -.018], [-.07, -.012], [.46, -.012], [.5, -.016], [.5, -.032], [.3, -.04], [.08, -.046], [.02, -.048], [-.05, -.05], [-.11, -.074], [-.17, -.07], [-.3, -.085], [-.66, -.16]], .044,
    {r: [.012, .02, .03, .02, .004, .006, .006, .02, .02, .01, .02, .02, .02, .03, .012], bevel: .007, seg: 3, curve: 4, mat: 'wood', tint: W, wear: .4});
  g.box(-.672, -.162, -.658, -.024, .046, {r: .004, tint: K, mat: 'dark'}); // butt plate
  g.extrude([[.13, -.004], [.44, -.004], [.44, .011], [.42, .015], [.15, .016], [.13, .012]], .03, {r: .005, bevel: .004, mat: 'wood', tint: WD, wear: .4}); // upper handguard
  // Receiver + barrel
  g.lathe([[0, -.06], [.0135, -.06], [.0142, -.045], [.0142, .135], [.0125, .148], [0, .148]], {seg: 18});
  g.lathe([[0, .148], [.0105, .148], [.0098, .2], [.0086, .45], [.0078, .64], [.0084, .645], [.0084, .655], [0, .655]], {seg: 14});
  g.box(-.03, -.016, .11, -.004, .03, {r: .003}); // action bedding / mag box
  g.box(.0, -.055, .075, -.046, .03, {r: .003, tint: B}); // floor plate
  for (const f of [.215, .44]) g.box(f, -.044, f + .016, .018, .047, {r: .004}); // barrel bands
  g.rod([-.026, -.03, .3], [.026, -.03, .3], .0028, {seg: 8}); // sling swivel pin
  // Rear leaf sight + front sight with protective ears
  g.box(.165, .008, .2, .016, .024, {r: .002});
  for (const sd of [-1, 1]) g.box(.168, .016, .178, .0235, .006, {at: [sd * .0055, 0, 0], r: .001, chalk: false});
  g.box(.168, .016, .178, .0185, .02, {r: .001, chalk: false});
  g.box(.62, .007, .64, .013, .016, {r: .002, chalk: false});
  for (const s of [-1, 1]) g.box(.62, .011, .64, .025, .003, {at: [s * .0075, 0, 0], r: .001, chalk: false});
  g.box(.627, .012, .633, .0215, .0026, {r: .0006, chalk: false});
  triggerGroup(g, .07, -.05);
  // Bolt (rotates about the bore, slides back)
  g.part('bolt', [0, 0, 0]);
  g.lathe([[0, -.105], [.0085, -.105], [.009, -.095], [.009, .0], [0, .0]], {seg: 12, chalk: false});
  g.lathe([[0, -.118], [.0105, -.118], [.012, -.108], [.012, -.098], [0, -.098]], {seg: 12, chalk: false, tint: K}); // cocking piece
  g.rod([.006, -.003, -.07], [.048, -.026, -.075], .0042, {seg: 8});
  g.sphere([.052, -.03, -.076], .011, {seg: 10});
  g.use('static');
  g.anchor('muzzle', 0, 0, .66).anchor('eject', .016, .012, .03).anchor('sight', 0, .0215, .172);
  longHands(g, {grip: [-.1, -.058], fore: [.3, -.04], foreW: .044, trigger: .85});
  g.vm = {hip: [.14, -.125, -.42], hipRot: [.03, .2, -.1], adsDist: .26, kick: 13, back: .06, rise: .1, punch: .025, flash: .14, eject: 'rifle', ejectVel: [1.8, 1.6, .2],
    boltLift: 1.15, boltTravel: .085, reloadRot: [.18, .12, -.35], reloadPos: [-.04, .04, .03], clipHand: [-.03, .095, -.01], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]};
  g.kind = 'bolt';
  return g;
}

// ---------------------------------------------------------------- scoped marksman rifle (bolt action, glass)
export function marksman() {
  const g = bolt(); g.id = 'marksman';
  // darken: re-tint is not possible after the fact, so add the scope and a cheek riser instead
  g.use('static');
  const Y = .052;
  g.lathe([[0, -.15], [.016, -.15], [.0175, -.13], [.0175, -.11], [.0125, -.095], [.0125, .14], [.019, .175], [.02, .24], [.0175, .245], [0, .245]], {at: [0, Y, 0], seg: 20, tint: K, wear: .5});
  g.lathe([[0, -.152], [.014, -.152], [0, -.151]], {at: [0, Y, 0], seg: 16, mat: 'glass', chalk: false});
  g.lathe([[0, .243], [.017, .243], [0, .244]], {at: [0, Y, 0], seg: 16, mat: 'glass', chalk: false});
  for (const f of [-.035, .1]) { g.box(f, .012, f + .022, Y - .01, .02, {r: .003, tint: K}); ring(g, f - .002, .0155, .026, {at: [0, Y, 0], tint: K}); }
  g.rod([0, Y + .012, .03], [0, Y + .024, .03], .009, {seg: 12, tint: K}); // elevation turret
  g.rod([.012, Y, .03], [.024, Y, .03], .009, {seg: 12, tint: K}); // windage turret
  g.extrude([[-.42, -.018], [-.2, -.014], [-.2, .004], [-.4, .002]], .036, {r: .008, bevel: .005, mat: 'leather', tint: TINT.glove, wear: .3}); // laced leather cheek pad
  g.anchor('sight', 0, Y, -.15);
  g.vm = {...g.vm, adsDist: .09, scope: true, flash: .15, kick: 14, punch: .03};
  g.kind = 'bolt';
  return g;
}

// ---------------------------------------------------------------- semi-auto carbine
export function carbine() {
  const g = new GunBuilder('carbine');
  g.extrude([[-.55, -.024], [-.36, -.02], [-.15, -.016], [-.06, -.012], [.33, -.012], [.36, -.016], [.36, -.03], [.2, -.038], [.07, -.042], [-.04, -.046], [-.1, -.07], [-.16, -.066], [-.27, -.08], [-.55, -.145]], .042,
    {r: [.012, .02, .03, .02, .004, .006, .006, .02, .02, .02, .02, .02, .03, .012], bevel: .007, seg: 3, curve: 4, mat: 'wood', tint: W, wear: .45});
  g.box(-.562, -.147, -.548, -.022, .044, {r: .004, mat: 'dark', tint: K});
  g.extrude([[.1, -.004], [.3, -.004], [.3, .012], [.12, .015], [.1, .01]], .03, {r: .005, bevel: .004, mat: 'wood', tint: WD, wear: .4});
  // stamped receiver (box with rounded top), barrel, gas block
  g.extrude([[-.065, -.014], [.11, -.014], [.11, .012], [.09, .017], [-.05, .017], [-.065, .01]], .028, {r: [.002, .002, .004, .006, .006, .004], bevel: .0025, mat: 'park', tint: P});
  g.lathe([[0, .11], [.0095, .11], [.009, .16], [.0078, .46], [.0085, .465], [.0085, .48], [0, .48]], {seg: 14});
  g.box(.29, -.02, .32, .006, .03, {r: .003, mat: 'park', tint: P}); // barrel band
  g.box(.3, -.018, .4, -.008, .012, {r: .003, tint: B}); // gas cylinder
  // rear peep sight on the receiver, front post with ears
  g.box(-.05, .015, -.025, .022, .016, {r: .002, mat: 'park', tint: P});
  for (const sd of [-1, 1]) g.box(-.042, .015, -.034, .03, .003, {at: [sd * .0058, 0, 0], r: .001, chalk: false, tint: K});
  g.lathe([[.0021, -.04], [.0046, -.04], [.0046, -.035], [.0021, -.035], [.0021, -.04]], {at: [0, .028, 0], seg: 14, tint: K, chalk: false});
  g.box(.455, .007, .472, .013, .014, {r: .002, chalk: false});
  for (const s of [-1, 1]) g.box(.455, .01, .472, .031, .0028, {at: [s * .0068, 0, 0], r: .001, chalk: false});
  g.box(.461, .012, .466, .028, .0024, {r: .0005, chalk: false});
  triggerGroup(g, .02, -.046, {mat: 'park', tint: P});
  g.box(-.06, -.03, -.04, -.012, .02, {r: .002, mat: 'park', tint: P}); // safety / mag release housing
  // detachable 15-round box magazine
  g.part('mag', [0, -.04, .06]);
  g.extrude([[.04, -.014], [.085, -.014], [.083, -.09], [.042, -.094]], .024, {r: .004, bevel: .002, mat: 'blued', tint: B});
  g.box(.04, -.1, .087, -.09, .028, {r: .003, tint: K});
  // op-rod handle (reciprocates)
  g.part('cbolt', [0, 0, 0]);
  g.box(.02, -.004, .12, .006, .006, {at: [.017, 0, 0], r: .002, chalk: false});
  g.box(.1, -.006, .118, .01, .014, {at: [.022, 0, 0], r: .003, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, 0, .48).anchor('eject', .016, .012, .02).anchor('sight', 0, .028, -.037);
  longHands(g, {grip: [-.07, -.054], fore: [.22, -.036], foreW: .042, trigger: .85});
  g.vm = {hip: [.14, -.125, -.42], hipRot: [.03, .2, -.1], adsDist: .07, kick: 10, back: .045, rise: .08, punch: .015, flash: .12, eject: 'rifle', ejectVel: [1.8, 1.7, .2],
    openBolt: .05, charge: .06, magOut: [0, -.18, .02], magHand: [-.035, -.125, -.0], reloadRot: [.18, .2, .4], reloadPos: [-.03, .04, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]};
  g.kind = 'carbine';
  return g;
}

// ---------------------------------------------------------------- trench pump shotgun
export function shotgun() {
  const g = new GunBuilder('shotgun');
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

// ---------------------------------------------------------------- submachine gun
export function smg() {
  const g = new GunBuilder('smg');
  // tubular receiver + perforated barrel jacket
  g.lathe([[0, -.09], [.0175, -.09], [.019, -.08], [.019, .14], [.0175, .15], [0, .15]], {seg: 18, at: [0, -.004, 0], tint: P, mat: 'park'});
  g.lathe([[0, .15], [.0155, .15], [.0155, .3], [.012, .31], [0, .31]], {seg: 16, at: [0, -.004, 0]});
  for (let i = 0; i < 6; i++) for (const a of [-1.2, -.4, .4, 1.2]) g.sphere([Math.sin(a) * .0157, -.004 + Math.cos(a) * .0157, .165 + i * .024], .0042, {mat: 'dark', tint: K, seg: 6});
  g.lathe([[0, .31], [.0062, .31], [.0062, .325], [0, .325]], {seg: 10, at: [0, -.004, 0], tint: K});
  // magwell + stick magazine (straight, 32 rounds) ahead of the guard
  g.box(.06, -.05, .1, -.01, .03, {r: .003, mat: 'park', tint: P});
  g.part('mag', [0, -.06, .08]);
  g.extrude([[.062, -.04], [.098, -.04], [.096, -.21], [.064, -.21]], .022, {r: .003, bevel: .002});
  g.box(.06, -.218, .1, -.208, .026, {r: .003, tint: K});
  g.use('static');
  // wooden pistol grip + trigger group, sling loop, rear sight, front post
  g.extrude(rk([[-.04, -.02], [.02, -.02], [.018, -.035], [.0, -.13], [-.035, -.13], [-.045, -.035]]), .032, {r: [.004, .004, .006, .012, .01, .006], bevel: .004, mat: 'wood', tint: W, wear: .5});
  g.box(-.05, -.03, .045, -.014, .03, {r: .004, mat: 'park', tint: P});
  triggerGroup(g, .05, -.03, {guard: .05, mat: 'park', tint: P});
  g.box(-.07, .015, -.05, .019, .016, {r: .002});
  for (const sd of [-1, 1]) g.box(-.066, .015, -.054, .027, .004, {at: [sd * .005, 0, 0], r: .001, chalk: false});
  for (const s of [-1, 1]) g.box(.285, .008, .3, .027, .003, {at: [s * .006, 0, 0], r: .001, chalk: false});
  g.box(.29, .01, .296, .0235, .0024, {r: .0005, chalk: false});
  // folding wire stock: two rods + butt plate
  for (const y of [-.0, -.05]) g.rod([.0, y, -.09], [0, y - .012 - (y ? .02 : 0), -.42], .0045, {seg: 8, tint: B});
  g.box(-.43, -.1, -.41, .01, .03, {r: .005, mat: 'dark', tint: K});
  // charging handle on the left, reciprocates with the bolt (open bolt)
  g.part('cbolt', [0, 0, 0]);
  g.box(-.05, -.002, -.03, .008, .014, {at: [-.024, 0, 0], r: .003, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, -.004, .325).anchor('eject', .02, .004, .02).anchor('sight', 0, .0235, -.06);
  g.hands = {
    right: {pos: [.031, -.068, -.065], rot: [-.32, .03, 0], curl: [1.2, 1.32, 1.35, 1.4], index: .9, thumb: [1.25, -1.5], armG: [.4, -.45, -1], web: [.024, .024, .022]},
    left: {pos: [-.045, -.12, .03], rot: [-.15, .1, .25], curl: [1.25, 1.35, 1.4, 1.45], thumb: [1.1, -1.4], armG: [-.5, -.4, -1]},
  };
  g.vm = {hip: [.14, -.13, -.4], hipRot: [.03, .2, -.1], adsDist: .2, kick: 5, back: .025, rise: .035, punch: .006, flash: .09, eject: 'smg', ejectVel: [1.7, 1.6, .2],
    openBolt: .05, charge: .06, magOut: [0, -.22, .0], magHand: [-.035, -.245, .02], reloadRot: [.15, .25, .55], reloadPos: [-.02, .05, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]};
  g.kind = 'smg';
  return g;
}

// ---------------------------------------------------------------- squad automatic rifle (LMG-ish)
export function squad() {
  const g = new GunBuilder('squad');
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
  // carry handle + sights
  g.rod([.0, .026, .1], [0, .055, .14], .005, {seg: 8, tint: K}); g.rod([0, .055, .14], [0, .055, .26], .006, {seg: 8, tint: K}); g.rod([0, .055, .26], [0, .02, .3], .005, {seg: 8, tint: K});
  g.box(-.07, .026, -.04, .034, .02, {r: .002, mat: 'park', tint: P});
  for (const sd of [-1, 1]) g.box(-.066, .03, -.044, .046, .004, {at: [sd * .0055, 0, 0], r: .001, chalk: false, tint: K});
  g.box(.775, .012, .8, .03, .012, {r: .002, chalk: false, tint: K});
  g.box(.783, .02, .792, .042, .003, {r: .0008, chalk: false});
  // folded bipod legs along the barrel
  for (const s of [-1, 1]) g.rod([s * .012, -.012, .74], [s * .02, -.03, .5], .0035, {seg: 6});
  g.box(.73, -.03, .76, -.008, .034, {r: .004});
  // pistol grip + trigger
  g.extrude(rk([[-.06, -.05], [.0, -.05], [-.004, -.06], [-.018, -.15], [-.052, -.15], [-.07, -.06]]), .034, {r: [.004, .004, .006, .012, .01, .006], bevel: .004, mat: 'wood', tint: W, wear: .5});
  triggerGroup(g, .03, -.054, {mat: 'park', tint: P});
  // 40-round box magazine
  g.part('mag', [0, -.07, .09]);
  g.extrude([[.04, -.04], [.14, -.04], [.14, -.14], [.045, -.145]], .036, {r: .005, bevel: .003});
  for (let i = 0; i < 3; i++) g.box(.05 + i * .03, -.13, .062 + i * .03, -.05, .0375, {r: .002, chalk: false});
  // charging handle (left)
  g.part('cbolt', [0, 0, 0]);
  g.box(.08, -.01, .1, .004, .016, {at: [-.028, 0, 0], r: .004, chalk: false});
  g.use('static');
  g.anchor('muzzle', 0, .004, .85).anchor('eject', .024, .006, .05).anchor('sight', 0, .042, -.055);
  longHands(g, {grip: [-.09, -.06], gripRake: -.35, fore: [.33, -.05], foreW: .046, trigger: .9});
  g.vm = {hip: [.15, -.135, -.44], hipRot: [.03, .2, -.1], adsDist: .18, kick: 7, back: .035, rise: .04, punch: .009, flash: .15, eject: 'rifle', ejectVel: [1.7, 1.7, .2],
    charge: .07, magOut: [0, -.22, .02], magHand: [-.04, -.17, .03], reloadRot: [.12, .2, .5], reloadPos: [-.03, .05, .02], sprintPos: [-.03, -.02, .05], sprintRot: [-.16, .55, .32]};
  g.kind = 'squad';
  return g;
}
