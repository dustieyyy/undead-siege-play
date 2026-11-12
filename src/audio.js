import * as THREE from 'three';

// Sound manager for the ElevenLabs pack in assets/audio (see manifest.json).
// Buffers are fetched + decoded up front; the AudioContext is resumed on the
// first user gesture (mobile autoplay rules), then loops start.
export class AudioManager {
  constructor(camera, scene) {
    this.listener = new THREE.AudioListener(); camera.add(this.listener);
    this.scene = scene; this.buffers = {}; this.meta = {}; this.loops = {}; this.ready = false; this.started = false;
    this.pool = []; this.poolIndex = 0; this.flat = []; this.flatIndex = 0; this.lastPlay = {};
    this.master = 1; this.muted = false;
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'click']) window.addEventListener(ev, unlock, {passive: true});
  }
  async load(base = 'assets/', onProgress = () => {}) {
    const manifest = await (await fetch(base + 'audio/manifest.json')).json();
    const loader = new THREE.AudioLoader(); let done = 0;
    await Promise.all(manifest.sounds.map(async s => {
      this.meta[s.name] = s;
      try { this.buffers[s.name] = await loader.loadAsync(base + s.file); }
      catch (e) { console.warn('audio failed', s.file, e); }
      onProgress(++done / manifest.sounds.length);
    }));
    for (let i = 0; i < 14; i++) { const a = new THREE.PositionalAudio(this.listener); a.setRefDistance(3); a.setRolloffFactor(1.4); a.setMaxDistance(60); a.setDistanceModel('inverse'); const o = new THREE.Object3D(); o.add(a); this.scene.add(o); this.pool.push({a, o, until: 0}); }
    for (let i = 0; i < 8; i++) this.flat.push({a: new THREE.Audio(this.listener), until: 0});
    this.ready = true; this.onReady?.();
    if (this.listener.context.state === 'running') this.startAmbience();
  }
  unlock() {
    const ctx = this.listener.context;
    if (ctx.state !== 'running') ctx.resume().then(() => this.startAmbience()).catch(() => {});
    else this.startAmbience();
  }
  get running() { return this.listener.context.state === 'running'; }
  startAmbience() {
    if (this.started || !this.ready || !this.running) return;
    this.started = true;
    this.loop('ambient_wind_night', .8); this.loop('music_kestrel_ambient_loop', .75);
    this.onStart?.();
  }
  vol(name, scale = 1) { return (this.meta[name]?.volume ?? .8) * scale * this.master; }
  // Non-positional one-shot. Optional slice [offset, duration] for multi-hit files.
  play(name, {volume = 1, rate = 1, offset = 0, duration, cooldown = 0} = {}) {
    const buf = this.buffers[name]; if (!buf || !this.running) return null;
    const now = performance.now(); if (cooldown && now - (this.lastPlay[name] || 0) < cooldown * 1000) return null; this.lastPlay[name] = now;
    const slot = this.flat.reduce((a, b) => (b.until < a.until ? b : a));
    const a = slot.a; if (a.isPlaying) a.stop();
    a.setBuffer(buf); a.setVolume(this.vol(name, volume)); a.setPlaybackRate(rate); a.offset = offset; a.duration = duration;
    a.setLoop(false); a.play(); slot.until = now + ((duration ?? buf.duration - offset) / rate) * 1000; return a;
  }
  // Positional one-shot at a world point (x, y, z).
  at(name, x, y, z, {volume = 1, rate = 1, ref = 3, cooldown = 0, offset = 0, duration} = {}) {
    const buf = this.buffers[name]; if (!buf || !this.running) return null;
    const now = performance.now(); if (cooldown && now - (this.lastPlay[name] || 0) < cooldown * 1000) return null; this.lastPlay[name] = now;
    const slot = this.pool.reduce((a, b) => (b.until < a.until ? b : a));
    const a = slot.a; if (a.isPlaying) a.stop();
    slot.o.position.set(x, y, z); slot.o.updateMatrixWorld();
    a.setBuffer(buf); a.setRefDistance(ref); a.setVolume(this.vol(name, volume)); a.setPlaybackRate(rate); a.offset = offset; a.duration = duration;
    a.setLoop(false); a.play(); slot.until = now + ((duration ?? buf.duration - offset) / rate) * 1000; return a;
  }
  loop(name, volume = 1) {
    if (this.loops[name] || !this.buffers[name] || !this.running) return this.loops[name];
    const a = new THREE.Audio(this.listener); a.setBuffer(this.buffers[name]); a.setLoop(true); a.setVolume(this.vol(name, volume)); a.play();
    this.loops[name] = a; return a;
  }
  loopAt(key, name, x, y, z, {volume = 1, ref = 1.5, rolloff = 2} = {}) {
    if (this.loops[key] || !this.buffers[name] || !this.running) return this.loops[key];
    const a = new THREE.PositionalAudio(this.listener); a.setBuffer(this.buffers[name]); a.setLoop(true); a.setRefDistance(ref); a.setRolloffFactor(rolloff); a.setMaxDistance(30);
    a.setVolume(this.vol(name, volume)); const o = new THREE.Object3D(); o.position.set(x, y, z); o.add(a); this.scene.add(o); o.updateMatrixWorld();
    a.offset = Math.random() * this.buffers[name].duration * .8; a.play(); this.loops[key] = a; return a;
  }
  stopLoop(key, fade = .8) {
    const a = this.loops[key]; if (!a) return; delete this.loops[key];
    const g = a.gain.gain, t = this.listener.context.currentTime;
    g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { if (a.isPlaying) a.stop(); }, fade * 1000 + 50);
  }
}
