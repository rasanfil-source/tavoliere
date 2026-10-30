# Prova locale di Prenoto per altri

Requisito confermato: le selezioni effettuate per altri sono prenotazioni ordinarie della persona destinataria. Riepilogo e cucina devono mostrare gli stessi nomi, gruppi, diete e conteggi delle selezioni personali, senza categorie o etichette separate e senza aggiungerle agli invitati occasionali. Fonte e autore restano metadati tecnici per autorizzazione e tracciabilità.

Avvio dal progetto con PowerShell 7:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node prototypes/firebase-spark-pwa/dev-server.mjs 4174"
```

Aprire http://127.0.0.1:4174/__local/booking.

La pagina usa lo stesso componente della sezione Prenoto per altri nell’Agenda, con persone fittizie e salvataggi nel localStorage del browser. Carica il catalogo italiano delle traduzioni. Non importa Firebase e non modifica dati reali. È servita solo dal server di sviluppo e non viene copiata nella build pubblicata.

1. Lasciare il ruolo Amministratore o scegliere Vice.
2. Selezionare Mario Rossi (residente) oppure Lucia Bianchi (ospite).
3. Aprire le prenotazioni e cambiare lo stato di un pasto.
4. Premere “Abbandona Nome e rientra nella tua vista”. L’identità visibile deve restare Anna Amministratrice.
5. Riaprire la stessa persona e controllare che la modifica sia rimasta; scegliere l’altra persona e verificare che abbia prenotazioni separate.
6. Ricaricare la pagina: i dati della prova persistono, mentre la vista per altri è chiusa.
7. Il selettore del ruolo comprende soltanto Amministratore e Vice: i residenti ordinari non accedono all’agenda centro. Residenti e ospiti sono invece i destinatari selezionabili delle prenotazioni.

La prova visuale usa dati simulati e non certifica i permessi del server né i conteggi effettivi della cucina. I test dell’emulatore verificano separatamente le regole Firestore.

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm test"
pwsh.exe -NoLogo -NoProfile -Command "node tools/check-booking-rules.mjs"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
```

Nell’app reale la sezione è disponibile in cima all’Agenda di chi può gestire le operazioni giornaliere, delimitata da un bordo sottile. Offre un calendario settimanale indipendente e salvataggio per singolo pasto. Non cambia account, sigla, token, calendario personale o promemoria dell’operatore. Le scritture per altri registrano `source: DELEGATED` e l’UID dell’operatore, controllato dalle regole. Sono mantenuti i limiti dei pasti e delle regole di soggiorno. I testi, gli stati delle prenotazioni e le date seguono la lingua dell’app: italiano, inglese, francese, spagnolo, tedesco o catalano.

La pagina ordinaria del server di sviluppo continua a usare la configurazione Firebase reale: per questa prova senza dati reali usare esclusivamente il percorso `/__local/booking`. Questa pagina di prova resta esclusa dalla pubblicazione dell’app.

La verifica automatica controlla la prenotazione per il destinatario, il ritorno senza cambio identità, la chiusura dopo revoca, la gestione degli errori e la visualizzazione dei testi e delle date nelle sei lingue. La validazione dei cataloghi controlla parità delle chiavi e dei segnaposto. I permessi del server sono verificati dalla suite Firestore. Il controllo visivo automatico non è stato eseguito perché l’accesso al browser locale è disabilitato nelle impostazioni.
