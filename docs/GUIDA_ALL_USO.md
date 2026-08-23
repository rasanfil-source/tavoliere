# Guida all’uso

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-16615a)](GUIDA_ALL_USO.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-6b7280)](en/USER_GUIDE.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-6b7280)](es/GUIA_DE_USO.md)

## Installazione

L’app può essere usata nel browser o installata come PWA.

- Android/Chrome: aprire il collegamento del centro e scegliere **Installa app** o **Aggiungi a schermata Home**.
- Windows/Edge: aprire il collegamento e scegliere **App > Installa questo sito come app**.

Per mantenere la sessione, non cancellare i dati del sito. Un normale aggiornamento o la chiusura della finestra non deve richiedere un nuovo accesso.

## Residente

1. Aprire il link prenotazioni del centro.
2. Inserire la sigla personale e la password comune.
3. Selezionare o deselezionare i pasti nella vista mese o settimana.
4. Aprire **Riepilogo** per consultare le prenotazioni.
5. Aprire il pannello per modificare le preferenze di questo dispositivo.

Il comando **Esci** termina deliberatamente la sessione; entrare e uscire dal pannello è invece semplice navigazione e non deve distruggerla.

## Vice amministratore

Il vice entra con la propria sigla e la password amministratori. Può usare le funzioni delegate, comprese la gestione delle persone e la consultazione, copia, apertura e condivisione dei link operativi. Non acquisisce automaticamente le funzioni riservate all’amministratore.

## Amministratore

L’unico amministratore accede con Google oppure con email verificata e password. Dal pannello gestisce:

- configurazione e identità del centro;
- persone e ruoli operativi;
- link per prenotazioni, riepilogo e cucina;
- aspetto e preferenze;
- calendario, registro attività e backup;
- inviti amministrativi e passaggio di responsabilità.

L’invito a un nuovo amministratore non trasferisce immediatamente l’incarico. La persona deve accettare e autenticarsi; l’amministratore attuale completa poi il passaggio con la conferma esplicita prevista dall’interfaccia.

In **Manutenzione > Archivio di sicurezza**, l’amministratore può scaricare una copia JSON completa. Con **Carica** può ripristinare rapidamente soltanto la configurazione dello stesso centro: l’app mostra un riepilogo, richiede una conferma scritta e scarica prima una copia dello stato corrente. Persone, prenotazioni, ruoli, password, collegamenti e registro attività restano invariati.

## Cucina

Il link cucina apre un quadro sintetico con coperti, diete, celebrazioni e note operative. Le note vengono mostrate soltanto per il giorno a cui appartengono. I codici dieta sono preceduti da `D` e possono avere una legenda configurata dall’amministratore.

## Promemoria

I promemoria delle prenotazioni sono facoltativi, locali al dispositivo e inizialmente disattivati. Se attivati, richiedono il permesso del browser e possono essere disabilitati dalle impostazioni dell’app o dalla notifica.

## Problemi comuni

- **La versione sembra vecchia:** chiudere completamente la PWA e riaprirla; se necessario aggiornare una volta la pagina.
- **La sessione non viene ripristinata:** verificare che il browser non cancelli i dati del sito alla chiusura.
- **Un link cucina o riepilogo non apre i dati:** chiedere all’amministratore un link operativo aggiornato, completo del codice centro.
- **Un comando non è disponibile:** verificare il ruolo con cui è stato effettuato l’accesso.
