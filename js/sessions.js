// Practice sessions. Each segment is a timed block of the session.
// type "changes" turns on the one-minute-changes counter for `pair`.
// `bpm` (optional) is the metronome tempo suggested for that segment.

export const CHORDS = {
  // frets listed low E -> high e; null = muted, 0 = open.
  // fingers: 1 index, 2 middle, 3 ring, 4 pinky.
  A: { frets: [null, 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] },
  D: { frets: [null, null, 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] },
};

export const SESSIONS = [
  {
    id: "day-1-a-d-e",
    title: "Day 1: A, D and E",
    goal: "Get three open chords back under your fingers and play a real song with them.",
    segments: [
      {
        title: "Tune up",
        minutes: 2,
        text: "Tune every string with a tuner app or clip-on tuner. Low to high: E A D G B E.",
      },
      {
        title: "Finger warm-up",
        minutes: 3,
        bpm: 60,
        text: "Frets 1-2-3-4 on each string, one note per click, low E to high e and back. One finger per fret, fingertips right behind the fret wire.",
      },
      {
        title: "Chord perfect: D",
        minutes: 3,
        chords: ["D"],
        text: "Place the chord, pick each string one at a time and fix any buzzing or muted note. Then take your hand off, shake it out, and place it again. Accuracy over speed.",
      },
      {
        title: "Chord perfect: A",
        minutes: 3,
        chords: ["A"],
        text: "Same drill. Pick string by string, fix the dead notes, lift off, place again. Don't strum the low E string.",
      },
      {
        title: "Chord perfect: E",
        minutes: 3,
        chords: ["E"],
        text: "Same drill. All six strings ring on E. Keep your thumb behind the neck, not wrapped over it.",
      },
      {
        title: "One-minute changes: A ↔ D",
        minutes: 1,
        type: "changes",
        pair: ["A", "D"],
        text: "Switch between the two chords as many times as you can. Strum once each time you land. Sloppy is fine, it's about speed. The timer starts on your first tap; tap the button (or space bar) for each change.",
      },
      {
        title: "One-minute changes: D ↔ E",
        minutes: 1,
        type: "changes",
        pair: ["D", "E"],
        text: "Same again. Look for fingers that can stay close to the strings between shapes.",
      },
      {
        title: "One-minute changes: A ↔ E",
        minutes: 1,
        type: "changes",
        pair: ["A", "E"],
        text: "Last one. Your best score for each pair is saved, so you can beat it tomorrow.",
      },
      {
        title: "Strumming on the beat",
        minutes: 5,
        bpm: 70,
        chords: ["A", "D", "E"],
        text: "One down strum per click, four strums per chord: A A A A, D D D D, E E E E, A A A A. Keep strumming even if a change is late. Drop to 60 BPM if you can't keep up.",
      },
      {
        title: "Song: Three Little Birds",
        minutes: 8,
        bpm: 70,
        chords: ["A", "D", "E"],
        text: "Bob Marley's “Three Little Birds” uses just A, D and E. Pull up the chord chart, play along with the recording or the metronome using four down strums per chord, and sing or hum along. Have fun with it.",
      },
    ],
  },
];

export function totalMinutes(session) {
  return session.segments.reduce((sum, s) => sum + s.minutes, 0);
}
