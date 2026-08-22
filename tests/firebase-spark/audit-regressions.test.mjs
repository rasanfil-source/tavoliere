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

test('la cucina non sovrascrive una sessione Firebase amministrativa persistente', () => {
  const ensureKitchen = kitchenData.match(/export async function ensureKitchenDemoSession\(\)[\s\S]*?\n}/)?.[0] || '';
  assert.match(ensureKitchen, /if \(user && !user\.isAnonymous\) \{\s*return user;\s*}/);
  assert.ok(
    ensureKitchen.indexOf('return user;') < ensureKitchen.indexOf('signInAnonymousUser()'),
    'un account Firebase forte deve uscire prima di qualunque autenticazione anonima'
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
