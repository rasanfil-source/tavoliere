# Oggi a tavola

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-16615a)](README.md) 🇬🇧 [![English](https://img.shields.io/badge/English-6b7280)](README.en.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-6b7280)](README.es.md)

**Oggi a tavola** è una web app installabile pensata per organizzare le prenotazioni dei pasti in una comunità residenziale.

[Apri l’app](https://tavola-comune.web.app) · [Segnala un problema](mailto:rasanfil@gmail.com) · [Documentazione tecnica](docs/ARCHITETTURA_E_SICUREZZA.md)

## Che cosa permette di fare

- prenotare colazione, pranzo e cena nelle viste mese e settimana;
- consultare un riepilogo operativo senza modificare le prenotazioni;
- mostrare alla cucina coperti, diete, celebrazioni e note del giorno;
- gestire persone, ruoli, orari limite, calendario e link operativi;
- installare la PWA su Android e Windows senza pubblicarla in uno store;
- continuare a usare sessioni residenti persistenti senza confonderle con l’autenticazione amministrativa.

L’app è progettata per più centri, ma ogni dato e ogni sessione restano associati al proprio centro.

## L’app in immagini

### Prenotazioni

<table>
  <tr>
    <td align="center"><img src="docs/images/prenotazioni-settimana.png" width="360" alt="Vista settimanale delle prenotazioni"><br><sub>Vista settimana</sub></td>
    <td align="center"><img src="docs/images/prenotazioni-mese.png" width="360" alt="Vista mensile delle prenotazioni"><br><sub>Vista mese</sub></td>
  </tr>
</table>

### Riepilogo e cucina

<table>
  <tr>
    <td align="center"><img src="docs/images/riepilogo.png" width="360" alt="Riepilogo dei pasti"><br><sub>Riepilogo operativo</sub></td>
    <td align="center"><img src="docs/images/cucina.png" width="360" alt="Quadro dati della cucina"><br><sub>Vista cucina</sub></td>
  </tr>
</table>

## Accessi e responsabilità

| Profilo | Accesso | Funzioni principali |
| --- | --- | --- |
| Residente | Sigla personale e password comune | Prenotazioni e preferenze del dispositivo |
| Vice amministratore | Sigla personale e password amministratori | Persone, link operativi e funzioni delegate |
| Amministratore | Google oppure email verificata e password | Controllo completo, configurazione, gestione operativa e passaggio dell’incarico |
| Cucina | Link operativo del centro | Dati cucina, senza anagrafica completa dei residenti |

Il centro ha un unico amministratore. Il passaggio dell’incarico sostituisce l’amministratore attuale con quello nuovo; non crea un secondo profilo chiamato “responsabile del centro”.

Il ruolo liturgico è indipendente dal ruolo amministrativo e può essere assegnato anche a un residente.

## Impostazioni predefinite

| Impostazione | Valore iniziale |
| --- | --- |
| Vista di apertura | Mese |
| Aspetto grafico | Essenziale |
| Palette colori | Inchiostro |
| Vista riepilogo | Originale |
| Vista cucina | Originale |
| Residenti nel riepilogo | Nome |
| Comandi multipli mese e settimana | A destra |
| Lingua | Italiano |
| Promemoria prenotazioni | Disattivati su ogni nuovo dispositivo |
| Titolo iniziale | Oggi a tavola |
| Seconda riga | Per prenotarsi sempre in tempo! |

Le preferenze personali sono salvate sul dispositivo; le impostazioni del centro sono salvate in Firestore secondo i permessi del ruolo.

## Architettura in breve

La soluzione usa esclusivamente servizi compatibili con il piano gratuito Firebase Spark:

- Firebase Hosting per la PWA statica;
- Cloud Firestore per configurazione e dati operativi;
- Firebase Authentication per amministratori e identità tecniche;
- service worker con rete come fonte primaria e cache dell’app come ripiego;
- nessuna Cloud Function e nessun Cloud Storage.

Il frontend è JavaScript modulare senza framework. Le regole Firestore costituiscono il secondo livello di autorizzazione e non si affidano alla sola visibilità dei comandi nell’interfaccia.

Per i dettagli: [Architettura, autenticazione e sicurezza](docs/ARCHITETTURA_E_SICUREZZA.md).

## Avvio locale

Requisiti: Node.js `24.12.0`, npm e PowerShell 7 su Windows.

```powershell
git clone https://github.com/rasanfil-source/tavoliere.git
cd tavoliere
npm install
pwsh.exe -NoLogo -NoProfile -Command "node tools/dev-server.mjs"
```

Aprire quindi `http://127.0.0.1:4180`.

Non inserire nei test automatizzati credenziali reali, link operativi attivi o copie dei dati del centro.

## Test e build

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm test"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
pwsh.exe -NoLogo -NoProfile -Command "npm run build"
```

Prima di un rilascio usare il gate completo descritto in [Sviluppo e test](docs/SVILUPPO_E_TEST.md). Le regole Firestore vanno verificate con gli emulatori prima di essere pubblicate.

## Documentazione

- [Guida all’uso](docs/GUIDA_ALL_USO.md)
- [Architettura, autenticazione e sicurezza](docs/ARCHITETTURA_E_SICUREZZA.md)
- [Sviluppo e test](docs/SVILUPPO_E_TEST.md)
- [Esercizio, rilascio e ripristino](docs/OPERATIONS.md)
- [Come contribuire](CONTRIBUTING.md)
- [Segnalazioni di sicurezza](SECURITY.md)

## Supporto

<p align="center">
  <a href="mailto:rasanfil@gmail.com"><img src="prototypes/firebase-spark-pwa/public/icons/happyduck-badge.png" width="284" alt="HappyDuck — scrivi allo sviluppatore"></a><br>
  <a href="mailto:rasanfil@gmail.com">Scrivi allo sviluppatore</a>
</p>

Progetto **Oggi a tavola 2026**.
