# Tavola Comune - Ipotesi PWA Firebase Spark-Only

Stato: proposta di riorientamento dopo il fallimento del gate PWA su Apps Script.

Data: 2026-08-04.

Vincolo guida: usare solo servizi gratuiti senza Cloud Functions e senza passare a Blaze.

## 1. Verdetto Sintetico

Con il nuovo profilo d'uso, la PWA Firebase Spark-only e' plausibile:

- uso ordinario: 15/30 partecipanti;
- massimo operativo: 100 partecipanti attivi;
- pasti: 3 al giorno;
- cucina/admin con refresh controllato;
- storico gestito con regole ricorrenti, override puntuali e retention.

La condizione e' non progettare l'app come un backend classico. Senza Cloud Functions, il sistema deve appoggiarsi a:

- Firestore Security Rules per autorizzare accessi e scritture;
- client PWA per UI, calcoli e sincronizzazione;
- documenti precomputati per le scadenze;
- struttura dati che minimizza letture e non espone nomi alla cucina.

## 2. Servizi Ammessi

| Servizio | Uso | Piano gratuito |
| --- | --- | --- |
| Firebase Hosting classico | App PWA statica, manifest, service worker, icone, JS/CSS | Si, Spark |
| Cloud Firestore | Dati applicativi | Si, entro quote Spark |
| Firebase Authentication | Google login admin, anonymous auth partecipanti | Si, evitando Phone Auth |
| Firebase App Check | Protezione aggiuntiva anti-abuso | Si, con limiti/provider da verificare |

Servizi esclusi:

- Cloud Functions, perche' richiede Blaze;
- Cloud Storage for Firebase, perche' dal 2026 richiede Blaze per l'uso operativo;
- Phone Auth/SMS, perche' genera costi;
- Firebase App Hosting, Cloud Run, BigQuery, Maps, AI e altri servizi Google Cloud a pagamento.

## 3. Quote Da Rispettare

Quote ufficiali rilevanti verificate il 2026-08-04:

- Firebase Hosting Spark: 10 GB storage, 360 MB/giorno data transfer, custom domain e SSL inclusi.
- Cloud Firestore Spark: 1 GiB storage, 50.000 document reads/giorno, 20.000 document writes/giorno, 20.000 deletes/giorno, 10 GiB/mese network egress.
- Firebase Authentication: Google/social sign-in e anonymous auth utilizzabili senza costo; evitare Phone Auth.

Riferimenti:

- https://firebase.google.com/pricing
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

## 4. Stima Di Consumo

Scenario ordinario, 30 partecipanti:

- 30 partecipanti aprono l'app 2 volte al giorno;
- circa 15/25 letture per apertura, se i dati sono compatti;
- 1/3 scritture per partecipante nei giorni di modifica;
- cucina/admin aggiornano i conteggi con refresh adattivo o manuale.

Ordine di grandezza:

- letture totali stimate con una cucina sempre aperta e tre pasti letti a ogni refresh: circa 10.970 al giorno;
- scritture totali stimate: circa 50 al giorno.

Scenario massimo, 100 partecipanti:

- 100 partecipanti aprono l'app 3 volte al giorno;
- 20 letture medie per apertura;
- 3 scritture medie nei giorni di modifica;
- cucina/admin leggono range brevi.

Ordine di grandezza:

- letture totali stimate con una cucina sempre aperta e tre pasti letti a ogni refresh: circa 37.400 al giorno;
- scritture totali stimate: circa 320 al giorno;
- margine scritture molto ampio;
- margine letture sufficiente con una schermata cucina, ma da monitorare.

Rischio principale:

- una vista cucina con refresh troppo frequente puo' consumare molte letture. Esempio: leggere 300 documenti ogni 10 secondi per 8 ore supera 80.000 letture. Va evitato.
- due schermate cucina sempre accese, entrambe con lettura completa di tre pasti per 100 partecipanti, possono superare le 50.000 letture/giorno.

