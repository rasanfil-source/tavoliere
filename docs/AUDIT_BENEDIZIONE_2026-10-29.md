# Audit benedizione eucaristica — 29 ottobre 2026

Audit iniziale del codice locale a `24d1386`, con particolare attenzione alla funzione introdotta nel consolidamento `991fe47`. L’analisi iniziale non modificava codice applicativo o produzione; l’intervento successivo è descritto di seguito.

## Intervento successivo autorizzato

Il rilievo 1 è stato corretto nei sorgenti e nelle regole Firestore: dopo il limite pranzo si controllano entrambi gli orari, precedente e nuovo. La cancellazione resta possibile entro il termine della benedizione interessata; non può aggirare il blocco di una benedizione già fissata nella fascia chiusa. Le scritture della sola Messa e la visibilità dei dati salvati sono preservate. Aggiunto un messaggio specifico nelle sei lingue disponibili. Le prove di regressione sono in `tests/firebase-spark/blessings.test.mjs` e `tests/firebase-rules/firestore.rules.test.mjs`.

La politica di concorrenza rimane «ultima scrittura valida»; il miglioramento notturno del rilievo 3 è rinviato. La diagnosi sotto descrive il comportamento precedente alla correzione. Nessuna pubblicazione in produzione effettuata.

Verifica della correzione: gate pre-deploy superato (704 test applicativi e di dominio, validazione delle traduzioni, build e 10 test di build); suite completa nell’emulatore Firestore superata (140 test). Coperti inserimento, modifica e cancellazione prima/dopo i limiti, confini esatti nel client, blocchi nelle regole per amministratore e liturgisti, conservazione in lettura, indipendenza della Messa e ultima scrittura concorrente. La build `dist` è stata rigenerata dagli strumenti del progetto.

Verifica prima della pubblicazione: `tools/check-blessings-browser.mjs` superato con Edge a 375 e 1200 px, usando dati sintetici; controllati accesso del solo liturgista alla sezione, caricamento su richiesta, salvataggio e messaggi di errore.

## Regola confermata

I blocchi si applicano a nuove registrazioni e modifiche. Le benedizioni già registrate restano valide, memorizzate e visibili.

Indicando con L il limite delle prenotazioni del pranzo, con C quello della cena e con B l'orario della benedizione per la data selezionata:

| Momento del salvataggio | Comportamento richiesto |
| --- | --- |
| Prima di L | Registrazione di un orario non ancora trascorso |
| Da L fino a prima di C | Nessuna nuova registrazione/modifica per la fascia L–C; nuova benedizione possibile solo dopo C |
| Da C in poi | Nessun nuovo inserimento/modifica per la giornata |

Gli orari si riferiscono al fuso del centro e ai limiti configurati per la data interessata. Una benedizione già salvata non deve scomparire al superamento di L o C. Il giorno dopo deve conservare la propria data effettiva, ora rappresentata come «Oggi» se precedentemente era «Domani».

Per i confini si considera chiusa una finestra quando `now >= closesAt`, coerentemente con l'attuale blocco cena. La risposta dell'utente ha confermato che dopo L il nuovo orario deve essere successivo a C.

Per le registrazioni concorrenti vale l'ultima scrittura completata sul database. Questa politica è stata esplicitamente confermata dall'utente: non occorre introdurre un rifiuto per conflitto. L'ordine dei clic su dispositivi diversi non determina necessariamente l'ordine dei commit.

## Rilievi

### 1. [P1] Il limite pranzo non viene applicato

**Riproduzione:** limite pranzo 10:00, limite cena 17:00, orologio alle 12:00: `saveBlessing(..., '15:00')` riesce. La prova deterministica esegue il modulo applicativo effettivo e verifica che nessuna lettura riguardi la finestra pranzo.

**Causa:** `public/daily-operations.js:125` legge esclusivamente `${dateId}_dinner`; `validateBlessingWindow` controlla soltanto quella scadenza. Anche le regole, tramite `firestore.rules:682` e `:1614`, applicano solo `massWindowIsOpen`, cioè la cena.

**Conseguenza:** si possono inserire o spostare benedizioni nella fascia già bloccata dal pranzo. Il controllo del solo orario passato non sostituisce il limite operativo.

**Correzione proposta:** validazione specifica della benedizione sulle finestre pranzo e cena, sia nel client sia nelle regole; preservare le benedizioni già registrate e le scritture indipendenti della Messa. Aggiungere prove immediatamente prima, esattamente al limite e subito dopo ciascuna scadenza, comprese modifica e cancellazione di una registrazione esistente.

### 2. Comportamento conforme: prevale l'ultima scrittura concorrente

