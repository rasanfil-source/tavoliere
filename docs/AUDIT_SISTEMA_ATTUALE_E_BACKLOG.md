# Audit del sistema attuale e backlog ordinato

## Stato della baseline

Data dell'analisi: 10 agosto 2026.

Verifiche completate prima degli interventi:

- 139 test applicativi superati;
- 52 test delle regole Firestore superati con Emulator Suite;
- controllo sintattico di tutti i moduli superato;
- build minificata completata;
- 29 asset elaborati;
- riduzione della build del 39%, da 396188 a 241828 byte.

Questa baseline costituisce il riferimento di regressione. Ogni modulo sostituito deve conservare o aggiornare consapevolmente i relativi test.

## Fonti autorevoli

Ordine di autorita usato nell'analisi:

1. `prototypes/firebase-spark-pwa/public` per il codice sorgente pubblicato;
2. `prototypes/firebase-spark-pwa/firestore.rules` per i permessi effettivi;
3. `tests/firebase-spark` e `tests/firebase-rules` per il comportamento verificato;
4. documenti correnti in `docs`;
5. `dist` soltanto come output generato, mai come sorgente da modificare.

Il repository Git locale risulta interamente non tracciato. La cronologia Git non puo quindi essere usata per distinguere modifiche precedenti, versioni o responsabilita dei cambiamenti.

## Invarianti da conservare

Questi comportamenti non devono cambiare durante la riorganizzazione, salvo una decisione di prodotto esplicita e documentata.

### Dati e centri

- Tutte le informazioni operative appartengono a `centers/{centerId}`.
- Un amministratore ordinario gestisce un solo centro.
- I collegamenti Prenotazioni, Oggi a tavola e Cucina sono specifici del centro.
- Le sessioni e le identita memorizzate nel dispositivo sono separate per centro.
- Il proprietario generale puo creare nuovi centri mediante inviti monouso.

### Prenotazioni

- Residenti e ospiti sono assenti finche non effettuano una prenotazione esplicita.
- Le finestre di prenotazione rispettano il fuso del centro.
- Pranzo, cena e colazione del giorno successivo hanno scadenze distinte.
- Un pasto chiuso non puo essere modificato dal partecipante.
- Le azioni massive modificano soltanto i pasti ancora aperti e appartenenti al periodo indicato.
- Mese e settimana iniziano la domenica.

### Cucina e riepilogo

- La cucina vede conteggi, diete, ammalati, Messa e note operative.
- La cucina non vede l'elenco nominativo ordinario.
- Oggi a tavola puo mostrare nomi e contatti soltanto secondo i consensi e l'impostazione del centro.
- La dieta standard non viene presentata come dieta speciale.

### Ruoli

- `OWNER` e `ADMIN` possono amministrare i ruoli.
- `MANAGER` gestisce sempre persone, ammalati, diete occasionali e note cucina.
- `MANAGER` gestisce le Messe soltanto con permesso esplicito.
- Una persona con ruolo liturgico gestisce soltanto le Messe.
- Il centro puo avere al massimo due vice attivi.
- L'accreditamento di un vice richiede un invito riservato e un'identita amministrativa verificata.

### Prestazioni e piano gratuito

- I moduli di dominio vengono caricati in base alla vista.
- Il refresh e adattivo e non usa listener Firestore permanenti.
- Le viste riusano cache brevi e conservano dati gia visibili in caso di errore.
- La cucina ordinaria deve restare entro le quote Spark previste.
- Gli asset pubblicati sono minificati senza modificare le sorgenti.

### PWA e accessibilita gia presenti

- Esistono manifest distinti per applicazione generale e cucina.
- Il service worker usa rete con ripiego in cache per la navigazione.
- L'app supporta un uso offline limitato dell'involucro statico.
- I contenuti dinamici dipendono comunque da Firebase.
- I controlli principali hanno etichette accessibili e feedback tramite regioni `aria-live`.

## Mappa delle schermate

