import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';
import * as reservation from '../../prototypes/firebase-spark-pwa/public/reservation-state.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

let environment;
const center = 'center_flow_test';
const person = 'person_flow_test';
const date = new Date();
date.setDate(date.getDate() + 1);
const dateId = dates.formatDateId(date);
const path = (relative = '') => 'centers/' + center + (relative ? '/' + relative : '');
const adminToken = { email: 'owner@example.test', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
const anonymousToken = { firebase: { sign_in_provider: 'anonymous' } };
const future = () => new Date(Date.now() + 7 * 86400000);
const participant = { participantId: person, groupId: 'group_residenti', dietTags: ['1'] };
const session = (scope, extra = {}) => ({ centerId: center, scope, targetType: scope === 'PERSONAL' ? 'PARTICIPANT' : 'CENTER',
  status: 'ACTIVE', expiresAt: future(), createdAt: firestore.serverTimestamp(), updatedAt: firestore.serverTimestamp(), ...extra });
const initialMeal = (mealDate = dateId, mealTypeId = 'lunch') => ({ mealDate, mealTypeId,
  mealWindowId: mealDate + '_' + mealTypeId, createdAt: null, isOpen: true, effect: 'ABSENT' });
const database = (uid = 'owner') => environment.authenticatedContext(uid, uid === 'owner' ? adminToken : anonymousToken).firestore();

test.before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-tavola-comune-flows', firestore: {
    rules: await readFile(new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url), 'utf8')
  } });
});
test.after(async () => environment?.cleanup());
test.beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batch = firestore.writeBatch(db);
    const put = (relative, value) => batch.set(firestore.doc(db, path(relative)), value);
    put('', { status: 'ACTIVE', participantContactSharingEnabled: true });
    put('admins/owner', { role: 'OWNER', status: 'ACTIVE' });
    for (const [id, phoneConsent] of [[person, false], ['consenting_person', true]]) {
      put('participants/' + id, { status: 'ACTIVE', phoneConsent, phone: '+15550100001', whatsappEnabled: phoneConsent });
      put('publicParticipants/' + id, { status: 'ACTIVE', displayName: id, dietTags: ['1'], groupId: 'group_residenti' });
    }
    put('reservationRules/rule_' + person, { status: 'ACTIVE', participantId: person,
      mealTypeIds: ['breakfast', 'lunch', 'dinner'], startsOn: '2020-01-01', endsOn: null, dietTags: ['1'] });
    for (let day = 0; day < 2; day++) {
      const dayDate = new Date(date);
      dayDate.setDate(dayDate.getDate() + day);
      for (const mealTypeId of ['breakfast', 'lunch', 'dinner']) {
        put('mealWindows/' + dates.formatDateId(dayDate) + '_' + mealTypeId, { status: 'OPEN', closesAt: future() });
      }
    }
    put('linkTokens/public_test', { status: 'ACTIVE', scope: 'PUBLIC', targetType: 'CENTER', expiresAt: future() });
    put('linkTokens/personal_test', { status: 'ACTIVE', scope: 'PERSONAL', targetType: 'PARTICIPANT', participantId: person, expiresAt: future() });
    put('accessSessions/public_user', session('PUBLIC', { tokenId: 'public_test' }));
    for (const uid of ['resident_one', 'resident_two']) put('accessSessions/' + uid, session('PERSONAL', { tokenId: 'personal_test', participantId: person }));
    await batch.commit();
  });
});

async function dailyModule(uid = 'owner') {
  return loadBrowserModule('daily-operations.js', { ...firestore, ...dates, ...diets, db: database(uid),
    getActiveCenterId: () => center }, ['saveInvitedMeals', 'saveDietAssignments', 'saveSickPeople', 'loadDailyHealth']);
}

async function participantModule(uid) {
  return loadBrowserModule('participant-data.js', { ...firestore, ...dates, ...diets, ...reservation,
    db: database(uid), crypto: webcrypto, navigator: { onLine: true }, getActiveCenterId: () => center,
    getCurrentUser: () => ({ uid, isAnonymous: uid !== 'owner' }), isResidentTechnicalEmail: () => false
  }, ['saveParticipantMeal', 'saveParticipantDay', 'saveParticipantMonthSelection', 'listSummaryParticipants']);
}

test('PUBLIC e PERSONAL vedono solo contatti consentiti mentre il gestore conserva la directory', async () => {
  for (const uid of ['public_user', 'resident_one']) {
    const db = database(uid);
    await assertFails(firestore.getDoc(firestore.doc(db, path('participants/' + person))));
    await assertFails(firestore.getDocs(firestore.collection(db, path('participants'))));
    const module = await participantModule(uid);
    const people = await module.listSummaryParticipants({ includeContacts: true });
    assert.equal(people.length, 2);
    assert.equal(people.find((entry) => entry.participantId === person).phone, '');
    assert.equal(people.find((entry) => entry.participantId === 'consenting_person').phone, '+15550100001');
  }
  assert.equal((await firestore.getDocs(firestore.collection(database(), path('participants')))).size, 2);
});

