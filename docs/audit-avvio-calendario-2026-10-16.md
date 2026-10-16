# Verifica dell’audit sull’avvio del calendario

Verifica del 16 ottobre 2026 su HEAD `89925c3`, conservando le modifiche locali già presenti. Il resoconto ricevuto descrive una versione precedente: il bench `tools/perf/` citato non è presente in questa copia. I suoi tempi non sono stati riprodotti e non rappresentano il beneficio delle modifiche di oggi.

## Valutazione e interventi

| Punto dell’audit | Stato riscontrato e decisione |
| --- | --- |
| i18n fuori dalla catena di avvio | Già presente in `bootstrapApp`: il refresh parte senza attendere i cataloghi. Conservato. |
| Preparazione anticipata del calendario | Già presente dopo la sessione e in parallelo al profilo. L’uso del risultato controlla identità, centro, periodo, lingua, fuso e revisione; i pasti vengono ricontrollati alla pubblicazione. Conservato il meccanismo attuale, senza una seconda cache speculativa di 20 secondi. |
| Sessione e partecipante in parallelo | Implementato in `restoreFriendlyResidentSession`. La lettura anticipata richiede un’identità anonima esistente e un token locale non scaduto. Nessuna identità viene pubblicata prima della verifica della sessione. |
| Fallback dopo lettura negata | Implementata una nuova lettura del profilo dopo la sessione per `permission-denied` e `firestore/permission-denied`. Se la sessione sostituisce l’UID, il vecchio risultato viene scartato e il profilo riletto. Gli altri errori mantengono la gestione precedente. |
| Vice fuori dalla catena del calendario | Già presente: le viste personali avviano la verifica negli extra dopo la disponibilità dei pasti. Conservato; anticiparla non è necessario per rendere utilizzabile il calendario. |
| Una lettura vice per residente comune | Già presente: prima `viceSessions`, poi gli altri due documenti solo se esiste la sessione. Non aggiunto un indizio persistente di ruolo, perché questo controllo non blocca più i pasti. |
| Condivisione finestre pasti e regola personale | Mancava per queste due letture. Aggiunto `shareStaticQuery`, con chiavi distinte per centro, UID, intervallo/partecipante, sorgente e refresh forzato. Gli errori liberano la richiesta per il tentativo successivo. |
| Invalidazione della regola durante una lettura | Aggiunta una revisione: dopo una scrittura amministrativa una nuova lettura non si aggancia alla precedente; la vecchia risposta non può ripopolare la cache invalidata. |
| Navigation preload e cache HTML non bloccante | Entrambi già presenti nel service worker, con test runtime. Conservati. |
| Persistenza Auth con `initializeAuth` | Già presente, con test di ripristino locale e inizializzazione differita del supporto Google. Conservata. |
| Memo delle letture `admins/{uid}` | Non introdotta. Richiede un audit separato delle invalidazioni di membership/inviti e dei cambi d’identità; il bench residente di questa verifica non misura il suo beneficio. |

La lettura anticipata del profilo può aggiungere una richiesta negata quando manca la sessione, oppure una lettura da scartare quando cambia l’UID. Il calendario continua ad attendere la sessione prima di iniziare le sue richieste protette. Non sono stati cambiati regole Firestore, trasporto, salvataggi o controlli di ruolo.

## Verifiche

- Baseline locale: **521/521** test Firebase Spark superati con Node **24.12.0**. Il fallimento di lingua menzionato nell’audit non si riproduce in questo ambiente.
- Dopo gli interventi: **536/536** test della suite eseguita dal gate superati, inclusi 15 nuovi casi.
- Verifica sintattica e validazione cataloghi i18n superate.
- Build locale rigenerata con `npm run build`; **6/6** test della build superati, compresi coerenza delle sorgenti, riproducibilità, Firestore completo e caricamento differito dei moduli amministrativi.
- Il primo tentativo di build ha incontrato un errore filesystem `UNKNOWN` aprendo `dist/participant-data.js`; il secondo è riuscito. I controlli della build sono stati eseguiti dopo il tentativo riuscito.
- `git diff --check` superato.

I test nuovi verificano sovrapposizione effettiva tramite promise controllate, mancata pubblicazione prima della sessione, recupero dopo lettura negata, cambio UID, errore di rete, deduplicazione, separazione delle richieste e invalidazione durante una lettura. I test esistenti continuano a verificare profilo mancante/non coerente, richiesta obsoleta e scadenza dei pasti durante un caricamento lento.

## Misure sintetiche sul codice attuale

Il confronto usa le funzioni reali di orchestrazione con I/O simulato in Node, sette esecuzioni per versione in ordine alternato. Non misura DOM, rete Auth, trasporto Firestore, stream di scrittura o dispositivo reale. Le letture logiche contate non sono il totale delle richieste di rete.

| Ritardi simulati | Mediana HEAD | Mediana modificata | Letture logiche |
| --- | ---: | ---: | ---: |
| 60 ms per ogni operazione | 223,97 ms | 215,45 ms | 7 → 7 |
| 60 ms per operazione; profilo 180 ms | 326,34 ms | 262,59 ms | 7 → 7 |

Nel primo scenario il percorso critico atteso resta lo stesso: lo scarto osservato non dimostra un miglioramento. Nel secondo la lettura del profilo era il collo di bottiglia e anticiparla recupera circa un’attesa di sessione. Non si può quindi attribuire a questi interventi la riduzione del 40% circa riportata nell’audit originario.

La deduplicazione è verificata separatamente: due richieste simultanee identiche producono una sola chiamata al lettore Firestore; il bench di riapertura non genera quel caso concorrente.

Comandi riproducibili dalla radice del repository:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/compare-resident-reopen.mjs 89925c3"
pwsh.exe -NoLogo -NoProfile -Command "node tools/compare-resident-reopen.mjs 89925c3 180"
```

La build pubblicabile usa URL con hash e una cache service worker derivata dal contenuto: non richiede di ripristinare i vecchi numeri `20261015a`/`v447` del resoconto. Release generata: `9daf7189233ef053`. Nessun commit o push eseguito.

## Pubblicazione autorizzata

Il 16 ottobre 2026, su richiesta successiva dell’utente, pubblicata la release `9daf7189233ef053` su Firebase Hosting, progetto `tavola-comune`, all’indirizzo https://tavola-comune.web.app. Il comando ha pubblicato soltanto Hosting. Firebase ha confermato il completamento del deploy; `tools/verify-hosting-release.mjs` ha verificato la corrispondenza degli hash di tutti i 95 file del manifest e del manifest stesso con la build locale (96 confronti). Il primo tentativo nel sandbox non aveva completato l’autenticazione; il deploy con accesso di rete esterno al sandbox è riuscito.
