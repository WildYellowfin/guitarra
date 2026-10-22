// Pure audio analysis, no browser APIs, so it runs (and is tested) in Node too.
//
// The idea: to know which note was just plucked while other strings are still
// ringing, look at what *grew* in the spectrum. Each frame we measure the energy
// at every semitone, compare it with the last few frames, and score each
// candidate note by how much new energy appeared at its harmonics.

import { freqToMidi } from "../music.js";

export const MIDI_LO = 36; // C2, below the low E
export const MIDI_HI = 112; // high enough to hold upper harmonics
export const FFT_SIZE = 8192;

// Harmonic offsets in semitones (1st..8th harmonic) and how much each counts.
// Fairly flat weights, so a note with a weak fundamental (common on a guitar's
// low strings through a laptop mic) still beats its own upper harmonics.
const HARMONICS = [0, 12, 19, 24, 28, 31, 34, 36];
const WEIGHTS = [1, 1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];

export function rms(buf, length = buf.length) {
  let sum = 0;
  for (let i = buf.length - length; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / length);
}

// In-place iterative radix-2 FFT. re and im have power-of-two length.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const hann = new Map();
function hannWindow(size) {
  if (!hann.has(size)) {
    const w = new Float64Array(size);
    for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    hann.set(size, w);
  }
  return hann.get(size);
}

// Magnitude spectrum of the last `size` samples, scaled so a sine of amplitude A peaks near A.
export function spectrum(buf, size = FFT_SIZE) {
  const x = buf.subarray(buf.length - size);
  const w = hannWindow(size);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < size; i++) re[i] = x[i] * w[i];
  fft(re, im);
  const mag = new Float64Array(size / 2);
  const scale = 4 / size;
  for (let k = 0; k < size / 2; k++) mag[k] = Math.hypot(re[k], im[k]) * scale;
  return mag;
}

// Energy per semitone (index 0 = MIDI_LO), taken from spectral peaks that sit close to a semitone.
export function semitoneEnergy(mag, sampleRate) {
  const size = mag.length * 2;
  const out = new Float64Array(MIDI_HI - MIDI_LO + 1);
  const kMax = Math.min(mag.length - 2, Math.floor((5000 * size) / sampleRate));
  for (let k = 2; k <= kMax; k++) {
    const m = mag[k];
    if (m <= mag[k - 1] || m < mag[k + 1]) continue; // local peaks only
    const a = mag[k - 1];
    const c = mag[k + 1];
    const denom = a - 2 * m + c;
    const shift = denom ? (0.5 * (a - c)) / denom : 0;
    const midi = freqToMidi(((k + shift) * sampleRate) / size);
    const nearest = Math.round(midi);
    if (nearest < MIDI_LO || nearest > MIDI_HI || Math.abs(midi - nearest) > 0.4) continue;
    const i = nearest - MIDI_LO;
    out[i] = Math.max(out[i], m);
  }
  return out;
}

// How strongly does each candidate note's harmonic series show up in `energy`?
export function salience(energy, lo, hi) {
  const out = new Float64Array(hi - lo + 1);
  for (let m = lo; m <= hi; m++) {
    let s = 0;
    for (let h = 0; h < HARMONICS.length; h++) {
      const i = m + HARMONICS[h] - MIDI_LO;
      if (i < energy.length) s += WEIGHTS[h] * energy[i];
    }
    out[m - lo] = s;
  }
  return out;
}

// Stateful detector: feed it the latest samples every animation frame.
// It reports which notes just got louder ("onsets"), even over ringing strings.
export class NoteDetector {
  constructor(sampleRate, { lo = 40, hi = 81, fftSize = FFT_SIZE, minStrength = 0.0015, historyMs = 220, gapMs = 45 } = {}) {
    Object.assign(this, { sampleRate, lo, hi, fftSize, minStrength, historyMs, gapMs });
    this.history = []; // [{ time, energy }]
    this.floor = 0; // typical onset score when nothing is being played (room noise)
  }

  // samples: Float32Array of at least FFT_SIZE recent samples. time: seconds.
  update(samples, time) {
    const energy = semitoneEnergy(spectrum(samples, this.fftSize), this.sampleRate);
    // reference = loudest each semitone has been in the recent past (ignoring the last few frames)
    const ref = new Float64Array(energy.length);
    for (const h of this.history) {
      const age = (time - h.time) * 1000;
      if (age < this.gapMs || age > this.historyMs) continue;
      for (let i = 0; i < ref.length; i++) ref[i] = Math.max(ref[i], h.energy[i]);
    }
    const growth = energy.map((e, i) => Math.max(0, e - ref[i]));
    const fresh = salience(growth, this.lo, this.hi);

    this.history.push({ time, energy });
    while (this.history.length && (time - this.history[0].time) * 1000 > this.historyMs) this.history.shift();

    let best = 0;
    for (let i = 1; i < fresh.length; i++) if (fresh[i] > fresh[best]) best = i;
    const strength = fresh[best];
    const threshold = Math.max(this.minStrength, this.floor * 6);
    const isOnset = strength >= threshold;
    if (!isOnset) this.floor += 0.02 * (strength - this.floor); // learn the room's noise level
    return {
      level: rms(samples, 2048),
      fresh, // per-note onset score, index 0 = this.lo
      onset: isOnset ? { midi: this.lo + best, strength } : null,
    };
  }

  // Was `midi` just played? It must be (close to) the strongest new note.
  // Octave slips are forgiven because harmonics are shared.
  matches(result, midi, ratio = 0.7) {
    if (!result.onset) return false;
    const score = (m) => (m >= this.lo && m <= this.hi ? result.fresh[m - this.lo] : 0);
    const best = result.onset.strength;
    return score(midi) >= ratio * best || score(midi + 12) >= best || score(midi - 12) >= best;
  }
}
