import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
  limit,
  orderBy,
  runTransaction,
  startAfter
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import {
  db,
  getCurrentUser,
  getResidentTechnicalEmail,
  isResidentTechnicalEmail,
  signInAnonymousUser,
  signInResidentTechnicalUser,
  signOutCurrentUser,
  verifyResidentCommonPassword,
  waitForAuthReady
} from './firebase-client.js?v=20260817q';
import { getActiveCenterId, getCenterScopedStorageKey } from './center-context.js?v=20260816h';
import { resolveEffectiveEffect } from './reservation-state.mjs?v=20260816g';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20260816g';
import { normalizeDietTags } from './diet-utils.mjs?v=20260816g';
import {
  normalizeResidentSignature,
  validateParticipantProfile
} from './domain/participant-profile.mjs?v=20260816g';
import { appendAuditEvent, AUDIT_ACTIONS } from './audit-log.js?v=20260816g';
import { assertCurrentRevision, nextRevision, normalizeRevision } from './core/revision.mjs?v=20260816h';
import { CAPABILITIES, hasCapability, normalizeCenterRole } from './role-policy.mjs?v=20260816h';
import { isRecoverableSessionError } from './core/user-error.mjs?v=20260816i';
import {
  invalidateCenterContactSettingsCache,
  loadCenterContactSettings
} from './center-settings.js?v=20260818u';
export {
  CENTER_AVATAR_STORAGE_KEY,
  loadCachedCenterAvatar,
  loadCenterContactSettings,
  removeCenterAvatar,
  saveCenterAvatar,
  updateCenterSettings
} from './center-settings.js?v=20260818u';

export const RESIDENT_TECHNICAL_EMAIL = 'residenti@tavola-comune.local';
export const RESIDENT_SIGNATURE_STORAGE_KEY = 'tavolaComune.residentSignature';
export const RESIDENT_PARTICIPANT_STORAGE_KEY = 'tavolaComune.residentParticipantId';
export const RESIDENT_TOKEN_STORAGE_KEY = 'tavolaComune.residentTokenId';
export const RESIDENT_TOKEN_EXPIRES_STORAGE_KEY = 'tavolaComune.residentTokenExpiresAt';
const PUBLIC_TOKEN_STORAGE_KEY = 'tavolaComune.publicToken';
const PUBLIC_DEMO_EXPIRES_AT = new Date('2031-12-31T22:59:59Z');
const PERSONAL_TOKEN_LIFETIME_DAYS = 9000;
const SESSION_LIFETIME_DAYS = 30;
const SESSION_RECHECK_MS = 5 * 60 * 1000;
const STATIC_QUERY_CACHE_MS = 10 * 60 * 1000;
const RESERVATION_BATCH_SIZE = 6;
const RESERVATION_BATCH_CONCURRENCY = 3;
const ADMIN_DELETE_BATCH_SIZE = 400;
const longDateFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: '2-digit',
  month: 'short'
});
let currentSession = null;
let currentSessionAuthUid = '';
let currentSessionCheckedAt = 0;
let mealTypesCache = null;
let publicParticipantsCache = null;
let summaryParticipantsCache = null;

let summaryRulesCache = null;
const mealWindowsCache = new Map();
const participantRulesCache = new Map();

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

