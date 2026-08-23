# Esercizio, rilascio e ripristino

## Gestione operativa delle sessioni

Entrare e uscire dal pannello è navigazione e non distrugge la sessione. Il comando **Esci** termina invece deliberatamente l’accesso del dispositivo.

### Telefono smarrito o dispositivo non più disponibile

La revoca del singolo dispositivo richiede il relativo token, che normalmente non è disponibile a distanza. In caso di rischio, l’amministratore deve **sospendere temporaneamente la persona**: l’operazione revoca le credenziali operative note e **blocca tutti i suoi dispositivi**. Dopo la verifica, la persona può essere riattivata e accedere nuovamente.

La disattivazione di un centro conserva i dati: **l'azione non è presentata come cancellazione definitiva** e deve indicare chiaramente che le informazioni resteranno conservate.

I link operativi vanno rigenerati quando si sospetta che siano stati distribuiti a destinatari non previsti.

## Controlli prima del rilascio

1. Verificare che il worktree contenga soltanto le modifiche previste.
2. Eseguire test, validazione i18n e test delle regole.
3. Eseguire la build e controllare `git diff --check`.
4. Provare nel browser i percorsi modificati su mobile e desktop.
5. Creare un commit descrittivo che costituisca il punto di ritorno.
6. Pubblicare Hosting; includere Firestore soltanto se regole o indici sono cambiati.
7. Verificare gli hash serviti dal sito pubblico.

## Deploy

Hosting e regole:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:firebase"
```

Solo Hosting:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/firebase-cli.mjs --config firebase.json --project tavola-comune deploy --only hosting"
```

Il wrapper esegue la build prima del deploy e usa la configurazione contenuta in `prototypes/firebase-spark-pwa`.

Verifica della release:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run release:verify"
```

## Backup

Dal pannello **Manutenzione** il responsabile può scaricare un backup JSON completo del centro. Il file contiene dati personali e operativi:

- conservarlo cifrato o in uno spazio ad accesso ristretto;
- non inviarlo per posta elettronica non protetta;
- non aggiungerlo a Git;
- verificare che il file sia leggibile prima di considerarlo una copia valida.

Ispezione locale senza scritture:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:inspect -- <percorso-backup.json>"
```

## Prova di ripristino

Il ripristino va provato prima nell’emulatore:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run test:backup-restore-emulator -- <percorso-backup.json>"
```

Un ripristino reale modifica dati: richiede autorizzazione esplicita, backup preventivo, identificazione esatta del centro e verifica successiva. Non cancellare né sovrascrivere dati di produzione per diagnosticare un problema di interfaccia.

## Ritorno a una versione precedente

1. Individuare il commit stabile precedente.
2. Creare una modifica di ripristino tracciabile, senza cancellare la cronologia.
3. Rieseguire test e build.
4. Pubblicare nuovamente Hosting e, se necessario, le regole compatibili.
5. Verificare la release pubblica.

Firebase Hosting conserva anche la cronologia delle release, ma il commit Git resta la fonte che permette di ricostruire esattamente codice, test e documentazione.
