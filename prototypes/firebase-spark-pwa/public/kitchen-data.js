import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser, signInAnonymousUser, signOutCurrentUser, waitForAuthReady } from './firebase-client.js?v=20260822a';
import { getActiveCenterId } from './center-context.js?v=20260816h';
import {
  findApplicableRule,
  resolveEffectiveDietTags,
  resolveEffectiveEffect
} from './reservation-state.mjs?v=20260823b';
import { formatDateId } from './date-utils.mjs?v=20260816g';
import { formatDietLabel } from './diet-utils.mjs?v=20260823c';
import { t } from './i18n/i18n.mjs?v=20260823g';
import { isConnectionAvailable } from './core/connectivity.mjs?v=20260816g';

const SESSION_LIFETIME_DAYS = 30;
const SESSION_RECHECK_MS = 5 * 60 * 1000;
const STATIC_DATA_CACHE_MS = 6 * 60 * 60 * 1000;
const WINDOW_CACHE_MS = 10 * 60 * 1000;
const OVERRIDE_CACHE_MS = 45 * 1000;
const TEMPORAL_CACHE_MAX_ENTRIES = 30;
let mealTypesCache = null;
let rulesCache = null;
let validatedKitchenSession = null;
let mealTypesLoad = null;
let rulesLoad = null;
const windowsCache = new Map();
const overridesCache = new Map();

function writeBoundedCache(cache, key, entry) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > TEMPORAL_CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

export async function loadKitchenCounts(date = new Date(), options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  if (!options.sessionReady) {
    await ensureKitchenDemoSession();
  }

  const mealDate = formatDateId(date);
  const forceStaticRefresh = Boolean(options.forceStaticRefresh);
  const [mealTypes, windows, overrides, rules] = await Promise.all([
    getActiveMealTypes(forceStaticRefresh),
    getMealWindows(mealDate, forceStaticRefresh),
    getOverrides(mealDate),
    getRules(forceStaticRefresh, options.staticVersion)
  ]);
  const windowByMeal = new Map(windows.map((item) => [item.mealTypeId, item]));
  const rulesByParticipant = groupRulesByParticipant(rules);

  return mealTypes.map((meal) => {
    const window = windowByMeal.get(meal.mealTypeId);
    const counts = countEffectiveReservations(rulesByParticipant, overrides, meal.mealTypeId, mealDate);

    return {
      key: meal.mealTypeId,
      label: meal.label,
      count: counts.total,
      diets: formatDietCounts(counts.diets),
      dietParticipants: counts.participants,
      status: window ? window.status : 'MISSING',
      closesAt: window ? window.closesAt : null
    };
  });
}

