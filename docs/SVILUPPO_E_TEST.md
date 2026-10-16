# Sviluppo e test

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-16615a)](SVILUPPO_E_TEST.md) 🇬🇧 [![English](https://img.shields.io/badge/English-6b7280)](en/DEVELOPMENT_AND_TESTING.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-6b7280)](es/DESARROLLO_Y_PRUEBAS.md)

## Requisiti

- Node.js `24.12.0` come indicato in `.nvmrc`;
- npm;
- PowerShell 7 su Windows;
- Java 21 per gli emulatori Firebase (è supportato anche il runtime portatile in `.tools`).

## Installazione

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm install"
```

## Server locale

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/dev-server.mjs 4180"
```

Il server espone la build di sviluppo su `http://127.0.0.1:4180`. Usare esclusivamente credenziali e centri autorizzati; non copiare dati reali nelle fixture.

## Struttura del repository

```text
prototypes/firebase-spark-pwa/
  public/      sorgenti della PWA
  dist/        pacchetto generato e distribuito
  scripts/     validatori locali
  firebase.json
  firestore.rules
tests/
  firebase-spark/   test applicativi e statici
  firebase-rules/   test delle regole
tools/              build, gate, deploy, backup e verifica release
docs/               documentazione mantenuta
```

Non modificare direttamente `dist`: eseguire la build dopo avere cambiato `public`.

La build genera moduli JavaScript e CSS con hash in `dist/assets` e un `build-manifest.json`. Include Firebase completo, mantiene Auth persistente e carica su richiesta le funzioni amministrative. Conservare i moduli immutabili in `dist/assets`: le pagine aperte possono richiederli durante un aggiornamento. Il service worker viene compilato con l'elenco dei moduli necessari ai residenti. `tools/verify-build.mjs` controlla hash, sorgenti, riferimenti e separazione dei moduli; il gate esegue anche `tests/build`.

Per provare il pacchetto di produzione, impostare `TAT_SERVE_ROOT=prototypes/firebase-spark-pwa/dist` prima di avviare `tools/dev-server.mjs`. `TAT_BUILD_OUTPUT` consente soltanto l'output ordinario oppure directory temporanee sotto `.tools/build-tests`, per evitare cancellazioni di altre cartelle.

## Comandi principali

```powershell
# Suite applicativa e traduzioni
pwsh.exe -NoLogo -NoProfile -Command "npm test"

# Solo frontend
pwsh.exe -NoLogo -NoProfile -Command "npm run test:firebase"

# Validazione cataloghi i18n
pwsh.exe -NoLogo -NoProfile -Command "npm run test:i18n"

# Regole Firestore con emulatori
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"

# Build di produzione
pwsh.exe -NoLogo -NoProfile -Command "npm run build"

# Gate prima del rilascio
pwsh.exe -NoLogo -NoProfile -Command "npm run predeploy:gate"
```

## Criteri minimi di accettazione

### Misure locali dell'avvio

Aggiungere `diagnostics=startup` alla query della pagina (con `&` se contiene già altri parametri).
Console e User Timing mostrano misure `tat:*`, senza inviare o salvare telemetria:

- `auth-start` e `auth-ready`: inizio Auth e prima notifica del ripristino, anche senza utente;
- `app-evaluated`: inizio esecuzione di app.js dopo i suoi import statici;
- `calendar-ready`: primo calendario personale renderizzato dopo le verifiche previste;
- `startup-gate-released`: prima rimozione del blocco iniziale, anche per login o timeout.

Questi punti sono misurati dall'inizio della navigazione e registrati una sola volta per documento.
`calendar-ready` indica che il DOM è pronto, non il momento del paint. Non confondere il timeout
dello splash con un calendario caricato. Le misure già presenti (`auth-restore`, `calendar-settings`,
`domain:*`) indicano invece la durata della singola operazione e possono ripetersi durante i refresh.
Per HTML e service worker usare anche la voce Navigation Timing negli strumenti del browser.
Confrontare separatamente prima visita, riapertura con cache, token da rinnovare e ripresa della PWA.
Il navigation preload è facoltativo secondo il browser; il fallback HTML dopo 1.200 ms rimane attivo.

### Verifiche funzionali

Per autenticazione e autorizzazione verificare:

1. residente con sigla e password comune;
2. vice con sigla e password amministratori;
3. amministratore con Google;
4. amministratore con email verificata e password;
5. ingresso e uscita dal pannello;
6. passaggio pannello/prenotazioni e ritorno;
7. refresh in ogni stato;
8. logout e nuovo accesso;
9. chiusura e riapertura della PWA;
10. schede e comandi corretti per ruolo.

Per modifiche visive verificare almeno una larghezza mobile e una desktop, senza affidarsi soltanto ai test statici.

## Internazionalizzazione

Le lingue supportate sono italiano, inglese, francese, spagnolo e tedesco. Ogni nuova chiave deve essere presente in tutti i cataloghi sotto `public/i18n`. Il validatore rifiuta chiavi mancanti, valori vuoti e placeholder incoerenti.

## Dati di prova

- Non salvare credenziali reali nel codice o nei test.
- Non committare URL contenenti token operativi.
- Conservare backup e file diagnostici soltanto nelle cartelle ignorate da Git.
- Preferire emulatori e fixture sintetiche per test distruttivi.
