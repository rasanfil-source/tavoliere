# Operations, release and recovery

🇮🇹 [![Italiano](https://img.shields.io/badge/Italiano-6b7280)](../OPERATIONS.md) 🇬🇧 [![English](https://img.shields.io/badge/English-16615a)](OPERATIONS.md) 🇪🇸 [![Español](https://img.shields.io/badge/Espa%C3%B1ol-6b7280)](../es/OPERACIONES.md)

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

## Monthly Kitchen totals

Starting 1 November 2026, the [workflow](../../.github/workflows/kitchen-monthly-summary.yml) records daily totals at 23:00 centre-local time, or 21:00 on the last day of a month. It also verifies the actual meal windows. Breakfast belongs to its meal date, even when booked the previous day. The current report remains visible until the next monthly report is ready. Daily logs and archived monthly totals are deleted after three months. The app reads one aggregate only when the Kitchen disclosure is opened. See [monthly Kitchen totals](../kitchen-monthly-totals.md) for the no-cost runner and recovery details.

The job is scheduled at 19:05, 20:05, 21:05, 22:05 and 23:05 UTC to cover the four supported time zones and daylight-saving changes. GitHub may still delay scheduled runs. Check **Actions > Kitchen monthly totals** for failures; use `workflow_dispatch` for recovery. Existing daily logs are not overwritten, and the worker retries the latest seven dates.

## Release checklist and deployment

1. Confirm only intended worktree changes.
2. Run application, i18n and Firestore-rule tests.
3. Build and run `git diff --check`.
4. Test affected roles on mobile and desktop.
5. Record the approved source revision and deployment target.
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

## Recovery

If a production check fails, restore the approved Hosting build and apply the matching Rules and indexes. Rerun verification and confirm the public service. Firestore writes remain independent of Hosting recovery; Git is the reproducible source.
