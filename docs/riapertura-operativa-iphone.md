# Riapertura operativa di Tavola Comune su iPhone

Analisi e intervento locale del 14 ottobre 2026, rispetto al commit `56d9aa8`. Build prodotta: `f09e0818af22b1c3`, Firebase completo `12.17.0`. Queste modifiche non sono pubblicate.

È stata eliminata una dipendenza di rete: nella riapertura con accesso personale persistente, il profilo non deve più terminare prima che inizino le prenotazioni. Profilo, impostazioni essenziali e calendario ora avanzano insieme **dopo** il ripristino di Auth e della sessione. La griglia ordinaria viene pubblicata soltanto dopo tutti i controlli. Nessuna anteprima, griglia parziale o nuova diagnostica per i residenti.

L'operatività comprende dati precedenti, tutte le celle, possibilità di modificarle quando consentito e salvataggi confermati. I test separano disponibilità dello stato applicativo, correttezza del salvataggio e latenza: una diminuzione di secondi su iPhone non è stata misurata.

**Percorso ricostruito dal codice**

Il ritorno dalla Home può essere una nuova pagina o la ripresa della pagina ancora in memoria. La persistenza di Auth non permette di distinguere i due casi.

| Fase della nuova pagina | Comportamento e attesa |
|---|---|
| Avvio del contenitore web e navigazione | Il service worker prova la rete per l'HTML; dopo 1.200 ms può utilizzare la copia locale. Il budget non include il lancio del contenitore, JavaScript o Auth. I bundle con hash sono già serviti dalla cache quando presenti. |
| Esecuzione JavaScript | `bootstrapApp` avvia Auth, traduzioni e ripristino senza attendere il catalogo linguistico. Il modulo partecipanti viene anticipato quando è presente la sigla salvata. |
| Auth persistente | `initializeAuth` usa `browserLocalPersistence`; `waitForAuthReady` aspetta il ripristino e le eventuali mutazioni di accesso già in corso. Non viene inizializzato in anticipo il popup Google. |
| Sessione applicativa | `restoreFriendlyResidentSession` chiama `ensurePersonalSession`: controlla scadenza del token e sessione associata all'UID. Una sessione valida in memoria può essere riutilizzata entro cinque minuti; una nuova pagina la rilegge. Se serve crearla, la scrittura deve terminare prima delle letture protette. |
| Identità e impostazioni | Lettura di `publicParticipants/{id}` con verifica stato e sigla; lettura server del documento centro con fuso e scadenze. Prima dell'intervento solo queste due attività si sovrapponevano. |
| Prenotazioni | `loadParticipantPeriod` combina quattro letture già parallele: tipi pasto, finestre nel periodo, override del partecipante nel periodo, documento della regola personale. Ora iniziano anche mentre il profilo è in attesa. |
| Pubblicazione | `loadCurrentParticipantCalendar` accetta la lettura preparata solo per identità, centro, vista, periodo, revisione, fuso e lingua compatibili. Una risposta obsoleta non sostituisce i dati. Controlla nuovamente le scadenze trascorse durante l'attesa. Poi `renderParticipantMeals` costruisce la griglia ordinaria e lo splash termina. |
| Accessori | Presentazione completa, avatar, autorizzazioni aggiuntive, Messa, salute, note e promemoria restano fuori dalla promessa che completa il calendario. Il mese successivo continua a essere preparato successivamente. |
| Salvataggio | I gestori esistenti e Firestore completo conservano scritture, gestione dei conflitti, invalidazioni e controlli server di permessi/scadenze. La copia locale non autorizza scritture. |

Se la pagina è rimasta in memoria, `visibilitychange` pianifica il refresh quando si avvicina la scadenza già calcolata; `refreshNow` accorpa richieste dello stesso contesto. I timer possono recuperare un refresh scaduto. In questo caso non si ripercorre necessariamente HTML → JavaScript → Auth → profilo. L'intervento sulla dipendenza del profilo interessa principalmente la **ricostruzione della pagina**; non viene attribuito lo stesso guadagno a ogni ripresa.

L'accesso con account amministrativo Google/email ha un ramo distinto: autorizzazione della membership, ricostruzione della persona e nuova verifica della membership in `ensureStoredResidentSession`. Non usa il nuovo callback della sessione personale. Il controllo dell'interfaccia amministrativa ignora già gli eventi Auth nelle viste dei pasti (`shouldProcessAdminAuthEvent`), quindi non carica il pannello per quella via. Le ripetizioni della membership restano un possibile intervento separato, non un guadagno incluso nei risultati sotto.

