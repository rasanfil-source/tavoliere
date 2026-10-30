import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20261014b';
import { requiresAdministratorPassword } from './domain/administrator-auth.mjs?v=20261014b';
import {
  createOwnedCenterId,
  getActiveCenterId,
  setActiveCenterId
} from './center-context.js?v=20261014b';
import { DEFAULT_RESERVATION_CUTOFFS } from './schedule-utils.mjs?v=20261014b';
import { CAPABILITIES, hasCapability, normalizeCenterRole } from './role-policy.mjs?v=20261014b';
import { appendAuditEvent, AUDIT_ACTIONS } from './audit-log.js?v=20261014b';
import { t } from './i18n/i18n.mjs?v=20261014b';
import { writeAdministratorDeletionProtection, synchronizeAdministratorDeletionProtection } from './administrator-deletion-protection.js?v=20261014b';

const ADMIN_PROFILE_COLLECTION = 'adminProfiles';
const CENTER_INVITATION_COLLECTION = 'centerInvitations';
const ADMIN_INVITATION_COLLECTION = 'adminInvitations';
const INVITATION_ID_PATTERN = /^[a-f0-9]{64}$/;
const INVITATION_LIFETIME_DAYS = 30;
const CENTER_INVITATION_STORAGE_KEY = 'tavolaComune.pendingCenterInvitation';

function isPermissionDeniedError(error) {
  return error?.code === 'permission-denied'
    || error?.code === 'firestore/permission-denied';
}

export const PLATFORM_OWNER_UID = 'kWYvLr1fkKVuhZ8I8HrVivN2ra03';
export const PLATFORM_OWNER_EMAIL = 'donraimondo@parrocchiasanteugenio.it';
const ALLOWED_TIMEZONES = new Set([
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/London'
]);

export function isPlatformOwnerUser(user = getCurrentUser()) {
  if (!user || user.isAnonymous) return false;
  return user.uid === PLATFORM_OWNER_UID
    || (String(user.email || '').toLowerCase() === PLATFORM_OWNER_EMAIL
      && user.emailVerified === true);
}

