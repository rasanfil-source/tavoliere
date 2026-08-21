import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const serviceWorker = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/sw.js', import.meta.url),
  'utf8'
);

const app = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url),
  'utf8'
);

const index = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
  'utf8'
);

test('il service worker separa il nucleo iniziale dai moduli caricati per vista', () => {
  assert.match(serviceWorker, /'\/firebase-client\.js'/);
  assert.match(serviceWorker, /'\/center-settings\.js'/);
  assert.match(serviceWorker, /const LAZY_MODULES = \[/);
  assert.match(serviceWorker, /'\/kitchen-data\.js'/);
  assert.match(serviceWorker, /'\/kitchen-notes\.js'/);
  assert.match(serviceWorker, /'\/daily-operations\.js'/);
  assert.match(serviceWorker, /'\/participant-data\.js'/);
  assert.match(serviceWorker, /'\/reservation-state\.mjs'/);
  assert.match(serviceWorker, /'\/manifest-kitchen\.webmanifest'/);
  assert.match(serviceWorker, /'\/icons\/whatsapp\.svg'/);
});

test('ogni import statico locale dell applicazione appartiene alla cache offline', () => {
  const staticImports = [...app.matchAll(/from '\.\/([^'?]+)(?:\?[^']*)?'/g)]
    .map(([, path]) => `/${path}`);
  assert.ok(staticImports.length > 10);
  for (const path of staticImports) {
    assert.match(serviceWorker, new RegExp(`'${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  }
});

test('la vista cucina usa un manifest installabile distinto', () => {
  assert.match(index, /data-app-manifest/);
  assert.match(index, /params\.get\('view'\) !== 'kitchen'/);
  assert.match(index, /manifest-kitchen\.webmanifest/);
});

test('service worker handles only navigation, app resources, and Firebase SDK requests', () => {
  assert.match(serviceWorker, /event\.request\.mode === 'navigate'/);
  assert.match(serviceWorker, /url\.origin === self\.location\.origin && isAppResourcePath\(url\.pathname\)/);
  assert.match(serviceWorker, /url\.hostname === 'www\.gstatic\.com' && url\.pathname\.includes\('\/firebasejs\/'\)/);
});

test('service worker keeps navigation network-first with an offline cache fallback', () => {
  assert.match(serviceWorker, /const response = await fetch\(request\)/);
  assert.match(serviceWorker, /cache\.put\(fallbackPath \|\| request, response\.clone\(\)\)/);
  assert.match(serviceWorker, /cache\.match\(fallbackPath \|\| request, \{ ignoreSearch: true \}\)/);
  assert.match(serviceWorker, /networkFirst\(event\.request, '\/index\.html'\)/);
});

test('versioned app shell files load the exact release with an offline fallback', () => {
  assert.match(serviceWorker, /url\.searchParams\.has\('v'\)/);
  assert.match(serviceWorker, /versionedCacheFirst\(event\.request, url\.pathname\)/);
  assert.match(serviceWorker, /const exactMatch = await cache\.match\(request\)/);
  assert.match(serviceWorker, /cache\.put\(request, response\.clone\(\)\)/);
  assert.match(serviceWorker, /cache\.put\(fallbackPath, response\.clone\(\)\)/);
  assert.match(serviceWorker, /const fallback = await cache\.match\(fallbackPath\)/);
});

test('la release corrente invalida insieme applicazione stile impostazioni e cache PWA', () => {
  assert.match(index, /styles\.css\?v=20260819b/);
  assert.match(index, /summary-matrix-refinements\.css\?v=20260820c/);
  assert.match(index, /app\.js\?v=20260821d/);
  assert.match(index, /manifest\.webmanifest\?v=20260816a/);
  assert.match(index, /launcher-192\.png\?v=20260816a/);
  assert.match(app, /center-settings\.js\?v=20260820a/);
  assert.match(serviceWorker, /CACHE_NAME = CACHE_PREFIX \+ 'v355'/);
  assert.match(serviceWorker, /CLEAR_APPLICATION_CACHE/);
  assert.match(serviceWorker, /launcher-512\.png\?v=20260816a/);
});

test('la barra partecipante puo omettere il pulsante di aggiornamento senza bloccare l avvio', () => {
  assert.doesNotMatch(index, /data-participant-refresh/);
  assert.match(app, /participantRefreshButton\?\.addEventListener/);
  assert.match(app, /if \(elements\.participantRefreshButton\) \{\s*elements\.participantRefreshButton\.hidden = true;/);
});

test('il pannello amministrativo richiama solo funzioni esistenti durante il primo rendering', () => {
  assert.doesNotMatch(app, /syncAdminCenterAvatarState/);
  assert.match(app, /renderAdminCenterAvatarEditor\(\)/);
});

test('the app registers the service worker and no longer unregisters it at startup', () => {
  assert.match(app, /navigator\.serviceWorker\.register\('\/sw\.js'/);
  assert.doesNotMatch(app, /\.unregister\(\)/);
  assert.doesNotMatch(index, /\.unregister\(\)/);
});

test('a newly activated service worker reloads the page once', () => {
  assert.match(app, /addEventListener\('controllerchange'/);
  assert.match(app, /reloadingForUpdate/);
  assert.match(app, /register\('\/sw\.js', \{ updateViaCache: 'none' \}\)/);
  assert.match(app, /registration\.update\(\)/);
});