**Cause dimostrate, ipotesi e verifiche residue**

| Riscontro | Evidenza e conclusione |
|---|---|
| Attesa profilo → calendario | Dimostrata dal sorgente precedente e dai test con promesse controllate. Rimossa senza abilitare anticipatamente la griglia. |
| Lavoro inutile nella settimana | `loadCurrentParticipantWeek` costruiva sempre sette righe vuote, con date ed etichette, anche quando riceveva il calendario personale. Ora le costruisce solo nel ramo amministrativo senza persona. |
| Creazione ripetuta dei formattatori | `getDateInTimeZone` ricreava `Intl.DateTimeFormat` a ogni chiamata; `formatLongDate` a ogni giorno. Ora ciascuna cache contiene al massimo otto formattatori distinti. L'istante corrente e le date non sono memorizzati. |
| Query per ciascuna cella | Non riscontrate: la settimana usa letture per intervallo, non 21 letture indipendenti degli override. Le quattro componenti del calendario erano già parallele. |
| Query storica potenzialmente costosa | `getOwnOverrides` ripiega sulla lettura di tutti gli override della persona se riceve `failed-precondition`, filtrando poi le date in memoria. Il ramo è dimostrato; la sua attivazione durante la riapertura segnalata non lo è. |
| Duplicazioni già evitate | Le impostazioni condividono la promessa in corso; la presentazione può riutilizzare lo snapshot del centro appena confermato. Il secondo controllo della sessione personale usa normalmente la cache in memoria: non equivale automaticamente a un'altra lettura server. |
| Duplicazioni residue | Il percorso Google/email rilegge la membership. La verifica accessoria del vice può rileggere centro e profilo. Le prime sono candidate per un successivo riuso limitato alla singola operazione; le seconde non bloccano il primo calendario. |
| Problema di streaming Safari | Esiste evidenza esterna specifica, ma non una prova che spieghi questo caso. La configurazione locale contiene già il workaround. Viene conservata. |
| Socket saturi, storage lento, riavvio del processo WebKit | Ipotesi non dimostrate nel progetto. Non sono stati introdotti limiti arbitrari di concorrenza, timer per «liberare socket» o riaperture forzate della connessione. |

L'indice `reservationOverrides(participantId ASC, mealDate ASC)` è nel file degli indici e la lettura in sola consultazione con Firebase CLI del 14 ottobre 2026 ne conferma la presenza in produzione. L'output esportato dalla CLI non contiene lo stato di costruzione: la relazione precedente registrava READY, ma questa verifica non lo riconferma. L'emulatore verifica regole e comportamenti, **non** dimostra disponibilità o costo dell'indice in produzione. La lettura ordinaria resta limitata a sette giorni nella settimana e al mese nella vista mensile. Non sono stati cambiati schema, regole o indici.

**Priorità degli interventi**

| Priorità | Intervento e stato | Attesa eliminata / beneficio atteso | Rischio e controllo |
|---|---|---|---|
| 1 | Sovrapposizione profilo–prenotazioni, implementata | Elimina la parte della latenza del profilo che prima ritardava le quattro letture del calendario. Il beneficio può essere nullo se un'altra fase domina. | Medio: identità dalla sessione effettiva; griglia ancora vincolata a profilo, impostazioni e dati confermati; guardie su risposte tardive. |
| 2 | Rimozione settimana vuota e riuso formattatori, implementati | Riduce lavoro sincrono prima della griglia e nei successivi aggiornamenti. Beneficio atteso più piccolo della rete. | Basso: stesso output, cache limitata, prove su cinque lingue, mezzanotte, fusi e cambio dell'ora. |
| 3 | Indice verificato in produzione: presente; stato di costruzione non restituito dalla CLI | Verifica il prerequisito della query per periodo. Nessun guadagno attribuito: non è stato rilevato né corretto un indice mancante. | Basso, sola lettura. Il fallback non è stato rimosso alla cieca. |
| 4 | Condivisione della membership nel singolo ripristino Google/email, proposta | Può eliminare letture consecutive della stessa membership nel percorso amministratore → pasti. | Medio: occorre preservare revoche, cambi di ruolo/centro/UID e invalidazioni. Nessuna cache globale più lunga proposta. |
| 5 | Ulteriore estrazione dell'interfaccia amministrativa da `app.js`, proposta | Ridurrebbe parsing/compilazione dopo la perdita del processo, pur lasciando Firestore completo. | Medio/alto: ampio accoppiamento fra viste e permessi; vantaggio reale non misurato. Non necessaria per la correzione circoscritta. |