export async function linkCurrentAdministratorParticipant(participantId, user = getCurrentUser()) {
  const normalizedParticipantId = String(participantId || '').trim();
  if (!db || !user || user.isAnonymous || !normalizedParticipantId) {
    throw new Error('Collegamento amministratore non valido');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || !['OWNER', 'ADMIN'].includes(access.role)) {
    throw new Error('Permesso amministratore richiesto');
  }

  const profileRef = doc(db, ADMIN_PROFILE_COLLECTION, user.uid);
  await runTransaction(db, async batch => {
  await batch.get(doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection'));
  const profileSnapshot = await batch.get(profileRef);
  const center = (await batch.get(doc(db, 'centers', centerId))).data() || {};
  const person = (await batch.get(doc(db, 'centers', centerId, 'publicParticipants', normalizedParticipantId))).data() || {};
  const ownerPerson = center.administratorParticipantId === normalizedParticipantId
    || !center.administratorParticipantId && center.administratorSignature
      && center.administratorSignature === person.signature;
  if (ownerPerson && center.ownerUid !== user.uid) throw new Error('La persona è il responsabile del centro');
  const linked = await getDocs(query(collection(db, 'centers', centerId, 'admins'), where('participantId', '==', normalizedParticipantId)));
  if (linked.docs.some(item => item.id !== user.uid && item.data().status === 'ACTIVE')) {
    throw new Error('Questa persona è già collegata a un amministratore');
  }
  batch.update(doc(db, 'centers', centerId, 'admins', user.uid), {
    participantId: normalizedParticipantId,
    updatedAt: serverTimestamp()
  });
  writeAdministratorDeletionProtection(batch, centerId, user.uid, {
    participantId: normalizedParticipantId, role: access.role, status: 'ACTIVE'
  });
  if (profileSnapshot.exists()) {
    batch.update(profileRef, {
      centerId,
      centerIds: arrayUnion(centerId),
      status: 'ACTIVE',
      role: access.role,
      participantId: normalizedParticipantId,
      updatedAt: serverTimestamp()
    });
  }
  });
}

export async function linkCenterAdministratorParticipant(adminUid, participantId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous || !adminUid || !participantId) throw new Error('Collegamento non valido');
  const centerId = getActiveCenterId();
  const membershipRef = doc(db, 'centers', centerId, 'admins', adminUid);
  await runTransaction(db, async transaction => {
    // Ogni modifica alle membership aggiorna questo documento tramite la funzione di protezione.
    // La lettura prima della query fa ripetere il controllo dei duplicati in caso di assegnazioni concorrenti.
    await transaction.get(doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection'));
    const owner = (await transaction.get(doc(db, 'centers', centerId, 'admins', user.uid))).data() || {};
    const center = (await transaction.get(doc(db, 'centers', centerId))).data() || {};
    const membership = (await transaction.get(membershipRef)).data() || {};
    const person = (await transaction.get(doc(db, 'centers', centerId, 'publicParticipants', participantId))).data() || {};
    const linked = await getDocs(query(collection(db, 'centers', centerId, 'admins'), where('participantId', '==', participantId)));
    if (owner.status !== 'ACTIVE' || owner.role !== 'OWNER' || center.ownerUid !== user.uid) {
      throw new Error('Solo il responsabile può collegare un amministratore');
    }
    if (membership.status !== 'ACTIVE' || membership.role !== 'ADMIN' || person.status !== 'ACTIVE'
        || center.administratorParticipantId === participantId
        || !center.administratorParticipantId && center.administratorSignature && center.administratorSignature === person.signature
        || linked.docs.some(item => item.id !== adminUid && item.data().status === 'ACTIVE')
        || membership.participantId && membership.participantId !== participantId) {
      throw new Error('Collegamento non disponibile. Aggiorna l’elenco.');
    }
    transaction.update(membershipRef, { participantId, updatedAt: serverTimestamp() });
    writeAdministratorDeletionProtection(transaction, centerId, adminUid, { ...membership, participantId });
  });
}

export async function loadAdminCenterAccess(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    return emptyAccess();
  }

  const invitationId = getAdminInvitationId();
  const explicitInvitationId = normalizeInvitationId(
    new URLSearchParams(window.location.search).get('invite')
  );
  // Solo il link aperto esplicitamente prevale sulla membership. Un invito
  // rimasto nello storage non deve riportare ogni volta un amministratore
  // già attivo alla creazione di un nuovo centro.
  if (explicitInvitationId && !isPlatformOwnerUser(user)) {
    const invitation = await loadCenterInvitation(explicitInvitationId);
    if (invitation.active) {
      return {
        ...emptyAccess(),
        centerId: createOwnedCenterId(user.uid, explicitInvitationId.slice(0, 16)),
        invitationId: explicitInvitationId,
        needsInitialization: true
      };
    }
    forgetStoredCenterInvitation();
  }

  const requestedCenterId = getActiveCenterId();
  const profileRef = doc(db, ADMIN_PROFILE_COLLECTION, user.uid);
  const [existingAccess, profileSnapshot] = await Promise.all([
    readCenterAdmin(user, requestedCenterId),
    getDoc(profileRef)
  ]);
  const profileData = profileSnapshot.exists() ? profileSnapshot.data() : {};
  const roleInvitationId = getAdminRoleInvitationId();
  if (roleInvitationId) {
    const roleInvitation = await loadRoleInvitation(roleInvitationId);
    if (roleInvitation.active) {
      return {
        ...emptyAccess(),
        centerId: roleInvitation.centerId,
        invitationPending: true,
        invitationParticipantId: roleInvitation.participantId,
        invitationRole: roleInvitation.role
      };
    }
    if (!existingAccess.active) return { ...emptyAccess(), invitationError: true };
  }
  if (existingAccess.active) {
    if (['OWNER', 'ADMIN'].includes(existingAccess.role)) {
      await synchronizeAdministratorDeletionProtection(requestedCenterId);
    }
    // Il profilo facilita la navigazione; la membership determina i permessi. Il riallineamento del profilo avviene fuori dal percorso critico dell'accesso.
    if (adminProfileNeedsRepair(profileData, user, requestedCenterId, existingAccess.role)) {
      void saveAdminProfile(user, requestedCenterId, existingAccess.role).catch(() => undefined);
    }
    const navigationProfile = {
      ...profileData,
      centerId: requestedCenterId,
      centerIds: [...new Set([
        ...(Array.isArray(profileData.centerIds) ? profileData.centerIds : []),
        requestedCenterId
      ])]
    };
    return {
      ...existingAccess,
      availableCenters: await listAccessibleAdminCenters(
        user,
        navigationProfile,
        new Map([[requestedCenterId, existingAccess]])
      )
    };
  }

  if (profileSnapshot.exists()) {
    const profile = profileData;
    if (profile.status === 'ACTIVE') {
      const availableCenters = await listAccessibleAdminCenters(user, profile);
      const preferredCenter = availableCenters.find((center) => center.centerId === profile.centerId)
        || availableCenters[0];
      if (preferredCenter && preferredCenter.centerId !== requestedCenterId) {
        return {
          ...emptyAccess(),
          centerId: preferredCenter.centerId,
          redirectCenterId: preferredCenter.centerId,
          availableCenters
        };
      }
      if (preferredCenter) {
        const profileAccess = await readCenterAdmin(user, preferredCenter.centerId);
        return { ...profileAccess, availableCenters };
      }
    }
  }

  if (invitationId) {
    const invitation = await loadCenterInvitation(invitationId);
    if (invitation.active) {
      return {
        ...emptyAccess(),
        centerId: createOwnedCenterId(user.uid, invitationId.slice(0, 16)),
        invitationId,
        needsInitialization: true
      };
    }
    forgetStoredCenterInvitation();
    return {
      ...emptyAccess(),
      invitationError: true
    };
  }

  return {
    ...emptyAccess()
  };
}

