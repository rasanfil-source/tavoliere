# Brief per la revisione UX di Tavola Comune

## Incarico

Analizzare e riprogettare l'esperienza del pannello di controllo di Tavola Comune, mantenendo le funzioni e i vincoli tecnici esistenti, affinche il sistema risulti comprensibile e affidabile anche per persone non tecniche che lo usano prevalentemente da smartphone.

Il lavoro riguarda in particolare:

- proprietario generale della piattaforma;
- responsabile del singolo centro;
- amministratori e vice amministratori;
- responsabili delle celebrazioni liturgiche;
- relazione fra pannello di configurazione e operazioni quotidiane nella Vista settimana.

Il documento di riferimento principale e `SCHEMA_FUNZIONALE_PANNELLO_PROPRIETARIO_AMMINISTRATORE.md`.

## Obiettivo

Non e richiesto un semplice restyling grafico. Il professionista deve rendere il sistema:

1. **Comprensibile**: ruoli, permessi e conseguenze delle azioni devono essere immediati.
2. **Facile da imparare**: un nuovo direttore deve completare le attivita principali senza formazione tecnica.
3. **Efficiente nell'uso ripetuto**: le azioni frequenti devono richiedere pochi passaggi.
4. **Prevedibile**: controlli uguali devono comportarsi nello stesso modo in tutte le schermate.
5. **Capace di prevenire errori**: sospensione, eliminazione, revoca e trasferimento devono essere chiaramente distinti.
6. **Recuperabile**: errori di rete o dati incompleti non devono lasciare l'utente senza indicazioni su come proseguire.
7. **Accessibile**: leggibile, utilizzabile tramite tastiera e adatta a persone con vista o abilita motorie non perfette.
8. **Ergonomica al tocco**: controlli adeguati al dito e nessuno scorrimento orizzontale involontario.
9. **Rapida, anche nella percezione**: feedback immediato, caricamenti comprensibili e contenuti essenziali mostrati per primi.
10. **Coerente con i ruoli**: ogni persona deve vedere soltanto azioni che puo davvero eseguire.
11. **Adatta alla continuita operativa**: cambio del responsabile, revoche e recupero dell'accesso devono essere processi ordinari.
12. **Scalabile**: la soluzione deve funzionare con piu centri senza rendere il pannello piu complesso.
13. **Manutenibile**: componenti, spaziature, microtesti e stati devono appartenere a un sistema grafico riutilizzabile.
14. **Rassicurante**: l'utente deve sapere cosa e stato salvato, per quale centro sta lavorando e cosa accadra dopo un'azione.

## Vincoli non negoziabili

- La PWA deve restare compatibile con il piano gratuito Firebase.
- Ogni centro deve continuare a operare in uno spazio dati separato.
- La progettazione deve partire dal mobile, senza impoverire tablet e desktop.
- Le attivita quotidiane, come ammalati, diete occasionali, Messe e note cucina, restano nella Vista settimana.
- Il pannello di controllo serve soprattutto a configurazione, persone, ruoli, collegamenti e manutenzione.
- La cucina non deve vedere l'elenco nominativo ordinario dei partecipanti.
- La logica esistente non deve essere modificata implicitamente da una scelta grafica.
- Ogni proposta che cambia un ruolo, un permesso o una regola operativa deve essere presentata come decisione di prodotto separata.
- Il contesto e amicale, ma autorizzazioni, identita e conseguenze delle azioni devono rimanere trasparenti.

## Cosa chiedere al professionista

### 1. Audit dell'esperienza attuale

Richiedere un'analisi di:

- architettura informativa;
- gerarchia visiva;
- terminologia e microcopy;
- comprensibilita dei ruoli;
- scoperta delle funzioni;
- coerenza fra controlli visibili e permessi reali;
- stati vuoti, caricamento, successo, errore, scadenza e accesso negato;
- comportamento responsive;
- accessibilita secondo WCAG 2.2 livello AA;
- prestazioni percepite;
- prevenzione e recupero degli errori.

Ogni problema deve avere:

- schermata e flusso interessati;
- gravita;
- utenti coinvolti;
- conseguenza operativa;
- proposta di soluzione;
- criterio per verificare il miglioramento.

### 2. Nuova architettura informativa

