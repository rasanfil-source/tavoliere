# Piano degli interventi per semplicità, rapidità, stabilità e continuità operativa

## Progetto: Tavola Comune — Firebase, piano Spark

## 1. Obiettivo

Il presente piano definisce gli interventi necessari per rendere Tavola Comune semplice da usare, affidabile e compatibile con il piano gratuito Firebase Spark.

L’applicazione è destinata a un contesto amicale e di fiducia. Le persone residenti si conoscono, non devono proteggersi reciprocamente e sono già identificate da una **sigla personale**, usata anche per riconoscere la biancheria dopo il lavaggio.

L’accesso deve quindi rispettare questi principi:

- ogni residente inserisce, soltanto al primo utilizzo sul proprio dispositivo, la propria sigla e una password comune comunicata dall’amministratore;
- la sigla identifica il residente all’interno dell’applicazione, ma non costituisce una credenziale segreta;
- la password è comune a tutti i residenti e serve soltanto a impedire l’accesso occasionale da parte di estranei;
- dopo il primo accesso, l’app deve ricordare sia la sessione Firebase sia la sigla scelta;
- non deve essere prevista una scadenza per inattività;
- dopo settimane o mesi di mancato utilizzo, sullo stesso dispositivo e nello stesso browser l’app deve riaprirsi senza chiedere nuovamente sigla e password;
- non sono richiesti MFA, App Check, password personali, email personali, verifica dell’identità, isolamento di sicurezza tra residenti o rinnovi periodici delle credenziali;
- l’accesso amministrativo deve restare separato da quello comune dei residenti;
- prenotazioni e modifiche devono essere confermate dal server prima di essere mostrate come definitive;
- test, deploy, esportazione e recupero dati devono restare riproducibili;
- ogni soluzione deve rispettare il vincolo **D006: nessuna fatturazione, esclusivo utilizzo del piano Spark**.

### Limite tecnico accettato

La permanenza dell’accesso può essere garantita soltanto finché restano disponibili i dati locali del browser e la sessione Firebase. Un nuovo accesso sarà inevitabile nei seguenti casi:

- utilizzo di un altro dispositivo o di un altro browser;
- cancellazione di cookie, dati del sito o memoria dell’app;
- navigazione privata;
- disinstallazione della PWA con eliminazione dei dati associati;
- cambio del dominio dell’applicazione;
- disconnessione esplicita tramite il comando “Dimentica questo dispositivo”;
- sostituzione o revoca dell’account Firebase tecnico dei residenti;
- modifica della password comune che comporti la revoca delle sessioni già attive;
- blocco della memoria locale da parte del browser.

La semplice inattività, anche superiore a un mese, non deve invece causare una nuova richiesta di autenticazione.

---

# 2. Tabella degli interventi

| ID | Priorità | Intervento | Risultato atteso e criterio di completamento |
|---|---|---|---|
| P0-01 | Critica | Realizzare l’accesso iniziale con sigla e password comune | Il residente accede inserendo soltanto la propria sigla e la password comune |
| P0-02 | Critica | Rendere permanente l’accesso sul dispositivo | Dopo chiusura, riavvio e lunga inattività l’app si apre senza chiedere nuovamente le credenziali |
| P0-03 | Alta | Separare accesso residenti e accesso amministratore | La password comune non consente operazioni amministrative |
| P0-04 | Alta | Gestire in modo semplice la sigla memorizzata | La sigla viene ricordata; può essere cambiata o dimenticata con un comando esplicito |
| P0-05 | Alta | Rendere deploy e ambiente riproducibili | Il progetto corretto è sempre verificato e il deploy non dipende da tentativi manuali |
| P0-06 | Alta | Introdurre test obbligatori e rollback | Nessun rilascio avviene con test falliti; una versione precedente può essere ripristinata |
| P1-01 | Alta | Semplificare le Security Rules secondo il contesto di fiducia | Gli utenti non autenticati sono esclusi; residenti e amministratore hanno soltanto le distinzioni realmente necessarie |
| P1-02 | Alta | Gestire correttamente l’avvio dell’app | L’app attende il ripristino della sessione prima di mostrare la schermata di accesso |
| P1-03 | Alta | Definire la politica online/offline | Nessuna prenotazione appare salvata prima della conferma del server |
| P1-04 | Alta | Implementare retry selettivo e idempotenza | Errori temporanei non producono duplicazioni o richieste infinite |
| P1-05 | Alta | Gestire modifiche concorrenti | Le modifiche amministrative non sovrascrivono inconsapevolmente dati più recenti |
| P1-06 | Alta | Monitorare quote ed errori essenziali | Anomalie e avvicinamento ai limiti Spark vengono rilevati senza infrastrutture superflue |
| P1-07 | Alta | Progettare esportazione e ripristino compatibili con Spark | I dati possono essere esportati e provati nell’emulatore senza servizi a pagamento |
| P2-01 | Media | Gestire lo storico senza TTL Firestore | La pulizia è amministrativa, controllata e compatibile con Spark |
| P2-02 | Media | Ottimizzare query e listener | Nessuna lettura, query o sottoscrizione inutile consuma quota |
| P2-03 | Media | Ampliare i test di integrazione | Sono verificati accesso persistente, rete instabile, concorrenza, esportazione e rollback |
| P2-04 | Media | Documentare le sole procedure operative necessarie | Esistono istruzioni brevi per i problemi realmente possibili |
| P3-01 | Bassa | Riesaminare periodicamente dipendenze e prestazioni | Gli aggiornamenti sono controllati e non introducono complessità non necessaria |

