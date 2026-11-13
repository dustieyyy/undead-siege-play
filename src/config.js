export const SETTINGS = {
  walkSpeed: 3.5, sprintSpeed: 6, sprintSeconds: 3, staminaRegenPerSecond: .22,
  eyeHeight: 1.65, playerRadius: .36, mouseSensitivity: .0022, fixedStep: 1 / 60,
  gravity: 22, stepHeight: .5, interactRange: 2.3, holdToBuySeconds: .45,
  startPoints: 500, debugPointsGrant: 1000,
  maxHealth: 100, zombieHit: 40, regenDelay: 3.5, regenPerSecond: 30,
  pointsHit: 10, pointsKill: 60, pointsHeadshotKill: 100, pointsRebuild: 10, rebuildCapPerRound: 500,
  headshotMultiplier: 2.5, rebuildHoldSeconds: .5
};
// Weapon stats. Times in seconds. spread = cone half-angle-ish (rad) at hip / fully aimed.
// reload: 'mag' (whole reload), 'shells' (start + per shell + end, interruptible), 'clip' (bolt rifles).
// cycle: bolt/pump action after each shot (also gates firing). cost = wall-buy price, ammo = half.
// WWII-era arsenal. Stats are game-balanced but keep real relative character (damage, rate
// of fire, capacity, reload, handling). `crate: true` = Supply Crate only (no wall-buy).
// Shots reuse the CC0 pistol sample pitched per family (+ a low layer for rifles/MGs).
const SND = {
  pistol: r => ({key: 'pistol_shot', rate: r, volume: 1}),
  rifle: r => ({key: 'pistol_shot', rate: r, volume: 1.15, layer: {key: 'pistol_shot', rate: r[0] * .74, volume: .6, delay: .012}}),
  smg: r => ({key: 'pistol_shot', rate: r, volume: .85}),
  mg: r => ({key: 'pistol_shot', rate: r, volume: 1.1, layer: {key: 'pistol_shot', rate: r[0] * .72, volume: .45, delay: .01}}),
  shotgun: r => ({key: 'pistol_shot', rate: r, volume: 1.25, layer: {key: 'pistol_shot', rate: .8, volume: .7, delay: .006}}),
};
const FAM = {
  pistol: {reload: 'mag', auto: false, pellets: 1, spread: .03, adsSpread: .01, headshot: 2.5, range: 80, adsFov: 62, adsTime: .16, move: 1, drawTime: .45},
  bolt: {reload: 'clip', auto: false, pellets: 1, interval: .3, spread: .04, adsSpread: .002, headshot: 3, range: 130, adsFov: 50, adsTime: .3, move: .95, drawTime: .6},
  semi: {reload: 'mag', auto: false, pellets: 1, spread: .03, adsSpread: .005, headshot: 2.6, range: 120, adsFov: 54, adsTime: .26, move: .95, drawTime: .6},
  smg: {reload: 'mag', auto: true, pellets: 1, spread: .045, adsSpread: .02, headshot: 2, range: 70, adsFov: 60, adsTime: .2, move: 1, drawTime: .5, climb: .0035},
  assault: {reload: 'mag', auto: true, pellets: 1, spread: .045, adsSpread: .014, headshot: 2.2, range: 100, adsFov: 56, adsTime: .26, move: .95, drawTime: .6, climb: .0042},
  mg: {reload: 'mag', auto: true, pellets: 1, spread: .055, adsSpread: .022, headshot: 2, range: 110, adsFov: 54, adsTime: .36, move: .84, drawTime: .85, climb: .005},
  shotgun: {reload: 'shells', auto: false, spread: .09, adsSpread: .065, headshot: 1.6, range: 40, adsFov: 62, adsTime: .24, move: .93, drawTime: .6},
};
const G = (fam, name, short, o) => ({...FAM[fam], family: fam, name, short, reserve: o.magazine * 8, cost: 0, ...o});
export const WEAPONS = {
  // pistols
  m1911: G('pistol', 'M1911', 'M1911', {damage: 40, interval: .2, magazine: 7, reserve: 56, reloadTime: 1.6, sound: SND.pistol([.95, 1.05])}),
  nambu: G('pistol', 'TYPE 14 NAMBU', 'NAMBU', {damage: 30, interval: .2, magazine: 8, reloadTime: 1.7, crate: true, sound: SND.pistol([1.1, 1.18])}),
  p38: G('pistol', 'WALTHER P38', 'P38', {damage: 36, interval: .18, magazine: 8, reloadTime: 1.5, cost: 400, sound: SND.pistol([1.0, 1.08])}),
  tt33: G('pistol', 'TOKAREV TT-33', 'TT-33', {damage: 38, interval: .17, magazine: 8, reloadTime: 1.5, crate: true, sound: SND.pistol([1.05, 1.12])}),
  magnum: G('pistol', '.357 MAGNUM', '.357', {damage: 110, interval: .35, magazine: 6, reserve: 36, reloadTime: 2.8, reload: 'revolver', headshot: 2.8, crate: true, spread: .035, sound: SND.rifle([.8, .86])}),
  // bolt-action rifles
  springfield: G('bolt', 'SPRINGFIELD M1903', 'SPRINGFIELD', {damage: 150, cycle: .9, magazine: 5, reserve: 50, reloadTime: 2.7, crate: true, sound: SND.rifle([.72, .78])}),
  arisaka: G('bolt', 'ARISAKA TYPE 99', 'ARISAKA', {damage: 145, cycle: .9, magazine: 5, reserve: 50, reloadTime: 2.7, crate: true, sound: SND.rifle([.76, .82])}),
  mosin: G('bolt', 'MOSIN-NAGANT', 'MOSIN', {damage: 150, cycle: 1.0, magazine: 5, reserve: 50, reloadTime: 2.9, cost: 500, sound: SND.rifle([.7, .75])}),
  kar98k: G('bolt', 'KAR98K', 'KAR98K', {damage: 150, cycle: .85, magazine: 5, reserve: 50, reloadTime: 2.6, cost: 500, sound: SND.rifle([.73, .79])}),
  ptrs41: G('bolt', 'PTRS-41', 'PTRS-41', {damage: 400, interval: .5, magazine: 5, reserve: 30, reloadTime: 3.6, headshot: 3, range: 180, move: .8, adsTime: .45, drawTime: 1, crate: true, sound: SND.mg([.5, .54])}),
  // semi-auto rifles
  svt40: G('semi', 'SVT-40', 'SVT-40', {damage: 90, interval: .16, magazine: 10, reloadTime: 2.2, crate: true, sound: SND.rifle([.78, .84])}),
  g43: G('semi', 'GEWEHR 43', 'G43', {damage: 95, interval: .17, magazine: 10, reloadTime: 2.3, cost: 1200, sound: SND.rifle([.77, .83])}),
  garand: G('semi', 'M1 GARAND', 'GARAND', {damage: 100, interval: .18, magazine: 8, reserve: 96, reloadTime: 2.0, reload: 'enbloc', cost: 1400, sound: SND.rifle([.76, .82])}),
  m1a1: G('semi', 'M1A1 CARBINE', 'M1A1', {damage: 60, interval: .13, magazine: 15, reserve: 150, reloadTime: 1.8, cost: 600, move: .98, sound: SND.smg([.86, .92])}),
  // assault / automatic rifles
  stg44: G('assault', 'STG-44', 'STG-44', {damage: 45, interval: .1, magazine: 30, reloadTime: 2.4, cost: 1600, sound: SND.mg([.9, .96])}),
  fg42: G('assault', 'FG42', 'FG42', {damage: 55, interval: .08, magazine: 20, reserve: 200, reloadTime: 2.6, crate: true, sound: SND.mg([.82, .88])}),
  // submachine guns
  thompson: G('smg', 'THOMPSON', 'THOMPSON', {damage: 32, interval: .08, magazine: 30, reloadTime: 2.4, cost: 1200, move: .98, sound: SND.smg([.98, 1.06])}),
  mp40: G('smg', 'MP40', 'MP40', {damage: 30, interval: .1, magazine: 32, reloadTime: 2.3, cost: 1000, climb: .003, sound: SND.smg([1.1, 1.18])}),
  type100: G('smg', 'TYPE 100', 'TYPE 100', {damage: 28, interval: .075, magazine: 30, reloadTime: 2.3, crate: true, sound: SND.smg([1.14, 1.22])}),
  ppsh: G('smg', 'PPSH-41', 'PPSH-41', {damage: 26, interval: .06, magazine: 71, reserve: 284, reloadTime: 3.3, crate: true, spread: .05, sound: SND.smg([1.18, 1.26])}),
  // shotguns
  trench: G('shotgun', 'M1897 TRENCH GUN', 'TRENCH GUN', {damage: 26, pellets: 8, interval: .25, cycle: .62, magazine: 6, reserve: 48, reloadTime: 0, reloadStart: .35, reloadShell: .45, reloadEnd: .45, cost: 1500, sound: SND.shotgun([.52, .58])}),
  doublebarrel: G('shotgun', 'DOUBLE-BARRELED SHOTGUN', 'DOUBLE BARREL', {damage: 30, pellets: 8, interval: .2, magazine: 2, reserve: 40, reload: 'break', reloadTime: 2.2, spread: .1, adsSpread: .075, cost: 1200, sound: SND.shotgun([.48, .54])}),
  // machine guns
  type99: G('mg', 'TYPE 99 LMG', 'TYPE 99', {damage: 60, interval: .11, magazine: 30, reloadTime: 3.0, crate: true, sound: SND.mg([.82, .88])}),
  bar: G('mg', 'BROWNING AUTOMATIC RIFLE', 'BAR', {damage: 60, interval: .12, magazine: 20, reserve: 200, reloadTime: 2.8, cost: 1800, move: .87, sound: SND.mg([.8, .86])}),
  dp28: G('mg', 'DP-28', 'DP-28', {damage: 55, interval: .11, magazine: 47, reserve: 235, reloadTime: 3.8, crate: true, sound: SND.mg([.8, .85])}),
  mg42: G('mg', 'MG42', 'MG42', {damage: 50, interval: .05, magazine: 100, reserve: 400, reloadTime: 5.0, reload: 'belt', move: .8, spread: .06, crate: true, climb: .0045, sound: SND.mg([.96, 1.02])}),
  m1919: G('mg', 'M1919 BROWNING', 'M1919', {damage: 55, interval: .1, magazine: 100, reserve: 400, reloadTime: 5.2, reload: 'belt', move: .78, crate: true, sound: SND.mg([.78, .84])}),
};
export const STARTING_WEAPON = 'm1911';
// Quality presets. ?quality=low|medium|high (auto picks low on touch devices).
const params = new URLSearchParams(location.search);
const auto = matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
export const QUALITY_NAME = params.get('quality') || auto;
const PRESETS = {
  low: {pixelRatio: 1, lowEnv: true, shadows: false, shadowSize: 1024, lights: 5, particles: 250, fogSheets: false, antialias: false, zombieCap: 14, zombieLod: 9},
  medium: {pixelRatio: 1.25, shadows: true, shadowSize: 1024, lights: 7, particles: 500, fogSheets: true, antialias: true, zombieCap: 20, zombieLod: 13},
  high: {pixelRatio: 1.5, shadows: true, shadowSize: 2048, lights: 9, particles: 900, fogSheets: true, antialias: true, zombieCap: 24, zombieLod: 16},
};
export const QUALITY = PRESETS[QUALITY_NAME] || PRESETS.high;
export const DEBUG = params.has('debug');
export const TEST_MODE = params.has('test');
export const NO_ZOMBIES = params.has('nozombies');
export const START_ROUND = Math.max(1, parseInt(params.get('round') || '1', 10) || 1);
export const GOD_MODE = params.has('god');
