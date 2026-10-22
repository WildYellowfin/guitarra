// Karplus-Strong plucked-string synth, for testing the note detector
// without a real guitar.

import { midiToFreq } from "../../js/music.js";

let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

// Add a plucked note into `out` starting at `start` seconds.
export function pluck(out, sampleRate, midi, start, { amp = 0.3, decay = 0.996, duration = 4 } = {}) {
  const period = sampleRate / midiToFreq(midi);
  const n = Math.floor(period);
  const frac = period - n;
  const line = Float64Array.from({ length: n + 2 }, () => rand() * amp);
  const begin = Math.floor(start * sampleRate);
  const end = Math.min(out.length, begin + Math.floor(duration * sampleRate));
  let prev = 0;
  for (let i = begin, p = 0; i < end; i++, p++) {
    const a = line[p % line.length];
    const b = line[(p + 1) % line.length];
    // averaging filter with a touch of fractional delay to stay in tune
    const y = decay * ((1 - frac) * 0.5 * (a + b) + frac * 0.5 * (b + prev));
    prev = a;
    line[p % line.length] = y;
    out[i] += a;
  }
}

export function noise(out, amp = 0.002) {
  for (let i = 0; i < out.length; i++) out[i] += rand() * amp;
}

export function wav(samples, sampleRate) {
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + samples.length * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * 32767))), 44 + i * 2));
  return data;
}
