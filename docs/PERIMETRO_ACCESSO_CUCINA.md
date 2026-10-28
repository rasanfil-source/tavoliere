# Accesso cucina e credenziali condivise

## Accesso al riepilogo

Il riepilogo Cucina è consultabile da chiunque possieda il collegamento, senza account, password, Google o conferme. Le sessioni tecniche anonime possono essere create automaticamente, senza interazione della persona. Questa modalità è descritta nelle [caratteristiche di accesso](SCELTE_ACCESSO_E_SEMPLICITA.md) e consente la sola consultazione.

## Stato tecnico ed esposizione della password

La password comune è conservata in `privateSettings/sharedCredentials`, un documento leggibile dai soli ruoli amministrativi autorizzati. I centri configurati in precedenza vengono portati a questo schema al successivo salvataggio delle impostazioni. La sessione Cucina continua a funzionare tramite il collegamento.

Le regole consentono alle sessioni operative di leggere il documento del centro e a un'identità Firebase anonima di creare una sessione `KITCHEN` conoscendo l'identificativo di un centro attivo. Il collegamento Cucina apre la sessione senza richiedere credenziali.

La lettura della configurazione gestisce il campo della password in modo da non esporlo alle sessioni operative. Il salvataggio lo conserva nel documento privato e lo rimuove dal documento del centro. La password amministrativa usa una credenziale tecnica distinta.

La verifica con SDK ed emulatore usa dati sintetici e controlla i permessi di lettura e scrittura senza utilizzare credenziali reali.

I punti tecnici interessati sono `saveCenterWithoutCalendarRewrite` e `completeConfiguration` in [calendar-configuration.js](../prototypes/firebase-spark-pwa/public/calendar-configuration.js), le regole di `centers/{centerId}` e `accessSessions/{authUid}` in [firestore.rules](../prototypes/firebase-spark-pwa/firestore.rules), e `createKitchenSession` in [kitchen-data.js](../prototypes/firebase-spark-pwa/public/kitchen-data.js).

La separazione della credenziale mantiene l'accesso Cucina immediato, le sessioni persistenti e il percorso ordinario con sigla e password condivisa, senza introdurre autenticazione personale o conferme per la Cucina.
