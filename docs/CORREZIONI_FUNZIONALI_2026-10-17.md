# Correzioni funzionali — 17 ottobre 2026

Intervento sui difetti funzionali dell'audit, pubblicato il 17 ottobre 2026 su https://tavola-comune.web.app/ (Hosting, regole Firestore e indici). Gate pre-deploy superato; Firebase ha confermato il rilascio. Il confronto SHA-256 di tutti i file del manifesto e del manifesto stesso ha confermato la corrispondenza tra sito e build locale.

- Eliminazione persone: controllo della revisione prima della sospensione e della cancellazione; anagrafica, prenotazioni e credenziali collegate sono cancellate in un unico commit. La UI ricarica i dati dopo un errore. Un fallimento finale lascia la persona sospesa e conserva i dati per un nuovo tentativo.
- Per mantenere la cancellazione indivisibile, oltre 490 documenti collegati l'operazione si interrompe esplicitamente senza cancellare prenotazioni. La persona rimane sospesa; gli archivi più grandi richiedono una procedura dedicata.
- Legenda diete: il limite Firestore è allineato alle 999 voci del client.
- Collegamento del responsabile alla persona: il batch riallinea anche ruolo, centro e stato del profilo di navigazione.
- Ammalati: senza cache né base esplicita, la rimozione usa lo stato letto in transazione; con base esplicita conserva le aggiunte concorrenti.
- Traduzioni: fallback dei plurali disponibili prima del caricamento dei cataloghi, ripiego sulla categoria `other`, pulsanti password traducibili anche al cambio lingua, conservazione delle icone SVG durante le traduzioni.
- Il service worker gestisce anche il catalogo catalano per il riutilizzo offline dopo il caricamento.

## Verifiche

- 563 test applicativi superati.
- Cataloghi delle sei lingue validati: 731 chiavi, nessun errore.
- Build completata: release `1eb01823ee495c72`.
- Verifica successiva alla pubblicazione: intera suite Firestore eseguita serialmente, **110 test superati su 110**. Passano cancellazione di oltre 400 documenti, fallimento finale senza perdita di dati, nuovo tentativo, revisione obsoleta, archivio oltre limite e legenda di 999 voci.
- Il test preesistente `una sessione vice validata gestisce persone pulizia impostazioni visive e log ma non ruoli o manutenzione` è stato allineato alla cancellazione transazionale già pubblicata: legge l'anagrafica e cancella i documenti nello stesso commit. Sono conservati i controlli negativi sui permessi e aggiunte verifiche dell'effettiva assenza dei sette documenti. Il precedente batch senza lettura aveva prodotto `permission-denied` anche con le regole precedenti; questa prova non dimostra che quel percorso legacy sia stato corretto. Il percorso transazionale dell'app e l'intera suite ora passano. Questo seguito modifica solo test e documentazione e non richiede un altro deploy.

Le modifiche preesistenti alla connettività sono state conservate; il relativo test del contesto settimanale ha ricevuto lo stub della dipendenza `blockOfflineAction` già introdotta nel codice.
