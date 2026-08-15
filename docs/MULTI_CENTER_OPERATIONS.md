# Gestione di piu centri

## Identificativo del centro

Ogni nuova sede riceve automaticamente un identificativo univoco nel formato `center_<uid>_<codice-casuale>`. Anche riutilizzando lo stesso nome e lo stesso responsabile, il nuovo centro non riusa mai l'identificativo di un centro precedente.

L'identificativo compare nei link come parametro `c`:

```text
https://tavola-comune.web.app/?view=participant&t=<token-residenti>&c=center_xxxxxxxxx
```

Il parametro seleziona il documento Firestore del centro. Prenotazioni, riepiloghi, cucina, partecipanti e impostazioni restano quindi separati dagli altri centri.

## Avvio di una nuova sede

1. Il proprietario della piattaforma accede alla propria **Area amministrazione**.
2. Nella sezione **Nuovi centri** genera un invito monouso e lo invia al direttore.
3. Il direttore apre l'invito e accede con Google oppure crea un account con una normale email e password.
4. Inserisce nome della sede e fuso orario, quindi seleziona **Crea nuovo centro**.
5. Controlla nome e identificativo nella sezione **Centro attivo**.
6. Usa i link generati nel pannello:
   - prenotazioni: per i residenti;
   - chi c'e oggi: per il riepilogo nominativo;
   - cucina: per i soli conteggi e le diete.

## Una identita, piu centri

La stessa email puo amministrare piu centri. Firebase Authentication conserva una sola identita e, per l'accesso con email, una sola password personale; non si creano copie dell'email e non si aggiungono suffissi nascosti.

Ogni autorizzazione resta invece separata nel documento `centers/<centerId>/admins/<uid>`. Quando l'account appartiene a piu centri, nell'area amministrativa compare il selettore **Centro amministrato**. Il cambio di centro aggiorna il parametro `c` e carica soltanto dati e permessi della sede scelta.

Se due centri attivi hanno lo stesso nome, il selettore aggiunge tra parentesi una breve parte dell'identificativo per distinguerli. Il nome ufficiale del centro non viene modificato.

## Esempi di link

```text
Prenotazioni:
https://tavola-comune.web.app/?view=participant&t=<token-residenti>&c=center_xxxxxxxxx

Riepilogo:
https://tavola-comune.web.app/?view=summary&t=<token-residenti>&c=center_xxxxxxxxx

Cucina:
https://tavola-comune.web.app/?view=kitchen&t=<token-cucina>&c=center_xxxxxxxxx
```

## Regola operativa

Ogni invito crea un solo centro e non puo essere riutilizzato. Un amministratore gia registrato accede con il proprio account esistente e accetta la nuova appartenenza; non deve creare una seconda password. Non riutilizzare i collegamenti operativi di un centro per un'altra sede: il servizio rimane unico, mentre i dati sono divisi dal parametro `c`.

## Verifica rapida

Per verificare di essere nella sede giusta, l'amministratore controlla l'ID mostrato in **Centro attivo** e il nome della sede prima di distribuire i link.
