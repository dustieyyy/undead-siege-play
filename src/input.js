import {TEST_MODE} from './config.js';
export class Input {
  constructor(element, overlay, onLook) {
    this.keys = new Set(); this.justPressed = new Set(); this.locked = false; this.forced = TEST_MODE;
    this.shooting = false; this.aiming = false; this.firePressed = false; this.touchMove = null; this.touchSprint = false; this.touchUse = false;
    this.onLook = onLook; this.swapPressed = false;
    const release = () => { this.keys.clear(); this.justPressed.clear(); this.shooting = false; this.aiming = false; this.firePressed = false; };
    window.addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'ArrowDown', 'F3', 'Backquote'].includes(e.code)) e.preventDefault(); if (!this.keys.has(e.code)) this.justPressed.add(e.code); this.keys.add(e.code); });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { if (!this.forced) release(); });
    const lock = () => { if (this.touchDevice) { this.setTouchActive(true); return; } element.requestPointerLock?.(); };
    overlay.addEventListener('click', lock);
    overlay.addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'Space') lock(); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === element; overlay.classList.toggle('hidden', this.active); if (!this.locked && !this.forced) release(); });
    element.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousedown', e => {
      if (!this.active || this.touchDevice) return;
      if (e.button === 0) { if (!this.shooting) this.firePressed = true; this.shooting = true; }
      if (e.button === 2) this.aiming = true;
    });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.shooting = false; if (e.button === 2) this.aiming = false; });
    window.addEventListener('wheel', e => { if (this.active && Math.abs(e.deltaY) > 2) this.swapPressed = true; }, {passive: true});
    document.addEventListener('mousemove', e => { if (this.locked) onLook(e.movementX, e.movementY); });
    this.touchDevice = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;
    if (this.touchDevice) this.setupTouch();
    if (this.forced) overlay.classList.add('hidden');
  }
  get active() { return this.locked || this.forced; }
  setTouchActive(v) { this.forced = v; document.getElementById('overlay').classList.toggle('hidden', v); document.getElementById('touch').classList.toggle('on', v); }
  setupTouch() {
    // Minimal touch scheme: left half = move stick, right half = look; buttons for fire/aim/reload/use.
    const ui = document.getElementById('touch'); ui.hidden = false;
    let moveId = null, lookId = null, mx = 0, my = 0, lx = 0, ly = 0;
    const stick = document.getElementById('stick');
    window.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (t.target.closest('.tbtn')) continue;
        if (t.clientX < innerWidth / 2 && moveId === null) { moveId = t.identifier; mx = t.clientX; my = t.clientY; stick.style.left = mx + 'px'; stick.style.top = my + 'px'; stick.classList.add('on'); }
        else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
    }, {passive: true});
    window.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === moveId) { const dx = (t.clientX - mx) / 55, dy = (t.clientY - my) / 55; const l = Math.hypot(dx, dy); this.touchMove = {x: l > 1 ? dx / l : dx, y: l > 1 ? dy / l : dy}; this.touchSprint = l > 1.6 && dy < 0; }
        if (t.identifier === lookId) { this.onLook((t.clientX - lx) * 2.2, (t.clientY - ly) * 2.2); lx = t.clientX; ly = t.clientY; }
      }
    }, {passive: true});
    const end = e => { for (const t of e.changedTouches) { if (t.identifier === moveId) { moveId = null; this.touchMove = null; this.touchSprint = false; stick.classList.remove('on'); } if (t.identifier === lookId) lookId = null; } };
    window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
    const btn = (id, down, up) => { const b = document.getElementById(id); b.addEventListener('touchstart', e => { e.preventDefault(); down(); }); b.addEventListener('touchend', e => { e.preventDefault(); up?.(); }); };
    btn('t-fire', () => { this.firePressed = true; this.shooting = true; }, () => { this.shooting = false; });
    btn('t-aim', () => { this.aiming = !this.aiming; });
    btn('t-reload', () => this.justPressed.add('KeyR'));
    btn('t-use', () => { this.touchUse = true; }, () => { this.touchUse = false; });
    btn('t-swap', () => { this.swapPressed = true; });
  }
  down(code) { return this.active && (this.keys.has(code) || (code === 'KeyF' && this.touchUse)); }
  consume(code) { const value = this.active && this.justPressed.has(code); this.justPressed.delete(code); return value; }
  consumeSwap() { const v = this.active && this.swapPressed; this.swapPressed = false; return v; }
  consumeFire() { const value = this.active && this.firePressed; this.firePressed = false; return value; }
}
