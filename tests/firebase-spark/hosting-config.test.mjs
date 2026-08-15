import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(
  new URL('../../prototypes/firebase-spark-pwa/firebase.json', import.meta.url),
  'utf8'
));

const developmentServer = await readFile(
  new URL('../../prototypes/firebase-spark-pwa/dev-server.mjs', import.meta.url),
  'utf8'
);

test('il file degli indici indicato da firebase.json esiste', async () => {
  await access(new URL(
    `../../prototypes/firebase-spark-pwa/${config.firestore.indexes}`,
    import.meta.url
  ));
});

test('il server locale confina i percorsi e serve i formati PWA principali', () => {
  assert.match(developmentServer, /candidate === root \|\| candidate\.startsWith\(root \+ sep\)/);
  for (const extension of ['.png', '.jpg', '.ico', '.woff2']) {
    assert.match(developmentServer, new RegExp(`\\['${extension.replace('.', '\\.')}'`));
  }
});

test('Firebase Hosting invia le intestazioni difensive essenziali', () => {
  const globalRule = config.hosting.headers.find((entry) => entry.source === '**');
  const headers = new Map(globalRule.headers.map((header) => [header.key, header.value]));
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');
});

test('HTML e service worker non restano bloccati in cache HTTP', () => {
  for (const source of ['/index.html', '/sw.js']) {
    const rule = config.hosting.headers.find((entry) => entry.source === source);
    assert.equal(rule.headers.find((header) => header.key === 'Cache-Control')?.value, 'no-cache');
  }
});

test('i manifest delle due applicazioni sono serviti con il tipo corretto', () => {
  for (const source of ['/manifest.webmanifest', '/manifest-kitchen.webmanifest']) {
    const rule = config.hosting.headers.find((entry) => entry.source === source);
    assert.equal(
      rule.headers.find((header) => header.key === 'Content-Type')?.value,
      'application/manifest+json; charset=utf-8'
    );
  }
});
