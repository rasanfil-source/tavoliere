import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const publicFiles = [
  'app.js',
  'participant-data.js',
  'kitchen-data.js',
  'kitchen-notes.js',
  'bootstrap-demo.js'
].map((name) => ({
  name,
  source: readFileSync(
    new URL(`../../prototypes/firebase-spark-pwa/public/${name}`, import.meta.url),
    'utf8'
  )
}));
const app = publicFiles.find((file) => file.name === 'app.js').source;
const participantData = publicFiles.find((file) => file.name === 'participant-data.js').source;
const kitchenData = publicFiles.find((file) => file.name === 'kitchen-data.js').source;
const accessLinks = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/access-links.js', import.meta.url),
  'utf8'
);
const adminCenter = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/admin-center.js', import.meta.url),
  'utf8'
);
const centerSettings = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/center-settings.js', import.meta.url),
  'utf8'
);
const calendarConfiguration = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/calendar-configuration.js', import.meta.url),
  'utf8'
);
const firestoreRules = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url),
  'utf8'
);
const index = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url),
  'utf8'
);
const kitchenManifest = JSON.parse(readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/manifest-kitchen.webmanifest', import.meta.url),
  'utf8'
));

test('i moduli operativi non dipendono piu da un identificativo demo fisso', () => {
  publicFiles.forEach(({ name, source }) => {
    assert.doesNotMatch(source, /DEMO_CENTER_ID/, name);
    assert.match(source, /getActiveCenterId/, name);
  });
});

test('le identita residenti memorizzate sono separate per centro', () => {
  assert.match(participantData, /getCenterScopedStorageKey\(RESIDENT_SIGNATURE_STORAGE_KEY\)/);
  assert.match(participantData, /getCenterScopedStorageKey\(RESIDENT_PARTICIPANT_STORAGE_KEY\)/);
  assert.match(participantData, /currentSession\.centerId === getActiveCenterId\(\)/);
});

test('il primo accesso amministratore crea centro proprietario e profilo atomici', () => {
  assert.match(adminCenter, /createOwnedCenterId\(user\.uid\)/);
  assert.match(adminCenter, /const batch = writeBatch\(db\)/);
  assert.match(adminCenter, /'centers', centerId, 'admins', user\.uid/);
  assert.match(adminCenter, /batch\.set\(profileRef/);
  assert.match(app, /handleCenterInitialization/);
  assert.match(index, /data-center-initializer-name/);
  assert.match(index, /data-center-initializer-timezone/);
});

test('una identita amministratore puo conservare e scegliere piu centri', () => {
  assert.match(adminCenter, /centerIds: arrayUnion\(centerId\)/);
  assert.match(adminCenter, /centerIds: arrayUnion\(invitation\.centerId\)/);
  assert.match(adminCenter, /listAccessibleAdminCenters/);
  assert.match(app, /renderAdminCenterSwitcher\(access\.availableCenters/);
  assert.match(app, /handleAdminCenterChange/);
  assert.match(index, /data-admin-center-select/);
  assert.match(firestoreRules, /'dailyOperationsPermission', 'centerIds'/);
});

test('l accesso email richiede verifica e il proprietario vede il registro dei centri', () => {
  assert.match(adminCenter, /hasVerifiedAdministratorIdentity/);
  assert.match(adminCenter, /listPlatformCenters/);
  assert.match(index, /data-platform-center-list/);
  assert.match(app, /refreshPlatformCenterList/);
  assert.match(index, /Pannello Proprietario/);
  assert.match(app, /data-platform-invite-center/);
  assert.match(app, /data-platform-deactivate-center/);
  assert.match(app, /state\.platformOwner/);
  assert.match(adminCenter, /PLATFORM_OWNER_EMAIL = 'donraimondo@parrocchiasanteugenio\.it'/);
  assert.match(app, /adminModule\.isPlatformOwnerUser\(user\)/);
  assert.match(app, /adminPanel\.hidden = !isAdmin \|\| state\.platformOwner/);
  assert.match(adminCenter, /status: 'DELETED'/);
});

test('le password degli amministratori restano esclusivamente in Firebase Authentication', () => {
  [app, adminCenter, centerSettings, calendarConfiguration, firestoreRules].forEach((source) => {
    assert.doesNotMatch(source, /adminPasswordText/);
  });
  assert.match(app, /data-platform-reset-password/);
  assert.match(app, /sendAdminPasswordResetEmail/);
  assert.match(app, /Accesso:.*email e password.*Google/s);
});

test('ogni centro genera collegamenti distinti per residenti riepilogo e cucina', () => {
  assert.match(app, /buildOperationalLink\('participant', publicToken, centerId/);
  assert.match(app, /buildOperationalLink\('summary', publicToken, centerId/);
  assert.match(app, /buildOperationalLink\('kitchen', links\.kitchenTokenId, centerId\)/);
  assert.match(index, /data-operational-link-url="pasti"/);
  assert.match(index, /data-operational-link-url="cucina"/);
  assert.match(index, /data-copy-access-link="pasti"/);
  assert.match(index, /data-open-access-link="cucina"/);
  assert.match(index, /data-share-access-link="pasti"/);
  assert.match(index, /data-share-access-link="cucina"/);
  assert.match(index, /data-owner-invitation-generate/);
  assert.match(index, /data-owner-invitation-link/);
  assert.match(app, /createCenterInvitation/);
  assert.match(app, /url\.searchParams\.set\('invite', invitation\.invitationId\)/);
  assert.match(accessLinks, /privateSettings', SETTINGS_DOCUMENT_ID/);
  assert.match(accessLinks, /if \(currentLinks\.publicTokenId && currentLinks\.kitchenTokenId\)/);
  assert.match(accessLinks, /AUDIT_ACTIONS\.ROTATE_OPERATIONAL_LINK/);
  assert.doesNotMatch(index, /data-rotate-operational-link/);
});

test('la PWA cucina ha identita propria e si apre direttamente sui conteggi', () => {
  assert.equal(kitchenManifest.id, '/kitchen-app');
  assert.equal(kitchenManifest.short_name, 'Cucina');
  assert.match(kitchenManifest.start_url, /view=kitchen/);
  assert.equal(kitchenManifest.start_url, '/?view=kitchen');
  assert.doesNotMatch(kitchenData, /KITCHEN_TOKEN_STORAGE_KEY/);
  assert.match(kitchenData, /scope: 'KITCHEN'/);
  assert.match(kitchenData, /centerId: getActiveCenterId\(\)/);
  assert.equal(kitchenManifest.display, 'standalone');
});
