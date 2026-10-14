import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20261014b';
import { getActiveCenterId } from './center-context.js?v=20261014b';
import { formatDateId } from './date-utils.mjs?v=20261014b';
import { normalizeDietCode } from './diet-utils.mjs?v=20261014b';

const DAILY_OPERATION_CACHE_MS = 60 * 1000;
const DAILY_CACHE_MAX_ENTRIES = 30;
const dailyOperationCache = new Map();
const dailyHealthCache = new Map();

function readCenterCache(cache, dateId, centerId) {
  const entry = cache.get(dateId);
  return entry?.centerId === centerId ? entry : null;
}

function writeCenterCache(cache, dateId, centerId, value) {
  cache.delete(dateId);
  cache.set(dateId, { centerId, loadedAt: Date.now(), value });
  while (cache.size > DAILY_CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

export async function loadDailyOperation(date = new Date(), options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  const dateId = formatDateId(date);
  const centerId = getActiveCenterId();
  const cached = readCenterCache(dailyOperationCache, dateId, centerId);
  if (!options.forceRefresh && cached && Date.now() - cached.loadedAt < DAILY_OPERATION_CACHE_MS) {
    return cached.value;
  }

  const operationRef = doc(db, 'centers', centerId, 'dailyOperations', dateId);
  const operationSnapshot = await getDoc(operationRef);
  const data = operationSnapshot.exists() ? operationSnapshot.data() : {};
  const value = {
    dateId,
    massScheduled: data.massScheduled === true,
    updatedAt: data.updatedAt || null
  };
  writeCenterCache(dailyOperationCache, dateId, centerId, value);
  return value;
}

export async function loadDailyOperations(dates, options = {}) {
  return Promise.all((dates || []).map((date) => loadDailyOperation(date, options)));
}

export async function saveMassStatus(date, massScheduled) {
  const values = await saveMassStatuses([date], massScheduled);
  return values[0];
}

export async function saveMassStatuses(dates, massScheduled) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const centerId = getActiveCenterId();
  const dateIds = [...new Set((dates || []).map((date) => formatDateId(date)))];
  if (dateIds.length === 0 || dateIds.length > 7) {
    throw new Error('Seleziona da uno a sette giorni');
  }
  const batch = writeBatch(db);
  dateIds.forEach((dateId) => {
    batch.set(doc(db, 'centers', centerId, 'dailyOperations', dateId), {
      centerId,
      dateId,
      massScheduled: massScheduled === true,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();

  return dateIds.map((dateId) => {
    const value = {
      dateId,
      massScheduled: massScheduled === true,
      updatedAt: new Date()
    };
    writeCenterCache(dailyOperationCache, dateId, centerId, value);
    return value;
  });
}

export async function loadDailyHealth(date = new Date(), options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const centerId = getActiveCenterId();
  const cached = readCenterCache(dailyHealthCache, dateId, centerId);
  if (!options.forceRefresh && cached && Date.now() - cached.loadedAt < DAILY_OPERATION_CACHE_MS) {
    return cloneDailyHealth(cached.value);
  }
  const snapshot = await getDoc(doc(db, 'centers', centerId, 'dailyHealth', dateId));
  const data = snapshot.exists() ? snapshot.data() : {};
  const value = {
    dateId,
    sickPeople: normalizeSickPeople(data.sickPeople),
    dietAssignments: normalizeDietAssignments(data.dietAssignments),
    invitedMeals: normalizeInvitedMeals(data.invitedMeals),
    updatedAt: data.updatedAt || null
  };
  writeCenterCache(dailyHealthCache, dateId, centerId, value);
  return cloneDailyHealth(value);
}

function cloneDailyHealth(value) {
  return { ...value, sickPeople: value.sickPeople.map((person) => ({ ...person })),
    dietAssignments: value.dietAssignments.map((assignment) => ({ ...assignment })),
    invitedMeals: { ...value.invitedMeals } };
}

export async function saveSickPeople(date, sickPeople, options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const centerId = getActiveCenterId();
  const normalizedPeople = normalizeSickPeople(sickPeople);
  const previous = normalizeSickPeople(options.previousPeople
    ?? readCenterCache(dailyHealthCache, dateId, centerId)?.value.sickPeople);
  const selectedIds = new Set(normalizedPeople.map((person) => person.participantId));
  const previousIds = new Set(previous.map((person) => person.participantId));
  const removedIds = new Set([...previousIds].filter((id) => !selectedIds.has(id)));
  const additions = normalizedPeople.filter((person) => !previousIds.has(person.participantId));
  const reference = doc(db, 'centers', centerId, 'dailyHealth', dateId);
  const value = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {};
    const people = new Map(normalizeSickPeople(current.sickPeople)
      .filter((person) => !removedIds.has(person.participantId))
      .map((person) => [person.participantId, person]));
    additions.forEach((person) => people.set(person.participantId, person));
    if (people.size > 100) throw new Error('Limite di 100 persone ammalate raggiunto');
    const savedPeople = [...people.values()];
    transaction.set(reference, {
      centerId, dateId, sickPeople: savedPeople, updatedAt: serverTimestamp()
    }, { merge: true });
    return { dateId, sickPeople: savedPeople,
      dietAssignments: normalizeDietAssignments(current.dietAssignments),
      invitedMeals: normalizeInvitedMeals(current.invitedMeals), updatedAt: new Date() };
  });
  writeCenterCache(dailyHealthCache, dateId, centerId, value);
  return cloneDailyHealth(value);
}

export async function saveDietAssignments(date, participantId, dietTag) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const centerId = getActiveCenterId();
  const normalizedId = String(participantId || '').trim();
  const normalizedTag = normalizeDietCode(dietTag);
  if (!normalizedId || (normalizedTag !== 'STANDARD'
    && normalizeDietAssignments([{ participantId: normalizedId, dietTag: normalizedTag }]).length !== 1)) {
    throw new Error('Persona o dieta non valida');
  }
  const reference = doc(db, 'centers', centerId, 'dailyHealth', dateId);
  const value = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {};
    const assignments = normalizeDietAssignments(current.dietAssignments)
      .filter((assignment) => assignment.participantId !== normalizedId);
    if (normalizedTag !== 'STANDARD') {
      if (assignments.length >= 100) throw new Error('Limite di 100 diete giornaliere raggiunto');
      assignments.push({ participantId: normalizedId, dietTag: normalizedTag });
    }
    transaction.set(reference, {
      centerId,
      dateId,
      dietAssignments: assignments,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return {
      dateId,
      sickPeople: normalizeSickPeople(current.sickPeople),
      dietAssignments: assignments,
      invitedMeals: normalizeInvitedMeals(current.invitedMeals),
      updatedAt: new Date()
    };
  });
  writeCenterCache(dailyHealthCache, dateId, centerId, value);
  return cloneDailyHealth(value);
}

export async function saveInvitedMeals(date, invitedMeals) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const centerId = getActiveCenterId();
  const normalizedInvitedMeals = normalizeInvitedMeals(invitedMeals);
  const reference = doc(db, 'centers', centerId, 'dailyHealth', dateId);
  const value = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {};
    transaction.set(reference, {
      centerId, dateId, invitedMeals: normalizedInvitedMeals, updatedAt: serverTimestamp()
    }, { merge: true });
    return { dateId, sickPeople: normalizeSickPeople(current.sickPeople),
      dietAssignments: normalizeDietAssignments(current.dietAssignments),
      invitedMeals: normalizedInvitedMeals, updatedAt: new Date() };
  });
  writeCenterCache(dailyHealthCache, dateId, centerId, value);
  return cloneDailyHealth(value);
}

