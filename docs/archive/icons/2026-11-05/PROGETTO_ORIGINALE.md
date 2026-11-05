# Progetto icona «Oggi a tavola»: prima prova, poi eventuale produzione

Data: 5 novembre 2026. Stato: variante A2 collaudata con esito positivo dall'utente su Realme GT 5G; produzione invariata.

## Esito del collaudo A2 sul Realme

Il resoconto `tat-prova-a-r2.json` fornito dall'utente, registrato il 5 novembre 2026 alle 16:44:02 (Europe/Berlin), riporta: Realme GT 5G, Home senza cornice bianca (`border: green`), icona arrotondata nella schermata nativa (`nativeStartup: rounded`), angoli corretti nella pagina (`pageCorners: correct`), installazione tramite comando Installa e apertura standalone rilevata. L'utente ha confermato di ritenere raggiunto il risultato desiderato.

La soluzione scelta è quindi A2, con file `any` trasparenti e maskable opachi distinti. È un esito osservato e dichiarato dall'utente sul Realme, non una garanzia universale per ogni launcher. Samsung Galaxy Tab S4 e iPhone non risultano ancora collaudati con A2. Il risultato riguarda una nuova installazione di prova; l'integrazione nell'app principale e l'aggiornamento delle installazioni esistenti restano da eseguire. Non è stata pubblicata alcuna modifica in produzione.

## Ultima scelta: variante A con angoli trasparenti

L'utente ha chiarito che desidera trasparenza nelle aree esterne alla sagoma arrotondata, soprattutto nell'immagine mostrata all'avvio, come nel riferimento Segreteria. La trasparenza non va definita genericamente un difetto: la richiesta di opacità riguarda soltanto il file adattivo Android. Il riempimento verde intorno al vecchio disco della prova R1 non soddisfa l'aspetto desiderato.

Si procede quindi con **A2**, variante A senza il disco verde lucido interno. La prova usa file `any` arrotondati con alfa per l'apertura e una variante maskable opaca separata per Android. La [scheda A2](../prototypes/icon-a-trial/README.md) e il [registro di pubblicazione A2](../prototypes/icon-a-trial/deployment.json) documentano file, controlli e link. Si valutano separatamente Home, splash nativa e prima pagina HTML; nessuna forma della splash nativa è garantita dal rendering HTML.

Le sezioni seguenti conservano la cronologia delle osservazioni e della prova R1, superata come proposta grafica dalla scelta A2. Gli stati «da verificare» nelle note storiche sono superati, per il solo Realme, dall'esito riportato sopra. R1 aveva eliminato la cornice sulla Home secondo l'utente, ma il disco verde interno nella schermata iniziale non era gradito.

## Priorità attuale: eliminare il bordo dell'icona esistente

L'utente ha chiesto di concentrarsi prima sul bordo bianco dell'icona attuale, dopo diversi tentativi precedenti senza successo. Il restyling A/B e il possibile selettore in Aspetto sono rinviati. La scelta grafica A resta acquisita per un eventuale passaggio successivo.

