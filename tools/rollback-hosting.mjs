import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const record = JSON.parse(await readFile(resolve(root, 'releases/2026-11-02-before-startup-cleanup.json'), 'utf8'));
if (record.site !== 'tavola-comune' || record.project !== 'tavola-comune'
    || record.url !== 'https://tavola-comune.web.app' || !/^[a-f0-9]{16}$/.test(record.version)) {
  throw Error('Invalid rollback target');
}
const args = process.argv.slice(2);
if (args.some(arg => !['--apply', '--verify'].includes(arg))) throw Error('Use --apply or --verify');
console.log(`Rollback target: ${record.site}@${record.version} (build ${record.manifest.release})`);
if (!args.length) {
  console.log('Dry run. Use --apply to restore Hosting, or --verify to check the saved version is currently live.');
  process.exit(0);
}
if (args.includes('--apply')) {
  // hosting:clone republishes an immutable Hosting version without rebuilding or changing Firestore.
  const result = spawnSync(process.execPath, [resolve(root, 'tools/firebase-cli.mjs'),
    '--project', record.project, 'hosting:clone', `${record.site}@${record.version}`, `${record.site}:live`
  ], { cwd: root, stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
const nonce = Date.now();
for (const [path, hash] of Object.entries(record.manifest.files)) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw Error('Invalid manifest path');
  const url = new URL(path, record.url);
  url.searchParams.set('rollbackVerify', String(nonce));
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw Error(`Rollback verification failed: ${path} HTTP ${response.status}`);
  const actual = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  if (actual !== hash) throw Error(`Rollback verification failed: ${path} differs from saved version`);
}
console.log('Saved Hosting version verified. Reload open browser tabs to use it.');
