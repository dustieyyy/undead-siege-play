export const SETTINGS = {
  walkSpeed: 3.5, sprintSpeed: 6, sprintSeconds: 3, staminaRegenPerSecond: .22,
  eyeHeight: 1.65, playerRadius: .36, mouseSensitivity: .0022, fixedStep: 1 / 60,
  gravity: 22, stepHeight: .5, interactRange: 2.3, holdToBuySeconds: .45,
  startPoints: 500, debugPointsGrant: 1000
};
export const WEAPONS = {
  pistol: {name: 'PISTOL', damage: 22, fireRateMs: 260, magazine: 8, reserve: 64, reloadMs: 1500,
    automatic: false, pellets: 1, spread: .03, cost: 0, range: 80}
};
// Quality presets. ?quality=low|medium|high (auto picks low on touch devices).
const params = new URLSearchParams(location.search);
const auto = matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
export const QUALITY_NAME = params.get('quality') || auto;
export const QUALITY = {
  low: {pixelRatio: 1, shadows: false, shadowSize: 1024, lights: 5, particles: 250, fogSheets: false, antialias: false},
  medium: {pixelRatio: 1.25, shadows: true, shadowSize: 1024, lights: 7, particles: 500, fogSheets: true, antialias: true},
  high: {pixelRatio: 1.5, shadows: true, shadowSize: 2048, lights: 9, particles: 900, fogSheets: true, antialias: true},
}[QUALITY_NAME] || null;
export const DEBUG = params.has('debug');
export const TEST_MODE = params.has('test');
