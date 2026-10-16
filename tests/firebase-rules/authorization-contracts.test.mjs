import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';
import * as profiles from '../../prototypes/firebase-spark-pwa/public/domain/participant-profile.mjs';
import * as revisions from '../../prototypes/firebase-spark-pwa/public/core/revision.mjs';
import * as schedule from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';
import { loadBrowserModule } from '../../tests/helpers/browser-module.mjs';

const center = 'center_audit_synthetic';
const date = new Date(2026, 9, 13, 12);
const dateId = dates.formatDateId(date);
const path = (suffix = '') => `centers/${center}${suffix ? '/' + suffix : ''}`;
const identity = uid => ({ uid, email: uid + '@example.test', isAnonymous: false,
  emailVerified: true, providerData: [{ providerId: 'google.com' }] });
const token = uid => ({ email: uid + '@example.test', email_verified: true,
  firebase: { sign_in_provider: 'google.com' } });
let env;
const dbFor = uid => env.authenticatedContext(uid, token(uid)).firestore();
const future = () => new Date(Date.now() + 86400000 * 7);

test.before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-tat-fixes-20261012', firestore: {
    rules: await readFile(new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url), 'utf8')
  }});
});
test.after(async () => env?.cleanup());
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    const b = firestore.writeBatch(db);
    b.set(firestore.doc(db, path()), { status: 'ACTIVE', timezone: 'Europe/Rome',
      ownerUid: 'owner', administratorSignature: 'OW', commonPassword: 'synthetic-only', adminPasswordVersion: 1 });
    b.set(firestore.doc(db, path('admins/owner')), { role: 'OWNER', status: 'ACTIVE' });
    for (const id of ['person_a', 'person_b', 'vice']) {
      const data = { status: 'ACTIVE', displayName: id, signature: id.toUpperCase(), viceAdminRole: id === 'vice' };
      b.set(firestore.doc(db, path('participants/' + id)), data);
      b.set(firestore.doc(db, path('publicParticipants/' + id)), data);
    }
    await b.commit();
  });
});

test('outsiders cannot list invitations, while a holder can still accept a known invitation', async () => {
  const invitationId = 'a'.repeat(64);
  await env.withSecurityRulesDisabled(async ctx => {
    await firestore.setDoc(firestore.doc(ctx.firestore(), 'adminInvitations', invitationId), {
      centerId: center, participantId: 'person_a', role: 'ADMIN', status: 'ACTIVE',
      createdBy: 'owner', createdAt: new Date(), updatedAt: new Date(), expiresAt: future()
    });
  });
  const db = dbFor('unrelated');
  await assertFails(firestore.getDocs(firestore.query(firestore.collection(db, 'adminInvitations'),
    firestore.where('role', '==', 'ADMIN'), firestore.where('status', '==', 'ACTIVE'),
    firestore.where('expiresAt', '>', new Date(Date.now() + 60000)))));
  const module = await loadBrowserModule('admin-center.js', { ...firestore, db,
    getCurrentUser: () => identity('unrelated'), setActiveCenterId: () => {},
    requiresAdministratorPassword: () => false }, ['acceptAdministratorInvitation']);
  await module.acceptAdministratorInvitation(invitationId, identity('unrelated'));
  assert.equal((await firestore.getDoc(firestore.doc(db, path('admins/unrelated')))).data().role, 'ADMIN');
  assert.equal((await firestore.getDoc(firestore.doc(db, path()))).data().status, 'ACTIVE');
});

test('concurrent creation reserves a signature for only one participant', async () => {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  let count = 0;
  const db = dbFor('owner');
  const audit = await loadBrowserModule('audit-log.js', { ...firestore, db,
    getCurrentUser: () => identity('owner'), getActiveCenterId: () => center,
    getCenterScopedStorageKey: key => key }, ['appendAuditEvent', 'AUDIT_ACTIONS']);
  const make = () => loadBrowserModule('admin-participant-data.js', { ...firestore, ...dates, ...diets,
    ...profiles, ...revisions, ...audit, db, crypto: webcrypto,
    getActiveCenterId: () => center, invalidateCenterContactSettingsCache: () => {},
    invalidateParticipantDataCaches: () => {},
    loadCenterContactSettings: async () => ({ timezone: 'Europe/Rome' }),
    getDocs: async q => {
      const result = await firestore.getDocs(q);
      if (++count === 2) release();
      await barrier;
      return result;
    }
  }, ['saveAdminParticipant']);
  const [a, b] = await Promise.all([make(), make()]);
  const results = await Promise.allSettled([
    a.saveAdminParticipant('', { displayName: 'Synthetic A', signature: 'DUP', active: true }),
    b.saveAdminParticipant('', { displayName: 'Synthetic B', signature: 'DUP', active: true })
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(results.find(r => r.status === 'rejected').reason.message, /sigla/);
  const duplicates = await firestore.getDocs(firestore.query(firestore.collection(db, path('publicParticipants')),
    firestore.where('signature', '==', 'DUP')));
  assert.equal(duplicates.size, 1);
});

async function dailyModule() {
  return loadBrowserModule('daily-operations.js', { ...firestore, ...dates, ...diets,
    db: dbFor('owner'), getActiveCenterId: () => center },
    ['loadDailyHealth', 'saveSickPeople', 'saveInvitedMeals']);
}

test('two operators adding different sick people retain both additions', async () => {
  const [a, b] = await Promise.all([dailyModule(), dailyModule()]);
  const [first, second] = await Promise.all([a.loadDailyHealth(date), b.loadDailyHealth(date)]);
  first.sickPeople.push({ participantId: 'person_a', displayName: 'A' });
  second.sickPeople.push({ participantId: 'person_b', displayName: 'B' });
  await a.saveSickPeople(date, first.sickPeople);
  await b.saveSickPeople(date, second.sickPeople);
  assert.deepEqual((await a.loadDailyHealth(date, { forceRefresh: true })).sickPeople.map(p => p.participantId), ['person_a', 'person_b']);
});

test('saving guests returns current sick data after another operator saved it', async () => {
  const [a, b] = await Promise.all([dailyModule(), dailyModule()]);
  await a.loadDailyHealth(date);
  await b.saveSickPeople(date, [{ participantId: 'person_a', displayName: 'A' }]);
  const view = await a.saveInvitedMeals(date, { lunch: 2 });
  assert.equal(view.sickPeople.length, 1);
  assert.equal((await a.loadDailyHealth(date, { forceRefresh: true })).sickPeople.length, 1);
});


test('an existing vice cannot read private participants or write a disabled center', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await firestore.setDoc(firestore.doc(db, path('viceSessions/vice_uid')), {
      centerId: center, authUid: 'vice_uid', participantId: 'vice', passwordVersion: 1,
      status: 'ACTIVE', expiresAt: future()
    });
    await firestore.updateDoc(firestore.doc(db, path()), { status: 'DISABLED' });
  });
  const db = env.authenticatedContext('vice_uid', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(firestore.getDocs(firestore.collection(db, path('participants'))));
  await assertFails(firestore.setDoc(firestore.doc(db, path('dailyHealth/' + dateId)), {
    centerId: center, dateId, invitedMeals: { lunch: 5 }, updatedAt: firestore.serverTimestamp()
  }));
});

