import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function verifyBuild(buildRoot = resolve(process.env.TAT_BUILD_OUTPUT || 'prototypes/firebase-spark-pwa/dist')) {
  const manifest = JSON.parse(await readFile(resolve(buildRoot, 'build-manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.firestore, 'full');
  for (const [path, hash] of Object.entries(manifest.files)) {
    const file = resolve(buildRoot, '.' + path);
    assert.ok(file.startsWith(buildRoot + sep), path);
    assert.equal(digest(await readFile(file)), hash, `Build asset mismatch: ${path}`);
  }
  for (const [path, hash] of Object.entries(manifest.sources)) {
    assert.equal(digest(await readFile(resolve(path))), hash, `Stale build source: ${path}`);
  }
  for (const [path, output] of Object.entries(manifest.outputs)) {
    assert.ok(manifest.files[path], path);
    for (const item of output.imports) {
      if (item.external) {
        assert.ok(item.kind === 'dynamic-import' && ['fs', 'url'].includes(item.path), `External browser dependency: ${item.path}`);
      } else {
        assert.ok(manifest.outputs[item.path], `Missing chunk: ${item.path}`);
      }
    }
  }
  const startupInputs = new Set(manifest.resident.flatMap(path => manifest.outputs[path].inputs));
  for (const module of ['admin-participant-data.js', 'admin-center.js', 'domain/center-backup.mjs', 'domain/center-restore.mjs']) {
    assert.ok(![...startupInputs].some(input => input.endsWith('/' + module)), `Eager administration: ${module}`);
    assert.ok(Object.values(manifest.outputs).some(output => output.inputs.some(input => input.endsWith('/' + module))), `Lost feature: ${module}`);
  }
  assert.ok([...startupInputs].some(input => /@firebase\/firestore\/dist\/.*index\./.test(input)), 'Full Firestore missing');
  assert.ok(!Object.values(manifest.outputs).some(output => output.inputs.some(input => /firestore\/.*lite\//.test(input))), 'Firestore Lite must not be included');
  for (const sdk of ['app', 'auth', 'firestore']) {
    const chunks = Object.values(manifest.outputs).filter(output => output.inputs.some(input =>
      input.includes(`node_modules/@firebase/${sdk}/dist/`) && /index\..*js$/.test(input)));
    assert.equal(chunks.length, 1, `Duplicate ${sdk} SDK instance`);
  }
  const html = await readFile(resolve(buildRoot, 'index.html'), 'utf8');
  assert.ok(html.includes(`src="${manifest.entry}"`));
  assert.doesNotMatch(html, /rel="modulepreload"[^>]+gstatic/);
  for (const path of manifest.initial.filter(path => path !== manifest.entry)) {
    assert.ok(html.includes(`rel="modulepreload" href="${path}"`), `Missing preload: ${path}`);
  }
  console.log(`Build verificata: ${Object.keys(manifest.files).length} file, sorgenti coerenti, Firestore completo, moduli amministrativi separati.`);
  return manifest;
}

function digest(value) { return createHash('sha256').update(value).digest('hex'); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await verifyBuild();
