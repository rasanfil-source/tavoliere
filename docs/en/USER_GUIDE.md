# User guide

[![🇮🇹 Italiano](https://img.shields.io/badge/%F0%9F%87%AE%F0%9F%87%B9-Italiano-6b7280)](../GUIDA_ALL_USO.md) [![🇬🇧 English](https://img.shields.io/badge/%F0%9F%87%AC%F0%9F%87%A7-English-16615a)](USER_GUIDE.md) [![🇪🇸 Español](https://img.shields.io/badge/%F0%9F%87%AA%F0%9F%87%B8-Espa%C3%B1ol-6b7280)](../es/GUIA_DE_USO.md)

**Oggi a tavola** is an installable PWA for breakfast, lunch and dinner reservations in a residential community. Residents and deputies use a personal code; the administrator uses Google or a verified email and password; the kitchen uses a dedicated operational link.

**Documentation:** [README](../../README.en.md) · [Architecture and security](ARCHITECTURE_AND_SECURITY.md) · [Development and testing](DEVELOPMENT_AND_TESTING.md) · [Operations and recovery](OPERATIONS.md)

## Installation and sessions

- **Android/Chrome:** open the centre link and select **Install app** or **Add to Home screen**.
- **Windows/Edge:** select **Apps > Install this site as an app**.

Kitchen has a separate manifest, so Reservations and Kitchen can be installed as distinct apps. Do not delete site data if access must persist. Refreshing, closing and reopening, entering the control panel and returning to reservations are navigation; **Exit** deliberately ends access on the device.

The opening view may be Month or Week. Reopening applies that preference, while a refresh keeps the current view.

## Access and permissions

| Profile | Sign-in | Main functions |
| --- | --- | --- |
| **Resident** | personal code + common password | reservations, Summary, device preferences |
| **Deputy administrator** | personal code + administrators password | resident functions, People, Agenda, Appearance and view/copy/open/share operational links |
| **Administrator** | Google or verified email + personal password | centre configuration and administration |
| **Kitchen** | dedicated kitchen link | operational counts without the full directory |

The centre has one current administrator in charge. The technical `OWNER` role identifies the administrator who may complete a handover; it is not a separate human profile. An authenticated `ADMIN` may exist during an invitation, but only `OWNER` can manage administrators, restore configuration or transfer responsibility.

| Function | Administrator in charge | Active/invited admin | Deputy |
| --- | :---: | :---: | :---: |
| Control panel | ✓ | ✓ | ✓, restricted |
| Configuration and calendar | ✓ | ✓ | — |
| Appearance | ✓ | ✓ | ✓ |
| Add, edit and suspend people | ✓ | ✓ | ✓ |
| Delete residents | ✓ | ✓ | ✓, except another deputy |
| Assign deputy or liturgical role | ✓ | ✓ | — |
| Centre Agenda | ✓ | ✓ | ✓ |
| Mass | only with liturgical role | only with liturgical role | only with liturgical role |
| Use operational links | ✓ | ✓ | ✓ |
| Regenerate links | ✓ | ✓ | — |
| Export backup | ✓ | ✓ | — |
| Restore configuration | ✓ | — | — |
| Activity log | ✓ | ✓ | — |
| Invitations and handover | ✓ | — | — |

The liturgical role is personal and independent from administration; it may also be assigned to a resident.

## Month and Week reservations

**Month** shows breakfast, lunch and dinner for each day. Past or closed meals cannot be edited and today is highlighted. The `M` action changes the month; weekly and meal actions change their corresponding scope. Controls can be placed on the left or right.

**Week** uses one row per day and one column per meal, with actions for a day, meal or the entire week. Its day column follows the side selected for Month. Date ranges automatically realign at midnight and period boundaries.

## Centre Agenda

Available under Week to administrators and deputies; Mass is available only to people with the liturgical role.

- **Guests:** unnamed covers per meal.
- **Sick people:** moved from dining-room covers to separate meal and diet counts.
- **Kitchen notes:** individual messages up to 1,000 characters, shown only on their date.
- **Temporary diet:** replaces the usual diet for one or two days.
- **Mass:** one daily value, managed only through the personal liturgical role.

Each section is saved separately.

## Summary and Kitchen

Summary offers **Today** and **Tomorrow**. **Original** is a compact table, **International** uses one card per meal and **Future** uses an alternative card layout. It includes covers, guests, diets, sick people, Mass and names. Names may appear as full name, code or initials. With both centre sharing and personal consent, tapping a name offers phone and WhatsApp actions; the contact hint disappears after thirty visits on the device.

The Kitchen link creates a revocable technical session tied to the centre. It shows Today and Tomorrow counts, diets, sick people, guests, date-specific notes, Mass and the kitchen diet legend. It refreshes more frequently around operational hours and less often at night, and never exposes the full private directory.

## Diets, Mass and reminders

A base diet is `STANDARD` or a numeric code displayed as `D1`, `D2`, `D3`, etc. The administrator may attach a one- or two-word kitchen label. Summary and People show the code; Kitchen also shows the legend. A multiplier appears only above one (`D3 × 2`, never `D3 × 1`).

Mass management is never inherited from an administrative role. Administrator, deputy or resident must have the liturgical flag on their Person record.

Reminders are local to the device and disabled by default. Once authorised, they warn ten minutes before an unbooked lunch or dinner closes. They can be disabled in Appearance or from the notification.

## Control panel

**Configuration** covers centre identity and icon, launch title/subtitle, timezone, cut-offs in Breakfast–Lunch–Dinner order, contact sharing, administrator details and shared resident/deputy passwords. The administrator’s personal password belongs to Firebase Authentication and is never stored in the centre document.

**People** manages residents and guests together: name, code, initials, group, diet, kitchen label, phone consents, deputy/admin role and liturgical role. Suspension is reversible; permanent deletion also removes linked reservations and access and requires confirmation.

**Operational links** shows read-only Reservation and Kitchen URLs with explicit **Copy**, **Open** and **Share** actions. Regenerating a token invalidates the previous URL.

**Appearance** covers initial view, Original/Elegant/Essential/Future style, palette, Summary and Kitchen layouts, resident labels, control side, language and reminders. In a resident panel these settings apply only to **this device**. Defaults are Month, Essential, Ink, Original Summary and Kitchen, Name labels, controls on the right, Italian and reminders off.

**Administrator** handles invitations, acceptance status and handover. **Maintenance** includes annual calendar coverage, the When–Who–What log, JSON backup, configuration-only restore and project information. Deputies do not see these restricted sections.

## Handover

1. The administrator in charge selects a Person and creates an invitation.
2. The recipient opens it, chooses **Accept** or **Reject**, then identifies with Google or email/password.
3. After acceptance they wait for the transfer.
4. The outgoing administrator selects the successor, types the required confirmation and completes the transfer.
5. The successor’s name, email and Person populate configuration. The new administrator gains control; the outgoing one loses administrative access but retains their Person for meal reservations.

Authentication is not acceptance, and acceptance is not yet transfer.

## Multiple centres and troubleshooting

An administrative account may belong to several centres and select the active one. A separate platform role may create or disable centres while preserving data; normal administrators cannot use it.

- **Old version:** close every app window and site tab, then reopen. Updates activate on the next opening without a forced page reload.
- **Wrong opening view:** save Appearance; reopening uses the preference, refresh keeps the current view.
- **Session not restored:** ensure the browser does not delete site data.
- **No Kitchen/Summary data:** use the complete current centre link.
- **Missing command:** check the role and, for Mass, the personal liturgical flag.
- **No reminders:** check both preference and notification permission.
- **Meal locked:** its cut-off has passed.
- **Offline:** cached information may remain visible, but changes wait for connectivity.