export async function ensureKitchenDemoSession() {
  await waitForAuthReady();
  let user = getCurrentUser();

  if (
    user
    && validatedKitchenSession
    && validatedKitchenSession.authUid === user.uid
    && validatedKitchenSession.centerId === getActiveCenterId()
    && validatedKitchenSession.validUntil > Date.now()
  ) {
    return user;
  }

  // Un account forte è sufficiente soltanto se appartiene davvero al centro.
  // Un Gmail di un altro centro (o l'ex amministratore dopo un trasferimento)
  // conserva invece Firebase Auth ma riceve una sessione KITCHEN sullo stesso
  // UID, senza logout e senza distruggere la persistenza amministrativa.
  if (user && !user.isAnonymous) {
    const centerId = getActiveCenterId();
    try {
      const membership = await getDoc(doc(db, 'centers', centerId, 'admins', user.uid));
      if (membership.exists() && membership.data().status === 'ACTIVE') {
        return user;
      }
    } catch (error) {
      const permissionDenied = error?.code === 'permission-denied'
        || error?.code === 'firestore/permission-denied';
      if (!permissionDenied) throw error;
    }

    const sessionRef = doc(db, 'centers', centerId, 'accessSessions', user.uid);
    const sessionSnap = await getDoc(sessionRef);
    const sessionData = sessionSnap.exists() ? sessionSnap.data() : null;
    const expiresAt = sessionData?.expiresAt && typeof sessionData.expiresAt.toDate === 'function'
      ? sessionData.expiresAt.toDate()
      : sessionData?.expiresAt ? new Date(sessionData.expiresAt) : null;
    const reusable = sessionData?.scope === 'KITCHEN'
      && sessionData.status === 'ACTIVE'
      && expiresAt instanceof Date
      && expiresAt > new Date();
    if (reusable) {
      rememberKitchenSession(user.uid, expiresAt);
      return user;
    }
    if (sessionSnap.exists()) {
      if (!isConnectionAvailable()) {
        const error = new Error('Connessione necessaria per cambiare sessione');
        error.code = 'unavailable';
        throw error;
      }
      await deleteDoc(sessionRef);
    }
    return createKitchenSession(user.uid, false);
  }

  if (!user) {
    const credential = await signInAnonymousUser();
    user = credential.user;
  }

  if (
    validatedKitchenSession
    && validatedKitchenSession.authUid === user.uid
    && validatedKitchenSession.centerId === getActiveCenterId()
    && validatedKitchenSession.validUntil > Date.now()
  ) {
    return user;
  }

  const sessionRef = doc(db, 'centers', getActiveCenterId(), 'accessSessions', user.uid);
  const sessionSnap = await getDoc(sessionRef);

  const sessionData = sessionSnap.exists() ? sessionSnap.data() : null;
  const expiresAt = sessionData?.expiresAt && typeof sessionData.expiresAt.toDate === 'function'
    ? sessionData.expiresAt.toDate()
    : sessionData?.expiresAt ? new Date(sessionData.expiresAt) : null;
  const sessionExpired = expiresAt && expiresAt <= new Date();

  if (sessionSnap.exists() && (sessionData.scope !== 'KITCHEN' || sessionExpired)) {
    if (!isConnectionAvailable()) {
      const error = new Error('Connessione necessaria per cambiare sessione');
      error.code = 'unavailable';
      throw error;
    }
    validatedKitchenSession = null;
    await signOutCurrentUser();
    const credential = await signInAnonymousUser();
    user = credential.user;
    return createKitchenSession(user.uid, false);
  }

  if (sessionSnap.exists()) {
    rememberKitchenSession(user.uid, expiresAt);
    return user;
  }

  return createKitchenSession(user.uid, sessionSnap.exists());
}

async function createKitchenSession(authUid, sessionExists) {
  const sessionRef = doc(db, 'centers', getActiveCenterId(), 'accessSessions', authUid);
  const payload = sessionExists ? {
    updatedAt: serverTimestamp()
  } : {
    centerId: getActiveCenterId(),
    scope: 'KITCHEN',
    targetType: 'CENTER',
    status: 'ACTIVE',
    expiresAt: createSessionExpiry(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(sessionRef, payload, { merge: true });
  rememberKitchenSession(authUid, payload.expiresAt);

  return getCurrentUser();
}

function rememberKitchenSession(authUid, expiresAt) {
  const expiryTime = expiresAt instanceof Date
    ? expiresAt.getTime()
    : expiresAt && typeof expiresAt.toDate === 'function'
      ? expiresAt.toDate().getTime()
      : Date.now() + SESSION_RECHECK_MS;
  validatedKitchenSession = {
    authUid,
    centerId: getActiveCenterId(),
    validUntil: Math.min(expiryTime, Date.now() + SESSION_RECHECK_MS)
  };
}

async function getActiveMealTypes(forceRefresh = false) {
  const centerId = getActiveCenterId();
  if (!forceRefresh
    && mealTypesCache?.centerId === centerId
    && Date.now() - mealTypesCache.loadedAt < STATIC_DATA_CACHE_MS) {
    return mealTypesCache.value;
  }
  if (mealTypesLoad?.centerId === centerId) return mealTypesLoad.promise;
  let request;
  request = getDocs(collection(db, 'centers', centerId, 'mealTypes'))
    .then((snapshot) => {
      const value = snapshot.docs
        .map((docSnap) => ({ mealTypeId: docSnap.id, ...docSnap.data() }))
        .filter((meal) => meal.status === 'ACTIVE')
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      mealTypesCache = { centerId, loadedAt: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (mealTypesLoad?.promise === request) mealTypesLoad = null;
    });
  mealTypesLoad = { centerId, promise: request };
  return request;
}

async function getMealWindows(mealDate, forceRefresh = false) {
  const centerId = getActiveCenterId();
  const cacheKey = `${centerId}:${mealDate}`;
  const cached = windowsCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.loadedAt < WINDOW_CACHE_MS) {
    return cached.value;
  }
  const snapshot = await getDocs(query(
    collection(db, 'centers', centerId, 'mealWindows'),
    where('mealDate', '==', mealDate)
  ));
  const value = snapshot.docs.map((docSnap) => ({ mealWindowId: docSnap.id, ...docSnap.data() }));
  writeBoundedCache(windowsCache, cacheKey, { loadedAt: Date.now(), value });
  return value;
}

async function getOverrides(mealDate) {
  const centerId = getActiveCenterId();
  const cacheKey = `${centerId}:${mealDate}`;
  const cached = overridesCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < OVERRIDE_CACHE_MS) {
    return cached.value;
  }
  const snapshot = await getDocs(query(
    collection(db, 'centers', centerId, 'reservationOverrides'),
    where('mealDate', '==', mealDate)
  ));
  const value = snapshot.docs.map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }));
  writeBoundedCache(overridesCache, cacheKey, { loadedAt: Date.now(), value });
  return value;
}

