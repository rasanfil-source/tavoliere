# Studio icona Oggi a tavola

Prima prova grafica locale, 5 novembre 2026. Aprire `index.html` nel browser: funziona anche come file locale, senza server o Firebase.

- **A · Continuità**: verde luminoso sfumato, vicino al carattere dell'icona precedente, senza il bordo bombato.
- **B · Essenziale**: verde più scuro, resa più uniforme e contrasto netto del simbolo bianco; direzione consigliata per il prossimo affinamento.

La tavola confronta originale, A e B a 192, 64, 48 e 32 CSS px. Consente di cambiare la forma simulata delle proposte, lo sfondo della Home e l'icona nell'anteprima di avvio. Le righe piccole mostrano sempre entrambi i fondi.

## File e origine

| File | Origine e uso |
| --- | --- |
| `assets/originale.png` | Copia invariata del launcher 512 dell'app |
| `assets/bozzetto-a-continuita.png` | Prima variante generata, 1254 × 1254 px |
| `assets/bozzetto-b-essenziale.png` | Seconda variante generata, 1254 × 1254 px |
| `prompts.json` | Prompt integrali e riferimento impiegati con `image_gen.imagegen`, strumento integrato; nessuna CLI/API esterna |
| `inspection.json` | Dimensioni effettive, peso, SHA-256 e risultati della verifica browser |
| `confronto-desktop.png` | Tavola su viewport 1160 px, forma arrotondata |
| `confronto-circolare-scuro.png` | Tavola con maschera circolare e Home scura |
| `confronto-mobile.png` | Tavola su viewport 390 px |

I PNG generati sono stati copiati nella cartella di studio senza ritocchi o ricampionamenti. Le dimensioni effettive restituite sono 1254 × 1254, diverse dalle 1024 richieste nei prompt. Il verde di B è un risultato raster, non un campione certificato del colore richiesto; il master finale dovrà fissare la palette.

Gli angoli sono applicati esclusivamente dalla pagina: `border-radius: 18%`, `50%` oppure `0`. Non esiste ancora un file PNG arrotondato con alfa esterno, né una variante Apple o maskable certificata. La verifica della zona sicura, la normalizzazione dei colori, l'eventuale semplificazione della favicon e le esportazioni dedicate appartengono al prossimo passaggio dopo la scelta.

## Verifica eseguita

Edge headless: caricamento di tutte le immagini, funzionamento dei selettori, assenza di errori JavaScript e di scorrimento orizzontale a 390 px. Screenshot desktop e mobile ispezionati visivamente. Nessuna installazione o prova su telefono reale.

Per riprodurre screenshot e rapporto dalla radice del repository, con le dipendenze del progetto già installate:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node prototypes/icon-study/inspect.mjs"
```

Lo script usa un profilo temporaneo di Edge e blocca le richieste HTTP/HTTPS della pagina. Non effettua modifiche alla PWA, ai manifest, alla build o alla produzione.

Progetto completo: [PROGETTO_ICONA_TAT.md](../../docs/PROGETTO_ICONA_TAT.md).
