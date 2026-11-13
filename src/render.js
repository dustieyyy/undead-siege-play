import * as THREE from 'three';
import {SETTINGS, QUALITY, QUALITY_NAME} from './config.js';
import {AREAS} from './map/kestrel.js';
import {createMaterials} from './gfx/materials.js';
import {MapVisuals} from './gfx/scene.js';
import {Atmosphere} from './gfx/atmosphere.js';
import {Viewmodel} from './gfx/viewmodel.js';
import {chalkTexture} from './gfx/guns/chalk.js';
import {WALLBUYS} from './map/kestrel.js';
import {WEAPONS} from './config.js';

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
    this.renderer.info.autoReset = false; // world + viewmodel passes are counted together
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
    this.scene.add(this.camera);
    // Keep the world muzzle light always in the scene (intensity 0 when idle) so the
    // light count never changes => no shader recompiles/stutter when firing.
    this.muzzleLight = new THREE.PointLight(0xff9b3c, 0, 5, 1.6); this.muzzleLight.position.set(.15, -.05, -.7); this.camera.add(this.muzzleLight);
    this.vm = new Viewmodel(this.renderer, this.scene, this.camera, this.quality);
    this.vm.brass.onBounce = (p, scale) => this.onBrass?.(p, scale);
    WALLBUYS.forEach((w, i) => { if (this.vm.guns[w.id]) this.map.setWallbuyArt(w.id, chalkTexture(this.vm.profiles(w.id), i + 3)); });
  }
  showShot(shot) {
    if (shot.pellets.some(p => p.zombie)) this.hitmarkerTimer = .09;
    const G = this.vm.cur, from = G ? this.vm.toWorld(G.gun.localToWorld(G.anchors.muzzle.clone())) : new THREE.Vector3(shot.origin.x, shot.origin.y - .12, shot.origin.z);
    shot.pellets.forEach((p, i) => {
      const to = new THREE.Vector3(p.end.x, p.end.y, p.end.z);
      if (i < 3 && Math.random() < (shot.pellets.length > 1 ? .6 : .85)) {
        const a = from.clone().lerp(to, .04 + Math.random() * .05);
        const tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, to]), new THREE.LineBasicMaterial({color: 0xffd08d, transparent: true, opacity: .55}));
        this.scene.add(tracer); this.effects.push({object: tracer, seconds: .06});
      }
      if (p.zombie) {
        // Blood puff: a few dark-red sprites thrown back along the shot.
        for (let k = 0; k < (p.head ? 6 : 3); k++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({map: bloodTexture(), color: p.head ? 0x8a0d08 : 0x6a0b07, transparent: true, depthWrite: false, opacity: .9}));
          s.position.copy(to); s.scale.setScalar(.12 + Math.random() * .14); this.scene.add(s);
          const v = new THREE.Vector3((Math.random() - .5) * 1.6, Math.random() * 1.2, (Math.random() - .5) * 1.6).addScaledVector(from.clone().sub(to).normalize(), -.6);
          this.effects.push({object: s, seconds: .35 + Math.random() * .15, vel: v, grow: 1.8});
        }
      } else if (p.hit) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({map: bloodTexture(), color: 0xffd29c, transparent: true, depthWrite: false, opacity: .95, blending: THREE.AdditiveBlending}));
        s.position.copy(to); s.scale.setScalar(.09); this.scene.add(s); this.effects.push({object: s, seconds: .09});
        const d = new THREE.Sprite(new THREE.SpriteMaterial({map: bloodTexture(), color: 0x8a8278, transparent: true, depthWrite: false, opacity: .5}));
        d.position.copy(to); d.scale.setScalar(.12); this.scene.add(d);
        this.effects.push({object: d, seconds: .5, vel: new THREE.Vector3(0, .5, 0), grow: 2.2});
      }
    });
  }
  updateWeapon(weapons, input, dt, player, area) {
    const c = weapons.config;
    document.getElementById('weapon-name').textContent = innerWidth < 760 ? c.short : c.name;
    document.getElementById('ammo').textContent = weapons.mag + ' / ' + weapons.reserve;
    document.getElementById('reload').textContent = weapons.action === 'reload' ? 'RELOADING' : weapons.mag === 0 && weapons.reserve === 0 ? 'NO AMMO' : weapons.mag === 0 ? 'PRESS R' : '';
    const other = weapons.slots[1 - weapons.slot];
    document.getElementById('weapon-alt').textContent = other ? WEAPONS[other.id].short : '';
    this.vm.update(dt, weapons, player, area);
    const ads = this.vm.adsE;
    const fov = 75 + (c.adsFov - 75) * ads + this.vm.sprint * 4;
    if (Math.abs(fov - this.camera.fov) > .01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.hitmarkerTimer = Math.max(0, this.hitmarkerTimer - dt);
    this.muzzleLight.intensity = this.vm.flashLevel * 9;
    document.getElementById('hitmarker').style.opacity = this.hitmarkerTimer > 0 ? '.8' : '0';
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i]; fx.seconds -= dt;
      if (fx.vel) { fx.object.position.addScaledVector(fx.vel, dt); fx.vel.y -= 6 * dt; fx.object.scale.multiplyScalar(1 + fx.grow * dt); fx.object.material.opacity = Math.max(0, fx.object.material.opacity - dt * 2); }
      if (fx.seconds <= 0) { this.scene.remove(fx.object); if (!fx.object.isSprite) fx.object.geometry.dispose(); fx.object.material.dispose(); this.effects.splice(i, 1); }
    }
  }
  updatePlayer(player) {
    this.camera.position.set(player.x, player.eyeY + Math.abs(Math.sin(player.bob)) * .025 * player.moving, player.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = player.yaw; this.camera.rotation.x = player.pitch + (this.vm ? this.vm.punch.p : 0);
    document.getElementById('stamina').style.width = Math.round(player.stamina * 100) + '%';
    document.getElementById('health').style.width = player.health + '%';
  }
  draw(dt) {
    this.map.update(dt, this.camera);
    this.atmo.update(dt);
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.vm.render();
  }
}