export async function initializeAdminCenter({ name, timezone, invitationId, adminEmail }, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  if (!hasVerifiedAdministratorIdentity(user)) {
    throw new Error('Conferma il tuo indirizzo email prima di creare il centro');
  }

  const normalizedName = String(name || '').trim();
  if (!normalizedName || normalizedName.length > 120) {
    throw new Error('Inserisci un nome centro valido');
  }
  if (!ALLOWED_TIMEZONES.has(timezone)) {
    throw new Error('Fuso orario non valido');
  }

  const normalizedInvitationId = normalizeInvitationId(invitationId);
  const invitation = normalizedInvitationId
    ? await loadCenterInvitation(normalizedInvitationId)
    : { active: false };
  if (!isPlatformOwnerUser(user) && !invitation.active) {
    throw new Error('Invito non valido o scaduto');
  }

  const profileRef = doc(db, ADMIN_PROFILE_COLLECTION, user.uid);
  const centerId = normalizedInvitationId
    ? createOwnedCenterId(user.uid, normalizedInvitationId.slice(0, 16))
    : createOwnedCenterId(user.uid);
  const existingProfile = await getDoc(profileRef);
  const now = serverTimestamp();
  const administratorPasswordRequired = requiresAdministratorPassword(user);
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', centerId), {
    ownerUid: user.uid,
    name: normalizedName,
    timezone,
    locale: 'it-IT',
    reservationCutoffs: DEFAULT_RESERVATION_CUTOFFS,
    participantContactSharingEnabled: true,
    participantDataUpdatedAt: now,
    ...(normalizedInvitationId ? { invitationId: normalizedInvitationId } : {}),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    administratorName: '',
    administratorSignature: '',
    administratorProfileRequired: true,
    administratorProfileComplete: false,
    administratorPasswordRequired,
    adminEmail: adminEmail || user.email || ''
  });
  batch.set(doc(db, 'centers', centerId, 'admins', user.uid), {
    centerId,
    status: 'ACTIVE',
    email: user.email || '',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    administratorPasswordRequired,
    passwordSetupRequired: false,
    createdAt: now,
    updatedAt: now
  });
  writeAdministratorDeletionProtection(batch, centerId, user.uid, { role: 'OWNER', status: 'ACTIVE' });
  batch.set(doc(db, 'centers', centerId, 'participantMetadata', 'administratorProtection'), {
    ready: true, updatedAt: now
  }, { merge: true });
  batch.set(profileRef, {
    centerId,
    centerIds: arrayUnion(centerId),
    status: 'ACTIVE',
    email: user.email || '',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    ...(!existingProfile.exists() ? { createdAt: now } : {}),
    updatedAt: now
  }, { merge: true });
  if (normalizedInvitationId) {
    batch.set(doc(db, CENTER_INVITATION_COLLECTION, normalizedInvitationId), {
      status: 'USED',
      consumedBy: user.uid,
      centerId,
      consumedAt: now,
      updatedAt: now
    }, { merge: true });
  }
  try {
    await batch.commit();
  } catch (error) {
    error.operationStage = "salvataggio del centro, del responsabile e dell'invito";
    throw error;
  }
  forgetStoredCenterInvitation();
  setActiveCenterId(centerId);
  return { centerId, name: normalizedName, timezone };
}

export function getAdminInvitationId() {
  const fromUrl = normalizeInvitationId(new URLSearchParams(window.location.search).get('invite'));
  if (fromUrl) {
    storePendingCenterInvitation(fromUrl);
    return fromUrl;
  }
  try {
    return normalizeInvitationId(
      window.sessionStorage.getItem(CENTER_INVITATION_STORAGE_KEY)
        || window.localStorage.getItem(CENTER_INVITATION_STORAGE_KEY)
    );
  } catch {
    return '';
  }
}

export function getAdminRoleInvitationId() {
  return normalizeInvitationId(new URLSearchParams(window.location.search).get('adminInvite'));
}

