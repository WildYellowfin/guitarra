# Guitarra

A small practice app for getting back into guitar, built a little at a time.

## What it does today

- **Guided 30-minute session** ("Day 1: A, D and E"): tune, warm up, practice each chord, one-minute chord changes, strumming on the beat, then a song. Each step has a countdown, instructions and chord diagrams, and moves on by itself with a chime.
- **Metronome** with an accented first beat. Each step can set its own tempo and start or stop the click for you.
- **One-minute changes counter**: tap the button (or space bar) every time you switch chords. Best scores are kept per chord pair.
- **Practice log** of finished sessions, saved in your browser.

## Run it

No build step. Serve the folder and open it in a browser:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(It uses ES modules, so opening `index.html` straight from disk won't work.)

## Code map

- `js/sessions.js`: the practice plans and chord shapes. Add a session or step here.
- `js/app.js`: session timer, UI and keyboard shortcuts.
- `js/metronome.js`: Web Audio metronome.
- `js/chord-diagram.js`: SVG chord boxes.
- `js/store.js`: localStorage for best scores and history.

## Next ideas

Pitch detection to check notes against a target, more sessions (G, C, Em, fingerpicking patterns), tab import and play-along.
