import {SPAWN_ZONES} from '../map/kestrel.js';

// Round director: zombie count/health/speed per round, spawn pacing, breaks.
export const ROUND_BREAK = 10;
export function zombiesForRound(r) { return r <= 4 ? [6, 8, 13, 18][r - 1] : Math.floor(.09 * r * r + 24 - .45 * 5); }
export function healthForRound(r) { return r <= 9 ? 100 + (r - 1) * 80 : Math.round(740 * 1.1 ** (r - 9)); }
export function speedForRound(r) {
  const x = Math.random();
  if (r >= 6 && x < Math.min(.75, .15 * (r - 4))) return 2.5 + Math.random() * .5; // runners
  if (r >= 3 && x < Math.min(.85, .25 * (r - 1))) return 1.6 + Math.random() * .4;  // joggers
  return .85 + Math.random() * .35;                                                 // walkers
}

export class Rounds {
  constructor({zombies, nav, interactions, player, hooks}) {
    Object.assign(this, {zombies, nav, interactions, player, hooks});
    this.round = 0; this.state = 'idle'; this.timer = 0; this.toSpawn = 0; this.spawnTimer = 0; this.kills = 0; this.headshots = 0;
  }
  start(firstRound = 1, delay = 3) { this.round = firstRound - 1; this.state = 'break'; this.timer = delay; }
  get remaining() { return this.toSpawn + this.zombies.living; }
  next() {
    this.round++; this.state = 'active'; this.toSpawn = zombiesForRound(this.round); this.spawnTimer = 2.5;
    this.hooks.roundStart?.(this.round);
  }
  end() { this.state = 'break'; this.timer = ROUND_BREAK; this.hooks.roundEnd?.(this.round); }
  skip() { // debug: finish the current round immediately
    if (this.state !== 'active') { this.timer = 0; return; }
    this.zombies.killAll(); this.toSpawn = 0; this.end(); this.timer = 2;
  }
  activeZones() { const u = this.interactions.unlocked; return SPAWN_ZONES.filter(z => z.activeFrom === 'start' || u.has(z.activeFrom)); }
  spawnPoint() {
    const p = this.player, zones = this.activeZones(), px = p.x, py = -p.z;
    const weights = zones.map(z => { const [x0, y0, x1, y1] = z.rect; return 1 / (Math.hypot((x0 + x1) / 2 - px, (y0 + y1) / 2 - py) + 8); });
    const sum = weights.reduce((a, b) => a + b, 0);
    for (let attempt = 0; attempt < 16; attempt++) {
      let r = Math.random() * sum, zone = zones[0];
      for (let i = 0; i < zones.length; i++) { r -= weights[i]; if (r <= 0) { zone = zones[i]; break; } }
      const [x0, y0, x1, y1] = zone.rect, x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0);
      const n = this.nav.nodeAt(x, y, 0, 1);
      if (n >= 0 && this.nav.layerOf(n) === 0 && this.nav.dist[n] < Infinity) return {x, y, zone};
    }
    return null;
  }
  spawnOne() {
    const pt = this.spawnPoint(); if (!pt) return null;
    return this.zombies.spawn({x: pt.x, y: pt.y, health: healthForRound(this.round), speed: speedForRound(this.round)});
  }
  respawn(z) { // stuck zombie: put it back at a spawn zone with the same health
    const pt = this.spawnPoint(); if (!pt) return;
    const health = z.health, speed = z.speed; this.zombies.release(z);
    const nz = this.zombies.spawn({x: pt.x, y: pt.y, health, speed}); if (!nz) this.toSpawn++;
  }
  update(dt) {
    if (this.state === 'break') { if ((this.timer -= dt) <= 0) this.next(); return; }
    if (this.state !== 'active') return;
    if (this.toSpawn > 0 && (this.spawnTimer -= dt) <= 0 && this.zombies.count < this.zombies.cap) {
      if (this.zombies.source >= 0 && this.spawnOne()) this.toSpawn--;
      this.spawnTimer = Math.max(.6, 2.2 - this.round * .12) * (.6 + Math.random() * .8);
    }
    if (this.toSpawn <= 0 && this.zombies.living === 0) this.end();
  }
}
