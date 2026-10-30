// Rimuove gli snapshot personali salvati dalle versioni precedenti dell'app.
const PREFIX = 'tavolaComune.personalCalendar.v1:';
const CLEANUP_MARKER = 'tavolaComune.personalCalendarSnapshotCleanup.v1';

function storageOrNull(storage) {
  try { return storage === undefined ? globalThis.localStorage : storage; } catch { return null; }
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

export function clearLegacyPersonalCalendarSnapshotsOnce(storage) {
  const target = storageOrNull(storage);
  if (!target) return;
  try {
    if (target.getItem(CLEANUP_MARKER) === 'done') return;
    clearPersonalCalendarSnapshots({}, target);
    target.setItem(CLEANUP_MARKER, 'done');
  } catch { /* La pulizia locale non deve interferire con accesso o avvio. */ }
}
