import * as THREE from 'three';
import {WEAPONS} from './config.js';
import {SUPPLY_CRATES, SUPPLY_CRATE_COST} from './map/kestrel.js';

// Supply Crate (mystery box): pay, watch it roll through the arsenal, take what it lands on.
// After a few uses it can come up empty: points refunded and the crate relocates to another spot.
const ROLL = 4.2, OFFER = 8, CLOSE = .6, SINK = 1.4, RISE = 1.4, AWAY = 3;
export class SupplyCrate {
  constructor({view, weapons, hooks, audio, rng = Math.random}) {
    this.view = view; this.weapons = weapons; this.hooks = hooks; this.audio = audio; this.rng = rng;
    this.map = view.map; this.spot = this.map.crate?.spot ?? 0;
    this.state = 'idle'; this.t = 0; this.uses = 0; this.result = null; this.shown = null; this.nextSwap = 0;
    this.pool = Object.keys(WEAPONS).filter(id => view.vm.guns[id]);
    this.forceMove = false;
  }
  get spotData() { return SUPPLY_CRATES[this.spot]; }
  get pos() { return this.spotData.at; }
  get floor() { return this.spotData.floor; }
  prompt(points) {
    switch (this.state) {
      case 'idle': return {text: `Hold F for a random weapon — Supply Crate [${SUPPLY_CRATE_COST}]`, can: points >= SUPPLY_CRATE_COST, cost: SUPPLY_CRATE_COST};
      case 'rolling': return {text: 'The Supply Crate is rolling…', can: false, info: true};
      case 'offer': {
        if (this.result === null) return {text: 'The crate is empty…', can: false, info: true};
        const c = WEAPONS[this.result], own = this.weapons.owns(this.result);
        return {text: `Hold F to take ${c.name}${own ? ' (ammo)' : ''}`, can: true, take: true};
      }
      default: return {text: 'The Supply Crate is moving…', can: false, info: true};
    }
  }
  // Called after the interaction layer has charged the points (idle) or for "take" (offer).
  act() {
    if (this.state === 'idle') return this.open();
    if (this.state === 'offer' && this.result) {
      const id = this.result, r = this.weapons.give(id);
      this.hooks.message?.(r === 'ammo' ? `${WEAPONS[id].short} ammo refilled` : `${WEAPONS[id].name}${r === 'replace' ? ' — swapped for your old weapon' : ''}`, 'good');
      this.audio?.play('purchase_chime');
      this.clearDisplay(); this.begin('close');
    }
  }
  open() {
    this.uses++;
    const moveRoll = this.forceMove || (this.uses > 3 && SUPPLY_CRATES.length > 1 && this.rng() < 1 / 6);
    const choices = this.pool.filter(id => !this.weapons.owns(id));
    this.result = moveRoll ? null : choices[Math.floor(this.rng() * choices.length)] ?? this.pool[0];
    this.forceMove = false;
    this.begin('rolling'); this.nextSwap = 0;
    this.audio?.play('supply_crate_open');
  }
  begin(state) { this.state = state; this.t = 0; }
  show(id) {
    const d = this.map.crate.display;
    if (this.shown === id) return;
    this.clearDisplay();
    const G = this.view.vm.guns[id]; if (!G?.bare) return;
    const b = G.bare; b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.updateMatrixWorld(true);
    if (!b.userData.centre) { const box = new THREE.Box3().setFromObject(b); b.userData.centre = box.getCenter(new THREE.Vector3()); }
    b.position.copy(b.userData.centre).negate(); d.add(b); this.shown = id;
  }
  clearDisplay() { const d = this.map.crate.display; while (d.children.length) d.remove(d.children[0]); this.shown = null; }
  update(dt) {
    this.t += dt; const t = this.t, M = this.map;
    if (!M.crate) return;
    const d = M.crate.display;
    if (this.state === 'idle') M.crateState({});
    else if (this.state === 'rolling') {
      const k = Math.min(1, t / .5);
      M.crateState({lid: k, glow: k});
      // cycle models, slowing down
      if (t >= this.nextSwap && t < ROLL - .35) {
        const opts = this.pool.filter(id => id !== this.shown); this.show(opts[Math.floor(this.rng() * opts.length)]);
        this.nextSwap = t + .07 + (t / ROLL) ** 2 * .45;
      }
      d.position.y = .55 + Math.min(1, t / ROLL) * .45;
      d.rotation.y = Math.PI / 2 + Math.sin(t * 3) * .15;
      if (t >= ROLL - .35) { if (this.result) this.show(this.result); else this.clearDisplay(); }
      if (t >= ROLL) {
        this.begin('offer');
        if (this.result) { this.audio?.play('purchase_chime', {rate: 1.2}); }
        else { this.hooks.refund?.(SUPPLY_CRATE_COST); this.hooks.message?.('The Supply Crate is empty — it moves on (points refunded)', 'bad'); this.audio?.play('pistol_empty_click', {rate: .5}); }
      }
    } else if (this.state === 'offer') {
      M.crateState({lid: 1, glow: .7});
      d.position.y = 1 - Math.min(1, t / OFFER) * .4; d.rotation.y = Math.PI / 2 + Math.sin(t * 1.4) * .08;
      if (!this.result && t > 1.2) { this.clearDisplay(); this.begin('sink'); }
      else if (t >= OFFER) { this.clearDisplay(); this.begin('close'); }
    } else if (this.state === 'close') {
      M.crateState({lid: 1 - Math.min(1, t / CLOSE), glow: 1 - Math.min(1, t / CLOSE)});
      if (t >= CLOSE) this.begin('idle');
    } else if (this.state === 'sink') {
      const k = Math.min(1, t / SINK);
      M.crateState({lid: 1 - Math.min(1, t / .4), sink: k});
      if (t >= SINK) this.begin('away');
    } else if (this.state === 'away') {
      M.crateState({sink: 1});
      if (t >= AWAY) {
        const others = SUPPLY_CRATES.map((_, i) => i).filter(i => i !== this.spot);
        this.spot = others[Math.floor(this.rng() * others.length)]; M.moveCrate(this.spot); this.uses = 0;
        this.hooks.moved?.(this.spotData);
        this.begin('rise');
      }
    } else if (this.state === 'rise') {
      M.crateState({sink: 1 - Math.min(1, t / RISE)});
      if (t >= RISE) this.begin('idle');
    }
  }
}
