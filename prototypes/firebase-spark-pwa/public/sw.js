const CACHE_PREFIX = 'tavola-comune-app-';
const CACHE_NAME = CACHE_PREFIX + 'v456';
const SHELL_ENTRY = '/app.js?v=20261014b';
const HTML_NETWORK_TIMEOUT_MS = 1200;
// Solo file SDK pubblici e immutabili: sono escluse risposte Auth e dati di sessione.
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
  '/core/firebase-runtime-policy.mjs',
  '/core/startup-timing.mjs',
  '/core/personal-calendar-cache.mjs',
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
  '/admin-participant-data.js',
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
  event.waitUntil(precacheInstalledShell());
});

async function precacheInstalledShell() {
  // Scarica soltanto l'URL canonico: gli indirizzi di navigazione possono contenere credenziali.
  const response = await fetch('/index.html', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Offline shell unavailable');
  const html = await response.clone().text();
  const expected = new URL(SHELL_ENTRY, self.location.origin).href;
  const entries = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  if (!entries.some(([, path]) => new URL(path, self.location.origin).href === expected)) {
    throw new Error('Offline shell belongs to another release');
  }
  const cache = await caches.open(CACHE_NAME);
  const resources = APP_SHELL.filter((path) => path !== '/' && path !== '/index.html')
    .map((path) => /\.(?:m?js|css)$/.test(path) && !isBundledAssetPath(path) ? `${path}?v=20261014b` : path);
  await cache.addAll(resources);
  // L'HTML viene pubblicato in cache quando tutte le risorse necessarie sono disponibili.
  await cache.put('/index.html', response);
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Il precaricamento è facoltativo: la sua assenza non impedisce l'attivazione del worker o la disponibilità della pagina senza rete.
      Promise.resolve().then(() => self.registration?.navigationPreload?.enable())
        .catch(() => undefined),
      caches.keys()
        .then((names) => Promise.all(names
          .filter((name) => (
            name.startsWith(CACHE_PREFIX)
            || name.startsWith('tavola-comune-spark-gate-')
          ) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))))
        .then(() => self.clients.claim())
        // La prima pagina carica questi moduli prima del controllo del worker. La cache viene popolata dopo l'acquisizione delle pagine, senza ritardare l'avvio.
        .then(() => Promise.allSettled(FIREBASE_SDK.map((url) => sdkCacheFirst(url))))
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_APPLICATION_CACHE') return;
  const purge = caches.keys().then((names) => Promise.all(names
    .filter((name) => name.startsWith(CACHE_PREFIX))
    .map((name) => caches.delete(name))));
  const ready = purge.then(() => precacheInstalledShell().then(() => true, () => false));
  event.waitUntil(ready);
  if (event.ports?.[0]) {
    ready.then((offlineReady) => event.ports[0].postMessage({ ok: true, offlineReady }));
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
    event.respondWith(networkFirst(event.request, '/index.html', event));
    return;
  }

  if (url.origin === self.location.origin && isBundledAssetPath(url.pathname)) {
    event.respondWith(sdkCacheFirst(event.request));
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
  const start = new URL(url.pathname === '/manifest-kitchen.webmanifest'
    ? '/?view=kitchen' : '/?access=friendly', self.location.origin);
  start.searchParams.set('c', url.searchParams.get('c'));
  manifest.start_url = start.pathname + start.search;
  // Identità stabile per centro e vista, indipendente dagli identificatori delle risorse.
  manifest.id = manifest.start_url;
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function isAppResourcePath(pathname) {
  return APP_SHELL.some((path) => path.split('?')[0] === pathname) || LAZY_MODULES.includes(pathname);
}

function isBundledAssetPath(pathname) {
  return /^\/assets\/[a-zA-Z0-9_-]+-[A-Z0-9]{8}\.(?:js|css)$/.test(pathname);
}

async function sdkCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME).catch(() => null);
  const cached = await cache?.match(request).catch(() => undefined);
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok && cache) {
    // I limiti di archiviazione non impediscono l'uso dell'SDK già scaricato.
    await cache.put(request, response.clone()).catch(() => undefined);
  }
  return response;
}

async function versionedCacheFirst(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME).catch(() => null);
  const exactMatch = await cache?.match(request).catch(() => undefined);
  if (exactMatch) {
    return exactMatch;
  }

  try {
    const response = await fetch(request);
    if (cache && response && (response.ok || response.type === 'opaque')) {
      await Promise.all([
        cache.put(request, response.clone()),
        cache.put(fallbackPath, response.clone())
      ]).catch(() => undefined);
    }
    return response;
  } catch (error) {
    const fallback = await cache?.match(fallbackPath).catch(() => undefined);
    // HTML e moduli della cache devono appartenere allo stesso insieme coerente di risorse.
    if (fallback?.url && new URL(fallback.url).searchParams.get('v')
        === new URL(request.url || request, self.location.origin).searchParams.get('v')) {
      return fallback;
    }
    throw error;
  }
}

async function networkFirst(request, fallbackPath, event) {
  // Rete e cache vengono consultate in parallelo; l'indisponibilità di Cache Storage non invalida una risposta di rete riuscita.
  const cachePromise = caches.open(CACHE_NAME).catch(() => null);
  const cachedPromise = cachePromise.then((cache) =>
    cache?.match(fallbackPath || '/index.html').catch(() => undefined));
  // Il precaricamento pendente rappresenta già la richiesta di navigazione. fetch viene usato solo se il precaricamento è assente o fallisce.
  const network = Promise.resolve(event?.preloadResponse)
    .catch(() => undefined)
    .then((response) => response || fetch(request, { cache: 'no-cache' }));
  // HTML e APP_SHELL vengono installati atomicamente per l'uso senza rete. La navigazione non sostituisce singolarmente l'HTML in cache e gli URL con token non vengono salvati.
  let timer;
  try {
    const result = await Promise.race([
      network.then((response) => ({ response }), (error) => ({ error })),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), HTML_NETWORK_TIMEOUT_MS);
      })
    ]);
    if (result.response?.ok) return result.response;
    const cached = await cachedPromise;
    if (cached) return cached;
    // In assenza di una pagina salvata viene conservata la richiesta originale, senza duplicare il download.
    if (result.response) return result.response;
    if (result.error) throw result.error;
    return await network;
  } finally {
    clearTimeout(timer);
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
