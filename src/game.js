import {SETTINGS, DEBUG, TEST_MODE, QUALITY, NO_ZOMBIES, START_ROUND, GOD_MODE, WEAPONS} from './config.js';
import {TELEPORTS, DOORS, PERKS, SECRETS} from './map/kestrel.js';
import {World} from './world.js';
import {Player} from './player.js';
import {Input} from './input.js';
import {Renderer} from './render.js';
import {Weapons} from './weapons.js';
import {Interactions} from './interact.js';
import {AudioManager} from './audio.js';
import {loadZombie} from './assets.js';
import {NavGrid} from './ai/nav.js';
import {Barricades} from './ai/barricades.js';
import {Zombies} from './ai/zombies.js';
import {Rounds} from './ai/rounds.js';

const $ = id => document.getElementById(id);
const world = new World();
const view = new Renderer(world), player = new Player(world), weapons = new Weapons(world);
const input = new Input(view.canvas, $('overlay'), (dx, dy) => player.look(dx, dy));
const audio = new AudioManager(view.camera, view.scene);
const navStart = performance.now();
const nav = new NavGrid(world);
const navMs = performance.now() - navStart;
const barricades = new Barricades(world, nav, view.map);
let msgTimer = 0, shadowDirty = 0, god = GOD_MODE, over = false, hurtTimer = 0, sinceHurt = 99, rebuildPoints = 0;
const stats = {kills: 0, headshots: 0, earned: 0};

function addPoints(n) { if (!n) return; player.points += n; if (n > 0) stats.earned += n; hooks.points(n); }
const hooks = {
  message(text, kind = '') { const m = $('message'); m.textContent = text; m.className = 'show ' + kind; msgTimer = 2.4; },
  points(delta) { const f = $('points-delta'); f.textContent = (delta > 0 ? '+' : '') + delta; f.className = delta > 0 ? 'up' : 'down'; void f.offsetWidth; f.classList.add('anim'); },
  changed() { view.refreshShadows(); $('power').classList.toggle('on', interactions.power); $('power').textContent = interactions.power ? 'POWER ON' : 'POWER OFF'; },
  opened(d) {
    const c = d.collider; if (c) nav.refreshRect([c.minX, -c.maxZ, c.maxX, -c.minZ]);
    zombies.flowTimer = 0;
  },
  event(kind) {
    if (kind === 'door' || kind === 'debris') audio.play('purchase_chime');
    if (kind === 'debris') audio.play('door_debris_clear');
    if (kind === 'power') {
      audio.play('power_switch_thunk');
      setTimeout(() => audio.play('generator_spinup', {volume: .9}), 250);
      setTimeout(() => audio.play('lights_buzz_on'), 1300);
      startPerkHums();
    }
  },
  weaponState(id) { const c = WEAPONS[id]; return {owned: weapons.owns(id), full: weapons.ammoFull(id), name: c?.short}; },
  buy(id) {
    const r = weapons.give(id); audio.play('purchase_chime');
    if (r === 'ammo') { audio.play('pistol_reload', {offset: 1.03, duration: .14, volume: .8}); hooks.message(`${WEAPONS[id].short} ammo refilled`, 'good'); }
    else hooks.message(`${WEAPONS[id].name}${r === 'replace' ? ' — swapped for your old weapon' : ''}`, 'good');
  },
  rebuild(bar) {
    if (!barricades.rebuild(bar)) return;
    audio.at('window_plank_rebuild', bar.center[0], bar.floorH + 1.3, -bar.center[1], {ref: 3});
    if (rebuildPoints < SETTINGS.rebuildCapPerRound) { rebuildPoints += SETTINGS.pointsRebuild; addPoints(SETTINGS.pointsRebuild); }
    shadowDirty = .4;
  },
};
const interactions = new Interactions(world, view.map, player, hooks);
interactions.addBarricades(barricades);

