import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

const root = process.cwd();
const sourceFiles = [
  ...globSync('prototypes/firebase-spark-pwa/public/**/*.js'),
  ...globSync('prototypes/firebase-spark-pwa/public/**/*.mjs')
].sort();
const toolFiles = globSync('tools/**/*.mjs').sort();
const checks = [
  ...sourceFiles.map((file) => ['node', ['--check', file]]),
  ...toolFiles.map((file) => ['node', ['--check', file]]),
  ['node', ['prototypes/firebase-spark-pwa/scripts/validate-i18n.mjs']],
  ['node', ['--test', ...globSync('tests/firebase-spark/*.test.mjs'), ...globSync('tests/milestone1/*.test.mjs')]],
  ['node', ['tools/build-public.mjs']]
];

for (const [command, args] of checks) {
  console.log('Gate:', command, args.join(' '));
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('Gate pre-deploy superato.');
