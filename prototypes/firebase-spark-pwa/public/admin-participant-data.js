import {
  arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc,
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
import { writeAdministratorDeletionProtection } from './administrator-deletion-protection.js?v=20261014b';

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
  if (participantId && status === 'ACTIVE') {
    const previous = await getDoc(participantRef);
    if (previous.data()?.status === 'DISABLED') await deleteParticipantAccessCredentials(centerId, resolvedId, expectedRevision, signature);
  }
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
    if (participantSnapshot.data()?.viceAdminRole === true && (normalizedProfile.viceAdminRole !== true || status === 'DISABLED')) {
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
  const user = getCurrentUser();
  if (!user || user.isAnonymous) throw new Error('Accesso responsabile richiesto');
  let participant;
  await runTransaction(db, async transaction => {
    const centerRef = doc(db, 'centers', centerId);
    const center = (await transaction.get(centerRef)).data() || {};
    const membershipRef = doc(db, 'centers', centerId, 'admins', user.uid);
    const membership = (await transaction.get(membershipRef)).data() || {};
    const profileRef = doc(db, 'adminProfiles', user.uid);
    const profile = await transaction.get(profileRef);
    participant = (await transaction.get(participantRef)).data() || {};
    await transaction.get(doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection'));
    const linked = await getDocs(query(collection(db, 'centers', centerId, 'admins'), where('participantId', '==', normalizedParticipantId)));
    if (center.ownerUid !== user.uid || membership.role !== 'OWNER' || membership.status !== 'ACTIVE') {
      throw new Error('Solo il responsabile può cambiare la propria Persona');
    }
    let currentId = center.administratorParticipantId || '';
    if (!currentId && center.administratorSignature) {
      const matches = await getDocs(query(collection(db, 'centers', centerId, 'publicParticipants'), where('signature', '==', center.administratorSignature)));
      currentId = matches.docs[0]?.id || '';
    }
    if (currentId !== previousParticipantId) throw new Error('Il responsabile è cambiato. Aggiorna l’elenco.');
    if (participant.status !== 'ACTIVE') throw new Error('La persona scelta deve essere attiva');
    if (linked.docs.some(item => item.id !== user.uid && item.data().status === 'ACTIVE')) throw new Error('Questa persona è già collegata a un amministratore');
    transaction.update(centerRef, {
    administratorName: String(participant.displayName || '').trim(),
    administratorSignature: String(participant.signature || '').trim().toUpperCase(),
    administratorParticipantId: normalizedParticipantId,
    updatedAt: serverTimestamp()
    });
    transaction.update(membershipRef, { participantId: normalizedParticipantId, updatedAt: serverTimestamp() });
    writeAdministratorDeletionProtection(transaction, centerId, user.uid, { ...membership, participantId: normalizedParticipantId });
    if (profile.exists()) transaction.update(profileRef, { centerId, centerIds: arrayUnion(centerId),
      participantId: normalizedParticipantId, role: 'OWNER', status: 'ACTIVE', updatedAt: serverTimestamp() });
  });
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
  if (active === true) {
    const previous = await getDoc(participantRef);
    if (previous.data()?.status === 'DISABLED') await deleteParticipantAccessCredentials(centerId, normalizedId, normalizeRevision(expectedRevision));
  }

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

export async function deleteAdminParticipant(participantId, expectedRevision, { checkOnly = false } = {}) {
  const normalizedId = String(participantId || '').trim();
  if (!normalizedId) {
    throw new Error('Seleziona una persona da eliminare');
  }

  const centerId = getActiveCenterId();
  const participantRef = doc(db, 'centers', centerId, 'participants', normalizedId);
  const publicParticipantRef = doc(db, 'centers', centerId, 'publicParticipants', normalizedId);
  const ruleRef = doc(db, 'centers', centerId, 'reservationRules', `rule_${normalizedId}`);
  const participantSnapshot = await getDoc(participantRef);

  if (!participantSnapshot.exists()) {
    throw new Error('La persona non esiste più');
  }

  let deletionRevision;
  await runTransaction(db, async (disableBatch) => {
    const current = await disableBatch.get(participantRef);
    const currentPublic = await disableBatch.get(publicParticipantRef);
    const currentRule = await disableBatch.get(ruleRef);
    if (!current.exists()) throw new Error('La persona non esiste più');
    await assertParticipantDeletionAllowed(disableBatch, centerId, normalizedId, current.data());
    if (checkOnly) return;
    const revision = assertCurrentRevision(current.data().revision,
      expectedRevision ?? participantSnapshot.data().revision);
    deletionRevision = nextRevision(revision);
    disableBatch.set(doc(db, 'centers', centerId, 'participantMetadata', 'current'),
      { centerId, updatedAt: serverTimestamp() }, { merge: true });
    appendAuditEvent(disableBatch, {
      action: AUDIT_ACTIONS.UPSERT_PARTICIPANT,
      targetType: 'PARTICIPANT',
      targetId: normalizedId,
      summary: `Persona sospesa prima dell’eliminazione: ${String(current.data().displayName || normalizedId)}`
    });
    disableBatch.update(participantRef, { status: 'DISABLED', revision: deletionRevision, updatedAt: serverTimestamp() });
    if (currentPublic.exists()) {
      disableBatch.update(publicParticipantRef, { status: 'DISABLED', updatedAt: serverTimestamp() });
    }
    if (currentRule.exists()) {
      disableBatch.update(ruleRef, { status: 'DISABLED', updatedAt: serverTimestamp() });
    }
  });
  if (checkOnly) return;
  invalidateParticipantDataCaches(normalizedId);

  // Le credenziali e le prenotazioni collegate diventano leggibili al vice solo
  // dopo questo passaggio: le regole verificano che la persona sia DISABLED.
  try {
  await deleteParticipantViceCredentials(centerId, normalizedId, false);
  const [overrideSnapshot, sessionSnapshot, viceSessionSnapshot] = await Promise.all([
    ...['reservationOverrides', 'accessSessions', 'viceSessions'].map((collectionName) => (
      getDocs(query(
        collection(db, 'centers', centerId, collectionName),
        where('participantId', '==', normalizedId)
      ))
    ))
  ]);
  let deletedRuleCount = 0;
  const units = [
    ...overrideSnapshot.docs.map(item => [item.ref]),
    ...viceSessionSnapshot.docs.map(item => [item.ref]),
    ...credentialDeletionUnits(centerId, sessionSnapshot.docs)
  ];
  const chunks = deletionChunks(units);
  const relatedRefs = units.flat();
  // Per registri di grandi dimensioni la pulizia è riprendibile: la scheda resta sospesa
  // fino all'ultimo commit. Ogni blocco controlla revisione e stato per fermarsi
  // se un altro operatore riattiva o modifica la persona.
  while (chunks.length > 1) {
    const chunk = chunks.shift();
    await runTransaction(db, async transaction => {
      const current = await transaction.get(participantRef);
      if (!current.exists()) throw new Error('La persona non esiste più');
      assertCurrentRevision(current.data().revision, deletionRevision);
      if (current.data().status !== 'DISABLED') throw new Error('La persona è stata riattivata. Aggiorna l’elenco prima di eliminarla.');
      chunk.forEach(ref => transaction.delete(ref));
    });
  }

  await runTransaction(db, async (finalBatch) => {
    const current = await finalBatch.get(participantRef);
    const currentPublic = await finalBatch.get(publicParticipantRef);
    const currentRule = await finalBatch.get(ruleRef);
    if (!current.exists()) throw new Error('La persona non esiste più');
    assertCurrentRevision(current.data().revision, deletionRevision);
    if (current.data().status !== 'DISABLED') throw new Error('La persona è stata riattivata. Aggiorna l’elenco prima di eliminarla.');
    (chunks[0] || []).forEach((ref) => finalBatch.delete(ref));
    deletedRuleCount = currentRule.exists() ? 1 : 0;
    if (currentRule.exists()) finalBatch.delete(ruleRef);
    finalBatch.delete(participantRef);
    if (currentPublic.exists()) finalBatch.delete(publicParticipantRef);
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
  });

  invalidateParticipantDataCaches(normalizedId);
  invalidateCenterContactSettingsCache();
  return relatedRefs.length + deletedRuleCount;
  } catch (error) {
    // Il client deve conoscere la sospensione già confermata anche offline.
    error.participantState = { participantId: normalizedId, status: 'DISABLED', revision: deletionRevision };
    invalidateCenterContactSettingsCache();
    throw error;
  }
}

async function assertParticipantDeletionAllowed(transaction, centerId, participantId, participant) {
  const center = (await transaction.get(doc(db, 'centers', centerId))).data() || {};
  const fail = reason => {
    const error = new Error('Participant deletion protected');
    error.code = 'participant-deletion-protected';
    error.deletionProtection = reason;
    throw error;
  };
  if (center.administratorParticipantId === participantId
      || center.administratorSignature && center.administratorSignature === participant.signature) fail('owner');
  // La lettura precede la query: ogni modifica dei collegamenti aggiorna
  // questo documento e provoca il retry prima di sospendere la Persona.
  const metadata = await transaction.get(doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection'));
  if (metadata.data()?.ready !== true) fail('unavailable');
  const accounts = await getDocs(query(
    collection(db, 'centers', centerId, 'administratorDeletionProtection'),
    where('participantId', '==', participantId)
  ));
  const active = accounts.docs.map(item => item.data()).filter(item => item.status === 'ACTIVE');
  if (active.some(item => item.role === 'OWNER')) fail('owner');
  if (active.some(item => item.role === 'ADMIN')) fail('admin');
}

async function participantCleanupGuard(centerId, participantId, expectedRevision, signature = '') {
  const participantRef = doc(db, 'centers', centerId, 'participants', participantId);
  const initial = await getDoc(participantRef);
  const revision = assertCurrentRevision(initial.data()?.revision, expectedRevision ?? normalizeRevision(initial.data()?.revision));
  const guard = async transaction => {
    const current = await transaction.get(participantRef);
    if (!current.exists() || current.data().status !== 'DISABLED') throw new Error('La persona non è più sospesa. Aggiorna l’elenco.');
    assertCurrentRevision(current.data().revision, revision);
    if (signature) {
      await transaction.get(doc(db, 'centers', centerId, 'participantMetadata', 'current'));
      const duplicates = await getDocs(query(collection(db, 'centers', centerId, 'publicParticipants'), where('signature', '==', signature)));
      if (duplicates.docs.some(item => item.id !== participantId)) throw new Error('Questa sigla è già utilizzata');
    }
  };
  await runTransaction(db, guard);
  return guard;
}

async function deleteParticipantAccessCredentials(centerId, participantId, expectedRevision, signature) {
  const guard = await participantCleanupGuard(centerId, participantId, expectedRevision, signature);
  await deleteParticipantViceCredentials(centerId, participantId, true, guard);
  const sessionSnapshot = await getDocs(query(
    collection(db, 'centers', centerId, 'accessSessions'),
    where('participantId', '==', participantId)
  ));
  for (const refs of deletionChunks(credentialDeletionUnits(centerId, sessionSnapshot.docs))) {
    await runTransaction(db, async transaction => {
      await guard(transaction);
      refs.forEach(ref => transaction.delete(ref));
    });
  }
}

async function deleteParticipantViceCredentials(centerId, participantId, deleteSessions = true, guard) {
  guard ||= await participantCleanupGuard(centerId, participantId);
  const [memberships, sessions] = await Promise.all([
    getDocs(query(collection(db, 'centers', centerId, 'admins'),
      where('participantId', '==', participantId), where('role', '==', 'MANAGER'))),
    deleteSessions ? getDocs(query(collection(db, 'centers', centerId, 'viceSessions'), where('participantId', '==', participantId))) : { docs: [] }
  ]);
  for (const item of memberships.docs) {
    // Rileggi la membership per non sovrascrivere una promozione concorrente.
    await runTransaction(db, async transaction => {
      await guard(transaction);
      const current = await transaction.get(item.ref);
      const membership = current.data();
      if (!current.exists() || membership.role !== 'MANAGER' || membership.participantId !== participantId) return;
      transaction.update(item.ref, { status: 'REVOKED', massPermission: false,
        dailyOperationsPermission: false, updatedAt: serverTimestamp() });
      writeAdministratorDeletionProtection(transaction, centerId, item.id, { ...membership, status: 'REVOKED' });
    });
  }
  for (let offset = 0; offset < sessions.docs.length; offset += 100) {
    await runTransaction(db, async transaction => {
      await guard(transaction);
      sessions.docs.slice(offset, offset + 100).forEach(item => transaction.delete(item.ref));
    });
  }
}

function credentialDeletionUnits(centerId, sessions) {
  const units = [], byToken = new Map();
  for (const session of sessions) {
    const tokenId = session.data().scope === 'PERSONAL' ? String(session.data().tokenId || '').trim() : '';
    if (!tokenId) units.push([session.ref]);
    else {
      if (!byToken.has(tokenId)) byToken.set(tokenId, []);
      byToken.get(tokenId).push(session.ref);
    }
  }
  for (const [tokenId, refs] of byToken) {
    // Il token e l'ultima sessione che lo riferisce condividono il commit.
    // Una ripresa non incontra token orfani né token già eliminati da ritrovare.
    units.push(...refs.slice(0, -1).map(ref => [ref]));
    units.push([doc(db, 'centers', centerId, 'linkTokens', tokenId), refs.at(-1)]);
  }
  return units;
}

function deletionChunks(units) {
  const chunks = [];
  for (const unit of units) {
    if (!chunks.length || chunks.at(-1).length + unit.length > ADMIN_DELETE_BATCH_SIZE) chunks.push([]);
    chunks.at(-1).push(...unit);
  }
  return chunks;
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
  const settings = await loadCenterContactSettings();
  const todayId = formatDateId(getDateInTimeZone(settings.timezone));
  const end = new Date(`${through}T12:00:00Z`);
  const today = new Date(`${todayId}T12:00:00Z`);
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
