# Oggi a tavola

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-6b7280)](README.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-16615a)](README.en.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-6b7280)](README.es.md)

**Oggi a tavola** is an installable web app designed to organise meal reservations in a residential community.

[Open the app](https://tavola-comune.web.app) · [Report an issue](mailto:rasanfil@gmail.com) · [Technical documentation](docs/en/ARCHITECTURE_AND_SECURITY.md)

## What it can do

- reserve breakfast, lunch and dinner in month and week views;
- consult an operational summary without changing reservations;
- show the kitchen covers, diets, celebrations and daily notes;
- manage people, roles, cut-off times, calendar and operational links;
- install the PWA on Android and Windows without publishing it in an app store;
- keep resident sessions persistent without confusing them with administrator authentication.

The app supports multiple centres, while keeping every item of data and every session associated with its own centre.

## Access and responsibilities

| Profile | Sign-in method | Main functions |
| --- | --- | --- |
| Resident | Personal code and common password | Reservations and device preferences |
| Deputy administrator | Personal code and administrators password | People, operational links and delegated functions |
| Administrator | Google or verified email and password | Full control, configuration, operational management and transfer of the appointment |
| Kitchen | Centre operational link | Kitchen data without the full resident directory |

Each centre has one administrator. Transferring the appointment replaces the current administrator with the new one; it does not create a separate “centre owner” profile.

The liturgical role is independent of administrative roles and may also be assigned to a resident.

## Default settings

| Setting | Initial value |
| --- | --- |
| Opening view | Month |
| Visual style | Essential |
| Colour palette | Ink |
| Summary view | Original |
| Kitchen view | Original |
| Resident labels in summary | Name |
| Month and week bulk controls | Right |
| Language | Italian |
| Reservation reminders | Disabled on each new device |
| Initial title | Oggi a tavola |
| Subtitle | Per prenotarsi sempre in tempo! |

Personal preferences are stored on the device; centre settings are stored in Firestore according to role permissions.

## Architecture at a glance

The solution uses only services compatible with the free Firebase Spark plan:

- Firebase Hosting for the static PWA;
- Cloud Firestore for configuration and operational data;
- Firebase Authentication for administrators and technical identities;
- a service worker that uses the network as the primary source and the app cache as fallback;
- no Cloud Functions and no Cloud Storage.

The frontend is modular JavaScript without a framework. Firestore rules provide the second authorisation layer and never rely solely on whether a control is visible in the interface.

For details, see [Architecture, authentication and security](docs/en/ARCHITECTURE_AND_SECURITY.md).

## Local setup

Requirements: Node.js `24.12.0`, npm and PowerShell 7 on Windows.

```powershell
git clone https://github.com/rasanfil-source/tavoliere.git
cd tavoliere
npm install
pwsh.exe -NoLogo -NoProfile -Command "node tools/dev-server.mjs"
```

Then open `http://127.0.0.1:4180`.

Do not place real credentials, active operational links or copies of centre data in automated tests.

## Tests and build

```powershell
pwsh.exe -NoLogo -NoProfile -Command "npm test"
pwsh.exe -NoLogo -NoProfile -Command "npm run emulate:firebase-rules"
pwsh.exe -NoLogo -NoProfile -Command "npm run build"
```

Before a release, use the complete gate described in [Development and testing](docs/en/DEVELOPMENT_AND_TESTING.md). Firestore rules must be checked with the emulators before publication.

## Documentation

- [User guide](docs/en/USER_GUIDE.md)
- [Architecture, authentication and security](docs/en/ARCHITECTURE_AND_SECURITY.md)
- [Development and testing](docs/en/DEVELOPMENT_AND_TESTING.md)
- [Operations, release and recovery](docs/en/OPERATIONS.md)
- [Contributing](CONTRIBUTING.en.md)
- [Security reports](SECURITY.en.md)

## Support

<p align="center">
  <img src="prototypes/firebase-spark-pwa/public/icons/happyduck.png" width="88" alt="HappyDuck signature"><br>
  <strong>HappyDuck</strong><br>
  <a href="mailto:rasanfil@gmail.com">Email the developer</a>
</p>

**Oggi a tavola 2026** project.