| Schermata | Modalita URL | Pubblico principale | Responsabilita attuale |
|---|---|---|---|
| Accesso residenti | `participant` o `week` senza sessione | Partecipanti | Sigla, password comune e ripristino della sessione personale. |
| Vista mese | `participant` | Partecipanti | Prenotazioni mensili, azioni giornaliere, settimanali e mensili. |
| Vista settimana | `week` | Partecipanti e ruoli operativi | Prenotazioni, Messe e operazioni quotidiane autorizzate. |
| Oggi a tavola | `summary` | Comunita | Riepilogo nominativo di oggi e domani. |
| Cucina | `kitchen` | Personale cucina | Conteggi anonimi, diete, note, ammalati e Messa. |
| Accesso amministratore | `admin` senza accesso | Amministratori | Google, email, creazione account con invito e verifica. |
| Inizializzazione centro | `admin` con invito | Nuovo responsabile | Nome, fuso, creazione e preparazione del centro. |
| Pannello centro | `admin` autenticato | Responsabile, amministratori e vice | Centro, persone, ruoli, collegamenti, calendario ed esportazione. |
| Piattaforma | sezione del pannello `admin` | Proprietario generale | Inviti per nuovi centri ed elenco complessivo. |

## Mappa dei moduli attuali

| Modulo | Responsabilita attuale | Osservazioni |
|---|---|---|
| `app.js` | Stato globale, navigazione, rendering, eventi, accesso, flussi e feedback | Circa 170 KB e 205 funzioni. E il principale punto di concentrazione. |
| `firebase-client.js` | Inizializzazione Firebase e autenticazione | Confine tecnico riconoscibile. |
| `center-context.js` | Centro attivo e chiavi locali per centro | Piccolo e coerente. |
| `center-settings.js` | Impostazioni centro, contatti e avatar | Accesso dati e cache convivono nello stesso modulo. |
| `admin-center.js` | Inviti centro, ADMIN e vice, successione, accesso amministrativo, elenco centri | Contiene anche la costante del proprietario generale. |
| `access-links.js` | Lettura e rotazione dei collegamenti operativi | Mantiene privati gli identificativi attivi e revoca il precedente. |
| `audit-log.js` | Registro amministrativo essenziale | Caricato soltanto quando serve nel pannello. |
| `calendar-configuration.js` | Riallineamento riprendibile delle scadenze future | Conserva lo stato dei pasti e rileva operazioni amministrative concorrenti. |
| `participant-data.js` | Sessioni residenti, persone, prenotazioni, ruoli ed esportazione | Circa 41 KB, con responsabilita molto diverse. |
| `daily-operations.js` | Messe, ammalati e diete occasionali | Buon candidato a servizio di dominio separato. |
| `kitchen-data.js` | Conteggi e aggregazioni cucina | Separato dalla UI ma contiene traduzione di etichette dieta. |
| `kitchen-notes.js` | Lettura e scrittura delle note | Modulo circoscritto. |
| `reservation-state.mjs` | Presenza effettiva da regola e override | Logica pura con test dedicati. |
| `schedule-utils.mjs` | Orari limite, finestre e copertura | Logica pura con test dedicati. |
| `date-utils.mjs` | Data nel fuso del centro | Punto unico gia estratto. |
| `diet-utils.mjs` | Catalogo, normalizzazione, validazione ed etichette delle diete | Fonte autorevole condivisa da anagrafica, operativita e cucina. |
| `domain/admin-overview.mjs` | Indicatori sintetici della panoramica centro | Logica pura costruita sui dati gia caricati, senza letture aggiuntive. |
| `refresh-schedule.js` | Politica dei refresh adattivi | Logica pura e testata. |
| `styles.css` | Tutto il sistema grafico e responsive | Circa 71 KB, un solo file per tutte le viste. |
| `index.html` | Struttura di tutte le schermate | Circa 30 KB; tutte le viste convivono nello stesso documento. |

## Mappa dei dati Firebase

### Livello piattaforma

| Percorso | Scopo |
|---|---|
| `adminProfiles/{adminUid}` | Centro e ruolo associati all'identita amministrativa. |
| `centerInvitations/{invitationId}` | Inviti monouso per la creazione di un nuovo centro. |
| `adminInvitations/{invitationId}` | Inviti monouso per accreditare un vice. |
| `centers/{centerId}` | Impostazioni, stato e proprietario del centro. |

### Livello centro

