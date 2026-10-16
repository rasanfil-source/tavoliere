# Accesso cucina e credenziali condivise

La configurazione può conservare `commonPassword` in chiaro nel documento del centro. Le regole consentono alle sessioni operative di leggere l'intero documento e a un'identità Firebase anonima di creare una sessione `KITCHEN` conoscendo l'identificativo di un centro attivo. Questo percorso non richiede il token del collegamento cucina; la verifica della sessione non dipende dal token.

Ne consegue che la password condivisa dei residenti può essere letta attraverso tale percorso. La password amministrativa non è coinvolta. La rigenerazione del collegamento cucina non revoca questa possibilità di accesso. Si tratta di un limite di sicurezza del modello corrente, da considerare nella distribuzione delle credenziali e nella valutazione del perimetro operativo.

La verifica con SDK reale ed emulatore usa dati sintetici: un'identità senza membership e senza collegamento cucina può creare la sessione e leggere la password comune sintetica. Questa verifica non utilizza credenziali reali né costituisce una misurazione dell'esposizione dei centri di produzione.

I punti tecnici interessati sono `saveCenterWithoutCalendarRewrite` e `completeConfiguration` in [calendar-configuration.js](../prototypes/firebase-spark-pwa/public/calendar-configuration.js), le regole di `centers/{centerId}` e `accessSessions/{authUid}` in [firestore.rules](../prototypes/firebase-spark-pwa/firestore.rules), e `createKitchenSession` in [kitchen-data.js](../prototypes/firebase-spark-pwa/public/kitchen-data.js).

La separazione della credenziale dai documenti operativi e una verifica indipendente dell'autorizzazione cucina sono requisiti per restringere questo perimetro. La documentazione del limite non equivale alla sua eliminazione.
