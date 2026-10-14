// Read-only reopening checks. No live Firebase session is used.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyBuild } from './verify-build.mjs';
const root = new URL('../', import.meta.url);
const result = spawnSync(process.execPath, ['--test',
  'tests/firebase-spark/iphone-reopen-performance.test.mjs',
  'tests/firebase-spark/ios-startup-session.test.mjs',
  'tests/firebase-spark/iphone-install-calendar.test.mjs',
  'tests/firebase-spark/service-worker-runtime.test.mjs'
], { cwd: fileURLToPath(root), stdio: 'inherit' });
assert.equal(result.status, 0, 'Reopening regression tests');
await verifyBuild();
console.log('No production deployment or physical iPhone measurement was performed.');