async function getRules(forceRefresh = false, staticVersion = '0') {
  const centerId = getActiveCenterId();
  if (
    !forceRefresh
    && rulesCache?.centerId === centerId
    && rulesCache.staticVersion === staticVersion
    && Date.now() - rulesCache.loadedAt < STATIC_DATA_CACHE_MS
  ) {
    return rulesCache.value;
  }
  const loadKey = `${centerId}:${staticVersion}`;
  if (rulesLoad?.key === loadKey) return rulesLoad.promise;
  let request;
  request = getDocs(collection(db, 'centers', centerId, 'reservationRules'))
    .then((snapshot) => {
      const value = snapshot.docs.map((docSnap) => ({ ruleId: docSnap.id, ...docSnap.data() }));
      rulesCache = { centerId, loadedAt: Date.now(), staticVersion, value };
      return value;
    })
    .finally(() => {
      if (rulesLoad?.promise === request) rulesLoad = null;
    });
  rulesLoad = { key: loadKey, promise: request };
  return request;
}

function countEffectiveReservations(rulesByParticipant, overrides, mealTypeId, mealDate) {
  const relevantOverrides = overrides.filter((override) => override.mealTypeId === mealTypeId);
  const overrideByParticipant = new Map(
    relevantOverrides.map((override) => [override.participantId, override])
  );
  const participantIds = new Set([
    ...rulesByParticipant.keys(),
    ...relevantOverrides.map((override) => override.participantId)
  ]);
  const counts = { total: 0, diets: new Map(), participants: [] };

  participantIds.forEach((participantId) => {
    const override = overrideByParticipant.get(participantId);
    const participantRules = rulesByParticipant.get(participantId) || [];
    const effect = resolveEffectiveEffect({
      participantId,
      mealTypeId,
      mealDate,
      rules: participantRules,
      override
    });
    if (effect !== 'PRESENT') {
      return;
    }

    const rule = findApplicableRule(participantRules, participantId, mealTypeId, mealDate);
    const dietTags = resolveEffectiveDietTags(rule, override);
    counts.total += 1;
    counts.participants.push({ participantId, dietTags });
    addDietCounts(counts.diets, dietTags);
  });

  return counts;
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

function formatDietCounts(diets) {
  return [...diets.entries()]
    .filter(([tag]) => tag !== 'STANDARD')
    .filter(([, count]) => count > 0)
    .map(([tag, count]) => ({ tag, label: formatDietLabel(tag, t), count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'));
}

function addDietCounts(target, dietTags) {
  const tags = Array.isArray(dietTags) && dietTags.length > 0 ? dietTags : ['STANDARD'];
  tags.forEach((tag) => target.set(tag, (target.get(tag) || 0) + 1));
}

function createSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_LIFETIME_DAYS);
  return expiresAt;
}
