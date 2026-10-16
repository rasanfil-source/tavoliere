import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
  limit,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import {
  db,
  getCurrentUser,
  getAdministratorTechnicalEmail,
  isResidentTechnicalEmail,
  replaceWithAnonymousUser,
  signOutCurrentUser,
  authorizeResidentAdministratorSession,
  verifyResidentCommonPassword,
  waitForAuthReady,
  withResidentTechnicalSession,
  withAdministratorTechnicalSession
} from './firebase-client.js?v=20261014b';
import { getActiveCenterId, getCenterScopedStorageKey } from './center-context.js?v=20261014b';
import {
  findApplicableRule,
  resolveEffectiveDietTags,
  resolveEffectiveEffect
} from './reservation-state.mjs?v=20261014b';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20261014b';
import { normalizeDietTags } from './diet-utils.mjs?v=20261014b';
import {
  normalizeResidentSignature
} from './domain/participant-profile.mjs?v=20261014b';
import { CAPABILITIES, hasCapability, normalizeCenterRole } from './role-policy.mjs?v=20261014b';
import { isRecoverableSessionError } from './core/user-error.mjs?v=20261014b';
import { isConnectionAvailable } from './core/connectivity.mjs?v=20261014b';
import { clearPersonalCalendarSnapshots } from './core/personal-calendar-cache.mjs?v=20261014b';
import {
  loadCenterContactSettings
} from './center-settings.js?v=20261014b';
export {
  CENTER_AVATAR_STORAGE_KEY,
  loadCachedCenterAvatar,
  loadCenterContactSettings,
  removeCenterAvatar,
  restoreCenterConfiguration,
  saveCenterAvatar,
  updateCenterSettings
} from './center-settings.js?v=20261014b';

export const RESIDENT_TECHNICAL_EMAIL = 'residenti@tavola-comune.local';
export const RESIDENT_SIGNATURE_STORAGE_KEY = 'tavolaComune.residentSignature';
export const RESIDENT_PARTICIPANT_STORAGE_KEY = 'tavolaComune.residentParticipantId';
export const RESIDENT_TOKEN_STORAGE_KEY = 'tavolaComune.residentTokenId';
export const RESIDENT_TOKEN_EXPIRES_STORAGE_KEY = 'tavolaComune.residentTokenExpiresAt';
const PUBLIC_TOKEN_STORAGE_KEY = 'tavolaComune.publicToken';
const PERSONAL_TOKEN_LIFETIME_DAYS = 9000;
const SESSION_LIFETIME_DAYS = 30;
const SESSION_RECHECK_MS = 5 * 60 * 1000;
const STATIC_QUERY_CACHE_MS = 10 * 60 * 1000;
const RESERVATION_BATCH_SIZE = 6;
const RESERVATION_BATCH_CONCURRENCY = 3;
let currentSession = null;
let currentSessionAuthUid = '';
let currentSessionCheckedAt = 0;
let mealTypesCache = null;
let publicParticipantsCache = null;
let summaryParticipantsCache = null;

let summaryRulesCache = null;
const mealWindowsCache = new Map();
const participantRulesCache = new Map();
let participantRulesRevision = 0;
const staticQueryLoads = new Map();

function shareStaticQuery(key, loader) {
  if (staticQueryLoads.has(key)) return staticQueryLoads.get(key);
  let request;
  request = Promise.resolve().then(loader).finally(() => {
    if (staticQueryLoads.get(key) === request) staticQueryLoads.delete(key);
  });
  staticQueryLoads.set(key, request);
  return request;
}

export { normalizeResidentSignature };

export function findParticipantBySignature(participants, value) {
  const signature = normalizeResidentSignature(value);
  if (!signature) {
    return null;
  }

  return participants.find((participant) => (
    normalizeResidentSignature(participant.signature) === signature
  )) || null;
}

export function loadStoredResidentSignature() {
  return normalizeResidentSignature(window.localStorage.getItem(
    getCenterScopedStorageKey(RESIDENT_SIGNATURE_STORAGE_KEY)
  ));
}

function loadStoredResidentParticipantId() {
  return String(window.localStorage.getItem(
    getCenterScopedStorageKey(RESIDENT_PARTICIPANT_STORAGE_KEY)
  ) || '').trim();
}

function loadStoredResidentToken() {
  return {
    tokenId: String(window.localStorage.getItem(
      getCenterScopedStorageKey(RESIDENT_TOKEN_STORAGE_KEY)
    ) || '').trim(),
    expiresAt: String(window.localStorage.getItem(
      getCenterScopedStorageKey(RESIDENT_TOKEN_EXPIRES_STORAGE_KEY)
    ) || '').trim()
  };
}

function rememberResidentIdentity(participant, signature, token) {
  window.localStorage.setItem(getCenterScopedStorageKey(RESIDENT_SIGNATURE_STORAGE_KEY), signature);
  window.localStorage.setItem(getCenterScopedStorageKey(RESIDENT_PARTICIPANT_STORAGE_KEY), participant.participantId);
  window.localStorage.setItem(getCenterScopedStorageKey(RESIDENT_TOKEN_STORAGE_KEY), token.tokenId);
  window.localStorage.setItem(
    getCenterScopedStorageKey(RESIDENT_TOKEN_EXPIRES_STORAGE_KEY),
    token.expiresAt.toISOString()
  );
}

async function loadPublicParticipantById(participantId, sourceDb = db) {
  if (!participantId) {
    return null;
  }
  const snapshot = await getDoc(doc(
    sourceDb,
    'centers',
    getActiveCenterId(),
    'publicParticipants',
    participantId
  ));
  if (!snapshot.exists()) {
    return null;
  }
  const participant = { participantId: snapshot.id, ...snapshot.data() };
  return participant.status === 'ACTIVE' ? participant : null;
}

async function loadPublicParticipantBySignature(signature, sourceDb = db) {
  const normalized = normalizeResidentSignature(signature);
  if (!normalized) {
    return null;
  }
  const snapshot = await getDocs(query(
    collection(sourceDb, 'centers', getActiveCenterId(), 'publicParticipants'),
    where('signature', '==', normalized),
    limit(1)
  ));
  if (snapshot.empty) {
    return null;
  }
  const participantSnapshot = snapshot.docs[0];
  const participant = { participantId: participantSnapshot.id, ...participantSnapshot.data() };
  return participant.status === 'ACTIVE' ? participant : null;
}