**Riproduzione in emulatore Firestore:** due utenti autorizzati leggono 18:00, poi salvano contemporaneamente 18:30 e 19:00. Entrambe le promesse terminano con successo; resta un solo valore (18:30 nella prova). Una seconda prova conferma che un operatore rimasto su dati vecchi può cancellare la benedizione appena aggiornata dall'altro.

**Causa:** `public/daily-operations.js:130–136` legge il documento in transazione, ma scrive comunque il nuovo `blessingTime` senza confrontarlo con il valore originariamente visualizzato dall'operatore. Il retry della transazione conserva gli altri campi, ma non segnala il conflitto sullo stesso campo. Il form (`public/app.js:8835`) non passa alcun valore/versione attesa.

**Esito:** entrambi i salvataggi possono riuscire e l'ultimo commit determina il valore finale. La struttura contiene un solo orario per giorno: registrazioni simultanee non creano due benedizioni. Questo corrisponde alla politica richiesta.

**Intervento:** nessuna correzione della politica di concorrenza. La precedente classificazione come bug è ritirata alla luce del requisito confermato.

### 3. [P3] Ritardo minore della vista al cambio di giorno

**Riproduzione:** `getRecommendedRefreshDelayMs` alle 23:59 restituisce 90 minuti, quindi il prossimo aggiornamento è all'01:29. Con questa scadenza, `refreshCalendarOnResume` alle 00:01 non richiede aggiornamenti per il Riepilogo. Lo stesso criterio di ripresa si applica alla Cucina.

**Causa:** `public/refresh-schedule.js:20–26` non comprende mezzanotte fra i confini; `public/app.js:1495–1504` verifica solo calendario personale mancante o prossimità al timer. Il controllo ogni 30 secondi in `refreshWeekInvitedOnNewDay` riguarda l'Agenda, con ulteriori condizioni, e non aggiorna Riepilogo/Cucina.

**Conseguenza:** la benedizione non viene persa nel database, ma può restare nella vecchia schermata «Domani» dopo mezzanotte, mentre «Oggi» rappresenta ancora il giorno precedente. Il ritardo può avvicinarsi a 90 minuti.

**Priorità:** bassa, non urgente. Non comporta perdita di registrazioni e si manifesta nella consultazione notturna prima del successivo refresh. È un miglioramento della tempestività della vista, distinto dal problema funzionale del blocco pranzo.

**Miglioramento eventuale:** registrare la data del centro cui appartengono i dati visualizzati e, quando cambia, aggiornare le viste anche se il timer ordinario non è scaduto; includere mezzanotte nella pianificazione e controllare il cambio data alla ripresa dell'app.

## Comportamenti verificati corretti

- Persistenza: salvata per il 2 giugno alle 23:59 del giorno precedente, alle 00:01 la benedizione è ancora nel medesimo documento `dailyOperations/2030-06-02`.
- Dopo il ricaricamento, i modelli di Riepilogo e Cucina spostano correttamente la medesima benedizione da «Domani» a «Oggi», senza copiarla o riscriverla.
- Modifiche concorrenti a Messa e benedizione conservano entrambi i campi: verificato con SDK e transazioni reali nell'emulatore.
- Al limite cena il client blocca nuove scritture; la benedizione già salvata rimane leggibile. Verificato anche il rifiuto di una scrittura diretta con cena scaduta nell'emulatore.
- I test esistenti coprono doppio clic, risposta tardiva dopo cambio data, permessi, formato dell'ora, orari passati e rendering anche senza Messa.

## Verifiche e limiti

98 test esistenti eseguiti, tutti superati: `blessings`, `week-operation-context`, `summary-matrix-model`, `agenda-dates`, `agenda-lazy`, `refresh-schedule`, `date-utils`, `summary-layouts`.

Prove diagnostiche aggiuntive in `artifacts/audit-blessings/probes.mjs`: orologio controllato per mezzanotte e scadenze; emulatore Firestore locale con due identità per concorrenza e regole. Le asserzioni diagnostiche descrivono anche i difetti attuali: l'uscita riuscita dello script significa che i comportamenti sono stati riprodotti, non che l'applicazione è priva di bug. La cartella `artifacts/` è esclusa da Git.

Comando di riproduzione dalla radice del repository:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/firebase-cli.mjs --config firebase.json --project demo-tavola-comune-blessing-audit emulators:exec --only firestore 'node ../../artifacts/audit-blessings/probes.mjs'"
```

Il sandbox iniziale impediva le connessioni loopback; la prova in emulatore è riuscita dopo esecuzione con i permessi necessari. Usati soltanto dati sintetici e progetto demo; nessun accesso ai dati di produzione. Non è stata eseguita una prova di mezzanotte su un dispositivo reale né verificata la corrispondenza del deployment con il checkout locale.
