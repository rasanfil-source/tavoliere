import { readFile } from 'node:fs/promises';
export const appSource = (await readFile(new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
export function functionSource(name) {
  const match = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(appSource);
  if (!match) throw new Error('Function not found: ' + name);
  const closing = /\n\}(?=\n|$)/.exec(appSource.slice(match.index));
  const end = closing ? match.index + closing.index : -1;
  if (end === -1) throw new Error('Function end not found: ' + name);
  return appSource.slice(match.index, end + 2);
}
export function functions(names, dependencies = {}) {
  const runtime = { ...dependencies };
  runtime.scheduleRecoveryRefresh ??= () => {};
  runtime.resetRecoveryRefresh ??= () => {};
  runtime.hasBlockingMealWrites ??= () => Boolean(runtime.state?.pendingMealKeys?.size);
  runtime.activeSingleMealKeys ??= () => new Set();
  runtime.overlayPendingMeals ??= () => {};
  runtime.renderPendingMealStatus ??= () => {};
  runtime.schedulePendingMealRecovery ??= () => {};
  runtime.storedPendingMealKeys ??= () => new Set();
  runtime.serverNow ??= () => (runtime.Date || Date).now();
  runtime.synchronizeServerClock ??= async () => true;
  runtime.startServerClockSync ??= () => {};
  runtime.schedulePostStartupWork ??= () => {};
  return new Function(...Object.keys(runtime), names.map(functionSource).join('\n')
    + '\nreturn {' + names.join(',') + '};')(...Object.values(runtime));
}