export async function createCenterInvitation(user = getCurrentUser()) {
  if (!db || !isPlatformOwnerUser(user)) {
    throw new Error('Solo il proprietario può creare inviti');
  }
  const invitationId = (crypto.randomUUID() + crypto.randomUUID()).replaceAll('-', '');
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000));
  await setDoc(doc(db, CENTER_INVITATION_COLLECTION, invitationId), {
    status: 'ACTIVE',
    createdBy: user.uid,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { invitationId, expiresAt: expiresAt.toDate() };
}

export async function createPlatformAdministratorInvitation(centerId, user = getCurrentUser()) {
  if (!db || !isPlatformOwnerUser(user)) {
    throw new Error('Solo il proprietario può nominare amministratori di tutti i centri');
  }
  const normalizedCenterId = String(centerId || '').trim();
  if (!normalizedCenterId) throw new Error('Centro non valido');
  const centerSnapshot = await getDoc(doc(db, 'centers', normalizedCenterId));
  if (!centerSnapshot.exists() || centerSnapshot.data().status !== 'ACTIVE') {
    throw new Error('Centro non disponibile');
  }
  return createRoleInvitation({
    centerId: normalizedCenterId,
    participantId: '',
    role: 'ADMIN'
  }, user);
}

export async function deactivatePlatformCenter(centerId, user = getCurrentUser()) {
  if (!db || !isPlatformOwnerUser(user)) {
    throw new Error('Solo il proprietario può disattivare i centri');
  }
  const normalizedCenterId = String(centerId || '').trim();
  if (!normalizedCenterId) throw new Error('Centro non valido');
  const centerRef = doc(db, 'centers', normalizedCenterId);
  const centerSnapshot = await getDoc(centerRef);
  if (!centerSnapshot.exists() || centerSnapshot.data().status !== 'ACTIVE') {
    throw new Error('Centro non disponibile');
  }
  await setDoc(centerRef, {
    status: 'DELETED',
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function listPlatformCenters(user = getCurrentUser()) {
  if (!db || !isPlatformOwnerUser(user)) {
    throw new Error('Solo il proprietario può vedere tutti i centri');
  }
  const snapshot = await getDocs(collection(db, 'centers'));
  return snapshot.docs
    .map((item) => ({
      centerId: item.id,
      name: String(item.data().name || item.id),
      ownerUid: String(item.data().ownerUid || ''),
      status: String(item.data().status || 'ACTIVE'),
      updatedAt: item.data().updatedAt || null,
      administratorName: String(item.data().administratorName || ''),
      administratorSignature: String(item.data().administratorSignature || ''),
      adminEmail: String(item.data().adminEmail || ''),
      administratorPasswordRequired: item.data().administratorPasswordRequired === true
    }))
    .filter((center) => center.status === 'ACTIVE')
    .sort((left, right) => left.name.localeCompare(right.name, 'it'));
}

export async function createAdministratorInvitation(participantId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const normalizedParticipantId = String(participantId || '').trim();
  if (!normalizedParticipantId) {
    throw new Error('Seleziona la persona da nominare amministratore');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || access.role !== 'OWNER') {
    throw new Error('Solo il responsabile può nominare un amministratore');
  }
  return createRoleInvitation({ centerId, participantId: normalizedParticipantId, role: 'ADMIN' }, user);
}

export async function revokeViceAdministratorAccess(participantId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const normalizedParticipantId = String(participantId || '').trim();
  if (!normalizedParticipantId) return;
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || !['OWNER', 'ADMIN'].includes(access.role)) {
    throw new Error('Solo il responsabile o l’amministratore può revocare un vice');
  }
  const [membershipsSnapshot, viceSessionsSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'centers', centerId, 'admins'),
      where('participantId', '==', normalizedParticipantId),
      where('role', '==', 'MANAGER')
    )),
    getDocs(query(
      collection(db, 'centers', centerId, 'viceSessions'),
      where('participantId', '==', normalizedParticipantId)
    ))
  ]);
  const now = serverTimestamp();
  // Blocchi piccoli: ogni membership e il suo indice cambiano insieme.
  for (const item of membershipsSnapshot.docs) {
    const membership = item.data();
    if (membership.role !== 'MANAGER' || membership.status !== 'ACTIVE') continue;
    const batch = writeBatch(db);
    batch.set(item.ref, {
      status: 'REVOKED',
      massPermission: false,
      dailyOperationsPermission: false,
      revokedBy: user.uid,
      revokedAt: now,
      updatedAt: now
    }, { merge: true });
    writeAdministratorDeletionProtection(batch, centerId, item.id, { ...membership, status: 'REVOKED' });
    await batch.commit();
  }
  for (let offset = 0; offset < viceSessionsSnapshot.docs.length; offset += 100) {
    const batch = writeBatch(db);
    viceSessionsSnapshot.docs.slice(offset, offset + 100).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
}

export async function listAdministratorInvitations(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || !['OWNER', 'ADMIN'].includes(access.role)) {
    throw new Error('Solo gli amministratori possono consultare gli inviti');
  }
  const snapshot = await getDocs(query(
    collection(db, ADMIN_INVITATION_COLLECTION),
    where('centerId', '==', centerId),
    limit(50)
  ));
  return snapshot.docs
    .map((item) => ({ invitationId: item.id, ...item.data() }))
    .filter((item) => item.role === 'ADMIN')
    .sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt));
}

export async function revokeAdministratorInvitation(invitationId, user = getCurrentUser()) {
  const normalizedInvitationId = normalizeInvitationId(invitationId);
  if (!normalizedInvitationId) throw new Error(t('admin.invitations.invalidId'));
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  const invitationRef = doc(db, ADMIN_INVITATION_COLLECTION, normalizedInvitationId);
  const invitationSnapshot = await getDoc(invitationRef);
  const invitation = invitationSnapshot.exists() ? invitationSnapshot.data() : {};
  // Gli inviti assegnano il ruolo ADMIN e sono gestiti dal responsabile.
  const canRevoke = access.active && access.role === 'OWNER';
  if (!canRevoke || invitation.centerId !== centerId || invitation.status !== 'ACTIVE') {
    throw new Error('Questo invito non può essere revocato');
  }

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(invitationRef, {
    status: 'REVOKED',
    revokedBy: user.uid,
    revokedAt: now,
    updatedAt: now
  }, { merge: true });
  appendAuditEvent(batch, {
    action: AUDIT_ACTIONS.REVOKE_ADMIN_INVITATION,
    targetType: 'ADMIN_INVITATION',
    targetId: invitationId,
    summary: 'Invito amministratore revocato'
  }, user);
  await batch.commit();
}

