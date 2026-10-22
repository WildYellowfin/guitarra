// Web Audio metronome with a look-ahead scheduler, so clicks stay steady
// even when the main thread is busy.

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

export class Metronome {
  constructor({ bpm = 70, beatsPerBar = 4, onBeat = () => {} } = {}) {
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.onBeat = onBeat;
    this.ctx = null;
    this.timer = null;
    this.nextTime = 0;
    this.beat = 0;
  }

  get running() {
    return this.timer !== null;
  }

  setBpm(bpm) {
    this.bpm = Math.min(240, Math.max(30, Math.round(bpm)));
  }

  start() {
    if (this.running) return;
    this.ctx ??= new AudioContext();
    this.ctx.resume();
    this.beat = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  toggle() {
    this.running ? this.stop() : this.start();
  }

  schedule() {
    while (this.nextTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      const beat = this.beat;
      this.click(this.nextTime, beat === 0);
      const delay = Math.max(0, (this.nextTime - this.ctx.currentTime) * 1000);
      setTimeout(() => this.onBeat(beat), delay);
      this.nextTime += 60 / this.bpm;
      this.beat = (this.beat + 1) % this.beatsPerBar;
    }
  }

  click(time, accent) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1500 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  // A short two-note chime between steps.
  chime() {
    this.ctx ??= new AudioContext();
    const t = this.ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.4, t + i * 0.15 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.4);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.45);
    });
  }
}
