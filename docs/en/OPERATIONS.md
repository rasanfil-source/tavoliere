# Operations, release and recovery

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-6b7280)](../OPERATIONS.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-16615a)](OPERATIONS.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-6b7280)](../es/OPERACIONES.md)

**Documentation:** [README](../../README.en.md) · [User guide](USER_GUIDE.md) · [Architecture](ARCHITECTURE_AND_SECURITY.md) · [Development](DEVELOPMENT_AND_TESTING.md)

## Live sessions and refresh

Control-panel navigation does not destroy sessions; **Exit** does. `PUBLIC` is the pre-identification scope, `PERSONAL` lasts up to 30 days and renews against a long-lived revocable token, `KITCHEN` is independent, and `viceSessions` adds deputy authority without replacing strong Firebase Auth.

If a device is lost and its token is unavailable, temporarily suspend the Person to revoke known credentials and block all their devices, then reactivate after verification. Regenerate operational links if they may have been disclosed. Disabling a centre preserves its data.

| Centre-local time | Automatic refresh |
| --- | --- |
| 07:00–10:00 and 13:30–17:30 | 5 minutes |
| other daytime hours | 45 minutes |
| 23:00–07:00 | 90 minutes |

Foreground resume and manual refresh may trigger an immediate read. Annual meal-window coverage is extended in **Maintenance > Calendar**; changing timezone or cut-offs recalculates future windows in resumable batches.

## Release checklist and deployment

1. Confirm only intended worktree changes.
2. Run application, i18n and Firestore-rule tests.
3. Build and run `git diff --check`.
4. Test affected roles on mobile and desktop.
5. Create a descriptive rollback commit.
6. Deploy Hosting; add rules/indexes only when changed.
7. Verify public hashes.

```powershell
# Hosting and Firestore
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:firebase"

# Hosting only
pwsh.exe -NoLogo -NoProfile -Command "node tools/firebase-cli.mjs --config firebase.json --project tavola-comune deploy --only hosting"

# Public verification
pwsh.exe -NoLogo -NoProfile -Command "npm run release:verify"
```

The service worker prepares updates silently and activates them after every app window/tab is closed and the app is reopened; it does not forcibly reload the visible page.

## Backup and recovery

The Maintenance JSON contains personal and operational data and must be encrypted/restricted, never sent through an unprotected channel or committed to Git. It includes centre data, people, reservations, calendar, notes, daily operations, presentation, avatar and audit; it excludes passwords, Firebase accounts, administrator memberships, sessions and tokens/links.

**Upload** is limited to the administrator in charge. It validates the same centre, previews date/counts, requires typed confirmation and downloads a fresh safety copy. It restores only configuration, cut-offs, contact sharing, diet legend, appearance, language and icon—not people, reservations, administrators, passwords, links or audit.

```powershell
# Read-only inspection
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:inspect -- <backup-path.json>"

# Full-restore rehearsal in the emulator
pwsh.exe -NoLogo -NoProfile -Command "npm run test:backup-restore-emulator -- <backup-path.json>"
```

A real full restore changes production data and requires explicit authorisation, a prior backup, exact centre identification and post-checks.

## Rollback

Identify the stable commit, create a traceable revert without deleting history, rerun tests/build, redeploy compatible Hosting/rules and verify the public release. Firebase keeps release history, but Git is the reproducible source.
