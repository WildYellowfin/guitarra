import { ROUTINES, ROADMAP } from "./routines/index.js";
import { BLOCKS, esc } from "./blocks.js";
import { totalMinutes, validateRoutine } from "./routine.js";
import { Metronome } from "./metronome.js";
import { loadStore, saveStore } from "./store.js";

const $ = (sel) => document.querySelector(sel);
const store = loadStore();

ROUTINES.forEach((r) => validateRoutine(r).forEach((e) => console.warn(`Routine problem: ${e}`)));

const state = {
  routine: ROUTINES.find((r) => r.id === store.lastRoutine) ?? ROUTINES[0],
  index: 0,
  remainingMs: 0,
  running: false,
  lastTick: 0,
  practicedMs: 0,
  scores: {}, // counter id -> best count this session
  done: new Set(),
  finished: false,
  mounted: [], // live block handles for the current step
};

let wakeLock = null;

const beatDots = [...document.querySelectorAll(".beat")];
const metronome = new Metronome({
  bpm: 70,
  onBeat: (beat) => beatDots.forEach((d, i) => d.classList.toggle("on", i === beat)),
});

// ---------- formatting ----------

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const step = () => state.routine.steps[state.index];
const stepMs = (s) => s.minutes * 60_000;

function remainingRoutineMs() {
  return state.remainingMs + state.routine.steps.slice(state.index + 1).reduce((sum, s) => sum + stepMs(s), 0);
}

// ---------- rendering ----------

