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
