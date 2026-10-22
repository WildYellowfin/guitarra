import { tune } from "./helpers.js";

// Fingerpicking names: p = thumb, i = index, m = middle, a = ring.

export default {
  id: "fingerpicking-1-pima",
  path: "Road to Blackbird",
  stage: 2,
  title: "Fingerpicking 1: thumb and fingers",
  summary: "Give each finger its own string over the A, D and E shapes. This is the right-hand base everything up to Blackbird is built on.",
  steps: [
    tune(),
    {
      title: "Thumb on the bass",
      minutes: 4,
      metronome: { bpm: 60 },
      blocks: [
        {
          type: "text",
          text: "Hold each chord and play only its bass note with your thumb, one per click, four per chord: A string for A, D string for D, low E for E. Rest your fingers lightly on the G, B and e strings. The thumb does the work, moving from the wrist, not the knuckle.",
        },
        { type: "chords", chords: ["A", "D", "E"] },
      ],
    },
    {
      title: "Thumb, index, middle, ring",
      minutes: 7,
      metronome: { bpm: 60 },
      blocks: [
        {
          type: "text",
          text: "One note per click: thumb plays the bass, then index on G, middle on B, ring on e. Each finger stays on its own string. Repeat on one chord until it feels even, then move to the next.",
        },
        {
          type: "tab",
          label: "p  i  m  a over A, D and E",
          tab: `
   A           D           E
e|-------0---|-------2---|-------0---|
B|-----2-----|-----3-----|-----0-----|
G|---2-------|---2-------|---1-------|
D|-----------|-0---------|-----------|
A|-0---------|-----------|-----------|
E|-----------|-----------|-0---------|`,
        },
        { type: "chords", chords: ["A", "D", "E"] },
      ],
    },
    {
      title: "Pinch",
      minutes: 7,
      metronome: { bpm: 60 },
      blocks: [
        {
          type: "text",
          text: "Thumb and ring finger pluck at the same time (the “pinch”), then index, then middle. Both notes of the pinch should sound as one. Blackbird is full of thumb-and-finger pairs like this.",
        },
        {
          type: "tab",
          label: "pinch  i  m over A, D and E",
          tab: `
   A         D         E
e|-0-------|-2-------|-0-------|
B|-----2---|-----3---|-----0---|
G|---2-----|---2-----|---1-----|
D|---------|-0-------|---------|
A|-0-------|---------|---------|
E|---------|---------|-0-------|`,
        },
        { type: "chords", chords: ["A", "D", "E"] },
      ],
    },
    {
      title: "Put it together: A D E A",
      minutes: 8,
      metronome: { bpm: 60 },
      blocks: [
        {
          type: "text",
          text: "Play the p i m a pattern twice on each chord: A, D, E, A, and loop. Then swap in the pinch pattern. Keep the click going through the chord changes; if a change is late, skip notes rather than stop. Too easy? Go up to 70 or 80 BPM.",
        },
        { type: "chords", chords: ["A", "D", "E"] },
      ],
    },
    {
      title: "Free play",
      minutes: 2,
      blocks: [{ type: "text", text: "Make something up with the three chords and either pattern. No click, no rules." }],
    },
  ],
};
