# Problemi noti

I problemi 2–6 della stessa analisi sono stati corretti e verificati localmente; gli esiti e le indicazioni di rilascio sono in [CORREZIONI_ANALISI_2026-09-29.md](CORREZIONI_ANALISI_2026-09-29.md).

## SEC-001 — Password comune leggibile da una sessione Cucina senza token

- **Rilevato:** 29 settembre 2026, problema 1 dell'analisi locale.
- **Priorità:** alta (P1).
- **Stato:** confermato nell'emulatore; correzione rinviata.
- **Decisione del 29 settembre 2026:** documentare il problema e non intervenire per il momento, come richiesto dall'utente.

La configurazione salva `commonPassword` in chiaro nel documento del centro. Le regole consentono alle sessioni operative di leggere l'intero documento e permettono a un'identità Firebase anonima di creare una sessione `KITCHEN` conoscendo soltanto l'identificativo di un centro attivo, senza presentare il token del link cucina. La verifica successiva della sessione cucina non dipende dal token.

Nella prova con dati sintetici, un'identità priva di membership e di link cucina ha creato la sessione e letto la password comune sintetica dal documento del centro. Il difetto riguarda la password condivisa dei residenti, non quella amministrativa. La sola rigenerazione del link cucina non risolve questo percorso di accesso.

Riferimenti nel codice:

- [calendar-configuration.js](../prototypes/firebase-spark-pwa/public/calendar-configuration.js): `saveCenterWithoutCalendarRewrite` e `completeConfiguration`, assegnazione di `centerUpdate.commonPassword`.
- [firestore.rules](../prototypes/firebase-spark-pwa/firestore.rules): lettura di `centers/{centerId}`, creazione di `accessSessions/{authUid}` con scope `KITCHEN` e funzione `hasSession`.
- [kitchen-data.js](../prototypes/firebase-spark-pwa/public/kitchen-data.js): `createKitchenSession`.

La verifica riguarda il checkout locale e l'emulatore Firestore. Non sono state utilizzate credenziali reali e non è stata verificata l'esposizione della versione pubblicata.

Il rinvio mantiene aperto il problema: non costituisce una correzione né una verifica di assenza del rischio. Per questa segnalazione non sono stati modificati autenticazione, password, token, sessioni, regole o modalità di ingresso in Cucina. Un futuro intervento dovrà separare la credenziale dai dati operativi leggibili e definire la protezione dell'accesso cucina, verificando la compatibilità delle sessioni esistenti.
