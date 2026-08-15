# Tavola Comune - Decisioni progettuali

Questo file registra decisioni e assunzioni operative emerse durante la Milestone 0. Le decisioni qui presenti completano il documento principale di architettura.

Stato: bozza approvabile, da confermare prima della Milestone 1.

## D001 - Regole Ricorrenti E Override Puntuali

Decisione: la compilazione massiva genera regole ricorrenti, non righe future per ogni data.

Motivazione:

- evita crescita artificiale del foglio;
- rende sostenibili intervalli aperti come "tutti i giorni futuri";
- gestisce eccezioni con override puntuali;
- mantiene conteggi calcolabili on demand.

Conseguenza: ogni vista su un intervallo deve calcolare lo stato effettivo combinando regole attive e override correnti.

## D002 - Gate PWA E Gate Sheets Sono Indipendenti

Decisione: la Milestone 1 contiene due gate separati:

- gate PWA/installabilita';
- gate Sheets/LockService/concorrenza.

Regola di avanzamento:

- Se `SHEETS_OK` e PWA e' `PWA_OK` o `PWA_LIMITED`, si puo' procedere alla Milestone 2.
- Se `SHEETS_OK` e PWA e' `PWA_NOT_SUPPORTED`, si puo' procedere alla Milestone 2 solo aggiornando il posizionamento: web app mobile-first, non PWA.
- Se `SHEETS_LIMITED`, si puo' procedere alla Milestone 2 solo riducendo i limiti operativi dichiarati o modificando strategia di scrittura/cache.
- Se `SHEETS_NOT_ACCEPTABLE`, il progetto non deve procedere come disegnato: serve una revisione architetturale dentro i vincoli Google Workspace.
- Se il deployment admin/pubblico o il modello token anonimo non funzionano, la Milestone 2 resta bloccata.

Motivazione: PWA e concorrenza sono rischi diversi. Un fallimento PWA non deve bloccare il prodotto se il flusso core su Google Sheets e Apps Script resta solido.

## D003 - Enforcement Deterministico Degli Override

Decisione: `ReservationOverrides` sara' append-only con una sola riga corrente per chiave logica `participantId + mealDate + mealTypeId`.

Campi necessari:

- `effect`: `PRESENT` oppure `ABSENT`;
- `lifecycleStatus`: `CURRENT`, `SUPERSEDED`, `VOID`;
- `supersededAt`: istante UTC opzionale;
- `supersededByOverrideId`: ID opzionale della riga che ha sostituito quella precedente;
- `requestId`: idempotenza client.

Algoritmo di scrittura:

1. Acquisire lock server.
2. Validare token/admin, partecipante, pasto, data e scadenza.
3. Cercare una richiesta gia' gestita con lo stesso `requestId`; se esiste, restituire l'esito precedente.
4. Cercare tutte le override `CURRENT` per la chiave logica.
5. Generare una nuova override con `lifecycleStatus = CURRENT`.
6. Marcare ogni override precedente come `SUPERSEDED`, valorizzando `supersededAt` e `supersededByOverrideId`.
7. Scrivere audit log minimale.
8. Rilasciare lock.

Regola di lettura:

- In condizioni sane esiste una sola override `CURRENT`.
- Se per corruzione o errore storico ne esistono piu' di una, vince la riga con `updatedAt` piu' recente; in caso di parita' vince `overrideId` lessicograficamente maggiore. Il sistema deve loggare l'anomalia e offrire una riparazione.

Motivazione: Sheets non ha vincoli univoci nativi. L'append-only evita perdita di storico, mentre `lifecycleStatus` rende deterministica la lettura.

## D004 - Regole PAUSED E Override Future

Decisione: una `ReservationRule` in stato `PAUSED` non contribuisce al calcolo delle presenze. Le override correnti restano pero' valide, anche se erano state create mentre la regola era attiva.

Esempio:

- Mario ha una regola attiva per tutte le cene.
- Mario aggiunge override `PRESENT` per una cena speciale futura.
- L'admin mette in pausa la regola.
- La cena speciale resta presente, perche' l'override e' una dichiarazione esplicita.