È disponibile [TAT · Prova bordo 1](https://tavola-comune--icona-bordo-r1-hb1vkooj.web.app), una PWA autonoma senza Auth/Firestore, con manifest statico e identità nuova. Il pacchetto conserva il soggetto dell'icona corrente, rielaborato su fondo verde pieno; non è una copia pixel per pixel. Le varianti PNG 192/512 sono completamente opache, verdi nella fascia periferica e con il simbolo bianco entro l'area sicura. La [scheda tecnica](../prototypes/icon-border-trial/README.md) descrive origine, prompt, esportazione, cronologia dei tentativi, controlli e procedura di prova.

Pubblicazione: 5 novembre 2026, canale `icona-bordo-r1`, durata richiesta 14 giorni. [Registro della distribuzione](../prototypes/icon-border-trial/deployment.json): hash di tutti i file online verificati; `build-manifest.json`, manifest principale e vecchio asset maskable di produzione invariati prima/dopo. Verifiche locali in Edge superate, incluse diagnostica di installabilità, mobile/desktop e apertura senza rete. Esito su Realme GT 5G e Samsung Galaxy Tab S4 ancora da raccogliere: non dichiarare il bordo risolto sui dispositivi finché non vengono provati.

## Aggiornamento: obiettivo del bordo bianco e scelta A

L'utente ha scelto **A · Continuità**. La priorità è eliminare il bordo bianco sulla Home Android; la precedente preferenza per B era esclusivamente grafica.

Dispositivi segnalati: Realme GT 5G, bordo circolare regolare; Samsung Galaxy Tab S4, bordo quadrato arrotondato. Su iPhone l'utente riferisce che il bordo sembra assente, senza una verifica definitiva.

L'ispezione visiva del file locale `launcher-512-maskable.png` ha individuato un fondo bianco incorporato attorno al disco verde. Nei file maskable 192 e 512 il pixel al centro del bordo superiore è RGBA `(255, 255, 255, 255)`: bianco opaco, non trasparenza. Entrambi i manifest li dichiarano come icone adattive. Questo è un difetto concreto degli asset rispetto all'obiettivo di ottenere verde fino al contorno. La dichiarazione `maskable` da sola non elimina il bianco già contenuto nell'immagine.

Le due sagome descritte sono compatibili con il ritaglio di questo fondo da parte dei launcher. Non è ancora verificato quale file o versione sia memorizzato nei due dispositivi. Dopo un primo tentativo bloccato dalla risoluzione DNS nell'ambiente isolato, la verifica online è riuscita: l'asset 512 pubblicato ha SHA-256 `977771f4c888250b8e5228eb4d3d193f9a480697e713e634cfa40ab860c82427`, identico al locale e contenente il fondo bianco.

Correzione prevista nella prova A: fondo verde opaco esteso a tutta la tela, nessuna cornice bianca e nessun angolo preritagliato nella variante Android; simbolo entro la zona sicura. Sul Realme l'esito atteso è una sagoma circolare verde, sul Samsung una sagoma verde quadrata arrotondata, da confermare con installazioni di prova. La forma del launcher può restare diversa sui due dispositivi. [Comportamento delle icone adattive](https://web.dev/articles/maskable-icon).

Il test esistente in `service-worker-static.test.mjs`, pur nominando l'assenza di cornice bianca, controlla soltanto dimensioni dichiarate e URL nel manifest. Nell'implementazione aggiungere una verifica dei pixel periferici degli asset esportati, insieme al controllo del simbolo nella zona sicura e alle prove reali sui due dispositivi.

## 1. Proposta

Mantenere l'identità riconoscibile di TAT — verde, piatto e posate bianche — e preparare una versione più pulita, leggibile e coerente fra Home del telefono, scheda del browser e apertura dell'app.

La direzione consigliata è un fondo verde con variazione tonale leggera, simbolo bianco ben centrato, meno riflessi ed effetto bombato rispetto all'icona attuale. Nessuna scritta dentro l'icona: il nome resta sotto, dove viene mostrato dal sistema. La forma arrotondata del riferimento Modulo Iscrizioni ispira la presentazione, senza importarne simbolo, colore blu o identità applicativa.

Preparare due bozzetti da confrontare prima dell'integrazione:

| Bozzetto | Aspetto | Scopo |
| --- | --- | --- |
| A · Continuità | Piatto e posate incrociate vicini all'attuale, riflessi attenuati, contorno ripulito | Conservare al massimo la familiarità |
| B · Essenziale, consigliato | Stesso soggetto, disegno semplificato e spessori regolari su fondo verde | Migliorare la lettura alle dimensioni della Home e della favicon |

Il [confronto locale](../prototypes/icon-study/index.html) mostra entrambe le proposte accanto all'originale a 32, 48, 64 e 192 px, su sfondo chiaro e scuro. I bozzetti A e B sono stati realizzati con lo strumento integrato imagegen. La [scheda dello studio](../prototypes/icon-study/README.md) documenta origine, prompt, dimensioni e verifiche. Si tratta di proposte grafiche, non di esportazioni definitive per l'installazione.

## 2. Punto di partenza verificato in TAT

| Elemento | Situazione nei sorgenti |
| --- | --- |
| Nome pubblico | Oggi a tavola; TAT è il nome del repository/progetto |
| Icona generale | `public/icons/launcher-192.png` e `launcher-512.png`: piatto verde circolare lucido con posate bianche |
| Android adattivo | Esistono già `launcher-192-maskable.png` e `launcher-512-maskable.png`, dichiarati separatamente con `purpose: maskable` |
| Manifest Prenotazioni | `public/manifest.webmanifest` |
| Manifest Cucina | `public/manifest-kitchen.webmanifest`, identità statica `/kitchen-app` |
| Identità per centro | `centerManifest()` in `public/sw.js` compone `id` e `start_url` per centro e funzione |
| Apple | `index.html` richiama attualmente il PNG generale 192, senza variante Apple dedicata |
| Avvio visibile | `index.html` precarica e mostra `splash-512-transparent.png`; il build lo inserisce nella shell del worker |
| Condivisione | `og:image` in `index.html` richiama `launcher-512.png` con URL assoluto di produzione |
| Altro riferimento | `app.js` contiene un riferimento a `launcher-192.png` da includere nell'inventario di aggiornamento |
| Icona del centro | È una personalizzazione interna gestita da `center-settings.js` e `app.js`; non va equiparata automaticamente all'icona installata |

I percorsi `public/` sono relativi a `prototypes/firebase-spark-pwa/`. Le letture riguardano il checkout locale, non una verifica della versione online.

Misure di base: i quattro launcher hanno le dimensioni indicate nel nome. Il pixel in alto a sinistra ha alfa 0 per i due PNG generali e 255 per i due maskable. Questa misura puntuale non certifica l'opacità dell'intera immagine.

Impronte SHA-256 dei riferimenti 512:

- Generale: `d18bae703a78d261fce234578f57065262759046ddbe7ed67750922882bb6647`.
- Maskable: `977771f4c888250b8e5228eb4d3d193f9a480697e713e634cfa40ab860c82427`.
- Splash trasparente: `35874d4c7f56e77a3038145680d587c5ce5dd739d7731c3d469e5989008fd381`.

## 3. Un disegno, esportazioni diverse

Il risultato atteso è un insieme coerente di file, ricavati da un unico sorgente conservato nel repository con origine, dimensioni, colori e procedura di esportazione. I nomi seguenti sono proposti, non file già presenti.

| File proposto | Dimensione | Trattamento |
| --- | --- | --- |
| `tat-icon-v2-master.svg` oppure sorgente PNG ad alta risoluzione | Tela quadrata, almeno 1024 se raster | Sorgente modificabile e documentato |
| `tat-icon-v2-any-192.png`, `tat-icon-v2-any-512.png` | 192 e 512 | Sagoma arrotondata con alfa esterno; raggio indicativo 18% del lato da valutare visivamente |
| `tat-icon-v2-maskable-192.png`, `tat-icon-v2-maskable-512.png` | 192 e 512 | Quadrato completamente opaco, senza angoli preritagliati |
| `tat-icon-v2-apple-180.png` | 180 | Quadrato opaco, senza angoli preritagliati; collegamento HTML con `sizes="180x180"` |
| `tat-icon-v2-favicon-32.png` e ICO 16/32/48 | 32 e multirisoluzione | Variante semplificata se il simbolo completo perde leggibilità |
| `tat-icon-v2-splash-512.png` | 512 | Simbolo coerente con l'icona scelta, preparato per il fondo della schermata iniziale |

Per il maskable, piatto e posate essenziali devono stare nel cerchio centrale di raggio 40% del lato: 204,8 px su 512. Il fondo riempie l'intera tela. La maschera finale è scelta dal sistema; la trasparenza verso lo sfondo della Home non è un risultato garantibile. [Documentazione Google sul manifest](https://web.dev/learn/pwa/web-app-manifest/).

La variante Apple è distinta perché il suo collegamento ha precedenza sulle icone del manifest quando entrambi sono presenti. Il fondo pieno è una scelta progettuale per controllare meglio la resa. [Documentazione WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Il raggio del 18% è soltanto un punto di partenza per la variante generale: non impone la forma a iOS o Android. Non applicare lo stesso file arrotondato ai tre impieghi.

## 4. Prima fase: prova grafica locale

Creare una cartella separata, per esempio `prototypes/icon-study/`, fuori da `public/` e `dist/`, con:

1. Bozzetti A e B e originale di confronto.
2. Pagina HTML di confronto alle diverse dimensioni, su fondi chiari e scuri.
3. Simulazioni delle maschere circolare e quadrata arrotondata, chiaramente indicate come simulazioni.
4. Anteprima dell'apertura su fondo bianco, coerente con l'attuale `background_color` dei manifest.
5. Scheda delle esportazioni: hash, dimensioni, alfa, sorgente e criterio del raggio.

La pagina grafica non richiede accesso a Firebase. Primo esito atteso: scegliere il bozzetto e correggere dimensione percepita, margini e leggibilità prima di produrre tutti gli asset.

## 5. Seconda fase: prova installabile separata

Preparare una piccola PWA di collaudo senza collegamenti ad Auth o Firestore, su un'origine HTTPS distinta. Deve mostrare «Oggi a tavola · Prova icona», usare i nuovi asset e avere due ingressi dimostrativi Prenotazioni/Cucina con centri fittizi. La pagina iniziale deve rendere evidente che si sta usando la prova.

Questo permette di verificare installazione, Home, maschere e avvio sul telefono prima dell'integrazione. La prova grafica non dimostra da sola il funzionamento dell'app reale: la terza fase copre tale passaggio.

Un canale Firebase Hosting di anteprima è una possibilità per pubblicare la prova. Il checkout configura attualmente il solo progetto `tavola-comune`: non risulta configurato un progetto di collaudo separato. Un URL di anteprima separa l'Hosting, ma una copia dell'app continuerebbe a usare il backend configurato. Perciò la prima prova installabile deve essere il pacchetto dimostrativo privo di Firebase, non una copia dell'app collegata ai dati reali. [Documentazione Firebase sulle anteprime](https://firebase.google.com/docs/hosting/test-preview-deploy).

Usare una configurazione Hosting dedicata al pacchetto dimostrativo e un canale di anteprima riconoscibile. Non usare i comandi ordinari `deploy:hosting` per questa fase: pubblicano sul sito live. Registrare URL, durata del canale e versione degli asset nel verbale di prova.

## 6. Terza fase: integrazione TAT in collaudo

Dopo la scelta grafica, integrare gli asset in una modifica isolata e preparare una build dell'app da verificare prima del rilascio.

| Punto | Intervento previsto |
| --- | --- |
| `public/icons/` | Aggiungere i nuovi file con nomi versionati; conservare i precedenti per il ritorno alla versione precedente |
| Entrambi i manifest | Aggiornare soltanto gli asset dell'icona, conservando la distinzione `any`/`maskable` |
| `public/index.html` | Allineare Apple, favicon, anteprima di condivisione, preload e immagine di avvio |
| `public/app.js` | Allineare il riferimento all'icona generale e cercare eventuali ulteriori riferimenti prima della modifica |
| `public/sw.js` | Allineare gli asset di avvio senza cambiare la logica di identità, sessione o attivazione del worker |
| `tools/build-public.mjs` | Aggiornare la risorsa splash in `staticShell`, mantenendo la corrispondenza con HTML e worker |
| Test | Aggiornare i contratti che fissano i vecchi nomi/versioni e aggiungere verifiche reali su file, dimensioni, alfa e riferimenti |

I test esistenti interessati comprendono `service-worker-static.test.mjs`, `administration-contracts.test.mjs`, `hosting-config.test.mjs` e i controlli del build. La generazione di `dist/` resta affidata alla build.

Per una prova completa dell'app usare un backend di collaudo con dati sintetici o gli emulatori per le verifiche locali. Configurare esplicitamente tale destinazione prima di pubblicare un'anteprima integrata. Non assumere che il canale Hosting configuri anche un database di prova.

Conservare `id`, `start_url`, centro e vista: la nuova grafica non deve creare una nuova app per chi ha già installato TAT. Conservare il fondo bianco iniziale e `theme_color: #233142` nella prima iterazione; un eventuale cambio della palette dell'interfaccia è una decisione successiva. L'immagine mostrata dall'HTML e la splash generata dal sistema operativo sono due passaggi diversi: non introdurre attese artificiali per mostrare il marchio.

## 7. Criteri per accettare la prova

| Verifica | Risultato richiesto |
| --- | --- |
| File | Dimensioni esatte; alfa previsto per ciascuna variante; maskable e Apple interamente opachi; nessun alone indesiderato |
| Leggibilità | Posate e piatto distinguibili a 32/48/64 px; confronto positivo con l'originale |
| Android reale | Installazione da Chrome, simbolo integro nella maschera del launcher, margini equilibrati, riapertura corretta |
| iPhone reale | Aggiunta alla Home da Safari, variante Apple corretta, forma e fondo accettabili, riapertura corretta |
| Sfondo Home | Controllo su sfondo chiaro e scuro; annotare eventuali superfici aggiunte dal sistema |
| Prenotazioni/Cucina | Due installazioni distinte, centro corretto e vista corretta anche dopo chiusura completa |
| Aggiornamento | Confrontare installazione nuova e installazione precedente aggiornata; annotare quando il sistema conserva la vecchia immagine |
| Sessioni | Riapertura delle sessioni previste senza logout provocati dalla modifica grafica |
| Avvio | Nessun nuovo ritardo intenzionale, preload coerente, nessun file mancante; confronto a freddo e con cache |
| Distribuzione | Manifest e immagini con HTTP/MIME corretti; build, gate e smoke test superati |

Nel verbale registrare dispositivo, sistema operativo, browser, data, variante, screenshot e risultato. Le verifiche browser desktop e le maschere simulate non sostituiscono i due telefoni reali. Le prove di aggiornamento devono partire da una versione precedente installata sulla stessa origine di collaudo; il confronto fra origini diverse non misura l'aggiornamento.

## 8. Eventuale produzione e ritorno alla versione precedente

La decisione di produzione arriva dopo la visione dei bozzetti e il collaudo, come richiesto. Al momento non è richiesta per completare questa proposta.

Prima del rilascio, fissare un commit della modifica, la versione Hosting precedente e gli hash del pacchetto approvato. Eseguire i controlli previsti da [Sviluppo e test](SVILUPPO_E_TEST.md) ed [Esercizio e ripristino](OPERATIONS.md), inclusi gate, controllo del diff e prove mobile/desktop. Pubblicare solo Hosting: questa modifica non richiede nuove regole o indici Firestore.

Dopo la pubblicazione verificare gli hash online, gli smoke test e l'apertura delle due funzioni. La normale attivazione del worker segue la chiusura delle finestre controllate; non forzare ricariche o cancellazioni delle sessioni per aggiornare un'icona.

Se il risultato non è soddisfacente, ripristinare la versione Hosting registrata e verificare gli asset serviti. L'icona già memorizzata dal sistema operativo potrebbe aggiornarsi separatamente; non promettere un ritorno immediato sulla Home. L'eventuale reinstallazione va provata prima in collaudo, verificando anche il percorso per rientrare nell'app.

## 9. Esito e passo successivo

La tavola di confronto A/B è disponibile in `prototypes/icon-study/`, con immagini originali generate, prompt, rapporto delle verifiche e screenshot. Verificati in Edge il layout desktop/mobile, le immagini e i controlli interattivi; gli screenshot sono stati ispezionati. Successivamente è stata pubblicata la prova autonoma del bordo descritta all'inizio del documento. Nessuna prova su telefoni reali ancora registrata.

Il passo immediato è installare TAT Bordo 1 sui due Android dell'utente e verificare la cornice. In base all'esito si prepara la correzione nell'app principale oppure si approfondisce il comportamento del browser/launcher. Il lavoro grafico A/B resta subordinato alla soluzione del bordo.

Riferimento di partenza: [esperienza Modulo Iscrizioni](ICONA_RIFERIMENTO_MODULO_ISCRIZIONI.md). Le sue scelte sono state adattate all'architettura TAT, che dispone già di varianti maskable e identità distinte per centro/funzione.
