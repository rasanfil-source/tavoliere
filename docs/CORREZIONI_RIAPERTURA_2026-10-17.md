# Correzioni riapertura del calendario — 17 ottobre 2026

Il ripristino della persona può applicare preferenze che spostano le date della settimana. La richiesta avviata con le date precedenti veniva scartata, lasciando il calendario in caricamento. Ora la richiesta segue le date aggiornate; un cambio tardivo delle date avvia un nuovo caricamento soltanto se nessuna richiesta più recente ha preso il controllo.

All'avvio della PWA installata, la vista personale salvata viene applicata dopo il ripristino della persona, anche quando l'indirizzo di avvio indica la vista mensile. Le ricariche e la navigazione nella cronologia conservano invece la vista corrente.

Verifiche: 556 test applicativi e milestone superati; 10 test di build superati. Prova browser con dati sintetici e modalità standalone simulata, in formato desktop e mobile: apertura e riapertura sulla settimana salvata, calendario visibile senza aggiornamento manuale, nessun errore JavaScript. Non si tratta di una prova sui dispositivi fisici dell'utente.

Release preparata: `442349aa44db9e34`. La modifica riguarda Firebase Hosting; nessuna modifica alle regole Firestore.
