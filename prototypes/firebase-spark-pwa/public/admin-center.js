import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser } from './firebase-client.js?v=20260818s';
import { requiresAdministratorPassword } from './domain/administrator-auth.mjs?v=20260816g';
import {
  createOwnedCenterId,
  getActiveCenterId,
  setActiveCenterId
} from './center-context.js?v=20260816h';
import { DEFAULT_RESERVATION_CUTOFFS } from './schedule-utils.mjs?v=20260816g';
import { CAPABILITIES, hasCapability, normalizeCenterRole } from './role-policy.mjs?v=20260818a';
import { appendAuditEvent, AUDIT_ACTIONS } from './audit-log.js?v=20260816g';
import { loadOperationalLinks, rotateOperationalLink } from './access-links.js?v=20260816g';

const ADMIN_PROFILE_COLLECTION = 'adminProfiles';
const CENTER_INVITATION_COLLECTION = 'centerInvitations';
const ADMIN_INVITATION_COLLECTION = 'adminInvitations';
const INVITATION_ID_PATTERN = /^[a-f0-9]{64}$/;
const INVITATION_LIFETIME_DAYS = 30;
const CENTER_INVITATION_STORAGE_KEY = 'tavolaComune.pendingCenterInvitation';
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
  const profileSnapshot = await getDoc(profileRef);
  const batch = writeBatch(db);
  batch.update(doc(db, 'centers', centerId, 'admins', user.uid), {
    participantId: normalizedParticipantId,
    updatedAt: serverTimestamp()
  });
  if (profileSnapshot.exists()) {
    batch.update(profileRef, {
      participantId: normalizedParticipantId,
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
}

export async function loadAdminCenterAccess(user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    return emptyAccess();
  }

  const invitationId = getAdminInvitationId();
  if (invitationId && !isPlatformOwnerUser(user)) {
    const invitation = await loadCenterInvitation(invitationId);
    if (invitation.active) {
      return {
        ...emptyAccess(),
        centerId: createOwnedCenterId(user.uid, invitationId.slice(0, 16)),
        invitationId,
        needsInitialization: true
      };
    }
  }

  const requestedCenterId = getActiveCenterId();
  const existingAccess = await readCenterAdmin(user, requestedCenterId);
  if (existingAccess.active) {
    await saveAdminProfile(user, requestedCenterId, existingAccess.role);
    return {
      ...existingAccess,
      availableCenters: await listAccessibleAdminCenters(user)
    };
  }

  const roleInvitationId = getAdminRoleInvitationId();
  if (roleInvitationId) {
    const roleInvitation = await loadRoleInvitation(roleInvitationId);
    if (!roleInvitation.active) {
      return { ...emptyAccess(), invitationError: true };
    }
    return {
      ...emptyAccess(),
      centerId: roleInvitation.centerId,
      invitationPending: true,
      invitationParticipantId: roleInvitation.participantId,
      invitationRole: roleInvitation.role
    };
  }

  const profileSnapshot = await getDoc(doc(db, ADMIN_PROFILE_COLLECTION, user.uid));
  if (profileSnapshot.exists()) {
    const profile = profileSnapshot.data();
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
  batch.set(profileRef, {
    centerId,
    centerIds: arrayUnion(centerId),
    status: 'ACTIVE',
    email: user.email || '',
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: now,
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
    error.operationStage = 'salvataggio del centro, del responsabile e dell invito';
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

export async function createViceAdministratorInvitation(participantId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const normalizedParticipantId = String(participantId || '').trim();
  if (!normalizedParticipantId) throw new Error('Seleziona il vice amministratore');
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || !['OWNER', 'ADMIN', 'MANAGER'].includes(access.role)) {
    throw new Error('Solo il responsabile o l’amministratore può invitare un vice');
  }
  const participantSnapshot = await getDoc(
    doc(db, 'centers', centerId, 'publicParticipants', normalizedParticipantId)
  );
  const participant = participantSnapshot.exists() ? participantSnapshot.data() : {};
  if (participant.status !== 'ACTIVE' || participant.viceAdminRole !== true) {
    throw new Error('La persona deve essere attiva e indicata come vice amministratore');
  }

  const [membershipsSnapshot, invitationsSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'centers', centerId, 'admins'),
      where('participantId', '==', normalizedParticipantId),
      where('role', '==', 'MANAGER'),
      limit(10)
    )),
    getDocs(query(
      collection(db, ADMIN_INVITATION_COLLECTION),
      where('centerId', '==', centerId),
      where('role', '==', 'MANAGER'),
      limit(50)
    ))
  ]);
  if (membershipsSnapshot.docs.some((item) => item.data().status === 'ACTIVE')) {
    return { active: true, role: 'MANAGER' };
  }
  const existing = invitationsSnapshot.docs.find((item) => {
    const data = item.data();
    const expiresAt = data.expiresAt?.toDate?.();
    return data.role === 'MANAGER'
      && data.participantId === normalizedParticipantId
      && data.status === 'ACTIVE'
      && expiresAt instanceof Date
      && expiresAt.getTime() > Date.now();
  });
  if (existing) {
    return {
      invitationId: existing.id,
      expiresAt: existing.data().expiresAt.toDate(),
      role: 'MANAGER'
    };
  }
  return createRoleInvitation({
    centerId,
    participantId: normalizedParticipantId,
    role: 'MANAGER'
  }, user);
}

