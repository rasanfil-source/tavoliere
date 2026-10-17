import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/sw.js', import.meta.url), 'utf8');
const origin = 'https://tavola-comune.web.app';
const sdk = 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';

function worker({ offline = false, storageFailure = false, navigationPreload } = {}) {
  const handlers = {};
  const entries = new Map();
  const requests = [];
  const deleted = [];
  let claimed = false;
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const cache = {
    match: async (request) => entries.get(key(request))?.clone(),
    put: async (request, response) => {
      if (storageFailure) throw new Error('quota');
      entries.set(key(request), response.clone());
    }
  };
  vm.runInNewContext(source, {
    URL,
    self: {
      registration: { navigationPreload },
      location: { origin },
      clients: { claim: async () => { claimed = true; } },
      addEventListener: (name, handler) => { handlers[name] = handler; }
    },
    caches: {
      open: async () => cache,
      keys: async () => ['tavola-comune-app-v448', 'unrelated-cache'],
      delete: async (name) => { deleted.push(name); }
    },
    fetch: async (request) => {
      requests.push(key(request));
      if (offline) throw new Error('offline');
      return new Response('downloaded');
    }
  });
  return {
    entries, requests, deleted,
    get claimed() { return claimed; },
    async activate() {
      let pending;
      handlers.activate({ waitUntil: (promise) => { pending = promise; } });
      await pending;
    },
    fetch(url, { method = 'GET', mode = 'cors' } = {}) {
      let response;
      handlers.fetch({ request: { url, method, mode }, respondWith: (promise) => { response = promise; }, waitUntil() {} });
      return response;
    }
  };
}

test('SDK versionato scaricato una volta e riutilizzato senza richieste di rete', async () => {
  const sw = worker();
  assert.equal(await (await sw.fetch(sdk)).text(), 'downloaded');
  assert.equal(await (await sw.fetch(sdk)).text(), 'downloaded');
  assert.equal(sw.requests.length, 1);
  await sw.fetch(sdk.replace('12.17.0', '12.18.0'));
  assert.equal(sw.requests.length, 2);
});

test('Catalan catalog is served from the service worker cache offline', async () => {
  const sw = worker({ offline: true });
  sw.entries.set(origin + '/i18n/ca.json?v=20261017-ca', new Response('{"hello":"Hola"}'));
  const response = await sw.fetch(origin + '/i18n/ca.json?v=20261017-ca');
  assert.equal(await response.text(), '{"hello":"Hola"}');
});

test('prima attivazione prepara i tre SDK per la riapertura', async () => {
  const sw = worker();
  await sw.activate();
  assert.equal(sw.claimed, true);
  assert.equal(sw.entries.size, 3);
  await sw.fetch(sdk);
  assert.equal(sw.requests.length, 3);
  assert.deepEqual(sw.deleted, ['tavola-comune-app-v448']);
});

test('activation enables supported navigation preload and tolerates enable failures', async () => {
  for (const fail of [false, true]) {
    let enables = 0;
    const sw = worker({ navigationPreload: { enable: async () => {
      enables++;
      if (fail) throw Error('unsupported');
    } } });
    await sw.activate();
    assert.equal(enables, 1);
    assert.equal(sw.claimed, true);
  }
});

test('rete assente e cache piena non impediscono l attivazione', async () => {
  for (const options of [{ offline: true }, { storageFailure: true }]) {
    const sw = worker(options);
    await sw.activate();
    assert.equal(sw.claimed, true);
  }
  const sw = worker({ storageFailure: true });
  assert.equal(await (await sw.fetch(sdk)).text(), 'downloaded');
});

test('lo splash versionato usa subito la copia installata anche offline', async () => {
  const sw = worker({ offline: true });
  const splash = `${origin}/icons/splash-512-transparent.png?v=20260824a`;
  sw.entries.set(splash, new Response('splash'));
  assert.equal(await (await sw.fetch(splash)).text(), 'splash');
  assert.equal(sw.requests.length, 0);
});

test('API di autenticazione, token e dati Firestore restano fuori dalla cache', () => {
  const sw = worker();
  for (const url of [
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
    'https://securetoken.googleapis.com/v1/token',
    'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel',
    'https://www.gstatic.com/firebasejs/latest/firebase-auth.js'
  ]) assert.equal(sw.fetch(url), undefined);
  assert.equal(sw.fetch(sdk, { method: 'POST' }), undefined);
  assert.equal(sw.requests.length, 0);
});

test('SDK conservato disponibile anche offline', async () => {
  const sw = worker({ offline: true });
  sw.entries.set(sdk, new Response('cached SDK'));
  assert.equal(await (await sw.fetch(sdk)).text(), 'cached SDK');
  assert.equal(sw.requests.length, 0);
});
