# PWA Firebase

Questa cartella contiene l’applicazione distribuibile di **Tutti a tavola**.

- `public/`: sorgenti della PWA;
- `dist/`: pacchetto generato dal build;
- `firebase.json`: Hosting, intestazioni e configurazione Firestore;
- `firestore.rules`: autorizzazione lato server;
- `firestore.indexes.json`: indici Firestore;
- `scripts/`: controlli locali dell’applicazione.

Non modificare direttamente `dist`. Dal repository principale usare:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run build"
```

La documentazione mantenuta parte dal [README principale](../../README.md). Per dettagli tecnici vedere [Architettura, autenticazione e sicurezza](../../docs/ARCHITETTURA_E_SICUREZZA.md).
