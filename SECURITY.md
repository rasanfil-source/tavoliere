# Sicurezza

## Segnalare una vulnerabilità

Non pubblicare dettagli sensibili in una issue aperta. Scrivere a [rasanfil@gmail.com](mailto:rasanfil@gmail.com) indicando:

- componente interessato;
- procedura minima per riprodurre il problema;
- impatto possibile;
- eventuale proposta di correzione.

Non inviare password, token attivi o dati personali. Se un segreto è già stato esposto, revocarlo prima di inviare la segnalazione.

## Confini di sicurezza

- L’interfaccia nasconde le azioni non consentite, ma l’autorizzazione effettiva è applicata dalle regole Firestore.
- La sessione residente e Firebase Auth sono identità indipendenti.
- I link operativi vanno trattati come credenziali: devono essere distribuiti solo ai destinatari previsti e rigenerati se divulgati.
- Le copie di sicurezza non devono essere aggiunte al repository.
- Gli account amministrativi devono usare password uniche, email verificata e verifica in due passaggi quando disponibile.

Per il modello completo vedere [Architettura, autenticazione e sicurezza](docs/ARCHITETTURA_E_SICUREZZA.md).

