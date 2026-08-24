# Guida all’uso

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-16615a)](GUIDA_ALL_USO.md) 🇬🇧 [![English](https://img.shields.io/badge/English-6b7280)](en/USER_GUIDE.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-6b7280)](es/GUIA_DE_USO.md)

**Oggi a tavola** è una PWA per gestire le prenotazioni di colazione, pranzo e cena di una comunità. Residenti e vice usano una sigla personale; l’amministratore usa Google oppure email verificata e password; la cucina consulta un quadro operativo tramite un collegamento dedicato.

**Documentazione:** [README](../README.md) · [Architettura e sicurezza](ARCHITETTURA_E_SICUREZZA.md) · [Sviluppo e test](SVILUPPO_E_TEST.md) · [Esercizio e ripristino](OPERATIONS.md)

## Indice

- [Installazione e sessioni](#installazione-e-sessioni)
- [Accessi e permessi](#accessi-e-permessi)
- [Prenotazioni: Mese e Settimana](#prenotazioni-mese-e-settimana)
- [Agenda del centro](#agenda-del-centro)
- [Riepilogo e Cucina](#riepilogo-e-cucina)
- [Diete, Messa e promemoria](#diete-messa-e-promemoria)
- [Pannello di controllo](#pannello-di-controllo)
- [Passaggio dell’incarico](#passaggio-dellincarico)
- [Più centri](#più-centri)
- [Problemi comuni](#problemi-comuni)

## Installazione e sessioni

L’app funziona nel browser e può essere installata:

- **Android/Chrome:** aprire il collegamento del centro e scegliere **Installa app** o **Aggiungi a schermata Home**;
- **Windows/Edge:** scegliere **App > Installa questo sito come app**.

Il collegamento Cucina usa un manifest separato, perciò Prenotazioni e Cucina possono essere installate come due app distinte. Non cancellare i dati del sito se si desidera mantenere l’accesso. Refresh, chiusura e riapertura, ingresso nel pannello e ritorno alle prenotazioni sono navigazione e non devono distruggere la sessione. **Esci** termina invece deliberatamente l’accesso del dispositivo.

La vista di apertura può essere Mese o Settimana. Una riapertura applica questa preferenza; un refresh conserva la vista corrente.

## Accessi e permessi

| Profilo | Accesso | Funzioni principali |
| --- | --- | --- |
| **Residente** | sigla personale + password comune | prenotazioni, Riepilogo, preferenze del dispositivo |
| **Vice amministratore** | sigla personale + password amministratori | funzioni del residente, Persone, Agenda, Aspetto e consultazione/copia/apertura/condivisione dei link operativi |
| **Amministratore** | Google oppure email verificata + password personale | configurazione e gestione amministrativa del centro |
| **Cucina** | link cucina dedicato | conteggi e dati operativi, senza anagrafica completa |

Il centro ha un amministratore responsabile corrente. Nel codice il ruolo tecnico `OWNER` identifica chi può completare il passaggio dell’incarico; non è un secondo profilo distinto dall’amministratore. Durante un invito può esistere un amministratore `ADMIN` già autenticato, ma solo l’amministratore responsabile può gestire altri amministratori, ripristinare una configurazione o trasferire l’incarico.

| Funzione | Amministratore responsabile | Amministratore invitato/attivo | Vice |
| --- | :---: | :---: | :---: |
| Pannello di controllo | ✓ | ✓ | ✓, ridotto |
| Configurazione e calendario | ✓ | ✓ | — |
| Aspetto | ✓ | ✓ | ✓ |
| Persone: aggiunta, modifica, sospensione | ✓ | ✓ | ✓ |
| Eliminazione residenti | ✓ | ✓ | ✓, ma non di un altro vice |
| Assegnazione vice o ruolo liturgico | ✓ | ✓ | — |
| Agenda del centro | ✓ | ✓ | ✓ |
| Messa | solo con ruolo liturgico | solo con ruolo liturgico | solo con ruolo liturgico |
| Link operativi: vedere, copiare, aprire, condividere | ✓ | ✓ | ✓ |
| Rigenerazione link | ✓ | ✓ | — |
| Backup completo | ✓ | ✓ | — |
| Ripristino configurazione | ✓ | — | — |
| Registro attività | ✓ | ✓ | — |
| Inviti e passaggio dell’incarico | ✓ | — | — |

Il ruolo liturgico è indipendente dal ruolo amministrativo e può essere assegnato anche a un residente. Nessun amministratore lo eredita automaticamente.

## Prenotazioni: Mese e Settimana

### Vista Mese

Il calendario mostra per ogni giorno colazione, pranzo e cena. Un tocco cambia la singola prenotazione. I giorni passati o oltre l’orario limite non sono modificabili; il giorno corrente è evidenziato. Toccare il numero del giorno apre la relativa settimana.

I comandi multipli possono stare a destra o a sinistra: **M** agisce sul mese, il comando della settimana su quella settimana e il comando del pasto sullo stesso pasto per tutta la settimana.

### Vista Settimana

La griglia ha una riga per giorno e una colonna per pasto. Sono disponibili comandi per giorno, pasto e intera settimana. La colonna dei giorni segue lo stesso lato scelto per i controlli multipli del mese. Il cambio di settimana o mese riporta al periodo corrente quando necessario e, al passaggio della mezzanotte o del confine del periodo, la vista si riallinea automaticamente.

### Selezioni multiple e azioni collettive

Le selezioni multiple modificano esclusivamente le prenotazioni della persona attualmente autenticata. Non cambiano le scelte degli altri residenti e non operano sui pasti già chiusi o passati.

Nella **vista Mese**:

- **M** applica la scelta a tutti i pasti ancora modificabili del mese visualizzato;
- il comando con il calendario applica la scelta a tutti i pasti modificabili della relativa settimana;
- i comandi Colazione, Pranzo e Cena agiscono sullo stesso pasto per tutta la settimana;
- ogni singola casella continua a modificare soltanto quel pasto e quel giorno.

Nella **vista Settimana**:

- il comando generale agisce su tutti i pasti modificabili della settimana;
- il comando accanto a un giorno agisce sui pasti di quel solo giorno;
- il comando nell’intestazione di Colazione, Pranzo o Cena agisce su quella colonna per tutta la settimana;
- ogni casella resta un comando individuale.

Ogni comando collettivo funziona come un interruttore coerente: se nello spazio scelto esiste almeno un pasto non prenotato, prenota tutti quelli modificabili; se sono già tutti prenotati, li deseleziona tutti. In una situazione mista, quindi, il primo tocco completa la selezione e il successivo la svuota. La vista **Futura** usa la stessa logica nei comandi disponibili.

Il risultato appare subito nella griglia mentre il salvataggio procede. Un messaggio comunica quante prenotazioni sono state salvate; in caso di errore, l’app ripristina o ricarica gli stati non confermati. Non viene richiesta una conferma aggiuntiva, perché l’azione resta reversibile con un secondo tocco finché gli orari limite sono aperti.

La posizione destra o sinistra scelta in **Aspetto** viene applicata in modo coerente sia ai controlli del mese sia alla colonna dei giorni della settimana.

## Agenda del centro

Compare sotto la settimana per amministratore e vice; la sola Messa è disponibile a chi possiede il ruolo liturgico.

- **Invitati:** coperti senza nome, distinti per pasto e sommati ai totali.
- **Ammalati:** persone spostate dal conteggio in sala al conteggio separato, con le relative diete.
- **Note cucina:** messaggi fino a 1000 caratteri, aggiungibili ed eliminabili singolarmente. Sono mostrati soltanto nella data a cui appartengono.
- **Dieta occasionale:** sostituisce la dieta abituale per uno o due giorni senza modificare la scheda della persona.
- **Messa:** indicazione unica per la giornata, gestita soltanto da chi ha il ruolo liturgico.

Ogni sezione viene salvata separatamente.

## Riepilogo e Cucina

### Riepilogo

Mostra **Oggi** e **Domani**, anche tramite scorrimento orizzontale. **Originale** usa una tabella compatta, **Internazionale** una scheda per pasto e **Futura** schede scorrevoli alternative. Comprende coperti, invitati, diete, ammalati, Messa e nominativi.

I nomi possono essere visualizzati come nome, sigla o iniziali. Quando la condivisione dei contatti è attiva e la persona ha dato il consenso, toccandone il nome si può telefonare o aprire WhatsApp. Il suggerimento di contatto scompare dopo trenta aperture sul dispositivo.

### Cucina

Il link dedicato crea un accesso tecnico revocabile legato al centro e mostra per Oggi e Domani coperti, diete, ammalati, invitati, note della data, Messa e legenda diete. Si aggiorna automaticamente, più spesso vicino agli orari operativi e meno di notte. Non mostra l’anagrafica completa e non richiede sigla personale.

## Diete, Messa e promemoria

La dieta di base è `STANDARD` oppure un codice numerico mostrato come `D1`, `D2`, `D3` e così via. L’amministratore può associare al codice un’etichetta cucina di una o due parole. Riepilogo e anagrafica mostrano il codice; Cucina mostra anche la legenda. La molteplicità compare soltanto quando supera uno (`D3 × 2`, non `D3 × 1`).

La **Messa** è un incarico personale separato: amministratore, vice o residente possono gestirla soltanto se la relativa spunta è assegnata alla loro Persona.

I **promemoria** sono locali al dispositivo e disattivati per impostazione predefinita. Se autorizzati, avvisano dieci minuti prima della chiusura di pranzo o cena non ancora prenotati. Si disattivano da Aspetto o dalla notifica.

## Pannello di controllo

Le schede visibili dipendono dal ruolo.

### Configurazione

Comprende identità e icona del centro, titolo e seconda riga iniziali, fuso orario, orari limite in ordine Colazione–Pranzo–Cena, condivisione dei contatti, dati dell’amministratore, password comune e password dei vice. La password personale dell’amministratore appartiene a Firebase Authentication: può essere impostata o recuperata nel percorso email, non viene salvata nel documento del centro.

### Persone

Gestisce residenti e ospiti in un unico elenco: nome, sigla, iniziali, gruppo, dieta, etichetta cucina, telefono e consensi, ruolo vice/amministrativo e ruolo liturgico. È possibile sospendere, riattivare o eliminare definitivamente una persona; l’eliminazione rimuove anche prenotazioni e accessi collegati e richiede conferma.

### Link operativi

Presenta i collegamenti Prenotazioni e Cucina in campi di sola lettura, con **Copia**, **Apri** e **Condividi**. Il token è una credenziale: rigenerarlo rende inutilizzabile il collegamento precedente.

### Aspetto

Consente di scegliere vista iniziale, aspetto (Originale, Elegante, Essenziale, Futura), palette, layout di Riepilogo e Cucina, etichetta dei residenti, lato dei comandi multipli, lingua e promemoria. Nel pannello residente le scelte riguardano esclusivamente **questo dispositivo**.

Valori predefiniti: Mese, Essenziale, Inchiostro, Riepilogo Originale, Cucina Originale, residenti per Nome, controlli a destra, Italiano e promemoria disattivati.

### Amministratore e Manutenzione

L’amministratore responsabile crea inviti collegati a Persone, condivide il link, segue accettazioni e revoche e completa l’eventuale trasferimento. Manutenzione comprende copertura del calendario, registro Quando–Chi–Cosa, download del backup JSON, ripristino prudente della sola configurazione e informazioni sul progetto. Il vice non vede queste schede riservate.

Per backup, deploy e recupero consultare [Esercizio, rilascio e ripristino](OPERATIONS.md).

## Passaggio dell’incarico

1. L’amministratore responsabile sceglie una Persona e crea l’invito.
2. Il destinatario apre il link, sceglie **Accetto** o **Rifiuto** e si identifica con Google oppure email e password.
3. Dopo l’accettazione resta in attesa del trasferimento.
4. L’amministratore uscente seleziona il successore, digita la conferma richiesta e completa il trasferimento.
5. Nome, email e Persona del successore popolano la configurazione; il nuovo amministratore ottiene il controllo e quello uscente perde l’accesso amministrativo, conservando la propria Persona per le prenotazioni.

L’autenticazione non equivale all’accettazione e l’accettazione non equivale ancora al trasferimento.

## Più centri

Un account amministrativo può appartenere a più centri e scegliere quello attivo. Il ruolo di piattaforma, separato dai ruoli del centro, può creare e disattivare centri conservandone i dati; non è disponibile ai normali amministratori.

## Problemi comuni

- **Versione vecchia:** chiudere completamente app e schede del sito, quindi riaprire. L’aggiornamento diventa attivo alla successiva apertura senza riavvio forzato.
- **Vista iniziale errata:** salvare Aspetto; una riapertura usa la preferenza, un refresh conserva la vista corrente.
- **Sessione non ripristinata:** controllare che il browser non cancelli i dati del sito.
- **Cucina o Riepilogo senza dati:** usare il collegamento completo e aggiornato del centro.
- **Comando assente:** verificare ruolo e, per la Messa, la spunta liturgica personale.
- **Promemoria assenti:** controllare preferenza e permesso notifiche.
- **Pasto non modificabile:** l’orario limite è trascorso.
- **Connessione assente:** gli ultimi dati possono restare consultabili, ma le modifiche attendono la rete.
