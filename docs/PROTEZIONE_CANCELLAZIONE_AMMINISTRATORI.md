# Protezione della cancellazione delle Persone amministratrici

La procedura applicativa verifica il collegamento prima della conferma e lo ricontrolla nella transazione che precede la sospensione. Il responsabile è riconosciuto anche tramite configurazione del centro; una membership ACTIVE con ruolo OWNER o ADMIN impedisce la cancellazione. La revoca di un account non viene eseguita implicitamente.

I messaggi sono tradotti in italiano, inglese, spagnolo, francese, tedesco e catalano. Il responsabile riceve l'indicazione di trasferire la responsabilità o revocare il ruolo; gli altri operatori vengono indirizzati al responsabile.

L'indice administratorDeletionProtection contiene esclusivamente participantId, role, status e updatedAt. I vice possono leggerlo ma non modificarlo e non acquisiscono accesso alle email degli account. Nomina, collegamento, revoca e successione aggiornano l'indice insieme alla membership. La transazione di cancellazione legge prima participantMetadata/administratorProtection: una modifica concorrente dell'indice determina un nuovo tentativo.

Per i centri preesistenti, tools/initialize-administrator-deletion-protection.mjs --project=tavola-comune esegue una verifica senza scritture; --apply inizializza solo l'indice e il marcatore ready. Account, Persone e prenotazioni restano invariati. Anche un amministratore che apre il pannello può inizializzare un indice assente. In mancanza di verifica pronta, la cancellazione applicativa viene fermata.

Questa è una protezione del flusso applicativo: non sostituisce le autorizzazioni generali Firestore alla cancellazione e non impedisce a un client modificato o a un vecchio client di usare tali autorizzazioni. Dopo il rilascio occorre chiudere tutte le schede dell'app e riaprirla. Le regole aggiunte proteggono la lettura e la scrittura dell'indice, verificando la corrispondenza con la membership.