Per invalidare anche le override future serve un'azione amministrativa distinta, ad esempio "sospendi regole e annulla eccezioni future", da valutare dopo l'MVP.

Motivazione: pausa della regola e annullamento delle eccezioni sono intenzioni diverse. Separarle riduce sorprese e perdita di dati.

## D005 - Risposte Provvisorie Alle Domande Aperte

Assunzioni consigliate per avviare la Milestone 1:

1. Installazione mono-centro per MVP. Il modello dati conserva `centerId` per migrazione futura, ma l'interfaccia gestisce un centro alla volta.
2. Admin iniziale con account Google verificabile; supporto migliore se dentro lo stesso dominio Workspace. Gmail personali da verificare nel gate admin.
3. Target aggiornato: uso ordinario 15/30 partecipanti, massimo operativo 100 partecipanti attivi, 15 gruppi, 3 pasti. Lo storico lungo va gestito con retention o export per restare nel piano gratuito.
4. Vista cucina: totale centro e, opzionalmente, subtotali per gruppo senza nomi.
5. "Tutti i giorni futuri": regola aperta senza `endsOn`, con suggerimento UI di rivederla a fine anno/periodo.
6. Gmail automatico non incluso nell'MVP; per partire bastano copia link e stampa/elenco link.
7. Lingua iniziale: italiano, con struttura pronta per i18n.
8. Dispositivi gate PWA: Chrome desktop, Android Chrome, iPhone Safari, tablet condiviso se disponibile, desktop cucina.
9. Picco realistico per test: 20/30 persone nello stesso intervallo breve, con test limite a 100 partecipanti attivi. Le interfacce cucina/admin non devono usare refresh aggressivi che consumano quote inutilmente.

Queste risposte non chiudono il prodotto per sempre: servono a rendere concreta la Milestone 1.

## D006 - Valutare Una PWA Firebase Spark-Only

Decisione: scartare Cloud Functions per rispettare il vincolo "solo servizi gratuiti" e valutare una vera PWA su Firebase Spark usando solo:

- Firebase Hosting classico per app shell, manifest, service worker e asset leggeri;
- Cloud Firestore come database principale;
- Firebase Authentication con Google login admin e sessioni anonime per link pubblici/personali;
- Firestore Security Rules come barriera autorizzativa;
- nessun Cloud Functions, nessun Cloud Storage for Firebase, nessun SMS/Phone Auth.

Motivazione:

- Apps Script/HTML Service non ha superato il gate PWA installabile.
- Firebase Hosting consente una PWA vera con service worker nello stesso origin.
- Con 15/30 utenti ordinari e massimo 100 utenti, le quote Spark di Firestore e Hosting sono plausibilmente sufficienti se il modello dati evita letture ripetitive e storico eccessivo.
- Cloud Functions avrebbe quote gratuite su Blaze, ma richiede billing e quindi non rispetta il vincolo operativo scelto.

Conseguenze progettuali:

- La logica server tradizionale deve essere sostituita da un modello client + regole Firestore.
- I token dei link diventano bearer secret ad alta entropia, usati per creare sessioni anonime autorizzate dalle regole.
- Le scadenze devono essere precomputate in documenti leggibili dalle regole, perche' senza funzioni non esiste un backend che calcoli cutoff dinamici al momento della scrittura.
- I conteggi cucina/admin devono essere calcolati dal client leggendo dati minimizzati e autorevoli, non da contatori fidati aggiornati da client non privilegiati.
- La vista cucina deve evitare nomi e PII; puo' leggere solo documenti necessari al conteggio.
- La vista cucina usa refresh adattivo: ogni 5 minuti nelle fasce operative 07:00-10:00 e 13:30-17:30, ogni 45 minuti nel resto della giornata, ogni 90 minuti tra 23:00 e 07:00, con aggiornamento manuale sempre disponibile.
- Serve un gate Firebase Spark dedicato prima della migrazione: quote, rules, offline sync, installabilita', privacy cucina.

Documento di approfondimento: `docs/FIREBASE_SPARK_ONLY_PWA.md`.