async function loadPublicParticipantById(participantId) {
  if (!participantId) {
    return null;
  }
  const snapshot = await getDoc(doc(
    db,
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

async function loadPublicParticipantBySignature(signature) {
  const normalized = normalizeResidentSignature(signature);
  if (!normalized) {
    return null;
  }
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'publicParticipants'),
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

async function createPersonalTokenForParticipant(participantId) {
  const tokenId = `personal_${createRequestId().replaceAll('-', '')}`;
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + PERSONAL_TOKEN_LIFETIME_DAYS);
  await setDoc(doc(db, 'centers', getActiveCenterId(), 'linkTokens', tokenId), {
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

  const adminSnapshot = await getDoc(doc(
    db,
    'centers',
    getActiveCenterId(),
    'admins',
    user.uid
  ));
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
  if (strongAuthenticatedUser && !authorizedAdministrator) {
    throw new Error('Account amministratore non autorizzato per questo centro');
  }
  try {
    if (authorizedAdministrator) {
      await verifyResidentCommonPassword(getActiveCenterId(), commonPassword);
    } else {
      await signInResidentTechnicalUser(getResidentTechnicalEmail(getActiveCenterId()), commonPassword);
    }
    const participant = await loadPublicParticipantBySignature(normalized);
    if (!participant) {
      throw new Error('La tua sigla non risulta tra i residenti attivi.');
    }

    const token = await createPersonalTokenForParticipant(participant.participantId);
    if (!authorizedAdministrator) {
      await createPersonalAnonymousSession(participant.participantId, token);
    }
    rememberResidentIdentity(participant, normalized, token);
    return { participant, participants: [participant] };
  } catch (error) {
    clearCurrentSession();
    if (!authorizedAdministrator) {
      await signOutCurrentUser();
    }
    throw error;
  }
}

export async function restoreFriendlyResidentSession() {
  const signature = loadStoredResidentSignature();
  const participantId = loadStoredResidentParticipantId();
  const token = loadStoredResidentToken();
  await waitForAuthReady();
  if (!signature || !participantId || !token.tokenId || !token.expiresAt) {
    return null;
  }

  const strongAuthenticatedUser = getStrongAuthenticatedUser();
  const authorizedAdministrator = await getAuthorizedAdministratorUser();
  if (strongAuthenticatedUser && !authorizedAdministrator) {
    throw new Error('Account amministratore non autorizzato per questo centro');
  }
  try {
    if (authorizedAdministrator) {
      return restoreResidentIdentityForAuthorizedAdministrator();
    }
    await ensurePersonalSession(participantId, token);
    const participant = await loadPublicParticipantById(participantId);
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
    if (isRecoverableSessionError(error)) {
      error.preserveResidentIdentity = true;
      throw error;
    }
    clearStoredResidentIdentity();
    clearCurrentSession();
    if (!authorizedAdministrator) {
      await signOutCurrentUser();
    }
    return null;
  }
}

export async function restoreResidentIdentityForAuthorizedAdministrator() {
  const signature = loadStoredResidentSignature();
  const participantId = loadStoredResidentParticipantId();
  if (!signature || !participantId) {
    return null;
  }

  const participant = await loadPublicParticipantById(participantId);
  if (!participant || normalizeResidentSignature(participant.signature) !== signature) {
    return null;
  }
  return { participant, participants: [participant] };
}

export async function forgetResidentDevice() {
  await revokeStoredPersonalAccess().catch(() => undefined);
  clearStoredResidentIdentity();
  clearCurrentSession();
  await signOutCurrentUser();
}

function clearStoredResidentIdentity() {
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
  await signOutCurrentUser();
  clearCurrentSession();
  await signInAnonymousUser();
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

export async function loadResidentAdministratorAuthorization() {
  const user = getCurrentUser();
  const participantId = loadStoredResidentParticipantId();
  if (!user?.isAnonymous || !participantId) return { active: false };
  const snapshot = await getDoc(doc(
    db,
    'centers',
    getActiveCenterId(),
    'viceSessions',
    user.uid
  ));
  if (!snapshot.exists()) return { active: false };
  const data = snapshot.data();
  const expiresAt = data.expiresAt ? toDate(data.expiresAt) : null;
  return {
    active: data.status === 'ACTIVE'
      && data.participantId === participantId
      && expiresAt instanceof Date
      && expiresAt > new Date(),
    participantId: String(data.participantId || ''),
    passwordVersion: Number(data.passwordVersion || 0),
    expiresAt
  };
}

async function ensurePersonalSession(participantId, token) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const tokenExpiresAt = new Date(token.expiresAt);
  if (Number.isNaN(tokenExpiresAt.getTime()) || tokenExpiresAt <= new Date()) {
    throw new Error('Accesso del dispositivo scaduto');
  }

  let user = getCurrentUser();
  if (!user || !user.isAnonymous) {
    if (user) {
      await signOutCurrentUser();
    }
    const credential = await signInAnonymousUser();
    user = credential.user;
  }

  if (canReuseCurrentSession(user, 'PERSONAL')
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
    await signOutCurrentUser();
    const credential = await signInAnonymousUser();
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

  let user = getCurrentUser();
  if (!user) {
    const credential = await signInAnonymousUser();
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
    await signOutCurrentUser();
    const credential = await signInAnonymousUser();
    user = credential.user;
    return createPublicSession(user.uid, false);
  }

  if (sessionSnap.exists() && !sessionExpired) {
    rememberCurrentSession(user.uid, sessionData);
    return user;
  }

  if (sessionExpired) {
    await signOutCurrentUser();
    const credential = await signInAnonymousUser();
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
    expiresAt: createSessionExpiry(PUBLIC_DEMO_EXPIRES_AT),
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
}

async function listSummaryParticipants(options = {}) {
  const publicParticipants = await listPublicParticipants(options);
  if (!options.includeContacts) {
    return publicParticipants;
  }
  if (canUseVersionedCache(summaryParticipantsCache, options)) {
    return summaryParticipantsCache.value;
  }

  const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'participants'));
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
    getMealTypes(options.forceStaticRefresh),
    getMealWindowsInRange(startDateId, endDateId, options.forceStaticRefresh),
    getOwnOverrides(participantId, startDateId, endDateId),
    getParticipantRules(participantId, options.forceStaticRefresh)
  ]);
  const windowsByKey = new Map(
    windows.map((item) => [item.mealDate + '_' + item.mealTypeId, item])
  );
  const overridesByKey = new Map(
    overrides.map((item) => [item.mealDate + '_' + item.mealTypeId, item])
  );

  return dates.map((date) => {
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
      label: formatLongDate(date),
      isToday: isSameDate(date, centerToday),
      meals
    };
  });
}

export async function loadParticipantWeek(participantId, startDate = new Date(), days = 7, options = {}) {
  return loadParticipantPeriod(participantId, startDate, days, options);
}

export async function saveParticipantMeal(participant, meal, effect) {
  assertOnline();
  const batch = writeBatch(db);
  queueReservationWrite(batch, participant, meal, effect);
  await commitWithRetry(() => batch.commit());
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

  const batch = writeBatch(db);
  mealsToUpdate.forEach((meal) => queueReservationWrite(batch, participant, meal, effect));
  await commitWithRetry(() => batch.commit());
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
  const batch = writeBatch(db);
  meals.forEach((meal) => queueReservationWrite(batch, participant, meal, effect));

  try {
    await commitWithRetry(() => batch.commit());
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

function queueReservationWrite(batch, participant, meal, effect) {
  const overrideRef = doc(
    db,
    'centers',
    getActiveCenterId(),
    'reservationOverrides',
    participant.participantId + '_' + meal.mealWindowId
  );
  const update = {
    effect,
    requestId: createRequestId(),
    source: getReservationWriteSource(),
    updatedAt: serverTimestamp()
  };

  if (meal.createdAt) {
    batch.update(overrideRef, update);
    return;
  }

  batch.set(overrideRef, {
    centerId: getActiveCenterId(),
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
  return user && !user.isAnonymous && user.email !== getResidentTechnicalEmail(getActiveCenterId())
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

async function getMealTypes(forceRefresh = false) {
  if (!forceRefresh && isFreshCacheEntry(mealTypesCache)) {
    return mealTypesCache.value;
  }
  const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'mealTypes'));
  const value = snapshot.docs
    .map((docSnap) => ({ mealTypeId: docSnap.id, ...docSnap.data() }))
    .filter((meal) => meal.status === 'ACTIVE')
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  mealTypesCache = { loadedAt: Date.now(), value };
  return value;
}

async function getMealWindowsInRange(startDateId, endDateId, forceRefresh = false) {
  const cacheKey = `${startDateId}_${endDateId}`;
  const cached = mealWindowsCache.get(cacheKey);
  if (!forceRefresh && isFreshCacheEntry(cached)) {
    return cached.value;
  }
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'mealWindows'),
    where('mealDate', '>=', startDateId),
    where('mealDate', '<=', endDateId)
  ));
  const value = snapshot.docs.map((docSnap) => ({ mealWindowId: docSnap.id, ...docSnap.data() }));
  mealWindowsCache.set(cacheKey, { loadedAt: Date.now(), value });
  return value;
}

async function getOwnOverrides(participantId, startDateId, endDateId) {
  const overrides = collection(db, 'centers', getActiveCenterId(), 'reservationOverrides');
  try {
    const snapshot = await getDocs(query(
      overrides,
      where('participantId', '==', participantId),
      where('mealDate', '>=', startDateId),
      where('mealDate', '<=', endDateId)
    ));
    return snapshot.docs.map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    if (error?.code !== 'failed-precondition') {
      throw error;
    }
    const snapshot = await getDocs(query(
      overrides,
      where('participantId', '==', participantId)
    ));
    return snapshot.docs
      .map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }))
      .filter((override) => override.mealDate >= startDateId && override.mealDate <= endDateId);
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

  const present = participants
    .filter((participant) => effects.get(participant.participantId) === 'PRESENT')
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const absent = participants
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