const zombies = new Zombies({scene: view.scene, camera: view.camera, nav, barricades, player, audio, quality: QUALITY, hooks: {
  hurt(z) { hurtPlayer(z); },
  boards() { shadowDirty = .4; },
  respawn(z) { rounds.respawn(z); },
}});
const rounds = new Rounds({zombies, nav, interactions, player, hooks: {
  roundStart(r) {
    setRound(r, true); rebuildPoints = 0;
    audio.play('round_start_siren');
    if (r === 1) setTimeout(() => audio.play('vo_round_one'), 900);
    hooks.message(r % 5 === 0 ? `ROUND ${r} — HOLD THE LINE` : `ROUND ${r}`, 'bad');
  },
  roundEnd(r) { audio.play('round_end_sting'); hooks.message(`ROUND ${r} SURVIVED`, 'good'); $('round').classList.add('flash'); },
}});
weapons.hitTest = (o, d, max) => zombies.hitTest(o, d, max);
// Weapon sounds: only the pistol has recorded audio, so every gun reuses it with pitch shifts,
// layering and slices of the reload recording (0-.16 s mag out, 1.03-1.17 mag in, 1.18-1.41 slide rack).
const SLICE = {out: [0, .17], in: [1.03, .14], rack: [1.18, .23]};
let sfxTimers = [];
const later = (ms, fn) => { sfxTimers.push(setTimeout(fn, ms)); };
const slice = (k, o = {}) => audio.play('pistol_reload', {offset: SLICE[k][0], duration: SLICE[k][1], ...o});
weapons.onEvent = (kind, id) => {
  const c = WEAPONS[id] || weapons.config;
  if (kind === 'fire') {
    const s = c.sound, [r0, r1] = s.rate;
    audio.play(s.key, {rate: r0 + Math.random() * (r1 - r0), volume: s.volume});
    if (s.layer) later(s.layer.delay * 1000, () => audio.play(s.layer.key, {rate: s.layer.rate * (.97 + Math.random() * .06), volume: s.layer.volume}));
    if (c.climb) player.pitch = Math.min(1.5, player.pitch + c.climb * (1 - weapons.adsT * .4));
    if (c.cycle && weapons.mag > 0) later(c.cycle * (id === 'shotgun' ? 220 : 300), () => slice('rack', {rate: id === 'shotgun' ? .68 : .82, volume: .9}));
  }
  if (kind === 'reload') {
    const T = c.reload === 'shells' ? 0 : c.reloadTime * 1000;
    if (c.reload === 'mag') {
      const rate = id === 'pistol' ? 1 : id === 'squad' ? .8 : .9;
      later(T * .12, () => slice('out', {rate})); later(T * .56, () => slice('in', {rate}));
      if (id === 'pistol' ? weapons.reloadEmpty : true) later(T * (id === 'pistol' ? .73 : .7), () => slice('rack', {rate: rate * .95}));
    } else if (c.reload === 'clip') {
      later(T * .1, () => slice('rack', {rate: .78})); for (const f of [.36, .47, .58]) later(T * f, () => slice('in', {rate: 1.25, volume: .6}));
      later(T * .76, () => slice('rack', {rate: .86}));
    }
  }
  if (kind === 'shell') { slice('in', {rate: .72, volume: .9}); audio.play('pistol_empty_click', {rate: .6, volume: .4}); }
  if (kind === 'pump') later(80, () => slice('rack', {rate: .68}));
  if (kind === 'empty') audio.play('pistol_empty_click', {cooldown: .15, rate: id === 'pistol' ? 1 : .8});
  if (kind === 'holster') { sfxTimers.forEach(clearTimeout); sfxTimers = []; }
  if (kind === 'draw') slice('in', {rate: .85, volume: .45});
};
view.onBrass = (p, scale) => audio.play('pistol_empty_click', {rate: 2.1 + Math.random() * .5 - scale * .4, volume: .12, cooldown: .05});
function onShot(shot) {
  view.showShot(shot);
  const hm = shot.headshot ?? SETTINGS.headshotMultiplier, hitOnce = new Set();
  for (const p of shot.pellets) {
    const z = p.zombie; if (!z || !z.alive) continue;
    const killed = zombies.damage(z, shot.damage * (p.head ? hm : 1), p.head);
    if (killed) { stats.kills++; if (p.head) stats.headshots++; addPoints(p.head ? SETTINGS.pointsHeadshotKill : SETTINGS.pointsKill); hitOnce.add(z); }
    else if (!hitOnce.has(z)) { hitOnce.add(z); addPoints(SETTINGS.pointsHit); }
  }
}
function hurtPlayer() {
  if (over || god) return;
  player.health = Math.max(0, player.health - SETTINGS.zombieHit); sinceHurt = 0; hurtTimer = .5;
  if (player.health <= 0) gameOver();
}
function gameOver() {
  over = true; player.frozen = true; rounds.state = 'over';
  audio.stopLoop('music_kestrel_ambient_loop', 1.2); audio.play('music_game_over_sting');
  $('go-round').textContent = `You survived ${Math.max(0, rounds.round - 1)} round${rounds.round - 1 === 1 ? '' : 's'}`;
  $('go-stats').textContent = `Reached round ${rounds.round} • ${stats.kills} kills • ${stats.headshots} headshots • ${stats.earned} points earned`;
  $('gameover').hidden = false;
  document.exitPointerLock?.();
}
$('restart').addEventListener('click', () => location.reload());
function setRound(r, flash) {
  const el = $('round'); el.textContent = roman(r);
  if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
}
function roman(n) {
  if (n <= 0) return ''; if (n > 39) return String(n);
  return 'X'.repeat(Math.floor(n / 10)) + ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n % 10];
}
function startPerkHums() {
  for (const p of PERKS) if (!p.needsPower || interactions.power) audio.loopAt('perk:' + p.id, 'perk_machine_hum', p.at[0], (p.floor ? 3.8 : 0) + 1.2, -p.at[1], {ref: 1.2, rolloff: 2.2});
}
audio.onStart = () => {
  audio.loopAt('radio', 'radio_crackle_loop', SECRETS.radio.at[0], 1.1, -SECRETS.radio.at[1], {ref: 1.4, rolloff: 2});
  startPerkHums();
};