export async function revokeViceAdministratorAccess(participantId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const normalizedParticipantId = String(participantId || '').trim();
  if (!normalizedParticipantId) return;
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  if (!access.active || !['OWNER', 'ADMIN', 'MANAGER'].includes(access.role)) {
    throw new Error('Solo il responsabile o l’amministratore può revocare un vice');
  }
  const [membershipsSnapshot, invitationsSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, 'centers', centerId, 'admins'),
      where('participantId', '==', normalizedParticipantId),
      where('role', '==', 'MANAGER'),
      limit(10)
    )),
    getDocs(query(
      collection(db, ADMIN_INVITATION_COLLECTION),
      where('centerId', '==', centerId),
      where('role', '==', 'MANAGER'),
      limit(50)
    ))
  ]);
  const now = serverTimestamp();
  const batch = writeBatch(db);
  membershipsSnapshot.docs.forEach((item) => {
    const membership = item.data();
    if (membership.role !== 'MANAGER' || membership.status !== 'ACTIVE') return;
    batch.set(item.ref, {
      status: 'REVOKED',
      massPermission: false,
      dailyOperationsPermission: false,
      revokedBy: user.uid,
      revokedAt: now,
      updatedAt: now
    }, { merge: true });
  });
  invitationsSnapshot.docs.forEach((item) => {
    const invitation = item.data();
    if (invitation.role !== 'MANAGER'
        || invitation.participantId !== normalizedParticipantId
        || invitation.status !== 'ACTIVE') return;
    batch.set(item.ref, {
      status: 'REVOKED',
      revokedBy: user.uid,
      revokedAt: now,
      updatedAt: now
    }, { merge: true });
  });
  await batch.commit();
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
    .sort((left, right) => timestampValue(right.createdAt) - timestampValue(left.createdAt));
}

