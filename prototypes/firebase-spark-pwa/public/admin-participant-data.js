import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc,
  writeBatch, where, limit, orderBy, runTransaction, startAfter
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20261014b';
import { getActiveCenterId } from './center-context.js?v=20261014b';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20261014b';
import { normalizeKitchenDietLegend } from './diet-legend.mjs?v=20261014b';
import { validateParticipantProfile } from './domain/participant-profile.mjs?v=20261014b';
import { appendAuditEvent, AUDIT_ACTIONS } from './audit-log.js?v=20261014b';
import { assertCurrentRevision, nextRevision, normalizeRevision } from './core/revision.mjs?v=20261014b';
import { CAPABILITIES, hasCapability, normalizeCenterRole } from './role-policy.mjs?v=20261014b';
import { CENTER_BACKUP_SCHEMA_VERSION, RESTORABLE_CENTER_COLLECTIONS, sanitizeCenterBackupDocument } from './domain/center-backup.mjs?v=20261014b';
import { invalidateCenterContactSettingsCache, loadCenterContactSettings } from './center-settings.js?v=20261014b';
import { invalidateParticipantDataCaches, commitWithRetry, createRequestId } from './participant-data.js?v=20261014b';

const ADMIN_DELETE_BATCH_SIZE = 400;

export async function saveAdminParticipant(participantId, profile, { prepareOnly = false } = {}) {
  const normalizedProfile = validateParticipantProfile(profile);
  const kitchenDietLegend = profile.kitchenDietLegend === undefined
    ? null
    : normalizeKitchenDietLegend(profile.kitchenDietLegend);
  const { displayName, signature, initials, groupId, dietTags, phone } = normalizedProfile;
  const expectedRevision = normalizeRevision(profile.expectedRevision);

  const resolvedId = participantId || `participant_${crypto.randomUUID?.() || createRequestId()}`;
  const centerId = getActiveCenterId();
  const centerRef = doc(db, 'centers', centerId);
  const participantRef = doc(db, 'centers', centerId, 'participants', resolvedId);
  const publicParticipantRef = doc(db, 'centers', centerId, 'publicParticipants', resolvedId);
  const ruleRef = doc(db, 'centers', centerId, 'reservationRules', `rule_${resolvedId}`);
  const metadataRef = doc(db, 'centers', centerId, 'participantMetadata', 'current');
  const centerSettings = await loadCenterContactSettings();
  const status = normalizedProfile.active ? 'ACTIVE' : 'DISABLED';
  const common = {
    centerId,
    signature,
    displayName,
    initials,
    groupId,
    dietTags,
    liturgicalRole: normalizedProfile.liturgicalRole,
    viceAdminRole: normalizedProfile.viceAdminRole,
    sortOrder: normalizedProfile.sortOrder,
    status,
    updatedAt: serverTimestamp()
  };
  const write = async (transaction) => {
    // Tutti i salvataggi anagrafici leggono e aggiornano lo stesso documento.
    // Un concorrente provoca il retry, inclusa la query dei duplicati.
    await transaction.get(metadataRef);
    const duplicateSnapshot = await getDocs(query(
      collection(db, 'centers', centerId, 'publicParticipants'),
      where('signature', '==', signature)
    ));
    if (duplicateSnapshot.docs.some((item) => item.id !== resolvedId)) {
      throw new Error('Questa sigla è già utilizzata');
    }
    const participantSnapshot = await transaction.get(participantRef);
    const ruleSnapshot = participantId ? await transaction.get(ruleRef) : null;
    if (participantId && !participantSnapshot.exists()) {
      const error = new Error('La persona non esiste più. Aggiorna l’elenco.');
      error.code = 'aborted';
      throw error;
    }
    const currentRevision = assertCurrentRevision(
      participantSnapshot.data()?.revision,
      expectedRevision
    );
    const revision = nextRevision(currentRevision);
    const existingRule = ruleSnapshot?.exists() ? ruleSnapshot.data() : {};

    transaction.set(metadataRef, { centerId, updatedAt: serverTimestamp() }, { merge: true });
    const centerUpdate = {};
    if (participantSnapshot.data()?.viceAdminRole === true && normalizedProfile.viceAdminRole !== true) {
      centerUpdate.adminPasswordRotationRequired = true;
    }
    if (kitchenDietLegend !== null) {
      centerUpdate.kitchenDietLegend = kitchenDietLegend;
    }
    if (Object.keys(centerUpdate).length > 0) {
      transaction.set(centerRef, {
        ...centerUpdate,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    transaction.set(participantRef, {
      ...common,
      revision,
      phone,
      phoneConsent: Boolean(normalizedProfile.phoneConsent && phone),
      whatsappEnabled: Boolean(normalizedProfile.whatsappEnabled && normalizedProfile.phoneConsent && phone)
    }, { merge: true });
    transaction.set(publicParticipantRef, common, { merge: true });
    transaction.set(ruleRef, {
      centerId,
      participantId: resolvedId,
      groupId,
      dietTags,
      mealTypeIds: existingRule.mealTypeIds || ['breakfast', 'lunch', 'dinner'],
      startsOn: existingRule.startsOn || formatDateId(getDateInTimeZone(centerSettings.timezone)),
      endsOn: existingRule.endsOn ?? null,
      status,
      updatedAt: serverTimestamp()
    }, { merge: true });
    appendAuditEvent(transaction, {
      action: AUDIT_ACTIONS.UPSERT_PARTICIPANT,
      targetType: 'PARTICIPANT',
      targetId: resolvedId,
      summary: participantId ? `Anagrafica aggiornata: ${displayName}` : `Persona aggiunta: ${displayName}`
    });
  };
  const complete = async () => {
    invalidateParticipantDataCaches(resolvedId);
    invalidateCenterContactSettingsCache();
    if (status === 'DISABLED') await deleteParticipantAccessCredentials(centerId, resolvedId);
  };
  if (prepareOnly) return { participantId: resolvedId, write, complete };
  await runTransaction(db, write);
  await complete();
  return resolvedId;
}

export async function assignCenterAdministratorParticipant(participantId, previousParticipantId = '') {
  const centerId = getActiveCenterId();
  const normalizedParticipantId = String(participantId || '').trim();
  if (!normalizedParticipantId) throw new Error('Seleziona la persona da nominare amministratore');

  const participantRef = doc(db, 'centers', centerId, 'publicParticipants', normalizedParticipantId);
  const participantSnapshot = await getDoc(participantRef);
  const participant = participantSnapshot.exists() ? participantSnapshot.data() : {};
  if (participant.status !== 'ACTIVE') {
    throw new Error('La persona scelta deve essere attiva');
  }

  await setDoc(doc(db, 'centers', centerId), {
    administratorName: String(participant.displayName || '').trim(),
    administratorSignature: String(participant.signature || '').trim().toUpperCase(),
    administratorParticipantId: normalizedParticipantId,
    updatedAt: serverTimestamp()
  }, { merge: true });
  invalidateCenterContactSettingsCache();
  return {
    participantId: normalizedParticipantId,
    displayName: String(participant.displayName || '').trim(),
    signature: String(participant.signature || '').trim().toUpperCase()
  };
}

export async function setAdminParticipantActiveStatus(participantId, active, expectedRevision) {
  const normalizedId = String(participantId || '').trim();
  if (!normalizedId) {
    throw new Error('Seleziona una persona');
  }
  const centerId = getActiveCenterId();
  const participantRef = doc(db, 'centers', centerId, 'participants', normalizedId);
  const publicParticipantRef = doc(db, 'centers', centerId, 'publicParticipants', normalizedId);
  const ruleRef = doc(db, 'centers', centerId, 'reservationRules', `rule_${normalizedId}`);
  const status = active === true ? 'ACTIVE' : 'DISABLED';
  let displayName = normalizedId;
  let revision = 0;

  await runTransaction(db, async (transaction) => {
    const participantSnapshot = await transaction.get(participantRef);
    const publicParticipantSnapshot = await transaction.get(publicParticipantRef);
    const ruleSnapshot = await transaction.get(ruleRef);
    if (!participantSnapshot.exists()) {
      const error = new Error('La persona non esiste più. Aggiorna l’elenco.');
      error.code = 'aborted';
      throw error;
    }
    const participant = participantSnapshot.data();
    const currentRevision = assertCurrentRevision(
      participant.revision,
      normalizeRevision(expectedRevision)
    );
    revision = nextRevision(currentRevision);
    displayName = String(participant.displayName || normalizedId);

    transaction.set(
      doc(db, 'centers', centerId, 'participantMetadata', 'current'),
      { centerId, updatedAt: serverTimestamp() },
      { merge: true }
    );
    if (participant.viceAdminRole === true && status === 'DISABLED') {
      transaction.set(doc(db, 'centers', centerId), {
        adminPasswordRotationRequired: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    transaction.update(participantRef, { status, revision, updatedAt: serverTimestamp() });
    if (publicParticipantSnapshot.exists()) {
      transaction.update(publicParticipantRef, { status, updatedAt: serverTimestamp() });
    }
    if (ruleSnapshot.exists()) {
      transaction.update(ruleRef, { status, updatedAt: serverTimestamp() });
    }
    appendAuditEvent(transaction, {
      action: AUDIT_ACTIONS.UPSERT_PARTICIPANT,
      targetType: 'PARTICIPANT',
      targetId: normalizedId,
      summary: active === true
        ? `Persona riattivata: ${displayName}`
        : `Persona sospesa: ${displayName}`
    });
  });

  if (status === 'DISABLED') {
    // Lo stato DISABLED blocca immediatamente nuove prenotazioni nelle regole.
    // La revoca fisica delle vecchie sessioni prosegue senza trattenere la UI.
    void deleteParticipantAccessCredentials(centerId, normalizedId).catch((error) => {
      console.warn('Pulizia differita delle credenziali non completata', error);
    });
  }
  invalidateParticipantDataCaches(normalizedId);
  invalidateCenterContactSettingsCache();
  return { participantId: normalizedId, status, revision };
}

export async function deleteAdminParticipant(participantId) {
  const normalizedId = String(participantId || '').trim();
  if (!normalizedId) {
    throw new Error('Seleziona una persona da eliminare');
  }

  const centerId = getActiveCenterId();
  const participantRef = doc(db, 'centers', centerId, 'participants', normalizedId);
  const publicParticipantRef = doc(db, 'centers', centerId, 'publicParticipants', normalizedId);
  const ruleRef = doc(db, 'centers', centerId, 'reservationRules', `rule_${normalizedId}`);
  const [participantSnapshot, publicParticipantSnapshot, ruleSnapshot] = await Promise.all([
    getDoc(participantRef),
    getDoc(publicParticipantRef),
    getDoc(ruleRef)
  ]);

  if (!participantSnapshot.exists()) {
    throw new Error('La persona non esiste più');
  }

  const disableBatch = writeBatch(db);
  disableBatch.update(participantRef, { status: 'DISABLED', updatedAt: serverTimestamp() });
  if (publicParticipantSnapshot.exists()) {
    disableBatch.update(publicParticipantRef, { status: 'DISABLED', updatedAt: serverTimestamp() });
  }
  if (ruleSnapshot.exists()) {
    disableBatch.update(ruleSnapshot.ref, { status: 'DISABLED', updatedAt: serverTimestamp() });
  }
  await commitWithRetry(() => disableBatch.commit());

  // Le credenziali e le prenotazioni collegate diventano leggibili al vice solo
  // dopo questo passaggio: le regole verificano che la persona sia DISABLED.
  const [overrideSnapshot, sessionSnapshot, viceSessionSnapshot] = await Promise.all([
    ...['reservationOverrides', 'accessSessions', 'viceSessions'].map((collectionName) => (
      getDocs(query(
        collection(db, 'centers', centerId, collectionName),
        where('participantId', '==', normalizedId)
      ))
    ))
  ]);
  const ruleRefs = ruleSnapshot.exists() ? [ruleSnapshot.ref] : [];
  const personalTokenRefs = [...new Set(sessionSnapshot.docs.map((item) => (
    String(item.data().tokenId || '').trim()
  )).filter(Boolean))].map((tokenId) => doc(db, 'centers', centerId, 'linkTokens', tokenId));
  const relatedRefs = [
    ...overrideSnapshot.docs.map((item) => item.ref),
    ...sessionSnapshot.docs.map((item) => item.ref),
    ...viceSessionSnapshot.docs.map((item) => item.ref),
    ...personalTokenRefs
  ];
  for (let index = 0; index < relatedRefs.length; index += ADMIN_DELETE_BATCH_SIZE) {
    const batch = writeBatch(db);
    relatedRefs.slice(index, index + ADMIN_DELETE_BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await commitWithRetry(() => batch.commit());
  }

  const finalBatch = writeBatch(db);
  ruleRefs.forEach((ref) => finalBatch.delete(ref));
  finalBatch.delete(participantRef);
  if (publicParticipantSnapshot.exists()) {
    finalBatch.delete(publicParticipantRef);
  }
  finalBatch.set(
    doc(db, 'centers', centerId, 'participantMetadata', 'current'),
    { centerId, updatedAt: serverTimestamp() },
    { merge: true }
  );
  if (participantSnapshot.data().viceAdminRole === true) {
    finalBatch.set(doc(db, 'centers', centerId), {
      adminPasswordRotationRequired: true,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  appendAuditEvent(finalBatch, {
    action: AUDIT_ACTIONS.DELETE_PARTICIPANT,
    targetType: 'PARTICIPANT',
    targetId: normalizedId,
    summary: `Persona eliminata: ${String(participantSnapshot.data().displayName || normalizedId)}`
  });
  await commitWithRetry(() => finalBatch.commit());

  invalidateParticipantDataCaches(normalizedId);
  invalidateCenterContactSettingsCache();
  return relatedRefs.length + ruleRefs.length;
}

async function deleteParticipantAccessCredentials(centerId, participantId) {
  const sessionSnapshot = await getDocs(query(
    collection(db, 'centers', centerId, 'accessSessions'),
    where('participantId', '==', participantId)
  ));
  const tokenRefs = [...new Set(sessionSnapshot.docs.map((item) => (
    String(item.data().tokenId || '').trim()
  )).filter(Boolean))].map((tokenId) => doc(db, 'centers', centerId, 'linkTokens', tokenId));
  const refs = [
    ...sessionSnapshot.docs.map((item) => item.ref),
    ...tokenRefs
  ];
  for (let index = 0; index < refs.length; index += ADMIN_DELETE_BATCH_SIZE) {
    const batch = writeBatch(db);
    refs.slice(index, index + ADMIN_DELETE_BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await commitWithRetry(() => batch.commit());
  }
}

export async function loadMealWindowCoverage() {
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'mealWindows'),
    orderBy('mealDate', 'desc'),
    limit(1)
  ));
  if (snapshot.empty) {
    return { through: null, remainingDays: 0 };
  }

  const through = snapshot.docs[0].data().mealDate || null;
  if (!through) {
    return { through: null, remainingDays: 0 };
  }
  const end = new Date(`${through}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return {
    through,
    remainingDays: Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000))
  };
}

export async function exportCenterData() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Accesso amministratore richiesto');
  }
  const adminSnapshot = await getDoc(doc(db, 'centers', getActiveCenterId(), 'admins', user.uid));
  const admin = adminSnapshot.exists() ? adminSnapshot.data() : {};
  const role = normalizeCenterRole(admin.role);
  if (admin.status !== 'ACTIVE' || !hasCapability(role, CAPABILITIES.EXPORT_CENTER_DATA)) {
    throw new Error('Esportazione riservata a chi dispone del permesso specifico');
  }
  const collections = RESTORABLE_CENTER_COLLECTIONS;
  const [centerSnapshot, collectionEntries] = await Promise.all([
    getDoc(doc(db, 'centers', getActiveCenterId())),
    Promise.all(collections.map(async (collectionName) => [
      collectionName,
      await readCollectionInPages(collectionName)
    ]))
  ]);
  const center = sanitizeCenterBackupDocument(centerSnapshot.exists() ? centerSnapshot.data() : {});
  const documents = Object.fromEntries(collectionEntries);
  const totalDocuments = collectionEntries.reduce((sum, [, rows]) => sum + rows.length, 0);

  return {
    schemaVersion: CENTER_BACKUP_SCHEMA_VERSION,
    projectId: 'tavola-comune',
    centerId: getActiveCenterId(),
    center,
    exportedAt: new Date().toISOString(),
    totalDocuments,
    counts: Object.fromEntries(Object.entries(documents).map(([key, value]) => [key, value.length])),
    documents
  };
}


async function readCollectionInPages(collectionName) {
  const rows = [];
  let cursor = null;
  while (true) {
    const constraints = [orderBy('__name__'), limit(1000)];
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    const snapshot = await getDocs(query(
      collection(db, 'centers', getActiveCenterId(), collectionName),
      ...constraints
    ));
    snapshot.docs.forEach((docSnap) => rows.push({ id: docSnap.id, ...docSnap.data() }));
    if (snapshot.size < 1000) {
      return rows;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
}