// ---- loading
let loaded = false, started = false;
const progress = {zombie: 0, audio: 0};
const showProgress = () => { if (!loaded) $('loading').textContent = `Loading zombies ${Math.round(progress.zombie * 100)}% • sounds ${Math.round(progress.audio * 100)}%`; };
showProgress();
Promise.all([
  loadZombie(p => { progress.zombie = p; showProgress(); }).then(asset => zombies.init(asset)),
  audio.load('assets/', p => { progress.audio = p; showProgress(); }),
]).then(() => { loaded = true; $('loading').textContent = NO_ZOMBIES ? 'Ready (zombies disabled)' : 'Ready'; })
  .catch(err => { console.error('asset load failed', err); $('loading').textContent = 'Failed to load assets: ' + err.message; });

let debugOn = DEBUG, tpIndex = 0, fps = 60, fpsAcc = 0, fpsFrames = 0;
$('debug').hidden = !debugOn;
function teleport(id) {
  const t = TELEPORTS.find(t => t.id === id) || TELEPORTS[0];
  player.teleport(t.at[0], t.at[1], t.floor, t.yaw);
  return t;
}
function debugKeys() {
  if (input.consume('KeyP')) addPoints(SETTINGS.debugPointsGrant);
  if (input.consume('BracketRight') || input.consume('BracketLeft')) {
    tpIndex = (tpIndex + 1) % TELEPORTS.length; const t = teleport(TELEPORTS[tpIndex].id); hooks.message('Teleport: ' + t.id.toUpperCase());
  }
  if (input.consume('KeyG')) view.map.spawnGroup.visible = !view.map.spawnGroup.visible;
  if (input.consume('KeyK')) interactions.setPower(!interactions.power);
  if (input.consume('KeyN')) { rounds.skip(); hooks.message('Debug: round skipped'); }
  if (input.consume('KeyJ')) { god = !god; hooks.message(god ? 'Debug: god mode ON' : 'Debug: god mode OFF'); }
  if (input.consume('F3') || input.consume('Backquote')) { debugOn = !debugOn; $('debug').hidden = !debugOn; }
}

