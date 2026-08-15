# Stato Firebase e prossimi passi

Stato aggiornato: 2026-08-09.

## Implementato

- Un solo progetto Firebase, con dati separati per centro tramite parametro `c`.
- Hosting PWA, Authentication e Firestore compatibili con il piano Spark.
- Accesso residente con sigla e password comune, sessione persistente e identita' bloccata lato Rules dopo la selezione.
- Accesso amministratore con Google oppure email e password verificata.
- Viste `Mese`, `Settimana`, `Oggi a tavola` e `Cucina`.
- Residenti e ospiti assenti per default, prenotazione esplicita e unica funzione di presenza effettiva.
- Disattivazione immediata delle scritture e dei conteggi, compresi vecchi override.
- Conteggi cucina anonimi, diete aggiornate dall'anagrafica corrente e note Oggi/Domani.
- Pannello persone completo con gruppo, dieta, telefono, consenso, WhatsApp, stato, sospensione ed eliminazione definitiva.
- Amministratore e vice gestiscono sempre ammalati, diete giornaliere e note cucina; la gestione delle celebrazioni liturgiche resta un'autorizzazione facoltativa per i vice.
- Inviti monouso separati per nuovi centri e vice amministratori, con isolamento dei dati verificato dalle regole.
- Query override limitate per partecipante e intervallo; dati statici con cache breve e invalidazione delle regole cucina dopo modifiche anagrafiche.
- Scritture multiple con esito numerico esplicito e retry solo per errori temporanei.
- Service worker con navigazione network-first, asset stale-while-revalidate e passaggio automatico alla nuova versione.
- Export amministrativo senza sessioni, token o documenti admin.
- Security headers Hosting e escaping dei dati inseriti nell'HTML.
- Gate pre-deploy su tutti i moduli con 107 test locali; suite reale delle Firestore Rules verificata nell'emulatore con 42 test superati.
- Ripristino residente con lettura diretta del singolo profilo; sessioni, impostazioni centro e dati statici hanno cache dedicate con aggiornamento non bloccante.
- Le selezioni aggiornano subito la UI, non rileggono il calendario dopo ogni scrittura e le griglie usano listener delegati.
- Collegamenti e copertura calendario predisposti fino al 31 dicembre 2031; il rinnovo aggiunge soltanto finestre mancanti in blocchi da 400.

## Decisioni ancora necessarie

1. **Identita' forte.** Sigla e password comune privilegiano semplicita' e non equivalgono a un account individuale forte. L'alternativa e' un utente Firebase distinto per persona.
2. **Ripristino.** L'export e' pronto; l'import deve essere introdotto solo con anteprima, validazione e prova in emulatore.
3. **Lingue.** Italiano resta la lingua unica finche' non viene congelata la microcopy; poi si potranno aggiungere spagnolo, inglese e francese.

La condivisione dei telefoni non e' piu una decisione aperta: i contatti sono
mostrati nel riepilogo soltanto quando il centro abilita la funzione e la
singola persona ha i consensi necessari. La cucina non riceve dati nominativi.

## Controlli Console

1. Verificare che `tavola-comune` resti su Spark e senza billing collegato.
2. Lasciare disattivati Cloud Functions e servizi non usati.
3. Controllare settimanalmente letture e scritture durante i primi mesi e dopo l'avvio di ogni nuovo centro.
4. Valutare App Check inizialmente soltanto in monitor mode.

## Comandi

```powershell
pwsh.exe -NoLogo -NoProfile -Command "Set-Location 'C:\Users\romolo\TAT'; npm.cmd test"
pwsh.exe -NoLogo -NoProfile -Command "Set-Location 'C:\Users\romolo\TAT'; npm.cmd run predeploy:gate"
pwsh.exe -NoLogo -NoProfile -Command "Set-Location 'C:\Users\romolo\TAT'; npm.cmd run firebase -- login --reauth --no-localhost"
pwsh.exe -NoLogo -NoProfile -Command "Set-Location 'C:\Users\romolo\TAT'; npm.cmd run deploy:firebase"
```
