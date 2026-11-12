export const SETTINGS = {
  walkSpeed: 3.5, sprintSpeed: 6, sprintSeconds: 3, staminaRegenPerSecond: .22,
  eyeHeight: 1.65, playerRadius: .36, mouseSensitivity: .0022, fixedStep: 1 / 60,
  gravity: 22, stepHeight: .5, interactRange: 2.3, holdToBuySeconds: .45,
  startPoints: 500, debugPointsGrant: 1000,
  maxHealth: 100, zombieHit: 40, regenDelay: 3.5, regenPerSecond: 30,
  pointsHit: 10, pointsKill: 60, pointsHeadshotKill: 100, pointsRebuild: 10, rebuildCapPerRound: 500,
  headshotMultiplier: 2.5, rebuildHoldSeconds: .5
};
export const WEAPONS = {
  pistol: {name: 'PISTOL', damage: 34, fireRateMs: 260, magazine: 8, reserve: 64, reloadMs: 1500,
    automatic: false, pellets: 1, spread: .03, cost: 0, range: 80}
};
// Quality presets. ?quality=low|medium|high (auto picks low on touch devices).
const params = new URLSearchParams(location.search);
const auto = matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
export const QUALITY_NAME = params.get('quality') || auto;
const PRESETS = {
  low: {pixelRatio: 1, shadows: false, shadowSize: 1024, lights: 5, particles: 250, fogSheets: false, antialias: false, zombieCap: 14, zombieLod: 9},
  medium: {pixelRatio: 1.25, shadows: true, shadowSize: 1024, lights: 7, particles: 500, fogSheets: true, antialias: true, zombieCap: 20, zombieLod: 13},
  high: {pixelRatio: 1.5, shadows: true, shadowSize: 2048, lights: 9, particles: 900, fogSheets: true, antialias: true, zombieCap: 24, zombieLod: 16},
};
export const QUALITY = PRESETS[QUALITY_NAME] || PRESETS.high;
export const DEBUG = params.has('debug');
export const TEST_MODE = params.has('test');
export const NO_ZOMBIES = params.has('nozombies');
export const START_ROUND = Math.max(1, parseInt(params.get('round') || '1', 10) || 1);
export const GOD_MODE = params.has('god');
