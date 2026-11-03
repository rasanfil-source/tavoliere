// Modulo senza inizializzazione, traduzioni o accessi a rete/storage all'import.
// Viene istanziato soltanto quando l'utente salva un singolo pasto.
export function createPendingMealTracker({ now = () => Date.now(), delayMs = 12000,
  schedule = (fn, ms) => setTimeout(fn, ms), cancel = id => clearTimeout(id), onWaiting = () => {} } = {}) {
  const entries = new Map();
  let timer = null;
  function notify() {
    if (timer !== null) cancel(timer);
    timer = null;
    for (const entry of entries.values()) {
      if (!entry.waiting && now() - entry.startedAt >= delayMs) {
        entry.waiting = true;
        onWaiting(entry);
      }
    }
    arm();
  }
  function arm() {
    if (timer !== null) cancel(timer);
    const remaining = [...entries.values()].filter(entry => !entry.waiting)
      .map(entry => Math.max(0, delayMs - (now() - entry.startedAt)));
    timer = remaining.length ? schedule(notify, Math.min(...remaining)) : null;
  }
  return {
    begin(key, value) {
      const previous = entries.get(key);
      if (previous && (!previous.isCurrent || previous.isCurrent())) return null;
      const entry = { ...value, key, startedAt: now(), waiting: false };
      entries.set(key, entry);
      arm();
      return entry;
    },
    finish(entry) {
      if (entries.get(entry.key) !== entry) return false;
      entries.delete(entry.key);
      arm();
      return true;
    },
    get: key => entries.get(key),
    values: () => [...entries.values()],
    check: notify
  };
}