function renderPicker() {
  const groups = new Map();
  ROUTINES.forEach((r) => {
    const key = r.path ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  $("#routine").innerHTML = [...groups]
    .map(
      ([path, routines]) =>
        `<optgroup label="${esc(path)}">${routines
          .sort((a, b) => (a.stage ?? 0) - (b.stage ?? 0))
          .map((r) => `<option value="${r.id}">${r.stage ? `${r.stage}. ` : ""}${esc(r.title)} (${totalMinutes(r)} min)</option>`)
          .join("")}</optgroup>`,
    )
    .join("");
  $("#routine").value = state.routine.id;
}

function renderHeader() {
  $("#routine-summary").textContent = state.routine.summary ?? "";
}

function renderList() {
  $("#steps").innerHTML = state.routine.steps
    .map((s, i) => {
      const cls = [i === state.index && !state.finished ? "current" : "", state.done.has(i) ? "done" : ""].join(" ");
      return `<li class="${cls}"><button data-i="${i}"><span>${esc(s.title)}</span><span class="mins">${s.minutes} min</span></button></li>`;
    })
    .join("");
}

function renderStep() {
  unmountBlocks();
  const s = step();
  $("#step-num").textContent = `Step ${state.index + 1} of ${state.routine.steps.length}`;
  $("#step-title").textContent = s.title;

  const ctx = {
    store,
    onActivity: () => !state.running && setRunning(true),
    record: (id, value) => {
      state.scores[id] = Math.max(state.scores[id] ?? 0, value);
      store.best[id] = Math.max(store.best[id] ?? 0, value);
      saveStore(store);
    },
  };
  const container = $("#blocks");
  container.innerHTML = "";
  (s.blocks ?? []).forEach((b) => {
    const type = BLOCKS[b.type];
    if (!type) return;
    const el = document.createElement("div");
    el.className = `block b-${b.type}`;
    el.innerHTML = type.render(b, ctx);
    container.append(el);
    if (type.mount) state.mounted.push(type.mount(el, b, ctx) ?? {});
  });

  renderList();
  renderTime();
}

function unmountBlocks() {
  state.mounted.forEach((m) => m.exit?.());
  state.mounted = [];
}

function renderTime() {
  $("#step-time").textContent = fmt(state.remainingMs);
  const totalMs = totalMinutes(state.routine) * 60_000;
  $("#total-left").textContent = `${fmt(remainingRoutineMs())} left of ${totalMinutes(state.routine)} min`;
  $("#progress").style.width = `${(100 * (totalMs - remainingRoutineMs())) / totalMs}%`;
  const fresh = state.remainingMs >= stepMs(step());
  $("#start").textContent = state.running ? "Pause" : !fresh ? "Resume" : step().waitForTap ? "Tap below to start" : "Start";
}

function renderMetronome() {
  $("#bpm").textContent = metronome.bpm;
  $("#metro-toggle").textContent = metronome.running ? "Stop" : "Start";
  if (!metronome.running) beatDots.forEach((d) => d.classList.remove("on"));
}

function renderHistory() {
  const titles = Object.fromEntries(ROUTINES.map((r) => [r.id, r.title]));
  const rows = store.history
    .slice(-7)
    .reverse()
    .map((h) => {
      const scores = Object.entries(h.scores ?? {})
        .map(([k, v]) => `${esc(k.replace(/^changes:/, "").replace("-", "↔"))} ${v}`)
        .join(", ");
      return `<li><strong>${new Date(h.date).toLocaleDateString()}</strong> ${esc(titles[h.routine] ?? h.routine)}, ${h.minutes} min${scores ? ` · ${scores}` : ""}</li>`;
    });
  $("#history").innerHTML = rows.length ? rows.join("") : "<li>No sessions logged yet.</li>";
}

function renderRoadmap() {
  $("#roadmap").innerHTML = ROADMAP.map(
    (r) => `<li><strong>${r.stage}. ${esc(r.title)}</strong><br /><span class="muted">${esc(r.summary)}</span></li>`,
  ).join("");
}

// ---------- routine flow ----------

function goTo(i) {
  state.index = i;
  state.remainingMs = stepMs(step());
  state.finished = false;
  $("#finished").hidden = true;
  if (step().waitForTap && state.running) setRunning(false);
  applyStepTempo();
  renderStep();
}

function applyStepTempo() {
  if (!$("#auto-metro").checked) return;
  const m = step().metronome;
  if (m) {
    metronome.setBpm(m.bpm);
    metronome.beatsPerBar = m.beatsPerBar ?? 4;
    if (state.running) metronome.start();
  } else {
    metronome.stop();
  }
  renderMetronome();
}

function next() {
  state.done.add(state.index);
  metronome.chime();
  if (state.index + 1 < state.routine.steps.length) goTo(state.index + 1);
  else finish();
}

function finish() {
  unmountBlocks();
  setRunning(false);
  metronome.stop();
  state.finished = true;
  const minutes = Math.round(state.practicedMs / 60_000);
  if (minutes > 0 || Object.keys(state.scores).length) {
    store.history.push({ date: new Date().toISOString(), routine: state.routine.id, minutes, scores: state.scores });
    saveStore(store);
  }
  $("#finished").hidden = false;
  renderList();
  renderMetronome();
  renderHistory();
}

function restart() {
  state.done.clear();
  state.scores = {};
  state.practicedMs = 0;
  goTo(0);
}

function selectRoutine(id) {
  if (state.running) setRunning(false);
  unmountBlocks();
  state.routine = ROUTINES.find((r) => r.id === id) ?? ROUTINES[0];
  store.lastRoutine = state.routine.id;
  saveStore(store);
  renderHeader();
  restart();
}

async function setRunning(running) {
  state.running = running;
  state.lastTick = performance.now();
  if (running) {
    applyStepTempo();
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

// ---------- events ----------

$("#routine").addEventListener("change", (e) => selectRoutine(e.target.value));
$("#start").addEventListener("click", () => {
  if (state.finished) restart();
  if (!state.running && step().waitForTap && state.remainingMs >= stepMs(step())) return;
  setRunning(!state.running);
});
$("#next").addEventListener("click", next);
$("#prev").addEventListener("click", () => goTo(Math.max(0, state.index - 1)));
$("#steps").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-i]");
  if (btn) goTo(Number(btn.dataset.i));
});
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
  if (e.target.matches("input, textarea, select")) return;
  if (e.code === "Space") {
    e.preventDefault();
    const handler = state.mounted.find((m) => m.onSpace);
    if (handler && !state.finished) handler.onSpace();
    else $("#start").click();
  } else if (e.key === "m") {
    $("#metro-toggle").click();
  }
});

renderPicker();
renderHeader();
renderRoadmap();
renderHistory();
goTo(0);
renderMetronome();
requestAnimationFrame(tick);
