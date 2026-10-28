export function createStateStore(initialState = {}) {
  let revision = 0;
  let state = Object.freeze({ ...initialState });
  const listeners = new Set();
  const requestRevisions = new Map();
  const pendingNotifications = [];
  let notifying = false;

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
    pendingNotifications.push({ state, revision });
    if (!notifying) {
      notifying = true;
      try {
        while (pendingNotifications.length > 0) {
          const notification = pendingNotifications.shift();
          [...listeners].forEach((listener) => listener(notification.state, notification.revision));
        }
      } finally {
        notifying = false;
      }
    }
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
