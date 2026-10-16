// Cache limitata alla visualizzazione. L'UID deve provenire da Firebase Auth risolto; la cache non attribuisce identità né permessi.
const PREFIX = 'tavolaComune.personalCalendar.v1:';
const TTL_MS = 72 * 60 * 60 * 1000;
const MAX_ENTRIES = 4;
const MAX_CHARS = 48000;

function storageOrNull(storage) {
  try { return storage === undefined ? globalThis.localStorage : storage; } catch { return null; }
}

function keyFor(scope) {
  if (!scope || !['week', 'participant'].includes(scope.view)) return null;
  const fields = ['centerId', 'uid', 'participantId', 'start', 'end'];
  if (fields.some((field) => typeof scope[field] !== 'string'
      || !scope[field] || scope[field].length > 128)) return null;
  if (![scope.start, scope.end].every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))) return null;
  return PREFIX + JSON.stringify(fields.map((field) => scope[field]).concat(scope.view));
}

function safeDays(days, scope) {
  if (!Array.isArray(days) || days.length < 1 || days.length > 31) return null;
  const start = Date.parse(scope.start + 'T00:00:00Z');
  if (!Number.isFinite(start)) return null;
  const cleaned = [];
  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    if (day?.date !== date || !Array.isArray(day.meals)
        || day.meals.length < 1 || day.meals.length > 8) return null;
    const meals = [];
    const ids = new Set();
    for (const meal of day.meals) {
      if (typeof meal?.mealTypeId !== 'string' || !/^[\w-]{1,64}$/.test(meal.mealTypeId)
          || ids.has(meal.mealTypeId) || !['PRESENT', 'ABSENT'].includes(meal.effect)
          || typeof meal.label !== 'string' || meal.label.length > 100) return null;
      ids.add(meal.mealTypeId);
      meals.push({ mealTypeId: meal.mealTypeId, label: meal.label, effect: meal.effect,
        mealDate: date, mealWindowId: `${date}_${meal.mealTypeId}`, isOpen: false, closesAt: null });
    }
    cleaned.push({ date, meals });
  }
  if (cleaned.at(-1).date !== scope.end) return null;
  return cleaned;
}

function entries(storage) {
  const keys = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  return keys;
}

export function clearPersonalCalendarSnapshots({ centerId, uid, participantId } = {}, storage) {
  try {
    const target = storageOrNull(storage);
    if (!target) return;
    for (const key of entries(target)) {
      let scope;
      try { scope = JSON.parse(key.slice(PREFIX.length)); } catch { target.removeItem(key); continue; }
      if (!Array.isArray(scope)) { target.removeItem(key); continue; }
      if ((!centerId || scope[0] === centerId) && (!uid || scope[1] === uid)
          && (!participantId || scope[2] === participantId)) target.removeItem(key);
    }
  } catch { /* La persistenza è facoltativa; le credenziali Firebase restano inalterate. */ }
}

export function loadPersonalCalendarSnapshot(scope, { storage, now = Date.now() } = {}) {
  try {
    const key = keyFor(scope);
    const target = storageOrNull(storage);
    if (!key || !target) return null;
    const raw = target.getItem(key);
    if (!raw) return null;
    const payload = raw.length <= MAX_CHARS ? JSON.parse(raw) : null;
    const days = payload?.schema === 1 && keyFor(payload.scope) === key
      && Number.isFinite(payload.savedAt) && payload.savedAt <= now
      && now - payload.savedAt <= TTL_MS ? safeDays(payload.days, scope) : null;
    if (!days) { target.removeItem(key); return null; }
    return { days, savedAt: payload.savedAt };
  } catch { return null; }
}

export function savePersonalCalendarSnapshot(scope, days, { storage, now = Date.now(), serverConfirmed = false } = {}) {
  if (!serverConfirmed) return false;
  try {
    const target = storageOrNull(storage);
    const key = keyFor(scope);
    const cleaned = key && safeDays(days, scope);
    if (!target || !cleaned) return false;
    const raw = JSON.stringify({ schema: 1, scope, savedAt: now, days: cleaned });
    if (raw.length > MAX_CHARS) return false;
    const retained = [];
    for (const oldKey of entries(target)) {
      try {
        const saved = JSON.parse(target.getItem(oldKey));
        if (!Number.isFinite(saved?.savedAt) || now - saved.savedAt > TTL_MS || saved.savedAt > now) {
          target.removeItem(oldKey);
        } else if (oldKey !== key) retained.push([oldKey, saved.savedAt]);
      } catch { target.removeItem(oldKey); }
    }
    retained.sort((left, right) => right[1] - left[1]);
    for (const [oldKey] of retained.slice(MAX_ENTRIES - 1)) target.removeItem(oldKey);
    target.setItem(key, raw);
    return true;
  } catch { return false; }
}