export async function revokeCenterAdministrator(targetUid, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || access.role !== 'OWNER') {
    throw new Error('Solo il responsabile può revocare un amministratore');
  }

  const normalizedUid = String(targetUid || '').trim();
  if (!normalizedUid || normalizedUid === user.uid) {
    throw new Error('Amministratore non valido');
  }
  const membershipRef = doc(db, 'centers', centerId, 'admins', normalizedUid);
  const [membershipSnapshot, centerSnapshot] = await Promise.all([
    getDoc(membershipRef),
    getDoc(doc(db, 'centers', centerId))
  ]);
  const membership = membershipSnapshot.exists() ? membershipSnapshot.data() : {};
  const center = centerSnapshot.exists() ? centerSnapshot.data() : {};
  const staleFormerOwner = membership.role === 'OWNER'
    && center.ownerUid === user.uid
    && normalizedUid !== center.ownerUid;
  if (membership.status !== 'ACTIVE' || (membership.role === 'OWNER' && !staleFormerOwner)) {
    throw new Error('Questo amministratore non può essere revocato');
  }

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(membershipRef, {
    status: 'REVOKED',
    role: 'ADMIN',
    massPermission: false,
    dailyOperationsPermission: false,
    revokedBy: user.uid,
    revokedAt: now,
    updatedAt: now
  }, { merge: true });
  writeAdministratorDeletionProtection(batch, centerId, normalizedUid, {
    ...membership, role: 'ADMIN', status: 'REVOKED'
  });
  // La membership determina l'accesso. Il profilo privato di navigazione viene filtrato per membership e può includere altri centri: il responsabile del centro non può leggerlo né revocarne gli altri accessi.
  appendAuditEvent(batch, {
    action: AUDIT_ACTIONS.REVOKE_ADMIN,
    targetType: 'ADMIN',
    targetId: normalizedUid,
    summary: `Accesso amministratore revocato: ${String(membership.email || normalizedUid)}`
  }, user);
  await batch.commit();
}

export async function rejectAdministratorInvitation(invitationId, user = getCurrentUser()) {
  const normalizedInvitationId = normalizeInvitationId(invitationId);
  if (!normalizedInvitationId) throw new Error(t('admin.invitations.invalidId'));
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const invitationRef = doc(db, ADMIN_INVITATION_COLLECTION, normalizedInvitationId);
  const invitationSnapshot = await getDoc(invitationRef);
  const invitation = invitationSnapshot.exists() ? invitationSnapshot.data() : {};
  if (invitation.status !== 'ACTIVE') {
    throw new Error('Questo invito non può essere rifiutato');
  }
  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(invitationRef, {
    status: 'REJECTED',
    rejectedBy: user.uid,
    rejectedAt: now,
    updatedAt: now
  }, { merge: true });
  // Chi rifiuta non è ancora membro: l'evento è legato dalle regole
  // al cambio di stato dello stesso invito nello stesso commit.
  batch.set(doc(db, 'centers', invitation.centerId, 'auditEvents', `rejected_${invitationRef.id}`), {
    centerId: invitation.centerId,
    actorUid: user.uid,
    action: AUDIT_ACTIONS.REJECT_ADMIN_INVITATION,
    actorParticipantId: invitation.participantId || '',
    targetType: 'ADMIN_INVITATION',
    targetId: invitationRef.id,
    summary: 'Invito amministratore rifiutato',
    createdAt: now
  });
  await batch.commit();
}

export async function acceptAdministratorInvitation(
  invitationId = getAdminRoleInvitationId(),
  user = getCurrentUser()
) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accedi prima di rispondere all invito');
  }
  const normalizedInvitationId = normalizeInvitationId(invitationId);
  const invitation = await loadRoleInvitation(normalizedInvitationId);
  if (!invitation.active) {
    throw new Error('Questo invito non è più valido');
  }
  await claimRoleInvitation(normalizedInvitationId, invitation, user);
  setActiveCenterId(invitation.centerId);
  return { centerId: invitation.centerId, role: invitation.role };
}

