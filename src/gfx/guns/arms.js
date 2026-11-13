import * as THREE from 'three';
import {GunBuilder, TINT} from './kit.js';

// Gloved hand + sleeved forearm, built procedurally and merged per material.
// Hand space: wrist at origin, fingers extend toward -Z, finger stack along +Y (index on top),
// palm faces -X for the right hand (+X for the left: side = -1).
// pose: {curl: [index, middle, ring, pinky] total bend (rad), index: optional trigger-finger bend,
//        thumb: [base swing, bend], arm: forearm direction (hand space), spread}
const FINGERS = [{y: .028, len: [.044, .026, .021], r: .0094}, {y: .009, len: [.047, .029, .022], r: .0098}, {y: -.01, len: [.044, .027, .021], r: .0094}, {y: -.027, len: [.036, .022, .018], r: .0085}];

export function buildHand(side, pose) {
  const g = new GunBuilder('hand'), s = side;
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z), toF = v => [v.x, v.y, -v.z];
  // Palm: overlapping ellipsoids (palm body, heel, thenar pad under the thumb), back of the hand slightly flatter.
  const G = {mat: 'leather', tint: TINT.glove, seg: 14};
  g.sphere([s * .003, .001, .05], 1, {...G, scale: [.017, .041, .05]});
  g.sphere([s * .001, -.004, .016], 1, {...G, scale: [.019, .036, .026]});
  g.sphere([-s * .012, .02, .026], 1, {...G, seg: 10, scale: [.016, .02, .028]});
  if (pose.web) g.sphere([-s * pose.web[0], pose.web[1], pose.web[2]], 1, {...G, seg: 10, scale: [.018, .016, .02]});
  g.sphere([s * .007, .0, .086], 1, {...G, seg: 10, scale: [.011, .039, .012]});
  for (const f of FINGERS) g.sphere([s * .004, f.y, .087], f.r * 1.2, {mat: 'leather', tint: TINT.glove, seg: 8});
  // Fingers: three phalanges each, bending toward the palm side (-X*s) around Y.
  FINGERS.forEach((f, i) => {
    const total = i === 0 && pose.index !== undefined ? pose.index : pose.curl[i];
    let p = v3(-s * .003, f.y + (pose.spread || 0) * (i - 1.5) * .004, -.086), ang = 0;
    f.len.forEach((len, k) => {
      ang += total * [1, 1.1, .7][k];
      const dir = v3(-s * Math.sin(ang), 0, -Math.cos(ang)), q = p.clone().addScaledVector(dir, len);
      const r = f.r * (1 - k * .1);
      g.rod(toF(p), toF(q), r, {seg: 8, mat: 'leather', tint: TINT.glove, wear: .2});
      g.sphere(toF(q), r, {mat: 'leather', tint: TINT.glove, seg: 8});
      p = q;
    });
  });
  // Thumb: from the base of the palm, swinging across the palm side.
  {
    const [swing, bend] = pose.thumb; let p = v3(-s * .012, .032, -.02), ang = 0;
    const lens = [.034, .03, .024];
    lens.forEach((len, k) => {
      ang = k === 0 ? swing : ang + bend * (k === 1 ? .55 : .45);
      const dir = v3(-s * Math.sin(ang) * .85, .35 - k * .25, -Math.cos(ang)).normalize(), q = p.clone().addScaledVector(dir, len);
      g.rod(toF(p), toF(q), .0105 - k * .001, {seg: 8, mat: 'leather', tint: TINT.glove, wear: .2});
      g.sphere(toF(q), .0105 - k * .001, {mat: 'leather', tint: TINT.glove, seg: 8});
      p = q;
    });
  }
  // Glove cuff + sleeve (forearm) along pose.arm
  // forearm direction: hand space (pose.arm) or gun space (pose.armG, converted through the hand rotation)
  const arm = pose.armG ? v3(pose.armG[0], pose.armG[1], -pose.armG[2]).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose.rot, 'YXZ')).invert()).normalize() : v3(...(pose.arm || [0, 0, 1])).normalize();
  const Q = new THREE.Quaternion().setFromUnitVectors(v3(0, 0, -1), arm.clone()); // lathe runs along -Z
  const addLathe = (prof, mat, tint, offset = 0) => {
    // built along -Z from the wrist, then re-oriented onto the forearm direction
    g.lathe(prof, {seg: 14, mat, tint, wear: .2, chalk: false, xf: geo => { geo.translate(0, 0, offset); geo.applyQuaternion(Q); }});
  };
  addLathe([[0, -.004], [.03, -.004], [.034, .02], [.037, .062], [.034, .068], [0, .068]], 'leather', TINT.glove);
  addLathe([[0, .055], [.039, .055], [.043, .075], [.043, .13], [.045, .3], [.048, .5], [0, .5]], 'wool', TINT.sleeve);
  const built = g.build.bind(g);
  return {build: built};
}
