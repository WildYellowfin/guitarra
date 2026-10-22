import { tune, spiderWarmup, chordPerfect, oneMinuteChanges } from "./helpers.js";

export default {
  id: "chords-1-a-d-e",
  path: "Road to Blackbird",
  stage: 1,
  title: "Chords 1: A, D and E",
  summary: "Get three open chords back under your fingers, change between them quickly, and strum a real pattern in time.",
  steps: [
    tune(),
    spiderWarmup(60),
    chordPerfect("D"),
    chordPerfect("A", "Don't strum the low E string."),
    chordPerfect("E", "All six strings ring. Keep your thumb behind the neck, not wrapped over it."),
    oneMinuteChanges("A", "D"),
    oneMinuteChanges("D", "E"),
    oneMinuteChanges("A", "E"),
    {
      title: "Strumming on the beat",
      minutes: 5,
      metronome: { bpm: 70 },
      blocks: [
        {
          type: "text",
          text: "One down strum per click, four strums per chord: A A A A, D D D D, E E E E, A A A A. Keep strumming even if a change is late. Drop to 60 BPM if you can't keep up.",
        },
        { type: "chords", chords: ["A", "D", "E"] },
      ],
    },
    {
      title: "Strum pattern: D DU UDU",
      minutes: 8,
      metronome: { bpm: 60 },
      blocks: [
        {
          type: "text",
          text: "The pattern most pop and rock songs are built on. Count “1 2 & 3 & 4 &”: Down on 1, Down-Up on 2 &, Up on 3 & (skip the down on 3 but keep your hand moving), Down-Up on 4 &. Your hand never stops going down and up; you just miss the strings on the skipped beat. Start on one chord until it grooves, then do one bar each of A, D, E, A.",
        },
        {
          type: "tab",
          label: "One bar, hand moves down on numbers and up on “&”",
          tab: `
count:  1  &  2  &  3  &  4  &
strum:  D     D  U     U  D  U`,
        },
        { type: "chords", chords: ["A", "D", "E"] },
      ],
    },
  ],
};
