# Riepilogo mensile della cucina

## Regole di conteggio

La raccolta inizia il **1° novembre 2026**. Ogni giornata viene registrata quando chiude la contabilità locale: alle **23:00** nei giorni normali, alle **21:00** nell'ultimo giorno del mese. Prima di salvare il job controlla anche gli orari effettivi `closesAt` dei tre pasti: se una prenotazione resta modificabile oltre la chiusura contabile, attende il controllo successivo per non registrare valori provvisori.

La colazione è attribuita alla data del pasto. Quella del 1° novembre, anche se prenotata il 31 ottobre, rientra quindi nei conteggi del **1° novembre**.

Ogni registro giornaliero contiene soltanto il centro, la data, i totali di colazione, pranzo e cena, l'ora di registrazione e la scadenza. Il conteggio segue la vista Cucina: prenotazioni effettive più invitati; chi è segnalato come ammalato resta separato ed escluso dal totale. Non vengono copiati nomi, identificativi, prenotazioni o dati sanitari.

Il riepilogo mensile viene prodotto solo se esiste un registro per tutti i giorni del mese. La prima mensilità completa sarà novembre, se il job è attivo per l'intero periodo. “Media cucina” mostra la somma del mese concluso a partire dalle 21:00 locali dell'ultimo giorno. Rimane il riepilogo corrente fino alla disponibilità del conteggio successivo; se un mese non è completo, continua a mostrare l'ultimo conteggio riuscito.

La voce può apparire in Cucina, ma i dati non si caricano all'apertura della vista. Quando la persona apre “Media cucina”, la PWA carica il modulo opzionale e legge un solo documento con l'ultimo riepilogo. L'app non legge i registri giornalieri e non ricalcola i mesi.

I registri giornalieri e gli archivi mensili vengono eliminati dal job dopo tre mesi. Il singolo riepilogo corrente resta disponibile fino a quando un conteggio successivo lo sostituisce; non contiene dati personali. Resta inoltre un documento tecnico minimo con la data iniziale di raccolta.

## Esecuzione senza piano a pagamento

Il calcolo usa GitHub Actions su runner standard del repository pubblico. Firebase resta sul piano Spark: non si usano Cloud Functions, Cloud Scheduler o Firestore TTL, che richiederebbero un piano a pagamento. Le letture e scritture Firestore restano soggette alle quote Spark; se una quota viene raggiunta, le operazioni possono essere rifiutate, ma non viene attivata la fatturazione.

Il workflow gira alle **19:05, 20:05, 21:05, 22:05 e 23:05 UTC**. Questi orari coprono le chiusure alle 21 e alle 23 nei quattro fusi supportati, tenendo conto dell'ora legale e solare. Per ogni centro prevalgono sempre il fuso e gli orari delle sue finestre. GitHub può ritardare un'esecuzione pianificata; il job è idempotente e riprova le ultime sette date non registrate. Offre anche `workflow_dispatch` per l'avvio manuale.

L'autenticazione usa GitHub OIDC e Workload Identity Federation con token a breve durata; non si salva una chiave privata di account di servizio.

## Attivazione una tantum

Il workflow è `.github/workflows/kitchen-monthly-summary.yml`. Servono queste variabili GitHub Actions a livello di repository:

| Variabile | Valore |
| --- | --- |
| `GCP_PROJECT_ID` | `tavola-comune` |
| `GCP_SERVICE_ACCOUNT` | email dell'account `kitchen-totals-worker` creato in Google Cloud |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | nome completo del provider OIDC GitHub creato in Google Cloud |

In Google Cloud va creato un workload identity pool/provider con issuer `https://token.actions.githubusercontent.com`, mappando `google.subject=assertion.sub` e `attribute.repository=assertion.repository`. La condizione del provider deve accettare soltanto `rasanfil-source/tavoliere` sul branch predefinito `main`. All'account di servizio va assegnato `roles/datastore.user` nel progetto Firestore; al principal GitHub del repository va assegnato `roles/iam.workloadIdentityUser` soltanto su quell'account.

Il workflow deve essere presente nel branch predefinito perché GitHub esegua la pianificazione. In un repository pubblico, GitHub può disattivare i workflow pianificati se il repository resta inattivo per 60 giorni: verificare periodicamente che il workflow non sia disabilitato. Le esecuzioni pubbliche standard di Actions non consumano minuti a pagamento.
