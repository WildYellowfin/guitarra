import { test } from "node:test";
import assert from "node:assert/strict";
import { PlaySession } from "../js/play/session.js";
import { EXERCISES, loopBeats } from "../js/exercises.js";

const ex = EXERCISES[0];
// Fake detector: an "onset" is just the MIDI note we pretend was played.
const heard = (midi) => ({ onset: { midi, strength: 1 } });
const matches = (d, midi) => d.onset.midi === midi;

test("waits for the first note, then starts the clock", () => {
  const s = new PlaySession(ex);
  assert.deepEqual(s.update(5, null, matches), []);
  assert.equal(s.state, "ready");
  const events = s.update(10, heard(ex.notes[0].midi), matches).map((e) => e.type);
  assert.deepEqual(events, ["start", "hit"]);
  assert.equal(s.state, "playing");
  assert.equal(s.position(10.5), 0.5);
});

test("stops on a missed note and carries on when it's played", () => {
  const s = new PlaySession(ex, { bpm: 60 });
  s.update(0, heard(ex.notes[0].midi), matches);
  s.update(1.0, heard(ex.notes[1].midi), matches); // on time
  assert.equal(s.stats.clean, 2);
  const wait = s.update(2.3, null, matches); // note 2 was due at 2.0
  assert.equal(wait[0].type, "wait");
  assert.equal(s.state, "waiting");
  assert.equal(s.position(9), 2, "frozen with the note on the line");
  assert.equal(s.update(4, heard(ex.notes[2].midi + 1), matches)[0].type, "wrong");
  const resume = s.update(5, heard(ex.notes[2].midi), matches).map((e) => e.type);
  assert.deepEqual(resume, ["resume", "hit"]);
  assert.equal(s.position(5.5), 2.5, "clock restarts on the played note");
  assert.equal(s.stats.streak, 0);
});

test("loops forever and counts loops", () => {
  const s = new PlaySession(ex, { bpm: 60 });
  const n = ex.notes.length;
  for (let i = 0; i < n * 2 + 1; i++) s.update(i, heard(ex.notes[i % n].midi), matches);
  assert.equal(s.stats.loops, 2);
  assert.equal(s.noteAt(n).beat, loopBeats(ex));
  assert.equal(s.stats.clean, n * 2 + 1);
});

test("schedules clicks only while playing, never past the next note", () => {
  const s = new PlaySession(ex, { bpm: 60 });
  assert.deepEqual(s.dueClicks(0, 1), []);
  s.update(0, heard(ex.notes[0].midi), matches);
  const clicks = s.dueClicks(0, 3);
  assert.deepEqual(clicks.map((c) => c.beat), [1]);
  assert.equal(clicks[0].time, 1);
});

test("exercise notes match their chord shapes", () => {
  for (const n of ex.notes) {
    assert.ok(n.fret >= 0 && n.fret <= 4);
    assert.equal(n.fret === 0, n.finger === null, `${n.chord} string ${n.string}`);
  }
});