test('la revoca del consenso o della condivisione del centro blocca le letture dei contatti', async () => {
  const db = database('public_user');
  const reference = firestore.doc(db, path('participants/consenting_person'));
  await firestore.getDoc(reference);
  await firestore.updateDoc(firestore.doc(database(), path('participants/consenting_person')), { phoneConsent: false });
  await assertFails(firestore.getDoc(reference));
  assert.equal((await firestore.getDocs(firestore.query(firestore.collection(db, path('participants')),
    firestore.where('phoneConsent', '==', true)))).size, 0);
  await environment.withSecurityRulesDisabled(async (context) => {
    await firestore.updateDoc(firestore.doc(context.firestore(), path()), { participantContactSharingEnabled: false });
  });
  await assertFails(firestore.getDocs(firestore.query(firestore.collection(db, path('participants')),
    firestore.where('phoneConsent', '==', true))));
});

test('la prima dieta si salva senza inizializzare ammalati o invitati', async () => {
  const daily = await dailyModule();
  await daily.saveDietAssignments(date, [{ participantId: person, dietTag: '2' }]);
  const saved = await daily.loadDailyHealth(date, { forceRefresh: true });
  assert.deepEqual(saved.dietAssignments, [{ participantId: person, dietTag: '2' }]);
  assert.deepEqual(saved.sickPeople, []);
  assert.deepEqual(saved.invitedMeals, { breakfast: 0, lunch: 0, dinner: 0 });
});

test('invitati e diete si salvano su giornate nuove e le scritture concorrenti preservano i campi', async () => {
  const [first, second, third] = await Promise.all([dailyModule(), dailyModule(), dailyModule()]);
  await Promise.all([
    first.saveInvitedMeals(date, { lunch: 2 }),
    second.saveDietAssignments(date, [{ participantId: person, dietTag: '2' }]),
    third.saveSickPeople(date, [{ participantId: person, displayName: 'Persona sintetica' }])
  ]);
  const saved = await first.loadDailyHealth(date, { forceRefresh: true });
  assert.equal(saved.invitedMeals.lunch, 2);
  assert.deepEqual(saved.dietAssignments, [{ participantId: person, dietTag: '2' }]);
  assert.equal(saved.sickPeople.length, 1);
});

test('le giornate parziali conservano i vincoli di schema e di ruolo', async () => {
  const module = await dailyModule('resident_one');
  await assertFails(module.saveInvitedMeals(date, { lunch: 2 }));
  const daily = await dailyModule();
  await daily.saveInvitedMeals(date, { lunch: 2 });
  const ref = firestore.doc(database(), path('dailyHealth/' + dateId));
  await assertFails(firestore.updateDoc(ref, { sickPeople: 'invalid', updatedAt: firestore.serverTimestamp() }));
  await assertFails(firestore.updateDoc(ref, { invitedMeals: { lunch: 1000 }, updatedAt: firestore.serverTimestamp() }));
});

test('due dispositivi salvano il primo override conservando data e dieta della prenotazione', async () => {
  const first = await participantModule('resident_one');
  const second = await participantModule('resident_two');
  await first.saveParticipantMeal(participant, initialMeal(), 'PRESENT');
  const ref = firestore.doc(database(), path('reservationOverrides/' + person + '_' + dateId + '_lunch'));
  const original = (await firestore.getDoc(ref)).data();
  await second.saveParticipantMeal({ ...participant, dietTags: ['2'] }, initialMeal(), 'ABSENT');
  const updated = (await firestore.getDoc(ref)).data();
  assert.equal(updated.effect, 'ABSENT');
  assert.ok(updated.createdAt.isEqual(original.createdAt));
  assert.deepEqual(updated.dietTags, ['1']);
});

test('un gruppo di sei prenotazioni recupera un conflitto restando entro i limiti Firestore', async () => {
  const first = await participantModule('resident_one');
  const second = await participantModule('resident_two');
  await first.saveParticipantMeal(participant, initialMeal(), 'PRESENT');
  const days = Array.from({ length: 2 }, (_, offset) => {
    const day = new Date(date);
    day.setDate(day.getDate() + offset);
    return { meals: ['breakfast', 'lunch', 'dinner'].map((type) => initialMeal(dates.formatDateId(day), type)) };
  });
  const result = await second.saveParticipantMonthSelection(participant, days, 'PRESENT');
  assert.deepEqual(result, { requested: 6, saved: 6, failed: 0 });
  assert.equal((await firestore.getDocs(firestore.collection(database(), path('reservationOverrides')))).size, 6);
});

test('il recupero dei conflitti mantiene atomico il giorno e non supera le scadenze', async () => {
  const first = await participantModule('resident_one');
  const second = await participantModule('resident_two');
  await first.saveParticipantMeal(participant, initialMeal(), 'PRESENT');
  await environment.withSecurityRulesDisabled(async (context) => {
    await firestore.updateDoc(firestore.doc(context.firestore(), path('mealWindows/' + dateId + '_dinner')),
      { closesAt: new Date(Date.now() - 60000) });
  });
  await assertFails(second.saveParticipantDay(participant,
    ['breakfast', 'lunch', 'dinner'].map((type) => initialMeal(dateId, type)), 'PRESENT'));
  assert.equal((await firestore.getDocs(firestore.collection(database(), path('reservationOverrides')))).size, 1);
});