---

# 3. Accesso dei residenti e identità tramite sigla

## 3.1 Modello di accesso

Per i residenti deve essere utilizzato un **unico account Firebase Authentication tecnico condiviso**.

L’account tecnico:

- usa il provider Firebase Email/Password;
- ha un identificativo email interno non mostrato nell’interfaccia;
- usa come password la password comune comunicata dall’amministratore;
- serve a ottenere una sessione Firebase valida per l’accesso a Firestore;
- non rappresenta il singolo residente;
- non attribuisce privilegi amministrativi.

La sigla personale è invece l’identità applicativa del residente:

- viene scelta dall’elenco delle sigle registrate oppure inserita e verificata;
- viene salvata sul dispositivo;
- viene associata alle prenotazioni e alle altre operazioni ordinarie;
- non deve essere trattata come password o dato segreto;
- non deve essere convertita in un account Firebase individuale.

Questa scelta accetta consapevolmente che tutti i residenti autenticati possano tecnicamente presentarsi con un’altra sigla. Nel contesto dichiarato di fiducia ciò non è considerato un rischio da mitigare.

## 3.2 Primo accesso

La schermata iniziale deve contenere soltanto:

- campo **Sigla**;
- campo **Password comune**;
- pulsante **Entra**;
- eventuale messaggio breve di assistenza.

Flusso:

1. normalizzare la sigla, eliminando spazi superflui e uniformando maiuscole e minuscole;
2. verificare che la sigla esista tra i residenti attivi;
3. impostare esplicitamente la persistenza locale di Firebase Authentication;
4. autenticare l’account Firebase tecnico dei residenti usando la password comune inserita;
5. memorizzare localmente la sigla validata;
6. aprire direttamente la schermata principale del residente;
7. non conservare la password comune in chiaro nell’applicazione o nella memoria locale.

Non devono essere presenti:

- registrazione autonoma;
- creazione di account personali;
- recupero password da parte del residente;
- email personale;
- conferma email;
- autenticazione a due fattori;
- captcha o App Check;
- scelta “Ricordami”, perché la persistenza deve essere sempre attiva.

## 3.3 Persistenza senza scadenza per inattività

Prima del login deve essere configurata `browserLocalPersistence`, oppure l’equivalente `LOCAL` della versione Firebase utilizzata.

All’avvio dell’applicazione:

1. inizializzare Firebase Authentication;
2. attendere il completamento del ripristino dello stato di autenticazione tramite l’observer di Auth;
3. leggere la sigla memorizzata localmente;
4. verificare che la sigla sia ancora presente e attiva;
5. se sessione e sigla sono valide, aprire direttamente l’app;
6. mostrare la schermata di accesso soltanto quando la sessione manca realmente o la sigla non è più valida.

Non devono essere implementati:

- timeout dopo un numero di giorni;
- logout automatico per inattività;
- richiesta periodica della password;
- richiesta di autenticazione dopo le vacanze;
- scadenza applicativa della sigla memorizzata;
- cancellazione automatica della sessione alla chiusura del browser;
- persistenza `SESSION` o `NONE` per gli utenti residenti.

