import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20260815q';
import { getActiveCenterId } from './center-context.js?v=20260815q';
import {
  buildMealWindowRecords,
  DEFAULT_ACCESS_EXPIRES_AT,
  CALENDAR_COVERAGE_DAYS,
  DEFAULT_RESERVATION_CUTOFFS,
  addDaysToDateId,
  daysBetweenDateIds,
  normalizeReservationCutoffs
} from './schedule-utils.mjs?v=20260815q';
import { formatDateId, getDateInTimeZone } from './date-utils.mjs?v=20260815q';
import { CAPABILITIES, hasCapability } from './role-policy.mjs?v=20260815q';

export const BOOTSTRAP_ADMIN_UID = 'kWYvLr1fkKVuhZ8I8HrVivN2ra03';

const GROUPS = [
  { groupId: 'group_residenti', name: 'Residenti', sortOrder: 1 },
  { groupId: 'group_ospiti', name: 'Ospiti', sortOrder: 2 }
];

const MEAL_TYPES = [
  { mealTypeId: 'breakfast', label: 'Colazione', shortLabel: 'Col', sortOrder: 1 },
  { mealTypeId: 'lunch', label: 'Pranzo', shortLabel: 'Pra', sortOrder: 2 },
  { mealTypeId: 'dinner', label: 'Cena', shortLabel: 'Cen', sortOrder: 3 }
];

const WINDOW_BATCH_SIZE = 90;
const WINDOW_DAY_BATCH_SIZE = Math.floor(WINDOW_BATCH_SIZE / MEAL_TYPES.length);
const WINDOW_BATCH_CONCURRENCY = 2;
const DATE_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LEGACY_OPERATIONAL_TOKENS = new Set(['public_demo', 'kitchen_demo']);