Richiedere una proposta che separi almeno:

- gestione globale dei centri;
- panoramica del centro attivo;
- persone;
- ruoli e accessi;
- collegamenti da distribuire;
- impostazioni del centro e orari limite;
- calendario e manutenzione;
- esportazione e continuita dei dati;
- accesso alle operazioni quotidiane.

La proposta deve specificare cosa compare per ciascun ruolo.

### 3. Flussi operativi

Far verificare e ridisegnare i flussi F01-F14 descritti nello schema funzionale, con particolare attenzione a:

- creazione di un nuovo centro;
- inserimento, sospensione e cancellazione di una persona;
- dieta permanente e dieta occasionale;
- nomina, invito, accreditamento e revoca di un vice;
- attribuzione della gestione liturgica;
- generazione e distribuzione dei collegamenti;
- estensione del calendario;
- trasferimento della responsabilita del centro;
- esportazione e possibile ripristino.

Per ogni flusso devono essere rappresentati percorso principale, errori, annullamento, ripresa e conferma finale.

### 4. Wireframe responsive

Richiedere wireframe per:

- smartphone stretto;
- smartphone ampio;
- tablet;
- desktop.

Le schermate minime sono:

- accesso amministratore;
- panoramica del centro;
- elenco persone;
- creazione e modifica persona;
- ruoli e inviti;
- collegamenti;
- impostazioni del centro;
- stato del calendario;
- esportazione;
- gestione globale dei centri;
- successione del responsabile.

### 5. Prototipo interattivo

Richiedere un prototipo navigabile che permetta di provare almeno:

- creazione del centro;
- inserimento di un residente;
- sospensione e riattivazione;
- nomina completa di un vice;
- aggiunta di un ospite;
- trasferimento della responsabilita;
- copia dei collegamenti;
- passaggio alla gestione settimanale.

Il prototipo deve includere anche errori e stati di attesa, non soltanto schermate ideali.

### 6. Sistema di componenti

Richiedere specifiche per:

- pulsanti primari, secondari, terziari e distruttivi;
- campi, selettori, checkbox e interruttori;
- stati attivo, sospeso, invitato, scaduto e revocato;
- messaggi di stato e notifiche;
- dialoghi di conferma;
- elenchi e schede di dettaglio;
- navigazione mobile;
- spaziature, tipografia, colori e icone;
- focus, hover, pressed, disabled, loading ed errore.

Il risultato deve essere traducibile in CSS e componenti riutilizzabili, non una serie di schermate isolate.

### 7. Revisione dei testi

Chiedere una microcopy completa, con particolare attenzione a:

- differenza fra responsabile, amministratore, vice e liturgia;
- differenza fra persona attiva, sospesa ed eliminata;
- significato di invito, account e accreditamento;
- differenza fra dieta permanente e occasionale;
- descrizione degli errori e delle azioni successive;
- conferme per azioni irreversibili;
- spiegazione dei collegamenti Prenotazioni, Oggi a tavola e Cucina.

### 8. Prove con utenti

Richiedere test moderati su almeno cinque persone rappresentative, includendo se possibile:

- un direttore o responsabile di centro;
- un vice amministratore;
- una persona poco abituata agli strumenti digitali;
- una persona che usa principalmente lo smartphone;
- una persona estranea allo sviluppo, che non conosce la terminologia interna.

Usare gli scenari U1-U7 dello schema funzionale. Registrare completamento, tempo, esitazioni, errori, richieste di aiuto e comprensione dell'esito.

### 9. Consegna per lo sviluppo

Richiedere:

- mappa delle schermate;
- matrice ruolo-funzione;
- flussi annotati;
- file sorgente del progetto grafico;
- prototipo consultabile;
- specifiche responsive;
- componenti e varianti;
- testi definitivi;
- criteri di accettazione;
- elenco prioritario degli interventi;
- indicazione esplicita di cio che cambia soltanto nell'interfaccia e di cio che richiede nuova logica.

## Qualita da valutare

Le parole "bella", "intuitiva" e "veloce" non sono sufficienti da sole. La valutazione deve coprire:

