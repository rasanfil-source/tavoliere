# Correzioni dell'analisi del 29 settembre 2026

Stato: pubblicate il 29 settembre 2026 su https://tavola-comune.web.app, progetto Firebase `tavola-comune`. Commit della versione pubblicata: `e8ddea7`.

L'intervento riguarda i problemi 2–6 dell'analisi. Il problema 1 resta aperto e rinviato per decisione dell'utente, come documentato in [PROBLEMI_NOTI.md](PROBLEMI_NOTI.md). Le modifiche preesistenti nella cartella di lavoro sono state conservate.

## Comportamento dopo le correzioni

| Problema | Correzione e conseguenza per l'utente |
| --- | --- |
| 2 — Consenso ai contatti | Le sessioni PUBLIC e PERSONAL possono leggere dal database soltanto i contatti con `phoneConsent: true`, se il centro consente la condivisione. La query del Riepilogo applica lo stesso filtro; i nominativi continuano a provenire dall'elenco pubblico. La revoca impedisce le successive letture dal server. L'accesso alla directory per i gestori autorizzati resta disponibile. |
| 3 — Prima operazione della giornata | Invitati e diete occasionali possono creare il documento giornaliero anche senza avere prima salvato gli ammalati. I campi assenti vengono interpretati come vuoti. Restano i controlli di ruolo e di validità dei dati; i salvataggi parziali preservano i campi scritti da altri operatori. |
| 4 — Dieta occasionale | La dieta occasionale sostituisce quella abituale nei conteggi della Cucina e del Riepilogo, anche per gli ammalati. La stessa persona non viene più conteggiata contemporaneamente nella dieta abituale e in quella temporanea. |
| 5 — Dieta della prenotazione | Riepilogo e Cucina usano la medesima risoluzione della dieta. Una prenotazione già salvata mantiene la dieta registrata, anche se successivamente cambia l'anagrafica; una dieta occasionale applicabile conserva la precedenza. |
| 6 — Salvataggio da due dispositivi | Se un altro dispositivo ha già creato la prenotazione, il salvataggio recupera il conflitto in transazione e aggiorna la presenza senza riscrivere data di creazione, identità o dieta conservata. Restano i limiti di accesso e le scadenze dei pasti. Il salvataggio di un giorno resta atomico. |

Queste correzioni non richiedono nuove credenziali, cambi di ruolo o una diversa procedura di ingresso. Il recupero del conflitto riguarda il salvataggio di un singolo pasto, del giorno e dei gruppi di pasti selezionati nel mese.

## Verifiche

- **409 test applicativi superati**, inclusi quattro nuovi test della catena di calcolo delle diete.
- **81 test delle regole Firestore superati** e **8 test dei flussi applicativi superati nell'emulatore**. La prima esecuzione completa comprendeva 88 test; dopo l'aggiunta della verifica isolata sulla prima dieta, sono stati rieseguiti gli 8 test dei flussi. Totale: 89 casi Firestore verificati sul codice corrente.
- Le prove usano dati sintetici e il vero SDK Firebase nell'emulatore. Coprono consenso e revoca, creazione di giornate parziali, scritture concorrenti, vincoli di schema, salvataggio da due dispositivi e rispetto delle scadenze.
- Due fixture con una scadenza ormai passata sono state rese relative alla data di esecuzione, per evitare falsi fallimenti nei test delle sessioni.
- **708 chiavi di traduzione verificate**, senza errori nelle cinque lingue.
- **Build completata** e cartella `dist` rigenerata. Prima della rigenerazione è stata verificata la corrispondenza dei file generati preesistenti con i sorgenti, per conservarne le modifiche.
- Controllo del diff senza errori di spaziatura.

Il gate completo prima del rilascio è stato superato. Dopo la pubblicazione sono stati confrontati gli hash SHA-256 dei file online con la build locale: `index.html`, `app.js`, `styles.css`, `sw.js`, `participant-data.js`, `summary-matrix-model.js` e `summary-matrix-view.js` coincidono. Firebase ha confermato compilazione e rilascio delle regole Firestore.

Non è stato eseguito un test completo dell'interfaccia con sessioni autenticate nel browser di produzione. Il launcher locale di npm risulta incompleto: suite, validatore e build sono stati eseguiti direttamente con Node, mentre le regole sono state verificate con il wrapper Firebase del progetto.

Test aggiunti: `tests/firebase-spark/diet-pipeline.test.mjs`, `tests/firebase-rules/application-flows.test.mjs` e relativo helper `tests/helpers/browser-module.mjs`.

## Rilascio e aggiornamento della PWA

Applicazione e regole Firestore sono state pubblicate insieme con `deploy --only hosting,firestore:rules`; gli indici non sono stati modificati. Le vecchie versioni eseguono una query dei contatti che le nuove regole rifiutano. Sono stati aggiornati i riferimenti dei moduli modificati e la cache PWA a `v447`: chiudere tutte le finestre e schede dell'app e riaprirla per caricare la nuova versione.

Non è prevista una migrazione dei dati esistenti e non sono stati modificati i documenti applicativi di produzione. La protezione dei contatti limita le letture future dal server e non può ritirare dati già scaricati da una versione precedente. Il problema 1 è rimasto escluso dall'intervento anche nel rilascio.
