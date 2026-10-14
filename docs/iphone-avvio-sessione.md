# Avvio e persistenza su iPhone — 14 ottobre 2026

Segnalazione: circa 30 secondi per il primo accesso con sigla/password, circa
un minuto per il primo calendario, riaperture molto più rapide. Non è stata
misurata direttamente una sessione sul dispositivo dell'utente.

## Cause individuate

- Il primo login provava il percorso vice prima della password comune,
  creando una sessione pubblica e verificando fino a tre account tecnici.
  Ora il percorso comune viene tentato per primo; la password amministratori
  viene verificata solo dopo un rifiuto delle credenziali comuni. Un errore
  di rete non avvia altri tentativi di password.
- `getAuth()` inizializzava IndexedDB e il resolver Google, poi spostava la
  persistenza su localStorage. Su mobile il resolver può caricare un iframe
  Google all'avvio, anche per residenti che non usano Google. Ora
  `initializeAuth()` usa direttamente lo stesso localStorage persistente;
  il resolver viene passato soltanto alle operazioni popup. La seconda
  istanza, usata per verificare le password, nasce direttamente in memoria.
- WebKit ha un problema documentato che può trattenere risposte Firestore
  fino al ping successivo del server (circa 30 secondi). I tempi segnalati
  sono compatibili con questo problema, ma non lo dimostrano sul dispositivo.
  iPhone/iPad e Safari macOS usano ora long polling senza fetch streams;
  la stessa impostazione vale per il database dell'account tecnico.
- I cataloghi delle lingue e le letture facoltative per i promemoria non
  bloccano più l'accesso o la comparsa del calendario.
- Per una normale sessione residente viene letto solo il documento vice;
  gli altri due controlli del ruolo vengono effettuati solo se esiste.

## Persistenza

Firebase Auth conserva l'utente in localStorage con persistenza LOCAL,
senza scadenza applicativa dovuta a inattività, chiusura o sospensione.
Il token personale del dispositivo conserva la durata configurata di 9000
giorni. La sessione Firestore dura 30 giorni e viene ricostruita dal token
personale al ripristino, senza chiedere la password comune.

Gli errori temporanei di rete e di permesso durante il ripristino non
cancellano identità/token e non eseguono signOut. Un calendario non
disponibile dopo un login riuscito non revoca quel login. Firestore continua
a verificare i permessi: conservare le credenziali non concede accesso a
un centro revocato. Token scaduto, persona inattiva/inesistente o identità
incoerente richiedono ancora un nuovo accesso.

La persistenza dipende dall'archiviazione del browser: modalità privata,
cancellazione dei dati del sito o rimozione dei dati da parte del sistema
possono richiedere nuovamente l'accesso. Quando localStorage non è disponibile
Firebase mantiene soltanto la sessione in memoria. Nessuna password comune
viene salvata per effettuare automaticamente nuovi login.

## Verifica sul dispositivo

Validazione locale completata: 476 test, controlli sintattici, cataloghi i18n
e build minificata. Prova nel browser desktop contro i servizi Firebase:
calendario visibile senza errori JavaScript; dopo reload il modulo di accesso
resta nascosto. Nella riapertura misurata, ripristino residente 159 ms e
lettura della settimana 95 ms. Sono tempi del browser desktop, non dell'iPhone.
Pubblicazione completata il 14 ottobre dopo la riautenticazione della CLI
Firebase. Verificata la corrispondenza SHA-256 dei 16 file di rilascio su
https://tavola-comune.web.app, inclusi service worker, manifest e moduli di avvio.

1. Chiudere e riaprire la webapp per acquisire la nuova versione, mantenendo
   i dati del sito e la sessione esistente.
2. Verificare apertura dall'icona, ritorno dopo sospensione/blocco schermo e
   riapertura il giorno successivo senza nuovo modulo sigla/password.
3. Misurare separatamente primo login, primo calendario e riapertura.
4. Se resta un ritardo, aggiungere `diagnostics=startup` al link operativo
   (senza togliere gli altri parametri) e usare Safari Web Inspector.
   La console mostra `[tat-startup]` con nome della fase e millisecondi;
   `performance.getEntriesByType('measure').filter(e => e.name.startsWith('tat:'))`
   mostra le stesse durate. Le fasi includono ripristino Auth, impostazioni,
   login comune/vice, sessione, ruoli e letture del calendario.
5. Confrontare sulla stessa rete iPhone e Android e annotare versione iOS.

I tempi diagnostici sono facoltativi e locali alla pagina. Non vengono inviati
a servizi o conservati. I nomi sono fissi e non includono sigle, password,
token, URL o contenuto dei documenti.

## Fonti

- [Firebase: inizializzazione personalizzata e iframe su mobile](https://firebase.google.com/docs/auth/web/custom-dependencies)
- [Firebase: persistenza Auth](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Firebase SDK: problema WebKit, tempi di 30 s e workaround](https://github.com/firebase/firebase-js-sdk/issues/9789)
- [WebKit: regressione delle risposte fetch streaming](https://bugs.webkit.org/show_bug.cgi?id=322545)
