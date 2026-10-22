# Guitarra

A small practice app for getting back into guitar, built a little at a time.

## What it does today

- **Routines**: guided practice sessions made of timed steps. Each step shows instructions, tabs and chord diagrams, can set the metronome, and moves on by itself with a chime. Pick a routine from the menu; the app remembers your choice.
  - *1. Chords 1: A, D and E*: chord-perfect practice, one-minute changes, strumming on the beat, and the D DU UDU strum pattern.
  - *2. Fingerpicking 1*: thumb on the bass, p-i-m-a, and pinch patterns over A, D and E.
- **Road to Blackbird**: routines are grouped into a learning path, with the next stages listed in the app.
- **Metronome** with an accented first beat that follows each step's tempo (or runs on its own).
- **Tap counters** for drills like one-minute changes, with best scores kept per drill.
- **Practice log** of finished sessions, saved in your browser.

## Run it

No build step. Serve the folder and open it in a browser:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(It uses ES modules, so opening `index.html` straight from disk won't work.)

## How routines work

A routine is plain data in `js/routines/`. Each step has a title, a length in minutes, an optional metronome setting, and a list of **blocks**:

```js
{
  title: "Pinch",
  minutes: 7,
  metronome: { bpm: 60 },
  blocks: [
    { type: "text", text: "Thumb and ring finger pluck together..." },
    { type: "tab", label: "pinch i m", tab: `e|-0---...` },
    { type: "chords", chords: ["A", "D", "E"] },
  ],
}
```

Block types today: `text`, `chords`, `tab`, `link` and `counter` (tap to count reps; set `waitForTap: true` on the step to start its timer on the first tap). Reusable steps such as tuning, warm-ups and one-minute changes live in `js/routines/helpers.js`.

- **New routine**: add a file to `js/routines/` and list it in `js/routines/index.js`.
- **New kind of task** (pitch check, tab player, a quiz...): add a block type to `js/blocks.js` with `render`, and optionally `mount` for interactive behaviour and `check` for validation. Every routine can then use it.

`npm test` checks every routine against the format (known block types, known chords, sensible tempos).

## Code map

- `js/routines/`: the routines, shared step helpers, and the roadmap.
- `js/blocks.js`: block types a step can contain.
- `js/routine.js`: routine format and validation.
- `js/app.js`: routine player, UI and keyboard shortcuts.
- `js/metronome.js`: Web Audio metronome.
- `js/chords.js`, `js/chord-diagram.js`: chord shapes and SVG chord boxes.
- `js/store.js`: localStorage for best scores, history and the last routine.

## Next ideas

Pitch detection as a block that checks notes against a target, more routines along the road to Blackbird (G, C, Em, Am; alternating bass; the Blackbird intro), tab import and play-along.
