import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';
import * as policy from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';
import * as schedule from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

const centerId = 'center_access_regression';
const otherCenterId = 'center_access_other';
const platformUid = 'kWYvLr1fkKVuhZ8I8HrVivN2ra03';
const identity = uid => ({ uid, email: `${uid}@example.test`, emailVerified: true,
  isAnonymous: false, providerData: [{ providerId: 'google.com' }] });
const token = uid => ({ email: `${uid}@example.test`, email_verified: true,
  firebase: { sign_in_provider: 'google.com' } });
let env;
const dbFor = uid => env.authenticatedContext(uid, token(uid)).firestore();
const membershipPath = (uid, center = centerId) => `centers/${center}/admins/${uid}`;

test.before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-tat-access-20261016', firestore: {
    rules: await readFile(new URL('../../prototypes/firebase-spark-pwa/firestore.rules', import.meta.url), 'utf8')
  }});
});
test.after(async () => env?.cleanup());
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    const batch = firestore.writeBatch(db);
    for (const center of [centerId, otherCenterId]) {
      batch.set(firestore.doc(db, 'centers', center), { status: 'ACTIVE', name: center, ownerUid: 'owner' });
      batch.set(firestore.doc(db, membershipPath('owner', center)), { status: 'ACTIVE', role: 'OWNER' });
      batch.set(firestore.doc(db, membershipPath('target', center)), {
        status: 'ACTIVE', role: 'ADMIN', email: 'target@example.test',
        massPermission: true, dailyOperationsPermission: true
      });
    }
    batch.set(firestore.doc(db, 'adminProfiles', 'target'), { status: 'ACTIVE', role: 'ADMIN',
      centerId, centerIds: [centerId, otherCenterId], email: 'target@example.test' });
    await batch.commit();
  });
});

async function moduleFor(uid) {
  const db = dbFor(uid);
  const user = identity(uid);
  const window = { location: { search: '' },
    localStorage: { getItem: () => null, removeItem() {} },
    sessionStorage: { getItem: () => null, removeItem() {} } };
  const context = await loadBrowserModule('center-context.js', {}, ['createOwnedCenterId']);
  const audit = await loadBrowserModule('audit-log.js', { ...firestore, db,
    getCurrentUser: () => user, getActiveCenterId: () => centerId,
    getCenterScopedStorageKey: key => key }, ['appendAuditEvent', 'AUDIT_ACTIONS']);
  const module = await loadBrowserModule('admin-center.js', {
    ...firestore, ...policy, ...schedule, ...context, ...audit, db, window,
    getCurrentUser: () => user, getActiveCenterId: () => centerId,
    setActiveCenterId: id => id, requiresAdministratorPassword: () => false
  }, ['revokeCenterAdministrator', 'loadAdminCenterAccess', 'initializeAdminCenter']);
  return { db, user, ...module };
}

test('an ordinary center owner revokes membership without reading the private global profile', async () => {
  const owner = await moduleFor('owner');
  await assertFails(firestore.getDoc(firestore.doc(owner.db, 'adminProfiles', 'target')));
  await owner.revokeCenterAdministrator('target');
  const target = await moduleFor('target');
  const membership = (await firestore.getDoc(firestore.doc(owner.db, membershipPath('target')))).data();
  assert.equal(membership.status, 'REVOKED');
  assert.equal(membership.massPermission, false);
  assert.equal(membership.dailyOperationsPermission, false);
  await assertFails(firestore.getDoc(firestore.doc(target.db, membershipPath('target'))));
  await assertFails(firestore.getDoc(firestore.doc(target.db, 'centers', centerId)));
  assert.equal((await firestore.getDoc(firestore.doc(target.db, 'centers', otherCenterId))).data().status, 'ACTIVE');
  const profile = (await firestore.getDoc(firestore.doc(target.db, 'adminProfiles', 'target'))).data();
  assert.equal(profile.status, 'ACTIVE');
  assert.equal(profile.centerId, centerId);
  const access = await target.loadAdminCenterAccess();
  assert.equal(access.active, false);
  assert.equal(access.redirectCenterId, otherCenterId);
  assert.deepEqual(access.availableCenters.map(center => center.centerId), [otherCenterId]);
  await assertFails(firestore.updateDoc(firestore.doc(target.db, membershipPath('target')), { status: 'ACTIVE' }));
  const audit = await firestore.getDocs(firestore.collection(owner.db, 'centers', centerId, 'auditEvents'));
  assert.equal(audit.size, 1);
  assert.equal(audit.docs[0].data().action, 'REVOKE_ADMIN');
});

test('the current owner can revoke a stale former-owner membership', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    await firestore.updateDoc(firestore.doc(ctx.firestore(), membershipPath('target')), { role: 'OWNER' });
  });
  const owner = await moduleFor('owner');
  await owner.revokeCenterAdministrator('target');
  const membership = (await firestore.getDoc(firestore.doc(owner.db, membershipPath('target')))).data();
  assert.equal(membership.status, 'REVOKED');
  assert.equal(membership.role, 'ADMIN');
});

test('an administrator cannot revoke the owner and an owner cannot revoke themself', async () => {
  const target = await moduleFor('target');
  await assert.rejects(target.revokeCenterAdministrator('owner'), /Solo il responsabile/);
  const owner = await moduleFor('owner');
  await assert.rejects(owner.revokeCenterAdministrator('owner'), /Amministratore non valido/);
});

test('center invitations cannot be enumerated, but a known invitation still initializes a center', async () => {
  const invitationId = 'b'.repeat(64);
  await env.withSecurityRulesDisabled(async ctx => {
    await firestore.setDoc(firestore.doc(ctx.firestore(), 'centerInvitations', invitationId), {
      status: 'ACTIVE', createdBy: platformUid, createdAt: new Date(), updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000)
    });
  });
  const invitee = await moduleFor('invitee');
  await assertFails(firestore.getDocs(firestore.query(firestore.collection(invitee.db, 'centerInvitations'),
    firestore.where('status', '==', 'ACTIVE'),
    firestore.where('expiresAt', '>', new Date(Date.now() + 60000)))));
  await assertFails(firestore.getDocs(firestore.collection(invitee.db, 'centerInvitations')));
  assert.equal((await firestore.getDoc(firestore.doc(invitee.db, 'centerInvitations', invitationId))).data().status, 'ACTIVE');
  assert.equal((await firestore.getDocs(firestore.collection(dbFor(platformUid), 'centerInvitations'))).size, 1);
  const initialized = await invitee.initializeAdminCenter({ name: 'Centro invitato', timezone: 'Europe/Rome', invitationId });
  assert.equal(initialized.centerId, `center_invitee_${invitationId.slice(0, 16)}`);
  assert.equal((await firestore.getDoc(firestore.doc(invitee.db, membershipPath('invitee', initialized.centerId)))).data().role, 'OWNER');
  assert.equal((await firestore.getDoc(firestore.doc(invitee.db, 'centers', initialized.centerId))).data().status, 'ACTIVE');
  assert.equal((await firestore.getDoc(firestore.doc(dbFor(platformUid), 'centerInvitations', invitationId))).data().status, 'USED');
  await assertFails(firestore.getDoc(firestore.doc(dbFor('unrelated'), 'centerInvitations', invitationId)));
});