Il controllo aggiunto sulle scadenze è una garanzia di correttezza, non un'accelerazione. Se una lettura termina mentre il profilo è ancora in attesa, una casella scaduta nel frattempo viene chiusa prima della pubblicazione. Le regole Firestore continuano a essere l'autorità sulle scritture.

Non è stata cambiata la politica network-first dell'HTML: renderla cache-first eliminerebbe un'attesa di rete anche prima di Auth, ma richiede una scelta esplicita sulla tempestività degli aggiornamenti del contenitore. I bundle con hash sono già cache-first. Non vengono allungati i TTL dei dati né abilitata la modifica su snapshot locali non confermati.

**iPhone e Android: fonti ufficiali consultate**

Il repository Firebase descrive ritardi nelle letture su Safari e raccomanda il workaround senza fetch streaming; sono presenti anche segnalazioni risolte forzando long polling. Nel codice rimangono `experimentalForceLongPolling: true` e `useFetchStreams: false` per iOS/iPadOS e Safari macOS; Android/Chromium mantiene i valori predefiniti. Non sono stati trasferiti ad iPhone comportamenti validati soltanto su Android. [Firebase, issue 9789](https://github.com/firebase/firebase-js-sdk/issues/9789).

Il problema WebKit correlato risulta corretto nel ramo principale il 27 agosto 2026. Questo **non dimostra** che la correzione sia presente nella versione Safari installata sul dispositivo interessato. Non viene usato come motivo per rimuovere il workaround. [WebKit, bug 322545](https://bugs.webkit.org/show_bug.cgi?id=322545).

Firebase documenta che il long polling forzato può avere un costo prestazionale; l'autodetect è già predefinito. La scelta conservativa protegge la consegna delle risposte su Safari senza imporre lo stesso costo ad Android. Le chiamate logiche in parallelo non vanno contate come altrettanti socket indipendenti: nel SDK installato le letture server passano da listener interni e dal trasporto condiviso. Non è stata misurata la distribuzione delle richieste HTTP su iPhone. [FirestoreSettings](https://firebase.google.com/docs/reference/js/firestore.firestoresettings).

La cache Firestore corrente è quella **in memoria**, predefinita del SDK completo; non è stata sostituita né disabilitata. Non sopravvive alla distruzione della pagina. Auth persistente, cache dell'app e copia locale del calendario hanno cicli di vita separati. Attivare IndexedDB non consentirebbe da solo di chiamare «confermati» dati locali né garantirebbe un avvio più rapido. WebKit documenta quote ed eventuale eliminazione dello storage; non si assume che la cache sia sempre presente. [Cache Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [persistenza Auth](https://firebase.google.com/docs/auth/web/auth-state-persistence), [politica storage WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).

L'uso di operazioni asincrone indipendenti è coerente con le indicazioni Firebase. Si mantengono le dipendenze necessarie per autenticazione e correttezza, anziché serializzare tutte le letture per timore di Safari. [Buone pratiche Firestore](https://firebase.google.com/docs/firestore/best-practices).

**Confronto riproducibile e limiti**

`tools/compare-resident-reopen.mjs` esegue le funzioni effettive di ripristino, coordinamento e pubblicazione, lette dal commit precedente e dalla copia corrente. Sostituisce l'I/O con attese di 60 ms, mantenendo il gruppo di quattro letture parallele. Il rendering è sostituito da un evento di pubblicazione; non vengono eseguiti browser, trasporto Firebase, ripristino Auth reale o comunicazioni di produzione. Sette prove per versione, in ordine alternato, su Windows/Node `v24.12.0`.

| Grandezza | Prima | Dopo | Interpretazione |
|---|---:|---:|---|
| Mediana fino alla pubblicazione, I/O simulato | 259,57 ms | 199,93 ms | Circa 60 ms di attesa eliminata **nel modello controllato**, non sull'iPhone. |
| Letture logiche essenziali nel modello | 7 | 7 | Nessuna riduzione del numero normale di letture; cambia l'ordine. Non sono conteggi HTTP o letture fatturate dalle regole. |
| File JS nel grafo residente compilato | 16 | 16 | Bundling e moduli differiti conservati. |
| Byte JS nel grafo residente compilato | 960.006 | 960.466 | +460 byte, non una riduzione di download. Esclusi HTML/CSS, compressione e cache. |
| Costruzioni `Intl.DateTimeFormat`, 1.000 chiamate isolate alla data del centro | 1.000 | 1 | Riuso del formatter; date identiche, compreso il passaggio di mezzanotte. |
| Durata delle stesse 1.000 chiamate isolate, singola esecuzione Node | 147,72 ms | 9,70 ms | Microbenchmark del solo helper, non costo del rendering settimanale né tempo di riapertura. |

Il modello dopo la sessione è `max(impostazioni, profilo + pasti)` prima e `max(impostazioni, profilo, pasti)` dopo. «Pasti» è la durata del gruppo già parallelo. Questa relazione assume I/O indipendente: rete condivisa, accodamenti del SDK e CPU del dispositivo possono modificare il beneficio reale. Non viene estrapolato il rapporto fra queste mediane in una percentuale di accelerazione della webapp.

I test aggiunti verificano l'avvio delle letture solo dopo Auth/sessione, il blocco con profilo/impostazioni/override pendenti, tutte le selezioni e celle, assenza di letture duplicate, accessori ancora pendenti, profilo assente o incoerente, errori di autorizzazione, cambio identità/vista/fuso/lingua, risultati obsoleti e scadenza trascorsa prima del render. Il test con SDK completo ed emulatore legge in parallelo profilo, impostazioni e settimana, ricarica una selezione precedentemente salvata, salva una modifica e verifica che la revoca di token **e sessione** blocchi letture e scritture. I test preesistenti coprono anche conflitti e scadenze server.

Esito finale: **510 test applicativi, 5 test della build e 100 test con emulatore Firestore riusciti**. Completate anche sintassi, validazione delle cinque lingue e verifica della corrispondenza fra build e sorgenti. Le prove sul trasporto conservano la distinzione iOS/Safari e Android/Chromium; non costituiscono un benchmark di quei browser. I controlli con I/O simulato verificano lo stato pronto per il rendering; l'emulatore verifica i salvataggi.

Completato anche un collaudo nel browser Chromium integrato, a larghezza desktop e 390 × 844: apertura della build distribuita, interfaccia personale eseguita con Auth e Firestore simulati localmente, settimana completa di 21 celle, mese di 93 celle, modifica della selezione, completamento del salvataggio simulato, riapertura con la selezione conservata e celle scadute disabilitate. Nessun errore di console osservato. La fixture usa i sorgenti applicativi effettivi; soltanto i servizi esterni sono sostituiti e le selezioni di prova restano sul computer. Non viene inclusa nella distribuzione. Questa prova copre il DOM e la navigazione, non il ripristino di Firebase Auth reale, il trasporto Firestore, WebKit o il contenitore Home di iPhone.

Comandi di riproduzione dalla radice del progetto:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/predeploy-gate.mjs"
pwsh.exe -NoLogo -NoProfile -Command "node tools/firebase-cli.mjs --config firebase.json --project demo-tavola-comune-rules emulators:exec --only firestore 'node --test --test-reporter=tap ../../tests/firebase-rules/*.test.mjs'"
pwsh.exe -NoLogo -NoProfile -Command "node tools/compare-resident-reopen.mjs 56d9aa8"
```

Il launcher npm PowerShell presente nell'ambiente non trovava `npm-cli.js`: sono stati usati i corrispondenti script Node del progetto. Il primo gate si è fermato sul limite della sandbox nell'accesso alle directory di esbuild; l'esecuzione autorizzata fuori sandbox ha completato build e relativi test. Non sono state modificate impostazioni globali o dipendenze per aggirare questi problemi.

Nessuna prova su iPhone fisico, nessuna misura richiesta ai residenti, nessun deploy. Il limite residuo è la latenza completa della PWA installata: i confronti dimostrano meno attese seriali e meno lavoro CPU, non quantificano il tempo risparmiato sul dispositivo.
