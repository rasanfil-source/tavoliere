import {
  collection,
  doc,
  deleteField,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import {
  db,
  getCurrentUser,
  setAdministratorTechnicalPassword,
  setResidentTechnicalPassword
} from './firebase-client.js?v=20261014b';
import { getActiveCenterId } from './center-context.js?v=20261014b';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20261014b';
import {
  addDaysToDateId,
  buildMealWindowRecords,
  daysBetweenDateIds,
  normalizeReservationCutoffs
} from './schedule-utils.mjs?v=20261014b';

const MEAL_TYPES = [
  { mealTypeId: 'breakfast' },
  { mealTypeId: 'lunch' },
  { mealTypeId: 'dinner' }
];
// Ogni giorno richiede ora tre letture oltre alle scritture: blocchi più
// piccoli limitano il lavoro da ripetere in caso di conflitto o disconnessione.
const WINDOW_DAY_BATCH_SIZE = 60;
const DATE_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_SUMMARY_LAYOUT_VALUES = new Set(['classic', 'international', 'future']);
const ALLOWED_KITCHEN_LAYOUT_VALUES = new Set(['classic', 'international']);
const ALLOWED_MONTH_CONTROLS_SIDE_VALUES = new Set(['right', 'left']);
const ALLOWED_RESIDENT_LABEL_VALUES = new Set(['name', 'signature', 'initials']);
const ALLOWED_INTERFACE_STYLE_VALUES = new Set(['original', 'cool', 'urban-plus', 'future']);
const DEFAULT_OPENING_VIEW = 'week';

export async function saveCenterConfiguration({
  name,
  appDisplayName,
  appDisplaySubtitle,
  startupPresentationEnabled,
  timezone,
  reservationCutoffs,
  participantContactSharingEnabled,
  themePalette,
  interfaceStyle,
  defaultView,
  summaryLayout,
  kitchenLayout,
  monthControlsSide,
  summaryResidentLabel,
  language,
  commonPassword,
  administratorSharedPassword,
  currentAdministratorSharedPassword,
  administratorName,
  administratorSignature,
  adminEmail,
  administratorSave,
  preserveAdministratorProfile = false,
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
  // Le preferenze personali non fanno parte della configurazione del centro.
  // I valori omessi mantengono la presentazione condivisa, anche dopo un ripristino.
  themePalette ??= center.themePalette;
  interfaceStyle ??= center.interfaceStyle;
  defaultView ??= center.defaultView;
  summaryLayout ??= center.summaryLayout;
  kitchenLayout ??= center.kitchenLayout;
  monthControlsSide ??= center.monthControlsSide;
  summaryResidentLabel ??= center.summaryResidentLabel;
  const target = {
    name,
    ...(typeof appDisplayName === 'string' ? { appDisplayName } : {}),
    ...(typeof appDisplaySubtitle === 'string' ? { appDisplaySubtitle } : {}),
    ...(typeof startupPresentationEnabled === 'boolean' ? { startupPresentationEnabled } : {}),
    timezone,
    reservationCutoffs: normalizeReservationCutoffs(reservationCutoffs),
    participantContactSharingEnabled: Boolean(participantContactSharingEnabled),
    themePalette: typeof themePalette === 'string' ? themePalette : 'inchiostro',
    interfaceStyle: normalizeInterfaceStyle(interfaceStyle),
    defaultView: defaultView === 'month' ? 'month' : DEFAULT_OPENING_VIEW,
    summaryLayout: normalizeLayout(summaryLayout, 'classic', ALLOWED_SUMMARY_LAYOUT_VALUES),
    kitchenLayout: normalizeLayout(kitchenLayout, 'classic', ALLOWED_KITCHEN_LAYOUT_VALUES),
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
    preserveAdministratorProfile,
    administratorProfileComplete: center.administratorProfileRequired !== true || center.administratorProfileComplete === true,
    ...(administratorSave ? { administratorParticipantId: administratorSave.participantId } : {}),
    adminEmail: typeof adminEmail === 'string' ? adminEmail : undefined
  };
  if (adaptationsOnly === true) {
    await savePresentationOnly(centerId, user, target);
    reportProgress(onProgress, { completedDays: 0, totalDays: 0, status: 'COMPLETED' });
    return { ...target, commonPassword: null, administratorSharedPassword: null };
  }
  const credentialSettings = await saveSharedCredentials(centerId, {
    commonPassword: target.commonPassword,
    administratorSharedPassword: target.administratorSharedPassword,
    currentAdministratorSharedPassword
  }, onProgress);
  Object.assign(target, credentialSettings);
  reportProgress(onProgress, { status: 'CREDENTIALS_SAVED', settings: credentialSettings });
  const activeJob = jobSnapshot?.exists() && jobSnapshot.data().status === 'ACTIVE'
    ? jobSnapshot.data()
    : null;
  const scheduleChanged = adaptationsOnly !== true && (
    center.timezone !== target.timezone
    || !sameCutoffs(normalizeReservationCutoffs(center.reservationCutoffs), target.reservationCutoffs)
  );
  const canResume = activeJob && jobMatchesTarget(activeJob, target);

  // Un'attività ACTIVE può avere già scritto alcune finestre, anche quando le impostazioni richieste coincidono con quelle del centro.
  if (!scheduleChanged && !activeJob) {
    await saveCenterWithoutCalendarRewrite(centerRef, jobRef, jobSnapshot, centerId, user.uid, target, administratorSave);
    await administratorSave?.complete();
    reportProgress(onProgress, { completedDays: 0, totalDays: 0, status: 'COMPLETED' });
    return { ...target, commonPassword: null, administratorSharedPassword: null };
  }

  const operationId = canResume ? activeJob.operationId : createOperationId();
  const todayDateId = formatDateId(getDateInTimeZone(target.timezone));
  const startDateId = canResume
    ? activeJob.startDate
    : activeJob && DATE_ID_PATTERN.test(activeJob.startDate || '') && activeJob.startDate < todayDateId
      ? activeJob.startDate
      : todayDateId;
  const coveredThrough = DATE_ID_PATTERN.test(center.calendarCoveredThrough || '')
    ? center.calendarCoveredThrough
    : addDaysToDateId(startDateId, -1);
  const targetThrough = activeJob && DATE_ID_PATTERN.test(activeJob.targetThrough || '')
      && activeJob.targetThrough > coveredThrough
    ? activeJob.targetThrough
    : coveredThrough;
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
      const [currentJob, currentCenter] = await Promise.all([
        transaction.get(jobRef), transaction.get(centerRef)
      ]);
      assertJobUnchanged(jobSnapshot, currentJob);
      if (!currentCenter.exists() || !sameCenterSchedule(currentCenter.data(), center)) {
        throw configurationConflictError();
      }
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
    const expectedThrough = completedDays === 0
      ? addDaysToDateId(startDateId, -1)
      : addDaysToDateId(startDateId, completedDays - 1);

    await runTransaction(db, async (transaction) => {
      const currentJob = await transaction.get(jobRef);
      if (!currentJob.exists()
          || currentJob.data().status !== 'ACTIVE'
          || currentJob.data().operationId !== operationId
          || currentJob.data().through !== expectedThrough) {
        throw configurationConflictError();
      }
      const windows = await Promise.all(records.map(window => transaction.get(
        doc(db, 'centers', centerId, 'mealWindows', window.mealWindowId))));
      records.forEach((window, index) => {
        const ref = doc(db, 'centers', centerId, 'mealWindows', window.mealWindowId);
        if (windows[index].exists()) {
          transaction.update(ref, { closesAt: window.closesAt, updatedAt: serverTimestamp() });
        } else {
          transaction.set(ref, { centerId, mealDate: window.mealDate,
            mealTypeId: window.mealTypeId, status: 'OPEN', closesAt: window.closesAt,
            updatedAt: serverTimestamp() });
        }
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
    targetThrough,
    administratorSave
  });
  await administratorSave?.complete();
  reportProgress(onProgress, { completedDays: totalDays, totalDays, status: 'COMPLETED' });
  return { ...target, commonPassword: null, administratorSharedPassword: null };
}

// Auth e Firestore non condividono una transazione. Conserviamo prima un intento
// privato riprendibile, poi completiamo i metadati PRIMA del lavoro sul calendario.
export async function saveSharedCredentials(centerId, input = {}, onProgress) {
  const centerRef = doc(db, 'centers', centerId);
  const credentialsRef = doc(db, 'centers', centerId, 'privateSettings', 'sharedCredentials');
  let requestedResident = input.commonPassword || '';
  let requestedAdministrator = input.administratorSharedPassword || '';
  for (;;) {
    const operationId = createOperationId();
    const prepared = await runTransaction(db, async transaction => {
      const center = (await transaction.get(centerRef)).data() || {};
      const stored = (await transaction.get(credentialsRef)).data() || {};
      const commonPassword = stored.commonPassword || center.commonPassword || '';
      const settings = {
        commonPasswordSet: Boolean(commonPassword || center.commonPasswordSet),
        adminSharedPasswordSet: center.adminSharedPasswordSet === true,
        adminPasswordVersion: Number(center.adminPasswordVersion || 0),
        adminTechnicalEmail: center.adminTechnicalEmail || '',
        adminTechnicalUid: center.adminTechnicalUid || '',
        adminPasswordRotationRequired: center.adminPasswordRotationRequired === true
      };
      let pending = stored.pending || null;
      if (!pending && (requestedResident && requestedResident !== commonPassword || requestedAdministrator)) {
        pending = {
          operationId,
          residentPassword: requestedResident,
          administratorPassword: requestedAdministrator,
          previousAdministratorPassword: input.currentAdministratorSharedPassword || '',
          adminTechnicalEmail: settings.adminTechnicalEmail,
          adminPasswordVersion: settings.adminPasswordVersion + (requestedAdministrator ? 1 : 0)
        };
      }
      if (pending || Object.hasOwn(center, 'commonPassword')) {
        transaction.set(credentialsRef, { centerId, commonPassword, pending, updatedAt: serverTimestamp() });
        // Migrazione atomica: la credenziale resta disponibile solo agli admin.
        transaction.update(centerRef, { commonPassword: deleteField(),
          commonPasswordSet: settings.commonPasswordSet, updatedAt: serverTimestamp() });
      }
      return { commonPassword, pending, settings };
    });
    const { pending } = prepared;
    if (!pending) return prepared.settings;
    let residentConfirmed = false;
    let administrator = null;
    try {
      if (pending.residentPassword) {
        await setResidentTechnicalPassword(centerId, prepared.commonPassword, pending.residentPassword);
        residentConfirmed = true;
        reportProgress(onProgress, { status: 'AUTH_UPDATED', credential: 'resident' });
      }
      administrator = pending.administratorPassword
        ? await setAdministratorTechnicalPassword(centerId, pending.previousAdministratorPassword,
          pending.administratorPassword, { currentEmail: pending.adminTechnicalEmail,
            nextVersion: pending.adminPasswordVersion }) : null;
    } catch (error) {
      // Una password errata è correggibile dal modulo: non riproporre per sempre
      // lo stesso intento. I guasti di rete mantengono invece il punto di ripresa.
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/weak-password', 'auth/email-already-in-use'].includes(error?.code)) {
        await runTransaction(db, async transaction => {
          const stored = (await transaction.get(credentialsRef)).data() || {};
          if (stored.pending?.operationId !== pending.operationId) return;
          const commonPassword = residentConfirmed ? pending.residentPassword : stored.commonPassword || '';
          transaction.set(credentialsRef, { centerId, commonPassword, pending: null, updatedAt: serverTimestamp() });
          transaction.update(centerRef, { commonPassword: deleteField(), commonPasswordSet: Boolean(commonPassword), updatedAt: serverTimestamp() });
        });
      }
      throw error;
    }
    if (administrator) reportProgress(onProgress, { status: 'AUTH_UPDATED', credential: 'administrator' });
    await runTransaction(db, async transaction => {
      const stored = (await transaction.get(credentialsRef)).data() || {};
      if (!stored.pending) return; // Un altro tentativo ha completato lo stesso intento.
      if (stored.pending.operationId !== pending.operationId) {
        throw new Error('Le credenziali sono state aggiornate da un altro amministratore. Riprova.');
      }
      const commonPassword = pending.residentPassword || stored.commonPassword || '';
      transaction.set(credentialsRef, { centerId, commonPassword, pending: null, updatedAt: serverTimestamp() });
      transaction.update(centerRef, {
        commonPassword: deleteField(), commonPasswordSet: Boolean(commonPassword),
        ...(administrator ? { adminTechnicalEmail: administrator.email, adminTechnicalUid: administrator.uid,
          adminPasswordVersion: pending.adminPasswordVersion, adminSharedPasswordSet: true,
          adminPasswordRotationRequired: false } : {}),
        updatedAt: serverTimestamp()
      });
    });
    if (requestedResident === pending.residentPassword) requestedResident = '';
    if (requestedAdministrator === pending.administratorPassword) requestedAdministrator = '';
    // Rilegge lo stato confermato. Un intento precedente viene completato prima
    // di una nuova richiesta; i segreti temporanei spariscono al commit.
  }
}

async function saveCenterWithoutCalendarRewrite(centerRef, jobRef, expectedJob, centerId, userUid, target, administratorSave) {
  await runTransaction(db, async (transaction) => {
    const [currentCenter, currentJob] = await Promise.all([
      transaction.get(centerRef), transaction.get(jobRef)
    ]);
    assertJobUnchanged(expectedJob, currentJob);
    if (!currentCenter.exists() || !sameCenterSchedule(currentCenter.data(), target)
        || currentJob.exists() && currentJob.data().status === 'ACTIVE') {
      throw configurationConflictError();
    }
    await administratorSave?.write(transaction);
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
      monthControlsSide: target.monthControlsSide,
      summaryResidentLabel: target.summaryResidentLabel,
      language: target.language || 'it',
      ...(!target.preserveAdministratorProfile ? {
        administratorName: target.administratorName,
        administratorSignature: target.administratorSignature
      } : {}),
      ...(administratorSave ? { administratorParticipantId: administratorSave.participantId } : {}),
      ...(administratorSave ? { administratorProfileComplete: true } : {}),
      updatedAt: serverTimestamp()
    };
    if (!target.preserveAdministratorProfile && target.adminEmail !== undefined) {
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
  targetThrough,
  administratorSave
}) {
  await runTransaction(db, async (transaction) => {
    const currentJob = await transaction.get(jobRef);
    if (!currentJob.exists() || currentJob.data().operationId !== operationId) {
      throw configurationConflictError();
    }
    await administratorSave?.write(transaction);
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
      monthControlsSide: target.monthControlsSide,
      summaryResidentLabel: target.summaryResidentLabel,
      language: target.language || 'it',
      ...(!target.preserveAdministratorProfile ? {
        administratorName: target.administratorName,
        administratorSignature: target.administratorSignature
      } : {}),
      ...(administratorSave ? { administratorParticipantId: administratorSave.participantId } : {}),
      ...(administratorSave ? { administratorProfileComplete: true } : {}),
      updatedAt: serverTimestamp()
    };
    if (!target.preserveAdministratorProfile && target.adminEmail !== undefined) {
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
    ...(typeof target.appDisplaySubtitle === 'string'
      ? { appDisplaySubtitle: target.appDisplaySubtitle }
      : {}),
    ...(typeof target.startupPresentationEnabled === 'boolean'
      ? { startupPresentationEnabled: target.startupPresentationEnabled }
      : {}),
    participantContactSharingEnabled: target.participantContactSharingEnabled,
    themePalette: target.themePalette,
    interfaceStyle: target.interfaceStyle,
    defaultView: target.defaultView,
    summaryLayout: target.summaryLayout,
    kitchenLayout: target.kitchenLayout,
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

function sameCenterSchedule(left, right) {
  return left?.timezone === right?.timezone
    && sameCutoffs(normalizeReservationCutoffs(left?.reservationCutoffs),
      normalizeReservationCutoffs(right?.reservationCutoffs));
}

function assertJobUnchanged(expectedSnapshot, currentSnapshot) {
  const expected = expectedSnapshot?.exists() ? expectedSnapshot.data() : null;
  const current = currentSnapshot.exists() ? currentSnapshot.data() : null;
  const fields = ['operationId', 'status', 'startDate', 'through', 'targetThrough', 'targetTimezone'];
  if (Boolean(expected) !== Boolean(current)
      || expected && fields.some(field => expected[field] !== current[field])
      || expected && !sameCutoffs(normalizeReservationCutoffs(expected.targetCutoffs),
        normalizeReservationCutoffs(current.targetCutoffs))) {
    throw configurationConflictError();
  }
}

function configurationConflictError() {
  return new Error('La configurazione è stata aggiornata da un altro amministratore. Ricarica il pannello.');
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
  return ALLOWED_INTERFACE_STYLE_VALUES.has(migratedValue) ? migratedValue : 'cool';
}
