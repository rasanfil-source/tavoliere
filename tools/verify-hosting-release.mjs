import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = new URL(process.argv[2] || 'https://tavola-comune.web.app/');
const releaseNonce = Date.now().toString(36);
const assets = [
  { path: 'index.html', local: 'index.html' },
  { path: 'app.js', local: 'app.js' },
  { path: 'styles.css', local: 'styles.css' },
  { path: 'sw.js', local: 'sw.js' }
];

const results = [];
for (const asset of assets) {
  const remoteUrl = new URL(asset.path, baseUrl);
  remoteUrl.searchParams.set('verifica', releaseNonce);
  const response = await fetch(remoteUrl, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!response.ok) {
    throw new Error(`${asset.path}: risposta HTTP ${response.status}`);
  }
  const [remote, local] = await Promise.all([
    response.arrayBuffer().then((buffer) => Buffer.from(buffer)),
    readFile(resolve('prototypes/firebase-spark-pwa/dist', asset.local))
  ]);
  const remoteHash = digest(remote);
  const localHash = digest(local);
  if (remoteHash !== localHash) {
    throw new Error(`${asset.path}: il file pubblicato non coincide con la build verificata`);
  }
  results.push(`${asset.path} ${remoteHash.slice(0, 12)}`);
}

const index = await readFile(resolve('prototypes/firebase-spark-pwa/dist/index.html'), 'utf8');
for (const marker of [
  'data-admin-section-nav',
  'data-admin-center-settings-save',
  'data-admin-calendar-extension'
]) {
  if (!index.includes(marker)) {
    throw new Error(`index.html: marcatore di rilascio assente (${marker})`);
  }
}

console.log(`Rilascio verificato su ${baseUrl.origin}`);
results.forEach((result) => console.log(`- ${result}`));

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}
