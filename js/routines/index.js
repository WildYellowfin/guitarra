// Every routine the app knows about. To add one, write a file next to this
// one and list it here.

import chords1 from "./chords-1.js";
import fingerpicking1 from "./fingerpicking-1.js";

export const ROUTINES = [chords1, fingerpicking1];

// Where the "Road to Blackbird" goes next. These turn into routines as we get there.
export const ROADMAP = [
  { stage: 3, title: "Chords 2: G, C, Em, Am", summary: "The chords Blackbird's key of G lives in." },
  { stage: 4, title: "Fingerpicking 2: alternating bass", summary: "Thumb alternates between two bass strings while fingers play on top." },
  { stage: 5, title: "Two-string patterns in G", summary: "Thumb and one finger on two strings at once, the right-hand feel Blackbird is built on." },
  { stage: 6, title: "Blackbird: intro", summary: "Two-note shapes moving up the neck with the open G string ringing between them." },
  { stage: 7, title: "Blackbird: full song", summary: "Verse, bridge, and playing it through with the recording." },
];
