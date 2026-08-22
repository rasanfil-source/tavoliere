import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const LOCALES = ['it', 'en', 'fr', 'es', 'de'];
const DEFAULT_LOCALE = 'it';
const index = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
  'utf8'
);

function loadCatalog(locale) {
  const fileUrl = new URL(`../../prototypes/firebase-spark-pwa/public/i18n/${locale}.json`, import.meta.url);
  assert.ok(existsSync(fileUrl), `Il file di catalogo ${locale}.json deve esistere`);
  const raw = readFileSync(fileUrl, 'utf8');
  return JSON.parse(raw);
}

function extractPlaceholders(text) {
  if (typeof text !== 'string') return [];
  const matches = text.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1)).sort();
}

test('tutti i 5 cataloghi di lingua sono validi e contengono metadati corretti', () => {
  for (const locale of LOCALES) {
    const catalog = loadCatalog(locale);
    assert.equal(typeof catalog, 'object');
    assert.equal(catalog['_meta.locale'], locale);
    assert.ok(catalog['_meta.languageName'], `Il catalogo ${locale} deve avere un languageName`);
  }
});

test('tutte le lingue hanno piena parità di chiavi rispetto al catalogo italiano', () => {
  const italian = loadCatalog(DEFAULT_LOCALE);
  const italianKeys = Object.keys(italian).filter((k) => !k.startsWith('_meta.')).sort();
  assert.ok(italianKeys.length >= 200, `Il catalogo italiano deve avere almeno 200 chiavi (trovate ${italianKeys.length})`);

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const catalog = loadCatalog(locale);
    const catalogKeys = new Set(Object.keys(catalog).filter((k) => !k.startsWith('_meta.')));

    const missing = italianKeys.filter((k) => !catalogKeys.has(k));
    const extra = [...catalogKeys].filter((k) => !italianKeys.includes(k));

    assert.deepEqual(missing, [], `Lingua ${locale} ha chiavi mancanti: ${missing.join(', ')}`);
    assert.deepEqual(extra, [], `Lingua ${locale} ha chiavi extra: ${extra.join(', ')}`);
  }
});

test('tutti i placeholder corrispondono esattamente tra italiano e le altre lingue', () => {
  const italian = loadCatalog(DEFAULT_LOCALE);
  const keysWithPlaceholders = Object.entries(italian)
    .filter(([k, v]) => !k.startsWith('_meta.') && typeof v === 'string' && /\{[a-zA-Z0-9_]+\}/.test(v));

  assert.ok(keysWithPlaceholders.length > 0, 'Devono esserci chiavi con placeholder nel catalogo');

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const catalog = loadCatalog(locale);

    for (const [key, itText] of keysWithPlaceholders) {
      const itPlaceholders = extractPlaceholders(itText);
      const locText = catalog[key];
      assert.ok(locText, `Chiave ${key} mancante nel catalogo ${locale}`);
      const locPlaceholders = extractPlaceholders(locText);
      assert.deepEqual(
        locPlaceholders,
        itPlaceholders,
        `Placeholder non coincidenti per ${key} in ${locale}: attesi ${itPlaceholders}, trovati ${locPlaceholders}`
      );
    }
  }
});

test('il selettore multi-centro traduce testo visibile ed etichetta accessibile', () => {
  assert.match(index, /data-i18n="admin\.centerSwitcher\.label"/);
  assert.match(index, /data-admin-center-select[^>]*data-i18n-aria-label="admin\.centerSwitcher\.label"/);
  for (const locale of LOCALES) {
    assert.ok(loadCatalog(locale)['admin.centerSwitcher.label']);
  }
});

test('le preferenze residente parlano solo del dispositivo e delle diverse funzioni', () => {
  const italian = loadCatalog('it');
  assert.equal(
    italian['resident.preferences.layoutsHelp'],
    "Scegli separatamente l'aspetto delle diverse funzioni."
  );
  for (const locale of LOCALES) {
    const catalog = loadCatalog(locale);
    for (const key of [
      'resident.preferences.title',
      'resident.preferences.description',
      'resident.preferences.intro',
      'resident.preferences.layoutsHelp',
    ]) {
      assert.ok(catalog[key], `${key} deve essere tradotta in ${locale}`);
      assert.notEqual(catalog[key], key);
    }
  }
  assert.doesNotMatch(italian['resident.preferences.layoutsHelp'], /cucina|tutte le persone/i);
});