export async function transferCenterOwnership(successorUid, options = {}, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || access.role !== 'OWNER') {
    throw new Error('Solo il responsabile può trasferire la responsabilità del centro');
  }

  const normalizedSuccessorUid = String(successorUid || '').trim();
  const revokePrevious = options?.revokePrevious === true;
  if (!normalizedSuccessorUid || normalizedSuccessorUid === user.uid) {
    throw new Error('Seleziona un amministratore diverso dal responsabile attuale');
  }
  const successorRef = doc(db, 'centers', centerId, 'admins', normalizedSuccessorUid);
  // Il profilo globale del successore è privato e non deve essere letto dal
  // responsabile uscente. Membership e invito accettato contengono già tutti
  // i dati necessari al passaggio.
  const successorSnapshot = await getDoc(successorRef);
  const previousOwnerSnapshot = await getDoc(doc(db, 'centers', centerId, 'admins', user.uid));
  const successor = successorSnapshot.exists() ? successorSnapshot.data() : {};
  if (successor.status !== 'ACTIVE' || successor.role !== 'ADMIN') {
    throw new Error('Il successore deve essere un amministratore attivo');
  }
  if (!successor.participantId) {
    throw new Error('Il successore deve essere collegato a una Persona del centro');
  }
  const successorInvitationId = normalizeInvitationId(successor.invitationId);
  if (!successorInvitationId) {
    throw new Error('Il successore deve avere accettato un invito come amministratore');
  }
  const successorInvitationSnapshot = await getDoc(
    doc(db, ADMIN_INVITATION_COLLECTION, successorInvitationId)
  );
  const successorInvitation = successorInvitationSnapshot.exists()
    ? successorInvitationSnapshot.data()
    : {};
  if (successorInvitation.centerId !== centerId
      || successorInvitation.role !== 'ADMIN'
      || successorInvitation.status !== 'USED'
      || successorInvitation.consumedBy !== normalizedSuccessorUid) {
    throw new Error('Il successore deve avere accettato un invito come amministratore');
  }
  const successorParticipantSnapshot = await getDoc(
    doc(db, 'centers', centerId, 'publicParticipants', successor.participantId)
  );
  const successorParticipant = successorParticipantSnapshot.exists()
    ? successorParticipantSnapshot.data()
    : {};
  if (successorParticipant.status !== 'ACTIVE') {
    throw new Error('La Persona del successore deve essere attiva');
  }

  const successorEmail = String(
    successorInvitation.acceptedEmail
      || successor.email
      || ''
  ).trim().toLowerCase();
  if (!successorEmail) {
    throw new Error('Il successore deve avere un indirizzo email autenticato');
  }

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', centerId), {
    ownerUid: normalizedSuccessorUid,
    administratorParticipantId: successor.participantId,
    administratorName: String(successorParticipant.displayName || '').trim(),
    administratorSignature: String(successorParticipant.signature || '').trim().toUpperCase(),
    adminEmail: successorEmail,
    administratorProfileComplete: true,
    administratorPasswordRequired: successor.administratorPasswordRequired === true,
    updatedAt: now
  }, { merge: true });
  const currentMembershipRef = doc(db, 'centers', centerId, 'admins', user.uid);
  if (revokePrevious) {
    // La revoca resta registrata nel database: non affidarsi alla sola assenza
    // del documento o alla sessione corrente per togliere i privilegi.
    batch.set(currentMembershipRef, {
      status: 'REVOKED',
      role: 'ADMIN',
      massPermission: false,
      dailyOperationsPermission: false,
      revokedBy: user.uid,
      revokedAt: now,
      updatedAt: now
    }, { merge: true });
  } else {
    batch.set(currentMembershipRef, {
      role: 'ADMIN',
      massPermission: false,
      dailyOperationsPermission: true,
      updatedAt: now
    }, { merge: true });
  }
  batch.set(successorRef, {
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: now
  }, { merge: true });
  writeAdministratorDeletionProtection(batch, centerId, normalizedSuccessorUid, { ...successor, role: 'OWNER' });
  writeAdministratorDeletionProtection(batch, centerId, user.uid, {
    ...previousOwnerSnapshot.data(), role: 'ADMIN', status: revokePrevious ? 'REVOKED' : 'ACTIVE'
  });
  batch.set(doc(db, ADMIN_INVITATION_COLLECTION, successorInvitationId), {
    status: 'TRANSFERRED',
    transferredBy: user.uid,
    transferredTo: normalizedSuccessorUid,
    transferredAt: now,
    updatedAt: now
  }, { merge: true });
  // adminProfiles è un indice di navigazione senza permessi. Rimane fuori dal batch critico per rispettare il limite di valutazione delle regole. La membership determina l'accesso; saveAdminProfile() riallinea il profilo del responsabile al caricamento.
  appendAuditEvent(batch, {
    action: AUDIT_ACTIONS.TRANSFER_OWNERSHIP,
    targetType: 'ADMIN',
    targetId: normalizedSuccessorUid,
    summary: `Responsabilità trasferita da ${user.email || user.uid} a ${successor.email || normalizedSuccessorUid}`
  }, user);
  await batch.commit();
  return {
    centerId,
    previousOwnerUid: user.uid,
    ownerUid: normalizedSuccessorUid,
    adminEmail: successorEmail,
    administratorName: String(successorParticipant.displayName || '').trim(),
    invitationId: successorInvitationId
  };
}

export function activateAdminCenter(centerId) {
  return setActiveCenterId(centerId);
}

