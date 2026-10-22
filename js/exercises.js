// Exercises are plain data: a tempo and a list of notes, each on a beat.
// Builders below turn musical ideas (a picking pattern over chords) into notes,
// so new exercises are a few lines each.

import { CHORDS } from "./chords.js";
import { midiAt, chordRoot } from "./music.js";

// Right-hand fingers: p thumb, i index, m middle, a ring.
// In classic fingerpicking the fingers stay on the top three strings.
const FINGER_STRING = { i: 3, m: 4, a: 5 };

function note(chord, string, rightHand, beat) {
  const fret = CHORDS[chord].frets[string];
  return {
    beat,
    string,
    fret,
    finger: CHORDS[chord].fingers[string], // left hand, null for open strings
    rightHand,
    chord,
    midi: midiAt(string, fret),
  };
}

// A picking pattern ("p i m a m i") played once per bar over each chord.
export function fingerpicking(chords, pattern) {
  const notes = [];
  chords.forEach((chord, bar) =>
    pattern.forEach((rh, i) => {
      const string = rh === "p" ? chordRoot(chord).string : FINGER_STRING[rh];
      notes.push(note(chord, string, rh, bar * pattern.length + i));
    }),
  );
  return notes;
}

export const EXERCISES = [
  {
    id: "pick-a-d-a-e",
    title: "Fingerpicking: A · D · A · E",
    description:
      "Hold each chord shape for the whole bar. Thumb plays the bass string, then index, middle, ring on the top three strings, and back down.",
    bpm: 60,
    beatsPerBar: 6,
    chords: ["A", "D", "A", "E"],
    notes: fingerpicking(["A", "D", "A", "E"], ["p", "i", "m", "a", "m", "i"]),
  },
];

// Length of one pass through the exercise, in beats.
export const loopBeats = (ex) => ex.chords.length * ex.beatsPerBar;
