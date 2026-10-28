# Accesso semplice e sessioni persistenti

L'applicazione è pensata per una comunità amicale. Semplicità, rapidità e continuità dell'accesso guidano l'esperienza; i ruoli e le regole Firestore definiscono separatamente le autorizzazioni.

## Cucina

Chi riceve il collegamento Cucina può aprire direttamente il riepilogo del centro, anche da un nuovo dispositivo. Non sono richiesti account, Google, sigla, password, verifica email, codici o approvazione dell'amministratore. Il collegamento è trasferibile e consente la sola consultazione: non attribuisce permessi di modifica delle prenotazioni o di amministrazione.

Le identità anonime e le sessioni Firebase possono essere create automaticamente come dettaglio tecnico, senza richiedere azioni alla persona o rallentare l'apertura. Il modello non associa il collegamento a un destinatario, dispositivo o account personale.

## Residenti e vice

L'accesso ordinario usa il collegamento del centro, la sigla personale o della stanza e la password prevista per la persona. La password amministratori abilita le funzioni del vice secondo i permessi assegnati, senza attribuire il ruolo OWNER. Gli accessi amministrativi con identità Firebase forte restano un percorso distinto e non sono necessari per l'uso ordinario.

## Sessioni e continuità

- La sessione viene conservata sul dispositivo tra aggiornamenti della pagina, chiusura e riapertura del browser o della PWA e navigazione nell'app.
- Gli errori temporanei di rete non cancellano credenziali, sessioni o preferenze.
- L'uscita esplicita e le revoche deliberate terminano l'accesso secondo i rispettivi permessi.
- L'apertura non introduce passaggi manuali, attese artificiali o letture seriali non necessarie.
- Le misure di rapidità confrontano apertura e riapertura nelle stesse condizioni per Cucina, residenti e vice.

## Password comune

La verifica della password comune usa Firebase Authentication. Il salvataggio della configurazione registra il valore in `privateSettings/sharedCredentials`, con accesso limitato ai ruoli autorizzati. Per un centro già configurato, la migrazione avviene al successivo salvataggio; non invalida sessioni e non richiede credenziali alla Cucina.

## Comportamenti attesi

| Scenario | Risultato |
| --- | --- |
| Collegamento Cucina aperto senza sessione | Riepilogo disponibile senza credenziali o conferme |
| Collegamento Cucina condiviso | Consultazione diretta dello stesso riepilogo |
| Accesso ordinario di un residente | Collegamento, sigla e password prevista |
| Accesso ordinario di un vice | Collegamento, sigla e password amministratori |
| Aggiornamento e riapertura della PWA | Sessione valida conservata o ripristinata automaticamente |
| Errore temporaneo di rete | Credenziali non cancellate automaticamente |
| Separazione della password dai dati operativi | Consultazione Cucina e sessioni ordinarie restano disponibili |
| Apertura e riapertura nelle stesse condizioni | Percorso rapido e diretto |

Le verifiche usano dati sintetici e comprendono i flussi applicativi e le regole Firestore nell'emulatore.
