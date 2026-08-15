export function createOperationGuard() {
  const pendingOperations = new Map();

  function isPending(key) {
    return pendingOperations.has(String(key));
  }

  function run(key, operation) {
    const normalizedKey = String(key || '').trim();
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
