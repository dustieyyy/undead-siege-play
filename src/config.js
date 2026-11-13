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
export const WEAPONS = {
  pistol: {name: 'M-K SERVICE PISTOL', short: 'PISTOL', damage: 34, interval: .26, magazine: 8, reserve: 64, reloadTime: 1.5, reload: 'mag', auto: false, pellets: 1,
    spread: .03, adsSpread: .01, headshot: 2.5, range: 80, cost: 0, adsFov: 62, adsTime: .16, move: 1, drawTime: .45,
    sound: {key: 'pistol_shot', rate: [.95, 1.05], volume: 1}},
  bolt: {name: 'KESTREL BOLT RIFLE', short: 'BOLT RIFLE', damage: 140, interval: .3, cycle: .85, magazine: 5, reserve: 50, reloadTime: 2.6, reload: 'clip', auto: false, pellets: 1,
    spread: .04, adsSpread: .002, headshot: 3, range: 120, cost: 500, adsFov: 50, adsTime: .3, move: .95, drawTime: .6,
    sound: {key: 'pistol_shot', rate: [.72, .78], volume: 1.15, layer: {key: 'pistol_shot', rate: .55, volume: .6, delay: .012}}},
  carbine: {name: 'M-2 SEMI CARBINE', short: 'CARBINE', damage: 70, interval: .17, magazine: 15, reserve: 120, reloadTime: 1.9, reload: 'mag', auto: false, pellets: 1,
    spread: .025, adsSpread: .006, headshot: 2.5, range: 100, cost: 600, adsFov: 56, adsTime: .24, move: .97, drawTime: .55,
    sound: {key: 'pistol_shot', rate: [.84, .9], volume: 1.05}},
  shotgun: {name: 'TRENCH PUMP SHOTGUN', short: 'SHOTGUN', damage: 26, interval: .25, cycle: .62, magazine: 6, reserve: 48, reloadTime: 0, reload: 'shells', reloadStart: .35, reloadShell: .45, reloadEnd: .45, auto: false, pellets: 8,
    spread: .09, adsSpread: .065, headshot: 1.6, range: 40, cost: 1000, adsFov: 62, adsTime: .24, move: .93, drawTime: .6,
    sound: {key: 'pistol_shot', rate: [.52, .58], volume: 1.25, layer: {key: 'pistol_shot', rate: .8, volume: .7, delay: .006}}},
  smg: {name: 'S-41 SUBMACHINE GUN', short: 'SMG', damage: 30, interval: .085, magazine: 32, reserve: 192, reloadTime: 2.2, reload: 'mag', auto: true, pellets: 1,
    spread: .045, adsSpread: .02, headshot: 2, range: 70, cost: 1200, adsFov: 60, adsTime: .2, move: 1, drawTime: .5, climb: .0035,
    sound: {key: 'pistol_shot', rate: [1.1, 1.2], volume: .85}},
  squad: {name: 'SQUAD AUTOMATIC RIFLE', short: 'SQUAD AUTO', damage: 55, interval: .11, magazine: 40, reserve: 240, reloadTime: 3.6, reload: 'mag', auto: true, pellets: 1,
    spread: .05, adsSpread: .022, headshot: 2, range: 110, cost: 1500, adsFov: 54, adsTime: .34, move: .85, drawTime: .8, climb: .005,
    sound: {key: 'pistol_shot', rate: [.8, .88], volume: 1.15, layer: {key: 'pistol_shot', rate: .6, volume: .45, delay: .01}}},
  marksman: {name: 'LONG-GLASS MARKSMAN RIFLE', short: 'MARKSMAN', damage: 190, interval: .3, cycle: 1.0, magazine: 5, reserve: 40, reloadTime: 3.0, reload: 'clip', auto: false, pellets: 1,
    spread: .06, adsSpread: 0, headshot: 4, range: 160, cost: 1500, adsFov: 20, adsTime: .34, move: .92, drawTime: .7, scope: true,
    sound: {key: 'pistol_shot', rate: [.66, .72], volume: 1.2, layer: {key: 'pistol_shot', rate: .5, volume: .6, delay: .014}}},
};
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