function normalizeSickPeople(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((person) => ({
      participantId: String(person?.participantId || '').trim(),
      displayName: String(person?.displayName || '').trim(),
      groupId: person?.groupId === 'group_ospiti' ? 'group_ospiti' : 'group_residenti'
    }))
    .filter((person) => person.participantId && person.displayName && !seen.has(person.participantId) && seen.add(person.participantId))
    .slice(0, 100);
}

function normalizeDietAssignments(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((assignment) => ({
      participantId: String(assignment?.participantId || '').trim(),
      dietTag: normalizeDietCode(assignment?.dietTag)
    }))
    .filter((assignment) => (
      assignment.participantId
      && assignment.dietTag
      && assignment.dietTag !== 'STANDARD'
      && /^\d+$/.test(assignment.dietTag)
      && Number(assignment.dietTag) >= 1
      && Number(assignment.dietTag) <= 999
      && !seen.has(assignment.participantId)
      && seen.add(assignment.participantId)
    ))
    .slice(0, 100);
}

function normalizeInvitedMeals(value = {}) {
  return ['breakfast', 'lunch', 'dinner'].reduce((result, mealTypeId) => {
    result[mealTypeId] = Math.min(999, Math.max(0, Math.floor(Number(value?.[mealTypeId]) || 0)));
    return result;
  }, {});
}
