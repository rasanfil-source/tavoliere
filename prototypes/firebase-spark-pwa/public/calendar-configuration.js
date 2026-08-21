import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import {
  db,
  getCurrentUser,
  setAdministratorTechnicalPassword,
  setResidentTechnicalPassword
} from './firebase-client.js?v=20260820u';
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
const ALLOWED_SUMMARY_LAYOUT_VALUES = new Set(['classic', 'international', 'future']);
const ALLOWED_KITCHEN_LAYOUT_VALUES = new Set(['classic', 'international']);
const ALLOWED_MONTH_LAYOUT_VALUES = new Set(['grid', 'future']);
const ALLOWED_MONTH_CONTROLS_SIDE_VALUES = new Set(['right', 'left']);
const ALLOWED_RESIDENT_LABEL_VALUES = new Set(['name', 'signature', 'initials']);
const ALLOWED_INTERFACE_STYLE_VALUES = new Set(['original', 'cool', 'urban-plus', 'future']);

export async function saveCenterConfiguration({
  name,
  appDisplayName,
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  interfaceStyle,
  defaultView,
  summaryLayout,
  kitchenLayout,
  monthLayout,
  monthControlsSide,
  summaryResidentLabel,
  language,
  commonPassword,
  administratorSharedPassword,
  currentAdministratorSharedPassword,
  administratorName,
  administratorSignature,
  adminEmail,
  adaptationsOnly = false,
  onProgress
}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }
  const user = getCurrentUser();
  if (!user || (user.isAnonymous && adaptationsOnly !== true)) {
    throw new Error('Accesso amministratore richiesto');
  }

  const centerId = getActiveCenterId();
  const centerRef = doc(db, 'centers', centerId);
  const jobRef = doc(db, 'centers', centerId, 'privateSettings', 'calendarReconfiguration');
  const centerSnapshot = await getDoc(centerRef);
  const jobSnapshot = adaptationsOnly ? null : await getDoc(jobRef);
  if (!centerSnapshot.exists()) {
    throw new Error('Il centro selezionato non esiste');
  }

  const center = centerSnapshot.data();
  const target = {
    name,
    ...(typeof appDisplayName === 'string' ? { appDisplayName } : {}),
    timezone,
    reservationCutoffs: normalizeReservationCutoffs(reservationCutoffs),
    participantContactSharingEnabled: Boolean(participantContactSharingEnabled),
    themePalette: typeof themePalette === 'string' ? themePalette : 'inchiostro',
    interfaceStyle: normalizeInterfaceStyle(interfaceStyle),
    defaultView: defaultView === 'week' ? 'week' : 'month',
    summaryLayout: normalizeLayout(summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
    kitchenLayout: normalizeLayout(kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
    monthLayout: normalizeLayout(monthLayout, 'grid', ALLOWED_MONTH_LAYOUT_VALUES),
    monthControlsSide: normalizeLayout(monthControlsSide, 'right', ALLOWED_MONTH_CONTROLS_SIDE_VALUES),
    summaryResidentLabel: normalizeResidentLabel(summaryResidentLabel, 'name'),
    language: typeof language === 'string' && language.trim()
      ? language
      : (typeof center.language === 'string' && center.language.trim() ? center.language : 'it'),
    commonPassword: typeof commonPassword === 'string' && commonPassword.length >= 4 ? commonPassword : null,
    administratorSharedPassword: typeof administratorSharedPassword === 'string'
      && administratorSharedPassword.length >= 6 ? administratorSharedPassword : null,
    adminPasswordVersion: Number(center.adminPasswordVersion || 0),
    adminTechnicalEmail: typeof center.adminTechnicalEmail === 'string'
      ? center.adminTechnicalEmail.trim().toLowerCase()
      : '',
    adminTechnicalUid: typeof center.adminTechnicalUid === 'string' ? center.adminTechnicalUid : '',
    administratorName,
    administratorSignature,
    adminEmail: typeof adminEmail === 'string' ? adminEmail : undefined
  };
  if (adaptationsOnly === true) {
    await savePresentationOnly(centerId, user, target);
    reportProgress(onProgress, { completedDays: 0, totalDays: 0, status: 'COMPLETED' });
    return { ...target, administratorSharedPassword: null };
  }
  if (target.commonPassword !== null) {
    await setResidentTechnicalPassword(
      centerId,
      typeof center.commonPassword === 'string' ? center.commonPassword : '',
      target.commonPassword
    );
  }
  if (target.administratorSharedPassword !== null) {
    const technicalIdentity = await setAdministratorTechnicalPassword(
      centerId,
      typeof currentAdministratorSharedPassword === 'string' ? currentAdministratorSharedPassword : '',
      target.administratorSharedPassword,
      {
        currentEmail: target.adminTechnicalEmail,
        nextVersion: target.adminPasswordVersion + 1
      }
    );
    target.adminTechnicalEmail = technicalIdentity.email;
    target.adminTechnicalUid = technicalIdentity.uid;
  }
  const activeJob = jobSnapshot?.exists() && jobSnapshot.data().status === 'ACTIVE'
    ? jobSnapshot.data()
    : null;
  const scheduleChanged = adaptationsOnly !== true && (
    center.timezone !== target.timezone
    || !sameCutoffs(normalizeReservationCutoffs(center.reservationCutoffs), target.reservationCutoffs)
  );
  const canResume = activeJob && jobMatchesTarget(activeJob, target);

  if (!scheduleChanged && !canResume) {
    await saveCenterWithoutCalendarRewrite(centerRef, centerId, user.uid, target);
    reportProgress(onProgress, { completedDays: 0, totalDays: 0, status: 'COMPLETED' });
    return { ...target, administratorSharedPassword: null };
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
  return { ...target, administratorSharedPassword: null };
}

async function saveCenterWithoutCalendarRewrite(centerRef, centerId, userUid, target) {
  await runTransaction(db, async (transaction) => {
    const centerUpdate = {
      name: target.name,
      timezone: target.timezone,
      reservationCutoffs: target.reservationCutoffs,
      participantContactSharingEnabled: target.participantContactSharingEnabled,
      themePalette: target.themePalette,
      interfaceStyle: target.interfaceStyle,
      defaultView: target.defaultView,
      summaryLayout: target.summaryLayout,
      kitchenLayout: target.kitchenLayout,
      monthLayout: target.monthLayout,
      monthControlsSide: target.monthControlsSide,
      summaryResidentLabel: target.summaryResidentLabel,
      language: target.language || 'it',
      administratorName: target.administratorName,
      administratorSignature: target.administratorSignature,
      administratorProfileComplete: true,
      updatedAt: serverTimestamp()
    };
    if (target.commonPassword !== null) {
      centerUpdate.commonPassword = target.commonPassword;
    }
    if (target.administratorSharedPassword !== null) {
      centerUpdate.adminPasswordVersion = target.adminPasswordVersion + 1;
      centerUpdate.adminSharedPasswordSet = true;
      centerUpdate.adminPasswordRotationRequired = false;
      centerUpdate.adminTechnicalEmail = target.adminTechnicalEmail;
      centerUpdate.adminTechnicalUid = target.adminTechnicalUid;
    }
    if (target.adminEmail !== undefined) {
      centerUpdate.adminEmail = target.adminEmail;
    }
    transaction.set(centerRef, centerUpdate, { merge: true });
    transaction.set(
      doc(db, 'centers', centerId, 'presentationSettings', 'current'),
      presentationData(centerId, target),
      { merge: true }
    );
    appendSettingsAuditEvent(transaction, centerId, userUid, target.commonPassword !== null);
  });
}

async function savePresentationOnly(centerId, user, target) {
  await runTransaction(db, async (transaction) => {
    transaction.set(
      doc(db, 'centers', centerId, 'presentationSettings', 'current'),
      presentationData(centerId, target),
      { merge: true }
    );
    appendSettingsAuditEvent(
      transaction,
      centerId,
      user.uid,
      false,
      user.isAnonymous ? 'viceAuditEvents' : 'auditEvents'
    );
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
      interfaceStyle: target.interfaceStyle,
      defaultView: target.defaultView,
      summaryLayout: target.summaryLayout,
      kitchenLayout: target.kitchenLayout,
      monthLayout: target.monthLayout,
      monthControlsSide: target.monthControlsSide,
      summaryResidentLabel: target.summaryResidentLabel,
      language: target.language || 'it',
      administratorName: target.administratorName,
      administratorSignature: target.administratorSignature,
      administratorProfileComplete: true,
      updatedAt: serverTimestamp()
    };
    if (target.commonPassword !== null) {
      centerUpdate.commonPassword = target.commonPassword;
    }
    if (target.administratorSharedPassword !== null) {
      centerUpdate.adminPasswordVersion = target.adminPasswordVersion + 1;
      centerUpdate.adminSharedPasswordSet = true;
      centerUpdate.adminPasswordRotationRequired = false;
      centerUpdate.adminTechnicalEmail = target.adminTechnicalEmail;
      centerUpdate.adminTechnicalUid = target.adminTechnicalUid;
    }
    if (target.adminEmail !== undefined) {
      centerUpdate.adminEmail = target.adminEmail;
    }
    transaction.set(centerRef, centerUpdate, { merge: true });
    transaction.set(
      doc(db, 'centers', centerId, 'presentationSettings', 'current'),
      presentationData(centerId, target),
      { merge: true }
    );
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

function appendSettingsAuditEvent(
  transaction,
  centerId,
  userUid,
  passwordChanged = false,
  collectionName = 'auditEvents'
) {
  const summaryParts = ['Aggiornate le impostazioni operative del centro'];
  if (passwordChanged) {
    summaryParts.push('password comune modificata');
  }
  transaction.set(doc(collection(db, 'centers', centerId, collectionName)), {
    centerId,
    actorUid: userUid,
    action: 'UPDATE_CENTER_SETTINGS',
    targetType: 'CENTER',
    targetId: centerId,
    summary: summaryParts.join(', '),
    createdAt: serverTimestamp()
  });
}

function presentationData(centerId, target) {
  return {
    centerId,
    ...(typeof target.appDisplayName === 'string'
      ? { appDisplayName: target.appDisplayName }
      : {}),
    participantContactSharingEnabled: target.participantContactSharingEnabled,
    themePalette: target.themePalette,
    interfaceStyle: target.interfaceStyle,
    defaultView: target.defaultView,
    summaryLayout: target.summaryLayout,
    kitchenLayout: target.kitchenLayout,
    monthLayout: target.monthLayout,
    monthControlsSide: target.monthControlsSide,
    summaryResidentLabel: target.summaryResidentLabel,
    language: target.language || 'it',
    updatedAt: serverTimestamp()
  };
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

function normalizeLayout(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function normalizeResidentLabel(value, fallback = 'name') {
  return ALLOWED_RESIDENT_LABEL_VALUES.has(value) ? value : fallback;
}

function normalizeInterfaceStyle(value) {
  const migratedValue = value === 'urban' ? 'urban-plus' : value;
  return ALLOWED_INTERFACE_STYLE_VALUES.has(migratedValue) ? migratedValue : 'urban-plus';
}
