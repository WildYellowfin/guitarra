// Per-exercise tempo and best results, kept in this browser's localStorage.

const KEY = "guitarra:v2";

export function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data) return { bpm: data.bpm ?? {}, best: data.best ?? {} };
  } catch {
    // Storage blocked or corrupt; start fresh.
  }
  return { bpm: {}, best: {} };
}

export function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Nothing we can do; playing still works without saving.
  }
}