async function createPersonalTokenForParticipant(participantId, sourceDb = db) {
  const tokenId = `personal_${createRequestId().replaceAll('-', '')}`;
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + PERSONAL_TOKEN_LIFETIME_DAYS);
  await setDoc(doc(sourceDb, 'centers', getActiveCenterId(), 'linkTokens', tokenId), {
    status: 'ACTIVE',
    scope: 'PERSONAL',
    targetType: 'PARTICIPANT',
    participantId,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { tokenId, expiresAt };
}

function getStrongAuthenticatedUser() {
  const user = getCurrentUser();
  return user && !user.isAnonymous && !isResidentTechnicalEmail(user.email)
    ? user
    : null;
}

async function getAuthorizedAdministratorUser() {
  await waitForAuthReady();
  const user = getStrongAuthenticatedUser();
  if (!user) {
    return null;
  }

  let adminSnapshot;
  try {
    adminSnapshot = await getDoc(doc(
      db,
      'centers',
      getActiveCenterId(),
      'admins',
      user.uid
    ));
  } catch (error) {
    // Un account Google rimasto autenticato sul dispositivo può non avere
    // alcun ruolo nel centro aperto. Le regole Firestore negano correttamente
    // la lettura della membership, ma questo non deve impedire alla stessa
    // persona di entrare come residente con sigla e password comune.
    if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
      return null;
    }
    throw error;
  }
  if (!adminSnapshot.exists()) return null;
  const admin = adminSnapshot.data();
  const role = normalizeCenterRole(admin.role);
  return admin.status === 'ACTIVE' && hasCapability(role, CAPABILITIES.OPEN_ADMIN_AREA)
    ? user
    : null;
}

export async function signInFriendlyResident(signature, commonPassword) {
  const normalized = normalizeResidentSignature(signature);
  if (!normalized || !commonPassword) {
    throw new Error('Inserisci sigla e password comune.');
  }

  const strongAuthenticatedUser = getStrongAuthenticatedUser();
  const authorizedAdministrator = await getAuthorizedAdministratorUser();
  const existingUser = getCurrentUser();
  const storedParticipantId = loadStoredResidentParticipantId();
  const storedSignature = loadStoredResidentSignature();
  const storedToken = loadStoredResidentToken();
  // La sessione Google può appartenere a un altro centro. La password comune autorizza esplicitamente l'accesso residente dopo la verifica.
  const keepStrongAdministratorSession = Boolean(strongAuthenticatedUser && authorizedAdministrator);
  try {
    let participant;
    let token;
    let reusePersonalSession = false;
    if (keepStrongAdministratorSession) {
      await verifyResidentCommonPassword(getActiveCenterId(), commonPassword);
      participant = await loadPublicParticipantBySignature(normalized);
      if (participant) token = await createPersonalTokenForParticipant(participant.participantId);
    } else {
      ({ participant, token } = await withResidentTechnicalSession(
        getActiveCenterId(),
        commonPassword,
        async ({ db: technicalDb }) => {
          const matchedParticipant = await loadPublicParticipantBySignature(normalized, technicalDb);
          if (!matchedParticipant) return { participant: null, token: null };
          const storedTokenExpiresAt = new Date(storedToken.expiresAt);
          reusePersonalSession = Boolean(
            existingUser?.isAnonymous
            && storedSignature === normalized
            && storedParticipantId === matchedParticipant.participantId
            && storedToken.tokenId
            && !Number.isNaN(storedTokenExpiresAt.getTime())
            && storedTokenExpiresAt > new Date()
          );
          return {
            participant: matchedParticipant,
            token: reusePersonalSession
              ? { tokenId: storedToken.tokenId, expiresAt: storedTokenExpiresAt }
              : await createPersonalTokenForParticipant(
                matchedParticipant.participantId,
                technicalDb
              )
          };
        }
      ));
    }
    if (!participant) {
      throw new Error('La tua sigla non risulta tra i residenti attivi.');
    }

    if (!keepStrongAdministratorSession) {
      if (reusePersonalSession) {
        await ensurePersonalSession(participant.participantId, token);
      } else {
        await createPersonalAnonymousSession(participant.participantId, token);
      }
    }
    rememberResidentIdentity(participant, normalized, token);
    return { participant, participants: [participant] };
  } catch (error) {
    // Un controllo credenziali fallito o un errore temporaneo di rete conserva la sessione residente esistente. La pulizia riguarda solo un'identità appena sostituita.
    if (getCurrentUser()?.uid !== existingUser?.uid) {
      clearCurrentSession();
    }
    if (!keepStrongAdministratorSession && getCurrentUser()?.uid !== existingUser?.uid
        && !isRecoverableSessionError(error)) {
      await signOutCurrentUser();
    }
    throw error;
  }
}

export async function restoreFriendlyResidentSession({ onSessionReady } = {}) {
  const signature = loadStoredResidentSignature();
  const participantId = loadStoredResidentParticipantId();
  const token = loadStoredResidentToken();
  await waitForAuthReady();
  const strongAuthenticatedUser = getStrongAuthenticatedUser();
  const authorizedAdministrator = await getAuthorizedAdministratorUser();
  if (authorizedAdministrator) {
    return restoreResidentIdentityForAuthorizedAdministrator(authorizedAdministrator);
  }
  if (!signature || !participantId || !token.tokenId || !token.expiresAt) {
    return null;
  }
  if (strongAuthenticatedUser && !authorizedAdministrator) {
    // Mostra il modulo residente per richiedere la password comune.
    return null;
  }
  try {
    const initialUser = getCurrentUser();
    // La lettura anticipata richiede un'identità anonima esistente e un token dispositivo valido. Gli errori vengono gestiti durante la verifica della sessione.
    const profileRead = initialUser?.isAnonymous && new Date(token.expiresAt) > new Date()
      ? loadPublicParticipantById(participantId).then(
        (value) => ({ value }), (error) => ({ error })
      )
      : null;
    const sessionUser = await ensurePersonalSession(participantId, token);
    // La preparazione facoltativa non invalida un'identità autenticata.
    if (onSessionReady) void Promise.resolve().then(() => onSessionReady({
      participantId, uid: sessionUser.uid
    })).catch(() => undefined);
    const profileResult = profileRead && initialUser.uid === sessionUser.uid
      ? await profileRead : null;
    // Una lettura negata per sessione assente viene ripetuta dopo la creazione della sessione; un cambio di identità invalida il profilo già letto.
    if (profileResult?.error && !['permission-denied', 'firestore/permission-denied'].includes(profileResult.error.code)) {
      throw profileResult.error;
    }
    const participant = profileResult && !profileResult.error
      ? profileResult.value : await loadPublicParticipantById(participantId);
    if (!participant) {
      throw new Error('Sigla non attiva');
    }
    if (normalizeResidentSignature(participant.signature) !== signature) {
      throw new Error('Identità del dispositivo non coerente');
    }
    rememberResidentIdentity(participant, signature, {
      tokenId: token.tokenId,
      expiresAt: new Date(token.expiresAt)
    });
    return { participant, participants: [participant] };
  } catch (error) {
    // Durante il recupero di token e sessione le letture possono essere negate. Le credenziali del dispositivo restano disponibili per riprovare; le regole continuano a proteggere i dati.
    if (isRecoverableSessionError(error)) {
      error.preserveResidentIdentity = true;
      throw error;
    }
    clearStoredResidentIdentity();
    clearCurrentSession();
    await signOutCurrentUser();
    return null;
  }
}

