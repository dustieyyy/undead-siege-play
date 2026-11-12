import {WEAPONS} from './config.js';
export class Weapons {
  constructor(world) { this.world = world; this.id = 'pistol'; this.mag = WEAPONS.pistol.magazine; this.reserve = WEAPONS.pistol.reserve; this.cooldown = 0; this.reloadRemaining = 0; this.shotSequence = 0; }
  get config() { return WEAPONS[this.id]; }
  reload() { if (this.reloadRemaining > 0 || this.mag >= this.config.magazine || this.reserve <= 0) return false; this.reloadRemaining = this.config.reloadMs / 1000; return true; }
  update(dt, input, player, onShot) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadRemaining > 0) {
      this.reloadRemaining -= dt;
      if (this.reloadRemaining <= 0) { const bullets = Math.min(this.config.magazine - this.mag, this.reserve); this.mag += bullets; this.reserve -= bullets; this.reloadRemaining = 0; }
    }
    if (input.consume('KeyR')) this.reload();
    const fire = this.config.automatic ? input.shooting : input.consumeFire();
    if (!fire || this.cooldown > 0 || this.reloadRemaining > 0) return;
    if (!this.mag) { this.reload(); return; }
    this.mag--; this.cooldown = this.config.fireRateMs / 1000; this.shotSequence++;
    const yaw = player.yaw, pitch = player.pitch;
    const forward = {x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch)};
    const right = {x: Math.cos(yaw), y: 0, z: -Math.sin(yaw)};
    const up = {x: Math.sin(yaw) * Math.sin(pitch), y: Math.cos(pitch), z: Math.cos(yaw) * Math.sin(pitch)};
    const spread = this.config.spread * (input.aiming ? .3 : 1);
    const sx = (Math.random() * 2 - 1) * spread, sy = (Math.random() * 2 - 1) * spread;
    const direction = {x: forward.x + sx * right.x + sy * up.x, y: forward.y + sx * right.y + sy * up.y, z: forward.z + sx * right.z + sy * up.z};
    const m = Math.hypot(direction.x, direction.y, direction.z); direction.x /= m; direction.y /= m; direction.z /= m;
    const origin = {x: player.x, y: player.eyeY, z: player.z};
    let hit = this.world.raycast(origin, direction, this.config.range);
    // Ground plane
    if (direction.y < 0) { const t = -origin.y / direction.y; if (t < (hit?.distance ?? this.config.range)) hit = {distance: t, normal: {x: 0, y: 1, z: 0}}; }
    const distance = hit?.distance ?? this.config.range;
    const end = {x: origin.x + direction.x * distance, y: origin.y + direction.y * distance, z: origin.z + direction.z * distance};
    onShot({origin, end, hit: !!hit, normal: hit?.normal ?? null, sequence: this.shotSequence, target: hit?.collider?.tag ?? null});
  }
}
