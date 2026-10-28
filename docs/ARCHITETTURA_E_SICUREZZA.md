# Architettura, autenticazione e sicurezza

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-16615a)](ARCHITETTURA_E_SICUREZZA.md) 🇬🇧 [![English](https://img.shields.io/badge/English-6b7280)](en/ARCHITECTURE_AND_SECURITY.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-6b7280)](es/ARQUITECTURA_Y_SEGURIDAD.md)

**Documentazione:** [README](../README.md) · [Guida all’uso](GUIDA_ALL_USO.md) · [Sviluppo e test](SVILUPPO_E_TEST.md) · [Esercizio e ripristino](OPERATIONS.md)

## Obiettivi e componenti

Le [caratteristiche di accesso](SCELTE_ACCESSO_E_SEMPLICITA.md) comprendono consultazione Cucina per chi possiede il link, accesso ordinario con sigla e password condivisa, sessioni persistenti e apertura rapida. Le autorizzazioni delle funzioni operative sono definite separatamente da regole Firestore.

Oggi a tavola è una PWA statica compatibile con Firebase Spark: nessuna Cloud Function e nessun server personalizzato. La logica gira nel browser, ma l’autorizzazione definitiva è sempre imposta dalle regole Firestore.

| Componente | Responsabilità |
| --- | --- |
| `public/index.html`, `styles.css` | struttura accessibile e sistema visivo |
| `public/app.js` | orchestrazione, stato, navigazione e rendering |
| `public/core/auth-state-machine.mjs` | macchina a stati Auth |
| `public/role-policy.mjs` | matrice centralizzata ruoli/capability |
| `participant-data.js`, `kitchen-data.js`, `daily-operations.js` | sessioni e dati operativi |
| `admin-center.js` | inviti, amministratori e passaggio dell’incarico |
| `calendar-configuration.js`, `bootstrap-demo.js` | calendario e finestre di prenotazione |
| `summary-matrix-model.js`, `summary-matrix-view.js` | Riepilogo e Cucina |
| `i18n/i18n.mjs` | cataloghi e fallback linguistici |
| `refresh-schedule.js` | aggiornamento adattivo |
| `firestore.rules` | autorizzazione lato server |
| `sw.js` | shell offline e ciclo di aggiornamento PWA |
| `tools/build-public.mjs` | build minificata in `dist` |

## Macchina a stati dell’autenticazione

```text
signed-out
  ├─ accesso/ripristino residente → restoring-resident → resident-ready
  └─ accesso amministratore       → admin-checking      → admin-ready

resident-ready ── pannello/prenotazioni ── resident-ready
admin-ready    ── pannello/prenotazioni ── admin-ready
qualunque stato ── logout esplicito → signing-out → signed-out
```

Invarianti:

- sigla + password comune producono una sessione residente;
- sigla di un vice + password amministratori aggiungono l’autorizzazione `MANAGER` tramite `viceSessions`;
- Google o email verificata identificano un amministratore Firebase forte;
- la sessione residente/vice non sostituisce Firebase Auth principale;
- una Firebase Auth precedente non promuove il residente corrente;
- revisioni e request id scartano callback tardive;
- splash e pannello restano atomici finché ruolo e dati non sono definitivi;
- refresh e navigazione non equivalgono a logout.

## Ruoli e capability

La fonte canonica è `role-policy.mjs`.

- `OWNER`: amministratore responsabile corrente; controllo completo e trasferimento dell’incarico. Non è un profilo utente distinto dall’amministratore.
- `ADMIN`: amministratore attivo/autenticato senza gestione degli amministratori, trasferimento e ripristino configurazione.
- `MANAGER`: vice con Persone, eliminazione residenti, Agenda, Aspetto e lettura/uso dei link operativi.
- residente: nessun ruolo Firestore amministrativo; prenotazioni e preferenze derivano dalla sessione personale.

`MANAGE_MASS` viene aggiunta soltanto quando la Persona ha il ruolo liturgico. OWNER, ADMIN e MANAGER non la ereditano automaticamente. I controlli frontend migliorano l’interfaccia ma non sostituiscono le regole.

Le benedizioni sono gestibili da chi può gestire le operazioni quotidiane oppure la Messa. `dailyOperations.blessingTime` contiene `HH:mm` oppure una stringa vuota. La scrittura della benedizione conserva `massScheduled`; le regole impediscono agli amministratori privi di incarico liturgico di modificarlo. Il limite `massWindowIsOpen` rimane applicato anche alla benedizione. Al salvataggio il client rifiuta date e orari passati nel fuso del centro e legge nella transazione la finestra della cena: una scadenza produce un messaggio specifico, distinto da un autentico rifiuto dei permessi. Il liturgista non amministratore vede solo Benedizioni nell’Agenda. Le sezioni leggono i propri dati all’apertura, senza letture aggiuntive all’avvio ordinario; Cucina e Riepilogo ricevono l’orario nella lettura giornaliera già esistente.

## Sessioni, token e identità tecniche

In `accessSessions` convivono:

- `PUBLIC`: accesso minimo dal link prenotazioni;
- `PERSONAL`: sessione del partecipante, valida fino a 30 giorni e rinnovata; è vincolata a un token personale revocabile con durata massima di 9000 giorni;
- `KITCHEN`: accesso indipendente dal link cucina.

Il token non contiene la password. Link e token includono il centro e sono credenziali: non vanno inseriti in documentazione, log o messaggi pubblici.

La verifica delle password condivise usa una seconda istanza Firebase Auth con identità tecniche del tipo `residenti+{centro}@tavola-comune.local` e `amministratori+{centro}[_r{rotazione}]@tavola-comune.local`. Le sessioni vice usano la credenziale tecnica associata alla rotazione attiva; il rinnovo della credenziale aggiorna l'identità tecnica senza sostituire l'account Firebase dell'amministratore.

## Modello Firestore

Il modello è centrato su `centers/{centerId}`:

- `groups`, `mealTypes`, `mealWindows`;
- `participants` privati e `publicParticipants` operativi;
- `reservationRules` e `reservationOverrides`;
- `dailyOperations` (Messa e benedizione eucaristica) e `dailyHealth` (ammalati, diete occasionali, invitati);
- `kitchenNotes`, un documento per data;
- `admins`, `adminInvitations`, `centerInvitations`;
- `accessSessions`, `viceSessions`, `linkTokens`;
- `presentationSettings/current`, `assets/avatar`;
- `auditEvents` e registrazioni operative del vice.

Ogni finestra pasto conserva già la scadenza risolta nel fuso del centro. Le note e le operazioni giornaliere sono indicizzate per data, perciò non devono comparire nei giorni successivi.

## Inviti e passaggio dell’incarico

Il percorso canonico è unico: l’amministratore responsabile crea un invito collegato a una Persona; il destinatario sceglie **Accetta** o **Rifiuta** e poi si identifica; l’invito passa da `ACTIVE` a `USED`; il responsabile conferma il trasferimento. La transazione aggiorna centro, ruoli, collegamento Persona, email e registro. Il precedente amministratore viene revocato come amministratore ma conserva la Persona per prenotarsi.

I vice non usano inviti Firebase: dipendono esclusivamente dalla spunta sulla Persona, dalla password amministratori corrente e da `viceSessions`.

## Diete, aspetto e lingue

Le diete sono `STANDARD` o codici numerici visualizzati con prefisso `D`. `dietTags` conserva la dieta abituale; `dailyHealth.dietAssignments` può sostituirla per uno o due giorni. `kitchenDietLegend` associa al codice una breve etichetta visibile in Cucina.

Palette e stile sono applicati tramite attributi su `<html>`. Le preferenze locali del residente prevalgono sul dispositivo; le impostazioni del centro restano autorevoli nel pannello amministrativo. I cataloghi JSON usano fallback lingua scelta → italiano → stringhe minime incorporate.

## PWA, cache e promemoria

Il service worker usa rete-primaria per HTML, cache-first per risorse con impronta del contenuto e stale-while-revalidate per le altre risorse dell’app. Non memorizza autonomamente dati Firestore. Un aggiornamento viene installato in attesa e diventa attivo alla successiva chiusura/riapertura, senza `skipWaiting` né ricaricamento forzato della pagina.

I promemoria sono calcolati sul dispositivo per pranzo e cena non prenotati a dieci minuti dalla scadenza. Preferenza e storico restano in `localStorage`; nessun server invia notifiche push.

## Backup e difese

Il backup esporta centro, persone, proiezioni pubbliche, pasti, finestre, prenotazioni, note, operazioni giornaliere, avatar, presentazione e audit. Esclude password, utenti Firebase, membership `admins`, sessioni e token/link. Il caricamento dal pannello ripristina soltanto la configurazione consentita.

Difese principali: email verificata per accesso password, persistenza Auth inizializzata prima dell’observer, minimo privilegio nelle regole, scadenze e revoche, schema validato, intestazioni Hosting, isolamento per centro, backup esclusi da Git e test emulatori obbligatori per le regole.

## Limiti accettati

Spark esclude funzioni server personalizzate. Ricalcolo calendario, backup e passaggio dell’incarico sono quindi operazioni client protette da regole, transazioni, batch, revisioni e ripresa dopo interruzione.

## Approfondimenti tecnici

- [Avvio, sessioni e lingue](AVVIO_E_SESSIONI.md)
- [Coerenza dei dati](COERENZA_DATI.md)
- [Build e cache](BUILD_E_CACHE.md)
- [Perimetro dell’accesso cucina](PERIMETRO_ACCESSO_CUCINA.md)