export async function restoreResidentIdentityForAuthorizedAdministrator(user = null) {
  const authorizedUser = user || await getAuthorizedAdministratorUser();
  const membershipUser = authorizedUser || getCurrentUser();
  if (!membershipUser || membershipUser.isAnonymous) return null;

  // L'identità residente derivata dalla membership forte ha precedenza su
  // qualsiasi residuo locale di un accesso precedente sullo stesso device.
  const membershipSnapshot = await getDoc(doc(
    db,
    'centers',
    getActiveCenterId(),
    'admins',
    membershipUser.uid
  ));
  if (!membershipSnapshot.exists() || membershipSnapshot.data().status !== 'ACTIVE') return null;
  const membershipRole = String(membershipSnapshot.data().role || '').trim().toUpperCase();
  const membershipParticipantId = String(
    membershipSnapshot.data()?.participantId || ''
  ).trim();
  if (!membershipParticipantId && membershipRole !== 'OWNER') return null;
  const settings = membershipParticipantId
    ? null
    : await loadCenterContactSettings({ forceRefresh: false });
  const participantId = membershipParticipantId
    || String(settings?.administratorParticipantId || '').trim();
  const signature = membershipParticipantId
    ? ''
    : normalizeResidentSignature(settings?.administratorSignature);

  const participant = participantId
    ? await loadPublicParticipantById(participantId)
    : signature
      ? await loadPublicParticipantBySignature(signature)
      : null;
  if (!participant || (signature
      && normalizeResidentSignature(participant.signature) !== signature)) {
    return null;
  }
  const normalizedSignature = normalizeResidentSignature(participant.signature);
  window.localStorage.setItem(
    getCenterScopedStorageKey(RESIDENT_SIGNATURE_STORAGE_KEY),
    normalizedSignature
  );
  window.localStorage.setItem(
    getCenterScopedStorageKey(RESIDENT_PARTICIPANT_STORAGE_KEY),
    participant.participantId
  );
  return { participant, participants: [participant], strongAdministrator: true };
}

export async function forgetResidentDevice() {
  await revokeStoredPersonalAccess().catch(() => undefined);
  clearStoredResidentIdentity();
  clearCurrentSession();
  await signOutCurrentUser();
}

function clearStoredResidentIdentity() {
  clearPersonalCalendarSnapshots({ centerId: getActiveCenterId() });
  window.localStorage.removeItem(getCenterScopedStorageKey(RESIDENT_SIGNATURE_STORAGE_KEY));
  window.localStorage.removeItem(getCenterScopedStorageKey(RESIDENT_PARTICIPANT_STORAGE_KEY));
  window.localStorage.removeItem(getCenterScopedStorageKey(RESIDENT_TOKEN_STORAGE_KEY));
  window.localStorage.removeItem(getCenterScopedStorageKey(RESIDENT_TOKEN_EXPIRES_STORAGE_KEY));
}

async function revokeStoredPersonalAccess() {
  const user = getCurrentUser();
  const token = loadStoredResidentToken();
  if (!user?.isAnonymous || !token.tokenId || currentSession?.scope !== 'PERSONAL') {
    return;
  }
  const batch = writeBatch(db);
  batch.delete(doc(db, 'centers', getActiveCenterId(), 'linkTokens', token.tokenId));
  batch.delete(doc(db, 'centers', getActiveCenterId(), 'accessSessions', user.uid));
  await commitWithRetry(() => batch.commit());
}

async function createPersonalAnonymousSession(participantId, token) {
  if (!isConnectionAvailable()) {
    const error = new Error('Connessione necessaria per ripristinare l’accesso personale');
    error.code = 'unavailable';
    throw error;
  }
  clearCurrentSession();
  await replaceWithAnonymousUser();
  await ensurePersonalSession(participantId, token);
}

export async function ensureStoredResidentSession() {
  const strongAuthenticatedUser = getStrongAuthenticatedUser();
  const authorizedAdministrator = await getAuthorizedAdministratorUser();
  if (authorizedAdministrator) {
    return authorizedAdministrator;
  }
  if (strongAuthenticatedUser) {
    throw new Error('Account amministratore non autorizzato per questo centro');
  }
  const participantId = loadStoredResidentParticipantId();
  const token = loadStoredResidentToken();
  if (!participantId || !token.tokenId || !token.expiresAt) {
    throw new Error('Accesso personale richiesto');
  }
  return ensurePersonalSession(participantId, token);
}