async function readCenterAdmin(user, centerId) {
  try {
    const snapshot = await getDoc(doc(db, 'centers', centerId, 'admins', user.uid));
    const data = snapshot.exists() ? snapshot.data() : {};
    const role = normalizeCenterRole(data.role);
    const participantId = String(data.participantId || '').trim();
    const participantSnapshot = participantId
      ? await getDoc(doc(db, 'centers', centerId, 'publicParticipants', participantId))
      : null;
    const liturgicalRole = participantSnapshot?.exists()
      && participantSnapshot.data().status === 'ACTIVE'
      && participantSnapshot.data().liturgicalRole === true;
    return {
      active: data.status === 'ACTIVE',
      role,
      massPermission: data.massPermission === true,
      canManageMass: hasCapability(role, CAPABILITIES.MANAGE_MASS, {
        liturgicalRole
      }),
      canManageDailyOperations: hasCapability(role, CAPABILITIES.MANAGE_DAILY_OPERATIONS),
      passwordSetupRequired: data.passwordSetupRequired === true,
      roleInvitationId: String(data.invitationId || ''),
      email: String(data.email || ''),
      centerId,
      needsInitialization: false,
      redirectCenterId: ''
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { ...emptyAccess(), centerId };
    }
    throw error;
  }
}

export async function loadCurrentAdminMembership(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    return emptyAccess();
  }
  return readCenterAdmin(user, getActiveCenterId());
}

export async function loadCurrentAdminMembershipStatus(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    return { active: false, role: '' };
  }
  try {
    const snapshot = await getDoc(doc(db, 'centers', getActiveCenterId(), 'admins', user.uid));
    const data = snapshot.exists() ? snapshot.data() : {};
    return {
      active: data.status === 'ACTIVE',
      role: normalizeCenterRole(data.role)
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) return { active: false, role: '' };
    throw error;
  }
}

