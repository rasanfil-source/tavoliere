# Security

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](SECURITY.md) [![English](https://img.shields.io/badge/language-English-16615a)](SECURITY.en.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](SECURITY.es.md)

## Reporting a vulnerability

Do not publish sensitive details in a public issue. Write to [rasanfil@gmail.com](mailto:rasanfil@gmail.com), including:

- the affected component;
- the minimum steps to reproduce the problem;
- the possible impact;
- any proposed correction.

Do not send passwords, active tokens or personal data. If a secret has already been exposed, revoke it before sending the report.

## Security boundaries

- The interface hides forbidden actions, but effective authorisation is enforced by Firestore rules.
- Resident sessions and Firebase Auth are independent identities.
- Operational links must be treated as credentials: distribute them only to intended recipients and regenerate them if disclosed.
- Backups must not be added to the repository.
- Administrative accounts should use unique passwords, verified email addresses and two-step verification when available.

For the complete model, see [Architecture, authentication and security](docs/en/ARCHITECTURE_AND_SECURITY.md).
