export function normalizeRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision >= 0 ? revision : 0;
}

export function assertCurrentRevision(currentValue, expectedValue) {
  const current = normalizeRevision(currentValue);
  const expected = normalizeRevision(expectedValue);
  if (current !== expected) {
    const error = new Error('La scheda è stata modificata da un altro amministratore. Aggiorna prima di salvare.');
    error.code = 'aborted';
    throw error;
  }
  return current;
}

export function nextRevision(value) {
  return normalizeRevision(value) + 1;
}
