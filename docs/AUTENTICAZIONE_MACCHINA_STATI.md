# Macchina a stati unica dell’autenticazione

Il client mantiene due identità separate:

- la sessione residente/vice, ottenuta da sigla e password e persistita per il dispositivo;
- l’identità Firebase forte dell’amministratore, ottenuta da Google oppure email/password.

Gli eventi Firebase non concedono mai privilegi a una sessione residente. Il
pannello completo è visibile soltanto nello stato `admin-ready`, dopo che la
membership del centro è stata letta e il ruolo è stato verificato. Durante
`admin-checking` il pannello resta atomico e nascosto; ogni esito, compreso un
errore o una risposta superata, chiude sempre lo stato di attesa.

| Stato | Identità valide | Superficie visibile |
| --- | --- | --- |
| `signed-out` | nessuna | accesso residente oppure metodi amministratore |
| `restoring-resident` | ripristino in corso | nessuna azione privilegiata |
| `resident-ready` | residente o vice | prenotazioni; il vice può aprire solo le schede consentite |
| `admin-checking` | Firebase in verifica | nessun pannello/pulsante amministrativo azionabile |
| `admin-ready` | Firebase + membership attiva | Pannello completo secondo il ruolo |
| `signing-out` | revoca in corso | nessuna azione concorrente |

Navigare tra pannello e prenotazioni cambia solo la rotta: non è un logout. Il
logout, invece, invalida il ruolo, annulla le richieste in volo e riporta alla
rotta residente stabile.
