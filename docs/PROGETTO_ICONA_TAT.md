# Icona dell’app: variante A2

La variante A2 è la soluzione scelta dall’utente, collaudata sul Realme GT 5G il 5 novembre 2026. Il resoconto ricevuto conferma Home senza cornice bianca, icona arrotondata nella schermata iniziale, angoli corretti nella pagina e apertura standalone. Samsung Tab S4 e iPhone non hanno ancora un esito A2 registrato.

Pubblicata in produzione il 5 novembre 2026, build `910f4bf31c4daf2c`, commit `1caea7d`. Gate completo superato, hash online corrispondenti e tre smoke test Hosting riusciti. Il [registro di rilascio](../releases/2026-11-05-icon-a2.json) riporta controlli, compatibilità e disattivazione delle anteprime; il [registro precedente](../releases/2026-11-05-before-icon-a2.json) conserva la versione di ripristino.

## File usati dall’app

I soli asset attivi del marchio, in `prototypes/firebase-spark-pwa/public/icons/`, sono:

| File | Impiego |
| --- | --- |
| `app-icon-any-192-v2.png` | Manifest generale, Apple touch icon 192, favicon e notifiche |
| `app-icon-any-512-v2.png` | Manifest generale, immagine all’apertura, condivisione e immagine di riserva del centro |
| `app-icon-maskable-192-v2.png` | Variante adattiva Android |
| `app-icon-maskable-512-v2.png` | Variante adattiva Android ad alta risoluzione |

Sono gli stessi PNG della prova A2 approvata, verificati tramite SHA-256, senza rigenerazione. Le immagini `any` hanno angoli realmente trasparenti e interno quasi opaco; le varianti Android sono interamente opache con simbolo dentro l’area sicura. La trasparenza è intenzionale, non un difetto. La schermata nativa del sistema e la prima pagina HTML sono distinte.

Entrambi i manifest, Prenotazioni e Cucina, richiamano le nuove immagini. Nome, identità, URL di ingresso per centro e funzione, sessioni e autorizzazioni restano quelli ordinari. Il preload HTML e il worker condividono lo stesso file 512; nessun ritardo o selettore aggiunto all’avvio. I file non sono incorporati nel JavaScript. Il file di apertura pesa 380.376 byte, contro 261.322 del precedente: +119.054 byte al primo download; le riaperture usano la cache senza una nuova richiesta dell’immagine. Il controllo dei tempi sul dispositivo resta distinto dal peso dei file.

## Storico e compatibilità

Le icone precedenti, gli studi A/B, i due siti di prova, i master, i prompt imagegen, gli screenshot, i verbali e i vecchi script sono conservati in [archivio icone](archive/icons/2026-11-05/README.md), fuori da `public/` e dal pacchetto Hosting. La cronologia Git conserva anche i tentativi del 4 novembre.

Sette reindirizzamenti Hosting 302 associano i vecchi URL alle immagini nuove. Sono una compatibilità per installazioni e pagine precedenti: nessun vecchio PNG è distribuito, la nuova versione usa gli URL nuovi direttamente. Non sono codice di prova e non caricano due immagini. I moduli immutabili già pubblicati in `dist/assets` restano disponibili alle schede aperte secondo la politica del build.

I canali temporanei A2 e R1 sono stati eliminati il 5 novembre 2026 su richiesta dell’utente: entrambi i link rispondono HTTP 404. Le copie già installate sui dispositivi possono ancora mostrare contenuti salvati nella propria cache offline e vanno rimosse dal dispositivo se non servono. I file e i risultati rimangono nello storico locale.

## Verifiche e manutenzione

`tests/firebase-spark/app-icons.test.mjs` verifica gli hash approvati, dimensioni, alfa, periferia verde dei maskable, area sicura, riferimenti e assenza di prove nel codice attivo. Il test runtime del worker verifica che la riapertura dell’immagine dalla cache non richieda rete. Prima del rilascio eseguire il gate completo, verificare il build e controllare l’avvio mobile/desktop. Dopo il rilascio confrontare gli hash pubblici e gli smoke test.

L’aggiornamento di un’icona già installata sulla Home dipende dal browser/sistema: l’approvazione della nuova installazione A2 non equivale alla verifica della migrazione. Conservare l’identità dell’app ed evitare logout o cancellazioni delle sessioni per aggiornare la grafica.

Riferimento tecnico originario: [Modulo Iscrizioni / Segreteria](ICONA_RIFERIMENTO_MODULO_ISCRIZIONI.md).