// Accesso diretto del vice dal medesimo modulo residente. La password
// amministratori viene verificata dalla membership tecnica, poi la persona
// riceve la normale sessione personale e la vice-sessione operativa. In questo
// modo il residente non vede un secondo sblocco nelle Impostazioni.
export async function signInFriendlyViceAdministrator(signature, administratorPassword, knownSettings = null) {
  const normalized = normalizeResidentSignature(signature);
  if (!normalized || !administratorPassword) {
    throw residentLoginError('Inserisci sigla e password.', 'resident/credentials-missing');
  }
  const centerId = getActiveCenterId();
  // Su un dispositivo nuovo non esiste ancora alcun permesso per leggere la
  // versione della password amministratori. Il token del link residenti crea
  // prima una sessione PUBLIC; l'autenticazione tecnica resta su Auth
  // secondaria e non sostituisce questa identità.
  try {
    await ensurePublicDemoSession();
  } catch (error) {
    if (!knownSettings?.adminSharedPasswordSet) throw error;
  }
  // La lettura protetta di publicParticipants usa la stessa sessione tecnica con cui viene verificata la password amministratori. Le impostazioni vengono rilette dalla fonte autorevole; il valore in cache serve soltanto in assenza di rete.
  const settings = await loadCenterContactSettings({ forceRefresh: true })
    .catch((error) => {
      if (knownSettings?.adminSharedPasswordSet) return knownSettings;
      throw error;
    });
  const passwordVersion = Number(settings.adminPasswordVersion || 0);
  if (!settings.adminSharedPasswordSet || passwordVersion < 1) {
    throw residentLoginError(
      'Password amministratori non disponibile.',
      'resident/vice-not-configured'
    );
  }
  let participant = null;
  let token;
  let operationalLinks = null;
  let technicalEmail = '';
  const technicalEmails = [...new Set([
    String(settings.adminTechnicalEmail || '').trim().toLowerCase(),
    getAdministratorTechnicalEmail(centerId, passwordVersion),
    getAdministratorTechnicalEmail(centerId)
  ].filter(Boolean))];
  let lastTechnicalError = null;
  for (const candidateEmail of technicalEmails) {
    try {
      await withAdministratorTechnicalSession(
        centerId,
        administratorPassword,
        passwordVersion,
      async ({ db: technicalDb, email }) => {
        participant = await loadPublicParticipantBySignature(normalized, technicalDb);
        if (!participant) {
          throw residentLoginError(
            'La tua sigla non risulta tra i residenti attivi.',
            'resident/participant-not-found'
          );
          }
          const isAuthorizedPerson = participant.viceAdminRole === true;
        if (!isAuthorizedPerson) {
          throw residentLoginError(
            'Questa persona non è autorizzata come vice-amministratore.',
            'resident/not-vice'
          );
          }
          token = await createPersonalTokenForParticipant(participant.participantId, technicalDb);
          // Recupera i collegamenti mentre la password amministratori è ancora
          // convalidata. La sessione anonima del residente/vice può essere
          // autorizzata pochi istanti dopo; portare con sé questa lettura evita
          // che il pannello costruisca nel frattempo URL privi del token `t`.
          const linksSnapshot = await getDoc(doc(
            technicalDb,
            'centers',
            centerId,
            'privateSettings',
            'operationalLinks'
          )).catch(() => null);
          operationalLinks = linksSnapshot?.exists() ? linksSnapshot.data() : null;
          technicalEmail = email;
        },
        candidateEmail
      );
      lastTechnicalError = null;
      break;
    } catch (error) {
      lastTechnicalError = error;
      const retryableCredentialError = [
        'auth/invalid-credential',
        'auth/wrong-password',
        'auth/user-not-found',
        'auth/invalid-email'
      ].includes(error?.code);
      if (!retryableCredentialError) throw error;
    }
  }
  if (lastTechnicalError) throw lastTechnicalError;
  if (!participant || !token) {
    throw residentLoginError('Accesso amministrativo non riuscito.', 'resident/vice-auth-failed');
  }

  await createPersonalAnonymousSession(participant.participantId, token);
  rememberResidentIdentity(participant, normalized, token);
  await authorizeResidentAdministratorSession({
    centerId,
    participantId: participant.participantId,
    password: administratorPassword,
    passwordVersion,
    technicalEmail: technicalEmail || settings.adminTechnicalEmail
  });
  // Dopo la creazione della vice-sessione, i collegamenti vengono letti con l'identità definitiva, anche quando l'account tecnico del centro è in rotazione.
  const authorizedLinksSnapshot = await getDoc(doc(
    db,
    'centers',
    centerId,
    'privateSettings',
    'operationalLinks'
  )).catch(() => null);
  if (authorizedLinksSnapshot?.exists()) {
    operationalLinks = authorizedLinksSnapshot.data();
  }
  return {
    participant,
    participants: [participant],
    administratorAuthorized: true,
    operationalLinks
  };
}

export async function recoverStoredResidentSession() {
  const participantId = loadStoredResidentParticipantId();
  const token = loadStoredResidentToken();
  if (!participantId || !token.tokenId || !token.expiresAt) {
    const error = new Error('Accesso personale richiesto');
    error.code = 'resident/session-missing';
    throw error;
  }
  const authorizedAdministrator = await getAuthorizedAdministratorUser();
  if (authorizedAdministrator) {
    return authorizedAdministrator;
  }
  clearCurrentSession();
  return ensurePersonalSession(participantId, token, { forceRefresh: true });
}

export async function loadResidentAdministratorAuthorization() {
  const user = getCurrentUser();
  const participantId = loadStoredResidentParticipantId();
  if (!user?.isAnonymous || !participantId) return { active: false };
  const centerId = getActiveCenterId();
  const viceSessionRef = doc(db, 'centers', centerId, 'viceSessions', user.uid);
  const snapshot = await getDoc(viceSessionRef);
  if (!snapshot.exists()) return { active: false };
  const [centerSnapshot, participantSnapshot] = await Promise.all([
    getDoc(doc(db, 'centers', centerId)),
    getDoc(doc(db, 'centers', centerId, 'publicParticipants', participantId))
  ]);
  const data = snapshot.data();
  const expiresAt = data.expiresAt ? toDate(data.expiresAt) : null;
  const center = sanitizeCenterBackupDocument(centerSnapshot.exists() ? centerSnapshot.data() : {});
  const participant = participantSnapshot.exists() ? participantSnapshot.data() : {};
  const passwordVersion = Number(data.passwordVersion || 0);
  const isAuthorizedPerson = participant.status === 'ACTIVE'
    && participant.viceAdminRole === true;
  const active = data.status === 'ACTIVE'
    && data.participantId === participantId
    && passwordVersion === Number(center.adminPasswordVersion || 0)
    && isAuthorizedPerson
    && expiresAt instanceof Date
    && expiresAt > new Date();
  if (!active && isConnectionAvailable()) {
    await deleteDoc(viceSessionRef).catch(() => undefined);
  }
  return {
    active,
    participantId: String(data.participantId || ''),
    passwordVersion,
    expiresAt
  };
}

async function ensurePersonalSession(participantId, token, options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const tokenExpiresAt = new Date(token.expiresAt);
  if (Number.isNaN(tokenExpiresAt.getTime()) || tokenExpiresAt <= new Date()) {
    throw new Error('Accesso del dispositivo scaduto');
  }

  let user = getCurrentUser();
  if (!user || !user.isAnonymous) {
    const credential = await replaceWithAnonymousUser();
    user = credential.user;
  }

  if (!options.forceRefresh
    && canReuseCurrentSession(user, 'PERSONAL')
    && currentSession.participantId === participantId
    && currentSession.tokenId === token.tokenId) {
    return user;
  }

  const sessionRef = doc(db, 'centers', getActiveCenterId(), 'accessSessions', user.uid);
  const sessionSnap = await getDoc(sessionRef);
  const sessionData = sessionSnap.exists() ? sessionSnap.data() : null;
  const sessionExpired = sessionData?.expiresAt && toDate(sessionData.expiresAt) <= new Date();
  const reusable = sessionData?.scope === 'PERSONAL'
    && sessionData.participantId === participantId
    && sessionData.tokenId === token.tokenId
    && !sessionExpired;
  if (reusable) {
    rememberCurrentSession(user.uid, sessionData);
    return user;
  }

  if (sessionSnap.exists()) {
    if (!isConnectionAvailable()) {
      const error = new Error('Connessione necessaria per cambiare sessione');
      error.code = 'unavailable';
      throw error;
    }
    const credential = await replaceWithAnonymousUser();
    user = credential.user;
  }

  const session = {
    centerId: getActiveCenterId(),
    scope: 'PERSONAL',
    targetType: 'PARTICIPANT',
    participantId,
    tokenId: token.tokenId,
    status: 'ACTIVE',
    expiresAt: createSessionExpiry(tokenExpiresAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'centers', getActiveCenterId(), 'accessSessions', user.uid), session);
  rememberCurrentSession(user.uid, session);
  return user;
}

