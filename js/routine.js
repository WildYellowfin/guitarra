// Routine format and checks.
//
// A routine is plain data:
//   {
//     id, title, summary,
//     path?, stage?,            // group routines into a learning path, in order
//     steps: [{
//       title, minutes,
//       metronome?: { bpm, beatsPerBar? },  // set and start the click for this step
//       waitForTap?: true,                  // timer starts on the first counter tap
//       blocks: [{ type, ... }],            // see blocks.js
//     }],
//   }

import { BLOCKS } from "./blocks.js";

export const totalMinutes = (routine) => routine.steps.reduce((sum, s) => sum + s.minutes, 0);

export function validateRoutine(r) {
  const errors = [];
  const where = (i, msg) => errors.push(`${r.id ?? "?"} step ${i + 1}: ${msg}`);
  if (!r.id) errors.push("routine needs an id");
  if (!r.title) errors.push(`${r.id}: routine needs a title`);
  if (!r.steps?.length) errors.push(`${r.id}: routine needs steps`);
  (r.steps ?? []).forEach((s, i) => {
    if (!s.title) where(i, "needs a title");
    if (!(s.minutes > 0)) where(i, "needs minutes > 0");
    if (s.metronome && !(s.metronome.bpm >= 30 && s.metronome.bpm <= 240)) where(i, "metronome bpm out of range");
    if (s.waitForTap && !s.blocks?.some((b) => b.type === "counter")) where(i, "waitForTap needs a counter block");
    (s.blocks ?? []).forEach((b) => {
      const type = BLOCKS[b.type];
      if (!type) return where(i, `unknown block type "${b.type}"`);
      const err = type.check?.(b);
      if (err) where(i, err);
    });
  });
  return errors;
}