export async function bootstrapCenterData(user, { centerId = getActiveCenterId(), onProgress } = {}) {
  if (!db) {
    throw new Error('Firebase non configurato');
  }

  if (!user || user.isAnonymous) {
    throw new Error('Accesso amministratore richiesto.');
  }

  const now = serverTimestamp();
  const expiresAt = DEFAULT_ACCESS_EXPIRES_AT;
  const centerRef = doc(db, 'centers', centerId);
  const adminRef = doc(db, 'centers', centerId, 'admins', user.uid);
  const adminSnapshot = await getDoc(adminRef);
  if (!adminSnapshot.exists() || adminSnapshot.data().status !== 'ACTIVE') {
    throw new Error('Questo account non amministra il centro selezionato.');
  }
  if (!hasCapability(adminSnapshot.data().role, CAPABILITIES.MANAGE_CALENDAR)) {
    throw new Error('Questo account non puo preparare il calendario del centro.');
  }
  const operationalLinksRef = doc(db, 'centers', centerId, 'privateSettings', 'operationalLinks');
  const [centerSnapshot, groupSnapshot, mealTypeSnapshot, privateParticipantSnapshot, ruleSnapshot, operationalLinksSnapshot] = await Promise.all([
    getDoc(centerRef),
    getDocs(collection(db, 'centers', centerId, 'groups')),
    getDocs(collection(db, 'centers', centerId, 'mealTypes')),
    getDocs(collection(db, 'centers', centerId, 'participants')),
    getDocs(collection(db, 'centers', centerId, 'reservationRules')),
    getDoc(operationalLinksRef)
  ]);
  const existingGroupIds = new Set(groupSnapshot.docs.map((item) => item.id));
  const existingMealTypeIds = new Set(mealTypeSnapshot.docs.map((item) => item.id));
  const existingRuleIds = new Set(ruleSnapshot.docs.map((item) => item.id));
  const participants = privateParticipantSnapshot.docs.map((item) => ({ participantId: item.id, ...item.data() }));
  const reservationCutoffs = normalizeReservationCutoffs(centerSnapshot.data()?.reservationCutoffs);
  const storedCenterName = String(centerSnapshot.data()?.name || '').trim();
  const centerName = storedCenterName === 'Tavola Comune Demo' || !storedCenterName
    ? 'Prenotazione pasti'
    : storedCenterName;
  const storedOperationalLinks = operationalLinksSnapshot.exists()
    ? operationalLinksSnapshot.data()
    : {};
  const publicTokenId = getOperationalTokenId(storedOperationalLinks.publicTokenId, 'public');
  const kitchenTokenId = getOperationalTokenId(storedOperationalLinks.kitchenTokenId, 'kitchen');

  await setDoc(centerRef, centerSnapshot.exists() ? {
    name: centerName,
    participantDataUpdatedAt: now,
    updatedAt: now
  } : {
    name: centerName,
    timezone: 'Europe/Rome',
    locale: 'it-IT',
    reservationCutoffs: DEFAULT_RESERVATION_CUTOFFS,
    participantContactSharingEnabled: true,
    participantDataUpdatedAt: now,
    status: 'ACTIVE',
    updatedAt: now
  }, { merge: true });

  const batch = writeBatch(db);

  GROUPS.forEach((group) => {
    if (existingGroupIds.has(group.groupId)) return;
    batch.set(doc(db, 'centers', centerId, 'groups', group.groupId), {
      centerId,
      name: group.name,
      sortOrder: group.sortOrder,
      status: 'ACTIVE',
      updatedAt: now
    }, { merge: true });
  });

  MEAL_TYPES.forEach((meal) => {
    if (existingMealTypeIds.has(meal.mealTypeId)) return;
    batch.set(doc(db, 'centers', centerId, 'mealTypes', meal.mealTypeId), {
      centerId,
      label: meal.label,
      shortLabel: meal.shortLabel,
      sortOrder: meal.sortOrder,
      status: 'ACTIVE',
      updatedAt: now
    }, { merge: true });
  });

  participants.forEach((participant) => {
    if (existingRuleIds.has('rule_' + participant.participantId)) return;
    batch.set(doc(db, 'centers', centerId, 'reservationRules', 'rule_' + participant.participantId), {
      centerId,
      participantId: participant.participantId,
      groupId: participant.groupId,
      dietTags: participant.dietTags,
      mealTypeIds: MEAL_TYPES.map((meal) => meal.mealTypeId),
      startsOn: formatDateId(getDateInTimeZone(centerSnapshot.data()?.timezone || 'Europe/Rome')),
      endsOn: null,
      status: 'ACTIVE',
      updatedAt: now
    }, { merge: true });
  });

  if (
    !operationalLinksSnapshot.exists()
    || storedOperationalLinks.publicTokenId !== publicTokenId
    || storedOperationalLinks.kitchenTokenId !== kitchenTokenId
  ) {
    [storedOperationalLinks.publicTokenId, storedOperationalLinks.kitchenTokenId]
      .map((value) => String(value || '').trim())
      .filter((value) => LEGACY_OPERATIONAL_TOKENS.has(value))
      .forEach((legacyTokenId) => {
        batch.set(doc(db, 'centers', centerId, 'linkTokens', legacyTokenId), {
          status: 'REVOKED',
          revokedAt: now,
          updatedAt: now
        }, { merge: true });
      });
    batch.set(operationalLinksRef, {
      centerId,
      publicTokenId,
      kitchenTokenId,
      publicCreatedAt: storedOperationalLinks.publicCreatedAt || now,
      kitchenCreatedAt: storedOperationalLinks.kitchenCreatedAt || now,
      updatedAt: now
    });
    batch.set(doc(db, 'centers', centerId, 'linkTokens', publicTokenId), {
      status: 'ACTIVE',
      scope: 'PUBLIC',
      targetType: 'CENTER',
      expiresAt,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(doc(db, 'centers', centerId, 'linkTokens', kitchenTokenId), {
      status: 'ACTIVE',
      scope: 'KITCHEN',
      targetType: 'CENTER',
      expiresAt,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  }

  await batch.commit();

  const startDateId = formatDateId(getDateInTimeZone(centerSnapshot.data()?.timezone || 'Europe/Rome'));
  const endDateId = addDaysToDateId(startDateId, CALENDAR_COVERAGE_DAYS - 1);
  const storedThrough = await loadOrInitializeCoverageThrough(centerRef, centerSnapshot, startDateId, centerId);
  const resumeFromId = [startDateId, addDaysToDateId(storedThrough, 1)].sort().at(-1);
  const totalDays = resumeFromId > endDateId ? 0 : daysBetweenDateIds(resumeFromId, endDateId);
  const timeZone = centerSnapshot.data()?.timezone || 'Europe/Rome';
  let completedDays = 0;
  let writtenMealWindows = 0;

  reportProgress(onProgress, completedDays, totalDays);
  if (totalDays > 0) {
    await yieldToMainThread();
  }

  const daysPerGroup = WINDOW_DAY_BATCH_SIZE * WINDOW_BATCH_CONCURRENCY;
  for (let groupOffset = 0; groupOffset < totalDays; groupOffset += daysPerGroup) {
    const plans = [];
    for (let batchOffset = groupOffset; batchOffset < Math.min(totalDays, groupOffset + daysPerGroup); batchOffset += WINDOW_DAY_BATCH_SIZE) {
      const batchStartDateId = addDaysToDateId(resumeFromId, batchOffset);
      const batchDays = Math.min(WINDOW_DAY_BATCH_SIZE, totalDays - batchOffset);
      plans.push({
        through: addDaysToDateId(batchStartDateId, batchDays - 1),
        records: buildMealWindowRecords({
          startDateId: batchStartDateId,
          days: batchDays,
          mealTypes: MEAL_TYPES,
          cutoffs: reservationCutoffs,
          timeZone
        })
      });
    }

    await Promise.all(plans.map((plan) => writeMealWindowBatch(plan.records, now, centerId)));
    completedDays += plans.reduce((sum, plan) => sum + (plan.records.length / MEAL_TYPES.length), 0);
    writtenMealWindows += plans.reduce((sum, plan) => sum + plan.records.length, 0);
    await setDoc(centerRef, {
      calendarCoveredThrough: plans.at(-1).through,
      updatedAt: serverTimestamp()
    }, { merge: true });
    reportProgress(onProgress, completedDays, totalDays);
    await yieldToMainThread();
  }

  return {
    centerId,
    groups: GROUPS.length,
    participants: participants.length,
    mealWindows: writtenMealWindows
  };
}

function getOperationalTokenId(value, prefix) {
  const normalized = String(value || '').trim();
  if (
    /^[A-Za-z0-9_]{8,160}$/.test(normalized)
    && !LEGACY_OPERATIONAL_TOKENS.has(normalized)
  ) {
    return normalized;
  }
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function loadOrInitializeCoverageThrough(centerRef, centerSnapshot, startDateId, centerId) {
  const storedThrough = centerSnapshot.data()?.calendarCoveredThrough;
  if (DATE_ID_PATTERN.test(storedThrough || '')) {
    return storedThrough;
  }

  const latestWindowSnapshot = await getDocs(query(
    collection(db, 'centers', centerId, 'mealWindows'),
    orderBy('mealDate', 'desc'),
    limit(1)
  ));
  const latestMealDate = latestWindowSnapshot.empty
    ? addDaysToDateId(startDateId, -1)
    : latestWindowSnapshot.docs[0].data().mealDate;
  const coverageThrough = DATE_ID_PATTERN.test(latestMealDate || '')
    ? latestMealDate
    : addDaysToDateId(startDateId, -1);

  await setDoc(centerRef, {
    calendarCoveredThrough: coverageThrough,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return coverageThrough;
}

async function writeMealWindowBatch(records, now, centerId) {
  const windowBatch = writeBatch(db);
  records.forEach((window) => {
    windowBatch.set(doc(db, 'centers', centerId, 'mealWindows', window.mealWindowId), {
      centerId,
      mealDate: window.mealDate,
      mealTypeId: window.mealTypeId,
      status: 'OPEN',
      closesAt: window.closesAt,
      updatedAt: now
    });
  });
  await windowBatch.commit();
}

function reportProgress(onProgress, completedDays, totalDays) {
  if (typeof onProgress === 'function') {
    onProgress({ completedDays, totalDays });
  }
}

function yieldToMainThread() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
