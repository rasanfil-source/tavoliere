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
import { zonedLocalDateTimeToDate } from './schedule-utils.mjs?v=20261014b';

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
    blessingTime: data.blessingTime || '',
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
      ...readCenterCache(dailyOperationCache, dateId, centerId)?.value,
      dateId,
      massScheduled: massScheduled === true,
      updatedAt: new Date()
    };
    // La scrittura parziale conserva la benedizione sul server; rileggere al prossimo accesso.
    dailyOperationCache.delete(dateId);
    return value;
  });
}

export function validateBlessingTime(dateId, time, timezone = 'Europe/Rome', now = new Date()) {
  if (time && zonedLocalDateTimeToDate(dateId, time, timezone).getTime() <= now.getTime()) {
    throw Object.assign(new Error('La data o l’ora della benedizione è già trascorsa.'), { code: 'blessing/past-time' });
  }
}

function validateBlessingWindow(snapshot) {
  if (!snapshot.exists()) {
    throw Object.assign(new Error('Calendario non disponibile per il giorno scelto.'), { code: 'blessing/calendar-unavailable' });
  }
  const window = snapshot.data();
  const closesAt = window.closesAt?.toDate ? window.closesAt.toDate() : new Date(window.closesAt);
  if (window.status !== 'OPEN' || !Number.isFinite(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
    throw Object.assign(new Error('Il termine per le modifiche di questa giornata è scaduto.'), { code: 'blessing/cutoff' });
  }
}

function validateBlessingChange(lunchSnapshot, centerSnapshot, previousTime, time) {
  if (previousTime === time) return;
  if (!lunchSnapshot.exists() || !centerSnapshot.exists()) {
    throw Object.assign(new Error('Calendario non disponibile per il giorno scelto.'), { code: 'blessing/calendar-unavailable' });
  }
  const lunch = lunchSnapshot.data();
  const closesAt = lunch.closesAt?.toDate ? lunch.closesAt.toDate() : new Date(lunch.closesAt);
  if (!Number.isFinite(closesAt.getTime())) {
    throw Object.assign(new Error('Calendario non disponibile per il giorno scelto.'), { code: 'blessing/calendar-unavailable' });
  }
  // HH:mm usa il fuso del centro, come gli orari configurati e le regole Firestore.
  const dinnerTime = centerSnapshot.data().reservationCutoffs?.dinner || '15:00';
  if ((lunch.status !== 'OPEN' || closesAt.getTime() <= Date.now())
    && ((previousTime && previousTime <= dinnerTime) || (time && time <= dinnerTime))) {
    throw Object.assign(new Error('Il limite del pranzo è scaduto: sono modificabili solo benedizioni successive al limite della cena.'),
      { code: 'blessing/lunch-cutoff' });
  }
}

export async function saveBlessing(date, time, { timezone = 'Europe/Rome' } = {}) {
  if (!db) throw new Error('Firebase non configurato');
  if (typeof time !== 'string' || (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    throw new Error('Orario non valido');
  }
  const centerId = getActiveCenterId();
  const dateId = formatDateId(date);
  validateBlessingTime(dateId, time, timezone);
  const reference = doc(db, 'centers', centerId, 'dailyOperations', dateId);
  const windowReference = doc(db, 'centers', centerId, 'mealWindows', `${dateId}_dinner`);
  const lunchReference = doc(db, 'centers', centerId, 'mealWindows', `${dateId}_lunch`);
  const centerReference = doc(db, 'centers', centerId);
  const value = await runTransaction(db, async (transaction) => {
    // Lettura solo al salvataggio: usa la stessa scadenza verificata dalle regole.
    validateBlessingWindow(await transaction.get(windowReference));
    validateBlessingTime(dateId, time, timezone);
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {};
    if ((current.blessingTime || '') !== time) {
      validateBlessingChange(await transaction.get(lunchReference), await transaction.get(centerReference),
        current.blessingTime || '', time);
    }
    transaction.set(reference, {
      centerId, dateId, blessingTime: time, updatedAt: serverTimestamp(),
      ...(!snapshot.exists() ? { massScheduled: false } : {})
    }, { merge: true });
    return { dateId, massScheduled: current.massScheduled === true, blessingTime: time, updatedAt: new Date() };
  }).catch(async error => {
    if (['permission-denied', 'firestore/permission-denied'].includes(error.code)) {
      // La scadenza può essere superata fra lettura e commit. Un errore di rete
      // durante questa verifica non deve nascondere il rifiuto originale.
      const snapshot = await getDoc(windowReference).catch(() => null);
      if (snapshot) validateBlessingWindow(snapshot);
      const context = await Promise.all([getDoc(lunchReference), getDoc(centerReference), getDoc(reference)])
        .catch(() => null);
      if (context) validateBlessingChange(context[0], context[1], context[2].data()?.blessingTime || '', time);
    }
    throw error;
  });
  writeCenterCache(dailyOperationCache, dateId, centerId, value);
  return value;
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
  const previousPeople = options.previousPeople
    ?? readCenterCache(dailyHealthCache, dateId, centerId)?.value.sickPeople;
  const selectedIds = new Set(normalizedPeople.map((person) => person.participantId));
  const reference = doc(db, 'centers', centerId, 'dailyHealth', dateId);
  const value = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {};
    const previous = normalizeSickPeople(previousPeople ?? current.sickPeople);
    const previousIds = new Set(previous.map((person) => person.participantId));
    const removedIds = new Set([...previousIds].filter((id) => !selectedIds.has(id)));
    const additions = normalizedPeople.filter((person) => !previousIds.has(person.participantId));
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

export async function saveInvitedMeals(date, invitedMeals, options = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const dateId = formatDateId(date);
  const centerId = getActiveCenterId();
  const normalizedInvitedMeals = normalizeInvitedMeals(invitedMeals);
  const reference = doc(db, 'centers', centerId, 'dailyHealth', dateId);
  // L’Agenda raggruppa pranzo e cena con la colazione della mattina successiva.
  const breakfastDate = new Date(date);
  breakfastDate.setDate(breakfastDate.getDate() + 1);
  const breakfastDateId = formatDateId(breakfastDate);
  const breakfastRef = options.nextDayBreakfast && (!options.through || breakfastDateId <= options.through)
    ? doc(db, 'centers', centerId, 'dailyHealth', breakfastDateId) : null;
  let breakfastValue;
  const value = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists() ? snapshot.data() : {};
    const breakfastSnapshot = breakfastRef ? await transaction.get(breakfastRef) : null;
    const savedMeals = { ...normalizedInvitedMeals };
    if (options.nextDayBreakfast) {
      savedMeals.breakfast = normalizeInvitedMeals(current.invitedMeals).breakfast;
    }
    if (breakfastRef) {
      const next = breakfastSnapshot.exists() ? breakfastSnapshot.data() : {};
      const nextMeals = { ...normalizeInvitedMeals(next.invitedMeals), breakfast: normalizedInvitedMeals.breakfast };
      transaction.set(breakfastRef, {
        centerId, dateId: breakfastDateId, invitedMeals: nextMeals, updatedAt: serverTimestamp()
      }, { merge: true });
      breakfastValue = { dateId: breakfastDateId, sickPeople: normalizeSickPeople(next.sickPeople),
        dietAssignments: normalizeDietAssignments(next.dietAssignments), invitedMeals: nextMeals, updatedAt: new Date() };
    }
    transaction.set(reference, {
      centerId, dateId, invitedMeals: savedMeals, updatedAt: serverTimestamp()
    }, { merge: true });
    return { dateId, sickPeople: normalizeSickPeople(current.sickPeople),
      dietAssignments: normalizeDietAssignments(current.dietAssignments),
      invitedMeals: savedMeals, updatedAt: new Date() };
  });
  writeCenterCache(dailyHealthCache, dateId, centerId, value);
  if (breakfastValue) writeCenterCache(dailyHealthCache, breakfastDateId, centerId, breakfastValue);
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
