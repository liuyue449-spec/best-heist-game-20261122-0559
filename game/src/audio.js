// audio.js — all sound is synthesized with WebAudio, no audio files.
// One clear job: short bleeps for pickup, alarm, tools and the getaway.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  blip(freq, duration, type = 'sine', gain = 0.12, when = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  pickup() {
    this.blip(880, 0.09, 'sine', 0.1);
    this.blip(1318, 0.12, 'sine', 0.08, 0.07);
  }

  mainLoot() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.16, 'triangle', 0.11, i * 0.09));
  }

  alarmTick() {
    this.blip(220, 0.12, 'square', 0.05);
  }

  caught() {
    this.blip(196, 0.25, 'sawtooth', 0.12);
    this.blip(147, 0.35, 'sawtooth', 0.12, 0.15);
  }

  tool() {
    this.blip(440, 0.08, 'triangle', 0.09);
    this.blip(330, 0.12, 'triangle', 0.09, 0.06);
  }

  denied() {
    this.blip(140, 0.15, 'square', 0.08);
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.blip(f, 0.2, 'triangle', 0.11, i * 0.1));
  }

  busted() {
    [392, 311, 233, 175].forEach((f, i) => this.blip(f, 0.3, 'sawtooth', 0.1, i * 0.16));
  }
}
