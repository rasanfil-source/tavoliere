# Operations, release and recovery

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../OPERATIONS.md) [![English](https://img.shields.io/badge/language-English-16615a)](OPERATIONS.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](../es/OPERACIONES.md)

## Operational session management

Entering and leaving the control panel is navigation and does not destroy the session. **Exit** deliberately ends access on the device.

### Lost or unavailable device

Revoking one device requires its token, which is normally unavailable remotely. If there is a risk, the administrator must **temporarily suspend the person**: this revokes known operational credentials and **blocks all of that person’s devices**. After verification, the person can be reactivated and sign in again.

Disabling a centre preserves its data: **the action is not presented as permanent deletion** and must clearly state that the information remains stored.

Operational links must be regenerated when they may have reached unintended recipients.

## Pre-release checks

1. Confirm that the worktree contains only the intended changes.
2. Run tests, i18n validation and rule tests.
3. Run the build and check `git diff --check`.
4. Test the changed paths in a browser on mobile and desktop.
5. Create a descriptive commit as a rollback point.
6. Deploy Hosting; include Firestore only if rules or indexes changed.
7. Verify the hashes served by the public site.

## Deployment

Hosting and rules:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run deploy:firebase"
```

Hosting only:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "node tools/firebase-cli.mjs --config firebase.json --project tavola-comune deploy --only hosting"
```

The wrapper builds before deployment and uses the configuration in `prototypes/firebase-spark-pwa`.

Release verification:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run release:verify"
```

## Backups

From **Maintenance**, the centre owner can download a complete JSON backup. The file contains personal and operational data:

- store it encrypted or in a restricted location;
- do not send it by unprotected email;
- do not add it to Git;
- verify that it is readable before treating it as a valid copy.

Local read-only inspection:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run backup:inspect -- <backup-path.json>"
```

## Recovery test

Test recovery in the emulator first:

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm run test:backup-restore-emulator -- <backup-path.json>"
```

A real recovery changes data and requires explicit authorisation, a prior backup, exact centre identification and subsequent verification. Do not delete or overwrite production data to diagnose an interface problem.

## Returning to an earlier version

1. Identify the previous stable commit.
2. Create a traceable revert without deleting history.
3. Run tests and build again.
4. Redeploy Hosting and, if needed, compatible rules.
5. Verify the public release.

Firebase Hosting also keeps release history, but the Git commit remains the source needed to reconstruct code, tests and documentation exactly.
