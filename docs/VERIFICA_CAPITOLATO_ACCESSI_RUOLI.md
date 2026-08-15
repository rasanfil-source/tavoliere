# Verifica del capitolato accessi, ruoli e amministrazione

Verifica eseguita sul progetto operativo `C:\Users\romolo\TAT` il 9 agosto 2026.

## Livelli di accesso

- **Proprietario della piattaforma**: riconosciuto tramite l'UID Firebase dell'account Google del proprietario. Può generare inviti casuali monouso per i nuovi centri e consultare il registro complessivo dei centri.
- **Amministratore del centro**: viene accreditato esclusivamente mediante invito del proprietario. Può usare Google oppure email e password verificata.
- **Vice amministratore**: viene scelto tra i residenti, fino a un massimo di due. Riceve un invito casuale monouso e può autenticarsi con Google oppure email e password verificata. Il ruolo comprende sempre la gestione quotidiana di cucina, ammalati e diete; l'autorizzazione alle celebrazioni liturgiche resta facoltativa.
- **Utente ordinario**: usa le funzioni di prenotazione e non può modificare dati amministrativi.

## Inviti e autenticazione

- Gli inviti sono codici casuali di 64 caratteri esadecimali, validi 30 giorni e consumabili una sola volta.
- La conoscenza dell'indirizzo generale non permette di creare un centro o attribuirsi un ruolo.
- Il nuovo amministratore può scegliere Google oppure email e password.
- Per gli account password Firebase invia l'email di verifica; finché l'indirizzo non è confermato l'accesso amministrativo e il consumo dell'invito sono impediti anche dalle regole Firestore.
- L'associazione permanente `account -> ruolo -> centro` è registrata nel profilo amministrativo e nel documento del centro.

## Centro e persone

- Ogni query operativa usa `centers/{centerId}/...`.
- Amministratore e vice possono aggiungere, modificare, sospendere ed eliminare persone, gestire sigle, gruppi, telefoni, ospiti e diete.
- Gli ospiti predefiniti da 1 a 4 e quelli con numero personalizzato sono disponibili nel pannello.
- Il ruolo di vice può essere attribuito o revocato soltanto da proprietario/amministratore del centro.
- La revoca disabilita anche l'accesso amministrativo collegato alla persona.
- Il vice non può creare, modificare o eliminare documenti di ruolo né modificare la qualifica di vice nelle anagrafiche.

## Informazioni quotidiane

- **Ammalati**: amministratore e vice selezionano residenti e ospiti per oggi o domani. L'elenco compare automaticamente in Cucina e Oggi a tavola.
- **Messa**: gestita dalla vista settimanale dall'amministratore, dal responsabile delle celebrazioni liturgiche e dai vice ai quali l'amministratore concede questa autorizzazione facoltativa.
- **Note cucina**: modificabili da amministratore e vice per oggi o domani e visibili esclusivamente nella vista Cucina.
- **Presenze, ospiti e diete**: continuano a derivare dallo stesso stato effettivo delle prenotazioni; amministratore e vice possono gestire anche le eccezioni quotidiane previste dall'interfaccia operativa.

## Separazione dei centri

- Un amministratore o vice può operare solo sul centro associato al proprio account.
- La modifica manuale del parametro `c` non concede accesso a un altro centro.
- Gli utenti ordinari non possono scrivere anagrafiche, diete, ammalati, Messe, note o ruoli.
- Il proprietario della piattaforma dispone della lettura del registro generale dei centri, senza trasformare gli amministratori locali in amministratori globali.

## Verifiche automatiche

- Gate pre-deploy: 107 test superati.
- Regole Firestore su emulatore: 42 test superati.
- Sono coperti esplicitamente: email non verificata, invito centro, invito vice, separazione dei centri, divieto di nomina ruoli da parte del vice, gestione quotidiana sempre disponibile ai vice, autorizzazione liturgica facoltativa ed eliminazione atomica delle persone.
