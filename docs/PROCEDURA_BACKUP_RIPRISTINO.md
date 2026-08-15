# Procedura di backup e ripristino

## Scopo

Il backup applicativo conserva i dati operativi di un solo centro senza includere credenziali, sessioni attive o collegamenti riservati. Il ripristino deve sempre riferirsi allo stesso `centerId` e non puo modificare il Responsabile del centro.

## Esportazione

1. Accedere come Responsabile o Amministratore.
2. Aprire il pannello di amministrazione.
3. Selezionare `Esporta dati`.
4. Conservare il file JSON fuori dal dispositivo usato per l'amministrazione.
5. Annotare data, centro e versione dell'applicazione distribuita.

L'esportazione contiene documento centro, persone, profili pubblici, regole, finestre, prenotazioni, operazioni quotidiane, note, icona e registro essenziale. Non contiene amministratori, sessioni, token personali o collegamenti operativi.

## Verifica preventiva

La verifica non scrive dati. Da PowerShell 7, nella cartella `C:\Users\romolo\TAT`:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:inspect -- 'C:\percorso\backup.json' center_id_atteso"
```

Il rapporto controlla:

- versione del formato;
- identita del centro;
- raccolte ammesse;
- conteggi dichiarati ed effettivi;
- identificativi mancanti o duplicati;
- riferimenti tra persone, profili pubblici e regole.

Un rapporto con errori interrompe la procedura. Gli avvisi devono essere esaminati prima di qualsiasi scrittura.

## Ripristino controllato

Il ripristino completo non viene eseguito dal pannello ordinario. Deve essere svolto dal Responsabile della piattaforma con questi vincoli:

1. validare il file con `backup:inspect`;
2. provare l'importazione su un progetto Emulator dedicato;
3. confrontare conteggi e campioni di persone, regole e prenotazioni;
4. produrre una nuova esportazione del centro di destinazione;
5. bloccare temporaneamente le modifiche operative;
6. importare soltanto nel `centerId` dichiarato dal file;
7. non sovrascrivere `ownerUid`, amministratori, sessioni o collegamenti;
8. riaprire l'app e verificare mese, settimana, riepilogo e cucina;
9. riabilitare le modifiche soltanto dopo il controllo.

Il comando seguente costruisce il piano di ripristino e non scrive nulla:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:restore-emulator -- 'C:\percorso\backup.json' center_id_atteso"
```

Con Firestore Emulator gia avviato, l'opzione `--apply-emulator` applica il piano soltanto all'Emulator:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'; npm run backup:restore-emulator -- 'C:\percorso\backup.json' center_id_atteso --apply-emulator"
```

L'importatore preserva `ownerUid`, amministratori, sessioni e collegamenti di accesso. Le raccolte operative vengono ripristinate a lotti di 400 documenti. Non viene distribuito un comando di importazione diretto sul progetto di produzione finche la procedura non e stata provata con un backup reale anonimizzato e confrontata con il centro di origine.

## Ripristino della sola applicazione

Se i dati sono corretti e il problema riguarda soltanto l'interfaccia:

1. ridistribuire l'ultima build Hosting verificata;
2. non modificare Firestore;
3. incrementare la versione della cache del service worker;
4. verificare il caricamento aggiornato su un dispositivo gia installato.

## Criteri di accettazione dell'importatore di produzione

- anteprima obbligatoria e priva di scritture;
- controllo del `centerId` non aggirabile;
- lotti atomici entro i limiti Firestore;
- avanzamento riprendibile;
- nessuna cancellazione implicita;
- registro dell'operazione senza dati sanitari dettagliati;
- rapporto finale con documenti applicati, ignorati e non riusciti;
- test Emulator di interruzione e ripresa.
