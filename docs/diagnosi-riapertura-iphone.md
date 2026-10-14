**Riapertura da Home su iPhone — implementazione del 14 ottobre 2026**

Aggiornamento successivo: la [seconda ottimizzazione, mantenendo Firestore completo](ottimizzazione-avvio-firestore-completo.md), documenta la build con moduli raggruppati, il caricamento differito delle anagrafiche amministrative e l'ulteriore sovrapposizione delle letture. Le versioni e i conteggi riportati sotto descrivono il primo rilascio.

Le modifiche sono implementate e pubblicate su [tavola-comune.web.app](https://tavola-comune.web.app). L'obiettivo è rendere disponibili prima anche le modifiche ai pasti, preservando l'accesso persistente. Questa relazione sostituisce la precedente proposta: non è previsto alcun pannello diagnostico in Aspetto e non sono richieste misurazioni ai residenti o all'amministratore.

Il problema riferito compare soltanto alla riapertura dall'icona Home, soprattutto nella settimana. Non disponiamo della versione iOS né di una prova sul dispositivo: le cause individuate sono dipendenze riprodotte nel codice, compatibili con il sintomo; non possiamo attribuire con certezza l'intero ritardo a una singola causa.

**Cosa cambia per chi usa l'app**

| Intervento implementato | Effetto concreto |
|---|---|
| Budget di rete di 1.200 ms per l'HTML, poi copia locale se disponibile | La pagina può iniziare a caricarsi anche se la richiesta di navigazione rimane pendente. La richiesta originale continua in background. |
| Struttura della griglia e copia dell'ultimo calendario personale | Le precedenti selezioni possono apparire durante il ripristino, con data di salvataggio e avviso di verifica. Non sono modificabili finché non arrivano i dati confermati. |
| Lettura dei pasti avviata insieme alle sole impostazioni essenziali | Si sovrappongono attese prima consecutive. La conferma delle impostazioni precede comunque l'attivazione del calendario. |
| Avatar, presentazione, verifica dei ruoli, Messa, salute e note caricati separatamente | Le operazioni accessorie non trattengono più il completamento dei pasti. I comandi privilegiati dipendono sempre dalle relative autorizzazioni. |
| Protezione da risposte tardive e salvataggi concorrenti | Una richiesta superata non sovrascrive le selezioni modificate, la nuova identità o il nuovo periodo. |

Il budget di 1.200 ms riguarda soltanto l'attesa della rete per l'HTML quando esiste una copia utilizzabile. Non rappresenta un tempo massimo di apertura della PWA: avvio di WebKit, accesso alla cache, JavaScript, Auth e dati hanno tempi propri. Alla prima apertura senza copia locale si attende la richiesta di rete originale.

Il miglioramento non è soltanto visivo. Nel percorso personale, dopo la sessione e il profilo necessari all'accesso, vengono avviati in parallelo il calendario e il documento del centro con fuso orario e scadenze. Quando entrambi sono disponibili, il calendario viene reso operativo. Presentazione, ruoli e dati accessori procedono dopo, fuori dalla promessa che completa il calendario. Le quattro letture che compongono i pasti erano già parallele e restano tali.

Un eventuale errore nei dati accessori non elimina i pasti ricevuti. Messa e pannello operativo vengono aggiornati separatamente. Se fuso orario o periodo cambiano durante l'avvio, la lettura anticipata incompatibile viene scartata e ripetuta nel contesto corretto. La cache mensile distingue anche lingua e fuso orario.

**Accesso persistente e dati locali**

La configurazione Firebase Auth mantiene `browserLocalPersistence`, senza migrazione a IndexedDB, logout automatici o cancellazione delle chiavi dell'accesso. La persistenza LOCAL è documentata per conservare la sessione oltre la chiusura del browser. [Firebase Auth](https://firebase.google.com/docs/auth/web/auth-state-persistence).

Rimangono le scadenze e i controlli della sessione applicativa esistenti, la gestione distinta di errori temporanei e revoche effettive e il trasporto Firestore già configurato per iOS/Safari. Non sono state modificate le regole Firestore né introdotti nuovi indici.

La nuova copia del calendario è distinta dalle credenziali:

- chiave composta da centro, UID Firebase effettivamente ripristinato, residente, vista e intervallo di date;
- al massimo quattro copie, valide per 72 ore e limitate a 48.000 caratteri ciascuna;
- soltanto giorni, tipi di pasto, etichette e selezioni; nessun elenco persone, nota sanitaria, privilegio o token;
- validazione del contenuto, eliminazione dei dati scaduti e funzionamento normale anche se lo storage non è disponibile;
- anteprima senza pulsanti di modifica, nascosta al cambio identità e invalidata all'uscita, alla revoca confermata e ai salvataggi;
- salvataggio locale soltanto di risultati confermati, senza scritture pendenti.

La lettura che abilita il calendario richiede dati dal server tramite `getDocFromServer`/`getDocsFromServer` e controlla i metadati. Le cache in memoria già confermate conservano i rispettivi limiti temporali. Un normale `getDocs` può invece restituire dati locali: non viene trattato automaticamente come conferma del server. Gli errori di autorizzazione non vengono trasformati in un successo tramite cache. [API Firestore](https://firebase.google.com/docs/reference/js/firestore).

La copia persistente può non esserci alla prima apertura dopo l'aggiornamento: viene prodotta dal primo caricamento riuscito. L'accesso ai dati correnti e il salvataggio continuano a richiedere la connessione. Nessuna copia locale concede diritti di modifica.

Il service worker conserva l'HTML nella chiave canonica, senza memorizzare URL di navigazione contenenti token. Le risorse hanno versione `20261014b`, la cache applicativa è `v454`. Il ripiego di un modulo versionato non usa una copia appartenente a un'altra versione. L'aggiornamento in background è mantenuto in vita con `event.waitUntil`, secondo il ciclo di vita previsto per i service worker. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil).

**Verifiche riproducibili**

La verifica comprende sintassi JavaScript, cataloghi delle cinque lingue, suite di regressione, build minificata e corrispondenza tra sorgenti e file compilati. Le prove con I/O controllato eseguono le funzioni applicative e verificano:

- utilizzo dell'HTML locale allo scadere del budget, con aggiornamento successivo della stessa richiesta;
- assenza di cache, rete offline, risposte HTTP non riuscite e storage indisponibile;
- isolamento della copia personale e assenza di comandi modificabili nell'anteprima;
- avvio dei pasti mentre le impostazioni sono ancora pendenti, senza abilitazione prematura;
- calendario operativo con continuazione accessoria ancora pendente;
- fallimento di un accessorio senza perdita dei pasti o degli accessori indipendenti;
- cambio UID, periodo, fuso orario e lingua, risposte di ruolo tardive e completamento di vecchi salvataggi;
- conservazione delle selezioni durante un salvataggio e invalidazione delle copie obsolete.

Esito del 14 ottobre: gate superato con **494 test riusciti**, zero fallimenti e build completata. Il controllo mirato comprende 45 test, già inclusi nella suite, e conferma la corrispondenza di otto coppie sorgente/build. Anche il controllo delle differenze Git non segnala errori di spaziatura.

Pubblicazione completata il **14 ottobre 2026**, con verifica alle **17:43 CEST**. Il commit applicativo [3850ef5](https://github.com/rasanfil-source/tavoliere/commit/3850ef58cf27f50f5fe5abda367f7ce9a79cac25) è disponibile sul ramo `codex/interface-style-cool`. Il deploy ha aggiornato Firebase Hosting; il confronto SHA-256 dei 17 file previsti da `tools/verify-hosting-release.mjs` conferma la corrispondenza con la build locale, inclusi HTML, autenticazione, calendario, manifest e service worker. La build dopo il deploy coincide con quella del commit.

Per acquisire l'aggiornamento della PWA, chiudere tutte le sue finestre e riaprirla mantenendo i dati del sito e l'accesso salvato.

Comandi locali:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run predeploy:gate"
pwsh.exe -NoLogo -NoProfile -Command "node tools/diagnose-iphone-reopen.mjs"
```

Lo script dal nome `diagnose-iphone-reopen` è un controllo locale per lo sviluppo: non aggiunge funzioni all'interfaccia e non invia dati a Firebase. Non richiede un iPhone.

Questi controlli dimostrano la rimozione delle dipendenze che bloccavano i pasti; non misurano il vantaggio in secondi sul dispositivo. Non è stata completata una prova interattiva della build corrente nel browser locale: l'ambiente di anteprima non ha reso raggiungibile il server di questa verifica. Non vengono quindi dichiarati un collaudo su iPhone, un risultato visivo sul dispositivo o l'assenza assoluta di regressioni.

**Raccordo con le proposte esaminate**

Sono state integrate la copia applicativa in localStorage, la griglia anticipata, il budget HTML e la separazione delle operazioni essenziali da quelle accessorie, con le correzioni concordate su identità, conferma del server, gestione degli errori e coerenza delle versioni.

Non è stata introdotta la cache Firestore persistente né sostituito il workaround di trasporto iOS con il solo autodetect. Non è stata aggiunta una query fittizia per accorpare celle: i pasti erano già letti per intervallo. Le sette letture della Messa restano accessorie; un timer JavaScript non garantisce il rilascio dei socket. Lo spostamento fuori dal percorso dei pasti ha una motivazione verificabile senza sostenere che i socket fossero certamente saturi.

La riscrittura generale dei CSS e la suddivisione dell'intero modulo amministrativo non erano correzioni convalidate dell'attesa segnalata e non fanno parte di questa modifica. Non si attribuiscono tempi inventati a IndexedDB, localStorage o rendering. La precedente proposta di misurazione tramite interfaccia è stata esclusa su indicazione dell'utente.
