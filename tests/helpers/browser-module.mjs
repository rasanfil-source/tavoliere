import { readFile } from 'node:fs/promises';

const publicRoot = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);

// Carica il modulo effettivo con dipendenze esplicite. Node non importa l'SDK dal CDN; i test di integrazione forniscono SDK e database emulato. Ogni caricamento ha cache indipendenti.
export async function loadBrowserModule(file, dependencies, exportedNames) {
  const original = await readFile(new URL(file, publicRoot), 'utf8');
  if (original.includes('blessing-view.mjs')) {
    const blessing = await loadBrowserModule('blessing-view.mjs', dependencies, ['renderBlessing']);
    dependencies = { ...blessing, ...dependencies };
  }
  if (original.includes("from './administrator-deletion-protection.js")) {
    const protection = await loadBrowserModule('administrator-deletion-protection.js', dependencies,
      ['writeAdministratorDeletionProtection', 'synchronizeAdministratorDeletionProtection']);
    dependencies = { ...protection, ...dependencies };
  }
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
