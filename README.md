# Guitarra

A guitar practice app that listens while you play.

Pick an exercise and it goes full screen. Notes scroll toward you on a highway with one lane per string. Under the highway, a fretboard shows the chord shape and which finger goes where for the note you play next. The app listens through your computer's mic:

- **It waits for you.** Nothing moves until you play the first note, and then the metronome starts. If a note reaches the line and you haven't played it, everything stops with that note on the line. Play it and everything carries on.
- **It knows which string you plucked**, even when the other strings are still ringing, as they do in fingerpicking. If you play a wrong note, it tells you what it heard.
- **Streak, on-time % and loop count** are shown while you play. Your best run is saved.

Today there is one exercise: a p-i-m-a-m-i fingerpicking pattern over A, D, A, E. It is the first step on the road to Blackbird.

## Run it

```sh
npm start            # python3 -m http.server 8000
# open http://localhost:8000 and allow the microphone
```

The mic only works on `localhost` or HTTPS. Keys while playing: Space pauses, ↑/↓ change the tempo, Esc leaves.

## How it works

- `js/audio/analysis.js`: note detection. Every frame it takes an FFT of the mic signal, measures energy per semitone, and scores each possible note by how much *new* energy appeared across its harmonics. This means a freshly plucked note stands out from strings that are still ringing. Pure functions, tested in Node.
- `js/audio/mic.js`: mic input and the metronome click, on one audio clock.
- `js/play/session.js`: the play-along rules (ready / playing / waiting / paused, hits, streaks, click scheduling). It doesn't draw or make sound, so it's unit-tested.
- `js/play/highway.js`: the canvas renderer for the highway, the fretboard and the hit effects.
- `js/exercises.js`: exercises as data. `fingerpicking(chords, pattern)` builds the notes from chord shapes in `js/chords.js`, so a new pattern or progression is a few lines.
- `js/main.js`: the landing page, the game loop and the HUD.

## Tests

```sh
npm test
```

Runs the detector against synthesized plucked-string audio (Karplus-Strong). The tests check that it catches every note of an arpeggio while the earlier notes ring, at loud and quiet levels, and that it rejects notes one or two frets off. They also cover the play-along rules: waiting, resuming, looping, and click scheduling.
