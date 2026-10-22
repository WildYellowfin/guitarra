import { test } from "node:test";
import assert from "node:assert/strict";
import { NoteDetector, FFT_SIZE } from "../js/audio/analysis.js";
import { pluck, noise } from "./helpers/synth.js";

const SR = 48000;

// Pluck `played` notes one per `gap` seconds (letting them ring), then ask the
// detector, note by note, whether `expected[i]` was just played.
function run(played, expected, { gap = 0.8, amp = 0.15 } = {}) {
  const out = new Float32Array(SR * (played.length * gap + 2));
  played.forEach((m, i) => pluck(out, SR, m, 0.5 + i * gap, { amp }));
  noise(out, 0.002);
  const det = new NoteDetector(SR);
  const hits = played.map(() => null);
  for (let t = FFT_SIZE; t < out.length; t += Math.round(SR / 60)) {
    const time = t / SR;
    const i = Math.floor((time - 0.5) / gap);
    const r = det.update(out.subarray(0, t), time);
    if (i >= 0 && i < played.length && hits[i] === null && det.matches(r, expected[i])) hits[i] = time - (0.5 + i * gap);
  }
  return hits;
}

// A, D, E fingerpicking: bass, G, B, e, B, G over each chord
const ARPEGGIO = [45, 57, 61, 64, 61, 57, 50, 57, 62, 66, 62, 57, 40, 56, 59, 64, 59, 56];

test("hears each note of an arpeggio while the others ring", () => {
  const hits = run(ARPEGGIO, ARPEGGIO);
  assert.equal(hits.filter((h) => h !== null).length, ARPEGGIO.length);
  for (const h of hits) assert.ok(h < 0.2, `detected ${Math.round(h * 1000)} ms after the pluck`);
});

test("works quietly too", () => {
  const hits = run(ARPEGGIO, ARPEGGIO, { amp: 0.02 });
  assert.equal(hits.filter((h) => h !== null).length, ARPEGGIO.length);
});

test("rejects the wrong fret", () => {
  for (const offset of [-2, -1, 1, 2]) {
    const played = ARPEGGIO.map((m) => m + offset);
    const accepted = run(played, ARPEGGIO).filter((h) => h !== null).length;
    assert.ok(accepted <= 1, `offset ${offset}: accepted ${accepted} wrong notes`);
  }
});
