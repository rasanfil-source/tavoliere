# Regressioni delle traduzioni

Eseguire dalla radice del repository:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run test:i18n:browser"
```

La suite è inclusa anche in `npm run predeploy:gate`. Usa Edge su Windows e Chromium sugli altri sistemi. In un ambiente senza Chromium installato, eseguire prima `npx playwright install chromium`. `TAT_SMOKE_CHANNEL` permette di selezionare un altro canale installato.

La variabile `TAT_I18N_DEVICE=android` attiva il profilo Pixel 7; `TAT_I18N_DEVICE=iphone` attiva iPhone 13 con WebKit (installabile con `npx playwright install webkit`). Si tratta di emulazione del browser, non di prove su telefoni fisici.

WebKit usa un profilo persistente isolato per ogni prova: il contesto effimero di Playwright elimina le voci Cache Storage a ogni navigazione ([comportamento documentato](https://github.com/microsoft/playwright/issues/41618)). In navigazione privata il recupero dei cataloghi dalla rete rimane quindi necessario quando il browser elimina la cache.

Le prove usano un browser temporaneo e il modulo i18n effettivo. Tutte le richieste vengono intercettate: HTML, JavaScript e cataloghi provengono dal repository. Una richiesta verso una destinazione imprevista fa fallire la verifica; non vengono aperti account né letti o scritti dati Firebase. Service worker e lettura dei cataloghi dal filesystem Node non possono mascherare un download fallito.

Per italiano, inglese, francese, spagnolo, tedesco e catalano si verificano:

- cataloghi ritardati, completamente irraggiungibili, malformati e lingua richiesta indisponibile con italiano disponibile;
- testo leggibile durante l'attesa, conservazione della lingua salvata e recupero quando la rete torna disponibile;
- titoli, giorni, pasti, tutte le azioni comuni e tutte le etichette `week.operations.*`;
- alias `common.action.add`, attributi accessibili, tooltip, placeholder e interpolazione di ora, data e conteggio;
- cambio lingua nelle viste Settimana, Mese, Riepilogo e Cucina, con aggiornamento degli stati dinamici senza richieste dati;
- risposta tardiva di una vecchia scelta di lingua che non deve sostituire l'ultima scelta.
- riapertura senza rete dei cataloghi già scaricati, nuovo download al cambio dell'impronta, storage negato e recupero da una copia danneggiata.

I cataloghi sono conservati nella cache asincrona `tavola-comune-i18n-v1`, condivisa dal modulo i18n e dal service worker. La scrittura non blocca la visualizzazione. Un aggiornamento ordinario dell'app conserva questa cache; la build calcola l'impronta dei sei cataloghi e la cambia solo quando cambia il loro contenuto. Per pubblicare nuove traduzioni basta quindi modificare i JSON e rigenerare la build. Le vecchie versioni restano disponibili per le schede ancora aperte; il comando di pulizia della cache dell'app elimina anche i cataloghi. La cache non contiene credenziali o dati Firebase.

Se il browser elimina o nega la memoria locale, i cataloghi vengono richiesti nuovamente; in caso di rete assente restano i testi essenziali incorporati. La disponibilità della cache non può essere garantita dopo la cancellazione dei dati del sito. L'ordine di inizializzazione dei moduli e delle traduzioni non cambia.

La fixture DOM è ridotta. Per gli stati dinamici esegue le funzioni effettive estratte da `app.js`; il caricamento di calendari e dati è escluso intenzionalmente. Queste prove consolidano i18n e il collegamento agli stati delle quattro viste, ma non sostituiscono prove complete di accesso e prenotazione con i diversi ruoli. Il confronto con i cataloghi verifica copertura e coerenza, non la qualità linguistica delle traduzioni.

I risultati dettagliati degli errori e gli eventuali artefatti Playwright sono in `.tools/playwright-i18n-results`. Le verifiche statiche dei cataloghi restano disponibili con `npm run test:i18n`.
