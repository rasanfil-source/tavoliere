// Solo dati per la riconciliazione: nessuna inizializzazione o I/O all'import.
export const PENDING_MEAL_PREFIX = 'tavolaComune.mealPending.v1:';

function validPart(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('/');
}

export function mealJournalScope(scope) {
  if (![scope?.uid, scope?.centerId, scope?.participantId].every(validPart)) return null;
  return PENDING_MEAL_PREFIX + [scope.uid, scope.centerId, scope.participantId].map(encodeURIComponent).join(':') + ':';
}

function sanitize(value) {
  if (!mealJournalScope(value) || !validPart(value.requestId) || !validPart(value.mealWindowId)
      || !validPart(value.mealTypeId) || !/^\d{4}-\d{2}-\d{2}$/.test(value.mealDate)
      || !['PRESENT', 'ABSENT'].includes(value.effect)
      || !Number.isFinite(value.startedAt) || value.startedAt <= 0) return null;
  const { uid, centerId, participantId, requestId, mealWindowId, mealDate, mealTypeId, effect, startedAt } = value;
  return { schema: 1, uid, centerId, participantId, requestId, mealWindowId, mealDate, mealTypeId, effect, startedAt };
}

export function createPendingMealJournal({ storage, now = () => Date.now(),
  requestId = () => globalThis.crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}` } = {}) {
  const keyFor = value => mealJournalScope(value) + encodeURIComponent(value.requestId);
  const removed = new Set();
  return {
    create(scope, meal, effect) {
      const record = sanitize({ ...scope, mealWindowId: meal.mealWindowId, mealDate: meal.mealDate,
        mealTypeId: meal.mealTypeId, effect, startedAt: now(), requestId: requestId() });
      if (!record) throw new Error('Invalid pending meal');
      return record;
    },
    put(value) {
      const record = sanitize(value);
      if (!record) return false;
      try {
        if (!storage) return false;
        storage.setItem(keyFor(record), JSON.stringify(record));
        return true;
      } catch { return false; }
    },
    list(scope) {
      const prefix = mealJournalScope(scope), records = [];
      if (!prefix) return records;
      try {
        for (let index = 0; index < (storage?.length || 0); index++) {
          const key = storage.key(index);
          if (!key?.startsWith(prefix)) continue;
          try {
            const value = JSON.parse(storage.getItem(key));
            const record = value?.schema === 1 && sanitize(value);
            if (record && key === keyFor(record) && !removed.has(key)) records.push(record);
          } catch { /* Un record corrotto non deve influire sulla sessione. */ }
        }
      } catch { /* Storage non disponibile: il tracciamento in memoria continua. */ }
      return records;
    },
    remove(value) {
      const record = sanitize(value);
      if (!record) return;
      removed.add(keyFor(record));
      try { storage?.removeItem(keyFor(record)); } catch { /* Riprovato alla prossima verifica. */ }
    }
  };
}

export function isDefinitiveMealFailure(error) {
  return error?.mealWriteNotStarted === true || error?.mealWriteMayHaveCommitted !== true && ['permission-denied', 'invalid-argument',
    'unauthenticated', 'not-found', 'already-exists'].includes(String(error?.code || '').replace(/^firestore\//, ''));
}
