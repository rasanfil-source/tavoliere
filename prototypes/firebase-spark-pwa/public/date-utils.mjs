export function formatDateId(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

const centerDateFormatters = new Map();
const SERVER_CLOCK_SYNC_INTERVAL_MS = 15 * 60 * 1000;
const SERVER_CLOCK_RETRY_INTERVAL_MS = 5 * 1000;
const SERVER_CLOCK_REQUEST_TIMEOUT_MS = 2000;
let serverClockBase = null;
let serverClockLastAttemptMonotonicMs = Number.NEGATIVE_INFINITY;
let serverClockSyncPromise = null;
let serverClockStarted = false;
let serverClockRequestSequence = 0;
const serverClockListeners = new Set();

function monotonicNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function serverNow() {
  const monotonic = monotonicNow();
  if (!serverClockBase) return Date.now();
  if (monotonic - serverClockBase.monotonicMs >= SERVER_CLOCK_SYNC_INTERVAL_MS) {
    void synchronizeServerClock();
  }
  return Math.round(serverClockBase.serverMs + monotonic - serverClockBase.monotonicMs);
}

export async function synchronizeServerClock({ force = false } = {}) {
  const monotonic = monotonicNow();
  if (serverClockSyncPromise) return serverClockSyncPromise;
  if (!force && serverClockBase
      && monotonic - serverClockBase.monotonicMs < SERVER_CLOCK_SYNC_INTERVAL_MS) return true;
  if (!force && monotonic - serverClockLastAttemptMonotonicMs < SERVER_CLOCK_RETRY_INTERVAL_MS) {
    return Boolean(serverClockBase);
  }

  serverClockLastAttemptMonotonicMs = monotonic;
  serverClockSyncPromise = (async () => {
    if (typeof window === 'undefined' || typeof fetch !== 'function' || !window.location?.origin) return false;
    const requestUrl = new URL('/', window.location.origin);
    requestUrl.searchParams.set('_clock', String(++serverClockRequestSequence));
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const startedAt = monotonicNow();
    let timeoutId = 0;
    try {
      const request = fetch(requestUrl.href, {
        method: 'HEAD',
        mode: 'same-origin',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        signal: controller?.signal
      }).then((response) => ({ response }), () => ({ response: null }));
      const timeout = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => {
          controller?.abort();
          resolve({ response: null });
        }, SERVER_CLOCK_REQUEST_TIMEOUT_MS);
      });
      const { response } = await Promise.race([request, timeout]);
      if (!response?.ok) return false;
      if (response.url && new URL(response.url).origin !== window.location.origin) return false;
      const dateHeaderMs = Date.parse(response.headers.get('Date') || '');
      const receivedAt = monotonicNow();
      const roundTripMs = receivedAt - startedAt;
      if (!Number.isFinite(dateHeaderMs) || roundTripMs > SERVER_CLOCK_REQUEST_TIMEOUT_MS) return false;

      // L'intestazione HTTP ha risoluzione al secondo; il punto medio riduce
      // l'errore dovuto all'arrotondamento e al tempo di andata e ritorno.
      serverClockBase = {
        serverMs: dateHeaderMs + 500 + roundTripMs / 2,
        monotonicMs: receivedAt
      };
      serverClockListeners.forEach((listener) => {
        try { listener(serverNow()); } catch { /* La sincronizzazione dell'orologio non dipende dai consumatori. */ }
      });
      return true;
    } catch {
      return false;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  })().finally(() => {
    serverClockSyncPromise = null;
  });
  return serverClockSyncPromise;
}

export function subscribeServerClockUpdates(listener) {
  if (typeof listener !== 'function') return () => {};
  serverClockListeners.add(listener);
  return () => serverClockListeners.delete(listener);
}

export function startServerClockSync() {
  if (serverClockStarted || typeof window === 'undefined') return;
  serverClockStarted = true;
  void synchronizeServerClock();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void synchronizeServerClock();
  });
}

export function getDateInTimeZone(timezone = 'Europe/Rome', now = new Date()) {
  let formatter = centerDateFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    if (centerDateFormatters.size >= 8) centerDateFormatters.delete(centerDateFormatters.keys().next().value);
    centerDateFormatters.set(timezone, formatter);
  }
  // Memorizza il formattatore, non il giorno corrente, per rispettare ripresa dell'app e mezzanotte.
  const parts = formatter.formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Number(values.year), Number(values.month) - 1, Number(values.day), 12);
}
