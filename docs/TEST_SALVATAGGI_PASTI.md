# Salvataggi del singolo pasto in attesa

Il modulo `core/pending-meals.mjs` viene caricato solo quando si salva un pasto. Non esegue inizializzazioni all'import e non accede a traduzioni, autenticazione, rete o storage. La verifica della build esclude questo modulo dai file iniziali e dai preload del residente.

Dopo 12 secondi senza risposta, lo stato segnala che manca la conferma. Il tempo trascorso non annulla la richiesta e non avvia una seconda scrittura. La selezione coinvolta resta disabilitata; le nuove letture possono mostrare altri giorni conservando l'effetto del singolo pasto in attesa. I batch mantengono il blocco precedente.

La risposta finale aggiorna anche gli oggetti del calendario ricreati nel frattempo. Un errore ripristina la selezione precedente e programma la rilettura. Cambio utente, centro o identità residente impediscono a una vecchia risposta di modificare la nuova sessione. Il ritorno da background controlla il tempo trascorso senza affidarsi alla puntualità dei timer mobili.

Eseguire `node --test tests/firebase-spark/pending-meals.test.mjs`, oppure `npm test`. Le prove comprendono risposta tardiva positiva e negativa, cambio vista, cambio identità, doppia richiesta, timer sospesi e metadati Firestore: solo le scritture locali esplicitamente tracciate sono ammesse accanto a una lettura dal server e non vengono marcate come confermate.

Questa fase copre la pagina aperta e il ritorno dal background. Non introduce un registro persistente né reinvia operazioni dopo la chiusura della pagina. Non modifica la persistenza Firebase Auth. Le prove automatiche sui timer simulano la sospensione su Android e iPhone; non sostituiscono una verifica su dispositivi fisici.
