import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const LOCALES = ['it', 'en', 'fr', 'es', 'de'];
const DEFAULT_LOCALE = 'it';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, '../public/i18n');

function loadCatalogs() {
  const catalogs = new Map();
  for (const locale of LOCALES) {
    const filePath = path.join(i18nDir, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File catalogo non trovato: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    catalogs.set(locale, JSON.parse(content));
  }
  return catalogs;
}

function validate() {
  console.log('🔍 Avvio validazione i18n...\n');
  const catalogs = loadCatalogs();
  const italian = catalogs.get(DEFAULT_LOCALE);
  const italianKeys = Object.keys(italian).filter((k) => !k.startsWith('_meta.'));

  console.log(`📋 Catalogo di riferimento (${DEFAULT_LOCALE.toUpperCase()}): ${italianKeys.length} chiavi`);

  let hasErrors = false;

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const catalog = catalogs.get(locale);
    const catalogKeys = new Set(Object.keys(catalog).filter((k) => !k.startsWith('_meta.')));

    const missing = italianKeys.filter((k) => !catalogKeys.has(k));
    const extra = [...catalogKeys].filter((k) => !italianKeys.includes(k));

    if (missing.length > 0 || extra.length > 0) {
      hasErrors = true;
      console.log(`❌ Lingua ${locale.toUpperCase()}: ${missing.length} chiavi mancanti, ${extra.length} chiavi extra.`);
      if (missing.length > 0) console.log('   Mancanti:', missing.slice(0, 5));
      if (extra.length > 0) console.log('   Extra:', extra.slice(0, 5));
    } else {
      console.log(`✅ Lingua ${locale.toUpperCase()}: Tutte le ${italianKeys.length} chiavi sono presenti`);
    }

    // Placeholders check
    const placeholderRegex = /\{(\w+)\}/g;
    let placeholderErrors = 0;
    for (const key of italianKeys) {
      const val1 = italian[key];
      const val2 = catalog[key];
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        const p1 = (val1.match(placeholderRegex) || []).map((m) => m.slice(1, -1)).sort();
        const p2 = (val2.match(placeholderRegex) || []).map((m) => m.slice(1, -1)).sort();
        if (JSON.stringify(p1) !== JSON.stringify(p2)) {
          console.log(`⚠️ Placeholder disallineati [${locale.toUpperCase()}][${key}]: ${p1.join(',')} vs ${p2.join(',')}`);
          placeholderErrors++;
          hasErrors = true;
        }
      }
    }
    if (placeholderErrors === 0) {
      console.log(`   (Placeholder ${locale.toUpperCase()}: 0 errori)`);
    }
  }

  console.log('\n----------------------------------------');
  if (!hasErrors) {
    console.log('🎉 VALIDAZIONE COMPLETATA CON SUCCESSO! (0 errori)');
  } else {
    console.log('🚨 Trovati errori nella validazione.');
    process.exit(1);
  }
}

validate();