export async function saveAdminParticipant(participantId, profile) {
  const normalizedProfile = validateParticipantProfile(profile);
  const { displayName, signature, groupId, dietTags, phone } = normalizedProfile;
  const expectedRevision = normalizeRevision(profile.expectedRevision);

  const duplicateSnapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'publicParticipants'),
    where('signature', '==', signature)
  ));
  const duplicate = duplicateSnapshot.docs.find((item) => item.id !== participantId);
  if (duplicate) {
    throw new Error('Questa sigla è già utilizzata');
  }

  const resolvedId = participantId || `participant_${crypto.randomUUID?.() || createRequestId()}`;
  const centerId = getActiveCenterId();
  const centerRef = doc(db, 'centers', centerId);
  const participantRef = doc(db, 'centers', centerId, 'participants', resolvedId);
  const publicParticipantRef = doc(db, 'centers', centerId, 'publicParticipants', resolvedId);
  const ruleRef = doc(db, 'centers', centerId, 'reservationRules', `rule_${resolvedId}`);
  const centerSettings = await loadCenterContactSettings();
  const status = normalizedProfile.active ? 'ACTIVE' : 'DISABLED';
  const common = {
    centerId,
    signature,
    displayName,
    groupId,
    dietTags,
    liturgicalRole: normalizedProfile.liturgicalRole,
    viceAdminRole: normalizedProfile.viceAdminRole,
    sortOrder: normalizedProfile.sortOrder,
    status,
    updatedAt: serverTimestamp()
  };
  await runTransaction(db, async (transaction) => {
    const participantSnapshot = await transaction.get(participantRef);
    const ruleSnapshot = await transaction.get(ruleRef);
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
    const existingRule = ruleSnapshot.exists() ? ruleSnapshot.data() : {};

    transaction.set(centerRef, {
      participantDataUpdatedAt: serverTimestamp(),
      ...(participantSnapshot.data()?.viceAdminRole === true && normalizedProfile.viceAdminRole !== true
        ? { adminPasswordRotationRequired: true }
        : {}),
      updatedAt: serverTimestamp()
    }, { merge: true });
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
  });
  if (status === 'DISABLED') {
    await deleteParticipantAccessCredentials(centerId, resolvedId);
  }
  participantRulesCache.delete(resolvedId);
  publicParticipantsCache = null;
  summaryParticipantsCache = null;
  summaryRulesCache = null;
  invalidateCenterContactSettingsCache();
  return resolvedId;
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

    transaction.set(doc(db, 'centers', centerId), {
      participantDataUpdatedAt: serverTimestamp(),
      ...(participant.viceAdminRole === true && status === 'DISABLED'
        ? { adminPasswordRotationRequired: true }
        : {}),
      updatedAt: serverTimestamp()
    }, { merge: true });
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
  participantRulesCache.delete(normalizedId);
  publicParticipantsCache = null;
  summaryParticipantsCache = null;
  summaryRulesCache = null;
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
  const [participantSnapshot, publicParticipantSnapshot, ...relatedSnapshots] = await Promise.all([
    getDoc(participantRef),
    getDoc(publicParticipantRef),
    ...['reservationRules', 'reservationOverrides', 'accessSessions', 'viceSessions'].map((collectionName) => (
      getDocs(query(
        collection(db, 'centers', centerId, collectionName),
        where('participantId', '==', normalizedId)
      ))
    ))
  ]);

  if (!participantSnapshot.exists()) {
    throw new Error('La persona non esiste più');
  }

  const disableBatch = writeBatch(db);
  disableBatch.update(participantRef, { status: 'DISABLED', updatedAt: serverTimestamp() });
  if (publicParticipantSnapshot.exists()) {
    disableBatch.update(publicParticipantRef, { status: 'DISABLED', updatedAt: serverTimestamp() });
  }
  relatedSnapshots[0].docs.forEach((snapshot) => {
    disableBatch.update(snapshot.ref, { status: 'DISABLED', updatedAt: serverTimestamp() });
  });
  await commitWithRetry(() => disableBatch.commit());

  const [ruleSnapshot, overrideSnapshot, sessionSnapshot, viceSessionSnapshot] = relatedSnapshots;
  const ruleRefs = ruleSnapshot.docs.map((item) => item.ref);
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
  finalBatch.set(doc(db, 'centers', centerId), {
    participantDataUpdatedAt: serverTimestamp(),
    ...(participantSnapshot.data().viceAdminRole === true
      ? { adminPasswordRotationRequired: true }
      : {}),
    updatedAt: serverTimestamp()
  }, { merge: true });
  appendAuditEvent(finalBatch, {
    action: AUDIT_ACTIONS.DELETE_PARTICIPANT,
    targetType: 'PARTICIPANT',
    targetId: normalizedId,
    summary: `Persona eliminata: ${String(participantSnapshot.data().displayName || normalizedId)}`
  });
  await commitWithRetry(() => finalBatch.commit());

  participantRulesCache.delete(normalizedId);
  publicParticipantsCache = null;
  summaryParticipantsCache = null;
  summaryRulesCache = null;
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
  const collections = [
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
  ];
  const [centerSnapshot, collectionEntries] = await Promise.all([
    getDoc(doc(db, 'centers', getActiveCenterId())),
    Promise.all(collections.map(async (collectionName) => [
      collectionName,
      await readCollectionInPages(collectionName)
    ]))
  ]);
  const center = centerSnapshot.exists() ? centerSnapshot.data() : {};
  const documents = Object.fromEntries(collectionEntries);
  const totalDocuments = collectionEntries.reduce((sum, [, rows]) => sum + rows.length, 0);

  return {
    schemaVersion: 2,
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

async function getRules(options = {}) {
  if (canUseVersionedCache(summaryRulesCache, options)) {
    return summaryRulesCache.value;
  }
  const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'reservationRules'));
  const value = snapshot.docs.map((docSnap) => ({ ruleId: docSnap.id, ...docSnap.data() }));
  summaryRulesCache = createVersionedCacheEntry(value, options.staticVersion);
  return value;
}

async function getParticipantRules(participantId, forceRefresh = false) {
  const cached = participantRulesCache.get(participantId);
  if (!forceRefresh && isFreshCacheEntry(cached)) {
    return cached.value;
  }
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'reservationRules'),
    where('participantId', '==', participantId)
  ));
  const value = snapshot.docs.map((docSnap) => ({ ruleId: docSnap.id, ...docSnap.data() }));
  participantRulesCache.set(participantId, { loadedAt: Date.now(), value });
  return value;
}

async function getOverrides(mealDate) {
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'reservationOverrides'),
    where('mealDate', '==', mealDate)
  ));
  return snapshot.docs.map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }));
}

function createRequestId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'req_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function createSessionExpiry(tokenExpiresAt) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_LIFETIME_DAYS);
  return expiresAt < tokenExpiresAt ? expiresAt : tokenExpiresAt;
}

function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('La connessione è assente: la modifica non è stata confermata.');
  }
}

async function commitWithRetry(operation) {
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
  return Boolean(entry && Date.now() - entry.loadedAt < STATIC_QUERY_CACHE_MS);
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


function formatLongDate(date) {
  return longDateFormatter.format(date);
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