export async function ensurePublicDemoSession() {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  const authorizedAdministrator = await getAuthorizedAdministratorUser();
  if (authorizedAdministrator) {
    return authorizedAdministrator;
  }
  if (getStrongAuthenticatedUser()) {
    throw new Error('Account amministratore non autorizzato per questo centro');
  }

  let user = getCurrentUser();
  if (!user) {
    const credential = await replaceWithAnonymousUser();
    user = credential.user;
  }

  if (canReuseCurrentSession(user, 'PUBLIC')) {
    return user;
  }

  const sessionRef = doc(db, 'centers', getActiveCenterId(), 'accessSessions', user.uid);
  const sessionSnap = await getDoc(sessionRef);
  const sessionData = sessionSnap.exists() ? sessionSnap.data() : null;
  const sessionExpired = sessionData?.expiresAt && toDate(sessionData.expiresAt) <= new Date();
  if (sessionSnap.exists() && (sessionData.scope !== 'PUBLIC' || sessionExpired) && user.isAnonymous) {
    if (!isConnectionAvailable()) {
      const error = new Error('Connessione necessaria per cambiare sessione');
      error.code = 'unavailable';
      throw error;
    }
    const credential = await replaceWithAnonymousUser();
    user = credential.user;
    return createPublicSession(user.uid, false);
  }

  if (sessionSnap.exists() && !sessionExpired) {
    rememberCurrentSession(user.uid, sessionData);
    return user;
  }

  if (sessionExpired) {
    if (!isConnectionAvailable()) {
      const error = new Error('Connessione necessaria per rinnovare la sessione');
      error.code = 'unavailable';
      throw error;
    }
    const credential = await replaceWithAnonymousUser();
    return createPublicSession(credential.user.uid, false);
  }

  return createPublicSession(user.uid, sessionSnap.exists());
}

async function createPublicSession(authUid, sessionExists) {
  const tokenId = getPublicTokenId();
  if (!tokenId) {
    throw new Error('Apri il collegamento per residenti fornito dal responsabile del centro.');
  }
  const sessionRef = doc(db, 'centers', getActiveCenterId(), 'accessSessions', authUid);
  const payload = sessionExists ? {
    updatedAt: serverTimestamp()
  } : {
    centerId: getActiveCenterId(),
    scope: 'PUBLIC',
    targetType: 'CENTER',
    tokenId,
    status: 'ACTIVE',
    expiresAt: createSessionExpiry(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(sessionRef, payload, { merge: true });
  rememberCurrentSession(authUid, payload);

  return getCurrentUser();
}

export async function listPublicParticipants(options = {}) {
  if (canUseVersionedCache(publicParticipantsCache, options)) {
    return publicParticipantsCache.value;
  }
  const key = `publicParticipants:${getActiveCenterId()}:${String(options.staticVersion || '')}`;
  return shareStaticQuery(key, async () => {
    const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'publicParticipants'));
    const value = snapshot.docs
      .map((docSnap) => {
        const participant = docSnap.data();
        return {
          participantId: docSnap.id,
          ...participant,
          dietTags: normalizeDietTags(participant.dietTags)
        };
      })
      .filter((participant) => participant.status === 'ACTIVE')
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    publicParticipantsCache = createVersionedCacheEntry(value, options.staticVersion);
    return value;
  });
}

async function listSummaryParticipants(options = {}) {
  const publicParticipants = await listPublicParticipants(options);
  if (!options.includeContacts) {
    return publicParticipants;
  }
  if (canUseVersionedCache(summaryParticipantsCache, options)) {
    return summaryParticipantsCache.value;
  }

  const key = `summaryParticipants:${getActiveCenterId()}:${String(options.staticVersion || '')}`;
  return shareStaticQuery(key, async () => {
    const snapshot = await getDocs(query(
      collection(db, 'centers', getActiveCenterId(), 'participants'),
      where('phoneConsent', '==', true)
    ));
    const contactsByParticipant = new Map(snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const phone = String(data.phone || '').trim();
      const phoneConsent = Boolean(data.phoneConsent && phone);
      return [docSnap.id, {
        phone: phoneConsent ? phone : '',
        phoneConsent,
        whatsappEnabled: Boolean(data.whatsappEnabled && phoneConsent)
      }];
    }));
    const value = publicParticipants.map((participant) => ({
      ...participant,
      ...(contactsByParticipant.get(participant.participantId) || {
        phone: '',
        phoneConsent: false,
        whatsappEnabled: false
      })
    }));
    summaryParticipantsCache = createVersionedCacheEntry(value, options.staticVersion);
    return value;
  });
}

export async function listAdminParticipants() {
  const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'participants'));
  return snapshot.docs
    .map((docSnap) => {
      const participant = docSnap.data();
      return {
        participantId: docSnap.id,
        ...participant,
        dietTags: normalizeDietTags(participant.dietTags)
      };
    })
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

export async function listCenterAdministrators() {
  const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'admins'));
  return snapshot.docs
    .map((item) => ({
      adminUid: item.id,
      participantId: String(item.data().participantId || ''),
      email: String(item.data().email || ''),
      role: String(item.data().role || ''),
      status: String(item.data().status || ''),
      invitationId: String(item.data().invitationId || ''),
      massPermission: item.data().massPermission === true,
      dailyOperationsPermission: item.data().dailyOperationsPermission === true,
      passwordSetupRequired: item.data().passwordSetupRequired === true
    }))
    .sort((left, right) => left.email.localeCompare(right.email, 'it'));
}

export async function loadParticipantMeals(participantId, date = new Date(), options = {}) {
  const [day] = await loadParticipantPeriod(participantId, date, 1, options);
  return day ? day.meals : [];
}

