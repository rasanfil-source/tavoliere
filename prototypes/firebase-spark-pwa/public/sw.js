const CACHE_PREFIX = 'tavola-comune-app-';
const CACHE_NAME = CACHE_PREFIX + 'v261';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/summary-matrix-refinements.css',
  '/app.js',
  '/summary-matrix-view.js',
  '/summary-matrix-model.js',
  '/html-utils.js',
  '/firebase-client.js',
  '/center-context.js',
  '/center-settings.js',
  '/refresh-schedule.js',
  '/date-utils.mjs',
  '/diet-utils.mjs',
  '/role-policy.mjs',
  '/schedule-utils.mjs',
  '/core/connectivity.mjs',
  '/core/operation-guard.mjs',
  '/core/state-store.mjs',
  '/core/user-error.mjs',
  '/domain/admin-overview.mjs',
  '/domain/administrator-auth.mjs',
  '/domain/participant-profile.mjs',
  '/i18n/i18n.mjs',
  '/manifest.webmanifest',
  '/manifest-kitchen.webmanifest',
  '/icons/launcher-192.png',
  '/icons/launcher-512.png',
  '/icons/splash-512.png',
  '/icons/whatsapp.svg'
];
const LAZY_MODULES = [
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
      .then(() => self.skipWaiting())
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
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
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

  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    event.respondWith(staleWhileRevalidate(event.request, event.request, event));
  }
});

function isAppResourcePath(pathname) {
  return APP_SHELL.includes(pathname) || LAZY_MODULES.includes(pathname);
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
    const response = await fetch(request);
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