La scadenza dei token tecnici Firebase deve essere gestita automaticamente dall’SDK tramite la sessione persistente; non deve essere trasformata in una richiesta visibile di nuovo login.

## 3.4 Memorizzazione della sigla

La sigla può essere conservata in `localStorage` o, preferibilmente, nello stesso archivio locale stabile usato dall’applicazione.

Devono essere memorizzati soltanto:

- la sigla normalizzata;
- un’eventuale versione del formato locale;
- la data dell’ultimo utilizzo, solo se utile alla diagnostica e non per far scadere l’accesso.

La password comune non deve essere salvata dall’app.

La schermata delle impostazioni deve offrire:

- **Cambia sigla**, per passare volontariamente a un altro residente sullo stesso dispositivo;
- **Dimentica questo dispositivo**, che cancella la sigla locale ed esegue il logout Firebase;
- una breve spiegazione che l’accesso sarà richiesto di nuovo solo dopo questa operazione o dopo la perdita dei dati del browser.

Il comando di uscita non deve essere messo in evidenza nella schermata principale, per evitare disconnessioni accidentali.

## 3.5 Accesso amministratore

L’amministratore deve usare un account Firebase separato e credenziali non condivise con i residenti.

La password comune dei residenti non deve consentire:

- gestione dell’elenco residenti;
- modifica delle sigle;
- configurazione delle scadenze;
- esportazione o ripristino dei dati;
- cancellazioni massive;
- gestione dello storico;
- impostazioni generali;
- funzioni di deploy o manutenzione.

L’accesso amministratore può essere disponibile da un percorso o comando distinto. La sua sessione può essere persistente, ma non deve sovrapporsi in modo ambiguo all’identità residente memorizzata.

## 3.6 Criteri di completamento

L’accesso è completato quando sono superati almeno questi test:

1. primo accesso con sigla valida e password comune corretta;
2. chiusura e riapertura della scheda senza nuovo login;
3. chiusura e riapertura del browser senza nuovo login;
4. riavvio del dispositivo senza nuovo login;
5. riapertura della PWA dopo lunga inattività simulata senza nuovo login;
6. riapertura dopo almeno un mese reale, sullo stesso dispositivo, senza nuovo login;
7. refresh della pagina senza comparsa temporanea ingiustificata della schermata di accesso;
8. sigla rimossa dall’amministratore: richiesta di scegliere una sigla valida, senza errori tecnici;
9. cancellazione dei dati del sito: nuovo accesso richiesto e spiegato correttamente;
10. comando “Dimentica questo dispositivo”: sessione e sigla vengono cancellate;
11. la password comune non concede accesso alle funzioni amministrative.

---

# 4. Ambiente di sviluppo e processo di rilascio

## 4.1 Autenticazione tecnica per sviluppo e deploy

L’autenticazione degli sviluppatori e del processo di deploy è distinta dall’accesso degli utenti dell’applicazione.

### Azioni

1. Definire due modalità:
   - autenticazione interattiva per lo sviluppo locale;
   - credenziali appropriate per eventuali sistemi CI non interattivi.
2. Prima di ogni deploy verificare:
   - account Firebase dello sviluppatore;
   - accesso al progetto;
   - project ID;
   - versione della CLI;
   - versione Node;
   - esito dei test.
3. Verificare esplicitamente il progetto `tavola-comune`.
4. Evitare che la CLI scelga automaticamente un progetto non controllato.

## 4.2 Protezione contro deploy accidentali

### Azioni

- definire un alias esplicito per la produzione;
- mantenere il project ID esplicito negli script di deploy;
- interrompere il deploy se il progetto risolto non è quello previsto;
- mostrare prima della pubblicazione account, progetto e ambiente;
- richiedere conferma esplicita per il deploy manuale di produzione;
- usare emulatori e test con project ID dimostrativi.

## 4.3 Toolchain riproducibile

### Azioni

- dichiarare la versione Node utilizzata e testata;
- aggiungere `.nvmrc`, `.node-version` o equivalente;
- usare la stessa versione in locale e in CI;
- usare `npm ci` nei processi riproducibili;
- mantenere `package-lock.json`;
- evitare aggiornamenti automatici della Firebase CLI durante un deploy;
- aggiornare le dipendenze in modo controllato;
- eseguire i test completi dopo ogni aggiornamento.

