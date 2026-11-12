import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/BufferGeometryUtils.js';

// Projected (box/triplanar-style) UVs from positions + normals, in meters / scale.
export function projectUV(geo, su, sv) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; } else if (nx >= nz) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / su; uv[i * 2 + 1] = v / sv;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

// Collects static geometry per material and merges it into a few big meshes.
export class Batcher {
  constructor(materials) { this.M = materials; this.groups = new Map(); }
  scaleOf(mat) { return this.M[mat]?.userData.scale || [1, 1]; }
  push(mat, geo, {shadow = true, receive = true} = {}) {
    const key = mat + (shadow ? '|s' : '|n');
    if (!this.groups.has(key)) this.groups.set(key, {mat, shadow, receive, list: []});
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    this.groups.get(key).list.push(g);
  }
  // Axis-aligned or rotated box. world=true projects UVs in world space (seamless architecture).
  box(mat, x, y, z, w, h, d, o = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    return this.add(mat, geo, x, y, z, o);
  }
  add(mat, geo, x, y, z, o = {}) {
    const [su, sv] = o.uvScale || this.scaleOf(mat);
    if (!o.world && !o.keepUV) projectUV(geo, su, sv);
    tmpE.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'YXZ'); tmpQ.setFromEuler(tmpE);
    tmpS.set(o.sx || 1, o.sy || 1, o.sz || 1); tmpP.set(x, y, z);
    tmpM.compose(tmpP, tmpQ, tmpS);
    if (o.parent) tmpM.premultiply(o.parent);
    geo.applyMatrix4(tmpM);
    if (o.world) projectUV(geo, su, sv);
    this.push(mat, geo, o);
    return geo;
  }
  cyl(mat, x, y, z, rt, rb, h, seg = 12, o = {}) { return this.add(mat, new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), x, y, z, o); }
  flush(parent) {
    const meshes = [];
    for (const {mat, shadow, receive, list} of this.groups.values()) {
      if (!list.length) continue;
      const geo = mergeGeometries(list, false);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, this.M[mat]);
      mesh.castShadow = shadow; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.name = 'static:' + mat; parent.add(mesh); meshes.push(mesh);
      for (const g of list) g.dispose();
    }
    this.groups.clear();
    return meshes;
  }
}