export async function revokeAdministratorInvitation(invitationId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const centerId = getActiveCenterId();
  const access = await readCenterAdmin(user, centerId);
  const invitationRef = doc(db, ADMIN_INVITATION_COLLECTION, normalizeInvitationId(invitationId));
  const invitationSnapshot = await getDoc(invitationRef);
  const invitation = invitationSnapshot.exists() ? invitationSnapshot.data() : {};
  // Restano solo inviti di ruolo ADMIN: solo il responsabile li gestisce.
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
  const targetProfileRef = doc(db, ADMIN_PROFILE_COLLECTION, normalizedUid);
  const [membershipSnapshot, centerSnapshot, targetProfileSnapshot] = await Promise.all([
    getDoc(membershipRef),
    getDoc(doc(db, 'centers', centerId)),
    getDoc(targetProfileRef)
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
  if (targetProfileSnapshot.data()?.centerId === centerId) {
    batch.set(targetProfileRef, {
      status: 'REVOKED',
      role: 'ADMIN',
      massPermission: false,
      dailyOperationsPermission: false,
      updatedAt: now
    }, { merge: true });
  }
  appendAuditEvent(batch, {
    action: AUDIT_ACTIONS.REVOKE_ADMIN,
    targetType: 'ADMIN',
    targetId: normalizedUid,
    summary: `Accesso amministratore revocato: ${String(membership.email || normalizedUid)}`
  }, user);
  await batch.commit();
}

export async function rejectAdministratorInvitation(invitationId, user = getCurrentUser()) {
  if (!db || !user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }
  const invitationRef = doc(db, ADMIN_INVITATION_COLLECTION, normalizeInvitationId(invitationId));
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
  const successorProfileRef = doc(db, ADMIN_PROFILE_COLLECTION, normalizedSuccessorUid);
  const currentProfileRef = doc(db, ADMIN_PROFILE_COLLECTION, user.uid);
  const [successorSnapshot, successorProfileSnapshot, currentProfileSnapshot] = await Promise.all([
    getDoc(successorRef),
    getDoc(successorProfileRef),
    getDoc(currentProfileRef)
  ]);
  const successor = successorSnapshot.exists() ? successorSnapshot.data() : {};
  if (successor.status !== 'ACTIVE' || successor.role !== 'ADMIN') {
    throw new Error('Il successore deve essere un amministratore attivo');
  }
  if (!successor.participantId) {
    throw new Error('Il successore deve essere collegato a una Persona del centro');
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
    successor.email || successorProfileSnapshot.data()?.email || ''
  ).trim().toLowerCase();
  if (!successorEmail) {
    throw new Error('Il successore deve avere un indirizzo email autenticato');
  }

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', centerId), {
    ownerUid: normalizedSuccessorUid,
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
      massPermission: true,
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
  // adminProfiles e' soltanto un indice di navigazione. I permessi effettivi
  // dipendono sempre dalla membership del centro, per supportare più centri
  // senza riattivare accidentalmente un ruolo revocato.
  if (successorProfileSnapshot.data()?.centerId === centerId) {
    batch.set(successorProfileRef, {
      status: 'ACTIVE',
      role: 'OWNER',
      massPermission: true,
      dailyOperationsPermission: true,
      updatedAt: now
    }, { merge: true });
  }
  if (revokePrevious && currentProfileSnapshot.data()?.centerId === centerId) {
    batch.set(currentProfileRef, {
      status: 'REVOKED',
      role: 'ADMIN',
      massPermission: false,
      dailyOperationsPermission: false,
      updatedAt: now
    }, { merge: true });
  }
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
    adminEmail: successorEmail
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
    return {
      active: data.status === 'ACTIVE',
      role,
      massPermission: data.massPermission === true,
      canManageMass: hasCapability(role, CAPABILITIES.MANAGE_MASS, {
        massPermission: data.massPermission === true
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
    if (error?.code === 'permission-denied') {
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

async function listAccessibleAdminCenters(user, profileData = null) {
  const profile = profileData || (await getDoc(doc(db, ADMIN_PROFILE_COLLECTION, user.uid))).data() || {};
  const candidateIds = [...new Set([
    profile.centerId,
    ...(Array.isArray(profile.centerIds) ? profile.centerIds : [])
  ].filter((centerId) => typeof centerId === 'string' && centerId))];
  const centers = await Promise.all(candidateIds.map(async (centerId) => {
    const access = await readCenterAdmin(user, centerId);
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
      if (error?.code === 'permission-denied') return null;
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
        && ['ADMIN', 'MANAGER'].includes(data.role)
        && typeof data.centerId === 'string'
        && expiresAt instanceof Date
        && expiresAt.getTime() > Date.now(),
      centerId: data.centerId || '',
      participantId: data.participantId || '',
      role: data.role || '',
      expiresAt
    };
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return { active: false };
    }
    throw error;
  }
}

async function claimRoleInvitation(invitationId, invitation, user) {
  if (!hasVerifiedAdministratorIdentity(user)) {
    throw new Error('Conferma il tuo indirizzo email prima di accettare l\'invito');
  }
  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(doc(db, 'centers', invitation.centerId, 'admins', user.uid), {
    centerId: invitation.centerId,
    participantId: invitation.participantId || '',
    invitationId,
    status: 'ACTIVE',
    email: user.email || '',
    role: invitation.role,
    massPermission: true,
    dailyOperationsPermission: true,
    administratorPasswordRequired: requiresAdministratorPassword(user),
    // Nel flusso di successione la persona sceglie già la propria password.
    passwordSetupRequired: false,
    createdAt: now,
    updatedAt: now
  });
  batch.set(doc(db, ADMIN_PROFILE_COLLECTION, user.uid), {
    centerId: invitation.centerId,
    centerIds: arrayUnion(invitation.centerId),
    participantId: invitation.participantId || '',
    status: 'ACTIVE',
    email: user.email || '',
    role: invitation.role,
    massPermission: true,
    dailyOperationsPermission: true,
    createdAt: now,
    updatedAt: now
  }, { merge: true });
  batch.set(doc(db, ADMIN_INVITATION_COLLECTION, invitationId), {
    status: 'USED',
    consumedBy: user.uid,
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
    if (error?.code === 'permission-denied') {
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
  try {
    window.sessionStorage.removeItem(CENTER_INVITATION_STORAGE_KEY);
  } catch {
    // La rimozione locale è solo una comodità e non condiziona la validità dell invito.
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