| Sottoraccolta | Scopo |
|---|---|
| `admins` | Ruolo e permessi amministrativi. |
| `groups` | Gruppi Residenti e Ospiti. |
| `assets` | Icona del centro. |
| `privateSettings` | Collegamenti attivi e avanzamento privato della riconfigurazione calendario. |
| `auditEvents` | Registro essenziale e immutabile delle modifiche amministrative. |
| `participants` | Dati privati e contatti. |
| `publicParticipants` | Identita e dati leggibili nelle viste consentite. |
| `mealTypes` | Tipi di pasto. |
| `mealWindows` | Finestre giornaliere e scadenze. |
| `linkTokens` | Token per collegamenti operativi e personali. |
| `accessSessions` | Sessioni attive per dispositivo e ambito. |
| `kitchenNotes` | Nota operativa per data. |
| `dailyOperations` | Presenza della Messa. |
| `dailyHealth` | Ammalati e diete occasionali. |
| `reservationRules` | Regola anagrafica del partecipante. |
| `reservationOverrides` | Scelta esplicita del partecipante per pasto. |
| `reservationOverrideHistory` | Storico essenziale delle modifiche alle prenotazioni. |

## Mappa dei permessi effettivi

La matrice dettagliata viene mantenuta in `MATRICE_RUOLI_PERMESSI.md`. Le regole attuali applicano questi principi:

- il proprietario generale ha un accesso trasversale esplicito;
- un amministratore attivo legge il proprio centro;
- soltanto `OWNER` e `ADMIN` gestiscono configurazione, calendario, collegamenti e avatar;
- `MANAGER` gestisce persone e operazioni quotidiane, ma non configurazione, collegamenti o eliminazioni definitive;
- sessioni pubbliche, personali e cucina hanno letture differenziate;
- le scritture personali verificano sessione, persona attiva, regola applicabile e finestra aperta;
- i contatti privati sono leggibili nel riepilogo soltanto quando il centro abilita la condivisione;
- le scritture sensibili usano schemi di campi chiusi nelle regole.

## Duplicazioni e incoerenze rilevate

### D01 - Stato globale concentrato

`app.js` contiene un singolo oggetto `state` modificato da rendering, navigazione, autenticazione, refresh e salvataggi. Le mutazioni sono difficili da ricondurre a un solo proprietario e rendono complessi i casi concorrenti.

### D02 - Rendering e logica nello stesso modulo

Le funzioni di salvataggio aggiornano dati, messaggi, classi CSS e porzioni DOM. Questo ostacola test unitari e riuso dei flussi.

### D03 - Due editor per la stessa persona - risolto

La scheda Persona e ora l'unico punto di modifica. L'Elenco persone e una directory compatta che apre la scheda selezionata.

### D04 - Catalogo diete duplicato - risolto

Opzioni, etichette, codici personalizzati e validazione sono definiti in `diet-utils.mjs` e riusati da tutte le viste.

### D05 - Politica ruoli duplicata

Le stringhe `OWNER`, `ADMIN` e `MANAGER` e le relative decisioni sono ripetute in codice client e regole Firestore. La duplicazione fra client e server e inevitabile, ma manca una specifica eseguibile comune e una verifica completa di parita.

### D06 - Controllo globale dentro Persona

"Mostra i contatti nel riepilogo interno" modifica il centro, ma viene salvato insieme alla persona. Il dato e il suo proprietario visivo non coincidono.

### D07 - Permessi mostrati non coerenti

Il vice vede l'editor dell'icona, ma le regole negano il salvataggio. Il problema puo esistere anche per altre impostazioni governate genericamente da `isAdmin`.

### D08 - `ADMIN` senza flusso - risolto

L'OWNER genera inviti ADMIN, ne vede lo stato, li revoca e puo rimuovere gli amministratori accreditati.

### D09 - `OWNER` senza successione - risolto

La successione promuove un ADMIN attivo e retrocede il precedente OWNER nella stessa operazione atomica.

### D10 - Inviti privi di ciclo visibile - risolto

Il pannello mostra ruolo, destinatario, scadenza e stato degli inviti e consente la revoca secondo la gerarchia.

### D11 - Concorrenza non formalizzata - risolto nei flussi sensibili

