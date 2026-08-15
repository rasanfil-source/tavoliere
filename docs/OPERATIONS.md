# Tavola Comune: istruzioni operative

## Accesso residente

- Sintomo: compare il modulo di accesso. Controllare sigla e password comune, quindi riprovare.
- Sintomo: la sigla non viene riconosciuta. L'amministratore deve verificare che il campo `signature` sia valorizzato e che lo stato del partecipante sia `ACTIVE`.
- Sintomo: l'accesso salvato non viene ripristinato. Controllare che il browser non abbia cancellato i dati del sito e usare nuovamente sigla e password.
- Per cambiare persona o cancellare l'accesso locale usare `Esci`.
- La password comune non viene salvata nel browser.

## Prenotazioni e rete

- Una modifica diventa definitiva soltanto dopo la conferma del server.
- In assenza di rete la modifica viene rifiutata e non viene accodata in modo invisibile.
- Se il dato è stato modificato da un altro dispositivo, aggiornare la schermata e ripetere consapevolmente l'operazione.
- I comandi mese, settimana e singolo pasto rispettano le finestre di chiusura definite per il pasto.

## Revoca

- Nell'elenco `Persone` togliere la spunta `Attiva` per sospendere la persona.
- La revoca aggiorna insieme i documenti privati e la proiezione pubblica.
- La sospensione disabilita la regola ricorrente e cancella token e sessioni personali della persona.
- Le Security Rules controllano nuovamente lo stato della persona e del token al momento di ogni richiesta.
- Per revocare un amministratore, il responsabile usa `Cambio gestore > Amministratori attivi > Revoca accesso`.
- Per annullare un invito non ancora accettato, usare `Cambio gestore > Inviti recenti > Revoca`.

### Telefono smarrito o dispositivo non più disponibile

- Il modello gratuito non identifica separatamente i diversi dispositivi della stessa persona.
- Per bloccare subito un telefono smarrito, sospendere temporaneamente la persona dall'elenco `Persone`.
- La sospensione blocca tutti i suoi dispositivi. Dopo aver verificato la situazione, riattivare la persona: dovrà accedere nuovamente con sigla e password comune.
- Non cambiare la password comune salvo compromissione generale, perché il cambio coinvolge tutti i residenti.

## Disattivazione centro

- `Disattiva centro` rende immediatamente inutilizzabili amministrazione, collegamenti e sessioni perché le regole richiedono un centro `ACTIVE`.
- I dati restano conservati in Firestore per un eventuale recupero amministrativo: l'azione non è presentata come cancellazione definitiva.

## Export e recupero

- L'amministratore può usare `Esporta dati` per scaricare un JSON con schema, project ID, data e conteggi.
- Conservare l'esportazione fuori dal browser e non condividerla pubblicamente.
- Prima di introdurre un ripristino, validare schema, duplicati e anteprima sull'emulatore.
- Non sono attivi backup automatici, TTL, scheduler o Cloud Functions.

## Deploy e rollback

- Eseguire `npm run predeploy:gate`.
- Controllare account Firebase e project ID `tavola-comune`.
- Pubblicare con `npm run deploy:firebase`.
- Verificare calendario, riepilogo e cucina nel browser.
- In caso di errore Hosting, ripristinare la versione precedente dalla cronologia Hosting e ripetere lo smoke test.
- Le modifiche già scritte su Firestore non vengono annullate da un rollback Hosting.

## Quote

- Controllare letture, scritture, eliminazioni, spazio e traffico con frequenza settimanale nella fase iniziale.
- Prestare attenzione al 60%, 80% e 90% della quota prevista.
- In caso di anomalia, ridurre refresh e letture prima di aggiungere servizi esterni.

## Continuita' calendario

- Il pannello amministratore mostra l'ultimo giorno per cui esistono finestre pasto.
- Sotto 45 giorni residui l'indicazione diventa un avviso `da estendere`.
- `Prepara / estendi centro` aggiunge le finestre mancanti fino al quinquennio approvato, in blocchi da 400; non modifica finestre già esistenti.
- I collegamenti del prototipo sono validi fino al 31 dicembre 2031. Dopo il deploy, il proprietario deve eseguire una volta `Prepara / estendi centro` per aggiornare il centro gia' esistente.
