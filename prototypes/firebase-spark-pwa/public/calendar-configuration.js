import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db, getCurrentUser, setResidentTechnicalPassword } from './firebase-client.js?v=20260816g';
import { getActiveCenterId } from './center-context.js?v=20260816h';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20260816g';
import {
  addDaysToDateId,
  buildMealWindowRecords,
  daysBetweenDateIds,
  normalizeReservationCutoffs
} from './schedule-utils.mjs?v=20260816g';

const MEAL_TYPES = [
  { mealTypeId: 'breakfast' },
  { mealTypeId: 'lunch' },
  { mealTypeId: 'dinner' }
];
const WINDOW_DAY_BATCH_SIZE = 132;
const DATE_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_LAYOUT_VALUES = new Set(['classic', 'international']);

export async function saveCenterConfiguration({
  name,
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  defaultView,
  summaryLayout,
  kitchenLayout,
  language,
  commonPassword,
  administratorName,
  administratorSignature,
  adminEmail,
  onProgress
}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const user = getCurrentUser();
  if (!user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto');
  }

  const centerId = getActiveCenterId();
  const centerRef = doc(db, 'centers', centerId);
  const jobRef = doc(db, 'centers', centerId, 'privateSettings', 'calendarReconfiguration');
  const [centerSnapshot, jobSnapshot] = await Promise.all([
    getDoc(centerRef),
    getDoc(jobRef)
  ]);
  if (!centerSnapshot.exists()) {
    throw new Error('Il centro selezionato non esiste');
  }

  const center = centerSnapshot.data();
  const target = {
    name,
    timezone,
    reservationCutoffs: normalizeReservationCutoffs(reservationCutoffs),
    participantContactSharingEnabled: Boolean(participantContactSharingEnabled),
    themePalette: typeof themePalette === 'string' ? themePalette : 'smeraldo',
    defaultView: defaultView === 'week' ? 'week' : 'month',
    summaryLayout: normalizeLayout(summaryLayout, 'international'),
    kitchenLayout: normalizeLayout(kitchenLayout, 'classic'),
    language: typeof language === 'string' ? language : 'it',
    commonPassword: typeof commonPassword === 'string' && commonPassword.length >= 4 ? commonPassword : null,
    administratorName,
    administratorSignature,
    adminEmail: typeof adminEmail === 'string' ? adminEmail : undefined
  };
  if (target.commonPassword !== null) {
    await setResidentTechnicalPassword(
      centerId,
      typeof center.commonPassword === 'string' ? center.commonPassword : '',
      target.commonPassword
    );
  }
  const activeJob = jobSnapshot.exists() && jobSnapshot.data().status === 'ACTIVE'
    ? jobSnapshot.data()
    : null;
  const scheduleChanged = center.timezone !== target.timezone
    || !sameCutoffs(normalizeReservationCutoffs(center.reservationCutoffs), target.reservationCutoffs);
  const canResume = activeJob && jobMatchesTarget(activeJob, target);

  if (!scheduleChanged && !canResume) {
    await saveCenterWithoutCalendarRewrite(centerRef, centerId, user.uid, target);
    reportProgress(onProgress, { completedDays: 0, totalDays: 0, status: 'COMPLETED' });
    return target;
  }

  const operationId = canResume ? activeJob.operationId : createOperationId();
  const startDateId = canResume
    ? activeJob.startDate
    : formatDateId(getDateInTimeZone(target.timezone));
  const targetThrough = DATE_ID_PATTERN.test(center.calendarCoveredThrough || '')
    ? center.calendarCoveredThrough
    : addDaysToDateId(startDateId, -1);
  const initialThrough = canResume
    ? activeJob.through
    : addDaysToDateId(startDateId, -1);
  const totalDays = targetThrough < startDateId
    ? 0
    : daysBetweenDateIds(startDateId, targetThrough);
  let completedDays = initialThrough < startDateId
    ? 0
    : Math.min(totalDays, daysBetweenDateIds(startDateId, initialThrough));

  if (!canResume) {
    await runTransaction(db, async (transaction) => {
      transaction.set(jobRef, calendarJobData({
        centerId,
        operationId,
        target,
        startDateId,
        through: initialThrough,
        targetThrough,
        status: 'ACTIVE'
      }));
    });
  }

  reportProgress(onProgress, { completedDays, totalDays, status: 'ACTIVE' });
  for (let offset = completedDays; offset < totalDays; offset += WINDOW_DAY_BATCH_SIZE) {
    const batchStartDateId = addDaysToDateId(startDateId, offset);
    const batchDays = Math.min(WINDOW_DAY_BATCH_SIZE, totalDays - offset);
    const through = addDaysToDateId(batchStartDateId, batchDays - 1);
    const records = buildMealWindowRecords({
      startDateId: batchStartDateId,
      days: batchDays,
      mealTypes: MEAL_TYPES,
      cutoffs: target.reservationCutoffs,
      timeZone: target.timezone
    });

    await runTransaction(db, async (transaction) => {
      const currentJob = await transaction.get(jobRef);
      if (!currentJob.exists()
          || currentJob.data().status !== 'ACTIVE'
          || currentJob.data().operationId !== operationId) {
        throw new Error('La configurazione è stata aggiornata da un altro amministratore. Ricarica il pannello.');
      }
      records.forEach((window) => {
        transaction.update(doc(db, 'centers', centerId, 'mealWindows', window.mealWindowId), {
          closesAt: window.closesAt,
          updatedAt: serverTimestamp()
        });
      });
      transaction.set(jobRef, calendarJobData({
        centerId,
        operationId,
        target,
        startDateId,
        through,
        targetThrough,
        status: 'ACTIVE'
      }));
    });

    completedDays += batchDays;
    reportProgress(onProgress, { completedDays, totalDays, status: 'ACTIVE' });
    await yieldToMainThread();
  }

  await completeConfiguration({
    centerRef,
    jobRef,
    centerId,
    operationId,
    userUid: user.uid,
    target,
    startDateId,
    targetThrough
  });
  reportProgress(onProgress, { completedDays: totalDays, totalDays, status: 'COMPLETED' });
  return target;
}

