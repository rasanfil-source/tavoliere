import assert from 'node:assert/strict';
import test from 'node:test';
import { countKitchenMeals } from '../../tools/lib/kitchen-accounting.mjs';

const dateId = '2026-11-01';
const booking = (participantId, mealTypeId = 'lunch', effect = 'PRESENT') => ({
  participantId, mealDate: dateId, mealTypeId, effect
});

test('closed-day accounting preserves a booking after its participant is suspended', () => {
  const input = {
    dateId, overrides: [booking('person')],
    rules: [{ participantId: 'person', status: 'ACTIVE', startsOn: dateId, mealTypeIds: ['lunch'] }]
  };
  assert.equal(countKitchenMeals(input).counts.lunch, 1);
  input.rules[0].status = 'DISABLED';
  assert.equal(countKitchenMeals(input).counts.lunch, 1);
  input.rules = [];
  assert.equal(countKitchenMeals(input).counts.lunch, 1);
});

test('accounting uses only explicit present bookings for the requested date and meal', () => {
  const result = countKitchenMeals({ dateId, overrides: [
    booking('a'), booking('b', 'lunch', 'ABSENT'), booking('c', 'dinner'),
    { ...booking('tomorrow'), mealDate: '2026-11-02' },
    booking(''), booking('invalid', 'lunch', 'UNKNOWN')
  ] });
  assert.deepEqual(result.counts, { breakfast: 0, lunch: 1, dinner: 1 });
  assert.deepEqual(countKitchenMeals({ dateId }).counts, { breakfast: 0, lunch: 0, dinner: 0 });
});

test('accounting excludes sick bookings and counts invited meals exactly once', () => {
  const result = countKitchenMeals({ dateId,
    overrides: [booking('a'), booking('sick'), booking('sick', 'breakfast')],
    dailyHealth: { sickPeople: [{ participantId: 'sick' }, { participantId: 'unbooked' }],
      invitedMeals: { breakfast: 2, lunch: 3, dinner: 4 } }
  });
  assert.deepEqual(result.counts, { breakfast: 2, lunch: 4, dinner: 4 });
  assert.deepEqual(result.invitedCounts, { breakfast: 2, lunch: 3, dinner: 4 });
});
