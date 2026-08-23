# Architecture, authentication and security

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../ARCHITETTURA_E_SICUREZZA.md) [![English](https://img.shields.io/badge/language-English-16615a)](ARCHITECTURE_AND_SECURITY.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](../es/ARQUITECTURA_Y_SEGURIDAD.md)

## Goals

The architecture prioritises operational simplicity, persistent sessions, isolation between centres and compatibility with Firebase Spark. The application is a static PWA: application logic runs in the browser and final authorisation is enforced by Firestore rules.

## Components

| Component | Responsibility |
| --- | --- |
| `public/index.html` | Accessible structure for views and control panel |
| `public/app.js` | Orchestration, navigation and rendering |
| `public/core/auth-state-machine.mjs` | Authentication state machine |
| `public/role-policy.mjs` | Centralised role and capability matrix |
| `public/*-data.js` | Domain data access |
| `firestore.rules` | Server-side authorisation |
| `public/sw.js` | App-shell cache and PWA updates |
| `tools/build-public.mjs` | Production of the `dist` directory |

## Authentication state machine

The main states are:

```text
signed-out
  ├─ resident restore/login → restoring-resident → resident-ready
  └─ admin login            → admin-checking     → admin-ready

resident-ready ── panel/reservations navigation ── resident-ready
admin-ready    ── panel/reservations navigation ── admin-ready
any state ── explicit logout → signing-out → signed-out
```

Invariants:

- a personal code and common password create a resident session;
- a deputy code and administrators password create a limited `MANAGER` session;
- Google or verified email identifies a Firebase administrator;
- a resident or deputy session neither clears nor promotes Firebase Auth;
- a previous Firebase session does not grant privileges to the current resident;
- late callbacks are ignored through revisions and request identifiers;
- the control panel is shown only after role reconciliation, preventing flashes of incorrect controls.

## Roles and capabilities

The canonical matrix is in `public/role-policy.mjs`.

- `OWNER`: full control of the centre and transfer of ownership.
- `ADMIN`: complete configuration and operations, excluding ownership transfer.
- `MANAGER`: restricted operational panel, people, adaptations, daily operations and reading operational links.
- `RESIDENT`: reservations and device preferences.

`MANAGE_MASS` is not inherited from an administrative role: it is added only when the person has the liturgical role. Frontend checks never replace Firestore verification.

## Sessions and operational links

Friendly sessions are associated with a centre and device. Persistent personal tokens allow restoration without storing the password in plain text. Summary and kitchen links always include the centre code; their token is a credential and must not be published in documentation or logs.

The kitchen receives operational data rather than the complete directory. Although the content is less sensitive, the link remains revocable and tied to a centre.

## Firestore data

The model is centred on `centers/{centerId}`. Each centre separates:

- configuration and private settings;
- public participants and private data;
- administrators and roles;
- reservations, exceptions and daily operations;
- sessions and access tokens;
- activity log and operational settings.

Administrator invitations are temporary documents with a status, expiry and the identity that consumed them. An ownership transfer must always leave an active owner and requires explicit confirmation.

There is one canonical flow: the owner creates an invitation linked to a Person; the recipient explicitly chooses **Accept** or **Reject**; only then do they identify with Google or email and password; acceptance moves the invitation from `ACTIVE` to `USED`; finally, the owner confirms the transfer, which atomically updates the center, both roles, the invitation and the audit log. Opening an authentication method never means accepting the appointment.

Vice administrators do not use Firebase administrator invitations: their access derives only from signature, administrator password, the Person role and `viceSessions`. Support for the old temporary-password replacement request is confined to reading possible historical records; no current path can create a new one.

## Applied defences

- verified email for password-based administrator access;
- Firebase persistence configured before observing Auth state;
- centralised capabilities and consistent Firestore rules;
- expiry and revocation of sessions and links;
- rule-level schema limits for schedules, profiles and configuration;
- Hosting headers against sniffing, framing and unnecessary permissions;
- network-first cache without independent caching of Firestore data in the service worker;
- backups excluded from the repository.

## Accepted limitations

The Spark plan excludes custom server functions. Some administrative operations are therefore client-initiated Firestore transactions protected by rules. Rule changes always require emulator tests and a review of least privilege.