Regola di prodotto:

- niente polling aggressivo;
- preferire refresh manuale, realtime listener su range stretto, o aggiornamento automatico adattivo;
- cache locale e letture per data corrente/prossimi pasti, non per storico ampio.
- una sola schermata cucina "live" e' la configurazione gratuita consigliata; eventuali altri dispositivi devono usare refresh manuale o range piu' stretto.

## 4.1 Refresh Adattivo Cucina/Admin

Per la vista cucina il refresh automatico segue fasce orarie nel fuso del centro:

| Fascia | Intervallo | Motivo |
| --- | --- | --- |
| 07:00-10:00 | 5 minuti | Preparazione e assestamento colazione/pranzo |
| 13:30-17:30 | 5 minuti | Preparazione cena e modifiche pomeridiane |
| 10:00-13:30, 17:30-23:00 | 45 minuti | Bassa pressione operativa |
| 23:00-07:00 | 90 minuti | Fascia notturna |

Regole UX:

- pulsante di aggiornamento manuale sempre disponibile;
- aggiornamento immediato quando la schermata torna in primo piano e i dati sono scaduti;
- nessun polling sotto i 5 minuti nel piano gratuito;
- il timer non deve saltare un cambio fascia: alle 06:30 il prossimo controllo e' alle 07:00, non alle 08:00.

Il modello locale `tools/lib/spark-quota-model.mjs` simula 103 refresh automatici in 24 ore con queste fasce.

## 5. Architettura Proposta

Frontend:

- PWA statica su Firebase Hosting;
- service worker per app shell offline;
- IndexedDB/Firestore offline persistence per ultimo stato e scritture in attesa;
- UI mobile-first per partecipanti, admin e cucina.

Autenticazione:

- admin con Firebase Auth Google provider;
- partecipanti e cucina con anonymous auth;
- accesso partecipanti con sigla, password comune e token personale casuale conservato sul dispositivo per 9.000 giorni;
- link pubblici e cucina con token ad alta entropia;
- il client crea sessioni anonime brevi, vincolate al token e rinnovabili entro la sua scadenza.

Autorizzazione:

- Firestore Security Rules verificano `request.auth.uid`;
- una sessione anonima autorizza solo lo scope previsto;
- lo scope `PUBLIC` e' di sola lettura e lo scope `PERSONAL` puo' modificare un solo partecipante;
- admin autorizzati tramite documento allowlist e email verificata;
- cucina legge solo dati aggregabili o pseudonimi, mai nomi.

Persistenza:

- Firestore e' il database principale;
- Google Sheets puo' diventare export/manual backup, non archivio live;
- Drive/loghi evitati nell'MVP Spark-only, oppure logo come asset statico incluso nel deploy.

## 6. Modello Dati Indicativo

```text
centers/{centerId}
centers/{centerId}/admins/{adminEmailKey}
centers/{centerId}/groups/{groupId}
centers/{centerId}/participants/{participantId}
centers/{centerId}/publicParticipants/{participantId}
centers/{centerId}/mealTypes/{mealTypeId}
centers/{centerId}/mealWindows/{yyyyMMdd_mealTypeId}
centers/{centerId}/linkTokens/{tokenId}
centers/{centerId}/accessSessions/{authUid}
centers/{centerId}/reservationRules/{ruleId}
centers/{centerId}/reservationOverrides/{participantId_yyyyMMdd_mealTypeId}
centers/{centerId}/reservationOverrideHistory/{historyId}
```

Separazione PII:

- `participants` contiene dati admin, inclusi nomi completi;
- `publicParticipants` contiene solo dati minimi per la scelta nome pubblica;
- cucina non legge `participants` ne' `publicParticipants` se non serve;
- gli override possono contenere `participantId`, `groupId`, data, pasto, stato, ma non nome.

## 7. Scritture E Scadenze Senza Cloud Functions

