// Read-only reopening checks. No live Firebase session is used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
const root = new URL('../', import.meta.url);
const result = spawnSync(process.execPath, ['--test',
  'tests/firebase-spark/iphone-reopen-performance.test.mjs',
  'tests/firebase-spark/ios-startup-session.test.mjs',
  'tests/firebase-spark/iphone-install-calendar.test.mjs',
  'tests/firebase-spark/service-worker-runtime.test.mjs'
], { cwd: fileURLToPath(root), stdio: 'inherit' });
assert.equal(result.status, 0, 'Reopening regression tests');
const files = ['app.js', 'firebase-client.js', 'participant-data.js', 'center-settings.js', 'sw.js',
  'core/firebase-runtime-policy.mjs', 'core/personal-calendar-cache.mjs', 'core/startup-timing.mjs'];
await Promise.all(files.map(async (file) => {
  const [source, built] = await Promise.all(['public', 'dist'].map((folder) =>
    readFile(new URL(`prototypes/firebase-spark-pwa/${folder}/${file}`, root), 'utf8')));
  const { code } = await transform(source, {
    loader: 'js', minify: true, target: 'es2020', format: 'esm', legalComments: 'none', charset: 'utf8'
  });
  assert.equal(code, built, `Source/build mismatch: ${file}`);
}));
console.log(`Verified ${files.length} source/build pairs. No production deployment or physical iPhone measurement was performed.`);