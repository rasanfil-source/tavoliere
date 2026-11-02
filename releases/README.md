# Ripristino della versione funzionante precedente alla pulizia

La versione online confermata funzionante dall'utente prima del rilascio del 2 novembre 2026 è:

- Sito: https://tavola-comune.web.app
- Versione immutabile Firebase Hosting: `46950faa4c703acd`
- Build: `d083252bae267dff`
- Registro e impronte dei file: `2026-11-02-before-startup-cleanup.json`.

Dalla radice del repository, per ripristinarla subito:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/rollback-hosting.mjs --apply"
```

Il comando ripubblica la versione Firebase già esistente e confronta i file online con le impronte salvate. Richiede l'accesso Firebase autorizzato. Non ricompila i sorgenti e non modifica Firestore, prenotazioni, utenti o credenziali. Senza argomenti mostra soltanto la destinazione; `--verify` esegue solo il confronto.

Alternativa manuale: Firebase Console → Hosting → cronologia dei rilasci → ripristinare la versione `46950faa4c703acd` (rilascio del 1 novembre 2026 alle 20:56:54 UTC).

Dopo il ripristino, ricaricare la pagina; per una PWA già aperta può essere necessario chiuderla e riaprirla affinché il service worker precedente venga sostituito. Il rollback dell'hosting non annulla il commit GitHub: permette di ripristinare il servizio prima di analizzare il problema.

Non eliminare la versione di rollback dalla cronologia Firebase finché serve questa possibilità di recupero.
