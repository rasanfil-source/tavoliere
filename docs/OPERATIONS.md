# Esercizio, rilascio e ripristino

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-16615a)](OPERATIONS.md) 🇬🇧 [![English](https://img.shields.io/badge/English-6b7280)](en/OPERATIONS.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-6b7280)](es/OPERACIONES.md)

**Documentazione:** [README](../README.md) · [Guida all’uso](GUIDA_ALL_USO.md) · [Architettura e sicurezza](ARCHITETTURA_E_SICUREZZA.md) · [Sviluppo e test](SVILUPPO_E_TEST.md)

## Sessioni in esercizio

Entrare e uscire dal pannello è navigazione. **Esci** termina deliberatamente la sessione del dispositivo.

- `PUBLIC`: letture minime prima dell’identificazione;
- `PERSONAL`: sessione fino a 30 giorni, rinnovata durante l’uso e vincolata a un token personale revocabile di lunga durata;
- `KITCHEN`: sessione indipendente creata dal link cucina;
- `viceSessions`: autorizzazione aggiuntiva del vice, distinta da Firebase Auth forte.

### Telefono smarrito o dispositivo non più disponibile

La revoca di un solo dispositivo richiede il relativo token. Se non è disponibile, occorre sospendere temporaneamente la persona: vengono revocate le credenziali operative note e questa misura blocca tutti i suoi dispositivi. Dopo la verifica è possibile riattivarla. Rigenerare i link operativi se potrebbero essere arrivati a destinatari non previsti.

La disattivazione di un centro conserva i dati: l'azione non è presentata come cancellazione definitiva.

## Aggiornamento automatico

| Fascia nel fuso del centro | Cadenza |
| --- | --- |
| 07:00–10:00 e 13:30–17:30 | 5 minuti |
| altre ore diurne | 45 minuti |
| 23:00–07:00 | 90 minuti |

Le viste anticipano sempre il prossimo confine di fascia. Il ritorno in primo piano dopo inattività e il comando manuale possono forzare una lettura immediata.

## Conteggi mensili della cucina

Dal 1° novembre 2026 il workflow [.github/workflows/kitchen-monthly-summary.yml](../.github/workflows/kitchen-monthly-summary.yml) registra i totali alle 23:00 locali nei giorni normali e alle 21:00 nell'ultimo giorno del mese, verificando anche le finestre effettive dei pasti. Colazione, pranzo e cena sono attribuiti alla data del pasto; la colazione del 1° novembre rientra quindi nel conteggio del 1° novembre anche se prenotata il 31 ottobre. I registri giornalieri si eliminano dopo tre mesi, gli archivi mensili dopo due anni. La PWA carica i conteggi soltanto quando si apre “Riepilogo mensile” e le frecce leggono il mese selezionato; sotto i tre totali appare anche la somma dei pasti per ospiti/invitati. La procedura di autenticazione gratuita, i permessi, le quote e il recupero sono descritti in [riepilogo mensile cucina](kitchen-monthly-totals.md).

Il job pianificato gira alle 19:05, 20:05, 21:05, 22:05 e 23:05 UTC per coprire i quattro fusi supportati e l'ora legale/solare; GitHub può comunque ritardare le esecuzioni. Verificare in **Actions > Kitchen monthly totals** che le esecuzioni siano riuscite. Per un recupero controllato usare `workflow_dispatch`; il job non sovrascrive un registro giornaliero già salvato e ritenta le ultime sette date.

## Calendario

La copertura standard è annuale. **Manutenzione > Calendario** mostra la scadenza e consente l’estensione. Modificare fuso o orari limite ricalcola le finestre future a lotti, con avanzamento e possibilità di ripresa.

## Controlli prima del rilascio

1. Verificare il worktree e preservare modifiche estranee.
2. Eseguire `npm run predeploy:gate`: include test applicativi, i18n, regole Firestore nell'emulatore e build.
3. Eseguire `git diff --check`.
4. Provare nel browser mobile e desktop i ruoli coinvolti.
5. Creare un commit descrittivo come punto di ritorno.
6. Pubblicare Hosting; includere regole/indici soltanto se cambiati.
7. Verificare gli hash della release pubblica.
8. Eseguire lo smoke test browser post-deploy su desktop e viewport mobile.

Lo smoke test usa un contesto browser temporaneo senza accessi o scritture: controlla l’avvio della shell, gli errori JavaScript non gestiti, la risposta degli asset e il 404 per un asset inesistente. Non è incluso nella build e non sostituisce le prove manuali dei ruoli coinvolti.

## Deploy

Hosting e Firestore:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:firebase"
```

Solo Hosting:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:hosting"
```

Entrambi i comandi di deploy eseguono il gate prima della pubblicazione, poi verificano gli hash pubblici e avviano lo smoke test browser. Per eseguirlo manualmente o contro un sito di anteprima:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run smoke:hosting"
```

Su Windows lo smoke usa Microsoft Edge installato. Su altri sistemi installare prima Chromium con `npx playwright install chromium`. `TAT_SMOKE_BASE_URL` seleziona un sito alternativo; `TAT_SMOKE_CHANNEL` seleziona un browser di sistema installato.

Il wrapper Firebase esegue la build e lancia Firebase dalla cartella del prototipo. `npm run release:verify` resta disponibile per controllare separatamente gli hash.

Il service worker non forza più il riavvio della pagina durante un aggiornamento: prepara la nuova cache e la attiva dopo la chiusura di tutte le finestre/schede dell’app e la successiva riapertura.

## Backup

**Manutenzione > Archivio di sicurezza** produce un JSON con dati personali e operativi. Conservarlo cifrato o in uno spazio ristretto, non inviarlo con canali non protetti e non aggiungerlo a Git.

Il backup comprende dati del centro, persone, prenotazioni, calendario, note, operazioni, presentazione, avatar e audit; esclude password, account Firebase, membership amministrative, sessioni e token/link.

**Carica**, riservato all’amministratore responsabile, accetta una copia dello stesso centro, mostra data e conteggi, richiede la conferma testuale e scarica prima una copia dello stato corrente. Ripristina soltanto configurazione, orari, condivisione contatti, legenda diete, aspetto, lingua e icona. Non modifica persone, prenotazioni, amministratori, password, link o registro.

Ispezione locale senza scritture:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:inspect -- <percorso-backup.json>"
```

## Prova e ripristino completo

Provare sempre prima nell’emulatore:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run test:backup-restore-emulator -- <percorso-backup.json>"
```

Un ripristino reale modifica dati e richiede autorizzazione esplicita, backup preventivo, identificazione esatta del centro e verifica successiva. Non alterare dati di produzione per diagnosticare un problema di interfaccia.

## Ripristino della distribuzione

1. Individuare il commit stabile.
2. Creare un revert tracciabile senza cancellare la cronologia.
3. Rieseguire test e build.
4. Pubblicare Hosting e, se necessario, regole compatibili.
5. Verificare la release.

Firebase Hosting e il commit Git consentono un ripristino riproducibile della distribuzione.