## 4.4 Gate obbligatorio prima del deploy

Il deploy deve essere preceduto da:

1. installazione riproducibile;
2. test unitari;
3. test Firebase;
4. test delle Security Rules;
5. test dell’accesso persistente;
6. compilazione delle regole;
7. controllo della configurazione;
8. controllo del progetto;
9. smoke test locale;
10. eventuale preview Hosting.

Un test fallito deve interrompere il deploy.

## 4.5 Rollback

Documentare:

- rollback di Firebase Hosting;
- ripristino della precedente versione delle Security Rules;
- ripristino degli indici;
- verifica successiva al rollback;
- smoke test;
- gestione delle modifiche dati non annullate dal rollback di Hosting.

---

# 5. Security Rules proporzionate al contesto di fiducia

## 5.1 Principio

Le Security Rules non devono tentare di distinguere un residente dall’altro tramite la sigla, perché tutti usano lo stesso account Firebase tecnico.

Devono invece distinguere soltanto:

1. richiesta non autenticata;
2. account tecnico dei residenti;
3. account amministratore.

Le regole devono concentrarsi su:

- esclusione delle richieste completamente anonime;
- separazione tra operazioni residenti e operazioni amministrative;
- validità strutturale dei dati;
- rispetto delle finestre temporali delle prenotazioni;
- prevenzione di scritture incoerenti o accidentalmente distruttive;
- protezione delle configurazioni e delle operazioni di manutenzione.

Non sono richiesti:

- isolamento crittografico tra residenti;
- claim distinti per ogni residente;
- controllo che la sigla dichiarata coincida con una specifica identità Firebase;
- revoca individuale di un residente tramite Firebase Authentication;
- App Check;
- protezione da un residente intenzionato a impersonarne un altro.

## 5.2 Test obbligatori

### Accesso

- richiesta non autenticata negata;
- account tecnico residenti autorizzato alle operazioni ordinarie;
- account tecnico residenti negato sulle configurazioni amministrative;
- account amministratore autorizzato alle operazioni amministrative;
- account Firebase sconosciuto negato, se non previsto.

### Sigle e dati residenti

- sigla esistente e attiva;
- sigla inesistente;
- sigla disattivata;
- sigla vuota;
- sigla con formato non valido;
- prenotazione associata a una sigla registrata;
- campi mancanti o aggiuntivi non consentiti;
- valori fuori elenco;
- timestamp e date non validi;
- note oltre i limiti stabiliti.

### Prenotazioni

- modifica prima della scadenza;
- modifica dopo la scadenza;
- override amministrativo;
- modifica concorrente;
- doppio invio della stessa prenotazione;
- aggiornamento parziale non valido;
- batch e transazioni;
- rollback atomico in caso di errore.

### Criterio di completamento

- tutti i casi previsti devono riuscire;
- le operazioni amministrative devono restare escluse all’account residenti;
- i dati non validi devono essere rifiutati;
- la suite deve essere eseguita prima di ogni deploy.

---

# 6. Avvio dell’app, sessione e interfaccia

## 6.1 Stati essenziali

La UI deve distinguere soltanto gli stati utili:

- inizializzazione dell’app;
- ripristino della sessione in corso;
- primo accesso richiesto;
- accesso residente ricordato;
- sigla memorizzata non più valida;
- accesso amministratore;
- rete assente;
- rete instabile;
- server non raggiungibile;
- salvataggio in corso;
- salvataggio confermato;
- conflitto di aggiornamento;
- quota esaurita;
- errore definitivo.

Non deve essere previsto uno stato ordinario “sessione scaduta per inattività”.

## 6.2 Comportamento all’apertura

Durante il ripristino della sessione deve essere mostrata una schermata neutra di caricamento, non il modulo di login.

Il modulo di login deve apparire soltanto dopo che Firebase ha confermato l’assenza di una sessione valida.

Questo evita che, a ogni avvio, il residente veda per un istante una richiesta di accesso che poi scompare.

## 6.3 Messaggi utente

Messaggi consigliati:

