# Architettura, autenticazione e sicurezza

[![Italiano](https://img.shields.io/badge/lingua-Italiano-16615a)](ARCHITETTURA_E_SICUREZZA.md) [![English](https://img.shields.io/badge/language-English-6b7280)](en/ARCHITECTURE_AND_SECURITY.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](es/ARQUITECTURA_Y_SEGURIDAD.md)

## Obiettivi

L’architettura privilegia semplicità operativa, persistenza delle sessioni, isolamento tra centri e compatibilità con Firebase Spark. L’applicazione è una PWA statica: la logica applicativa risiede nel browser e l’autorizzazione definitiva nelle regole Firestore.

## Componenti

| Componente | Responsabilità |
| --- | --- |
| `public/index.html` | Struttura accessibile delle viste e del pannello |
| `public/app.js` | Orchestrazione, navigazione e rendering |
| `public/core/auth-state-machine.mjs` | Macchina a stati dell’autenticazione |
| `public/role-policy.mjs` | Matrice centralizzata di ruoli e capability |
| `public/*-data.js` | Accesso ai dati per dominio |
| `firestore.rules` | Autorizzazione lato server |
| `public/sw.js` | Cache dell’app shell e aggiornamento PWA |
| `tools/build-public.mjs` | Produzione della cartella `dist` |

## Macchina a stati dell’autenticazione

Gli stati principali sono:

```text
signed-out
  ├─ resident restore/login → restoring-resident → resident-ready
  └─ admin login            → admin-checking     → admin-ready

resident-ready ── navigazione pannello/prenotazioni ── resident-ready
admin-ready    ── navigazione pannello/prenotazioni ── admin-ready
qualunque stato ── logout esplicito → signing-out → signed-out
```

Principi invarianti:

- sigla e password comune producono una sessione residente;
- sigla di un vice e password amministratori producono una sessione `MANAGER` limitata;
- Google o email verificata identificano un amministratore Firebase;
- una sessione residente o vice non cancella né promuove Firebase Auth;
- una precedente sessione Firebase non attribuisce privilegi al residente corrente;
- callback tardive vengono ignorate mediante revisioni e identificativi di richiesta;
- il pannello viene mostrato soltanto dopo la riconciliazione del ruolo, evitando lampeggi di comandi errati.

## Ruoli e capability

La matrice canonica è in `public/role-policy.mjs`.

- `OWNER`: controllo completo del centro e trasferimento della responsabilità.
- `ADMIN`: configurazione e operatività completa, escluso il trasferimento riservato al responsabile.
- `MANAGER`: pannello operativo ristretto, persone, adattamenti, operazioni giornaliere e lettura dei link operativi.
- `RESIDENT`: prenotazioni e preferenze del dispositivo.

`MANAGE_MASS` non deriva dal ruolo amministrativo: viene aggiunta soltanto quando la persona possiede il ruolo liturgico. Il controllo frontend non sostituisce mai la verifica Firestore.

## Sessioni e link operativi

Le sessioni amichevoli sono associate al centro e al dispositivo. I token personali persistenti permettono il ripristino senza conservare la password in chiaro. I link riepilogo e cucina includono sempre il codice del centro; il loro token è una credenziale e non deve essere pubblicato nella documentazione o nei log.

La cucina espone dati operativi e non l’anagrafica completa. Anche se il contenuto è meno sensibile, il collegamento resta revocabile e associato a un centro.

## Dati Firestore

Il modello è centrato su `centers/{centerId}`. Sotto ogni centro sono separati:

- configurazione e impostazioni private;
- partecipanti pubblici e dati privati;
- amministratori e ruoli;
- prenotazioni, eccezioni e operazioni giornaliere;
- sessioni e token di accesso;
- registro attività e impostazioni operative.

Gli inviti amministrativi sono documenti temporanei con stato, scadenza e identità che li ha consumati. Un passaggio di responsabilità deve lasciare sempre un responsabile attivo e richiede una conferma esplicita.

## Difese applicate

- email verificata per l’accesso amministrativo con password;
- persistenza Firebase configurata prima dell’osservazione dello stato Auth;
- capability centralizzate e regole Firestore coerenti;
- scadenza e revoca di sessioni e link;
- limiti di schema nelle regole per orari, profili e configurazioni;
- intestazioni Hosting contro sniffing, framing e permessi non necessari;
- cache con rete primaria, senza cache autonoma dei dati Firestore nel service worker;
- backup esclusi dal repository.

## Limiti accettati

Il piano Spark esclude funzioni server personalizzate. Alcune operazioni amministrative sono quindi transazioni Firestore avviate dal client e protette dalle regole. Le modifiche alle regole richiedono sempre test con emulatori e revisione del principio del minimo privilegio.
