// The rules of a play-along, with no drawing or audio, so it can be tested.
//
// Time is in seconds (the audio clock), positions are in beats.
//   ready    the first note sits on the line; nothing moves until you play it
//   playing  notes scroll at the tempo; the metronome clicks
//   waiting  a note reached the line without being played; everything stops until it is
//   paused   stopped by hand

import { loopBeats } from "../exercises.js";

export class PlaySession {
  constructor(exercise, { bpm = exercise.bpm, early = 0.5, grace = 0.22 } = {}) {
    this.exercise = exercise;
    this.bpm = bpm;
    this.early = early; // beats: how early a note may be played and still count
    this.grace = grace; // seconds: how late before we stop and wait (covers detection lag)
    this.state = "ready";
    this.index = 0; // next note to play, counting across loops
    this.frozenPos = this.noteAt(0).beat;
    this.anchorPos = this.frozenPos;
    this.anchorTime = 0;
    this.lastClick = this.frozenPos;
    this.lastHitTime = -Infinity;
    this.lastWrongTime = -Infinity;
    this.resumeState = null;
    this.stats = { hits: 0, clean: 0, streak: 0, bestStreak: 0, waits: 0, loops: 0 };
  }

  get spb() {
    return 60 / this.bpm;
  }

  noteAt(i) {
    const notes = this.exercise.notes;
    const loop = Math.floor(i / notes.length);
    const base = notes[i % notes.length];
    return { ...base, beat: base.beat + loop * loopBeats(this.exercise), index: i };
  }

  get target() {
    return this.noteAt(this.index);
  }

  position(now) {
    return this.state === "playing" ? this.anchorPos + (now - this.anchorTime) / this.spb : this.frozenPos;
  }

  // Call every frame. detection is a NoteDetector result (or null), matches(detection, midi) -> bool.
  update(now, detection, matches) {
    const events = [];
    if (this.state === "paused") return events;
    const target = this.target;
    const pos = this.position(now);

    if (detection?.onset && now - this.lastHitTime > 0.09) {
      const inWindow = this.state !== "playing" || pos >= target.beat - this.early;
      if (inWindow && matches(detection, target.midi)) {
        events.push(...this.hit(now, pos, target));
      } else if (this.state !== "playing" && now - this.lastWrongTime > 0.35) {
        this.lastWrongTime = now;
        events.push({ type: "wrong", midi: detection.onset.midi, target });
      }
    }

    if (this.state === "playing") {
      const next = this.target;
      const limit = next.beat + this.grace / this.spb;
      if (this.position(now) >= limit) {
        // stop with the missed note sitting on the line
        this.state = "waiting";
        this.frozenPos = next.beat;
        this.stats.waits += 1;
        this.stats.streak = 0;
        events.push({ type: "wait", note: next, from: limit });
      }
    }
    return events;
  }

  hit(now, pos, target) {
    const events = [];
    const clean = this.state === "playing" || this.state === "ready";
    if (this.state === "ready") events.push({ type: "start" });
    if (this.state !== "playing") {
      if (this.state === "waiting") events.push({ type: "resume" });
      // the note just played is "now": restart the clock on its beat
      this.state = "playing";
      this.anchorPos = target.beat;
      this.anchorTime = now;
      this.lastClick = target.beat;
    }
    this.lastHitTime = now;
    this.index += 1;
    const s = this.stats;
    s.hits += 1;
    if (clean) {
      s.clean += 1;
      s.streak += 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    }
    if (this.index % this.exercise.notes.length === 0) s.loops += 1;
    events.push({ type: "hit", note: target, clean, offset: clean ? pos - target.beat : 0 });
    return events;
  }

  // Metronome clicks to schedule between now and now + ahead: [{ beat, time, accent }].
  dueClicks(now, ahead) {
    if (this.state !== "playing") return [];
    const until = Math.min(this.position(now + ahead), this.target.beat + this.grace / this.spb);
    const out = [];
    for (let b = Math.floor(this.lastClick) + 1; b <= until; b++) {
      out.push({ beat: b, time: this.anchorTime + (b - this.anchorPos) * this.spb, accent: b % this.exercise.beatsPerBar === 0 });
      this.lastClick = b;
    }
    return out;
  }

  setBpm(bpm, now) {
    const pos = this.position(now);
    this.bpm = Math.max(30, Math.min(200, bpm));
    if (this.state === "playing") {
      this.anchorPos = pos;
      this.anchorTime = now;
    }
  }

  togglePause(now) {
    if (this.state === "paused") {
      this.state = this.resumeState;
      if (this.state === "playing") {
        this.anchorPos = this.frozenPos;
        this.anchorTime = now;
      }
      return false;
    }
    this.frozenPos = this.position(now);
    this.resumeState = this.state;
    this.state = "paused";
    return true;
  }

  get accuracy() {
    return this.stats.hits ? this.stats.clean / this.stats.hits : 1;
  }
}