- “Accesso memorizzato su questo dispositivo.”
- “La tua sigla non risulta più attiva. Scegline una valida.”
- “I dati di accesso di questo dispositivo sono stati cancellati. Inserisci nuovamente sigla e password comune.”
- “La password comune non è corretta.”
- “La connessione è assente: la modifica non è stata confermata.”
- “Salvataggio in corso. Non ripetere l’operazione.”
- “Il dato è stato modificato da un altro dispositivo. La schermata verrà aggiornata.”

I messaggi tecnici Firebase non devono essere mostrati direttamente.

---

# 7. Politica online e offline

> Una prenotazione o un override non devono mai essere mostrati come acquisiti prima della conferma del server.

### Comportamento richiesto

- se manca la rete prima dell’operazione, non avviare la modifica;
- durante il salvataggio disabilitare il comando interessato;
- mostrare “salvataggio in corso”;
- non mostrare il dato come definitivo prima della conferma;
- se la rete cade durante la scrittura, mantenere lo stato “in attesa”;
- impedire un secondo invio immediato della stessa operazione;
- dopo la riconnessione rileggere la versione server;
- alla riapertura ricostruire lo stato dal server.

La persistenza dell’autenticazione non deve essere confusa con la persistenza offline dei dati Firestore:

- l’autenticazione deve restare persistente;
- le scritture Firestore non devono essere accodate localmente in modo invisibile;
- la persistenza offline Firestore non deve essere attivata senza una decisione progettuale separata.

---

# 8. Retry, idempotenza e concorrenza

## 8.1 Retry selettivo

Ritentare automaticamente soltanto operazioni idempotenti e errori temporanei:

- rete momentaneamente indisponibile;
- `unavailable`;
- timeout;
- `deadline-exceeded`;
- disconnessione momentanea.

Non ritentare automaticamente:

- permesso negato;
- sessione Firebase realmente assente;
- sigla non valida;
- dati non validi;
- prenotazione chiusa;
- conflitto che richiede una decisione;
- quota esaurita.

Usare:

- backoff esponenziale;
- jitter;
- numero massimo di tentativi;
- timeout massimo complessivo;
- nessun retry parallelo della stessa operazione;
- pulsante manuale “Riprova” quando appropriato.

## 8.2 Idempotenza

Una prenotazione deve avere un’identità deterministica basata almeno su:

- sigla residente;
- data;
- pasto;
- eventuale gruppo o struttura.

La ripetizione della stessa richiesta deve aggiornare lo stesso record, non crearne uno nuovo.

Impedire:

- doppi clic;
- doppi invii durante retry;
- duplicazioni dopo una risposta incerta;
- uso esclusivo dell’orologio del dispositivo.

## 8.3 Concorrenza

Per override e modifiche amministrative:

- usare versione o timestamp di aggiornamento;
- verificare che il documento non sia cambiato dopo il caricamento;
- mostrare un conflitto quando esiste una versione più recente;
- consentire all’amministratore di ricaricare e applicare consapevolmente la modifica.

---

# 9. Monitoraggio essenziale delle quote e delle prestazioni

Monitorare soltanto ciò che serve al funzionamento sul piano Spark:

- letture;
- scritture;
- eliminazioni;
- spazio occupato;
- traffico;
- listener attivi;
- latenza;
- errori di autenticazione del conto tecnico residenti;
- errori applicativi;
- numero di retry;
- operazioni pendenti;
- esportazioni e cancellazioni amministrative.

Soglie operative consigliate:

- attenzione al 60% della quota prevista;
- avviso all’80%;
- stato critico al 90%;
- sospensione delle operazioni non essenziali vicino al limite.

Frequenza:

- controllo durante i rilasci;
- controllo settimanale nella fase iniziale;
- controllo mensile a regime;
- verifica immediata in caso di anomalie.

Non devono essere introdotte dashboard, metriche personalizzate o servizi che richiedano fatturazione soltanto per aumentare il livello di controllo.

---

# 10. Log e dati locali

Il contesto di fiducia consente una gestione semplice, ma i log devono restare utili e non invasivi.

### Azioni

- non registrare la password comune;
- non registrare token Firebase;
- non registrare l’intero contenuto delle prenotazioni salvo debug controllato;
- registrare la sigla soltanto quando serve a comprendere un errore;
- evitare messaggi che mostrino percorsi tecnici interni;
- eliminare periodicamente i log locali di sviluppo;
- mantenere separati i messaggi comprensibili all’utente dai dettagli tecnici.

