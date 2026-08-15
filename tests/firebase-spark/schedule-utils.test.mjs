import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDaysToDateId,
  addYearsToDateId,
  buildMealWindowRecords,
  daysBetweenDateIds,
  getMealCutoffDate,
  normalizeReservationCutoffs
} from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';

test('gli orari limite hanno default validi e rifiutano valori ambigui', () => {
  assert.deepEqual(normalizeReservationCutoffs(), {
    lunch: '09:30', dinner: '15:00', nextDayBreakfast: '15:00'
  });
  assert.throws(() => normalizeReservationCutoffs({ lunch: '9.30' }), /HH:MM/);
});

test('il calcolo delle date attraversa correttamente mese e anno', () => {
  assert.equal(addDaysToDateId('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysToDateId('2026-03-01', -1), '2026-02-28');
  assert.equal(addYearsToDateId('2026-08-08', 5), '2031-08-08');
  assert.equal(daysBetweenDateIds('2028-02-28', '2028-03-01'), 3);
});

test('le scadenze rispettano il fuso orario e l ora legale di Roma', () => {
  assert.equal(getMealCutoffDate('2026-08-07', 'lunch', {}, 'Europe/Rome').toISOString(), '2026-08-07T07:30:00.000Z');
  assert.equal(getMealCutoffDate('2026-01-07', 'lunch', {}, 'Europe/Rome').toISOString(), '2026-01-07T08:30:00.000Z');
  assert.equal(getMealCutoffDate('2026-08-07', 'breakfast', {}, 'Europe/Rome').toISOString(), '2026-08-06T13:00:00.000Z');
});

test('la generazione produce una finestra per ogni giorno e pasto', () => {
  const records = buildMealWindowRecords({
    startDateId: '2026-08-07',
    days: 2,
    mealTypes: [{ mealTypeId: 'breakfast' }, { mealTypeId: 'lunch' }, { mealTypeId: 'dinner' }],
    cutoffs: {},
    timeZone: 'Europe/Rome'
  });
  assert.equal(records.length, 6);
  assert.equal(records.at(-1).mealWindowId, '2026-08-08_dinner');
});
