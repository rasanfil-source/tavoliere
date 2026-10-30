import {
  doc,
  getDocFromServer
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { db } from './firebase-client.js?v=20261014b';
import { getActiveCenterId } from './center-context.js?v=20261014b';

const MEAL_TYPE_IDS = ['breakfast', 'lunch', 'dinner'];

export async function loadKitchenMonthlySummary() {
  if (!db) return null;

  const reference = doc(
    db,
    'centers',
    getActiveCenterId(),
    'kitchenTotalsMetadata',
    'currentSummary'
  );
  const snapshot = await getDocFromServer(reference);
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const availableFrom = toDate(data.availableFrom);
  const now = Date.now();
  if (!availableFrom || now < availableFrom.getTime()) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.monthId || '')
    || !/^\d{4}-\d{2}-\d{2}$/.test(data.periodStart || '')
    || !/^\d{4}-\d{2}-\d{2}$/.test(data.periodEnd || '')) {
    return null;
  }

  const counts = {};
  for (const mealTypeId of MEAL_TYPE_IDS) {
    const count = data.counts?.[mealTypeId];
    if (!Number.isInteger(count) || count < 0) return null;
    counts[mealTypeId] = count;
  }

  return {
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    counts
  };
}

function toDate(value) {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return null;
}
