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

const appManifest = JSON.parse(readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/manifest.webmanifest', import.meta.url),
  'utf8'
));

const kitchenManifest = JSON.parse(readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/manifest-kitchen.webmanifest', import.meta.url),
  'utf8'
));

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

test('il desktop mobile presenta l app principale come Oggi a tavola', () => {
  assert.equal(appManifest.name, 'Oggi a tavola');
  assert.equal(appManifest.short_name, 'Oggi a tavola');
  assert.equal(kitchenManifest.short_name, 'Cucina');
});

test('Android riceve icone maskable a fondo pieno senza cornice bianca automatica', () => {
  for (const manifest of [appManifest, kitchenManifest]) {
    const maskableIcons = manifest.icons.filter((icon) => icon.purpose === 'maskable');
    assert.deepEqual(maskableIcons.map((icon) => icon.sizes), ['192x192', '512x512']);
    assert.ok(maskableIcons.every((icon) => /\/icons\/launcher-(192|512)-maskable\.png\?v=20260822a/.test(icon.src)));
  }
});

test('lo splash nativo e quello TAT condividono lo stesso colore di fondo', () => {
  assert.equal(appManifest.background_color, '#f7f5ef');
  assert.equal(kitchenManifest.background_color, '#f7f5ef');
  assert.match(index, /splash-512-blended\.png\?v=20260822a/);
  assert.match(index, /fetchpriority="high"/);
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
  assert.match(index, /styles\.css\?v=20260823d/);
  assert.match(index, /summary-matrix-refinements\.css\?v=20260823f/);
  assert.match(index, /app\.js\?v=20260823k/);
  assert.match(index, /manifest\.webmanifest\?v=20260822c/);
  assert.match(index, /launcher-192\.png\?v=20260821a/);
  assert.match(app, /center-settings\.js\?v=20260823b/);
  assert.match(serviceWorker, /CACHE_NAME = CACHE_PREFIX \+ 'v411'/);
  assert.match(serviceWorker, /'\/diet-legend\.mjs'/);
  assert.match(serviceWorker, /CLEAR_APPLICATION_CACHE/);
  assert.match(serviceWorker, /launcher-512\.png\?v=20260821a/);
  assert.match(serviceWorker, /launcher-512-maskable\.png\?v=20260822a/);
  assert.match(serviceWorker, /splash-512-blended\.png\?v=20260822a/);
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
