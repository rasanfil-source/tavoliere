# Checklist Implementazione i18n

Questa checklist ti guida passo-passo nell'integrazione del sistema multilingue.

## Fase 1: Setup iniziale (1-2 ore)

### 1.1 Copia file nella struttura progetto

- [ ] Crea directory `/i18n/` nella root del progetto
- [ ] Copia `i18n.mjs` in `/i18n/i18n.mjs`
- [ ] Copia `locales.mjs` in `/i18n/locales.mjs`
- [ ] Copia `it.json` in `/i18n/it.json`
- [ ] Copia `en.json` in `/i18n/en.json`
- [ ] Copia `fr.json` in `/i18n/fr.json`
- [ ] Copia `es.json` in `/i18n/es.json`
- [ ] Copia `de.json` in `/i18n/de.json`
- [ ] Copia `README-translations.md` in `/i18n/README-translations.md`

### 1.2 Verifica struttura

```bash
ls -la /i18n/
# Dovresti vedere:
# i18n.mjs
# locales.mjs
# it.json
# en.json
# fr.json
# es.json
# de.json
# README-translations.md
```

## Fase 2: Integrazione in app.js (2-3 ore)

### 2.1 Import modulo i18n

In `app.js`, aggiungi in cima:

```javascript
import {
  initI18n,
  t,
  setLocale,
  getLocale,
  formatDate,
  formatTime,
  applyTranslations,
} from './i18n/i18n.mjs';
```

### 2.2 Inizializzazione nel bootstrap

Nel bootstrap dell'app (dopo il caricamento DOM):

```javascript
async function bootstrap() {
  // ... existing bootstrap code ...
  
  // Inizializza i18n
  await initI18n({ development: window.location.hostname === 'localhost' });
  
  // ... rest of bootstrap ...
}
```

### 2.3 Sostituire prime stringhe hardcoded

Cerca in `app.js` e sostituisci:

```javascript
// PRIMA
statusElement.textContent = 'Salvataggio in corso...';

// DOPO
statusElement.textContent = t('common.status.saving');
```

```javascript
// PRIMA
button.textContent = 'Salva';

// DOPO
button.textContent = t('common.actions.save');
```

### 2.4 Aggiornare renderer dinamici

Nei renderer che generano HTML dinamico:

```javascript
// PRIMA
function renderMealCard(meal) {
  return `
    <h3>${meal.type === 'lunch' ? 'Pranzo' : 'Cena'}</h3>
    <button>Salva</button>
  `;
}

// DOPO
function renderMealCard(meal) {
  const mealTypeLabel = meal.type === 'lunch' 
    ? t('meal.type.lunch') 
    : t('meal.type.dinner');
  
  return `
    <h3>${escapeHtml(mealTypeLabel)}</h3>
    <button>${escapeHtml(t('common.actions.save'))}</button>
  `;
}
```

## Fase 3: Aggiornare index.html (2-3 ore)

### 3.1 Sostituire testi statici con data-i18n

```html
<!-- PRIMA -->
<button class="save-button">Salva</button>
<label>Lingua dell'app</label>

<!-- DOPO -->
<button class="save-button" data-i18n="common.actions.save"></button>
<label data-i18n="admin.adaptations.language.label">Lingua dell'app</label>
```

### 3.2 Attributi internazionali

```html
<!-- PRIMA -->
<input placeholder="Cerca…">
<button aria-label="Chiudi finestra" title="Chiudi">X</button>

<!-- DOPO -->
<input data-i18n-placeholder="placeholder.search" placeholder="Cerca…">
<button 
  data-i18n-aria-label="a11y.closeDialog" 
  data-i18n-title="common.actions.close"
  aria-label="Chiudi finestra" 
  title="Chiudi">X</button>
```

### 3.3 Selettore lingua esistente

Attualmente in `index.html`:

