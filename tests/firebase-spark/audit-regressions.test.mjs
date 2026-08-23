import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');

const app = read('app.js');
const firebaseClient = read('firebase-client.js');
const participantData = read('participant-data.js');
const adminCenter = read('admin-center.js');
const accessLinks = read('access-links.js');
const dailyOperations = read('daily-operations.js');
const kitchenData = read('kitchen-data.js');
const summaryView = read('summary-matrix-view.js');

test('le operazioni dell Auth tecnica secondaria sono serializzate e ripulite', () => {
  assert.match(firebaseClient, /let residentMaintenanceAuthTail = Promise\.resolve\(\)/);
  assert.match(firebaseClient, /async function acquireResidentMaintenanceAuth\(\)/);
  assert.match(firebaseClient, /await previous/);
  assert.match(firebaseClient, /await signOut\(maintenanceAuth\)\.catch/);
  assert.equal(
    [...firebaseClient.matchAll(/const \{ maintenanceAuth, release \} = await acquireResidentMaintenanceAuth\(\)/g)].length,
    5
  );
});

test('una sessione pubblica non viene creata sopra un account forte non autorizzato', () => {
  const ensurePublic = participantData.match(/export async function ensurePublicDemoSession\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(ensurePublic, /const authorizedAdministrator = await getAuthorizedAdministratorUser\(\)/);
  assert.match(ensurePublic, /if \(getStrongAuthenticatedUser\(\)\) \{[\s\S]*Account amministratore non autorizzato/);
});

test('il vice usa solo il ruolo esplicito e una sessione aggiornata', () => {
  const viceLogin = participantData.match(/export async function signInFriendlyViceAdministrator[\s\S]*?\n}/)?.[0] || '';
  const viceRestore = participantData.match(/export async function loadResidentAdministratorAuthorization[\s\S]*?\n}/)?.[0] || '';
  assert.match(viceLogin, /await ensurePublicDemoSession\(\)/);
  assert.match(viceLogin, /participant\.viceAdminRole === true/);
  assert.doesNotMatch(viceLogin, /administratorSignature/);
  assert.match(viceRestore, /passwordVersion === Number\(center\.adminPasswordVersion \|\| 0\)/);
  assert.match(viceRestore, /participant\.viceAdminRole === true/);
  assert.match(viceRestore, /await deleteDoc\(viceSessionRef\)\.catch/);
  assert.doesNotMatch(viceRestore, /administratorSignature/);
  assert.match(app, /canFallbackFromViceLogin\(error\)/);
});

test('le letture opzionali non nascondono i dati principali', () => {
  assert.match(app, /function reportOptionalOperationalRead/);
  assert.match(app, /loadKitchenNote[\s\S]*reportOptionalOperationalRead\('nota cucina'/);
  assert.match(app, /loadDailyOperation[\s\S]*reportOptionalOperationalRead\('Messa'/);
  assert.match(app, /loadDailyHealth[\s\S]*reportOptionalOperationalRead\('dati giornalieri'/);
  assert.match(app, /operationalLinksError[\s\S]*Link operativi temporaneamente non disponibili/);
});

test('la cucina non sovrascrive una sessione Firebase amministrativa persistente', () => {
  const ensureKitchen = kitchenData.match(/export async function ensureKitchenDemoSession\(\)[\s\S]*?\n}/)?.[0] || '';
  const strongUserBranch = ensureKitchen.match(/if \(user && !user\.isAnonymous\) \{[\s\S]*?\n  }\n\s*if \(!user\)/)?.[0] || '';
  assert.match(strongUserBranch, /admins', user\.uid/);
  assert.match(strongUserBranch, /membership\.exists\(\) && membership\.data\(\)\.status === 'ACTIVE'/);
  assert.match(strongUserBranch, /return createKitchenSession\(user\.uid, false\)/);
  assert.doesNotMatch(strongUserBranch, /signOutCurrentUser|signInAnonymousUser/);
  assert.ok(
    ensureKitchen.indexOf("admins', user.uid") < ensureKitchen.indexOf('signInAnonymousUser()'),
    'un account Firebase forte deve essere riconciliato senza autenticazione anonima'
  );
});

test('le cache operative restano confinate al centro attivo', () => {
  assert.match(accessLinks, /const cachedLinksByCenter = new Map\(\)/);
  assert.match(accessLinks, /cachedLinksByCenter\.get\(centerId\)/);
  assert.match(dailyOperations, /entry\?\.centerId === centerId/);
  assert.match(participantData, /entry\.centerId === getActiveCenterId\(\)/);
  assert.match(kitchenData, /mealTypesCache\?\.centerId === centerId/);
  assert.match(kitchenData, /const cacheKey = `\$\{centerId}:\$\{mealDate}`/);
});

test('diete e invitati aggiornano soltanto il proprio campo Firestore', () => {
  const diets = dailyOperations.match(/export async function saveDietAssignments[\s\S]*?\n}/)?.[0] || '';
  const invited = dailyOperations.match(/export async function saveInvitedMeals[\s\S]*?\n}/)?.[0] || '';
  const dietsWrite = diets.match(/await setDoc[\s\S]*?}, \{ merge: true \}\);/)?.[0] || '';
  const invitedWrite = invited.match(/await setDoc[\s\S]*?}, \{ merge: true \}\);/)?.[0] || '';
  assert.match(dietsWrite, /dietAssignments: normalizedAssignments/);
  assert.doesNotMatch(dietsWrite, /\n\s*sickPeople,/);
  assert.match(invitedWrite, /invitedMeals: normalizedInvitedMeals/);
  assert.doesNotMatch(invitedWrite, /dietAssignments/);
});

test('profilo centro, storage locale e testi accessibili non lasciano stati concorrenti', () => {
  assert.match(adminCenter, /await saveAdminProfile\(user, requestedCenterId, existingAccess\.role\)/);
  assert.match(app, /function storeResidentPreferences[\s\S]*?try \{[\s\S]*?localStorage\.setItem[\s\S]*?catch/);
  assert.match(app, /requiredText: t\('dialog\.transferOwnership\.requiredText'\)/);
  assert.doesNotMatch(summaryView, /t\(["']kitchen\.title["']\)/);
  assert.match(summaryView, /t\(["']kitchen\.view\.title["']\)/);
});

test('il backup non esporta password o identita tecniche di autenticazione', () => {
  const sanitizer = participantData.match(/function sanitizeCenterBackupDocument[\s\S]*?\n}/)?.[0] || '';
  assert.match(participantData, /sanitizeCenterBackupDocument\(centerSnapshot\.exists\(\)/);
  assert.match(sanitizer, /delete sanitized\.commonPassword/);
  assert.match(sanitizer, /delete sanitized\.adminTechnicalEmail/);
  assert.match(sanitizer, /delete sanitized\.adminTechnicalUid/);
});
