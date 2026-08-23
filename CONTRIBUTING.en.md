# Contributing to Tutti a tavola

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](CONTRIBUTING.md) [![English](https://img.shields.io/badge/language-English-16615a)](CONTRIBUTING.en.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](CONTRIBUTING.es.md)

Thank you for your interest in the project. Before proposing a change, open a report or write to `rasanfil@gmail.com`, describing the problem, the steps to reproduce it and the expected result.

## Working rules

1. Limit each change to one verifiable objective.
2. Do not place passwords, tokens, operational links, real identifiers or centre backups in the repository.
3. Preserve the independence between resident sessions and Firebase Auth.
4. Apply permissions both in the interface and in Firestore rules.
5. Update every language when adding an interface key.
6. Do not change unrelated graphics or functions without an explicit request.

## Required checks

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm test"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
pwsh.exe -NoLogo -NoProfile -Command "npm run build"
```

Authentication changes must cover at least sign-in, refresh, persistence, logout, view changes and visibility by role. Visual changes must be checked in the browser on desktop and mobile.

## Commits

Use short, descriptive messages, for example:

- `fix(auth): restore session after refresh`
- `feat(kitchen): add diet legend`
- `docs: rewrite project documentation`

Every release must correspond to an identifiable commit so that it can be restored.
