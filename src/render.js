import * as THREE from 'three';
import {SETTINGS, QUALITY, QUALITY_NAME} from './config.js';
import {AREAS} from './map/kestrel.js';
import {createMaterials} from './gfx/materials.js';
import {MapVisuals} from './gfx/scene.js';
import {Atmosphere} from './gfx/atmosphere.js';

let _blood = null;
function bloodTexture() {
  if (_blood) return _blood;
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 1, 16, 16, 15); grd.addColorStop(0, '#fff'); grd.addColorStop(.5, '#bbb'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32); _blood = new THREE.CanvasTexture(c); return _blood;
}
// Rendering and DOM are kept out of the game logic modules.
export class Renderer {
  constructor(world) {
    const q = QUALITY;
    this.quality = q; this.qualityName = QUALITY_NAME;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .05, 450);
    this.renderer = new THREE.WebGLRenderer({antialias: q.antialias, powerPreference: 'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // static world: render the moon shadow map on demand
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    document.body.prepend(this.renderer.domElement);
    this.canvas = this.renderer.domElement;
    this.M = createMaterials(q);
    this.map = new MapVisuals(this.scene, this.M, world, q);
    const rects = AREAS.filter(a => !a.outdoor && a.floor === 0).map(a => a.rect);
    this.atmo = new Atmosphere(this.scene, this.camera, q, this.map.anchors, rects);
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.compile(this.scene, this.camera); // pre-build shader programs to avoid first-look hitches
    this.effects = []; this.weaponKick = 0; this.muzzleTimer = 0; this.hitmarkerTimer = 0;
    this.createWeaponModel();
    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight);
    });
  }
  refreshShadows() { this.renderer.shadowMap.needsUpdate = true; }
  createWeaponModel() {
    this.gunRoot = new THREE.Group();
    this.camera.add(this.gunRoot);
    this.scene.add(this.camera);
    const metal = new THREE.MeshStandardMaterial({color: 0x282e32, metalness: .72, roughness: .42});
    const grip = new THREE.MeshStandardMaterial({color: 0x47372b, roughness: .88});
    const steel = new THREE.MeshStandardMaterial({color: 0x59616a, metalness: .8, roughness: .33});
    const addPart = (w, h, d, x, y, z, material) => {
      const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      part.position.set(x, y, z); part.castShadow = false; this.gunRoot.add(part); return part;
    };
    addPart(.13, .12, .40, 0, .02, -.20, metal);
    addPart(.115, .085, .24, 0, -.065, -.13, steel);
    const handle = addPart(.105, .23, .13, 0, -.20, -.025, grip); handle.rotation.x = -.26;
    addPart(.025, .035, .035, 0, .095, -.33, steel);
    addPart(.085, .025, .035, 0, .095, -.055, steel);
    this.muzzle = new THREE.Group();
    this.muzzle.position.set(0, .025, -.43);
    this.flash = new THREE.Mesh(new THREE.ConeGeometry(.10, .35, 7), new THREE.MeshBasicMaterial({color: 0xffbc61, transparent: true, opacity: .92, depthWrite: false}));
    this.flash.rotation.x = -Math.PI / 2; this.flash.position.z = -.15; this.muzzle.add(this.flash); this.flash.visible = false;
    // Keep the muzzle light always in the scene (intensity 0 when idle) so the
    // light count never changes => no shader recompiles/stutter when firing.
    this.muzzleLight = new THREE.PointLight(0xff9b3c, 0, 4); this.muzzle.add(this.muzzleLight);
    this.gunRoot.add(this.muzzle);
  }
  showShot(shot) {
    this.weaponKick = 1; this.muzzleTimer = .065;
    if (shot.hit) this.hitmarkerTimer = .09;
    const from = new THREE.Vector3(shot.origin.x, shot.origin.y - .12, shot.origin.z);
    const to = new THREE.Vector3(shot.end.x, shot.end.y, shot.end.z);
    const tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({color: 0xffd08d, transparent: true, opacity: .7}));
    this.scene.add(tracer); this.effects.push({object: tracer, seconds: .075});
    if (shot.zombie) {
      // Blood puff: a few dark-red sprites thrown back along the shot.
      for (let i = 0; i < (shot.head ? 7 : 4); i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({map: bloodTexture(), color: shot.head ? 0x8a0d08 : 0x6a0b07, transparent: true, depthWrite: false, opacity: .9}));
        s.position.copy(to); s.scale.setScalar(.12 + Math.random() * .14); this.scene.add(s);
        const v = new THREE.Vector3((Math.random() - .5) * 1.6, Math.random() * 1.2, (Math.random() - .5) * 1.6).addScaledVector(from.clone().sub(to).normalize(), -.6);
        this.effects.push({object: s, seconds: .35 + Math.random() * .15, vel: v, grow: 1.8});
      }
    } else if (shot.hit) {
      const impact = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 6), new THREE.MeshBasicMaterial({color: 0xffd29c}));
      impact.position.copy(to); this.scene.add(impact); this.effects.push({object: impact, seconds: .17});
    }
  }
  updateWeapon(weapons, input, dt, player) {
    document.getElementById('weapon-name').textContent = weapons.config.name;
    document.getElementById('ammo').textContent = weapons.mag + ' / ' + weapons.reserve;
    document.getElementById('reload').textContent = weapons.reloadRemaining > 0 ? 'RELOADING' : '';
    const ads = input.aiming && input.active;
    this.camera.fov += ((ads ? 59 : 75) - this.camera.fov) * Math.min(1, dt * 12);
    this.camera.updateProjectionMatrix();
    this.weaponKick = Math.max(0, this.weaponKick - dt * 9);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    this.hitmarkerTimer = Math.max(0, this.hitmarkerTimer - dt);
    this.flash.visible = this.muzzleTimer > 0; this.muzzleLight.intensity = this.muzzleTimer > 0 ? 8 : 0;
    document.getElementById('hitmarker').style.opacity = this.hitmarkerTimer > 0 ? '.8' : '0';
    const bob = ads ? 0 : Math.sin(player.bob) * .012 * player.moving, bobY = ads ? 0 : Math.abs(Math.cos(player.bob)) * .01 * player.moving;
    const x = (ads ? 0 : .31) + bob, y = (ads ? -.205 : -.30) - bobY, z = ads ? -.63 : -.56;
    this.gunRoot.position.x += (x - this.gunRoot.position.x) * Math.min(1, dt * 15);
    this.gunRoot.position.y += (y - this.gunRoot.position.y) * Math.min(1, dt * 15);
    this.gunRoot.position.z += (z + this.weaponKick * .08 - this.gunRoot.position.z) * Math.min(1, dt * 20);
    this.gunRoot.rotation.x = this.weaponKick * .11;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i]; fx.seconds -= dt;
      if (fx.vel) { fx.object.position.addScaledVector(fx.vel, dt); fx.vel.y -= 6 * dt; fx.object.scale.multiplyScalar(1 + fx.grow * dt); fx.object.material.opacity = Math.max(0, fx.object.material.opacity - dt * 2); }
      if (fx.seconds <= 0) { this.scene.remove(fx.object); if (!fx.object.isSprite) fx.object.geometry.dispose(); fx.object.material.dispose(); this.effects.splice(i, 1); }
    }
  }
  updatePlayer(player) {
    this.camera.position.set(player.x, player.eyeY + Math.abs(Math.sin(player.bob)) * .025 * player.moving, player.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = player.yaw; this.camera.rotation.x = player.pitch;
    document.getElementById('stamina').style.width = Math.round(player.stamina * 100) + '%';
    document.getElementById('health').style.width = player.health + '%';
  }
  draw(dt) {
    this.map.update(dt, this.camera);
    this.atmo.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
