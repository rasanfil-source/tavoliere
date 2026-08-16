import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20260816g';
import { getActiveCenterId } from './center-context.js?v=20260816h';
import { formatDateId } from './date-utils.mjs?v=20260816g';
import { normalizeDietCode } from './diet-utils.mjs?v=20260816g';

const DAILY_OPERATION_CACHE_MS = 60 * 1000;
const dailyOperationCache = new Map();
const dailyHealthCache = new Map();

export async function loadDailyOperation(date = new Date(), options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  const dateId = formatDateId(date);
  const cached = dailyOperationCache.get(dateId);
  if (!options.forceRefresh && cached && Date.now() - cached.loadedAt < DAILY_OPERATION_CACHE_MS) {
    return cached.value;
  }

  const operationRef = doc(db, 'centers', getActiveCenterId(), 'dailyOperations', dateId);
  const operationSnapshot = await getDoc(operationRef);
  const data = operationSnapshot.exists() ? operationSnapshot.data() : {};
  const value = {
    dateId,
    massScheduled: data.massScheduled === true,
    updatedAt: data.updatedAt || null
  };
  dailyOperationCache.set(dateId, { loadedAt: Date.now(), value });
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
    dailyOperationCache.set(dateId, { loadedAt: Date.now(), value });
    return value;
  });
}

export async function loadDailyHealth(date = new Date(), options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const cached = dailyHealthCache.get(dateId);
  if (!options.forceRefresh && cached && Date.now() - cached.loadedAt < DAILY_OPERATION_CACHE_MS) {
    return cached.value;
  }
  const snapshot = await getDoc(doc(db, 'centers', getActiveCenterId(), 'dailyHealth', dateId));
  const data = snapshot.exists() ? snapshot.data() : {};
  const value = {
    dateId,
    sickPeople: normalizeSickPeople(data.sickPeople),
    dietAssignments: normalizeDietAssignments(data.dietAssignments),
    updatedAt: data.updatedAt || null
  };
  dailyHealthCache.set(dateId, { loadedAt: Date.now(), value });
  return value;
}

export async function saveSickPeople(date, sickPeople) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const normalizedPeople = normalizeSickPeople(sickPeople);
  await setDoc(doc(db, 'centers', getActiveCenterId(), 'dailyHealth', dateId), {
    centerId: getActiveCenterId(),
    dateId,
    sickPeople: normalizedPeople,
    updatedAt: serverTimestamp()
  }, { merge: true });
  const value = {
    dateId,
    sickPeople: normalizedPeople,
    dietAssignments: dailyHealthCache.get(dateId)?.value?.dietAssignments || [],
    updatedAt: new Date()
  };
  dailyHealthCache.set(dateId, { loadedAt: Date.now(), value });
  return value;
}

export async function saveDietAssignments(date, dietAssignments) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const normalizedAssignments = normalizeDietAssignments(dietAssignments);
  const sickPeople = dailyHealthCache.get(dateId)?.value?.sickPeople || [];
  await setDoc(doc(db, 'centers', getActiveCenterId(), 'dailyHealth', dateId), {
    centerId: getActiveCenterId(),
    dateId,
    sickPeople,
    dietAssignments: normalizedAssignments,
    updatedAt: serverTimestamp()
  }, { merge: true });
  const value = {
    dateId,
    sickPeople,
    dietAssignments: normalizedAssignments,
    updatedAt: new Date()
  };
  dailyHealthCache.set(dateId, { loadedAt: Date.now(), value });
  return value;
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
