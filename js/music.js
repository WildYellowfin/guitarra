// Notes, strings and frets. Strings are numbered 0 (low E) to 5 (high e),
// the same order as chord shapes in chords.js.

import { CHORDS } from "./chords.js";

export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export const midiAt = (string, fret) => OPEN_MIDI[string] + fret;
export const pitchClass = (midi) => ((Math.round(midi) % 12) + 12) % 12;
export const noteName = (midi) => NAMES[pitchClass(midi)];
export const noteLabel = (midi) => `${noteName(midi)}${Math.floor(Math.round(midi) / 12) - 1}`;
export const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);
export const freqToMidi = (freq) => 69 + 12 * Math.log2(freq / 440);

// The notes of a chord shape: [{ string, fret, finger, midi }], muted strings left out.
export function chordNotes(name) {
  const shape = CHORDS[name];
  return shape.frets
    .map((fret, string) => (fret === null ? null : { string, fret, finger: shape.fingers[string], midi: midiAt(string, fret) }))
    .filter(Boolean);
}

// Lowest sounding string of a chord: the bass note a thumb plays.
export const chordRoot = (name) => chordNotes(name)[0];
