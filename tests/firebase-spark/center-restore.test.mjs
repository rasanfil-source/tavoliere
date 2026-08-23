import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCenterConfigurationRestore,
  buildCenterRestorePlan
} from '../../prototypes/firebase-spark-pwa/public/domain/center-restore.mjs';

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
    presentationSettings: [{
      id: 'current',
      centerId: 'center_alpha',
      themePalette: 'inchiostro',
      interfaceStyle: 'urban-plus',
      defaultView: 'month',
      summaryLayout: 'classic',
      kitchenLayout: 'classic',
      monthLayout: 'grid',
      monthControlsSide: 'right',
      summaryResidentLabel: 'name',
      language: 'it',
      appDisplayName: 'Oggi a tavola'
    }],
    auditEvents: []
  };
  return {
    schemaVersion: 3,
    centerId: 'center_alpha',
    center: {
      name: 'Centro Alfa',
      timezone: 'Europe/Rome',
      ownerUid: 'uid_da_non_ripristinare',
      participantContactSharingEnabled: true
    },
    exportedAt: '2026-08-10T10:00:00.000Z',
    totalDocuments: 4,
    counts: Object.fromEntries(Object.entries(documents).map(([name, rows]) => [name, rows.length])),
    documents
  };
}

test('il piano ripristina solo dati del centro e preserva identita e amministratori', () => {
  const plan = buildCenterRestorePlan(validBackup(), { expectedCenterId: 'center_alpha' });
  assert.equal(plan.totalWrites, 5);
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

test('il caricamento dal pannello estrae solo configurazione e non identita o dati operativi', () => {
  const backup = validBackup();
  backup.center.kitchenDietLegend = [{ code: '3', label: 'Senza sale' }];
  backup.center.adminEmail = 'da-non-ripristinare@example.test';
  backup.documents.assets = [{ id: 'avatar', dataUrl: 'data:image/png;base64,AAAA' }];
  backup.counts.assets = 1;
  backup.totalDocuments = 5;

  const restore = buildCenterConfigurationRestore(backup, { expectedCenterId: 'center_alpha' });
  assert.equal(restore.settings.name, 'Centro Alfa');
  assert.equal(restore.settings.themePalette, 'inchiostro');
  assert.equal(restore.settings.appDisplayName, 'Oggi a tavola');
  assert.equal(Object.hasOwn(restore.settings, 'monthLayout'), false);
  assert.equal(Object.hasOwn(restore.settings, 'adminEmail'), false);
  assert.equal(restore.avatarDataUrl, 'data:image/png;base64,AAAA');
  assert.deepEqual(restore.kitchenDietLegend, [{ code: '3', label: 'Senza sale' }]);
  assert.equal(restore.inspection.totalDocuments, 5);
});

test('il piano rifiuta un backup destinato a un altro centro', () => {
  assert.throws(
    () => buildCenterRestorePlan(validBackup(), { expectedCenterId: 'center_beta' }),
    (error) => error.inspection?.errors.some((message) => message.includes('center_alpha'))
  );
});