async function saveCenterWithoutCalendarRewrite(centerRef, centerId, userUid, target) {
  await runTransaction(db, async (transaction) => {
    const centerUpdate = {
      name: target.name,
      timezone: target.timezone,
      reservationCutoffs: target.reservationCutoffs,
      participantContactSharingEnabled: target.participantContactSharingEnabled,
      themePalette: target.themePalette,
      defaultView: target.defaultView,
      summaryLayout: target.summaryLayout,
      kitchenLayout: target.kitchenLayout,
      language: target.language || 'it',
      administratorName: target.administratorName,
      administratorSignature: target.administratorSignature,
      administratorProfileComplete: true,
      updatedAt: serverTimestamp()
    };
    if (target.commonPassword !== null) {
      centerUpdate.commonPassword = target.commonPassword;
    }
    if (target.adminEmail !== undefined) {
      centerUpdate.adminEmail = target.adminEmail;
    }
    transaction.set(centerRef, centerUpdate, { merge: true });
    appendSettingsAuditEvent(transaction, centerId, userUid, target.commonPassword !== null);
  });
}

async function completeConfiguration({
  centerRef,
  jobRef,
  centerId,
  operationId,
  userUid,
  target,
  startDateId,
  targetThrough
}) {
  await runTransaction(db, async (transaction) => {
    const currentJob = await transaction.get(jobRef);
    if (!currentJob.exists() || currentJob.data().operationId !== operationId) {
      throw new Error('La configurazione è stata aggiornata da un altro amministratore. Ricarica il pannello.');
    }
    const centerUpdate = {
      name: target.name,
      timezone: target.timezone,
      reservationCutoffs: target.reservationCutoffs,
      participantContactSharingEnabled: target.participantContactSharingEnabled,
      themePalette: target.themePalette,
      defaultView: target.defaultView,
      summaryLayout: target.summaryLayout,
      kitchenLayout: target.kitchenLayout,
      language: target.language || 'it',
      administratorName: target.administratorName,
      administratorSignature: target.administratorSignature,
      administratorProfileComplete: true,
      updatedAt: serverTimestamp()
    };
    if (target.commonPassword !== null) {
      centerUpdate.commonPassword = target.commonPassword;
    }
    if (target.adminEmail !== undefined) {
      centerUpdate.adminEmail = target.adminEmail;
    }
    transaction.set(centerRef, centerUpdate, { merge: true });
    transaction.set(jobRef, calendarJobData({
      centerId,
      operationId,
      target,
      startDateId,
      through: targetThrough,
      targetThrough,
      status: 'COMPLETED'
    }));
    appendSettingsAuditEvent(transaction, centerId, userUid, target.commonPassword !== null);
  });
}

function appendSettingsAuditEvent(transaction, centerId, userUid, passwordChanged = false) {
  const summaryParts = ['Aggiornate le impostazioni operative del centro'];
  if (passwordChanged) {
    summaryParts.push('password comune modificata');
  }
  transaction.set(doc(collection(db, 'centers', centerId, 'auditEvents')), {
    centerId,
    actorUid: userUid,
    action: 'UPDATE_CENTER_SETTINGS',
    targetType: 'CENTER',
    targetId: centerId,
    summary: summaryParts.join(', '),
    createdAt: serverTimestamp()
  });
}

function calendarJobData({
  centerId,
  operationId,
  target,
  startDateId,
  through,
  targetThrough,
  status
}) {
  return {
    centerId,
    operationId,
    status,
    targetName: target.name,
    targetTimezone: target.timezone,
    targetCutoffs: target.reservationCutoffs,
    startDate: startDateId,
    through,
    targetThrough,
    completedAt: status === 'COMPLETED' ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  };
}

function jobMatchesTarget(job, target) {
  return job.targetName === target.name
    && job.targetTimezone === target.timezone
    && sameCutoffs(job.targetCutoffs, target.reservationCutoffs)
    && DATE_ID_PATTERN.test(job.startDate || '')
    && DATE_ID_PATTERN.test(job.through || '')
    && DATE_ID_PATTERN.test(job.targetThrough || '');
}

function sameCutoffs(left, right) {
  return left.lunch === right.lunch
    && left.dinner === right.dinner
    && left.nextDayBreakfast === right.nextDayBreakfast;
}

function createOperationId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replaceAll('-', '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function reportProgress(onProgress, progress) {
  if (typeof onProgress === 'function') {
    onProgress(progress);
  }
}

function yieldToMainThread() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function normalizeLayout(value, fallback) {
  return ALLOWED_LAYOUT_VALUES.has(value) ? value : fallback;
}
