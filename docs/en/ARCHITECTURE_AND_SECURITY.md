# Architecture, authentication and security

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-6b7280)](../ARCHITETTURA_E_SICUREZZA.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-16615a)](ARCHITECTURE_AND_SECURITY.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-6b7280)](../es/ARQUITECTURA_Y_SEGURIDAD.md)

**Documentation:** [README](../../README.en.md) · [User guide](USER_GUIDE.md) · [Development](DEVELOPMENT_AND_TESTING.md) · [Operations](OPERATIONS.md)

## Goals and components

Oggi a tavola is a static Firebase Spark PWA: no Cloud Functions and no custom server. Logic runs in the browser, while Firestore rules always provide final authorisation.

`index.html` and CSS provide the accessible shell; `app.js` orchestrates state and rendering; `core/auth-state-machine.mjs` owns Auth transitions; `role-policy.mjs` is the capability matrix; domain modules isolate participants, kitchen, daily operations, administration, calendar and summaries; `i18n` provides catalogues; `refresh-schedule.js` controls adaptive refresh; `firestore.rules` protects data; `sw.js` manages the offline shell; `build-public.mjs` produces `dist`.

## Authentication state machine

```text
signed-out
  ├─ resident restore/login → restoring-resident → resident-ready
  └─ administrator login    → admin-checking      → admin-ready

resident-ready/admin-ready ── navigation ── same authenticated state
any state ── explicit logout → signing-out → signed-out
```

Personal code plus common password creates a resident session. A deputy code plus administrators password adds a limited `MANAGER` authorisation through `viceSessions`. Google or verified email identifies a strong Firebase administrator. Resident/deputy Auth never replaces the primary Firebase session, and an earlier strong session never promotes the current resident. Revisions discard late callbacks; the splash is removed only after role and panel data are definitive.

## Roles and sessions

`OWNER` is the current administrator in charge, not a separate human profile. `ADMIN` is an active/authenticated administrator without administrator management, handover or configuration restore. `MANAGER` is the deputy role. `MANAGE_MASS` is added only by the Person’s liturgical flag.

`accessSessions` supports `PUBLIC`, `PERSONAL` and `KITCHEN`. A personal session lasts up to 30 days and renews during use; it is bound to a revocable personal token with a maximum life of 9,000 days. Links and tokens are centre-bound credentials.

Shared passwords are checked through a secondary Firebase Auth instance using technical identities. Rotating the administrators password changes its version and invalidates previous deputy sessions without replacing the primary administrator account.

## Firestore model

Data lives under `centers/{centerId}`: groups and meal types; private and public participant projections; reservation rules and overrides; precalculated meal windows; daily Mass and health operations; date-specific kitchen notes; admins and invitations; access, deputy sessions and link tokens; presentation and avatar; audit events. Date and centre isolation is enforced by rules and query shape.

The canonical handover is invitation → explicit Accept/Reject → strong identification → `ACTIVE` to `USED` → confirmed transfer. The transaction updates centre, roles, Person/email binding and audit. The outgoing administrator is revoked administratively but retains their Person. Deputies never use Firebase administrator invitations.

## Diets, appearance and PWA

Base diets use `STANDARD` or numeric tags displayed with `D`; daily health may override them for one or two days. The kitchen legend maps a code to a short operational label.

CSS attributes apply palette and interface style. Local resident preferences win on that device; centre settings remain authoritative in the strong administrative panel. Language catalogues fall back from the selected language to Italian and then embedded minimum strings.

The service worker uses network-first HTML, cache-first versioned assets and stale-while-revalidate app resources. It does not cache Firestore data independently. Updates wait for the next full close/reopen; there is no `skipWaiting` or forced reload.

## Backups and defences

Backups include centre configuration, people, public projections, meals/windows, reservations, notes, daily operations, presentation, avatar and audit. They exclude passwords, Firebase users, `admins` memberships, sessions and tokens/links. Panel upload restores only approved configuration fields.

Defences include verified email, persistence configured before Auth observation, least-privilege rules, expiry/revocation, schema limits, defensive Hosting headers, centre isolation, no secrets in Git and emulator tests for rule changes. Spark’s lack of server functions means calendar recalculation, backups and handover are protected client transactions/batches with revision and resume controls.