async function loadParticipantPeriod(participantId, startDate, days, options = {}) {
  const dates = buildDateRange(startDate, days);
  const centerToday = getDateInTimeZone(options.timezone || 'Europe/Rome');
  const startDateId = formatDateId(dates[0]);
  const endDateId = formatDateId(dates[dates.length - 1]);
  const [mealTypes, windows, overrides, rules] = await Promise.all([
    tagResidentCalendarRead(getMealTypes(options.forceStaticRefresh, options.requireServer), 'mealTypes'),
    tagResidentCalendarRead(
      getMealWindowsInRange(startDateId, endDateId, options.forceStaticRefresh, options.requireServer),
      'mealWindows'
    ),
    tagResidentCalendarRead(getOwnOverrides(participantId, startDateId, endDateId, options.requireServer), 'reservationOverrides'),
    tagResidentCalendarRead(getParticipantRules(participantId, options.forceStaticRefresh, options.requireServer), 'reservationRule')
  ]);
  const windowsByKey = new Map(
    windows.map((item) => [item.mealDate + '_' + item.mealTypeId, item])
  );
  const overridesByKey = new Map(
    overrides.map((item) => [item.mealDate + '_' + item.mealTypeId, item])
  );

  const result = dates.map((date) => {
    const mealDate = formatDateId(date);
    const meals = mealTypes.map((meal) => {
      const key = mealDate + '_' + meal.mealTypeId;
      const window = windowsByKey.get(key);
      const override = overridesByKey.get(key);
      return {
        mealTypeId: meal.mealTypeId,
        label: meal.label,
        mealDate,
        mealWindowId: key,
        isOpen: Boolean(window && window.status === 'OPEN' && toDate(window.closesAt) > new Date()),
        closesAt: window?.closesAt ? toDate(window.closesAt).toISOString() : null,
        effect: resolveEffectiveEffect({
          participantId,
          mealTypeId: meal.mealTypeId,
          mealDate,
          rules,
          override
        }),
        createdAt: override ? override.createdAt : null,
        updatedAt: override ? override.updatedAt : null
      };
    });

    return {
      date: mealDate,
      label: formatLongDate(date, options.locale),
      isToday: isSameDate(date, centerToday),
      meals
    };
  });
  Object.defineProperty(result, 'serverConfirmed', {
    value: [mealTypes, windows, overrides, rules].every((values) => values.serverConfirmed === true)
  });
  return result;
}

function tagResidentCalendarRead(promise, stage) {
  return promise.catch((error) => {
    if (!error.refreshStage) error.refreshStage = stage;
    throw error;
  });
}

export async function loadParticipantWeek(participantId, startDate = new Date(), days = 7, options = {}) {
  return loadParticipantPeriod(participantId, startDate, days, options);
}

export async function saveParticipantMeal(participant, meal, effect) {
  assertOnline();
  await commitReservationMeals(participant, [meal], effect);
  markMealSaved(meal, effect);
}

export async function saveParticipantDay(participant, meals, effect) {
  assertOnline();
  const openMeals = meals.filter((meal) => meal.isOpen);
  if (openMeals.length === 0) {
    throw new Error('In questa giornata non ci sono pasti modificabili.');
  }

  const mealsToUpdate = openMeals.filter((meal) => meal.effect !== effect);
  if (mealsToUpdate.length === 0) {
    return 0;
  }

  await commitReservationMeals(participant, mealsToUpdate, effect);
  mealsToUpdate.forEach((meal) => markMealSaved(meal, effect));
  return mealsToUpdate.length;
}

export async function saveParticipantMonthSelection(participant, days, effect, mealTypeId = null) {
  assertOnline();
  const mealsToUpdate = days
    .flatMap((day) => day.meals)
    .filter((meal) => meal.isOpen && (!mealTypeId || meal.mealTypeId === mealTypeId))
    .filter((meal) => meal.effect !== effect);

  if (mealsToUpdate.length === 0) {
    return { requested: 0, saved: 0, failed: 0 };
  }

  const groups = [];
  for (let index = 0; index < mealsToUpdate.length; index += RESERVATION_BATCH_SIZE) {
    groups.push(mealsToUpdate.slice(index, index + RESERVATION_BATCH_SIZE));
  }

  let savedCount = 0;
  let failedCount = 0;
  for (let index = 0; index < groups.length; index += RESERVATION_BATCH_CONCURRENCY) {
    const results = await Promise.all(
      groups.slice(index, index + RESERVATION_BATCH_CONCURRENCY)
        .map((group) => saveReservationGroup(participant, group, effect))
    );
    for (const result of results) {
      savedCount += result.saved;
      failedCount += result.failed;
    }
  }

  return {
    requested: mealsToUpdate.length,
    saved: savedCount,
    failed: failedCount
  };
}

async function saveReservationGroup(participant, meals, effect) {
  try {
    await commitReservationMeals(participant, meals, effect);
    meals.forEach((meal) => markMealSaved(meal, effect));
    return { saved: meals.length, failed: 0 };
  } catch (batchError) {
    const results = await Promise.allSettled(
      meals.map((meal) => saveParticipantMeal(participant, meal, effect))
    );
    const saved = results.filter((result) => result.status === 'fulfilled').length;
    return { saved, failed: meals.length - saved };
  }
}

