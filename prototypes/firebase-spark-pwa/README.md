# Tavola Comune - Firebase Spark PWA Gate

Prototipo minimo per verificare una PWA Firebase Spark-only.

Vincoli:

- Firebase Hosting classico;
- Cloud Firestore;
- Firebase Auth Google, email/password verificata e sessioni tecniche anonime;
- nessun Cloud Functions;
- nessun Cloud Storage for Firebase;
- nessun servizio Blaze.

## File

- `firebase.json`: configurazione Hosting e Firestore.
- `firestore.rules`: regole iniziali per admin, sessioni anonime, cucina e override.
- `public/`: app shell PWA statica.
- `public/refresh-schedule.js`: refresh adattivo cucina/admin.

Documenti collegati:

- `docs/SETUP_LOCALE.md`: setup multi-postazione.
- `docs/FIREBASE_DATA_MODEL.md`: modello dati Firestore.
- `docs/NEXT_STEPS_FIREBASE.md`: lavoro residuo per completare il gate.

## Test Locale

Dal repository principale:

```powershell
npm.cmd test
```

Per aprire il prototipo senza installare pacchetti:

```powershell
node prototypes/firebase-spark-pwa/dev-server.mjs 4173
```

## Deploy

Quando esistera' un progetto Firebase Spark:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run firebase -- login --no-localhost"
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:firebase"
```

Deploy attuale:

```text
Prenotazioni: https://tavola-comune.web.app/?view=participant&t=<token-residenti>&c=<centerId>&access=friendly
Riepilogo:    https://tavola-comune.web.app/?view=summary&t=<token-residenti>&c=<centerId>
Cucina:       https://tavola-comune.web.app/?view=kitchen&t=<token-cucina>&c=<centerId>
```

I collegamenti completi vengono generati nel pannello del centro. Il parametro
`c` va sempre conservato quando il link viene distribuito: identifica la sede e
impedisce che il browser riutilizzi per errore l'ultimo centro aperto sullo
stesso dispositivo.

Il link cucina viene mostrato soltanto nell'area amministrativa. La vista espone
conteggi e diete, mai i nomi dei partecipanti. L'amministratore puo' associare
una nota operativa distinta a oggi e domani.

Il service worker usa la rete come fonte primaria e la cache come ripiego per
l'app shell. In assenza di connessione le modifiche vengono sospese e segnalate;
i dati Firestore non vengono salvati autonomamente in cache dal service worker.

Prima di ogni deploy reale vanno completati i test emulatori sulle Security Rules.

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
```

La suite include il percorso `PERSONAL` completo e un batch di cinque
`reservationOverrides`, pari alla dimensione massima usata dall'app. Il test
serve a controllare sia le autorizzazioni sia il limite di accessi documentali
eseguiti dalle regole per una singola richiesta.

## Note Security Rules

Le sessioni create dai link devono avere una scadenza non successiva a quella del documento `linkTokens/{tokenId}`. Le rules rifiutano sessioni scadute anche se il documento `accessSessions/{authUid}` resta `ACTIVE`.

Le sessioni `KITCHEN` e `PUBLIC` non possono impostare `participantId`. `PUBLIC` serve soltanto alle viste riepilogative e non puo' scrivere prenotazioni. Dopo la verifica di sigla e password comune, l'account tecnico genera un token casuale `PERSONAL` legato al partecipante; il dispositivo lo conserva per 9.000 giorni e rinnova automaticamente sessioni operative piu' brevi. Le regole ammettono un massimo di 9.001 giorni per assorbire lo scarto tra l'orologio del dispositivo e quello del server durante la creazione; l'applicazione genera comunque token di 9.000 giorni. Il comando `Esci` revoca token e sessione.

## Proprietario della piattaforma

L'account identificato da `isBootstrapOwner()` e' il punto di controllo globale necessario per creare gli inviti dei centri e consultare il registro multi-centro senza servizi backend a pagamento. Questo ruolo puo' leggere dati amministrativi trasversali ai centri: la compromissione dell'account coinvolgerebbe l'intera piattaforma. Il rischio e' accettato per l'architettura Firebase Spark e richiede un account dedicato, password unica, verifica in due passaggi e controllo periodico delle sessioni Google attive.
