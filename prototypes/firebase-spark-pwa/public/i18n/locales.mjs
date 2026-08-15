/**
 * Modulo locales - Gestione caricamento cataloghi traduzioni
 * 
 * Questo modulo gestisce il caricamento lazy dei cataloghi JSON
 * e fornisce utility per la validazione delle traduzioni.
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, clearCatalogCache } from './i18n.mjs';

const catalogCache = new Map();
const loadPromises = new Map();

/**
 * Carica un catalogo traduzioni per una specifica lingua
 * @param {string} locale - Codice lingua (es. 'en', 'fr')
 * @returns {Promise<Object>} Catalogo traduzioni
 */
export async function loadCatalog(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    throw new Error(`Lingua non supportata: ${locale}`);
  }

  // Restituisci dalla cache se disponibile
  if (catalogCache.has(locale)) {
    return catalogCache.get(locale);
  }

  // Evita caricamenti duplicati
  if (loadPromises.has(locale)) {
    return loadPromises.get(locale);
  }

  const loadPromise = (async () => {
    try {
      const catalogUrl = new URL(`./${locale}.json`, import.meta.url).href;
      const response = await fetch(catalogUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const catalog = await response.json();
      
      // Validazione base del catalogo
      if (!catalog || typeof catalog !== 'object') {
        throw new Error('Catalogo non valido: deve essere un oggetto JSON');
      }
      
      if (!catalog['_meta.locale']) {
        console.warn(`Catalogo ${locale} senza _meta.locale`);
      }
      
      catalogCache.set(locale, catalog);
      return catalog;
    } catch (error) {
      console.error(`Errore caricamento catalogo ${locale}:`, error.message);
      
      // Fallback a italiano se il catalogo non è disponibile
      if (locale !== DEFAULT_LOCALE) {
        console.warn(`Fallback a ${DEFAULT_LOCALE} per ${locale}`);
        return loadCatalog(DEFAULT_LOCALE);
      }
      
      throw error;
    } finally {
      loadPromises.delete(locale);
    }
  })();

  loadPromises.set(locale, loadPromise);
  return loadPromise;
}

/**
 * Carica tutti i cataloghi supportati
 * @returns {Promise<Map<string, Object>>} Mappa dei cataloghi caricati
 */
export async function loadAllCatalogs() {
  const catalogs = new Map();
  
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const catalog = await loadCatalog(locale);
      catalogs.set(locale, catalog);
    } catch (error) {
      console.warn(`Catalogo ${locale} non caricato:`, error.message);
    }
  }
  
  return catalogs;
}

/**
 * Pre-carica i cataloghi per le lingue specificate
 * @param {Array<string>} locales - Lingue da pre-caricare
 * @returns {Promise<void>}
 */
export async function preloadCatalogs(locales) {
  const promises = locales.map(locale => loadCatalog(locale));
  await Promise.all(promises);
}

/**
 * Pulisce la cache di un catalogo specifico
 * @param {string} locale - Codice lingua
 */
export function unloadCatalog(locale) {
  catalogCache.delete(locale);
  loadPromises.delete(locale);
}

/**
 * Pulisce tutta la cache dei cataloghi
 */
export function clearAllCatalogs() {
  catalogCache.clear();
  loadPromises.clear();
  clearCatalogCache();
}

/**
 * Ottiene tutte le chiavi di un catalogo (escludendo _meta)
 * @param {Object} catalog - Catalogo traduzioni
 * @returns {Array<string>} Chiavi del catalogo
 */
export function getCatalogKeys(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    return [];
  }
  
  return Object.keys(catalog).filter(key => !key.startsWith('_meta.'));
}

/**
 * Confronta due cataloghi e riporta differenze
 * @param {Object} catalog1 - Primo catalogo
 * @param {Object} catalog2 - Secondo catalogo
 * @returns {Object} Report differenze
 */
export function compareCatalogs(catalog1, catalog2) {
  const keys1 = getCatalogKeys(catalog1);
  const keys2 = getCatalogKeys(catalog2);
  
  const set1 = new Set(keys1);
  const set2 = new Set(keys2);
  
  const missing = keys1.filter(key => !set2.has(key));
  const extra = keys2.filter(key => !set1.has(key));
  const common = keys1.filter(key => set2.has(key));
  
  return {
    missing,
    extra,
    common,
    total1: keys1.length,
    total2: keys2.length,
  };
}

/**
 * Verifica che tutti i cataloghi abbiano le stesse chiavi
 * @param {Map<string, Object>} catalogs - Mappa dei cataloghi
 * @returns {Object} Report di validazione
 */