async function commitReservationMeals(participant, meals, effect) {
  const centerId = getActiveCenterId();
  try {
    await commitWithRetry(() => {
      const batch = writeBatch(db);
      meals.forEach((meal) => queueReservationWrite(batch, participant, meal, effect, { centerId }));
      return batch.commit();
    });
  } catch (error) {
    const code = String(error?.code || '').replace(/^firestore\//, '');
    if (!['permission-denied', 'not-found'].includes(code)) throw error;

    // Un altro dispositivo può aver creato o eliminato un override dopo la
    // lettura del calendario. Riconciliamo solo quel conflitto, conservando
    // identità, dieta e data di creazione degli override già presenti.
    await runTransaction(db, async (transaction) => {
      const snapshots = await Promise.all(meals.map((meal) => transaction.get(doc(
        db, 'centers', centerId, 'reservationOverrides',
        participant.participantId + '_' + meal.mealWindowId
      ))));
      if (!snapshots.some((snapshot, index) => snapshot.exists() !== Boolean(meals[index].createdAt))) {
        throw error;
      }
      snapshots.forEach((snapshot, index) => queueReservationWrite(
        transaction, participant, meals[index], effect,
        { centerId, exists: snapshot.exists() }
      ));
    });
  }
}

function queueReservationWrite(batch, participant, meal, effect, {
  centerId = getActiveCenterId(),
  exists = Boolean(meal.createdAt)
} = {}) {
  const overrideRef = doc(
    db,
    'centers',
    centerId,
    'reservationOverrides',
    participant.participantId + '_' + meal.mealWindowId
  );
  const update = {
    effect,
    requestId: createRequestId(),
    source: getReservationWriteSource(),
    updatedAt: serverTimestamp()
  };

  if (exists) {
    batch.update(overrideRef, update);
    return;
  }

  batch.set(overrideRef, {
    centerId,
    participantId: participant.participantId,
    groupId: participant.groupId,
    dietTags: Array.isArray(participant.dietTags) ? participant.dietTags : ['STANDARD'],
    mealDate: meal.mealDate,
    mealTypeId: meal.mealTypeId,
    mealWindowId: meal.mealWindowId,
    ...update,
    createdAt: serverTimestamp()
  });
}

function getReservationWriteSource() {
  const user = getCurrentUser();
  return user && !user.isAnonymous && !isResidentTechnicalEmail(user.email)
    ? 'ADMIN'
    : 'PERSONAL';
}

function markMealSaved(meal, effect) {
  meal.effect = effect;
  meal.updatedAt = new Date();
  if (!meal.createdAt) {
    meal.createdAt = meal.updatedAt;
  }
}

function calendarValues(snapshot, values, requireServer) {
  const serverConfirmed = snapshot.metadata?.fromCache === false
    && snapshot.metadata?.hasPendingWrites === false;
  if (requireServer && !serverConfirmed) {
    const error = new Error('Calendario in attesa di conferma dal server');
    error.code = 'unavailable';
    throw error;
  }
  Object.defineProperty(values, 'serverConfirmed', { value: serverConfirmed });
  return values;
}

async function getMealTypes(forceRefresh = false, requireServer = false) {
  if (!forceRefresh && (!requireServer || mealTypesCache?.value.serverConfirmed === true) && isFreshCacheEntry(mealTypesCache)) {
    return mealTypesCache.value;
  }
  const centerId = getActiveCenterId();
  return shareStaticQuery(`mealTypes:${centerId}:${requireServer ? 'server' : 'default'}`, async () => {
    const snapshot = await (requireServer ? getDocsFromServer : getDocs)(collection(db, 'centers', centerId, 'mealTypes'));
    const value = snapshot.docs
      .map((docSnap) => ({ mealTypeId: docSnap.id, ...docSnap.data() }))
      .filter((meal) => meal.status === 'ACTIVE')
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    calendarValues(snapshot, value, requireServer);
    mealTypesCache = { centerId, loadedAt: Date.now(), value };
    return value;
  });
}

async function getMealWindowsInRange(startDateId, endDateId, forceRefresh = false, requireServer = false) {
  const centerId = getActiveCenterId();
  const uid = getCurrentUser()?.uid || '';
  const cacheKey = `${startDateId}_${endDateId}`;
  const cached = mealWindowsCache.get(cacheKey);
  if (!forceRefresh && (!requireServer || cached?.value.serverConfirmed === true) && isFreshCacheEntry(cached)) {
    return cached.value;
  }
  const key = JSON.stringify(['mealWindows', centerId, uid, startDateId, endDateId, requireServer, forceRefresh]);
  return shareStaticQuery(key, async () => {
    const snapshot = await (requireServer ? getDocsFromServer : getDocs)(query(
      collection(db, 'centers', centerId, 'mealWindows'),
      where('mealDate', '>=', startDateId),
      where('mealDate', '<=', endDateId)
    ));
    const value = snapshot.docs.map((docSnap) => ({ mealWindowId: docSnap.id, ...docSnap.data() }));
    calendarValues(snapshot, value, requireServer);
    mealWindowsCache.set(cacheKey, { centerId, loadedAt: Date.now(), value });
    return value;
  });
}

async function getOwnOverrides(participantId, startDateId, endDateId, requireServer = false) {
  const overrides = collection(db, 'centers', getActiveCenterId(), 'reservationOverrides');
  const read = requireServer ? getDocsFromServer : getDocs;
  try {
    const snapshot = await read(query(
      overrides,
      where('participantId', '==', participantId),
      where('mealDate', '>=', startDateId),
      where('mealDate', '<=', endDateId)
    ));
    return calendarValues(snapshot,
      snapshot.docs.map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() })), requireServer);
  } catch (error) {
    if (error?.code !== 'failed-precondition') {
      throw error;
    }
    const snapshot = await read(query(
      overrides,
      where('participantId', '==', participantId)
    ));
    return calendarValues(snapshot, snapshot.docs
      .map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }))
      .filter((override) => override.mealDate >= startDateId && override.mealDate <= endDateId), requireServer);
  }
}

export async function loadParticipantMealSummary(meal, date = new Date(), options = {}) {
  if (!meal) {
    return null;
  }

  const mealDate = formatDateId(date);
  const [participants, rules, overrides] = await Promise.all([
    listSummaryParticipants(options),
    getRules(options),
    getOverrides(mealDate)
  ]);
  return buildParticipantMealSummary(meal, mealDate, participants, rules, overrides, groupRulesByParticipant(rules));
}

function buildParticipantMealSummary(meal, mealDate, participants, rules, overrides, rulesByParticipant = groupRulesByParticipant(rules)) {
  const overrideByParticipant = new Map(overrides
    .filter((override) => override.mealTypeId === meal.mealTypeId)
    .map((override) => [override.participantId, override]));
  const effects = new Map(participants.map((participant) => [
    participant.participantId,
    resolveEffectiveEffect({
      participantId: participant.participantId,
      mealTypeId: meal.mealTypeId,
      mealDate,
      rules: rulesByParticipant.get(participant.participantId) || [],
      override: overrideByParticipant.get(participant.participantId)
    })
  ]));

  const reservationParticipants = participants.map((participant) => ({
    ...participant,
    dietTags: resolveEffectiveDietTags(
      findApplicableRule(
        rulesByParticipant.get(participant.participantId) || [],
        participant.participantId, meal.mealTypeId, mealDate
      ) || participant,
      overrideByParticipant.get(participant.participantId)
    )
  }));
  const present = reservationParticipants
    .filter((participant) => effects.get(participant.participantId) === 'PRESENT')
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const absent = reservationParticipants
    .filter((participant) => effects.get(participant.participantId) === 'ABSENT')
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  return {
    mealTypeId: meal.mealTypeId,
    label: meal.label,
    present,
    absent
  };
}

export async function loadParticipantDaySummaries(date = new Date(), options = {}) {
  const mealDate = formatDateId(date);
  const [mealTypes, participants, rules, overrides] = await Promise.all([
    getMealTypes(),
    listSummaryParticipants(options),
    getRules(options),
    getOverrides(mealDate)
  ]);
  const rulesByParticipant = groupRulesByParticipant(rules);
  return mealTypes.map((meal) => (
    buildParticipantMealSummary(meal, mealDate, participants, rules, overrides, rulesByParticipant)
  ));
}

function groupRulesByParticipant(rules) {
  const grouped = new Map();
  rules.forEach((rule) => {
    const current = grouped.get(rule.participantId) || [];
    current.push(rule);
    grouped.set(rule.participantId, current);
  });
  return grouped;
}

export async function saveAdminParticipant(...args) {
  const module = await import('./admin-participant-data.js?v=20261014b');
  return module.saveAdminParticipant(...args);
}

export async function assignCenterAdministratorParticipant(...args) {
  const module = await import('./admin-participant-data.js?v=20261014b');
  return module.assignCenterAdministratorParticipant(...args);
}

export async function setAdminParticipantActiveStatus(...args) {
  const module = await import('./admin-participant-data.js?v=20261014b');
  return module.setAdminParticipantActiveStatus(...args);
}

export async function deleteAdminParticipant(...args) {
  const module = await import('./admin-participant-data.js?v=20261014b');
  return module.deleteAdminParticipant(...args);
}