Problema: senza backend, non possiamo nascondere logica server in una funzione.

Soluzione:

- precomputare `mealWindows/{yyyyMMdd_mealTypeId}` con `opensAt`, `closesAt`, `status`;
- le Security Rules permettono la scrittura di override solo se `request.time < closesAt`;
- l'admin genera o aggiorna finestre per i prossimi 12/24 mesi dalla UI;
- una schermata admin segnala quando le finestre future stanno finendo.

Compromesso:

- "tutti i giorni futuri" resta una regola ricorrente aperta;
- la modifica puntuale resta consentita solo sulle date per cui esiste una finestra pasto precomputata;
- questo e' accettabile per una gestione reale annuale o biennale.

## 8. Prenotazioni E Conteggi

Per evitare concorrenza fragile:

- l'override corrente usa un ID deterministico: `participantId_yyyyMMdd_mealTypeId`;
- una modifica e' un `set` o `update` del documento corrente;
- la history e' opzionale e puo' essere limitata nel tempo;
- idempotenza tramite `requestId` salvato nell'override.

Conteggi:

- il client admin legge regole, override e partecipanti per il range richiesto e calcola i nomi;
- il client cucina legge solo dati pseudonimi necessari e calcola numeri;
- nessun contatore scritto da client non fidati viene considerato autorevole.

## 9. Offline

Livelli possibili:

- app shell sempre disponibile dopo il primo caricamento;
- ultimo stato consultato disponibile offline;
- modifiche offline accodate dal client Firestore;
- al ritorno online, Firestore sincronizza e le Security Rules possono rifiutare scritture ormai fuori scadenza.

Messaggio UX necessario:

- se una modifica era offline e viene rifiutata per scadenza, l'app deve mostrarlo chiaramente.

## 10. Rischi

- Le Security Rules diventano parte critica del prodotto: vanno testate con emulatori.
- I token non possono essere hashati lato server senza funzioni; vanno trattati come bearer secret ad alta entropia e document ID non indovinabili.
- La cucina non deve usare polling aggressivo.
- Lo storico completo di override giornalieri per molti anni puo' avvicinarsi al limite 1 GiB se non si usano regole ricorrenti e retention.
- Alcune logiche comode da backend, come backup automatico e invio email link, vanno rinviate o rese manuali.

## 11. Gate Firebase Spark

Prima di migrare tutto, creare un prototipo minimo con:

1. PWA installabile su Firebase Hosting.
2. Auth Google admin e anonymous auth partecipante.
3. Accesso personale con sigla, password comune, token casuale del dispositivo e sessione anonima.
4. Security Rules che permettono una sola scrittura override autorizzata e bloccano una scrittura fuori scadenza.
5. Vista cucina che legge solo dati senza nomi.
6. Calcolo conteggio per oggi/domani.
7. Test emulatori per rules.
8. Stima reale di letture/scritture con 30 e 100 partecipanti simulati.

Esiti:

- `FIREBASE_SPARK_OK`: si puo' migrare l'MVP su Firebase Spark-only.
- `FIREBASE_SPARK_LIMITED`: si puo' procedere solo riducendo funzionalita' o automatismi.
- `FIREBASE_SPARK_NOT_ACCEPTABLE`: restare web app mobile-first o accettare un piano Blaze controllato.

## 12. Decisione Provvisoria

Con il nuovo limite massimo di 100 partecipanti e uso ordinario 15/30, Firebase Spark-only e' la candidata migliore per ottenere una PWA vera restando nel gratuito.

La raccomandazione e':

1. sospendere lo sviluppo Apps Script come prodotto finale PWA;
2. mantenere il materiale Apps Script come prototipo e riferimento di dominio;
3. costruire una Milestone 2 alternativa: gate Firebase Spark-only;
4. procedere alla migrazione solo se le Security Rules coprono bene token, scadenze e privacy cucina.
