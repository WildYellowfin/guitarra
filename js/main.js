import { EXERCISES, loopBeats } from "./exercises.js";
import { NoteDetector } from "./audio/analysis.js";
import { Audio } from "./audio/mic.js";
import { PlaySession } from "./play/session.js";
import { Highway, STRING_COLORS } from "./play/highway.js";
import { STRING_NAMES, noteLabel } from "./music.js";
import { loadStore, saveStore } from "./store.js";

const $ = (sel) => document.querySelector(sel);
const store = loadStore();
const audio = new Audio();
const debug = new URLSearchParams(location.search).has("debug");

let exercise = EXERCISES[0];
let session = null;
let detector = null;
let highway = null;
let raf = 0;
let lastFrame = 0;
let posOffset = 0; // eases the highway back onto the line when it stops, instead of jumping
let heardTimer = 0;

// Exposed for end-to-end tests and poking around in the console.
window.guitarra = { get session() { return session; }, events: [] };

// ---------- landing ----------

function renderLanding() {
  const best = store.best[exercise.id];
  $("#ex-title").textContent = exercise.title;
  $("#ex-desc").textContent = exercise.description;
  $("#ex-chords").innerHTML = exercise.chords.map((c) => `<span class="chip">${c}</span>`).join("");
  $("#ex-pattern").innerHTML = exercise.notes
    .slice(0, exercise.beatsPerBar)
    .map((n) => `<span class="pick" style="--c:${STRING_COLORS[n.string]}">${n.rightHand}<small>${STRING_NAMES[n.string]}</small></span>`)
    .join("");
  $("#ex-best").textContent = best
    ? `Best: ${best.streak} notes in a row · ${Math.round(best.accuracy * 100)}% on time`
    : "No runs yet";
  $("#ex-bpm").textContent = `${store.bpm[exercise.id] ?? exercise.bpm} BPM`;
}

// ---------- play ----------

async function play() {
  $("#landing").hidden = true;
  $("#play").hidden = false;
  document.documentElement.requestFullscreen?.().catch(() => {});
  setStatus("Starting the microphone…");
  try {
    await audio.start();
  } catch (err) {
    setStatus("I can't hear you: allow microphone access for this page and try again.", "error");
    console.error(err);
    return;
  }
  detector = new NoteDetector(audio.sampleRate);
  session = new PlaySession(exercise, { bpm: store.bpm[exercise.id] ?? exercise.bpm });
  highway ??= new Highway($("#stage"));
  highway.resize();
  lastFrame = performance.now();
  posOffset = 0;
  raf = requestAnimationFrame(frame);
}

function exit() {
  cancelAnimationFrame(raf);
  if (session) {
    audio.silenceFrom(0);
    saveBest();
  }
  session = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $("#play").hidden = true;
  $("#landing").hidden = false;
  renderLanding();
}

function saveBest() {
  const s = session.stats;
  if (s.hits < exercise.notes.length) return; // only count runs of at least one full loop
  const prev = store.best[exercise.id] ?? { streak: 0, accuracy: 0 };
  store.best[exercise.id] = { streak: Math.max(prev.streak, s.bestStreak), accuracy: Math.max(prev.accuracy, session.accuracy) };
  saveStore(store);
}

function frame(ms) {
  const dt = Math.min(0.1, (ms - lastFrame) / 1000);
  lastFrame = ms;
  const now = audio.now;

  const detection = detector.update(audio.read(), now);
  const events = session.update(now, detection, (d, m) => detector.matches(d, m));
  events.forEach(handle);

  for (const c of session.dueClicks(now, 0.12)) {
    audio.click(c.time, c.accent);
    setTimeout(() => beatPulse(c.accent), Math.max(0, (c.time - now) * 1000));
  }

  posOffset *= Math.exp(-dt / 0.12);
  const pos = session.position(now) + posOffset;
  const notes = [];
  for (let i = session.index; i < session.index + 40; i++) {
    const n = session.noteAt(i);
    if (n.beat - pos > 7) break;
    notes.push(n);
  }
  const target = session.target;
  const bpb = exercise.beatsPerBar;
  const total = loopBeats(exercise);
  const chordAt = (b) => exercise.chords[Math.floor((((b % total) + total) % total) / bpb)];
  highway.draw({
    pos,
    state: session.state,
    target,
    notes,
    beatsPerBar: bpb,
    chordAt,
    nextChord: chordAt((Math.floor(target.beat / bpb) + 1) * bpb),
    t: ms / 1000,
    dt,
  });

  updateHud(detection);
  raf = requestAnimationFrame(frame);
}

