import {
  doc,
  getDocFromServer
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20261014b';
import { getActiveCenterId } from './center-context.js?v=20261014b';
import { serverNow } from './date-utils.mjs?v=20261014b';

const MEAL_TYPE_IDS = ['breakfast', 'lunch', 'dinner'];
const FIRST_TRACKED_MONTH = '2026-11';
const RETENTION_MONTHS = 24;

export async function loadKitchenMonthlySummary(monthId = null) {
  if (!db) return null;

  if (monthId !== null) {
    if (!isValidMonthId(monthId) || monthId < FIRST_TRACKED_MONTH) return null;
    const reference = doc(
      db,
      'centers',
      getActiveCenterId(),
      'kitchenMonthlySummaries',
      monthId
    );
    const snapshot = await getDocFromServer(reference);
    if (!snapshot.exists()) return null;
    return validateSummary(snapshot.data(), { expectedMonthId: monthId });
  }

  const reference = doc(
    db,
    'centers',
    getActiveCenterId(),
    'kitchenTotalsMetadata',
    'currentSummary'
  );
  const snapshot = await getDocFromServer(reference);
  if (!snapshot.exists()) return null;

  const summary = validateSummary(snapshot.data());
  if (!summary) return null;
  return {
    ...summary,
    earliestMonthId: getEarliestMonthId(summary.monthId)
  };
}

function validateSummary(data, { expectedMonthId = null } = {}) {
  if (!isValidMonthId(data.monthId) || (expectedMonthId && data.monthId !== expectedMonthId)) {
    return null;
  }
  const periodStart = `${data.monthId}-01`;
  const periodEnd = monthEndDateId(data.monthId);
  if (data.periodStart !== periodStart || data.periodEnd !== periodEnd) return null;

  const availableFrom = toDate(data.availableFrom);
  const now = serverNow();
  if (!availableFrom || now < availableFrom.getTime()) return null;
  const purgeAfter = toDate(data.purgeAfter);
  if (!purgeAfter || now >= purgeAfter.getTime()) return null;

  const invitedTotal = data.invitedTotal;
  if (!Number.isInteger(invitedTotal) || invitedTotal < 0) return null;

  const counts = {};
  for (const mealTypeId of MEAL_TYPE_IDS) {
    const count = data.counts?.[mealTypeId];
    if (!Number.isInteger(count) || count < 0) return null;
    counts[mealTypeId] = count;
  }

  return {
    monthId: data.monthId,
    periodStart,
    periodEnd,
    counts,
    invitedTotal
  };
}

function getEarliestMonthId(latestMonthId) {
  const retainedMonthId = shiftMonthId(latestMonthId, -(RETENTION_MONTHS - 1));
  return retainedMonthId < FIRST_TRACKED_MONTH ? FIRST_TRACKED_MONTH : retainedMonthId;
}

function shiftMonthId(monthId, offset) {
  const [year, month] = monthId.split('-').map(Number);
  const absoluteMonth = year * 12 + month - 1 + offset;
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = absoluteMonth % 12 + 1;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`;
}

function monthEndDateId(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthId}-${String(lastDay).padStart(2, '0')}`;
}

function isValidMonthId(value) {
  return typeof value === 'string'
    && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return null;
}