async function configurationHarness() {
  const db = dbFor('owner');
  const audit = await loadBrowserModule('audit-log.js', { ...firestore, db,
    getCurrentUser: () => identity('owner'), getActiveCenterId: () => center,
    getCenterScopedStorageKey: key => key }, ['appendAuditEvent', 'AUDIT_ACTIONS']);
  const participant = await loadBrowserModule('admin-participant-data.js', { ...firestore, ...dates, ...diets,
    ...profiles, ...revisions, ...audit, db, crypto: webcrypto,
    getActiveCenterId: () => center, invalidateCenterContactSettingsCache: () => {},
    invalidateParticipantDataCaches: () => {},
    loadCenterContactSettings: async () => ({ timezone: 'Europe/Rome' }) }, ['saveAdminParticipant']);
  const configuration = await loadBrowserModule('calendar-configuration.js', {
    ...firestore, ...dates, ...schedule, db, getActiveCenterId: () => center,
    getCurrentUser: () => identity('owner')
  }, ['saveCenterConfiguration']);
  return { db, participant, configuration };
}

for (const rewrite of [false, true]) {
  test(`configuration and responsible commit atomically (calendar rewrite: ${rewrite})`, async () => {
    const { db, participant, configuration } = await configurationHarness();
    const cutoffs = schedule.normalizeReservationCutoffs({});
    await env.withSecurityRulesDisabled(async ctx => {
      await firestore.updateDoc(firestore.doc(ctx.firestore(), path()), {
        name: 'Originale', reservationCutoffs: cutoffs, timezone: rewrite ? 'Europe/London' : 'Europe/Rome'
      });
    });
    const input = { name: 'Aggiornato', timezone: 'Europe/Rome', reservationCutoffs: cutoffs,
      administratorName: 'Responsabile', administratorSignature: 'OW', adminEmail: 'owner@example.test',
      participantContactSharingEnabled: true };
    const prepared = await participant.saveAdminParticipant('', { displayName: 'Responsabile', signature: 'OW', active: true }, { prepareOnly: true });
    // Una scrittura negata deve annullare l'intera transazione, comprese le scritture dei partecipanti.
    await assert.rejects(configuration.saveCenterConfiguration({ ...input,
      administratorSave: { ...prepared, write: async transaction => {
        await prepared.write(transaction);
        transaction.set(firestore.doc(db, 'forbidden', 'test'), { synthetic: true });
      } }
    }));
    assert.equal((await firestore.getDoc(firestore.doc(db, path()))).data().name, 'Originale');
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participants/' + prepared.participantId)))).exists(), false);
    await configuration.saveCenterConfiguration({ ...input, administratorSave: prepared });
    const saved = (await firestore.getDoc(firestore.doc(db, path()))).data();
    assert.equal(saved.name, 'Aggiornato');
    assert.equal(saved.administratorParticipantId, prepared.participantId);
    assert.equal((await firestore.getDoc(firestore.doc(db, path('participants/' + prepared.participantId)))).data().signature, 'OW');
  });
}

test('removing a sick person preserves additions made since the editor was opened', async () => {
  const [a, b] = await Promise.all([dailyModule(), dailyModule()]);
  await a.saveSickPeople(date, [{ participantId: 'person_a', displayName: 'A' }]);
  const before = await a.loadDailyHealth(date);
  await b.loadDailyHealth(date);
  await b.saveSickPeople(date, [...before.sickPeople, { participantId: 'person_b', displayName: 'B' }]);
  const saved = await a.saveSickPeople(date, [], { previousPeople: before.sickPeople });
  assert.deepEqual(saved.sickPeople.map(p => p.participantId), ['person_b']);
});