```html
<select data-admin-language-select>
  <option value="it" selected>Italiano</option>
  <option value="es" disabled>Spagnolo (in arrivo)</option>
  <option value="en" disabled>Inglese (in arrivo)</option>
  <option value="fr" disabled>Francese (in arrivo)</option>
  <option value="de" disabled>Tedesco (in arrivo)</option>
</select>
```

Sostituisci con:

```html
<select data-admin-language-select>
  <option value="it" data-i18n="language.it">Italiano</option>
  <option value="en" data-i18n="language.en">Inglese</option>
  <option value="fr" data-i18n="language.fr">Francese</option>
  <option value="es" data-i18n="language.es">Spagnolo</option>
  <option value="de" data-i18n="language.de">Tedesco</option>
</select>
```

## Fase 4: Collegare selettore lingua (1 ora)

### 4.1 Event listener per cambio lingua

In `app.js`, cerca il selettore lingua:

```javascript
const adminLanguageSelect = document.querySelector('[data-admin-language-select]');

if (adminLanguageSelect) {
  // Imposta valore corrente
  adminLanguageSelect.value = getLocale();
  
  // Gestisci cambio
  adminLanguageSelect.addEventListener('change', async (event) => {
    const newLocale = event.target.value;
    
    // Imposta nuova lingua
    await setLocale(newLocale);
    
    // Aggiorna UI
    applyTranslations(document);
    renderAllViews();
    
    // Aggiorna stato (se necessario salvare nel centro)
    // await updateCenterLanguage(newLocale);
  });
}
```

### 4.2 Abilitare tutte le lingue

Rimuovi `disabled` dalle opzioni quando i cataloghi sono pronti:

```javascript
// Dopo initI18n()
adminLanguageSelect.querySelectorAll('option').forEach(option => {
  option.disabled = false;
});
```

## Fase 5: Test e validazione (2-3 ore)

### 5.1 Test cambio lingua

- [ ] Apri l'app in italiano
- [ ] Cambia a inglese → verifica che TUTTO cambi
- [ ] Cambia a francese → verifica
- [ ] Cambia a spagnolo → verifica
- [ ] Cambia a tedesco → verifica
- [ ] Torna a italiano → verifica

### 5.2 Test viste principali

Per ogni lingua, testa:

- [ ] Vista partecipante (selection pasti)
- [ ] Vista settimana
- [ ] Vista riepilogo
- [ ] Vista cucina
- [ ] Pannello admin (overview, people, adaptations, settings)
- [ ] Login residenti

### 5.3 Test funzionalità

- [ ] Salvataggio prenotazioni
- [ ] Modifica dieta
- [ ] Validazione form
- [ ] Messaggi di errore
- [ ] Conferme eliminazione
- [ ] Date e orari formattati correttamente

### 5.4 Validazione cataloghi

```javascript
import { loadAllCatalogs, validateCatalogs } from './i18n/locales.mjs';

const catalogs = await loadAllCatalogs();
const report = validateCatalogs(catalogs);

console.log('Validazione:', report);
// report.valid deve essere true
```

## Fase 6: Persistenza preferenze (1-2 ore)

### 6.1 Lingua dispositivo (localStorage)

Già°° gestita da `setLocale()` in `i18n.mjs`:

```javascript
localStorage.setItem('tavolaComune.locale', locale);
```

### 6.2 Lingua centro (Firestore)

In `center-settings.js`, aggiungi `language` alle impostazioni:

```javascript
export async function updateCenterSettings({
  name,
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  commonPassword,
  administratorName,
  administratorSignature,
  adminEmail,
  language, // ← NUOVO
  onProgress
}) {
  // ... existing validation ...
  
  const settings = await saveCenterConfiguration({
    // ... existing fields ...
    language: language || 'it', // ← NUOVO
  });
  
  return settings;
}
```

### 6.3 Precedenza lingue

Nel bootstrap, dopo `initI18n()`:

