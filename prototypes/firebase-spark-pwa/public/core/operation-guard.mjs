export function createOperationGuard() {
  const pendingOperations = new Map();

  function normalizeKey(key) {
    return String(key ?? '').trim();
  }

  function isPending(key) {
    return pendingOperations.has(normalizeKey(key));
  }

  function run(key, operation) {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) throw new TypeError('La chiave dell’operazione è obbligatoria.');
    if (typeof operation !== 'function') throw new TypeError('L’operazione deve essere una funzione.');

    const pending = pendingOperations.get(normalizedKey);
    if (pending) return pending;

    const promise = Promise.resolve()
      .then(operation)
      .finally(() => {
        if (pendingOperations.get(normalizedKey) === promise) {
          pendingOperations.delete(normalizedKey);
        }
      });

    pendingOperations.set(normalizedKey, promise);
    return promise;
  }

  return Object.freeze({ isPending, run });
}
