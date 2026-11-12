import * as THREE from 'three';
import * as T from './textures.js';

// Material library. `scale` = meters per texture tile [u, v] for projected UVs.
export function createMaterials(quality) {
  const aniso = quality.antialias ? 8 : 2;
  const std = (tex, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({roughness: .92, metalness: 0, ...opts.params});
    if (tex) { m.map = tex.map; tex.map.anisotropy = aniso; if (tex.bump) { m.bumpMap = tex.bump; m.bumpScale = opts.bump ?? 1.2; } }
    m.userData.scale = opts.scale || [2, 2];
    return m;
  };
  const concreteTex = T.concrete(512, [.52, .51, .48], 11);
  const M = {
    concrete: std(concreteTex, {scale: [3, 3], bump: 1.6}),
    concreteDark: std(T.concrete(256, [.36, .36, .34], 13), {scale: [2, 2]}),
    painted: std(T.painted(512), {scale: [3, 3.8], bump: .8}),
    brick: std(T.brick(512, 31), {scale: [1.2, 1.2], bump: 2}),
    brickInt: std(T.brick(512, 33, true), {scale: [1.2, 1.2], bump: 1.5}),
    plank: std(T.planks(512, 41, {count: 7, vertical: true, tint: [.40, .34, .26], gray: .42}), {scale: [1.6, 3], bump: 2}),
    plankH: std(T.planks(512, 43, {count: 6, tint: [.38, .31, .23], gray: .40}), {scale: [3, 1.2], bump: 2}),
    hangar: std(T.corrugated(512, 51, [.30, .33, .29]), {scale: [2, 3], bump: 3, params: {metalness: .35, roughness: .7}}),
    hangarRoof: std(T.corrugated(512, 53, [.33, .32, .30]), {scale: [2, 3], bump: 3, params: {metalness: .4, roughness: .65, side: THREE.DoubleSide}}),
    woodFloor: std(T.planks(512, 45, {count: 8, tint: [.36, .28, .19], gray: .3}), {scale: [2.4, 2.4], bump: 1.5}),
    plankFloor: std(T.planks(512, 47, {count: 6, tint: [.34, .29, .22], gray: .36}), {scale: [2, 2], bump: 1.5}),
    concreteFloor: std(T.floorConcrete(512), {scale: [4, 4], bump: 1.2, params: {roughness: .86}}),
    ground: std(T.ground(512), {scale: [7, 7], bump: 2.5, params: {roughness: 1, color: 0x9a9a9a}}),
    runway: std(T.runway(512), {scale: [10, 10], bump: 1.5}),
    roofFelt: std(T.roofFelt(256), {scale: [3, 3]}),
    metalOD: std(T.paintedMetal(256, 91, [.26, .29, .21]), {scale: [1.5, 1.5], params: {metalness: .45, roughness: .6}}),
    metalGray: std(T.paintedMetal(256, 93, [.30, .31, .31]), {scale: [1.5, 1.5], params: {metalness: .5, roughness: .55}}),
    metalRed: std(T.paintedMetal(256, 95, [.40, .12, .08]), {scale: [1.5, 1.5], params: {metalness: .4, roughness: .6}}),
    rust: std(T.rust(256), {scale: [1.5, 1.5], params: {metalness: .5, roughness: .8}}),
    steel: new THREE.MeshStandardMaterial({color: 0x2c2e2f, metalness: .8, roughness: .45}),
    darkSteel: new THREE.MeshStandardMaterial({color: 0x151718, metalness: .7, roughness: .5}),
    canvas: std(T.canvasCloth(256, 111, [.34, .34, .24]), {scale: [1.5, 1.5], params: {side: THREE.DoubleSide}}),
    tarp: std(T.canvasCloth(256, 113, [.24, .27, .22]), {scale: [1.5, 1.5], params: {side: THREE.DoubleSide}}),
    burlap: std(T.burlap(256), {scale: [.8, .8], bump: 2}),
    wood: std(T.planks(256, 49, {count: 3, tint: [.40, .30, .20], gray: .34}), {scale: [1, 1], bump: 1}),
    woodDark: std(T.planks(256, 52, {count: 3, tint: [.25, .19, .13], gray: .2}), {scale: [1, 1], bump: 1}),
    crateWood: std(T.planks(256, 54, {count: 4, tint: [.42, .37, .24], gray: .4}), {scale: [1, 1], bump: 1.5}),
    rubber: new THREE.MeshStandardMaterial({color: 0x121212, roughness: .95}),
    paper: new THREE.MeshStandardMaterial({map: T.boardSheet(), roughness: .95}),
    cork: new THREE.MeshStandardMaterial({color: 0x5a4630, roughness: 1}),
    mattress: std(T.canvasCloth(256, 117, [.46, .43, .36]), {scale: [1, 1]}),
    blanket: std(T.canvasCloth(256, 119, [.28, .29, .22]), {scale: [1, 1]}),
    bone: new THREE.MeshStandardMaterial({color: 0x9c8f78, roughness: .9}),
    chain: new THREE.MeshStandardMaterial({map: T.chainLink().map, alphaTest: .5, side: THREE.DoubleSide, metalness: .6, roughness: .5}),
    grating: new THREE.MeshStandardMaterial({map: T.grating().map, alphaTest: .5, side: THREE.DoubleSide, metalness: .6, roughness: .6}),
    wire: new THREE.MeshStandardMaterial({color: 0x3a3632, metalness: .7, roughness: .5}),
    glassDark: new THREE.MeshStandardMaterial({color: 0x0b0e10, metalness: .2, roughness: .15}),
    bulbWarm: new THREE.MeshBasicMaterial({color: 0xffc77a}),
    bulbCold: new THREE.MeshBasicMaterial({color: 0xcfe2ff}),
    bulbOff: new THREE.MeshStandardMaterial({color: 0x2a2620, roughness: .4}),
    bulbRed: new THREE.MeshBasicMaterial({color: 0xff3b24}),
    ember: new THREE.MeshBasicMaterial({color: 0xff7a2a}),
    pine: new THREE.MeshStandardMaterial({color: 0x161c17, roughness: 1}),
    bark: new THREE.MeshStandardMaterial({color: 0x1c1712, roughness: 1}),
  };
  M.chain.map.wrapS = M.chain.map.wrapT = THREE.RepeatWrapping; M.chain.userData.scale = [1.2, 1.2];
  M.grating.map.wrapS = M.grating.map.wrapT = THREE.RepeatWrapping; M.grating.userData.scale = [1, 1];
  for (const k of ['steel', 'darkSteel', 'rubber', 'cork', 'bone', 'wire', 'glassDark', 'pine', 'bark', 'paper']) M[k].userData.scale = [1, 1];
  return M;
}
