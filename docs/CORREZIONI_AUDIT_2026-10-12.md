# Correzioni dell’audit del 12 ottobre 2026

Release `20261012b`, cache PWA `v451`. Intervento successivo all’[audit](AUDIT_BUG_2026-10-12.md), autorizzato insieme alla pubblicazione su Firebase.

## Correzioni

- Configurazione del centro e Persona del responsabile vengono scritte nella stessa transazione finale, anche nel percorso che ricalcola il calendario. La validazione dei campi e dei duplicati noti precede le scritture. Gli errori successivi al commit dichiarano che configurazione e Persona sono già state salvate; gli aggiornamenti delle password sono segnalati separatamente.
- I moduli amministrativi incompleti producono un messaggio comprensibile prima di scrivere dati. Non si invoca `checkValidity()` su un elemento inerte.
- Il vice può leggere l’etichetta della dieta; il campo resta disabilitato per la modifica.
- I promemoria caricano la giornata personale anche aprendo direttamente Riepilogo. Le risposte di richieste superate non cambiano i dati del nuovo residente. Prenotazioni singole e massive aggiornano anche i dati usati dai promemoria.
- Le eccezioni durante la richiesta di notifiche vengono intercettate. Il selettore torna alla preferenza disattivata e viene mostrato un messaggio tradotto. In tutte le cinque lingue l’interfaccia chiarisce che gli avvisi non sono garantiti con app sospesa o chiusa.
- Il manifest generato dal service worker conserva `c` nell’URL di avvio e nell’identità installabile, per Pasti e Cucina. La pagina aggiorna il link del manifest quando viene controllata dal worker e al cambio del centro. La soluzione usa la normale elaborazione del [link manifest definita dallo standard HTML](https://html.spec.whatwg.org/multipage/links.html#link-type-manifest).
- Aggiunti margini per le aree sicure del dispositivo con `safe-area-inset-*`.
- Una sessione vice non autorizza più le letture private e le scritture operative quando il centro è disattivato.
- Gli utenti estranei non possono elencare gli inviti amministrativi. Chi possiede un identificativo di invito valido può ancora aprirlo e accettarlo.
- I salvataggi delle Persone leggono il documento condiviso dei metadati nella transazione: un salvataggio concorrente impone la ripetizione del controllo duplicati, impedendo la creazione contemporanea della stessa sigla tramite l’app aggiornata.
- L’elenco degli ammalati viene aggiornato con una transazione che applica aggiunte e rimozioni rispetto alla vista iniziale, preservando le modifiche indipendenti di un altro operatore. Salvare gli invitati restituisce i dati sanitari letti dalla transazione, evitando di ripubblicare una cache vecchia.
- Versioni degli import locali e dei cataloghi aggiornate insieme, per evitare istanze miste dei moduli dopo il rilascio.

## Verifica

- Gate completo superato: controlli sintattici, 448 test applicativi, validazione di 709 chiavi nelle cinque lingue e build minificata.
- 99 test Firestore superati sul progetto sintetico `demo-tat-fixes-20261012` e sulle regole correnti, comprese le prove di rollback atomico con e senza ricalcolo del calendario.
- WebKit 26.5, profilo iPhone 13: server locale con HTML reale, bootstrap del manifest e service worker. Le aperture residenti, Cucina e amministratore producono URL installabili che conservano il centro; un contesto nuovo con storage vuoto risolve il centro corretto. I campi amministrativi esistono nella pagina amministratore e mantengono i validatori nativi. Nelle altre viste il markup amministrativo viene rimosso intenzionalmente dal bootstrap HTML.
- I test del browser non avviano Firebase. Nessuna prova usa identità o dati di produzione. Non è un collaudo su iPhone fisico né del comando nativo «Aggiungi alla schermata Home».
- Le modifiche preesistenti nella cartella di lavoro sono state preservate; una copia della differenza iniziale e dei sorgenti è conservata nella cartella locale esclusa da Git `.tools/audit-20261012/`.

## Limiti e aggiornamento

SEC-001 resta aperto secondo il rinvio esplicito registrato in [Problemi noti](PROBLEMI_NOTI.md#sec-001--password-comune-leggibile-da-una-sessione-cucina-senza-token). Questo rilascio non modifica quel modello di accesso né migra le credenziali dei centri.

La riscrittura delle finestre calendario e Firebase Auth possono richiedere più operazioni: non sono incluse in una singola transazione globale. Il job del calendario resta riprendibile e l’interfaccia distingue le password già aggiornate. Non sono state introdotte notifiche Push: su iPhone i promemoria locali restano soggetti alla sospensione dell’app.

Per attivare la nuova cache, chiudere tutte le schede e le finestre dell’app, quindi riaprirla. Per un’icona Home creata in precedenza senza il centro, ricreare il collegamento partendo dall’URL completo del proprio centro dopo l’aggiornamento; le credenziali residenti possono richiedere un nuovo accesso.

Pubblicazione e confronto degli hash online: in corso.