function handle(e) {
  if (debug) console.log(e.type, e);
  window.guitarra.events.push({ type: e.type, time: audio.now, index: e.note?.index, midi: e.midi });
  if (e.type === "start") setStatus("Keep going", "go");
  if (e.type === "hit") {
    const s = session.stats;
    const loopDone = session.index % exercise.notes.length === 0;
    highway.hit(e.note, e.clean, e.clean && s.streak > 0 && s.streak % 10 === 0 ? `${s.streak} in a row!` : undefined);
    if (loopDone) highway.banner(`Loop ${s.loops} done · ${Math.round(session.accuracy * 100)}% on time`);
    if (session.state === "playing") setStatus("Keep going", "go");
  }
  if (e.type === "wait") {
    posOffset = e.from - e.note.beat; // slide back onto the line rather than jump
    audio.silenceFrom(audio.now);
    setStatus(`Waiting for you: ${describe(e.note)}`, "wait");
  }
  if (e.type === "wrong") {
    highway.wrong(e.target.string);
    showHeard(`Heard ${noteLabel(e.midi)}, looking for ${noteLabel(e.target.midi)}`);
  }
}

function describe(n) {
  const where = n.fret === 0 ? "open" : `fret ${n.fret} (finger ${n.finger})`;
  return `${STRING_NAMES[n.string]} string, ${where}`;
}

// ---------- HUD ----------

function setStatus(text, kind = "") {
  const el = $("#status");
  el.textContent = text;
  el.className = `status ${kind}`;
}

function showHeard(text) {
  const el = $("#heard");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(heardTimer);
  heardTimer = setTimeout(() => el.classList.remove("show"), 1400);
}

function beatPulse(accent) {
  const el = $("#beat");
  el.classList.remove("tick", "accent");
  void el.offsetWidth; // restart the animation
  el.classList.add("tick");
  if (accent) el.classList.add("accent");
}

function updateHud(detection) {
  const s = session.stats;
  $("#bpm").textContent = session.bpm;
  $("#streak").textContent = s.streak;
  $("#accuracy").textContent = s.hits ? `${Math.round(session.accuracy * 100)}%` : "–";
  $("#loops").textContent = s.loops;
  const level = Math.min(1, Math.sqrt(detection.level) * 3.2);
  $("#level").style.transform = `scaleX(${level})`;
  if (session.state === "ready") setStatus(`Play the first note to start: ${describe(session.target)}`, "wait");
  if (session.state === "paused") setStatus("Paused · press space to carry on", "");
}

function changeTempo(delta) {
  if (!session) return;
  session.setBpm(session.bpm + delta, audio.now);
  store.bpm[exercise.id] = session.bpm;
  saveStore(store);
}

// ---------- wiring ----------

$("#play-btn").addEventListener("click", play);
$("#exit").addEventListener("click", exit);
$("#slower").addEventListener("click", () => changeTempo(-5));
$("#faster").addEventListener("click", () => changeTempo(5));
$("#pause").addEventListener("click", () => session?.togglePause(audio.now) && audio.silenceFrom(audio.now));
window.addEventListener("resize", () => highway?.resize());
document.addEventListener("keydown", (e) => {
  if (!session) {
    if (e.key === "Enter" && !$("#landing").hidden) play();
    return;
  }
  if (e.key === "Escape") exit();
  else if (e.code === "Space") {
    e.preventDefault();
    $("#pause").click();
  } else if (e.key === "ArrowUp" || e.key === "+" || e.key === "=") changeTempo(5);
  else if (e.key === "ArrowDown" || e.key === "-") changeTempo(-5);
});

renderLanding();
