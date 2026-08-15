# Design system e microcopy

## Obiettivo

Tutte le viste devono sembrare parti dello stesso prodotto e comunicare lo stato delle operazioni senza affidarsi soltanto al colore. Il sistema privilegia chiarezza, rapidita e uso tattile su telefoni, tablet e desktop.

## Componenti

### Azione primaria

- Una sola per gruppo di decisioni.
- Verde pieno, testo bianco, altezza minima 44 px.
- Usata per confermare il salvataggio o avviare il flusso principale.

### Azione secondaria

- Bordo verde e fondo neutro.
- Usata per navigazione o alternativa reversibile.

### Azione terziaria

- Testo o icona con area interattiva minima 44 x 44 px.
- Usata per copia, uscita e azioni a bassa frequenza.

### Azione distruttiva

- Bordo e testo rosso, mai come azione primaria predefinita.
- Richiede conferma forte soltanto per eliminazione definitiva, revoca importante e trasferimento del Responsabile.

## Stati obbligatori

Ogni controllo interattivo prevede:

| Stato | Comunicazione |
|---|---|
| Default | Etichetta esplicita e contrasto WCAG 2.2 AA. |
| Focus | Contorno visibile di 3 px con scostamento di 2 px. |
| Pressed | Variazione breve di superficie, durata 120-150 ms. |
| Disabled | Aspetto attenuato e motivo comprensibile vicino al controllo. |
| Loading | Azione disabilitata, verbo in corso e nessuna falsa conferma. |
| Successo | Testo breve che descrive cio che e stato salvato. |
| Errore | Messaggio in italiano, dati inseriti conservati e azione per riprovare. |
| Conflitto | Avviso che i dati sono cambiati e richiesta di ricaricare prima di sovrascrivere. |

## Terminologia autorevole

- `Responsabile`: ruolo tecnico `OWNER`.
- `Amministratore`: ruolo tecnico `ADMIN`.
- `Vice amministratore`: ruolo tecnico `MANAGER`.
- `Celebrazioni liturgiche`: autorizzazione aggiuntiva alla gestione delle Messe.
- `Abilitata alle prenotazioni`: persona attiva.
- `Sospendi persona`: azione reversibile.
- `Ripristina persona`: riattivazione.
- `Elimina definitivamente`: rimozione protetta e non reversibile dall'interfaccia.
- `Dieta permanente`: impostazione anagrafica.
- `Dieta occasionale`: eccezione giornaliera o di breve durata.

I codici tecnici dei ruoli non compaiono nelle schermate ordinarie.

## Regole responsive e accessibili

- Nessuno scorrimento orizzontale a 320 px.
- Area tattile minima 44 x 44 px anche quando il controllo appare visivamente piu piccolo.
- Ordine di tabulazione uguale all'ordine visivo.
- Nessuna informazione comunicata dal solo colore: testo, icona o attributo accessibile accompagnano lo stato.
- Gli annunci di caricamento, salvataggio ed errore usano regioni `aria-live` senza interrompere la digitazione.
- Le azioni frequenti precedono quelle di configurazione; le azioni distruttive restano separate.

## Principio di conferma

Le modifiche comuni vengono confermate dopo la risposta di Firebase. Le operazioni ripetute sono deduplicate. Le conferme modali sono riservate alle azioni con conseguenze difficili da annullare; negli altri casi si preferisce una possibilita esplicita di annullamento o ripristino.
