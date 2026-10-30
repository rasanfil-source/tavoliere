// Confronto in sola lettura delle dimensioni del grafo JavaScript con un riferimento Git. Non misura i tempi su iPhone né utilizza dati residenti.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const ref = process.argv[2] || 'HEAD';
const base = 'prototypes/firebase-spark-pwa/';
const manifest = JSON.parse(await readFile(resolve(base, 'dist/build-manifest.json'), 'utf8'));
const visited = new Map();
async function visit(url) {
  if (visited.has(url.href)) return;
  visited.set(url.href, null);
  let source, bytes;
  if (url.origin === 'https://local.invalid') {
    const path = url.pathname.slice(1);
    source = execFileSync('git', ['show', `${ref}:${base}public/${path}`], { encoding: 'utf8' });
    bytes = execFileSync('git', ['show', `${ref}:${base}dist/${path}`]);
  } else {
    if (!/^https:\/\/www\.gstatic\.com\/firebasejs\/12\.17\.0\/firebase-\w+\.js$/.test(url.href)) {
      throw new Error(`Unexpected external SDK: ${url.href}`);
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`SDK HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    source = bytes.toString();
  }
  visited.set(url.href, bytes);
  const imports = [...source.matchAll(/\b(?:import|export)\s*[\w$*{},\s]+\s*from\s*['"]([^'"]+)['"]/g)];
  await Promise.all(imports.map(([, path]) => visit(new URL(path, url))));
}
await Promise.all(['app.js?v=20261014b', 'participant-data.js?v=20261014b']
  .map(path => visit(new URL(path, 'https://local.invalid/'))));
const before = [...visited.values()];
const after = await Promise.all(manifest.resident.map(path => readFile(resolve(base, 'dist', '.' + path))));
const total = buffers => ({ files: buffers.length, bytes: buffers.reduce((n, value) => n + value.length, 0),
  gzipBytes: buffers.reduce((n, value) => n + gzipSync(value).length, 0) });
console.log(JSON.stringify({ reference: ref, before: total(before), after: total(after),
  note: 'Static resident JS graph including full Firebase SDK; not a device timing measurement.' }, null, 2));
