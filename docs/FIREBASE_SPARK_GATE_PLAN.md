# Tavola Comune - Gate Firebase Spark

Stato: gate Firebase Spark deployato.

Data: 2026-08-04.

Obiettivo: verificare se una PWA Firebase Spark-only puo' sostituire Apps Script come base prodotto restando senza Cloud Functions, senza Blaze e senza servizi a pagamento.

## 1. Materiale Creato

- Prototipo statico PWA: `prototypes/firebase-spark-pwa/public/`
- Config Firebase Hosting/Firestore: `prototypes/firebase-spark-pwa/firebase.json`
- Regole Firestore iniziali: `prototypes/firebase-spark-pwa/firestore.rules`
- Scheduler refresh adattivo: `prototypes/firebase-spark-pwa/public/refresh-schedule.js`
- Test scheduler: `tests/firebase-spark/refresh-schedule.test.mjs`

## 2. Gate Da Superare

### PWA

- manifest riconosciuto;
- service worker registrato;
- app shell disponibile offline;
- installabilita' Chrome desktop e Android;
- comportamento iOS Safari documentato.

### Firebase Spark

- progetto su Spark, senza billing;
- deploy solo Hosting + Firestore;
- nessun Cloud Functions;
- nessun Cloud Storage;
- Auth Google admin e anonymous auth partecipante;
- Security Rules testate con emulatori.

### Quote

- simulazione 30 partecipanti ordinari;
- simulazione 100 partecipanti limite;
- vista cucina con refresh adattivo;
- conteggio letture/scritture giornaliere stimato sotto quote Spark.
- avviso di rischio se piu' schermate cucina restano accese tutto il giorno.

## 3. Refresh Cucina

La vista cucina usa questi intervalli:

- 07:00-10:00: ogni 5 minuti;
- 13:30-17:30: ogni 5 minuti;
- resto del giorno fino alle 23:00: ogni 45 minuti;
- 23:00-07:00: ogni 90 minuti.

Il timer rispetta i cambi fascia: se manca meno tempo al cambio fascia che al prossimo refresh ordinario, programma il controllo sul cambio fascia.

Con il modello locale attuale:

- 30 partecipanti, una cucina 24h, lettura tre pasti: circa 10.970 letture/giorno e 50 scritture/giorno.
- 100 partecipanti, una cucina 24h, lettura tre pasti: circa 37.400 letture/giorno e 320 scritture/giorno.
- 100 partecipanti, due cucine 24h, lettura tre pasti: supera il limite Spark di 50.000 letture/giorno.

## 4. Comandi Previsti

Da eseguire quando sara' configurato un progetto Firebase Spark:

```powershell
npm.cmd exec -- firebase login
npm.cmd exec -- firebase use tavola-comune
npm.cmd exec -- firebase deploy --only hosting,firestore --project tavola-comune
```

Per test locali gia' disponibili:

```powershell
npm.cmd test
```

## 5. Esiti

- `FIREBASE_SPARK_OK`: migrare l'MVP su Firebase Spark-only.
- `FIREBASE_SPARK_LIMITED`: procedere solo riducendo funzioni o automatismi.
- `FIREBASE_SPARK_NOT_ACCEPTABLE`: restare web app mobile-first o rivalutare Blaze con budget/alert.

## 6. Deploy Reale

Data: 2026-08-04.

Project ID: `tavola-comune`.

Esito:

- `npm test`: 27 test passati.
- `npm run emulate:firebase-rules`: 11 test Security Rules passati con emulatore Firestore.
- `npm run deploy:firebase`: completato con successo.
- Firestore rules compilate e rilasciate.
- Hosting rilasciato.
- Flusso admin demo completato.
- Flusso partecipante anonimo pubblicato.
- Flusso cucina anonimo pubblicato.

URL:

- Hosting: https://tavola-comune.web.app
- Console: https://console.firebase.google.com/project/tavola-comune/overview

Nota: la verifica HTTP automatica post-deploy dal sandbox locale e' stata bloccata dalle autorizzazioni socket, ma il deploy Firebase CLI ha restituito `Deploy complete`.

## 7. Stato Decisione

Esito attuale: `FIREBASE_SPARK_OK` per un servizio pilota da 15/30 persone e per un limite prudente di 100 persone con una sola schermata cucina attiva.

Condizioni operative:

- usare refresh adattivo, gia' implementato;
- evitare piu' display cucina sempre accesi nella fascia da 100 persone;
- restare su Hosting + Firestore + Auth;
- non introdurre Cloud Functions, Cloud Storage o API server esterni;
- monitorare le quote Firestore nella Console durante le prime giornate reali.