```javascript
async function resolveAppLocale() {
  // 1. Preferenza utente (localStorage) - già gestita da initI18n
  let locale = getLocale();
  
  // 2. Se non impostata, usa lingua centro
  if (locale === 'it') {
    const centerSettings = await loadCenterContactSettings();
    if (centerSettings.language && SUPPORTED_LOCALES.includes(centerSettings.language)) {
      locale = centerSettings.language;
      await setLocale(locale);
    }
  }
  
  return locale;
}
```

## Fase 7: Pulizia e ottimizzazione (1-2 ore)

### 7.1 Cercare stringhe residue

Cerca in tutto il progetto:

```bash
# Cerca stringhe italiane residue
grep -r "Salvataggio in corso" --include="*.js" --include="*.html" .
grep -r "Prenotazione pasti" --include="*.js" --include="*.html" .
```

Sostituisci con `t()`.

### 7.2 Whitelist stringhe tecniche

Alcune stringhe NON vanno tradotte:

- Log tecnici (`console.log('Caricamento...')`)
- Identificatori interni
- URL, email, codici
- Commenti nel codice

### 7.3 Performance

- [ ] I cataloghi sono in cache dopo il primo caricamento
- [ ] `applyTranslations()` non viene chiamato troppo spesso
- [ ] Le chiavi `t()` sono costanti, non generate dinamicamente

## Fase 8: Documentazione e manutenzione

### 8.1 Aggiornare README

In `/i18n/README-translations.md`, aggiorna:

- [ ] Numero esatto di chiavi per lingua
- [ ] Eventuali note specifiche per lingua
- [ ] Contatti per traduzioni

### 8.2 Processo nuove stringhe

Quando aggiungi una nuova funzionalità:

1. Aggiungi prima a `it.json`
2. Usa subito `t('nuova.chiave')` nel codice
3. Esegui validazione: `validateCatalogs()`
4. Genera traduzioni per le nuove chiavi
5. Aggiorna `en.json`, `fr.json`, `es.json`, `de.json`

### 8.3 Script di validazione (opzionale)

Crea `scripts/validate-i18n.js`:

```javascript
import { loadAllCatalogs, validateCatalogs, validatePlaceholders } from '../i18n/locales.mjs';

async function validate() {
  const catalogs = await loadAllCatalogs();
  
  // Validazione chiavi
  const keyReport = validateCatalogs(catalogs);
  console.log('Chiavi:', keyReport.valid ? '✓ OK' : '✗ ERRORI');
  
  // Validazione placeholder
  const italian = catalogs.get('it');
  for (const [locale, catalog] of catalogs) {
    if (locale === 'it') continue;
    const placeholderErrors = validatePlaceholders(italian, catalog);
    console.log(`${locale.toUpperCase()} placeholder:`, 
      placeholderErrors.length === 0 ? '✓ OK' : `✗ ${placeholderErrors.length} errori`);
  }
}

validate();
```

## Checklist finale

- [x] Tutti i file `/i18n/` copiati
- [x] `i18n.mjs` importato in `app.js`
- [x] `initI18n()` chiamato nel bootstrap
- [x] Selettore lingua collegato a `setLocale()`
- [x] Stringhe principali sostituite con `t()`
- [x] HTML statico usa `data-i18n`
- [x] Tutte le 5 lingue funzionano
- [x] Cambio lingua a runtime funziona
- [x] Date e numeri formattati correttamente
- [x] Validazione cataloghi passa (0 errori)
- [x] Documentazione aggiornata

## Tempo stimato

- **Setup iniziale**: 1-2 ore
- **Integrazione app.js**: 2-3 ore
- **Aggiornamento index.html**: 2-3 ore
- **Collegamento selettore**: 1 ora
- **Test e validazione**: 2-3 ore
- **Persistenza preferenze**: 1-2 ore
- **Pulizia e ottimizzazione**: 1-2 ore

**Totale**: 10-16 ore (1-2 giorni lavorativi)

## Supporto

Per problemi o domande:

1. Controlla `i18n-example.mjs` per esempi di utilizzo
2. Leggi `README-translations.md` per convenzioni
3. Usa `validateCatalogs()` per diagnosticare errori
4. Contatta il responsabile del progetto