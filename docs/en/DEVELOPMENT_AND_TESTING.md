# Development and testing

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../SVILUPPO_E_TEST.md) [![English](https://img.shields.io/badge/language-English-16615a)](DEVELOPMENT_AND_TESTING.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](../es/DESARROLLO_Y_PRUEBAS.md)

## Requirements

- Node.js `24.12.0` as specified in `.nvmrc`;
- npm;
- PowerShell 7 on Windows;
- Java 21 for Firebase emulators (the portable runtime in `.tools` is also supported).

## Installation

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm install"
```

## Local server

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/dev-server.mjs 4180"
```

The server exposes the development build at `http://127.0.0.1:4180`. Use only authorised credentials and centres; never copy real data into fixtures.

## Repository structure

```text
prototypes/firebase-spark-pwa/
  public/      PWA sources
  dist/        generated deployment package
  scripts/     local validators
  firebase.json
  firestore.rules
tests/
  firebase-spark/   application and static tests
  firebase-rules/   rule tests
tools/              build, gate, deploy, backup and release verification
docs/               maintained documentation
```

Do not edit `dist` directly: run the build after changing `public`.

## Main commands

```powershell
# Application suite and translations
pwsh.exe -NoLogo -NoProfile -Command "npm test"

# Frontend only
pwsh.exe -NoLogo -NoProfile -Command "npm run test:firebase"

# i18n catalogue validation
pwsh.exe -NoLogo -NoProfile -Command "npm run test:i18n"

# Firestore rules with emulators
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"

# Production build
pwsh.exe -NoLogo -NoProfile -Command "npm run build"

# Pre-release gate
pwsh.exe -NoLogo -NoProfile -Command "npm run predeploy:gate"
```

## Minimum acceptance criteria

For authentication and authorisation, verify:

1. resident with personal code and common password;
2. deputy with personal code and administrators password;
3. administrator with Google;
4. administrator with verified email and password;
5. entering and leaving the control panel;
6. moving from panel to reservations and back;
7. refresh in every state;
8. logout and a new sign-in;
9. closing and reopening the PWA;
10. correct tabs and controls for each role.

For visual changes, check at least one mobile and one desktop width in a browser instead of relying only on static tests.

## Internationalisation

Supported interface languages are Italian, English, French, Spanish and German. Every new key must exist in all catalogues under `public/i18n`. The validator rejects missing keys, empty values and inconsistent placeholders.

Public project documentation is maintained in Italian by default, with complete English and Spanish editions linked by language badges.

## Test data

- Do not store real credentials in code or tests.
- Do not commit URLs containing operational tokens.
- Keep backups and diagnostics only in Git-ignored directories.
- Prefer emulators and synthetic fixtures for destructive tests.
