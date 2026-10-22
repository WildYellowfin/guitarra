import { SESSIONS, CHORDS, totalMinutes } from "./sessions.js";
import { Metronome } from "./metronome.js";
import { chordDiagram } from "./chord-diagram.js";
import { loadStore, saveStore } from "./store.js";

const $ = (sel) => document.querySelector(sel);
const session = SESSIONS[0];
const store = loadStore();

const state = {
  index: 0,
  remainingMs: session.segments[0].minutes * 60_000,
  running: false,
  lastTick: 0,
  changes: 0,
  scores: {}, // pair key -> changes counted this session
  practicedMs: 0,
  done: new Set(),
  finished: false,
};

let wakeLock = null;

const beatDots = [...document.querySelectorAll(".beat")];
const metronome = new Metronome({
  bpm: 70,
  onBeat: (beat) => {
    beatDots.forEach((d, i) => d.classList.toggle("on", i === beat));
  },
});

// ---------- formatting ----------

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const pairKey = (pair) => pair.join("-");
const segment = () => session.segments[state.index];

function remainingSessionMs() {
  const later = session.segments.slice(state.index + 1).reduce((sum, s) => sum + s.minutes, 0);
  return state.remainingMs + later * 60_000;
}

// ---------- rendering ----------

function renderList() {
  $("#segments").innerHTML = session.segments
    .map((s, i) => {
      const cls = [i === state.index && !state.finished ? "current" : "", state.done.has(i) ? "done" : ""].join(" ");
      return `<li class="${cls}"><button data-i="${i}"><span>${s.title}</span><span class="mins">${s.minutes} min</span></button></li>`;
    })
    .join("");
}

function renderSegment() {
  const s = segment();
  $("#seg-step").textContent = `Step ${state.index + 1} of ${session.segments.length}`;
  $("#seg-title").textContent = s.title;
  $("#seg-text").textContent = s.text;
  const chords = s.type === "changes" ? s.pair : s.chords ?? [];
  $("#seg-chords").innerHTML = chords.map((c) => chordDiagram(c, CHORDS[c])).join("");

  const isChanges = s.type === "changes";
  $("#changes").hidden = !isChanges;
  if (isChanges) {
    const best = store.best[pairKey(s.pair)];
    $("#changes-count").textContent = state.changes;
    $("#changes-best").textContent = best ? `Best: ${best}` : "No score yet. Teachers aim for 30, then 60.";
  }
  renderList();
  renderTime();
}

function renderTime() {
  $("#seg-time").textContent = fmt(state.remainingMs);
  $("#total-left").textContent = `${fmt(remainingSessionMs())} left of ${totalMinutes(session)} min`;
  const totalMs = totalMinutes(session) * 60_000;
  $("#progress").style.width = `${(100 * (totalMs - remainingSessionMs())) / totalMs}%`;
  $("#start").textContent = state.running ? "Pause" : state.remainingMs < segment().minutes * 60_000 ? "Resume" : "Start";
}

function renderMetronome() {
  $("#bpm").textContent = metronome.bpm;
  $("#metro-toggle").textContent = metronome.running ? "Stop" : "Start";
  if (!metronome.running) beatDots.forEach((d) => d.classList.remove("on"));
}

function renderHistory() {
  const rows = store.history
    .slice(-7)
    .reverse()
    .map((h) => {
      const scores = Object.entries(h.scores)
        .map(([k, v]) => `${k.replace("-", "↔")} ${v}`)
        .join(", ");
      return `<li><strong>${new Date(h.date).toLocaleDateString()}</strong> ${h.minutes} min${scores ? ` · ${scores}` : ""}</li>`;
    });
  $("#history").innerHTML = rows.length ? rows.join("") : "<li>No sessions logged yet.</li>";
}

// ---------- session flow ----------

function goTo(i) {
  saveChangesScore();
  state.index = i;
  state.remainingMs = session.segments[i].minutes * 60_000;
  state.changes = 0;
  state.finished = false;
  $("#finished").hidden = true;
  applySegmentTempo();
  renderSegment();
}

function applySegmentTempo() {
  const s = segment();
  if (!$("#auto-metro").checked) return;
  if (s.bpm) {
    metronome.setBpm(s.bpm);
    if (state.running) metronome.start();
  } else {
    metronome.stop();
  }
  renderMetronome();
}

function saveChangesScore() {
  const s = segment();
  if (s.type !== "changes" || state.changes === 0) return;
  const key = pairKey(s.pair);
  state.scores[key] = Math.max(state.scores[key] ?? 0, state.changes);
  store.best[key] = Math.max(store.best[key] ?? 0, state.changes);
  saveStore(store);
}

function next() {
  state.done.add(state.index);
  metronome.chime();
  if (state.index + 1 < session.segments.length) {
    goTo(state.index + 1);
    // Changes drills start on the first tap, so you can get your hand in place.
    if (segment().type === "changes") setRunning(false);
  } else {
    finish();
  }
}

function finish() {
  saveChangesScore();
  setRunning(false);
  metronome.stop();
  state.finished = true;
  const minutes = Math.round(state.practicedMs / 60_000);
  if (minutes > 0 || Object.keys(state.scores).length) {
    store.history.push({ date: new Date().toISOString(), session: session.id, minutes, scores: state.scores });
    saveStore(store);
  }
  $("#finished").hidden = false;
  renderList();
  renderMetronome();
  renderHistory();
}

async function setRunning(running) {
  state.running = running;
  state.lastTick = performance.now();
  if (running) {
    applySegmentTempo();
    try {
      wakeLock = await navigator.wakeLock?.request("screen");
    } catch {
      // Wake lock is a nice-to-have; ignore if the browser refuses.
    }
  } else {
    if ($("#auto-metro").checked) metronome.stop();
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }
  renderTime();
  renderMetronome();
}

function tick() {
  if (state.running) {
    const now = performance.now();
    state.remainingMs -= now - state.lastTick;
    state.practicedMs += now - state.lastTick;
    state.lastTick = now;
    if (state.remainingMs <= 0) next();
    renderTime();
  }
  requestAnimationFrame(tick);
}

function countChange() {
  if (segment().type !== "changes" || state.finished) return;
  if (!state.running) setRunning(true);
  state.changes += 1;
  $("#changes-count").textContent = state.changes;
}

function restart() {
  state.done.clear();
  state.scores = {};
  state.practicedMs = 0;
  goTo(0);
}

// ---------- events ----------

$("#start").addEventListener("click", () => {
  if (state.finished) restart();
  setRunning(!state.running);
});
$("#next").addEventListener("click", next);
$("#prev").addEventListener("click", () => goTo(Math.max(0, state.index - 1)));
$("#segments").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-i]");
  if (btn) goTo(Number(btn.dataset.i));
});
$("#tap").addEventListener("click", countChange);
$("#restart").addEventListener("click", restart);

$("#metro-toggle").addEventListener("click", () => {
  metronome.toggle();
  renderMetronome();
});
document.querySelectorAll("[data-bpm]").forEach((btn) =>
  btn.addEventListener("click", () => {
    metronome.setBpm(metronome.bpm + Number(btn.dataset.bpm));
    renderMetronome();
  }),
);

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (segment().type === "changes") countChange();
    else $("#start").click();
  } else if (e.key === "m") {
    $("#metro-toggle").click();
  }
});

$("#session-title").textContent = session.title;
$("#session-goal").textContent = session.goal;
renderSegment();
renderMetronome();
renderHistory();
requestAnimationFrame(tick);