export async function completeAdministratorPasswordSetup(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const centerId = getActiveCenterId();
  const membershipRef = doc(db, 'centers', centerId, 'admins', user.uid);
  const membershipSnapshot = await getDoc(membershipRef);
  const membership = membershipSnapshot.exists() ? membershipSnapshot.data() : {};
  if (membership.status !== 'ACTIVE' || membership.passwordSetupRequired !== true) {
    return;
  }
  await setDoc(membershipRef, {
    passwordSetupRequired: false,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function saveAdminProfile(user, centerId, role) {
  await setDoc(doc(db, ADMIN_PROFILE_COLLECTION, user.uid), {
    centerId,
    centerIds: arrayUnion(centerId),
    status: 'ACTIVE',
    email: user.email || '',
    role: role || 'OWNER',
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function adminProfileNeedsRepair(profile, user, centerId, role) {
  const centerIds = Array.isArray(profile?.centerIds) ? profile.centerIds : [];
  return profile?.status !== 'ACTIVE'
    || profile?.centerId !== centerId
    || !centerIds.includes(centerId)
    || String(profile?.email || '') !== String(user.email || '')
    || normalizeCenterRole(profile?.role) !== normalizeCenterRole(role);
}

async function listAccessibleAdminCenters(user, profileData = null, accessCache = new Map()) {
  const profile = profileData || (await getDoc(doc(db, ADMIN_PROFILE_COLLECTION, user.uid))).data() || {};
  const candidateIds = [...new Set([
    profile.centerId,
    ...(Array.isArray(profile.centerIds) ? profile.centerIds : [])
  ].filter((centerId) => typeof centerId === 'string' && centerId))];
  const centers = await Promise.all(candidateIds.map(async (centerId) => {
    const access = accessCache.get(centerId) || await readCenterAdmin(user, centerId);
    if (!access.active) return null;
    try {
      const centerSnapshot = await getDoc(doc(db, 'centers', centerId));
      const center = centerSnapshot.exists() ? centerSnapshot.data() : {};
      if (center.status !== 'ACTIVE') return null;
      return {
        centerId,
        name: String(center.name || centerId),
        role: access.role
      };
    } catch (error) {
      if (isPermissionDeniedError(error)) return null;
      throw error;
    }
  }));
  return centers
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name, 'it'));
}

function emptyAccess() {
  return {
    active: false,
    role: '',
    massPermission: false,
    canManageMass: false,
    canManageDailyOperations: false,
    passwordSetupRequired: false,
    roleInvitationId: '',
    email: '',
    centerId: '',
    invitationId: '',
    invitationError: false,
    invitationPending: false,
    invitationParticipantId: '',
    invitationRole: '',
    needsInitialization: false,
    redirectCenterId: '',
    availableCenters: []
  };
}

async function loadRoleInvitation(invitationId) {
  if (!INVITATION_ID_PATTERN.test(invitationId)) {
    return { active: false };
  }
  try {
    const snapshot = await getDoc(doc(db, ADMIN_INVITATION_COLLECTION, invitationId));
    const data = snapshot.exists() ? snapshot.data() : {};
    const expiresAt = data.expiresAt?.toDate?.();
    return {
      active: data.status === 'ACTIVE'
        && data.role === 'ADMIN'
        && typeof data.centerId === 'string'
        && expiresAt instanceof Date
        && expiresAt.getTime() > Date.now(),
      centerId: data.centerId || '',
      participantId: data.participantId || '',
      role: data.role || '',
      expiresAt
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { active: false };
    }
    throw error;
  }
}

async function claimRoleInvitation(invitationId, invitation, user) {
  if (!hasVerifiedAdministratorIdentity(user)) {
    throw new Error('Conferma il tuo indirizzo email prima di accettare l\'invito');
  }
  if (invitation.role !== 'ADMIN') {
    throw new Error('Questo invito non è valido per un amministratore');
  }
  const role = 'ADMIN';
  const massPermission = true;
  const profileRef = doc(db, ADMIN_PROFILE_COLLECTION, user.uid);
  const existingProfile = await getDoc(profileRef);
  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', invitation.centerId, 'admins', user.uid), {
    centerId: invitation.centerId,
    participantId: invitation.participantId || '',
    invitationId,
    invitationConsumedBy: user.uid,
    invitationAcceptedAt: now,
    status: 'ACTIVE',
    email: user.email || '',
    role,
    massPermission,
    dailyOperationsPermission: true,
    administratorPasswordRequired: requiresAdministratorPassword(user),
    // Nel flusso di successione la persona sceglie già la propria password.
    passwordSetupRequired: false,
    createdAt: now,
    updatedAt: now
  }, { merge: true });
  writeAdministratorDeletionProtection(batch, invitation.centerId, user.uid, {
    participantId: invitation.participantId || '', role: 'ADMIN', status: 'ACTIVE'
  });
  batch.set(profileRef, {
    centerId: invitation.centerId,
    centerIds: arrayUnion(invitation.centerId),
    participantId: invitation.participantId || '',
    status: 'ACTIVE',
    email: user.email || '',
    role,
    massPermission,
    dailyOperationsPermission: true,
    ...(!existingProfile.exists() ? { createdAt: now } : {}),
    updatedAt: now
  }, { merge: true });
  batch.set(doc(db, ADMIN_INVITATION_COLLECTION, invitationId), {
    status: 'USED',
    consumedBy: user.uid,
    acceptedEmail: String(user.email || '').trim(),
    consumedAt: now,
    updatedAt: now
  }, { merge: true });
  await batch.commit();
}

async function createRoleInvitation({ centerId, participantId, role }, user) {
  const invitationId = createInvitationId();
  const expiresAt = invitationExpiry();
  await setDoc(doc(db, ADMIN_INVITATION_COLLECTION, invitationId), {
    centerId,
    participantId,
    role,
    status: 'ACTIVE',
    createdBy: user.uid,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { invitationId, expiresAt: expiresAt.toDate(), role };
}

async function loadCenterInvitation(invitationId) {
  if (!INVITATION_ID_PATTERN.test(invitationId)) {
    return { active: false };
  }
  try {
    const snapshot = await getDoc(doc(db, CENTER_INVITATION_COLLECTION, invitationId));
    const data = snapshot.exists() ? snapshot.data() : {};
    const expiresAt = data.expiresAt?.toDate?.();
    return {
      active: data.status === 'ACTIVE' && expiresAt instanceof Date && expiresAt.getTime() > Date.now(),
      expiresAt
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { active: false };
    }
    throw error;
  }
}

function normalizeInvitationId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return INVITATION_ID_PATTERN.test(normalized) ? normalized : '';
}

function storePendingCenterInvitation(invitationId) {
  try {
    window.sessionStorage.setItem(CENTER_INVITATION_STORAGE_KEY, invitationId);
  } catch {
    // L'invito resta disponibile nell'URL quando la sessione del browser non è scrivibile.
  }
  try {
    window.localStorage.setItem(CENTER_INVITATION_STORAGE_KEY, invitationId);
  } catch {
    // La memoria locale è una seconda via di recupero per i browser che separano le schede.
  }
}

function forgetStoredCenterInvitation() {
  // Rimuovere anche l'URL evita che il prossimo render ripristini il token.
  const url = new URL(window.location.href);
  if (url.searchParams.has('invite')) {
    url.searchParams.delete('invite');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
  try {
    window.sessionStorage.removeItem(CENTER_INVITATION_STORAGE_KEY);
  } catch {
    // La rimozione locale è solo una comodità e non condiziona la validità dell'invito.
  }
  try {
    window.localStorage.removeItem(CENTER_INVITATION_STORAGE_KEY);
  } catch {
    // La rimozione locale resta facoltativa e non condiziona il completamento del centro.
  }
}

function timestampValue(value) {
  if (value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function createInvitationId() {
  return (crypto.randomUUID() + crypto.randomUUID()).replaceAll('-', '');
}

function invitationExpiry() {
  return Timestamp.fromDate(new Date(Date.now() + INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000));
}

function hasVerifiedAdministratorIdentity(user) {
  const usesPassword = Array.isArray(user?.providerData)
    && user.providerData.some((provider) => provider.providerId === 'password');
  return !usesPassword || user.emailVerified === true;
}
