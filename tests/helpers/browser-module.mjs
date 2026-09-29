import { readFile } from 'node:fs/promises';

const publicRoot = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);

// Load the actual browser module with explicit dependencies. Its Firebase CDN
// imports cannot be loaded by Node; integration tests supply the real SDK and
// an emulator-backed database, while each load gets its own module caches.
export async function loadBrowserModule(file, dependencies, exportedNames) {
  const original = await readFile(new URL(file, publicRoot), 'utf8');
  const source = original
    .replace(/^import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/^export\s*\{[\s\S]*?\}(?:\s+from\s+['"][^'"]+['"])?;\s*/gm, '')
    .replace(/^export\s+/gm, '');
  return new Function(...Object.keys(dependencies), source + '\nreturn {' + exportedNames.join(',') + '};')(
    ...Object.values(dependencies)
  );
}

export async function loadAppDietFunctions(dependencies) {
  const source = await readFile(new URL('app.js', publicRoot), 'utf8');
  const start = source.indexOf('function applyDailyDietsToSummary(');
  const end = source.indexOf('\nfunction renderGroupedSummary(', start);
  if (start < 0 || end < 0) throw new Error('Diet function boundaries not found');
  return new Function(...Object.keys(dependencies), source.slice(start, end)
    + '\nreturn { applyDailyDietsToSummary, applyDailyDietsToKitchenMeals };')(...Object.values(dependencies));
}
