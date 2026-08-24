# Contribuire a Tutti a tavola

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-16615a)](CONTRIBUTING.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-6b7280)](CONTRIBUTING.en.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-6b7280)](CONTRIBUTING.es.md)

Grazie per l’interesse nel progetto. Prima di proporre una modifica, aprire una segnalazione o [scrivere a HappyDuck](mailto:rasanfil@gmail.com) descrivendo il problema, il percorso per riprodurlo e il risultato atteso.

## Regole di lavoro

1. Limitare ogni modifica a un obiettivo verificabile.
2. Non inserire nel repository password, token, link operativi, identificativi reali o backup del centro.
3. Conservare l’indipendenza tra sessione residente e Firebase Auth.
4. Applicare i permessi sia nell’interfaccia sia nelle regole Firestore.
5. Aggiornare tutte le lingue quando si aggiunge una chiave di interfaccia.
6. Non modificare grafica o funzioni estranee senza una richiesta esplicita.

## Verifiche richieste

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm test"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
pwsh.exe -NoLogo -NoProfile -Command "npm run build"
```

Per modifiche all’autenticazione vanno coperti almeno accesso, refresh, persistenza, logout, cambio vista e visibilità per ruolo. Per modifiche visive verificare desktop e mobile nel browser.

## Commit

Usare messaggi brevi e descrittivi, per esempio:

- `fix(auth): restore session after refresh`
- `feat(kitchen): add diet legend`
- `docs: rewrite project documentation`

Ogni rilascio deve corrispondere a un commit riconoscibile, così da rendere possibile il ripristino.