| Qualita | Domanda di verifica |
|---|---|
| Comprensibilita | L'utente capisce dove si trova e quale centro sta modificando? |
| Apprendibilita | Riesce a completare il primo compito senza spiegazioni? |
| Scopribilita | Trova la funzione nel punto in cui si aspetta che sia? |
| Efficienza | Un utente abituale compie l'azione con pochi passaggi? |
| Coerenza | Controlli e parole mantengono lo stesso significato ovunque? |
| Feedback | Il sistema comunica subito avvio, attesa ed esito? |
| Prevenzione degli errori | Le azioni rischiose sono distinguibili e protette? |
| Recuperabilita | Dopo un errore l'utente sa come riprendere? |
| Accessibilita | Testo, focus, contrasto e tocco sono adeguati? |
| Ergonomia mobile | Il pannello funziona con una mano e senza zoom? |
| Fiducia | E chiaro cosa viene salvato, condiviso o eliminato? |
| Continuita | Il centro puo cambiare responsabile senza assistenza tecnica? |
| Robustezza percepita | La schermata resta utile durante rete lenta o aggiornamenti? |
| Scalabilita | Piu centri e piu persone non rendono il modello confuso? |
| Manutenibilita | Le nuove schermate usano componenti e regole comuni? |

## Competenze richieste

### Profilo consigliato

Un **Senior Product Designer UX/UI** con esperienza in applicazioni operative responsive e pannelli amministrativi multi-ruolo.

Non basta un graphic designer o un web designer specializzato in siti promozionali. Il lavoro richiede progettazione di processi, permessi, dati e stati applicativi.

### Competenze indispensabili

1. **Information architecture** per organizzare funzioni numerose e correlate.
2. **Interaction design** per flussi, stati, errori, conferme e azioni asincrone.
3. **UX research e usability testing** con utenti reali.
4. **Responsive e mobile-first design** per strumenti operativi densi.
5. **Accessibilita WCAG 2.2 AA** e progettazione inclusiva.
6. **Design system** e documentazione di componenti riutilizzabili.
7. **Microcopy UX in italiano** per utenti non tecnici.
8. **Progettazione basata sui ruoli** e comprensione di RBAC, inviti e autorizzazioni.
9. **Handoff allo sviluppo** con specifiche implementabili in HTML, CSS e JavaScript.
10. **Misurazione dei risultati** mediante scenari, tempi, errori e tasso di completamento.

### Competenze preferenziali

- esperienza con PWA;
- esperienza con Firebase o applicazioni serverless;
- esperienza con dashboard per servizi comunitari, sanitari, residenziali o organizzativi;
- progettazione per persone anziane o con competenze digitali eterogenee;
- familiarita con connessioni lente, interfacce ottimistiche e stati offline/degradati;
- capacita di leggere codice frontend e regole di autorizzazione senza doverle sviluppare.

### Quando serve anche uno sviluppatore

Il designer puo definire esperienza, prototipo e specifiche. Per valutare costi, fattibilita, prestazioni e implementazione e utile affiancargli un frontend engineer con esperienza in:

- JavaScript senza framework o migrazioni progressive;
- CSS responsive;
- Firebase Authentication e Firestore;
- PWA e service worker;
- accessibilita tecnica;
- prestazioni su dispositivi mobili.

Una sola persona puo coprire entrambi gli ambiti soltanto se possiede un portfolio verificabile di applicazioni operative, non soltanto di siti web.

## Come scegliere il professionista

Chiedere di mostrare:

- almeno due pannelli amministrativi o applicazioni operative progettati;
- esempi di flussi complessi semplificati;
- un caso mobile-first con molti dati e controlli;
- documentazione di componenti e stati;
- un rapporto di test di usabilita reale;
- esempi di accessibilita applicata;
- una consegna tecnica usata realmente dagli sviluppatori.

Durante il colloquio chiedere:

1. Come distingueresti configurazione del centro e operativita quotidiana?
2. Come rappresenteresti il ciclo di vita di un vice amministratore?
3. Come progetteresti sospensione, eliminazione e trasferimento di responsabilita?
4. Quali compiti proveresti per primi con utenti reali?
5. Come misureresti se la nuova versione e migliore?
6. Come eviteresti che il mobile diventi una lunga sequenza di moduli?
7. Come documenteresti stati di rete lenta, errore e permesso insufficiente?

Segnali negativi:

