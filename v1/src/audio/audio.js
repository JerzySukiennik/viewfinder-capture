// audio.js — fully procedural WebAudio: synth SFX + dreamy ambient pad. No files,
// no fetches. Context resumes on first user gesture (Safari requirement).

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._ambient = null;
    this._stepFlip = false;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  unlock() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this._startAmbient();
  }

  _now() { return this.ctx.currentTime; }

  _env(gainNode, t, attack, peak, decay, sustainEnd = 0.0001) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(sustainEnd, t + attack + decay);
  }

  _osc(type, freq, t, dur, peak, dest = this.master, detune = 0) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    this._env(g, t, 0.005, peak, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.1);
    return o;
  }

  _noise(t, dur, peak, filterFreq = 2000, type = 'lowpass', q = 1) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    f.Q.value = q;
    const g = this.ctx.createGain();
    this._env(g, t, 0.004, peak, dur * 0.9);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
    return f;
  }

  shutter() {
    if (!this.ctx) return;
    const t = this._now();
    this._noise(t, 0.09, 0.5, 5500, 'highpass');
    this._osc('square', 2400, t, 0.03, 0.12);
    this._osc('square', 1100, t + 0.05, 0.025, 0.1);
  }

  place() {
    if (!this.ctx) return;
    const t = this._now();
    this._noise(t, 0.16, 0.3, 500);
    this._osc('sine', 90, t, 0.22, 0.4);
    this._osc('triangle', 523.25, t + 0.03, 0.5, 0.09);
    this._osc('triangle', 659.25, t + 0.09, 0.55, 0.07);
  }

  carve() {
    if (!this.ctx) return;
    const t = this._now();
    const f = this._noise(t, 0.5, 0.4, 2400);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.45);
    this._osc('sine', 70, t, 0.4, 0.3);
  }

  error() {
    if (!this.ctx) return;
    const t = this._now();
    this._osc('square', 160, t, 0.12, 0.12);
    this._osc('square', 110, t + 0.1, 0.16, 0.12);
  }

  pickup() {
    if (!this.ctx) return;
    const t = this._now();
    this._osc('triangle', 440, t, 0.1, 0.16);
    this._osc('triangle', 660, t + 0.07, 0.14, 0.16);
  }

  deposit() {
    if (!this.ctx) return;
    const t = this._now();
    this._osc('triangle', 660, t, 0.1, 0.15);
    this._osc('triangle', 440, t + 0.08, 0.16, 0.15);
    this._osc('sine', 220, t + 0.16, 0.4, 0.2);
  }

  powerOn() {
    if (!this.ctx) return;
    const t = this._now();
    [261.63, 329.63, 392.0, 523.25].forEach((f, i) =>
      this._osc('sine', f, t + i * 0.09, 0.9, 0.12));
    this._noise(t, 0.7, 0.06, 900);
  }

  complete() {
    if (!this.ctx) return;
    const t = this._now();
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this._osc('triangle', f, t + i * 0.12, 1.1, 0.1));
  }

  undo() {
    if (!this.ctx) return;
    const t = this._now();
    const f = this._noise(t, 0.3, 0.25, 300);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.28);
  }

  footstep() {
    if (!this.ctx) return;
    const t = this._now();
    this._stepFlip = !this._stepFlip;
    this._noise(t, 0.07, 0.1, this._stepFlip ? 700 : 580);
  }

  jump() {
    if (!this.ctx) return;
    this._noise(this._now(), 0.1, 0.08, 1000, 'bandpass');
  }

  land() {
    if (!this.ctx) return;
    const t = this._now();
    this._noise(t, 0.12, 0.16, 420);
  }

  uiClick() {
    if (!this.ctx) return;
    this._osc('sine', 880, this._now(), 0.06, 0.08);
  }

  _startAmbient() {
    const t = this._now();
    const bus = this.ctx.createGain();
    bus.gain.value = 0.0;
    bus.gain.linearRampToValueAtTime(0.055, t + 4);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 620;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lpf.frequency);
    lfo.start();

    const delay = this.ctx.createDelay(1.2);
    delay.delayTime.value = 0.62;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.38;
    delay.connect(fb).connect(delay);

    // slow dreamy chord: A2, E3, C#4-ish with gentle detune drift
    const freqs = [110, 164.81, 220, 277.18];
    for (const [i, f] of freqs.entries()) {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const g = this.ctx.createGain();
      g.gain.value = 0.22 - i * 0.03;
      const drift = this.ctx.createOscillator();
      drift.frequency.value = 0.03 + i * 0.013;
      const driftGain = this.ctx.createGain();
      driftGain.gain.value = 2.6;
      drift.connect(driftGain).connect(o.detune);
      drift.start();
      o.connect(g).connect(lpf);
      o.start();
    }

    lpf.connect(bus);
    lpf.connect(delay);
    delay.connect(bus);
    bus.connect(this.master);
    this._ambient = bus;
  }
}
