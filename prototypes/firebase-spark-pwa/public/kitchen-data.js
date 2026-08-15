import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser, signInAnonymousUser, signOutCurrentUser, waitForAuthReady } from './firebase-client.js?v=20260809c';
import { getActiveCenterId, getCenterScopedStorageKey } from './center-context.js?v=20260808c';
import {
  findApplicableRule,
  resolveEffectiveDietTags,
  resolveEffectiveEffect
} from './reservation-state.mjs?v=20260809d';
import { formatDateId } from './date-utils.mjs?v=20260809a';
import { formatDietLabel } from './diet-utils.mjs?v=20260810a';

const KITCHEN_TOKEN_STORAGE_KEY = 'tavolaComune.kitchenToken';
const KITCHEN_DEMO_EXPIRES_AT = new Date('2031-12-31T22:59:59Z');
const SESSION_LIFETIME_DAYS = 30;
const SESSION_RECHECK_MS = 5 * 60 * 1000;
const STATIC_DATA_CACHE_MS = 6 * 60 * 60 * 1000;
const WINDOW_CACHE_MS = 10 * 60 * 1000;
let mealTypesCache = null;
let rulesCache = null;
let validatedKitchenSession = null;
const windowsCache = new Map();

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
  const tokenId = getKitchenTokenId();
  if (!tokenId) {
    throw new Error('Apri il collegamento cucina fornito dal responsabile del centro.');
  }
  const sessionRef = doc(db, 'centers', getActiveCenterId(), 'accessSessions', authUid);
  const payload = sessionExists ? {
    updatedAt: serverTimestamp()
  } : {
    centerId: getActiveCenterId(),
    scope: 'KITCHEN',
    targetType: 'CENTER',
    tokenId,
    status: 'ACTIVE',
    expiresAt: createSessionExpiry(KITCHEN_DEMO_EXPIRES_AT),
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
  if (!forceRefresh && mealTypesCache && Date.now() - mealTypesCache.loadedAt < STATIC_DATA_CACHE_MS) {
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

async function getMealWindows(mealDate, forceRefresh = false) {
  const cached = windowsCache.get(mealDate);
  if (!forceRefresh && cached && Date.now() - cached.loadedAt < WINDOW_CACHE_MS) {
    return cached.value;
  }
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'mealWindows'),
    where('mealDate', '==', mealDate)
  ));
  const value = snapshot.docs.map((docSnap) => ({ mealWindowId: docSnap.id, ...docSnap.data() }));
  windowsCache.set(mealDate, { loadedAt: Date.now(), value });
  return value;
}

async function getOverrides(mealDate) {
  const snapshot = await getDocs(query(
    collection(db, 'centers', getActiveCenterId(), 'reservationOverrides'),
    where('mealDate', '==', mealDate)
  ));
  return snapshot.docs.map((docSnap) => ({ overrideId: docSnap.id, ...docSnap.data() }));
}

async function getRules(forceRefresh = false, staticVersion = '0') {
  if (
    !forceRefresh
    && rulesCache
    && rulesCache.staticVersion === staticVersion
    && Date.now() - rulesCache.loadedAt < STATIC_DATA_CACHE_MS
  ) {
    return rulesCache.value;
  }
  const snapshot = await getDocs(collection(db, 'centers', getActiveCenterId(), 'reservationRules'));
  const value = snapshot.docs.map((docSnap) => ({ ruleId: docSnap.id, ...docSnap.data() }));
  rulesCache = { loadedAt: Date.now(), staticVersion, value };
  return value;
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
    .map(([tag, count]) => ({ tag, label: formatDietLabel(tag), count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'));
}

function addDietCounts(target, dietTags) {
  const tags = Array.isArray(dietTags) && dietTags.length > 0 ? dietTags : ['STANDARD'];
  tags.forEach((tag) => target.set(tag, (target.get(tag) || 0) + 1));
}

function createSessionExpiry(tokenExpiresAt) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_LIFETIME_DAYS);
  return expiresAt < tokenExpiresAt ? expiresAt : tokenExpiresAt;
}


function getKitchenTokenId() {
  const tokenId = String(new URLSearchParams(window.location.search).get('t') || '').trim();
  const storageKey = getCenterScopedStorageKey(KITCHEN_TOKEN_STORAGE_KEY);
  if (tokenId) {
    try {
      window.localStorage.setItem(storageKey, tokenId);
    } catch {
      // Il collegamento nell'URL resta utilizzabile anche senza persistenza locale.
    }
    return tokenId;
  }
  try {
    return String(window.localStorage.getItem(storageKey) || '').trim();
  } catch {
    return '';
  }
}
