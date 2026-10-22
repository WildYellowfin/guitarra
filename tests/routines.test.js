import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUTINES } from "../js/routines/index.js";
import { validateRoutine, totalMinutes } from "../js/routine.js";

test("every routine is valid", () => {
  for (const r of ROUTINES) assert.deepEqual(validateRoutine(r), [], r.id);
});

test("routine ids are unique", () => {
  const ids = ROUTINES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("current routines are 30 minutes", () => {
  for (const r of ROUTINES) assert.equal(totalMinutes(r), 30, r.id);
});

test("validate catches bad steps", () => {
  const errors = validateRoutine({
    id: "bad",
    title: "Bad",
    steps: [
      { title: "x", minutes: 0, blocks: [{ type: "nope" }] },
      { title: "y", minutes: 1, waitForTap: true, blocks: [{ type: "chords", chords: ["Z"] }] },
    ],
  });
  assert.equal(errors.length, 4);
});