---

# 11. Backup ed esportazione sotto il vincolo Spark

## 11.1 Funzioni escluse

Finché resta valido D006 non usare:

- backup Firestore gestiti;
- ripristino gestito;
- Point-in-time recovery;
- clonazione del database;
- TTL Firestore;
- Cloud Functions pianificate.

## 11.2 Esportazione applicativa

Realizzare un’esportazione manuale disponibile soltanto all’amministratore.

L’esportazione deve:

- leggere i documenti con paginazione;
- produrre un formato strutturato;
- includere versione dello schema, data, project ID e conteggi;
- evitare token e credenziali;
- richiedere conferma;
- generare un file scaricabile;
- essere conservata dall’amministratore in un luogo appropriato.

## 11.3 Ripristino

Lo strumento di ripristino deve:

- validare il file;
- verificare la versione dello schema;
- mostrare un’anteprima;
- rilevare duplicati;
- simulare l’importazione;
- importare a batch;
- interrompersi senza lasciare stato incoerente;
- essere provato prima sull’emulatore.

---

# 12. Retention dello storico

La retention deve essere amministrativa e manuale.

### Procedura

1. definire il periodo di conservazione;
2. individuare i record candidati con una query limitata;
3. mostrare periodo e numero di record;
4. eseguire un dry-run;
5. richiedere conferma amministrativa;
6. eliminare in batch conservativi;
7. interrompere in caso di rete assente, quota insufficiente o errore definitivo;
8. registrare il risultato;
9. consentire la ripresa senza ripetere eliminazioni già completate.

Non attivare TTL Firestore e non introdurre scheduler server.

---

# 13. Ottimizzazione di query, listener e indici

### Azioni

- limitare gli elenchi potenzialmente grandi;
- usare cursori per la paginazione;
- evitare offset;
- caricare soltanto l’intervallo di date visibile;
- chiudere i listener quando la schermata non è più attiva;
- evitare un listener per ogni cella o prenotazione;
- preferire pochi listener aggregati;
- evitare query sull’intero storico;
- ridurre letture ripetute;
- controllare gli indici realmente necessari;
- misurare prima di ottimizzare.

---

# 14. Test di integrazione e resilienza

## 14.1 Accesso persistente

- primo accesso con sigla e password comune;
- password errata;
- sigla inesistente o disattivata;
- refresh della pagina;
- chiusura e riapertura della scheda;
- chiusura e riapertura del browser;
- riavvio del dispositivo;
- riapertura della PWA;
- inattività simulata di oltre un mese;
- nessun timeout applicativo;
- dati locali cancellati;
- navigazione privata;
- cambio browser o dispositivo;
- cambio volontario della sigla;
- comando “Dimentica questo dispositivo”;
- password comune modificata;
- account tecnico residenti revocato;
- accesso amministratore separato.

## 14.2 Rete

- offline prima del salvataggio;
- disconnessione durante il salvataggio;
- riconnessione;
- rete lenta;
- timeout;
- doppio clic;
- chiusura pagina con operazione pendente.

## 14.3 Concorrenza

- due dispositivi con la stessa sigla;
- due sigle che modificano dati nello stesso momento;
- residente e amministratore contemporanei;
- due amministratori;
- override su dato già modificato.

## 14.4 Quote, retention e recupero

- quota letture, scritture ed eliminazioni vicina al limite;
- dry-run della retention;
- errore a metà batch e ripresa;
- esportazione completa;
- file incompleto o alterato;
- schema incompatibile;
- importazione interrotta o duplicata;
- ripristino nell’emulatore;
- deploy, smoke test e rollback.

---

# 15. Documentazione operativa essenziale

Predisporre istruzioni brevi per:

1. un residente vede nuovamente la schermata di accesso;
2. la sigla memorizzata non è più valida;
3. la password comune è stata cambiata;
4. l’account Firebase tecnico dei residenti non funziona;
5. l’amministratore deve dimenticare un dispositivo;
6. deploy fallito;
7. test falliti;
8. quota Firestore vicina al limite;
9. perdita di rete durante una scrittura;
10. dati modificati contemporaneamente;
11. retention interrotta;
12. esportazione o ripristino falliti;
13. rollback Hosting.

Ogni istruzione deve indicare sintomo, controllo, soluzione e verifica finale, senza procedure di sicurezza sproporzionate al contesto.

