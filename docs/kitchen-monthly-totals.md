# Riepilogo mensile della cucina

## Regole di conteggio

La raccolta inizia il **1° novembre 2026**. Ogni giornata viene registrata quando chiude la contabilità locale: alle **23:00** nei giorni normali, alle **21:00** nell'ultimo giorno del mese. Prima di salvare il job controlla anche gli orari effettivi `closesAt` dei tre pasti: se una prenotazione resta modificabile oltre la chiusura contabile, attende il controllo successivo per non registrare valori provvisori.

La colazione è attribuita alla data del pasto. Quella del 1° novembre, anche se prenotata il 31 ottobre, rientra quindi nei conteggi del **1° novembre**.

Ogni registro giornaliero contiene soltanto il centro, la data, i totali di colazione, pranzo e cena, il conteggio separato dei pasti degli ospiti/invitati, l'ora di registrazione e la scadenza. Il totale dei pasti comprende anche gli invitati; la riga separata di Media cucina li evidenzia senza aggiungerli una seconda volta. Chi è segnalato come ammalato resta escluso dal totale. Non vengono copiati nomi, identificativi, prenotazioni o dati sanitari.

Il riepilogo mensile viene prodotto solo se esiste un registro per tutti i giorni del mese. La prima mensilità completa sarà novembre, se il job è attivo per l'intero periodo. “Media cucina” mostra la somma del mese concluso a partire dalle 21:00 locali dell'ultimo giorno. Rimane il riepilogo corrente fino alla disponibilità del conteggio successivo; se un mese non è completo, continua a mostrare l'ultimo conteggio riuscito.

La casella “Media cucina” è visibile in Cucina fin da subito, anche prima del primo riepilogo previsto dopo la chiusura di novembre. I dati restano inattivi all'apertura della vista: la PWA carica il modulo e legge i conteggi solo quando la casella viene aperta. Le frecce permettono di consultare i riepiloghi mensili degli ultimi due anni con letture puntuali. Residenti e amministratori non caricano i conteggi aprendo le proprie viste.

I registri giornalieri vengono eliminati dal job dopo tre mesi; gli archivi mensili e il riepilogo corrente vengono eliminati dopo due anni. La sessione Cucina e gli amministratori possono leggere soltanto i singoli riepiloghi mensili; non possono elencare o modificare l'archivio. I totali non contengono dati personali. Resta inoltre un documento tecnico minimo con la data iniziale di raccolta.

## Esecuzione senza piano a pagamento

Il calcolo usa GitHub Actions su runner standard del repository pubblico. Firebase resta sul piano Spark: non si usano Cloud Functions, Cloud Scheduler o Firestore TTL, che richiederebbero un piano a pagamento. Le letture e scritture Firestore restano soggette alle quote Spark; se una quota viene raggiunta, le operazioni possono essere rifiutate, ma non viene attivata la fatturazione.

Il workflow gira alle **19:05, 20:05, 21:05, 22:05 e 23:05 UTC**. Questi orari coprono le chiusure alle 21 e alle 23 nei quattro fusi supportati, tenendo conto dell'ora legale e solare. Per ogni centro prevalgono sempre il fuso e gli orari delle sue finestre. Il conteggio dei pasti viene eseguito soltanto per i documenti `centers` con `status: ACTIVE`; quelli `DELETED` non ricevono registri o riepiloghi. L'output separa il numero di documenti trovati, i centri attivi e i documenti eliminati; la pulizia degli aggregati scaduti considera anche i documenti storici. GitHub può ritardare un'esecuzione pianificata; il job è idempotente e riprova le ultime sette date non registrate. Offre anche `workflow_dispatch` per l'avvio manuale.

L'autenticazione usa GitHub OIDC e Workload Identity Federation con token a breve durata; non si salva una chiave privata di account di servizio.

## Attivazione una tantum

Il workflow è `.github/workflows/kitchen-monthly-summary.yml`. Servono queste variabili GitHub Actions a livello di repository:

| Variabile | Valore |
| --- | --- |
| `GCP_PROJECT_ID` | `tavola-comune` |
| `GCP_SERVICE_ACCOUNT` | `kitchen-totals-worker@tavola-comune.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/116770230630/locations/global/workloadIdentityPools/tavoliere-github/providers/github-actions` |

L'attivazione per `tavola-comune` è completata il **30 ottobre 2026**. Il pool `tavoliere-github` accetta token dell'issuer `https://token.actions.githubusercontent.com`; il provider mappa `google.subject=assertion.sub`, `attribute.repository=assertion.repository` e `attribute.ref=assertion.ref`, con la condizione `assertion.repository == 'rasanfil-source/tavoliere' && assertion.ref == 'refs/heads/main'`. Il service account riceve `roles/datastore.user` sul progetto Firestore. Il principal del repository riceve `roles/iam.workloadIdentityUser` soltanto su questo service account. Non è stata creata una chiave privata e Cloud Billing non è attivo né collegato.

Per replicare il setup, creare un workload identity pool/provider con gli stessi mapping e la stessa condizione, assegnare soltanto i due ruoli descritti e impostare le tre variabili di repository qui sopra. Il workflow deve essere presente nel branch predefinito perché GitHub esegua la pianificazione. In un repository pubblico, GitHub può disattivare i workflow pianificati se il repository resta inattivo per 60 giorni: verificare periodicamente che il workflow non sia disabilitato. Le esecuzioni pubbliche standard di Actions non consumano minuti a pagamento.
