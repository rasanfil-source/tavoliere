import test from 'node:test';
import assert from 'node:assert/strict';

import {
  inspectCenterBackup,
  RESTORABLE_CENTER_COLLECTIONS
} from '../../prototypes/firebase-spark-pwa/public/domain/center-backup.mjs';

function createBackup() {
  const documents = Object.fromEntries(RESTORABLE_CENTER_COLLECTIONS.map((name) => [name, []]));
  documents.participants.push({ id: 'person_1', displayName: 'Mario' });
  documents.publicParticipants.push({ id: 'person_1', displayName: 'Mario' });
  documents.reservationRules.push({ id: 'rule_1', participantId: 'person_1' });
  const counts = Object.fromEntries(Object.entries(documents).map(([name, rows]) => [name, rows.length]));
  return {
    schemaVersion: 2,
    centerId: 'center_demo',
    center: { name: 'Centro demo' },
    exportedAt: '2026-08-10T12:00:00.000Z',
    totalDocuments: 3,
    counts,
    documents
  };
}

test('un backup coerente supera la fase di anteprima', () => {
  const report = inspectCenterBackup(createBackup(), { expectedCenterId: 'center_demo' });
  assert.equal(report.valid, true);
  assert.equal(report.totalDocuments, 3);
  assert.deepEqual(report.errors, []);
});

test('il validatore rifiuta centro errato raccolte sconosciute e conteggi falsi', () => {
  const backup = createBackup();
  backup.documents.accessSessions = [{ id: 'session_1' }];
  backup.totalDocuments = 99;
  const report = inspectCenterBackup(backup, { expectedCenterId: 'altro_centro' });

  assert.equal(report.valid, false);
  assert.match(report.errors.join(' '), /non a altro_centro/);
  assert.match(report.errors.join(' '), /Raccolte non riconosciute: accessSessions/);
  assert.match(report.errors.join(' '), /Totale dichiarato 99/);
});

test('il validatore segnala riferimenti orfani senza nasconderli', () => {
  const backup = createBackup();
  backup.documents.publicParticipants.push({ id: 'person_missing' });
  backup.documents.reservationRules.push({ id: 'rule_missing', participantId: 'person_missing' });
  backup.counts.publicParticipants = 2;
  backup.counts.reservationRules = 2;
  backup.totalDocuments = 5;
  const report = inspectCenterBackup(backup);

  assert.equal(report.valid, true);
  assert.equal(report.warnings.length, 2);
});
