// Microphone input and metronome output on one AudioContext, so the mic's
// timestamps and the click schedule share a clock.

import { FFT_SIZE } from "./analysis.js";

export class Audio {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.samples = new Float32Array(FFT_SIZE);
    this.clicks = []; // scheduled click nodes, so a pause can silence them
    this.noise = null;
  }

  get now() {
    return this.ctx?.currentTime ?? 0;
  }

  get sampleRate() {
    return this.ctx.sampleRate;
  }

  // Must be called from a click or key press (browsers require a gesture for audio).
  async start() {
    this.ctx ??= new AudioContext({ latencyHint: "interactive" });
    await this.ctx.resume();
    if (this.analyser) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      // raw signal: the browser's voice-call processing mangles guitar notes
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const source = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0;
    source.connect(this.analyser);
    this.stream = stream;
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.analyser = null;
  }

  // The most recent FFT_SIZE samples from the mic.
  read() {
    this.analyser.getFloatTimeDomainData(this.samples);
    return this.samples;
  }

  // A short woodblock-like click: band-passed noise. Broadband, so it doesn't
  // look like a guitar note to the detector if the mic picks it up.
  click(time, accent) {
    if (!this.noise) {
      const len = Math.floor(this.ctx.sampleRate * 0.03);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = accent ? 2600 : 1900;
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.value = accent ? 1.4 : 0.9;
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(time);
    this.clicks.push({ src, time });
    this.clicks = this.clicks.filter((c) => c.time > this.now - 1);
  }

  silenceFrom(time) {
    this.clicks.filter((c) => c.time > time).forEach((c) => c.src.stop());
    this.clicks = this.clicks.filter((c) => c.time <= time);
  }
}