Le persone usano una revisione persistente; successione, collegamenti e calendario usano transazioni e identificativi di operazione. Un dato superato produce un conflitto leggibile.

### D12 - Registro modifiche parziale - risolto per l'amministrazione

Il registro immutabile comprende persone, ruoli, inviti, collegamenti, impostazioni e trasferimenti amministrativi senza contenuti sanitari dettagliati.

### D13 - Offline parziale

La PWA conserva l'involucro statico, ma non possiede una coda applicativa esplicita per modifiche amministrative offline. L'interfaccia deve evitare di far credere che un dato sia stato salvato quando Firebase non ha risposto.

### D14 - Copertura test UI incompleta

I test correnti verificano logica, presenza di strutture e regole, ma non esiste ancora una suite end-to-end per ruolo che interagisca realmente con tutte le schermate e controlli focus, layout e rete lenta.

### D15 - CSS e HTML monolitici

Tutte le viste condividono un solo foglio da circa 71 KB e un solo documento. La separazione futura deve evitare duplicazioni senza introdurre una migrazione tecnologica non necessaria.

## Backlog ordinato

### Stato di avanzamento

| Area | Stato | Evidenza |
|---|---|---|
| P0 - Modello amministrativo | COMPLETATO | Ruoli centralizzati, inviti `ADMIN` e `MANAGER`, trasferimento OWNER atomico, regole Emulator Suite. |
| P1 - Fondamenta | IN CORSO AVANZATO | Policy ruoli, validatori, guardia operazioni, store revisionato, errori comprensibili e registro attivita disponibili. |
| P2 - Flussi amministrativi | IN CORSO AVANZATO | Panoramica, editor unico, sospensione, eliminazione, ruoli, inviti, successione, collegamenti, scadenze ed esercitazione di ripristino sono attivi. |
| P3 - Interfaccia | IN CORSO AVANZATO | Controlli tattili, focus visibile, navigazione per capacita, conservazione delle bozze e contratto a 320 px sono attivi; resta la modularizzazione completa di HTML e CSS. |
| P4 - Verifica e rilascio | IN CORSO AVANZATO | 154 test applicativi e 52 test Emulator Suite passano; restano gli scenari end-to-end autenticati per ogni ruolo e la verifica manuale completa sui dispositivi. |

### P0 - Correttezza del modello amministrativo

| ID | Intervento | Esito richiesto |
|---|---|---|
| P0.1 | Approvare la matrice definitiva dei ruoli | Una funzione pura e testata descrive visibilita e scrittura per ogni ruolo. |
| P0.2 | Implementare il trasferimento di `OWNER` | Operazione atomica, un solo nuovo `OWNER`, precedente ruolo esplicito e recupero sicuro. |
| P0.3 | Implementare nomina e revoca di `ADMIN` | Ciclo completo nell'interfaccia e nelle regole. |
| P0.4 | Garantire sempre un `OWNER` attivo | Regole, transazione e test emulator impediscono centri senza responsabile. |
| P0.5 | Allineare visibilita e regole | Nessun controllo visibile a un ruolo che non puo usarlo. |
| P0.6 | Definire proprieta di impostazioni e dati | Nome, avatar, orari, collegamenti, persone e calendario hanno un responsabile dichiarato. |

### P1 - Fondamenta applicative

| ID | Intervento | Esito richiesto |
|---|---|---|
| P1.1 | Estrarre una policy ruoli client | Costanti, capacita e terminologia in un modulo puro con test. |
| P1.2 | Introdurre uno store con azioni esplicite | Le mutazioni di stato passano da funzioni nominate e osservabili. |
| P1.3 | Separare servizi Firebase e flussi | Le schermate non costruiscono direttamente scritture Firestore. |
| P1.4 | Centralizzare validazione e cataloghi | Diete, telefoni, sigle, orari e ruoli hanno una sola fonte client. |
| P1.5 | Normalizzare errori e stati asincroni | Ogni flusso usa idle, loading, success, error e conflict. |
| P1.6 | Aggiungere prevenzione doppi invii | Un'azione in corso non puo essere ripetuta. |
| P1.7 | Aggiungere controllo di revisione | Le modifiche concorrenti vengono rilevate e spiegate. |
| P1.8 | Introdurre registro essenziale | Ruoli, persone, centro e collegamenti producono eventi minimi di ripristino. |