- propone colori e schermate prima di comprendere ruoli e flussi;
- usa "intuitivo" senza definire prove e metriche;
- mostra soltanto landing page o siti commerciali;
- non progetta stati di errore, caricamento e assenza di dati;
- non distingue cambiamenti grafici da cambiamenti funzionali;
- ignora accessibilita e dispositivi mobili reali;
- richiede subito di cambiare tecnologia senza motivazione legata agli utenti.

## Materiali necessari e sufficienti

### Accesso di prova, indispensabile

I file da soli non sono sufficienti a valutare un prodotto interattivo. Occorre predisporre un centro di prova con dati fittizi e fornire:

- un account responsabile del centro di prova;
- un account vice senza permesso Messe;
- un account vice con permesso Messe;
- una sigla partecipante ordinaria;
- una sigla con ruolo liturgico;
- i collegamenti Prenotazioni, Oggi a tavola e Cucina del centro di prova.

Non consegnare la password dell'account proprietario generale. Le funzioni globali possono essere osservate in una sessione guidata oppure documentate con una registrazione che non mostri dati sensibili.

### Pacchetto minimo per la revisione UX

Questi file sono necessari e sufficienti per comprendere interfaccia, flussi, ruoli e vincoli del pannello:

1. `docs/BRIEF_PROFESSIONISTA_UX_PANNELLO_AMMINISTRATIVO.md`
2. `docs/SCHEMA_FUNZIONALE_PANNELLO_PROPRIETARIO_AMMINISTRATORE.md`
3. `docs/VERIFICA_CAPITOLATO_ACCESSI_RUOLI.md`
4. `docs/MULTI_CENTER_OPERATIONS.md`
5. `docs/FIREBASE_DATA_MODEL.md`
6. `prototypes/firebase-spark-pwa/public/index.html`
7. `prototypes/firebase-spark-pwa/public/styles.css`
8. `prototypes/firebase-spark-pwa/public/app.js`
9. `prototypes/firebase-spark-pwa/public/admin-center.js`
10. `prototypes/firebase-spark-pwa/public/participant-data.js`
11. `prototypes/firebase-spark-pwa/public/center-settings.js`
12. `prototypes/firebase-spark-pwa/public/daily-operations.js`
13. `prototypes/firebase-spark-pwa/firestore.rules`
14. `prototypes/firebase-spark-pwa/public/icons/`, limitatamente alle icone effettivamente usate.

Il professionista deve inoltre ricevere l'indirizzo della versione pubblicata e una breve descrizione dei dispositivi realmente usati nei centri.

### File aggiuntivi per una revisione tecnica o per l'implementazione

Questi file non sono necessari per il solo audit UX, ma servono al professionista tecnico o allo sviluppatore che implementera le modifiche:

- `public/firebase-client.js`
- `public/center-context.js`
- `public/bootstrap-demo.js`
- `public/kitchen-data.js`
- `public/kitchen-notes.js`
- `public/reservation-state.mjs`
- `public/schedule-utils.mjs`
- `public/date-utils.mjs`
- `public/diet-utils.mjs`
- `public/refresh-schedule.js`
- `public/manifest.webmanifest`
- `public/manifest-kitchen.webmanifest`
- `public/sw.js`
- `firebase.json`
- `firestore.indexes.json`
- `README.md`
- test automatici del progetto.

### Materiale da non consegnare

- cartella `dist`, perche duplica i file generati da `public`;
- `node_modules`;
- cache, log e file temporanei;
- copie storiche del progetto;
- esportazioni contenenti dati reali dei residenti;
- password, codici di accesso, token privati o chiavi riservate;
- credenziali del proprietario generale;
- file Firebase locali non necessari alla revisione.

## Consegna finale attesa

Il lavoro del professionista si considera completo quando produce:

1. audit prioritario con prove osservabili;
2. architettura informativa approvabile;
3. matrice aggiornata di ruoli e visibilita;
4. flussi completi e stati alternativi;
5. wireframe responsive;
6. prototipo interattivo;
7. sistema di componenti;
8. microcopy;
9. risultati dei test con utenti;
10. specifiche e criteri di accettazione per lo sviluppo;
11. distinzione fra miglioramenti grafici, funzionali e tecnici;
12. ordine di implementazione basato su rischio e beneficio.

