# TAT · Prova bordo 1

Prova installabile separata per eliminare la cornice bianca dell'icona Android. Il simbolo riprende l'icona attuale, senza adottare i bozzetti A/B e senza aggiungere un selettore di icone.

## Evidenze e differenza rispetto ai tentativi precedenti

- Il 5 novembre 2026 il file pubblico `https://tavola-comune.web.app/icons/launcher-512-maskable.png?v=20260822a` ha risposto HTTP 200 con SHA-256 `977771f4c888250b8e5228eb4d3d193f9a480697e713e634cfa40ab860c82427`, identico al file locale: il fondo bianco è incorporato nell'asset pubblicato.
- La cronologia mostra una prova `icon-preview-v2` modificata più volte il 4 novembre e rimossa nel commit `309c01a`. Selezionava un manifest tramite JavaScript dentro l'app principale; condivideva origine e worker. Questi aspetti aumentavano le variabili da controllare, ma non dimostrano da soli la causa degli insuccessi sui dispositivi.
- Recuperato per ispezione il vecchio asset `launcher-rounded-green-maskable-192.png` dal commit `7263e36`: il controllo completo ha trovato 764 pixel non opachi. Un controllo dei soli nomi o di `purpose: maskable` non rilevava il difetto. Non è dimostrato che questo fosse l'unico motivo del bordo osservato.
- R1 usa un'origine di anteprima separata, un manifest statico presente direttamente nell'HTML, `id` e `start_url` espliciti e una nuova identità di installazione. Non dipende da centro, login, cookie o modifiche del manifest effettuate da un altro worker.

## Asset

`master-current-green-r1.png` è una revisione con imagegen dell'asset storico, mantenendo il soggetto e l'effetto lucido riconoscibili, su fondo verde esteso. Non è una copia identica pixel per pixel del vecchio marchio. Il prompt integrale è in `prompt.json`.

`export-icons.ps1` ricava i PNG 192 e 512 su destinazione RGB opaca; il ridimensionamento usa `TileFlipXY` per evitare frange trasparenti lungo l'ultima riga/colonna. Il master non viene caricato dalla pagina o incluso nel pacchetto Hosting.

In questa prova sia le varianti `any` sia quelle `maskable`, la favicon e il collegamento Apple puntano ai file verdi opachi. È una scelta diagnostica intenzionale: nessuna via di ripiego deve recuperare il vecchio disco su sfondo bianco/trasparente. Le forme arrotondata e circolare sulla pagina sono soltanto simulazioni CSS.

## Controlli

`checks.json` documenta dimensioni, byte, hash, opacità su tutti i pixel, colore verde nell'intera fascia esterna dell'8% e area occupata dai pixel bianchi neutri. Per distinguere il simbolo dai riflessi verdi, il rilevamento richiede RGB > 205 e differenza massima fra canali < 15. Questa soglia è un controllo di regressione affiancato all'ispezione visiva, non una segmentazione universale di qualsiasi logo.

I PNG hanno zero pixel non opachi, nessun pixel periferico non verde e nessun pixel bianco neutro fuori dal cerchio di raggio 40% del lato. Massimo raggio misurato: circa 37,7% su 192 e 38,0% su 512.

La verifica in Edge comprende: manifest statico, URL immagini e MIME, diagnostica di installabilità senza errori in un profilo temporaneo non in incognito, viewport mobile e desktop, assenza di errori JavaScript e richieste esterne, download del resoconto e riapertura senza rete. Il percorso del pulsante è esercitato anche con un evento sintetico; questo non dimostra l'installazione nativa Android.

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node prototypes/icon-border-trial/check.mjs"
```

Non occorre eseguire il build o il gate della PWA principale: non è stata modificata e il pacchetto di prova non ne incorpora codice o dati.

## Pubblicazione della sola anteprima

Il comando vincola il canale a `icona-bordo-r1` con scadenza richiesta di 14 giorni. Usa esclusivamente `firebase.json` di questa cartella e pubblica `public/`, senza Firestore o altri servizi.

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node prototypes/icon-border-trial/deploy-preview.mjs"
```

`deployment.json`, quando presente, riporta il link effettivo, gli hash verificati online e il confronto prima/dopo dei file di produzione. Il comando non accetta un canale live. Non usare `npm run deploy:hosting` o `firebase deploy` per pubblicare questa prova.

## Collaudo sui dispositivi

1. Aprire il link di `deployment.json` in Chrome normale sul Realme GT 5G e sul Samsung Galaxy Tab S4.
2. Installare **TAT Bordo 1**, lasciando installata l'app abituale. Annotare se viene offerta soltanto una scorciatoia, invece dell'installazione, e se compare un badge del browser.
3. Tornare alla Home e confrontare il bordo. Toccare la nuova icona e verificare il nome della prova e la modalità di apertura indicata nella pagina.
4. Registrare dispositivo, esito e modalità di installazione; il resoconto JSON resta locale finché l'utente non decide di condividerlo.

Se R1 è verde fino al contorno su entrambi i dispositivi, si può preparare la correzione nei manifest dell'app principale e collaudarne l'aggiornamento. Se resta bianco, raccogliere screenshot, versione Android/browser/launcher e tipo di installazione prima di produrre un'altra variante grafica. L'esito non va dichiarato risolto fino alla prova reale.
