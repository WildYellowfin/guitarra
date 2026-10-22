// Building blocks a routine step is made of. Each block type knows how to
// render itself and, optionally, how to come alive once it is on screen.
//
//   render(block, ctx) -> HTML string
//   mount(el, block, ctx) -> { onSpace?, exit? }   (optional)
//   check(block) -> error string or null          (optional, used by validate)
//
// ctx gives blocks: store (best scores), onActivity() to start the step
// timer, and record(id, value) to save a score.
//
// To add a new kind of task, add an entry here and use it in a routine.

import { CHORDS } from "./chords.js";
import { chordDiagram } from "./chord-diagram.js";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const BLOCKS = {
  // { type: "text", text }
  text: {
    render: (b) => `<p class="b-text">${esc(b.text)}</p>`,
  },

  // { type: "chords", chords: ["A", "D"] }
  chords: {
    render: (b) => `<div class="chords">${b.chords.map((c) => chordDiagram(c, CHORDS[c])).join("")}</div>`,
    check: (b) => {
      const missing = (b.chords ?? []).filter((c) => !CHORDS[c]);
      return missing.length ? `unknown chord(s): ${missing.join(", ")}` : null;
    },
  },

  // { type: "tab", tab: "e|---...", label? }  Plain ASCII tab, shown as-is.
  tab: {
    render: (b) =>
      `<figure class="b-tab">${b.label ? `<figcaption>${esc(b.label)}</figcaption>` : ""}<pre>${esc(b.tab.replace(/^\s*\n|\n\s*$/g, ""))}</pre></figure>`,
    check: (b) => (typeof b.tab === "string" ? null : "tab block needs a tab string"),
  },

  // { type: "link", href, label }
  link: {
    render: (b) => `<p class="b-link"><a href="${esc(b.href)}" target="_blank" rel="noopener">${esc(b.label)} ↗</a></p>`,
  },

  // { type: "counter", id, label?, hint? }  Tap (or space bar) to count reps.
  // The best count per id is kept across sessions.
  counter: {
    render: (b) =>
      `<button class="tap"><span class="count">0</span><small>${esc(b.label ?? "tap to count")} (space bar)</small></button><p class="muted best"></p>`,
    mount(el, b, ctx) {
      let count = 0;
      const best = ctx.store.best[b.id];
      el.querySelector(".best").textContent = best ? `Best: ${best}` : (b.hint ?? "");
      const tap = () => {
        count += 1;
        el.querySelector(".count").textContent = count;
        ctx.onActivity();
      };
      el.querySelector(".tap").addEventListener("click", tap);
      return { onSpace: tap, exit: () => count && ctx.record(b.id, count) };
    },
    check: (b) => (b.id ? null : "counter block needs an id"),
  },
};
