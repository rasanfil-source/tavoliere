import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = resolve(repoRoot, '.firebase-cache');
const cliPath = resolve(repoRoot, 'node_modules/firebase-tools/lib/bin/firebase.js');
const portableJavaHome = resolve(repoRoot, '.tools/java/jdk-21.0.12+8');
const javaHome = process.env.JAVA_HOME || (existsSync(portableJavaHome) ? portableJavaHome : undefined);
const pathPrefix = javaHome ? resolve(javaHome, 'bin') + ';' : '';

mkdirSync(cacheDir, { recursive: true });

const cliArguments = process.argv.slice(2);
if (cliArguments.includes('deploy')) {
  const build = spawnSync(process.execPath, [resolve(repoRoot, 'tools/build-public.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  });
  if (build.status !== 0) {
    process.exit(build.status || 1);
  }
}

const prototypeDir = resolve(repoRoot, 'prototypes/firebase-spark-pwa');

const child = spawn(process.execPath, [cliPath, ...cliArguments], {
  cwd: prototypeDir,
  env: {
    ...process.env,
    ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    PATH: pathPrefix + process.env.PATH,
    XDG_CONFIG_HOME: cacheDir,
    NO_UPDATE_NOTIFIER: '1'
  },
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
