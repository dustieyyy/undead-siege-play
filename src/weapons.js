import {WEAPONS, STARTING_WEAPON} from './config.js';

// Two-slot weapon logic (render-agnostic). The viewmodel reads `action`, `actionT`,
// `shellPhase`, `adsT`, `lastShot` etc. to animate; game.js listens to onEvent for sounds.
// Actions: 'draw' -> 'ready' <-> 'reload' | 'cycle' ; 'holster' -> (swap) -> 'draw'
const clamp01 = v => Math.max(0, Math.min(1, v));
export class Weapons {
  constructor(world) {
    this.world = world;
    this.slots = [this.make(STARTING_WEAPON), null]; this.slot = 0; this.next = null;
    this.action = 'draw'; this.actionTime = 0; this.actionDur = WEAPONS[STARTING_WEAPON].drawTime; this.cooldown = 0;
    this.adsT = 0; this.shotSequence = 0; this.lastShot = -9; this.time = 0; this.shellPhase = null; this.shells = 0; this.lastPumpShot = -9;
  }
  make(id) { const c = WEAPONS[id]; return {id, mag: c.magazine, reserve: c.reserve}; }
  get gun() { return this.slots[this.slot]; }
  get id() { return this.gun.id; }
  get config() { return WEAPONS[this.id]; }
  get mag() { return this.gun.mag; }
  get reserve() { return this.gun.reserve; }
  get reloadRemaining() { return this.action === 'reload' ? 1 : 0; }
  get actionT() { return this.actionDur > 0 ? clamp01(this.actionTime / this.actionDur) : 1; }
  owns(id) { return this.slots.some(s => s?.id === id); }
  ammoFull(id) { const s = this.slots.find(s => s?.id === id); return !!s && s.mag >= WEAPONS[id].magazine && s.reserve >= WEAPONS[id].reserve; }
  // Wall-buy: refill if owned, else fill an empty slot, else replace the current weapon.
  give(id) {
    const owned = this.slots.findIndex(s => s?.id === id);
    if (owned >= 0) { const s = this.slots[owned]; s.reserve = WEAPONS[id].reserve; if (owned !== this.slot) s.mag = WEAPONS[id].magazine; this.onEvent?.('ammo', id); return 'ammo'; }
    const empty = this.slots.findIndex(s => !s);
    const target = empty >= 0 ? empty : this.slot;
    this.slots[target] = this.make(id);
    this.switchTo(target, true);
    return empty >= 0 ? 'new' : 'replace';
  }
  switchTo(i, force = false) {
    if (!this.slots[i] || (i === this.slot && !force)) return false;
    if (force && i === this.slot) { this.begin('draw', this.config.drawTime); this.onEvent?.('draw', this.id); return true; }
    this.next = i; this.begin('holster', .22); this.onEvent?.('holster', this.id); return true;
  }
  swap() { return this.slots[1 - this.slot] ? this.switchTo(1 - this.slot) : false; }
  begin(action, dur) { this.action = action; this.actionTime = 0; this.actionDur = dur; if (action !== 'reload') this.shellPhase = null; }
  reload() {
    const c = this.config, g = this.gun;
    if (this.action === 'reload' || this.action === 'holster' || this.action === 'draw' || g.mag >= c.magazine || g.reserve <= 0) return false;
    if (c.reload === 'shells') { this.begin('reload', c.reloadStart); this.shellPhase = 'start'; this.shells = 0; }
    else this.begin('reload', c.reloadTime);
    this.reloadEmpty = g.mag === 0;
    this.onEvent?.('reload', this.id);
    return true;
  }
  update(dt, input, player, onShot) {
    this.time += dt; this.stepDt = dt; this.cooldown = Math.max(-1, this.cooldown - dt);
    const c = this.config, g = this.gun;
    // swap / select
    if (input.consume('KeyQ') || input.consumeSwap?.()) this.swap();
    if (input.consume('Digit1')) this.switchTo(0); if (input.consume('Digit2')) this.switchTo(1);
    if (input.consume('KeyR')) this.reload();
    // ADS (not while sprinting, swapping or reloading)
    const wantAds = input.aiming && input.active && !player.sprinting && !['holster', 'draw'].includes(this.action) && !(this.action === 'reload' && c.reload !== 'shells');
    this.adsT = clamp01(this.adsT + (wantAds ? 1 : -1) * dt / c.adsTime);
    this.ads = wantAds;
    // actions
    this.actionTime += dt;
    // Auto: fire while the trigger is held (a quick tap still fires once). Semi/bolt/pump: one shot per press.
    const pressed = input.consumeFire();
    let fireWanted = c.auto ? (input.shooting || pressed) : pressed;
    if (this.action === 'reload') {
      if (c.reload === 'shells') {
        if (fireWanted && g.mag > 0 && this.shellPhase === 'shell') { this.shellPhase = 'end'; this.begin('reload', c.reloadEnd); this.shellPhase = 'end'; fireWanted = false; }
        if (this.actionTime >= this.actionDur) {
          if (this.shellPhase === 'shell') { g.mag++; g.reserve--; this.shells++; this.onEvent?.('shell', this.id); }
          if (this.shellPhase === 'end') { this.begin('ready', 0); this.onEvent?.('reloadDone', this.id); }
          else if (g.mag < c.magazine && g.reserve > 0) { this.begin('reload', c.reloadShell); this.shellPhase = 'shell'; }
          else { this.begin('reload', c.reloadEnd); this.shellPhase = 'end'; this.onEvent?.('pump', this.id); }
        }
      } else if (this.actionTime >= this.actionDur) {
        const n = Math.min(c.magazine - g.mag, g.reserve); g.mag += n; g.reserve -= n; this.begin('ready', 0); this.onEvent?.('reloadDone', this.id);
      }
      fireWanted = false;
    } else if (this.action === 'holster') {
      if (this.actionTime >= this.actionDur) { this.slot = this.next; this.next = null; this.adsT = 0; this.begin('draw', this.config.drawTime); this.onEvent?.('draw', this.id); }
      return;
    } else if (this.action === 'draw') {
      if (this.actionTime >= this.actionDur) this.begin('ready', 0); else return;
    } else if (this.action === 'cycle') {
      if (this.actionTime >= this.actionDur) this.begin('ready', 0); else fireWanted = false;
    }
    if (!fireWanted || this.cooldown > 1e-6 || this.action !== 'ready') return;
    if (player.sprinting) return;
    if (!g.mag) { if (!this.reload()) this.onEvent?.('empty', this.id); return; }
    this.fire(c, g, player, onShot);
  }
  fire(c, g, player, onShot) {
    g.mag--; this.cooldown = Math.max(this.cooldown, -(this.stepDt || 0)) + c.interval; this.shotSequence++; this.lastShot = this.time; // carry the cooldown remainder so rpm is exact at a fixed step
    const yaw = player.yaw, pitch = player.pitch;
    const forward = {x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch)};
    const right = {x: Math.cos(yaw), y: 0, z: -Math.sin(yaw)};
    const up = {x: Math.sin(yaw) * Math.sin(pitch), y: Math.cos(pitch), z: Math.cos(yaw) * Math.sin(pitch)};
    const spreadBase = c.spread + (c.adsSpread - c.spread) * this.adsT;
    const spread = spreadBase * (1 + player.moving * .6 * (1 - this.adsT * .6));
    const origin = {x: player.x, y: player.eyeY, z: player.z};
    const pellets = [];
    for (let p = 0; p < c.pellets; p++) {
      // uniform disc distribution
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
      const sx = Math.cos(a) * r, sy = Math.sin(a) * r;
      const d = {x: forward.x + sx * right.x + sy * up.x, y: forward.y + sx * right.y + sy * up.y, z: forward.z + sx * right.z + sy * up.z};
      const m = Math.hypot(d.x, d.y, d.z); d.x /= m; d.y /= m; d.z /= m;
      let hit = this.world.raycast(origin, d, c.range);
      if (d.y < 0) { const t = -origin.y / d.y; if (t < (hit?.distance ?? c.range)) hit = {distance: t, normal: {x: 0, y: 1, z: 0}}; }
      let distance = hit?.distance ?? c.range;
      const z = this.hitTest?.(origin, d, distance);
      if (z) distance = z.distance;
      const end = {x: origin.x + d.x * distance, y: origin.y + d.y * distance, z: origin.z + d.z * distance};
      pellets.push({end, dir: d, hit: !!hit || !!z, normal: z ? null : hit?.normal ?? null, zombie: z?.zombie ?? null, head: !!z?.head});
    }
    if (c.cycle && g.mag > 0) this.begin('cycle', c.cycle);
    this.onEvent?.('fire', this.id);
    const p0 = pellets[0];
    onShot({origin, end: p0.end, hit: p0.hit, normal: p0.normal, sequence: this.shotSequence, target: p0.zombie ? 'zombie' : null,
      zombie: p0.zombie, head: p0.head, damage: c.damage, headshot: c.headshot, pellets, weapon: this.id});
  }
}
