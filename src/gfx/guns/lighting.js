import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Lighting rig for the first-person weapon pass (its own scene, so the gun reads
// well even in dark rooms; mood follows indoor/outdoor).
export function viewmodelLights(scene, renderer, quality = {}) {
  if (!quality.lowEnv) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
    scene.environmentIntensity = .32;
  }
  const hemi = new THREE.HemisphereLight(0x9fb2c8, 0x2a221c, .9); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2bf, 2.6); key.position.set(-1.2, 1.6, .6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc0ff, 1.5); rim.position.set(1.4, .6, -1.2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, .5); fill.position.set(.4, -.5, 1); scene.add(fill);
  const flash = new THREE.PointLight(0xffa850, 0, 1.6, 1.6); scene.add(flash);
  const IN = {key: new THREE.Color(0xffd6a8), keyI: 2.3, rim: new THREE.Color(0x8fb0ff), rimI: 1.2, hemi: .8},
    OUT = {key: new THREE.Color(0xb9c8ff), keyI: 1.7, rim: new THREE.Color(0xffb27a), rimI: .9, hemi: .7};
  const setMood = o => {
    key.color.copy(IN.key).lerp(OUT.key, o); key.intensity = IN.keyI + (OUT.keyI - IN.keyI) * o;
    rim.color.copy(IN.rim).lerp(OUT.rim, o); rim.intensity = IN.rimI + (OUT.rimI - IN.rimI) * o;
    hemi.intensity = IN.hemi + (OUT.hemi - IN.hemi) * o;
  };
  setMood(0);
  return {hemi, key, rim, fill, flash, setMood};
}
