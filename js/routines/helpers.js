// Shortcuts for steps that many routines reuse.

export const tune = () => ({
  title: "Tune up",
  minutes: 2,
  blocks: [{ type: "text", text: "Tune every string with a tuner app or clip-on tuner. Low to high: E A D G B E." }],
});

export const spiderWarmup = (bpm = 60) => ({
  title: "Finger warm-up",
  minutes: 3,
  metronome: { bpm },
  blocks: [
    {
      type: "text",
      text: "Frets 1-2-3-4 on each string, one note per click, low E to high e and back. One finger per fret, fingertips right behind the fret wire.",
    },
    {
      type: "tab",
      label: "Low E, then A, then D, G, B and e the same way, and back down",
      tab: `
A|---------1-2-3-4-|
E|-1-2-3-4---------|`,
    },
  ],
});

export const chordPerfect = (chord, extra = "") => ({
  title: `Chord perfect: ${chord}`,
  minutes: 3,
  blocks: [
    {
      type: "text",
      text: `Place the chord, pick each string one at a time and fix any buzzing or muted note. Then take your hand off, shake it out, and place it again. Accuracy over speed. ${extra}`.trim(),
    },
    { type: "chords", chords: [chord] },
  ],
});

export const oneMinuteChanges = (a, b, text = "Switch between the two chords as many times as you can, strumming once each time you land. Sloppy is fine, it's about speed.") => ({
  title: `One-minute changes: ${a} ↔ ${b}`,
  minutes: 1,
  waitForTap: true,
  blocks: [
    { type: "text", text: `${text} The timer starts on your first tap.` },
    { type: "counter", id: `changes:${a}-${b}`, label: "tap for each change", hint: "No score yet. Teachers aim for 30, then 60." },
    { type: "chords", chords: [a, b] },
  ],
});
