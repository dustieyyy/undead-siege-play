import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Zombie model + LOD. Paths are relative to index.html so the game works from any sub-path (GitHub Pages).
export const ZOMBIE_URL = 'assets/zombie/zombie_kestrel_rigged.glb';
export const ZOMBIE_LOD_URL = 'assets/zombie/zombie_kestrel_lod1.glb';

export async function loadZombie(onProgress = () => {}) {
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  const progress = {main: 0, lod: 0};
  const report = () => onProgress(progress.main * .9 + progress.lod * .1);
  const [main, lod] = await Promise.all([
    loader.loadAsync(ZOMBIE_URL, e => { if (e.total) { progress.main = e.loaded / e.total; report(); } }),
    loader.loadAsync(ZOMBIE_LOD_URL, e => { if (e.total) { progress.lod = e.loaded / e.total; report(); } }).catch(err => { console.warn('zombie LOD missing', err); return null; }),
  ]);
  let lodGeometry = null;
  lod?.scene.traverse(o => { if (o.isMesh && !lodGeometry) lodGeometry = o.geometry; });
  main.scene.traverse(o => {
    if (!o.isMesh) return;
    o.material.side = THREE.FrontSide; // closed mesh: halve fragment work
    o.material.envMapIntensity = .6;
    o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false;
  });
  const clips = Object.fromEntries(main.animations.map(a => [a.name, a]));
  return {scene: main.scene, clips, lodGeometry};
}
