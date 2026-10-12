const CACHE_PREFIX = 'tavola-comune-app-';
const CACHE_NAME = CACHE_PREFIX + 'v451';
// Only public, immutable SDK files: never Auth API responses or session data.
const FIREBASE_SDK = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js']
  .map((file) => `https://www.gstatic.com/firebasejs/12.17.0/${file}`);
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/summary-contact-hint.mjs',
  '/html-utils.js',
  '/firebase-client.js',
  '/center-context.js',
  '/center-settings.js',
  '/refresh-schedule.js',
  '/date-utils.mjs',
  '/diet-utils.mjs',
  '/diet-legend.mjs',
  '/role-policy.mjs',
  '/schedule-utils.mjs',
  '/meal-reminders.mjs',
  '/core/connectivity.mjs',
  '/core/auth-session-policy.mjs',
  '/core/auth-state-machine.mjs',
  '/core/operation-guard.mjs',
  '/core/state-store.mjs',
  '/core/user-error.mjs',
  '/domain/admin-overview.mjs',
  '/domain/administrator-auth.mjs',
  '/domain/participant-profile.mjs',
  '/i18n/i18n.mjs',
  '/manifest.webmanifest',
  '/manifest-kitchen.webmanifest',
  '/icons/splash-512-transparent.png?v=20260824a',
  '/icons/whatsapp.svg'
];
const LAZY_MODULES = [
  '/summary-matrix-refinements.css',
  '/summary-matrix-view.js',
  '/summary-matrix-model.js',
  '/icons/happyduck.png',
  '/access-links.js',
  '/audit-log.js',
  '/calendar-configuration.js',
  '/admin-center.js',
  '/bootstrap-demo.js',
  '/daily-operations.js',
  '/kitchen-data.js',
  '/kitchen-notes.js',
  '/participant-data.js',
  '/reservation-state.mjs',
  '/core/revision.mjs',
  '/domain/center-backup.mjs',
  '/domain/center-restore.mjs',
  '/i18n/it.json',
  '/i18n/en.json',
  '/i18n/fr.json',
  '/i18n/es.json',
  '/i18n/de.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => (
          name.startsWith(CACHE_PREFIX)
          || name.startsWith('tavola-comune-spark-gate-')
        ) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
      // The first page loads these modules before the worker takes control.
      // Warm their cache after claiming clients, without delaying app startup.
      .then(() => Promise.allSettled(FIREBASE_SDK.map((url) => sdkCacheFirst(url))))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_APPLICATION_CACHE') return;
  const purge = caches.keys().then((names) => Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX))
    .map((name) => caches.delete(name))));
  event.waitUntil(purge);
  if (event.ports?.[0]) {
    purge.then(() => event.ports[0].postMessage({ ok: true }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/?view=participant', self.location.origin);
  if (event.action === 'disable') {
    targetUrl.searchParams.set('mealReminders', 'off');
  }

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(async (windowClients) => {
      const existingClient = windowClients.find((client) => (
        new URL(client.url).origin === self.location.origin
      ));
      if (existingClient) {
        await existingClient.navigate(targetUrl.toString());
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl.toString());
    }));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin
      && ['/manifest.webmanifest', '/manifest-kitchen.webmanifest'].includes(url.pathname)
      && /^[a-z0-9][a-z0-9_-]{1,63}$/i.test(url.searchParams.get('c') || '')) {
    event.respondWith(centerManifest(url));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html'));
    return;
  }

  if (url.origin === self.location.origin && isAppResourcePath(url.pathname)) {
    if (url.searchParams.has('v')) {
      event.respondWith(versionedCacheFirst(event.request, url.pathname));
      return;
    }
    event.respondWith(staleWhileRevalidate(event.request, url.pathname, event));
    return;
  }

  if (url.origin === 'https://www.gstatic.com' && /^\/firebasejs\/\d+\.\d+\.\d+\/[^/]+\.js$/.test(url.pathname)) {
    event.respondWith(sdkCacheFirst(event.request));
  }
});

async function centerManifest(url) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(url.pathname) || await fetch(url.pathname);
  const manifest = await response.json();
  const start = new URL(manifest.start_url, self.location.origin);
  start.searchParams.set('c', url.searchParams.get('c'));
  manifest.start_url = start.pathname + start.search;
  // Identità stabile per centro e vista, indipendente dalla versione degli asset.
  manifest.id = manifest.start_url;
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function isAppResourcePath(pathname) {
  return APP_SHELL.some((path) => path.split('?')[0] === pathname) || LAZY_MODULES.includes(pathname);
}

async function sdkCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME).catch(() => null);
  const cached = await cache?.match(request).catch(() => undefined);
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok && cache) {
    // Storage limits must not prevent a successfully downloaded SDK from loading.
    await cache.put(request, response.clone()).catch(() => undefined);
  }
  return response;
}

async function versionedCacheFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);
  const exactMatch = await cache.match(request);
  if (exactMatch) {
    return exactMatch;
  }

  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      await Promise.all([
        cache.put(request, response.clone()),
        cache.put(fallbackPath, response.clone())
      ]);
    }
    return response;
  } catch (error) {
    const fallback = await cache.match(fallbackPath);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // Le viste dell'app condividono la stessa shell HTML e differiscono solo
    // nei parametri (?view=week, ?view=summary, ...). Il normale HTTP cache
    // del browser poteva quindi restituire per un'ora una shell precedente,
    // mentre il passaggio a un altro parametro caricava quella nuova. La
    // Cache Storage resta il ripiego offline; online la navigazione deve
    // sempre riconvalidare la shell pubblicata.
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && (response.ok || response.type === 'opaque')) {
      // Gli URL di navigazione possono contenere centro e token di accesso.
      // Una chiave canonica conserva una sola copia della struttura applicativa.
      await cache.put(fallbackPath || request, response.clone());
    }
    return response;
  } catch (error) {
    const directMatch = await cache.match(fallbackPath || request, { ignoreSearch: true });
    if (directMatch) {
      return directMatch;
    }
    if (fallbackPath) {
      const fallback = await cache.match(fallbackPath);
      if (fallback) {
        return fallback;
      }
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheKey, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(cacheKey);
  const update = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(cacheKey, response.clone());
      }
      return response;
    });

  if (cached) {
    event.waitUntil(update.catch(() => undefined));
    return cached;
  }

  return update;
}
