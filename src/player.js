import {SETTINGS} from './config.js';
import {START} from './map/kestrel.js';
export class Player {
  constructor(world) {
    this.world = world;
    this.x = START.at[0]; this.z = -START.at[1]; this.feet = 0; this.vy = 0; this.grounded = true;
    this.yaw = START.yaw; this.pitch = 0; this.health = 100; this.stamina = 1; this.points = SETTINGS.startPoints;
    this.bob = 0; this.moving = 0; this.sprinting = false; this.speedScale = 1;
  }
  get eyeY() { return this.feet + SETTINGS.eyeHeight; }
  look(dx, dy) { this.yaw -= dx * SETTINGS.mouseSensitivity; this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * SETTINGS.mouseSensitivity)); }
  blocked(x, z) { return this.world.blocked(x, z, this.feet, SETTINGS.playerRadius); }
  teleport(x, y, floor = 0, yaw = this.yaw) {
    this.x = x; this.z = -y; this.feet = floor ? 3.8 : 0; this.vy = 0; this.yaw = yaw; this.pitch = 0;
  }
  update(dt, input) {
    if (this.frozen) return;
    let forward = Number(input.down('KeyW') || input.down('ArrowUp')) - Number(input.down('KeyS') || input.down('ArrowDown'));
    let strafe = Number(input.down('KeyD')) - Number(input.down('KeyA'));
    if (input.touchMove) { forward -= input.touchMove.y; strafe += input.touchMove.x; }
    const length = Math.hypot(forward, strafe);
    if (length > 1) { forward /= length; strafe /= length; }
    const sprint = (input.down('ShiftLeft') || input.down('ShiftRight') || input.touchSprint) && forward > 0 && this.stamina > 0 && !input.aiming && !this.noSprint;
    this.sprinting = sprint;
    const speed = (sprint ? SETTINGS.sprintSpeed : SETTINGS.walkSpeed) * this.speedScale;
    this.stamina = Math.max(0, Math.min(1, this.stamina + (sprint ? -dt / SETTINGS.sprintSeconds : dt * SETTINGS.staminaRegenPerSecond)));
    const dx = (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe) * speed * dt;
    const dz = (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * strafe) * speed * dt;
    if (!this.blocked(this.x + dx, this.z)) this.x += dx;
    if (!this.blocked(this.x, this.z + dz)) this.z += dz;
    this.moving = Math.min(1, Math.hypot(dx, dz) / (SETTINGS.walkSpeed * dt + 1e-6));
    this.bob += Math.hypot(dx, dz) * 2.2;
    // Vertical: stick to stairs/floors, fall otherwise.
    const ground = this.world.groundAt(this.x, this.z, this.feet, SETTINGS.stepHeight);
    if (ground > this.feet) { this.feet = Math.min(ground, this.feet + dt * 9 + (ground - this.feet) * .5); this.vy = 0; this.grounded = true; }
    else if (this.grounded && this.feet - ground < SETTINGS.stepHeight) { this.feet = ground; this.vy = 0; }
    else {
      this.grounded = false; this.vy -= SETTINGS.gravity * dt; this.feet += this.vy * dt;
      if (this.feet <= ground) { this.feet = ground; this.vy = 0; this.grounded = true; }
    }
  }
}
