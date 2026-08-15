export function createStateStore(initialState = {}) {
  let revision = 0;
  let state = Object.freeze({ ...initialState });
  const listeners = new Set();
  const requestRevisions = new Map();

  function getState() {
    return state;
  }

  function getRevision() {
    return revision;
  }

  function update(change) {
    const patch = typeof change === 'function' ? change(state) : change;
    if (!patch || typeof patch !== 'object') return state;

    state = Object.freeze({ ...state, ...patch });
    revision += 1;
    listeners.forEach((listener) => listener(state, revision));
    return state;
  }

  function beginRequest(scope) {
    const normalizedScope = String(scope || 'default');
    const requestRevision = (requestRevisions.get(normalizedScope) || 0) + 1;
    requestRevisions.set(normalizedScope, requestRevision);
    return Object.freeze({ scope: normalizedScope, revision: requestRevision });
  }

  function isCurrentRequest(request) {
    return Boolean(request)
      && requestRevisions.get(request.scope) === request.revision;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Il listener deve essere una funzione.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    beginRequest,
    getRevision,
    getState,
    isCurrentRequest,
    subscribe,
    update
  });
}
