# Matrice dei ruoli e dei permessi

## Principi

- Ogni centro ha esattamente un `OWNER`, mostrato nell'interfaccia come **Responsabile del centro**.
- Il proprietario della piattaforma e un potere globale distinto dai ruoli interni ai centri.
- Un utente vede soltanto i comandi che puo realmente eseguire.
- I controlli dell'interfaccia non costituiscono una protezione: le regole Firestore applicano la stessa matrice.
- Il Vice gestisce sempre persone, diete e operativita quotidiana; la gestione delle Messe resta opzionale.
- L'incaricato Liturgia e un partecipante ordinario con il solo potere aggiuntivo di gestire le Messe.
- Il centro non puo rimanere senza Responsabile: la revoca dell'OWNER e possibile soltanto dentro un trasferimento riuscito.

## Ruoli

| Ruolo | Nomina | Revoca | Ambito |
|---|---|---|---|
| Proprietario piattaforma | Configurazione tecnica iniziale | Procedura tecnica straordinaria | Creazione e censimento dei centri |
| Responsabile del centro (`OWNER`) | Invito piattaforma o trasferimento da un altro OWNER | Solo trasferendo contestualmente il ruolo | Tutto il proprio centro |
| Amministratore (`ADMIN`) | Solo OWNER | Solo OWNER | Amministrazione completa, esclusa la successione |
| Vice amministratore (`MANAGER`) | OWNER o ADMIN, massimo due attivi | OWNER o ADMIN | Persone e operativita quotidiana |
| Liturgia | OWNER o ADMIN su una persona attiva | OWNER o ADMIN | Solo Messe, oltre alle proprie prenotazioni |
| Partecipante | OWNER, ADMIN o Vice | OWNER, ADMIN o Vice | Soltanto le proprie prenotazioni |

## Matrice operativa

Legenda: `L` lettura o visibilita; `S` scrittura; `-` non disponibile; `O` opzionale.

| Funzione | Piattaforma | OWNER | ADMIN | Vice | Liturgia | Partecipante |
|---|---:|---:|---:|---:|---:|---:|
| Elenco e creazione centri | S | - | - | - | - | - |
| Panoramica del proprio centro | - | L | L | L | - | - |
| Nome, fuso, contatti e avatar | - | S | S | - | - | - |
| Scadenze e preparazione calendario | - | S | S | - | - | - |
| Elenco persone | - | S | S | S | - | - |
| Dieta permanente e contatti persona | - | S | S | S | - | - |
| Sospensione e ripristino persona | - | S | S | S | - | - |
| Eliminazione definitiva persona | - | S | S | - | - | - |
| Ammalati, dieta occasionale e note cucina | - | S | S | S | - | - |
| Gestione Messe | - | S | S | O | S | - |
| Nomina e revoca Vice | - | S | S | - | - | - |
| Nomina e revoca Liturgia | - | S | S | - | - | - |
| Nomina e revoca ADMIN | - | S | - | - | - | - |
| Trasferimento Responsabile | - | S | - | - | - | - |
| Vedere e copiare collegamenti operativi | - | L | L | - | - | - |
| Generare, sostituire o revocare collegamenti | - | S | S | - | - | - |
| Correggere prenotazioni altrui | - | S | S | S | - | - |
| Esportare tutti i dati del centro | - | S | S | - | - | - |
| Registro essenziale delle modifiche | - | L | L | - | - | - |

## Proprietà dei dati

- Il centro possiede persone, gruppi, tipi di pasto, calendario, collegamenti, impostazioni, note e storico.
- L'OWNER e il responsabile della gestione del centro, ma non possiede personalmente i dati.
- Il trasferimento di OWNER non cambia percorsi, collegamenti o contenuti del centro.
- Gli account amministrativi sono associazioni revocabili tra un'identita autenticata e un centro.
- La prenotazione appartiene alla persona e al centro; il ruolo di chi la modifica e registrato nella fonte e nello storico essenziale.

## Successione del Responsabile

Il trasferimento e una singola operazione coerente:

1. l'OWNER invita e accredita prima il successore come `ADMIN` attivo;
2. l'OWNER sceglie il successore dall'elenco degli amministratori attivi;
3. una transazione verifica che centro, OWNER corrente e successore non siano cambiati;
4. il successore diventa `OWNER` e il precedente OWNER diventa `ADMIN`;
5. `centers/{centerId}.ownerUid`, i due documenti amministrativi e i due profili vengono aggiornati insieme;
6. il registro conserva autore, vecchio responsabile, nuovo responsabile e data.

Non esiste un comando separato per eliminare o disattivare l'unico OWNER.

## Corrispondenza con l'interfaccia

- **Piattaforma**: disponibile soltanto al proprietario globale.
- **Centro**: impostazioni e configurazione per OWNER e ADMIN; una panoramica operativa ridotta per il Vice.
- **Persone**: editor completo per OWNER e ADMIN; editor operativo senza eliminazione definitiva per il Vice.
- **Ruoli e accessi**: OWNER gestisce ADMIN, Vice, Liturgia e successione; ADMIN gestisce Vice e Liturgia.
- **Area operativa**: OWNER, ADMIN e Vice vedono ammalati, dieta occasionale e note cucina; Liturgia vede soltanto le Messe.

## Criteri automatici di accettazione

- La politica applicativa e coperta da test unitari per ogni ruolo.
- Le regole Firestore sono testate per ogni cella di scrittura consentita e negata.
- Nessun controllo riservato viene soltanto disabilitato: quando non serve a comprendere lo stato, non viene mostrato.
- Una modifica di ruolo aggiorna immediatamente schermata, sessione e permessi effettivi.
- Un OWNER non puo essere rimosso senza un successore gia accettato.
