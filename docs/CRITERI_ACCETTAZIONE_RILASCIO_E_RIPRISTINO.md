# Criteri di accettazione, rilascio e ripristino

## Controlli obbligatori prima del rilascio

1. `npm test` deve concludersi senza errori.
2. `npm run emulate:firebase-rules` deve verificare ogni ruolo sulle scritture consentite e vietate.
3. `npm run build` deve produrre gli asset minificati nella cartella `dist` senza modificare i sorgenti.
4. `npm run predeploy:gate` deve confermare configurazione, regole, indici e build.
5. Dopo il deploy, `npm run release:verify` deve confermare che gli asset pubblicati coincidano con la build verificata.
6. Le viste partecipante, mese, settimana, riepilogo, cucina e amministrazione devono aprirsi senza errori in console.
7. A 320 px non deve esistere scorrimento orizzontale.
8. Tastiera, focus, etichette accessibili e target tattili devono essere verificati sui flussi principali.
9. Una rete lenta o un errore Firebase non deve cancellare dati gia mostrati ne produrre una falsa conferma.
10. La panoramica amministrativa non deve introdurre letture Firebase ulteriori rispetto al caricamento del pannello.
11. La stessa persona deve essere modificabile da un solo editor autorevole.

## Scenari end-to-end per ruolo

| Ruolo | Scenario minimo |
|---|---|
| Proprietario piattaforma | Genera un invito centro e consulta l'elenco dei centri. |
| Responsabile | Configura centro e scadenze, gestisce persone, ruota i collegamenti, revoca inviti, invita un amministratore e trasferisce la responsabilita. |
| Amministratore | Gestisce centro, scadenze, collegamenti, persone e Vice senza poter sostituire il Responsabile. |
| Vice amministratore | Gestisce persone e attivita quotidiane; gestisce le Messe solo se autorizzato. |
| Celebrazioni liturgiche | Modifica soltanto la Messa nei giorni ancora aperti. |
| Partecipante | Accede al proprio centro e modifica soltanto i propri pasti aperti. |
| Cucina | Legge conteggi, diete, ammalati e note senza vedere i nomi dei partecipanti. |
| Riepilogo | Legge i nominativi e i contatti soltanto quando il centro ne consente la condivisione. |

## Scenari di resilienza amministrativa

- interrompere l'aggiornamento delle scadenze e verificare che il salvataggio riparta dall'ultimo lotto confermato;
- verificare che una riconfigurazione non trasformi mai un pasto `CLOSED` in `OPEN`;
- avviare due configurazioni concorrenti e verificare che quella superata si arresti con un messaggio leggibile;
- ruotare un collegamento e verificare che il precedente non generi nuove sessioni;
- revocare inviti `ADMIN` e `MANAGER` rispettando la gerarchia OWNER/ADMIN;
- simulare perdita di rete durante persona, collegamento e scadenze senza mostrare un falso successo.

## Rilascio progressivo

- Le modifiche ai dati sono additive fino al completamento del modulo.
- Hosting e regole vengono distribuiti insieme quando una nuova scrittura dipende da nuove autorizzazioni.
- Il numero della cache del service worker cambia a ogni rilascio che modifica l'applicazione installata.
- Il vecchio percorso viene rimosso soltanto dopo che i test e la verifica nel browser coprono il nuovo.
- Il piano gratuito Firebase resta un vincolo: niente listener permanenti generalizzati e nessuna scansione completa durante l'uso quotidiano.

## Preparazione del ripristino

Prima di una migrazione dati:

1. usare `Esporta dati` dal pannello del Responsabile;
2. annotare versione distribuita e data dell'esportazione;
3. verificare che l'esportazione contenga impostazioni, persone, regole, finestre, prenotazioni, note e registro attivita;
4. conservare il file fuori dal dispositivo usato per l'amministrazione.

## Ripristino applicativo

- Un problema soltanto grafico o applicativo si risolve ridistribuendo l'ultima build Hosting verificata.
- Le regole Firestore vengono riportate alla versione precedente soltanto se restano compatibili con i documenti gia scritti.
- Nessun rollback cancella automaticamente dati nuovi.
- Una trasformazione dati usa prima una modalita di simulazione che elenca i documenti coinvolti.
- Il ripristino da esportazione e un'operazione del Responsabile della piattaforma, eseguita sul solo `centerId` interessato e dopo un secondo controllo dell'identita del centro.

## Definizione di completamento

Un modulo e completo quando codice, regole, microcopy, test, flusso di errore e documentazione raccontano lo stesso comportamento. Una schermata visivamente corretta ma non autorizzata dalle regole, o una regola corretta non rappresentata nell'interfaccia, non costituiscono una consegna completa.