### P2 - Flussi amministrativi

| ID | Intervento | Esito richiesto |
|---|---|---|
| P2.1 | Nuova panoramica centro | COMPLETATO: ruolo, persone, inviti, calendario e collegamenti sono riassunti senza letture aggiuntive. |
| P2.2 | Unificare la gestione Persona | COMPLETATO: directory di selezione e un solo editor di dettaglio autorevole. |
| P2.3 | Separare Ruoli e accessi | Candidatura, invito, accredito, permessi e revoca sono un processo leggibile. |
| P2.4 | Gestire il ciclo degli inviti | COMPLETATO: stato, scadenza, copia, revoca e nuova emissione. |
| P2.5 | Gestire i collegamenti | COMPLETATO: stato, destinatario, copia, rigenerazione e revoca del precedente. |
| P2.6 | Esporre gli orari limite | COMPLETATO: modifica validata e riallineamento riprendibile delle finestre future. |
| P2.7 | Distinguere sospensione ed eliminazione | Sospensione reversibile primaria; eliminazione definitiva protetta. |
| P2.8 | Definire esportazione e ripristino | COMPLETATO: esportazione, simulazione, importatore limitato all'Emulator, rilettura dei documenti e procedura operativa sono verificati. |

### P3 - Architettura dell'interfaccia

| ID | Intervento | Esito richiesto |
|---|---|---|
| P3.1 | Separare Piattaforma, Centro e Operativita | Navigazione coerente con frequenza e ruolo. |
| P3.2 | Creare componenti accessibili | Controlli e stati condivisi con target minimo 44x44 px. |
| P3.3 | Definire microcopy autorevole | Terminologia coerente in HTML, JavaScript e documentazione. |
| P3.4 | Modularizzare gli stili | Token, componenti, layout e viste separati senza duplicazioni. |
| P3.5 | Verificare 320 px, tablet e desktop | Nessuno scorrimento orizzontale e focus sempre visibile. |
| P3.6 | Progettare rete lenta e offline | IN CORSO AVANZATO: le scritture sono bloccate offline, i dati gia mostrati e le bozze restano visibili, i doppi invii sono impediti; resta la prova manuale sistematica con rete degradata. |

### P4 - Verifica e rilascio

| ID | Intervento | Esito richiesto |
|---|---|---|
| P4.1 | Test unitari delle nuove policy | Ruoli, validazioni, store e transizioni coperti. |
| P4.2 | Test Emulator Suite | Ogni cella scrivibile della matrice ruoli e verificata. |
| P4.3 | Test end-to-end per ruolo | OWNER, ADMIN, MANAGER, Liturgia e partecipante completano i flussi previsti. |
| P4.4 | Test accessibilita automatici e manuali | IN CORSO AVANZATO: contrasto, target tattili, focus, movimento ridotto e stati non affidati al solo colore hanno test automatici; resta l'ispezione manuale completa. |
| P4.5 | Test rete lenta, offline e concorrenza | IN CORSO AVANZATO: classificazione delle azioni di rete, doppi invii e revisioni concorrenti hanno test automatici; resta la matrice manuale di rete degradata. |
| P4.6 | Migrazione progressiva | Ogni modulo nuovo sostituisce il vecchio soltanto dopo la verifica. |
| P4.7 | Piano di ripristino | COMPLETATO: backup, simulazione, ripristino solo Emulator, rilettura e limiti di sicurezza sono documentati e provati. |
| P4.8 | Rimozione del codice sostituito | Nessun doppio percorso o compatibilita indefinita resta nel prodotto. |

## Ordine di esecuzione immediato

1. Separare progressivamente rendering, casi d'uso e repository dal modulo `app.js`.
2. Aggiungere scenari end-to-end autenticati per ogni ruolo.
3. Verificare sistematicamente 320 px, tastiera, rete lenta e offline.
4. Consolidare i blocchi CSS responsive senza modificare la resa attuale.
5. Rimuovere adattatori e codice non piu raggiungibile soltanto dopo le prove di regressione.
