export const CENTER_BACKUP_SCHEMA_VERSION = 2;

export const RESTORABLE_CENTER_COLLECTIONS = Object.freeze([
  'groups',
  'participants',
  'publicParticipants',
  'mealTypes',
  'mealWindows',
  'reservationRules',
  'reservationOverrides',
  'kitchenNotes',
  'dailyOperations',
  'dailyHealth',
  'assets',
  'auditEvents'
]);

const REQUIRED_COLLECTIONS = Object.freeze([
  'participants',
  'publicParticipants',
  'reservationRules'
]);

export function inspectCenterBackup(backup, { expectedCenterId = '' } = {}) {
  const errors = [];
  const warnings = [];

  if (!isRecord(backup)) {
    return invalidResult(['Il file non contiene un oggetto JSON valido.']);
  }
  if (backup.schemaVersion !== CENTER_BACKUP_SCHEMA_VERSION) {
    errors.push(`Versione backup non supportata: ${String(backup.schemaVersion ?? 'assente')}.`);
  }

  const centerId = String(backup.centerId || '').trim();
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(centerId)) {
    errors.push('Identificativo del centro non valido.');
  }
  if (expectedCenterId && centerId !== expectedCenterId) {
    errors.push(`Il backup appartiene al centro ${centerId || 'non identificato'}, non a ${expectedCenterId}.`);
  }
  if (!isRecord(backup.center)) {
    errors.push('Documento principale del centro assente o non valido.');
  }
  if (!isRecord(backup.documents)) {
    errors.push('Raccolte del centro assenti o non valide.');
    return invalidResult(errors, warnings, centerId);
  }

  const unknownCollections = Object.keys(backup.documents)
    .filter((name) => !RESTORABLE_CENTER_COLLECTIONS.includes(name));
  if (unknownCollections.length > 0) {
    errors.push(`Raccolte non riconosciute: ${unknownCollections.join(', ')}.`);
  }

  const counts = {};
  for (const collectionName of RESTORABLE_CENTER_COLLECTIONS) {
    const rows = backup.documents[collectionName];
    if (rows === undefined) {
      counts[collectionName] = 0;
      if (REQUIRED_COLLECTIONS.includes(collectionName)) {
        errors.push(`Raccolta obbligatoria assente: ${collectionName}.`);
      }
      continue;
    }
    if (!Array.isArray(rows)) {
      errors.push(`La raccolta ${collectionName} non e un elenco.`);
      counts[collectionName] = 0;
      continue;
    }
    counts[collectionName] = rows.length;
    validateRows(collectionName, rows, errors);
  }

  const totalDocuments = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (Number(backup.totalDocuments) !== totalDocuments) {
    errors.push(`Totale dichiarato ${String(backup.totalDocuments)} diverso dai ${totalDocuments} documenti presenti.`);
  }
  validateDeclaredCounts(backup.counts, counts, errors);
  validateParticipantReferences(backup.documents, warnings);

  const exportedAt = new Date(backup.exportedAt || '');
  if (Number.isNaN(exportedAt.getTime())) {
    warnings.push('Data di esportazione assente o non leggibile.');
  }

  return {
    valid: errors.length === 0,
    centerId,
    schemaVersion: backup.schemaVersion,
    exportedAt: Number.isNaN(exportedAt.getTime()) ? null : exportedAt,
    totalDocuments,
    counts,
    errors,
    warnings
  };
}

function validateRows(collectionName, rows, errors) {
  const identifiers = new Set();
  rows.forEach((row, index) => {
    if (!isRecord(row)) {
      errors.push(`${collectionName}[${index}] non e un documento valido.`);
      return;
    }
    const id = String(row.id || '');
    if (!id || id.length > 1500 || id.includes('/')) {
      errors.push(`${collectionName}[${index}] ha un identificativo non valido.`);
      return;
    }
    if (identifiers.has(id)) {
      errors.push(`${collectionName} contiene due documenti con identificativo ${id}.`);
    }
    identifiers.add(id);
  });
}

function validateDeclaredCounts(declaredCounts, actualCounts, errors) {
  if (!isRecord(declaredCounts)) {
    errors.push('Riepilogo dei conteggi assente o non valido.');
    return;
  }
  for (const [collectionName, actualCount] of Object.entries(actualCounts)) {
    if (Number(declaredCounts[collectionName] || 0) !== actualCount) {
      errors.push(`Conteggio non coerente per ${collectionName}.`);
    }
  }
}

function validateParticipantReferences(documents, warnings) {
  const participantIds = new Set((documents.participants || []).map((row) => row.id));
  const publicParticipantIds = new Set((documents.publicParticipants || []).map((row) => row.id));
  const orphanPublicProfiles = [...publicParticipantIds].filter((id) => !participantIds.has(id));
  if (orphanPublicProfiles.length > 0) {
    warnings.push(`${orphanPublicProfiles.length} profili pubblici non hanno la corrispondente persona privata.`);
  }
  const orphanRules = (documents.reservationRules || []).filter((rule) => (
    rule.participantId && !participantIds.has(rule.participantId)
  ));
  if (orphanRules.length > 0) {
    warnings.push(`${orphanRules.length} regole fanno riferimento a persone non presenti nel backup.`);
  }
}

function invalidResult(errors, warnings = [], centerId = '') {
  return {
    valid: false,
    centerId,
    schemaVersion: null,
    exportedAt: null,
    totalDocuments: 0,
    counts: {},
    errors,
    warnings
  };
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
