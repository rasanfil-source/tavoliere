# Salvataggi del singolo pasto in attesa

Il modulo `core/pending-meals.mjs` viene caricato solo quando si salva un pasto. Non esegue inizializzazioni all'import e non accede a traduzioni, autenticazione, rete o storage. La verifica della build esclude questo modulo dai file iniziali e dai preload del residente.

Dopo 12 secondi senza risposta, lo stato segnala che manca la conferma. Il tempo trascorso non annulla la richiesta e non avvia una seconda scrittura. La selezione coinvolta resta disabilitata; le nuove letture possono mostrare altri giorni conservando l'effetto del singolo pasto in attesa. I batch mantengono il blocco precedente.

La risposta finale aggiorna anche gli oggetti del calendario ricreati nel frattempo. Un errore ripristina la selezione precedente e programma la rilettura. Cambio utente, centro o identità residente impediscono a una vecchia risposta di modificare la nuova sessione. Il ritorno da background controlla il tempo trascorso senza affidarsi alla puntualità dei timer mobili.

Eseguire `node --test tests/firebase-spark/pending-meals.test.mjs`, oppure `npm test`. Le prove comprendono risposta tardiva positiva e negativa, cambio vista, cambio identità, doppia richiesta, timer sospesi e metadati Firestore: solo le scritture locali esplicitamente tracciate sono ammesse accanto a una lettura dal server e non vengono marcate come confermate.

Il registro `core/pending-meal-journal.mjs` conserva un record per richiesta prima dell'invio, associato a UID, centro e partecipante. Contiene soltanto identificativo stabile, destinazione del pasto, scelta e orario: password, token e profili non vengono serializzati. Lo stesso identificativo è scritto in Firestore e mantenuto nei tentativi e nella riconciliazione transazionale già esistenti.

Alla riapertura e al ritorno della connessione, il recupero parte senza attendere nell'avvio del calendario e soltanto se esistono record per l'identità corrente. Carica i moduli su richiesta, blocca le sole selezioni coinvolte e legge dal server. Soltanto un documento confermato dal server, privo di scritture locali pendenti, con identificativo, identità, destinazione ed effetto corrispondenti conferma il salvataggio. Un documento assente, una scelta uguale con identificativo diverso, un errore di rete o un timeout di lettura lasciano l'esito da verificare. Il recupero non scrive in Firestore e non reinvia operazioni.

Un rifiuto definitivo della scrittura o un errore prima dell'invio rimuovono il record; un rifiuto dopo un tentativo dall'esito incerto non basta a escludere un precedente successo. Dopo la conferma, il calendario viene riletto, senza riproporre una vecchia selezione sopra eventuali modifiche più recenti. Se una successiva modifica ha già sostituito l'identificativo nel documento, questa prima fase non può ricostruire la storia: il record rimane da verificare. Non viene sbloccato automaticamente dopo un intervallo arbitrario.

La memoria locale può essere negata o cancellata dal browser: in quel caso il salvataggio continua con un avviso di mantenere aperta la pagina; il recupero dopo la chiusura non è garantito. Il recupero non modifica la persistenza Firebase Auth. Le prove automatiche sui timer simulano la sospensione mobile e quelle browser verificano il registro attraverso la riapertura su Chromium e WebKit; non sostituiscono prove su telefoni fisici.

Test aggiuntivi: `node --test tests/firebase-spark/pending-meal-journal.test.mjs`. La suite browser delle traduzioni include le nuove etichette nelle sei lingue e la persistenza del registro.