export async function loadMealWindowCoverage(...args) {
  const module = await import('./admin-participant-data.js?v=20261014b');
  return module.loadMealWindowCoverage(...args);
}

export async function exportCenterData(...args) {
  const module = await import('./admin-participant-data.js?v=20261014b');
  return module.exportCenterData(...args);
}

function sanitizeCenterBackupDocument(data) {
  const sanitized = { ...(data || {}) };
  // I backup servono a ripristinare la configurazione, non le credenziali
  // tecniche. Evita che un file JSON esportato diventi una copia dei segreti
  // usati per aprire sessioni residenti o vice.
  delete sanitized.commonPassword;
  delete sanitized.adminTechnicalEmail;
  delete sanitized.adminTechnicalUid;
  return sanitized;
}

async function getRules(options = {}) {
  if (canUseVersionedCache(summaryRulesCache, options)) {
    return summaryRulesCache.value;
  }
  const centerId = getActiveCenterId();
  const key = `summaryRules:${centerId}:${String(options.staticVersion || '')}`;
  return shareStaticQuery(key, async () => {
    const snapshot = await getDocs(collection(db, 'centers', centerId, 'reservationRules'));
    const value = snapshot.docs.map((docSnap) => ({ ruleId: docSnap.id, ...docSnap.data() }));
    summaryRulesCache = createVersionedCacheEntry(value, options.staticVersion);
    return value;
  });
}

async function getParticipantRules(participantId, forceRefresh = false, requireServer = false) {
  const centerId = getActiveCenterId();
  const uid = getCurrentUser()?.uid;
  const revision = participantRulesRevision;
  const cached = participantRulesCache.get(participantId);
  if (!forceRefresh && cached?.uid === uid
      && (!requireServer || cached?.value.serverConfirmed === true) && isFreshCacheEntry(cached)) {
    return cached.value;
  }
  // La regola personale ha un identificativo deterministico. La lettura
  // diretta evita che il primo calendario dipenda dalla valutazione di una
  // query protetta (le regole Firestore non funzionano come filtri).
  const key = JSON.stringify(['participantRules', centerId, uid, participantId, requireServer, forceRefresh, revision]);
  return shareStaticQuery(key, async () => {
    const snapshot = await (requireServer ? getDocFromServer : getDoc)(doc(
      db,
      'centers',
      centerId,
      'reservationRules',
      `rule_${participantId}`
    ));
    const value = snapshot.exists()
      ? [{ ruleId: snapshot.id, ...snapshot.data() }]
      : [];
    calendarValues(snapshot, value, requireServer);
    // Una scrittura amministrativa completata invalida le letture precedenti e la relativa cache.
    if (revision === participantRulesRevision) participantRulesCache.set(participantId, {
      centerId,
      uid,
      loadedAt: Date.now(),
      value
    });
    return value;
  });
}

async function getOverrides(mealDate) {
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'reservationOverrides'),
    where('mealDate', '==', mealDate)
  ));
  return snapshot.docs.map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }));
}

export function createRequestId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'req_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function createSessionExpiry(tokenExpiresAt) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_LIFETIME_DAYS);
  return tokenExpiresAt instanceof Date && !Number.isNaN(tokenExpiresAt.getTime())
    && tokenExpiresAt < expiresAt ? tokenExpiresAt : expiresAt;
}

function residentLoginError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('La connessione è assente: la modifica non è stata confermata.');
  }
}

export async function commitWithRetry(operation) {
  const retryableCodes = new Set(['unavailable', 'deadline-exceeded', 'aborted']);
  let delay = 250;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!retryableCodes.has(error?.code) || attempt === 2) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay + Math.round(Math.random() * 100)));
      delay *= 2;
      assertOnline();
    }
  }
}

function toDate(value) {
  return value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
}

function isFreshCacheEntry(entry) {
  return Boolean(
    entry
    && entry.centerId === getActiveCenterId()
    && Date.now() - entry.loadedAt < STATIC_QUERY_CACHE_MS
  );
}

function canUseVersionedCache(entry, options = {}) {
  if (options.forceStaticRefresh || !isFreshCacheEntry(entry)) {
    return false;
  }
  const requestedVersion = String(options.staticVersion || '');
  return !requestedVersion || entry.staticVersion === requestedVersion;
}

function createVersionedCacheEntry(value, staticVersion = '') {
  return {
    centerId: getActiveCenterId(),
    loadedAt: Date.now(),
    staticVersion: String(staticVersion || ''),
    value
  };
}

function canReuseCurrentSession(user, scope) {
  if (!user || !currentSession || currentSessionAuthUid !== user.uid) {
    return false;
  }
  const expiresAt = currentSession.expiresAt ? toDate(currentSession.expiresAt) : null;
  return currentSession.scope === scope
    && currentSession.centerId === getActiveCenterId()
    && currentSession.status === 'ACTIVE'
    && (!expiresAt || expiresAt > new Date())
    && Date.now() - currentSessionCheckedAt < SESSION_RECHECK_MS;
}

function rememberCurrentSession(authUid, session) {
  currentSession = session;
  currentSessionAuthUid = authUid;
  currentSessionCheckedAt = Date.now();
}

function clearCurrentSession() {
  currentSession = null;
  currentSessionAuthUid = '';
  currentSessionCheckedAt = 0;
}


const calendarLabelFormatters = new Map();

function formatLongDate(date, locale = 'it') {
  let formatter = calendarLabelFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'short', day: '2-digit', month: 'short'
    });
    if (calendarLabelFormatters.size >= 8) calendarLabelFormatters.delete(calendarLabelFormatters.keys().next().value);
    calendarLabelFormatters.set(locale, formatter);
  }
  return formatter.format(date);
}

function buildDateRange(startDate, days) {
  const first = new Date(startDate);
  first.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(first);
    date.setDate(first.getDate() + offset);
    return date;
  });
}

function isSameDate(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function getPublicTokenId() {
  const tokenId = String(new URLSearchParams(window.location.search).get('t') || '').trim();
  const storageKey = getCenterScopedStorageKey(PUBLIC_TOKEN_STORAGE_KEY);
  if (tokenId) {
    try {
      window.localStorage.setItem(storageKey, tokenId);
    } catch {
      // Il collegamento nell'URL resta utilizzabile senza persistenza locale.
    }
    return tokenId;
  }
  try {
    return String(window.localStorage.getItem(storageKey) || '').trim();
  } catch {
    return '';
  }
}

// Le scritture amministrative invalidano anche le cache residenti in uso.
export function invalidateParticipantDataCaches(participantId) {
  participantRulesRevision++;
  participantRulesCache.delete(participantId);
  publicParticipantsCache = null;
  summaryParticipantsCache = null;
  summaryRulesCache = null;
}
