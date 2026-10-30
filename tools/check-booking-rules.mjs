import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['tools/firebase-cli.mjs', '--config', 'firebase.json',
  '--project', 'demo-tavola-comune-rules', 'emulators:exec', '--only', 'firestore',
  'node --test --test-name-pattern="prenotazioni per altri" ../../tests/firebase-rules/firestore.rules.test.mjs'],
{ stdio: 'inherit' });
process.exitCode = result.status ?? 1;
