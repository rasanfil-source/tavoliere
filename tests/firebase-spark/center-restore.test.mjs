import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCenterRestorePlan } from '../../prototypes/firebase-spark-pwa/public/domain/center-restore.mjs';

function validBackup() {
  const documents = {
    groups: [],
    participants: [{ id: 'person_1', centerId: 'center_alpha', name: 'Mario' }],
    publicParticipants: [{ id: 'person_1', centerId: 'center_alpha', displayName: 'Mario' }],
    mealTypes: [],
    mealWindows: [],
    reservationRules: [{ id: 'rule_1', centerId: 'center_alpha', participantId: 'person_1' }],
    reservationOverrides: [],
    kitchenNotes: [],
    dailyOperations: [],
    dailyHealth: [],
    assets: [],
    auditEvents: []
  };
  return {
    schemaVersion: 2,
    centerId: 'center_alpha',
    center: {
      name: 'Centro Alfa',
      timezone: 'Europe/Rome',
      ownerUid: 'uid_da_non_ripristinare',
      participantContactSharingEnabled: true
    },
    exportedAt: '2026-08-10T10:00:00.000Z',
    totalDocuments: 3,
    counts: Object.fromEntries(Object.entries(documents).map(([name, rows]) => [name, rows.length])),
    documents
  };
}

test('il piano ripristina solo dati del centro e preserva identita e amministratori', () => {
  const plan = buildCenterRestorePlan(validBackup(), { expectedCenterId: 'center_alpha' });
  assert.equal(plan.totalWrites, 4);
  assert.deepEqual(plan.operations[0], {
    path: 'centers/center_alpha',
    mode: 'merge',
    data: {
      name: 'Centro Alfa',
      timezone: 'Europe/Rome',
      participantContactSharingEnabled: true
    }
  });
  assert.equal(Object.hasOwn(plan.operations[0].data, 'ownerUid'), false);
  assert.equal(plan.operations.some(({ path }) => path.includes('/admins/')), false);
  assert.equal(plan.operations.some(({ path }) => path.includes('/accessSessions/')), false);
});

test('il piano rifiuta un backup destinato a un altro centro', () => {
  assert.throws(
    () => buildCenterRestorePlan(validBackup(), { expectedCenterId: 'center_beta' }),
    (error) => error.inspection?.errors.some((message) => message.includes('center_alpha'))
  );
});