---

# 16. Ordine operativo definitivo

## Fase 1 — Decisioni

1. confermare il contesto amicale e di fiducia;
2. confermare l’uso della sigla come identità applicativa;
3. confermare una password comune per tutti i residenti;
4. confermare un unico account Firebase tecnico residenti;
5. confermare un account amministratore separato;
6. vietare timeout e logout per inattività;
7. confermare D006 e le esclusioni dei servizi a pagamento;
8. confermare il salvataggio soltanto dopo risposta server.

## Fase 2 — Accesso persistente

9. attivare Email/Password per l’account tecnico residenti;
10. predisporre la schermata sigla + password comune;
11. verificare la sigla tra i residenti attivi;
12. configurare `browserLocalPersistence`;
13. salvare localmente la sigla;
14. attendere il ripristino Auth prima di mostrare il login;
15. aprire direttamente l’app quando sessione e sigla sono valide;
16. aggiungere “Cambia sigla”;
17. aggiungere “Dimentica questo dispositivo”;
18. separare l’accesso amministratore;
19. provare la riapertura dopo lunga inattività.

## Fase 3 — Regole e dati

20. semplificare le Security Rules ai tre stati: non autenticato, residenti, amministratore;
21. rimuovere requisiti di isolamento individuale tra residenti;
22. validare struttura, sigla, date e valori;
23. proteggere le sole operazioni amministrative;
24. testare prenotazioni, scadenze, batch e transazioni;
25. rendere i test bloccanti.

## Fase 4 — Rilascio

26. fissare la versione Node;
27. standardizzare `npm ci`;
28. verificare account e project ID di deploy;
29. creare il gate pre-deploy;
30. introdurre smoke test e preview;
31. documentare rollback;
32. verificare il processo su un’installazione pulita.

## Fase 5 — Robustezza applicativa

33. centralizzare gli errori;
34. gestire rete e scritture pendenti;
35. introdurre idempotenza;
36. introdurre controllo concorrenza;
37. implementare retry selettivo;
38. impedire duplicazioni.

## Fase 6 — Quote e recupero

39. monitorare le quote essenziali;
40. ottimizzare query e listener;
41. creare esportazione amministrativa;
42. creare e provare il ripristino;
43. definire retention e dry-run;
44. creare cancellazione amministrativa a batch;
45. non attivare TTL o scheduler.

---

# 17. Criteri finali di accettazione

Il piano è completato quando:

- il residente inserisce sigla e password comune soltanto al primo accesso sul dispositivo;
- la sessione Firebase usa persistenza locale;
- la sigla viene memorizzata stabilmente;
- la chiusura del browser o della PWA non provoca logout;
- l’inattività, anche superiore a un mese, non provoca logout;
- l’app attende il ripristino della sessione prima di mostrare il login;
- la password comune non viene conservata in chiaro;
- il residente può cambiare sigla volontariamente;
- il residente può cancellare esplicitamente l’accesso dal dispositivo;
- sono documentati i casi inevitabili nei quali è necessario autenticarsi di nuovo;
- l’account amministratore è separato;
- la password comune non abilita funzioni amministrative;
- le Security Rules non introducono isolamento individuale non richiesto;
- le operazioni amministrative restano protette;
- nessun dato è mostrato come salvato prima della conferma server;
- retry e concorrenza non producono duplicazioni;
- il deploy è riproducibile e controllato;
- quote, esportazione, ripristino e retention restano compatibili con Spark;
- non sono introdotti App Check, MFA, TTL, Cloud Functions pianificate o altri meccanismi non necessari.

## Conclusione

La priorità non è costruire un sistema di autenticazione forte, ma ottenere un’esperienza coerente con il contesto reale:

1. il residente inserisce la propria sigla;
2. inserisce una volta la password comune;
3. l’app ricorda entrambe le condizioni necessarie all’accesso;
4. dopo settimane o mesi l’app si riapre direttamente;
5. una nuova autenticazione viene richiesta soltanto quando il dispositivo ha perso i dati locali, quando l’utente lo richiede espressamente o quando l’amministratore revoca l’accesso tecnico.

Questa impostazione riduce la complessità, evita richieste di login inutili e mantiene soltanto le garanzie operative indispensabili per il corretto funzionamento dell’applicazione.
