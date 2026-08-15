# Setup locale

La copia di lavoro ufficiale e' esclusivamente:

```text
C:\Users\romolo\TAT
```

Non eseguire test o deploy dalla vecchia cartella OneDrive.

## Prerequisiti

- Node.js 20 o superiore.
- npm disponibile come `npm.cmd`.
- Git.
- Un login Firebase locale alla postazione.

Il progetto include una Java portatile in `.tools/java`, usata automaticamente dallo script Firebase quando `JAVA_HOME` non e' gia' configurato.

## Installazione

Da PowerShell 7:

```powershell
Set-Location "C:\Users\romolo\TAT"
npm.cmd install
```

`node_modules/` non deve essere copiato tramite cloud o versionato: su ogni PC viene rigenerato con `npm.cmd install`.

## Firebase CLI

Il progetto usa la versione locale dichiarata in `package.json`:

```powershell
npm.cmd run firebase -- --version
npm.cmd run firebase -- login --no-localhost
```

Se la sessione e' scaduta:

```powershell
npm.cmd run firebase -- login --reauth --no-localhost
```

Il frontend Firebase e' gia' configurato in `prototypes/firebase-spark-pwa/public/firebase-client.js`. Il `firebaseConfig` client non e' un segreto; non aggiungere mai service account, private key, token CLI o password al progetto.

## Nuovo centro

1. Il proprietario della piattaforma accede a `?view=admin` con il proprio account.
2. Nella sezione `Nuovi centri` genera il collegamento di invito.
3. Il direttore apre l'invito e accede con Google oppure crea un account email/password.
4. Inserisce nome e fuso, quindi preme `Crea nuovo centro`.
5. Controlla ID, nome e fuso nel pannello amministratore.
6. Distribuisce soltanto i tre link generati per quel centro.

## Verifiche

```powershell
npm.cmd test
npm.cmd run predeploy:gate
npm.cmd run emulate:firebase-rules
```

Il test emulatore richiede che la porta `8080` sia libera. Il deploy coordinato di Hosting, Rules e indici si esegue dalla radice:

```powershell
npm.cmd run deploy:firebase
```
