# Traduzioni i18n - Prenotazione pasti

Questo documento descrive come gestire le traduzioni dell'applicazione.

## Struttura file

```
/i18n/
├── i18n.mjs              # Motore di internazionalizzazione
├── locales.mjs           # Utility caricamento cataloghi
├── it.json               # Catalogo italiano (CANONICO)
├── en.json               # Catalogo inglese
├── fr.json               # Catalogo francese
├── es.json               # Catalogo spagnolo
├── de.json               # Catalogo tedesco
└── README-translations.md # Questo file
```

## Regole per i traduttori

### Cosa fare

1. **Tradurre SOLO i valori** - Mai modificare le chiavi JSON
2. **Mantenere tutte le chiavi** - Non eliminare né aggiungere chiavi
3. **Conservare i placeholder** - `{name}`, `{count}`, `{time}`, `{min}`, `{max}` devono restare intatti
4. **Conservare i codici** - `STANDARD`, `CARDIO`, `DIAB` ecc. restano invariati
5. **Usare UTF-8** - Caratteri Unicode reali (es. `é°°`, `ñ°°·`, `ß°`)
6. **JSON valido** - Verificare che il file sia JSON valido prima di consegnare

### Cosa NON fare

1. ❌ Non modificare le chiavi (es. `common.actions.save`)
2. ❌ Non cambiare la struttura del JSON
3. ❌ Non rimuovere o aggiungere chiavi
4. ❌ Non tradurre i placeholder `{variable}`
5. ❌ Non convertire caratteri Unicode (es. `é°°` → `e`)

## Esempio

**Italiano (it.json)**:
```json
{
  "common.actions.save": "Salva",
  "diet.numbered": "Dieta {number}",
  "participant.meal.selectedCount.one": "{count} pasto selezionato",
  "participant.meal.selectedCount.other": "{count} pasti selezionati"
}
```

**Inglese (en.json)**:
```json
{
  "common.actions.save": "Save",
  "diet.numbered": "Diet {number}",
  "participant.meal.selectedCount.one": "{count} meal selected",
  "participant.meal.selectedCount.other": "{count} meals selected"
}
```

## Pluralizzazione

Alcune chiavi hanno suffissi per la pluralizzazione:

- `.one` - Singolare (es. `{count} pasto`)
- `.other` - Plurale (es. `{count} pasti`)

Il sistema usa `Intl.PluralRules` per selezionare automaticamente la forma corretta in base alla lingua e al numero.

## Validazione

Prima di consegnare una traduzione, eseguire:

```javascript
import { loadAllCatalogs, validateCatalogs } from './i18n/locales.mjs';

const catalogs = await loadAllCatalogs();
const report = validateCatalogs(catalogs);

if (!report.valid) {
  console.error('Traduzione incompleta:', report.missingKeys);
}
```

## Contesto delle chiavi

Le chiavi sono organizzate per namespace:

- `common.*` - Testi condivisi (azioni, stati, navigazione)
- `auth.*` - Autenticazione e login
- `participant.*` - Vista partecipante
- `diet.*` - Opzioni e validazione diete
- `meal.*` - Stati e messaggi pasti
- `week.*`, `summary.*`, `kitchen.*` - Viste principali
- `admin.*` - Pannello amministrativo
- `errors.*` - Messaggi di errore
- `a11y.*` - Accessibilità°°
- `time.*` - Riferimenti temporali
- `role.*` - Ruoli utente
- `confirm.*` - Dialoghi di conferma
- `placeholder.*` - Testi placeholder
- `help.*` - Testi di aiuto

## Ambiguità°°

Se una chiave non è chiara nel contesto:

1. **Non interpretare liberamente** - Mantenere il testo italiano come riferimento
2. **Segnare in una nota separata** - Elencare le chiavi ambigue con domande specifiche
3. **Chiedere chiarimenti** - Prima di procedere con traduzioni incerte

## Strumenti utili

### Verifica parità°° chiavi

```bash
# Confronta chiavi tra italiano e altre lingue
node scripts/validate-keys.js
```

### Estrazione stringhe

```bash
# Estrae stringhe hardcoded da HTML e JS
node scripts/extract-strings.js
```

### Controllo placeholder

```bash
# Verifica che i placeholder corrispondano
node scripts/check-placeholders.js
```

## Aggiornamento traduzioni

Quando si aggiunge una nuova funzionalità:

1. **Aggiungere prima a `it.json`** - L'italiano è il catalogo canonico
2. **Eseguire validazione** - Verificare che tutte le lingue abbiano le nuove chiavi
3. **Segnalare ai traduttori** - Inviare solo le chiavi nuove da tradurre
4. **Non modificare chiavi esistenti** - Se una traduzione va cambiata, aggiornare solo il valore

## Contatti

Per domande o chiarimenti sulle traduzioni, contattare il responsabile del progetto.