export function validateCatalogs(catalogs) {
  const italianCatalog = catalogs.get(DEFAULT_LOCALE);
  if (!italianCatalog) {
    return {
      valid: false,
      error: 'Catalogo italiano non trovato',
    };
  }
  
  const italianKeys = getCatalogKeys(italianCatalog);
  const report = {
    valid: true,
    missingKeys: {},
    extraKeys: {},
    totalKeys: italianKeys.length,
  };

  for (const [locale, catalog] of catalogs) {
    if (locale === DEFAULT_LOCALE) continue;
    
    const comparison = compareCatalogs(italianCatalog, catalog);
    
    if (comparison.missing.length > 0) {
      report.missingKeys[locale] = comparison.missing;
    }
    
    if (comparison.extra.length > 0) {
      report.extraKeys[locale] = comparison.extra;
    }
    
    if (comparison.missing.length > 0 || comparison.extra.length > 0) {
      report.valid = false;
    }
  }

  return report;
}

/**
 * Verifica che i placeholder nei valori corrispondano tra cataloghi
 * @param {Object} catalog1 - Catalogo di riferimento (italiano)
 * @param {Object} catalog2 - Catalogo da verificare
 * @returns {Array<Object>} Errori di placeholder
 */
export function countPlaceholders(str) {
  const counts = new Map();
  const placeholderRegex = /\{(\w+)\}/g;
  let match;
  while ((match = placeholderRegex.exec(str)) !== null) {
    const name = match[1];
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return counts;
}

/**
 * Verifica che i placeholder nei valori corrispondano tra cataloghi per nome e molteplicità
 * @param {Object} catalog1 - Catalogo di riferimento (italiano)
 * @param {Object} catalog2 - Catalogo da verificare
 * @returns {Array<Object>} Errori di placeholder
 */
export function validatePlaceholders(catalog1, catalog2) {
  const errors = [];
  
  for (const [key, value1] of Object.entries(catalog1)) {
    if (key.startsWith('_meta.') || typeof value1 !== 'string') {
      continue;
    }
    
    const value2 = catalog2[key];
    if (value2 === undefined || typeof value2 !== 'string') {
      continue;
    }
    
    const counts1 = countPlaceholders(value1);
    const counts2 = countPlaceholders(value2);
    
    const allKeys = new Set([...counts1.keys(), ...counts2.keys()]);
    const mismatches = [];
    
    for (const p of allKeys) {
      const c1 = counts1.get(p) || 0;
      const c2 = counts2.get(p) || 0;
      if (c1 !== c2) {
        mismatches.push({ placeholder: p, expectedCount: c1, actualCount: c2 });
      }
    }
    
    if (mismatches.length > 0) {
      errors.push({
        key,
        mismatches
      });
    }
  }
  
  return errors;
}

/**
 * Estrae tutte le stringhe hardcoded da un file HTML
 * @param {string} html - Contenuto HTML
 * @returns {Array<Object>} Stringhe trovate
 */
export function extractStringsFromHTML(html) {
  const strings = [];
  
  // Estrai nodi di testo tra tag
  const textNodes = html.match(/>([^<]+)</g) || [];
  for (const match of textNodes) {
    const text = match.slice(1, -1).trim();
    if (text.length > 0 && text.length < 500) {
      strings.push({
        type: 'text',
        value: text,
      });
    }
  }
  
  // Estrai attributi
  const attrPatterns = [
    /aria-label="([^"]+)"/g,
    /title="([^"]+)"/g,
    /placeholder="([^"]+)"/g,
    /alt="([^"]+)"/g,
  ];
  
  for (const pattern of attrPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      strings.push({
        type: 'attribute',
        value: match[1],
      });
    }
  }
  
  return strings;
}

/**
 * Genera un report di validazione per i traduttori
 * @param {Map<string, Object>} catalogs - Mappa dei cataloghi
 * @returns {string} Report formattato
 */
export function generateValidationReport(catalogs) {
  const validation = validateCatalogs(catalogs);
  const lines = [];
  
  lines.push('## Report Validazione Traduzioni\n');
  lines.push(`Catalogo italiano: ${validation.totalKeys} chiavi\n`);
  
  if (validation.valid) {
    lines.push('✅ Tutti i cataloghi sono completi\n');
  } else {
    lines.push('❌ Sono state rilevate incongruenze:\n');
    
    for (const [locale, missing] of Object.entries(validation.missingKeys)) {
      lines.push(`\n### ${locale.toUpperCase()} - Chiavi mancanti (${missing.length})`);
      for (const key of missing.slice(0, 10)) {
        lines.push(`- ${key}`);
      }
      if (missing.length > 10) {
        lines.push(`- ... e altre ${missing.length - 10}`);
      }
    }
    
    for (const [locale, extra] of Object.entries(validation.extraKeys)) {
      lines.push(`\n### ${locale.toUpperCase()} - Chiavi extra (${extra.length})`);
      for (const key of extra.slice(0, 10)) {
        lines.push(`- ${key}`);
      }
    }
  }
  
  return lines.join('\n');
}

// Export per utilità di validazione (già esportate inline)