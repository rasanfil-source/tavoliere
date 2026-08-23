import {
  RESTORABLE_CENTER_COLLECTIONS,
  inspectCenterBackup
} from './center-backup.mjs';

const RESTORABLE_CENTER_FIELDS = Object.freeze([
  'name',
  'timezone',
  'locale',
  'status',
  'reservationCutoffs',
  'calendarCoveredFrom',
  'calendarCoveredThrough',
  'participantContactSharingEnabled',
  'kitchenDietLegend',
  'participantDataUpdatedAt',
  'avatarVersion',
  'createdAt',
  'updatedAt'
]);

export function buildCenterRestorePlan(backup, { expectedCenterId = '' } = {}) {
  const inspection = inspectCenterBackup(backup, { expectedCenterId });
  if (!inspection.valid) {
    const error = new Error('Il backup non supera i controlli preliminari.');
    error.inspection = inspection;
    throw error;
  }

  const centerId = inspection.centerId;
  const operations = [{
    path: `centers/${centerId}`,
    mode: 'merge',
    data: pickFields(backup.center, RESTORABLE_CENTER_FIELDS)
  }];

  for (const collectionName of RESTORABLE_CENTER_COLLECTIONS) {
    for (const row of backup.documents[collectionName] || []) {
      const { id, ...data } = row;
      operations.push({
        path: `centers/${centerId}/${collectionName}/${id}`,
        mode: 'replace',
        data
      });
    }
  }

  return Object.freeze({
    centerId,
    inspection,
    totalWrites: operations.length,
    operations: Object.freeze(operations)
  });
}

function pickFields(source, fields) {
  return Object.fromEntries(fields
    .filter((field) => Object.hasOwn(source, field))
    .map((field) => [field, source[field]]));
}
