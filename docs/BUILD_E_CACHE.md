# Build e cache dell'applicazione

La build usa esbuild per raggruppare i moduli, eliminare il codice inutilizzato e separare le funzionalità caricate su richiesta. Firebase Auth e Firestore completo sono inclusi con un'unica istanza per modulo SDK. La dipendenza installata deve coincidere con quella degli import di sviluppo.

Gestione persone, esportazione, preparazione del ripristino e ispezione delle copie di sicurezza si caricano quando richieste. Le scritture amministrative invalidano le stesse cache usate dal residente. L'orchestrazione dell'interfaccia rimane in `app.js`.

## Risorse pubblicate

`dist/assets` contiene moduli JavaScript e fogli CSS identificati dall'impronta del contenuto. I moduli immutabili restano disponibili per le schede già aperte, che possono richiedere una funzione facoltativa durante un aggiornamento. I cataloghi delle sei lingue mantengono il percorso `/i18n/`; un parametro derivato dall'impronta dei cataloghi identifica il contenuto in cache. Le richieste usano la cache HTTP e le traduzioni dell’Agenda sono presenti anche nei testi di riserva del modulo, così la disponibilità delle etichette non dipende dal caricamento del catalogo.

`build-manifest.json` descrive sorgenti, file compilati, impronte e grafo di avvio. Gli identificatori tecnici garantiscono coerenza e riproducibilità; non compaiono nella presentazione del prodotto.

## Installazione atomica

Il service worker ricava la cache iniziale dal grafo residente. L'HTML di ripiego viene installato insieme a tutte le risorse necessarie. Una navigazione non sostituisce singolarmente l'HTML della cache con un documento che richiede moduli non disponibili.

L'HTML usa la rete come fonte primaria; con una copia locale utilizzabile il budget di attesa è 1200 ms. Questo limite riguarda soltanto la richiesta HTML, non il tempo totale di apertura dell'applicazione. Senza copia locale viene mantenuta la richiesta di rete originale.

I moduli con impronta usano cache immutabile. Un modulo richiesto non viene sostituito con un contenuto di impronta diversa. Il worker conserva soltanto codice pubblico: gli URL di navigazione con token, le risposte Auth e i dati di sessione sono esclusi. La pulizia di Cache Storage non cancella credenziali Firebase o preferenze personali e ricostruisce l'insieme delle risorse offline.

L'attivazione segue la chiusura delle finestre controllate: non viene usato `skipWaiting` e non si forza una ricarica durante le operazioni dell'utente.

## Controlli

`tools/verify-build.mjs` controlla impronte, riferimenti e corrispondenza con i sorgenti. Le prove del worker coprono installazione incompleta, indisponibilità della rete, pulizia e ricostruzione della cache. `tools/verify-hosting-release.mjs` confronta tutti i file previsti dal manifest con quelli online.

Le dimensioni del grafo JavaScript non costituiscono una misura della latenza sul dispositivo. Le misure locali e le prove con dati sintetici vanno distinte dalle osservazioni sui sistemi operativi reali. I comandi di build e pubblicazione sono in [Sviluppo e test](SVILUPPO_E_TEST.md) e [Esercizio e ripristino](OPERATIONS.md).
