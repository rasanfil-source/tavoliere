# User guide

[![Italiano](https://img.shields.io/badge/lingua-Italiano-6b7280)](../GUIDA_ALL_USO.md) [![English](https://img.shields.io/badge/language-English-16615a)](USER_GUIDE.md) [![Español](https://img.shields.io/badge/idioma-Espa%C3%B1ol-6b7280)](../es/GUIA_DE_USO.md)

## Installation

The app can be used in a browser or installed as a PWA.

- Android/Chrome: open the centre link and choose **Install app** or **Add to Home screen**.
- Windows/Edge: open the link and choose **Apps > Install this site as an app**.

To keep the session, do not delete site data. A normal refresh or closing the window should not require another sign-in.

## Resident

1. Open the centre reservation link.
2. Enter the personal code and common password.
3. Select or clear meals in the month or week view.
4. Open **Summary** to consult reservations.
5. Open the control panel to change preferences for this device.

The **Exit** command deliberately ends the session. Entering and leaving the control panel is only navigation and must not destroy it.

## Deputy administrator

A deputy signs in with their personal code and the administrators password. They can use delegated functions, including people management and viewing, copying, opening and sharing operational links. They do not automatically acquire functions reserved for the centre owner.

## Administrator and centre owner

Strong sign-in uses Google or a verified email address and password. Depending on the role, the control panel manages:

- centre configuration and identity;
- people and operational roles;
- reservation, summary and kitchen links;
- appearance and preferences;
- calendar, activity log and backup;
- administrator invitations and transfer of ownership.

Inviting a new administrator does not transfer ownership immediately. The person must accept and authenticate; the current owner then completes the transfer using the explicit confirmation provided by the interface.

In **Maintenance > Security archive**, the owner can download a complete JSON copy. **Upload** restores only the configuration of the same centre: the app previews the copy, requires typed confirmation and first downloads the current state. People, reservations, roles, passwords, links and activity history remain unchanged.

## Kitchen

The kitchen link opens a concise view of covers, diets, celebrations and operational notes. Notes are shown only on the day to which they belong. Diet codes are prefixed with `D` and may have a legend configured by the administrator.

## Reminders

Reservation reminders are optional, local to the device and initially disabled. If enabled, they require browser permission and can be disabled in the app settings or from the notification.

## Common problems

- **The version looks old:** close the PWA completely and reopen it; refresh the page once if necessary.
- **The session is not restored:** check that the browser does not delete site data when it closes.
- **A kitchen or summary link does not show data:** ask the administrator for an updated operational link that includes the centre code.
- **A command is unavailable:** check the role used to sign in.
