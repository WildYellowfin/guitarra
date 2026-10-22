// Chord shapes. frets are listed low E -> high e; null = muted, 0 = open.
// fingers: 1 index, 2 middle, 3 ring, 4 pinky.

export const CHORDS = {
  A: { frets: [null, 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] },
  Am: { frets: [null, 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] },
  C: { frets: [null, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] },
  D: { frets: [null, null, 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] },
};