let previous = performance.now(), accumulator = 0, lastArea = null, stepIndex = 0;
let paused = false;
function frame(now) {
  if (paused) { previous = now; view.draw(0); requestAnimationFrame(frame); return; }
  const dt = Math.max(0, Math.min((now - previous) / 1000, .1)); previous = now; accumulator += dt;
  const live = input.active && !over;
  while (accumulator >= SETTINGS.fixedStep) {
    if (live) {
      player.speedScale = weapons.config.move * (1 - weapons.adsT * .35);
      player.update(SETTINGS.fixedStep, input);
      zombies.pushPlayer(player);
      weapons.update(SETTINGS.fixedStep, input, player, onShot);
      debugKeys();
    }
    accumulator -= SETTINGS.fixedStep;
  }
  if (loaded && !started && input.active && !NO_ZOMBIES) { started = true; rounds.start(START_ROUND, TEST_MODE ? 1 : 3); setRound(START_ROUND - 1 || '', false); }
  if (loaded && (live || over)) { if (live) rounds.update(dt); zombies.update(dt); }
  barricades.update(dt);
  if (shadowDirty > 0 && (shadowDirty -= dt) <= 0) view.refreshShadows();
  // Health regen + hurt flash
  sinceHurt += dt; hurtTimer = Math.max(0, hurtTimer - dt);
  if (!over && sinceHurt > SETTINGS.regenDelay) player.health = Math.min(SETTINGS.maxHealth, player.health + SETTINGS.regenPerSecond * dt);
  $('hurt').style.opacity = Math.max(hurtTimer * 1.6, (1 - player.health / SETTINGS.maxHealth) * .55).toFixed(2);
  // Footsteps (slices of the 8-step recordings)
  const si = Math.floor(player.bob / 1.7);
  if (si !== stepIndex) { stepIndex = si; if (player.grounded && player.moving > .2 && live) {
    const metal = ['catwalk', 'loft'].includes(lastArea?.id); const k = (Math.random() * 7) | 0;
    audio.play(metal ? 'footsteps_metal_catwalk' : 'footsteps_concrete', {offset: k * .46, duration: .4, volume: .7, rate: .95 + Math.random() * .1});
  } }
  const pr = live ? interactions.update(dt, input) : null;
  const pEl = $('prompt');
  if (pr) { pEl.textContent = pr.text; pEl.className = 'show' + (pr.can ? '' : pr.info ? ' info' : ' locked'); $('holdbar').style.width = (interactions.hold / interactions.holdNeeded * 100) + '%'; }
  else { pEl.className = ''; pEl.textContent = ''; $('holdbar').style.width = '0%'; }
  if (msgTimer > 0 && (msgTimer -= dt) <= 0) $('message').className = '';
  const area = world.areaAt(player.x, player.z, player.feet);
  if (area && area !== lastArea) { $('zone').textContent = 'KESTREL FIELD // ' + area.name; lastArea = area; }
  $('points').textContent = String(player.points);
  view.updatePlayer(player); view.updateWeapon(weapons, input, dt, player, area); view.draw(dt);
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc > .5) {
    fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0;
    if (debugOn) { const i = view.renderer.info; $('debug').textContent = `${fps.toFixed(0)} fps | ${view.qualityName} | calls ${i.render.calls} | tris ${(i.render.triangles / 1000).toFixed(0)}k | x ${player.x.toFixed(1)} y ${(-player.z).toFixed(1)} h ${player.feet.toFixed(2)} | ${area?.id ?? '-'} | R${rounds.round} z ${zombies.living}/${rounds.remaining}${god ? ' | GOD' : ''}`; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test / tooling hook (used by the headless smoke test, harmless in normal play).
window.__kestrel = {
  player, world, view, interactions, input, weapons, teleport,
  give: id => weapons.give(id), TELEPORTS, nav, navMs, barricades, zombies, rounds, audio, stats,
  addPoints: n => { player.points += n; },
  setPower: on => interactions.setPower(on),
  look: (yaw, pitch = 0) => { player.yaw = yaw; player.pitch = pitch; },
  doors: () => DOORS.map(d => ({id: d.id, open: !!d.open})),
  skipRound: () => rounds.skip(),
  // Fast-forward game logic without rendering (headless tests run at a few fps).
  simulate(seconds, step = .05) {
    for (let t = 0; t < seconds && !over; t += step) { rounds.update(step); zombies.update(step); barricades.update(step); }
  },
  spawnZombie: (x, y, opts = {}) => zombies.spawn({x, y, health: opts.health ?? 100, speed: opts.speed ?? 1}),
  setGod: v => { god = v; },
  // Freeze the frame loop (still rendering) and advance weapons + viewmodel deterministically (screenshots).
  pause(v = true) { paused = v; },
  advance(seconds, step = 1 / 60) {
    const area = world.areaAt(player.x, player.z, player.feet);
    for (let t = 0; t < seconds - 1e-6; t += step) { weapons.update(step, input, player, onShot); view.updatePlayer(player); view.updateWeapon(weapons, input, step, player, area); }
  },
  hurt: n => { for (let i = 0; i < n; i++) hurtPlayer(); },
  get loaded() { return loaded; }, get over() { return over; },
  get fps() { return fps; },
  info: () => ({calls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles, geometries: view.renderer.info.memory.geometries, textures: view.renderer.info.memory.textures, programs: view.renderer.info.programs?.length}),
};
if (TEST_MODE) document.body.classList.add('test');
