// Practice history and best scores, kept in this browser's localStorage.

const KEY = "guitarra:v1";

export function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data) return { best: data.best ?? {}, history: data.history ?? [] };
  } catch {
    // Storage blocked or corrupt; start fresh.
  }
  return { best: {}, history: [] };
}

export function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Nothing we can do; the session still works without saving.
  }
}
