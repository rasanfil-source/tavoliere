# Avvio residente con Firestore completo

Intervento del 14 ottobre 2026, successivo al rilascio `ae2b720`. Firestore Lite è stato escluso su richiesta dell'utente: rimangono il SDK completo, la sua cache in memoria, le letture confermate dal server e il trasporto già previsto per iOS/Safari. Rimangono separatamente la copia persistente del calendario e la persistenza Firebase Auth `browserLocalPersistence`.

## Modifiche

- La build usa esbuild con bundling, eliminazione del codice inutilizzato e divisione dei moduli caricati su richiesta. Firebase viene incluso nella stessa versione `12.17.0` già impiegata; la build rifiuta un disallineamento tra CDN di sviluppo e dipendenza installata. Auth, App e Firestore hanno ciascuno una sola istanza del modulo SDK nel grafo compilato.
- Gestione delle anagrafiche, sospensione, cancellazione ed esportazione passano al modulo amministrativo differito. I vecchi punti di ingresso restano disponibili e richiamano lo stesso comportamento; le invalidazioni agiscono sulle medesime cache residenti. Anche la preparazione del ripristino e l'ispezione dei backup si caricano soltanto quando necessarie. La separazione riguarda questi moduli: l'intero codice dell'interfaccia amministrativa non è stato estratto da `app.js`.
- Dopo la conferma di Auth e della sessione personale, le impostazioni essenziali iniziano mentre viene letto il profilo. La lettura è condivisa con il successivo caricamento del calendario. Nessuna query viene autorizzata in base alla sola identità memorizzata e il calendario resta modificabile soltanto dopo i controlli esistenti. Un errore della preparazione facoltativa non invalida l'accesso.
- I file compilati hanno nomi contenenti un hash e cache HTTP immutabile. Il service worker viene generato dal grafo reale: prepara i file necessari ai residenti, mentre non precarica i moduli amministrativi. Conserva i file di codice, non i token o le risposte delle API. Gli hash precedenti restano disponibili nell'output per le pagine già aperte. La loro rimozione futura richiede una politica esplicita di conservazione.
- I cataloghi delle cinque lingue continuano a essere richiesti da `/i18n/`, anche quando il codice viene eseguito da `/assets/`. Gli stili e le funzioni disponibili agli utenti restano gli stessi. Non è stata aggiunta alcuna interfaccia diagnostica.

## Risultati verificabili

Confronto del grafo JavaScript statico necessario a `app.js` e al modulo residente, includendo Firebase completo, contro il commit precedente `ae2b720`:

| Grandezza | Prima | Dopo |
|---|---:|---:|
| File JavaScript | 35 | 16 |
| Byte di codice | 1.301.505 | 962.323 |
| Byte dopo gzip applicato ai singoli file | 346.974 | 261.939 |

Il codice scende del **26,1%**; la dimensione gzip del **24,5%**. Il confronto non include HTML, CSS o dati Firestore e non è una misurazione della latenza su iPhone. I byte effettivamente trasferiti dipendono anche dalla compressione del server e dalle cache già presenti. Il primo aggiornamento deve acquisire i nuovi file; le riaperture successive possono riusarli.

La riduzione dei file, del codice da analizzare e dell'attesa seriale può anticipare anche l'operatività del calendario. Non viene promessa una riduzione percentuale equivalente dei secondi di apertura: rete, ripristino WebKit e verifica della sessione restano variabili. L'anteprima locale resta distinta dai dati modificabili.

## Verifiche completate

- Gate: sintassi, traduzioni in cinque lingue, **500 test applicativi**, build e **5 test della build**, tutti riusciti.
- Emulatore Firestore con progetto demo e fixture sintetiche: **99 test riusciti**, inclusi salvataggi, scritture concorrenti, scadenze e controlli di accesso. Il primo tentativo nell'ambiente ristretto non ha avviato l'hub locale; l'esecuzione con i permessi necessari è riuscita.
- Test aggiuntivi: impostazioni in parallelo con il profilo soltanto dopo Auth/sessione; errore accessorio senza logout; lettura condivisa delle impostazioni; invalidazioni soltanto dopo il commit; nuovo tentativo dopo un errore nel caricamento di un modulo.
- Test sul worker compilato: installazione completa del codice residente, riapertura offline dei moduli, assenza di cache delle API, nessuna sostituzione tra hash di versioni diverse, build riproducibile e conservazione dei file delle versioni precedenti.
- Browser locale: accesso residenti, ricaricamento e passaggio alla schermata di accesso amministratore verificati senza errori di console. Non sono stati effettuati login o salvataggi su dati reali durante questa prova.
- Indice di produzione verificato in sola lettura: `reservationOverrides(participantId ASC, mealDate ASC)` risulta **READY**. Non sono state modificate regole o indici.

Nessuna prova su iPhone fisico e nessuna misurazione richiesta ai residenti. I test verificano i comportamenti sopra elencati; non costituiscono una garanzia assoluta contro ogni regressione su tutti i dispositivi.

## Riproduzione

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run predeploy:gate"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
pwsh.exe -NoLogo -NoProfile -Command "node tools/diagnose-iphone-reopen.mjs"
pwsh.exe -NoLogo -NoProfile -Command "node tools/compare-startup-build.mjs ae2b720"
pwsh.exe -NoLogo -NoProfile -Command "npm run release:verify"
```

Il confronto dei pesi legge da Git la versione indicata e scarica esclusivamente i file pubblici del SDK da gstatic.com. La verifica di pubblicazione confronta tutti i file del manifest di build con Firebase Hosting.

Documentazione tecnica: [bundling Firebase](https://firebase.google.com/docs/web/module-bundling), [cache Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [divisione dei moduli con esbuild](https://esbuild.github.io/api/#splitting).

## Pubblicazione

Pubblicazione completata il **14 ottobre 2026**, con confronto remoto concluso alle **18:53 CEST**. Il commit applicativo [65ae0dc](https://github.com/rasanfil-source/tavoliere/commit/65ae0dc) è sul ramo `codex/interface-style-cool` e la release `1694d63d2f53dd85` è online su [tavola-comune.web.app](https://tavola-comune.web.app).

Il deploy ha aggiornato soltanto Firebase Hosting. Tutti i **96 file** pubblicati coincidono byte per byte, tramite SHA-256, con la build verificata; la rigenerazione durante il deploy non ha prodotto differenze rispetto al commit. Sono state controllate anche le intestazioni HTTP: HTML e service worker richiedono rivalidazione, i bundle con hash hanno cache `public, max-age=31536000, immutable`.

Il primo tentativo di invio a GitHub non era stato eseguito a causa del limite del sistema automatico di approvazione. Alla ripresa autorizzata il push, il deploy e le verifiche sono riusciti.

Per acquisire l'aggiornamento della PWA, chiudere tutte le sue finestre e riaprirla. Non è necessario cancellare i dati del sito o ripetere l'accesso. La prima apertura può ancora dover scaricare i nuovi moduli.
