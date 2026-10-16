import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as backupDomain from '../../prototypes/firebase-spark-pwa/public/domain/center-backup.mjs';
import * as policy from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

async function exportHarness({ membership = { status: 'ACTIVE', role: 'OWNER' } } = {}) {
  const center = {
    name: 'Centro sintetico', timezone: 'Europe/Rome', locale: 'it-IT', status: 'ACTIVE',
    reservationCutoffs: { lunch: '10:00' }, calendarCoveredFrom: '2026-10-16',
    calendarCoveredThrough: '2027-10-16', participantContactSharingEnabled: true,
    kitchenDietLegend: ['Standard'], avatarVersion: 'avatar1',
    themePalette: 'blue', appDisplayName: 'Tavola', language: 'it',
    commonPassword: 'synthetic-shared-secret', adminTechnicalUid: 'synthetic-auth-uid',
    adminTechnicalEmail: 'synthetic-auth@example.test', adminPasswordVersion: 9,
    ownerUid: 'synthetic-owner', invitationId: 'synthetic-invite',
    futureAuthenticationMaterial: { value: 'synthetic-future-secret' }
  };
  const collectionsRead = [];
  const rows = {
    participants: [{ id: 'p1', displayName: 'Persona test', signature: 'PT', status: 'ACTIVE' }],
    publicParticipants: [{ id: 'p1', displayName: 'Persona test', signature: 'PT', status: 'ACTIVE' }],
    reservationRules: [{ id: 'rule_p1', participantId: 'p1', status: 'ACTIVE' }],
    mealWindows: Array.from({ length: 1001 }, (_, index) => ({ id: `meal_${index}`, mealDate: '2026-10-16' }))
  };
  const module = await loadBrowserModule('admin-participant-data.js', {
    ...backupDomain, ...policy, db: {}, getCurrentUser: () => ({ uid: 'owner' }),
    getActiveCenterId: () => 'center_synthetic',
    doc: (_db, ...segments) => segments.join('/'),
    getDoc: async path => ({ exists: () => true, data: () => path.endsWith('/admins/owner') ? membership : center }),
    collection: (_db, ...segments) => segments.at(-1),
    query: (name, ...constraints) => ({ name, constraints }),
    orderBy: () => null, limit: () => null, startAfter: cursor => ({ cursor }),
    getDocs: async ({ name, constraints }) => {
      collectionsRead.push(name);
      const cursor = constraints.find(c => c?.cursor)?.cursor;
      const all = rows[name] || [];
      const start = cursor ? all.findIndex(row => row.id === cursor.id) + 1 : 0;
      const page = all.slice(start, start + 1000);
      return { size: page.length, docs: page.map(({ id, ...data }) => ({ id, data: () => data })) };
    }
  }, ['exportCenterData']);
  return { module, center, rows, collectionsRead };
}

test('the actual export serializes restorable settings and data but no authentication material', async () => {
  const run = await exportHarness();
  const backup = JSON.parse(JSON.stringify(await run.module.exportCenterData()));
  assert.equal(backupDomain.inspectCenterBackup(backup, { expectedCenterId: 'center_synthetic' }).valid, true);
  assert.equal(backup.center.name, run.center.name);
  assert.deepEqual(backup.center.reservationCutoffs, run.center.reservationCutoffs);
  assert.deepEqual(backup.center.kitchenDietLegend, run.center.kitchenDietLegend);
  assert.equal(backup.center.avatarVersion, 'avatar1');
  assert.equal(backup.center.appDisplayName, 'Tavola');
  for (const field of ['commonPassword', 'adminTechnicalUid', 'adminTechnicalEmail', 'adminPasswordVersion',
    'ownerUid', 'invitationId', 'futureAuthenticationMaterial']) {
    assert.equal(Object.hasOwn(backup.center, field), false, field);
  }
  assert.doesNotMatch(JSON.stringify(backup), /synthetic-(shared-secret|auth-uid|auth@|owner|invite|future-secret)/);
  assert.deepEqual(backup.documents.participants, run.rows.participants);
  assert.equal(backup.documents.mealWindows.length, 1001);
  assert.equal(backup.totalDocuments, 1004);
  assert.equal(run.collectionsRead.filter(name => name === 'mealWindows').length, 2);
  assert.deepEqual([...new Set(run.collectionsRead)].sort(), [...backupDomain.RESTORABLE_CENTER_COLLECTIONS].sort());
});

test('the actual export checks authorization before reading the center or its collections', async () => {
  for (const membership of [{ status: 'REVOKED', role: 'OWNER' }, { status: 'ACTIVE', role: 'MANAGER' }]) {
    const run = await exportHarness({ membership });
    await assert.rejects(run.module.exportCenterData(), /Esportazione riservata/);
    assert.deepEqual(run.collectionsRead, []);
  }
});
