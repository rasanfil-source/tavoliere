# TAT · Prova A2

Prova della variante A richiesta dopo il chiarimento sulla trasparenza: il bordo esterno deve seguire un quadrato arrotondato e lasciare vedere lo sfondo oltre gli angoli. Il vecchio disco verde lucido dentro una tela quadrata non fa parte di questa proposta.

## Esito reale ricevuto

Il 5 novembre 2026 l'utente ha fornito `tat-prova-a-r2.json`, registrato alle 16:44:02 Europe/Berlin, e ha confermato il risultato desiderato sul **Realme GT 5G**:

- Home: senza cornice bianca (`border: green`).
- Schermata nativa: icona quadrata arrotondata come desiderata (`nativeStartup: rounded`).
- Pagina bianca: angoli corretti (`pageCorners: correct`).
- Installazione tramite Installa; apertura standalone rilevata (`standalone: true`).

Queste osservazioni provengono dal resoconto dell'utente; non sono dedotte dai test desktop. A2 è la soluzione scelta. Non risultano ancora prove A2 sul Samsung Tab S4 o su iPhone, né una verifica dell'aggiornamento delle installazioni dell'app principale. Produzione invariata.

## Distinzione corretta

La trasparenza non è in sé un difetto. È intenzionale nell'icona generale e nell'immagine mostrata dalla pagina all'apertura. L'opacità viene richiesta soltanto alla variante adattiva Android, che il launcher può ritagliare secondo la propria forma. Il comportamento della splash nativa del sistema deve essere osservato separatamente dalla prima pagina HTML: questa prova non può imporre a ogni Android la stessa sagoma nativa.

| Uso | File | Trattamento |
| --- | --- | --- |
| Icona generale `any`, favicon, collegamento Apple | `a-any-192-r2.png`, `a-any-512-r2.png` | Quadrato arrotondato con angoli realmente trasparenti |
| Prima schermata HTML | `a-any-512-r2.png` | PNG trasparente su fondo bianco, senza maschera CSS o attesa artificiale |
| Icona adattiva Android | `a-maskable-192-r2.png`, `a-maskable-512-r2.png` | Quadrato verde opaco, senza disco verde aggiuntivo, con simbolo entro l'area sicura |

I master derivano dal bozzetto A tramite lo strumento integrato `image_gen.imagegen`. `prompts.json` registra le due richieste. I master non sono nel pacchetto pubblicato: servono all'esportazione ripetibile. Il master maskable viene ritagliato centralmente al 76% per compensare il margine eccessivo prodotto dalla generazione; non si ridisegnano posate o piatto durante l'esportazione.

Il raggio arrotondato richiesto è circa il 18% del lato, incorporato nell'alfa del raster, non una costante vettoriale certificata. Gli angoli hanno alfa 0 nelle quattro estremità. L'interno generato non è perfettamente opaco: nei controlli l'alfa minimo della zona centrale è 251/255. È mantenuto così nell'esportazione RGBA, senza confonderlo con il file Android completamente opaco.

## Verifiche

`checks.json` registra dimensioni, hash, pixel, diagnostica di installabilità e prove browser. Controlli distinti per i due tipi:

- `any`: alfa 0 ai quattro angoli, area trasparente effettiva, interno sostanzialmente opaco, assenza di cornice bianca; la zona sicura maskable non si applica a questo file.
- `maskable`: alfa 255 su tutti i pixel, periferia verde, nessun pixel bianco neutro oltre il cerchio centrale di raggio 40%. Il massimo misurato è circa 37,0% su 192 e 37,3% su 512.
- La prima schermata richiama il file `any` 512 e non applica `border-radius` all'immagine. La stessa immagine è visualizzata su chiaro/scuro per verificare la trasparenza reale.
- In Edge con profilo temporaneo: nessun errore di installabilità, nessun errore JavaScript o richiesta esterna, nessuno scorrimento orizzontale mobile, funzionamento del download del resoconto e apertura senza rete. Screenshot mobile/desktop ispezionati.

Questi controlli non sostituiscono l'installazione sui telefoni.

```powershell
pwsh.exe -NoLogo -NoProfile -Command "& ./prototypes/icon-a-trial/export-icons.ps1"
pwsh.exe -NoLogo -NoProfile -Command "node prototypes/icon-a-trial/check.mjs"
pwsh.exe -NoLogo -NoProfile -Command "node prototypes/icon-a-trial/deploy-preview.mjs"
```

Il comando di pubblicazione usa soltanto il canale temporaneo `icona-a-r2`, con durata richiesta 14 giorni. `deployment.json` riporta l'URL reale, gli hash pubblicati e il confronto prima/dopo dei file di produzione. L'app principale e la prova R1 restano invariate.

## Cosa osservare sui due Android

Installare **TAT Prova A2** dal suo link in Chrome normale. Osservare e annotare separatamente:

1. Contorno dell'icona sulla Home.
2. Forma e sfondo della schermata di Android che precede il caricamento della pagina, se distinguibile.
3. Angoli dell'immagine nella prima pagina bianca.

La pagina consente di scaricare un resoconto locale con queste tre risposte. Nessun dato viene inviato e non sono caricati SDK Firebase. Il passaggio in produzione resta subordinato all'esito reale e alla decisione dell'utente.
