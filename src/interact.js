import {SETTINGS} from './config.js';
import {DOORS, WALLBUYS, PERKS, SUPPLY_CRATES, SUPPLY_CRATE_COST, POWER, SECRETS, F2} from './map/kestrel.js';

// Data-driven interaction layer: purchasable doors, power switch and the
// placeholder markers (wall-buys, perks, Supply Crate, radio) that later systems hook into.
export class Interactions {
  constructor(world, visuals, player, hooks = {}) {
    this.world = world; this.visuals = visuals; this.player = player; this.hooks = hooks;
    this.power = false; this.unlocked = new Set(['ops']); this.hold = 0; this.target = null; this.cooldown = 0;
    this.items = [];
    for (const d of DOORS) {
      let pos;
      if (d.debris) { const [x0, y0, x1, y1] = d.debris; pos = [(x0 + x1) / 2 - 1.0, (y0 + y1) / 2]; }
      else pos = d.at;
      this.items.push({kind: 'door', id: d.id, door: d, pos, floor: d.floor, range: d.debris ? 2.6 : 2.4});
    }
    this.items.push({kind: 'power', id: 'power', pos: POWER.at, floor: 0, range: 1.8});
    for (const w of WALLBUYS) this.items.push({kind: 'wallbuy', id: w.id, data: w, pos: w.at, floor: w.floor, range: 1.9});
    for (const p of PERKS) this.items.push({kind: 'perk', id: p.id, data: p, pos: p.at, floor: p.floor, range: 1.9});
    for (const c of SUPPLY_CRATES.filter(c => c.firstSpawn)) this.items.push({kind: 'crate', id: c.id, data: c, pos: c.at, floor: c.floor, range: 1.8});
    this.items.push({kind: 'radio', id: 'radio', pos: SECRETS.radio.at, floor: 0, range: 1.6});
    this.items.push({kind: 'locker', id: 'locker', pos: SECRETS.locker.at, floor: 1, range: 1.5});
  }
  floorOf() { return this.player.feet > 2 ? 1 : 0; }
  find() {
    const p = this.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), floor = this.floorOf();
    let best = null, bestScore = Infinity;
    for (const it of this.items) {
      if (it.done || it.floor !== floor) continue;
      const dx = it.pos[0] - p.x, dz = -it.pos[1] - p.z, d = Math.hypot(dx, dz);
      if (d > it.range) continue;
      const facing = d < .5 ? 1 : (dx * fx + dz * fz) / d;
      if (facing < .15) continue;
      const score = d - facing;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best;
  }
  prompt(it) {
    const pts = this.player.points;
    switch (it.kind) {
      case 'door':
        if (it.door.power) return this.power ? null : {text: 'Requires power — the generator is in the Hangar', can: false};
        return {text: `Hold F to ${it.door.debris ? 'clear debris' : 'open door'} — ${it.door.name} [${it.door.cost}]`, can: pts >= it.door.cost, cost: it.door.cost};
      case 'power': return this.power ? null : {text: 'Hold F to turn on the power', can: true};
      case 'wallbuy': return {text: `${it.data.name} [${it.data.cost}] — wall-buy coming next update`, can: false, info: true};
      case 'perk': return {text: `${it.data.name} [${it.data.cost}]${it.data.needsPower && !this.power ? ' — needs power' : ''} — perks coming next update`, can: false, info: true};
      case 'crate': return {text: `Supply Crate [${SUPPLY_CRATE_COST}] — coming next update`, can: false, info: true};
      case 'radio': return {text: 'The field radio crackles… (something is missing)', can: false, info: true};
      case 'locker': return {text: "An officer's locker, rusted shut", can: false, info: true};
    }
  }
  act(it) {
    if (it.kind === 'door') {
      const d = it.door;
      if (this.player.points < d.cost) { this.hooks.message?.('Not enough points', 'bad'); return; }
      this.player.points -= d.cost; this.openDoor(d); this.hooks.points?.(-d.cost);
      this.hooks.message?.(`${d.name} opened`, 'good');
    } else if (it.kind === 'power') this.setPower(true);
  }
  openDoor(d) {
    if (d.open) return;
    this.world.openDoor(d); this.visuals.openDoor(d.id);
    for (const it of this.items) if (it.door === d) it.done = true;
    for (const a of d.opens || []) this.unlocked.add(a);
    this.hooks.changed?.();
  }
  setPower(on) {
    if (this.power === on) return;
    this.power = on; this.visuals.setPower(on);
    if (on) { this.openDoor(DOORS.find(d => d.power)); this.hooks.message?.('POWER RESTORED — catwalk open', 'good'); }
    this.hooks.changed?.();
  }
  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const it = this.find(); const pr = it && this.prompt(it);
    this.target = pr ? it : null; this.current = pr;
    const holding = input.down('KeyF') || input.down('KeyE');
    if (pr && !pr.info && holding && this.cooldown <= 0) {
      this.hold += dt;
      if (this.hold >= SETTINGS.holdToBuySeconds) { this.hold = 0; this.cooldown = .6; if (pr.can) this.act(it); else if (pr.cost) this.hooks.message?.('Not enough points', 'bad'); }
    } else if (!holding) this.hold = 0;
    return pr;
  }
}
