import {SETTINGS, DEBUG, TEST_MODE} from './config.js';
import {TELEPORTS, DOORS} from './map/kestrel.js';
import {World} from './world.js';
import {Player} from './player.js';
import {Input} from './input.js';
import {Renderer} from './render.js';
import {Weapons} from './weapons.js';
import {Interactions} from './interact.js';

const $ = id => document.getElementById(id);
const world = new World();
const view = new Renderer(world), player = new Player(world), weapons = new Weapons(world);
const input = new Input(view.canvas, $('overlay'), (dx, dy) => player.look(dx, dy));
let msgTimer = 0;
const hooks = {
  message(text, kind = '') { const m = $('message'); m.textContent = text; m.className = 'show ' + kind; msgTimer = 2.4; },
  points(delta) { const f = $('points-delta'); f.textContent = (delta > 0 ? '+' : '') + delta; f.className = delta > 0 ? 'up' : 'down'; void f.offsetWidth; f.classList.add('anim'); },
  changed() { view.refreshShadows(); $('power').classList.toggle('on', interactions.power); $('power').textContent = interactions.power ? 'POWER ON' : 'POWER OFF'; },
};
const interactions = new Interactions(world, view.map, player, hooks);
let debugOn = DEBUG, tpIndex = 0, fps = 60, fpsAcc = 0, fpsFrames = 0;
$('debug').hidden = !debugOn;

function teleport(id) {
  const t = TELEPORTS.find(t => t.id === id) || TELEPORTS[0];
  player.teleport(t.at[0], t.at[1], t.floor, t.yaw);
  return t;
}
function debugKeys() {
  if (input.consume('KeyP')) { player.points += SETTINGS.debugPointsGrant; hooks.points(SETTINGS.debugPointsGrant); }
  if (input.consume('BracketRight') || input.consume('BracketLeft')) {
    tpIndex = (tpIndex + 1) % TELEPORTS.length; const t = teleport(TELEPORTS[tpIndex].id); hooks.message('Teleport: ' + t.id.toUpperCase());
  }
  if (input.consume('KeyG')) view.map.spawnGroup.visible = !view.map.spawnGroup.visible;
  if (input.consume('KeyK')) interactions.setPower(!interactions.power);
  if (input.consume('F3') || input.consume('Backquote')) { debugOn = !debugOn; $('debug').hidden = !debugOn; }
}

let previous = performance.now(), accumulator = 0, lastArea = null;
function frame(now) {
  const dt = Math.max(0, Math.min((now - previous) / 1000, .1)); previous = now; accumulator += dt;
  while (accumulator >= SETTINGS.fixedStep) {
    if (input.active) {
      player.update(SETTINGS.fixedStep, input);
      weapons.update(SETTINGS.fixedStep, input, player, shot => view.showShot(shot));
      debugKeys();
    }
    accumulator -= SETTINGS.fixedStep;
  }
  const pr = interactions.update(dt, input);
  const pEl = $('prompt');
  if (pr) { pEl.textContent = pr.text; pEl.className = 'show' + (pr.can ? '' : pr.info ? ' info' : ' locked'); $('holdbar').style.width = (interactions.hold / SETTINGS.holdToBuySeconds * 100) + '%'; }
  else { pEl.className = ''; pEl.textContent = ''; $('holdbar').style.width = '0%'; }
  if (msgTimer > 0 && (msgTimer -= dt) <= 0) $('message').className = '';
  const area = world.areaAt(player.x, player.z, player.feet);
  if (area && area !== lastArea) { $('zone').textContent = 'KESTREL FIELD // ' + area.name; lastArea = area; }
  $('points').textContent = String(player.points);
  view.updatePlayer(player); view.updateWeapon(weapons, input, dt, player); view.draw(dt);
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc > .5) {
    fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0;
    if (debugOn) { const i = view.renderer.info; $('debug').textContent = `${fps.toFixed(0)} fps | ${view.qualityName} | calls ${i.render.calls} | tris ${(i.render.triangles / 1000).toFixed(0)}k | x ${player.x.toFixed(1)} y ${(-player.z).toFixed(1)} h ${player.feet.toFixed(2)} | ${area?.id ?? '-'}`; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test / tooling hook (used by the headless smoke test, harmless in normal play).
window.__kestrel = {
  player, world, view, interactions, input, teleport, TELEPORTS,
  addPoints: n => { player.points += n; },
  setPower: on => interactions.setPower(on),
  look: (yaw, pitch = 0) => { player.yaw = yaw; player.pitch = pitch; },
  doors: () => DOORS.map(d => ({id: d.id, open: !!d.open})),
  get fps() { return fps; },
  info: () => ({calls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles, geometries: view.renderer.info.memory.geometries, textures: view.renderer.info.memory.textures, programs: view.renderer.info.programs?.length}),
};
if (TEST_MODE) document.body.classList.add('test');
