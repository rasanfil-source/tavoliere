import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKitchenMatrixScreens,
  buildSummaryMatrixScreens
} from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const diners = [
  { participantId: 'a', displayName: 'Anna', dietTags: ['3'] },
  { participantId: 'b', displayName: 'Bruno', dietTags: ['3'] },
  { participantId: 'c', displayName: 'Carla', dietTags: ['4'] },
  { participantId: 'd', displayName: 'Dario', dietTags: ['5'] },
  { participantId: 'e', displayName: 'Elena', dietTags: ['5'] }
];

const meals = ['breakfast', 'lunch', 'dinner'].map((mealTypeId) => ({
  mealTypeId,
  label: mealTypeId,
  present: diners
}));

const days = ['2026-08-16', '2026-08-17', '2026-08-18'].map((dateId) => ({
  dateId,
  meals
}));

const operations = [{
  dateId: '2026-08-16',
  dailyHealth: {
    sickPeople: [diners[3], diners[4]],
    dietAssignments: [],
    invitedMeals: { breakfast: 0, lunch: 2, dinner: 0 }
  }
}];

test('il modello raggruppa le diete uguali per tavola e ammalati', () => {
  const [screen] = buildSummaryMatrixScreens(days, diners, operations);
  const lunch = screen.columns.find((column) => column.mealTypeId === 'lunch');

  assert.deepEqual(lunch.specialDiets.items, [
    { tag: '3', count: 2 },
    { tag: '4', count: 1 }
  ]);
  assert.deepEqual(lunch.sickDiets, [{ tag: '5', count: 2 }]);
  assert.deepEqual(lunch.names.map((person) => person.dietTags), [['3'], ['3'], ['4']]);
  assert.equal(lunch.guestCount, 2);
  assert.equal(lunch.total, 5);
});

test('la cucina usa gli stessi conteggi sanitizzati dai nomi', () => {
  const [screen] = buildKitchenMatrixScreens(days, operations);
  const lunch = screen.columns.find((column) => column.mealTypeId === 'lunch');

  assert.deepEqual(lunch.specialDiets.items, [
    { tag: '3', count: 2 },
    { tag: '4', count: 1 }
  ]);
  assert.deepEqual(lunch.sickDiets, [{ tag: '5', count: 2 }]);
  assert.deepEqual(lunch.names, []);
  assert.equal(lunch.guestCount, 2);
  assert.equal(lunch.total, 5);
});

test('gli ospiti stabili restano commensali nominativi e non diventano invitati occasionali', () => {
  const stableGuest = { participantId: 'g', displayName: 'Ospite stabile', groupId: 'group_ospiti' };
  const guestDays = [{
    dateId: '2026-08-16',
    meals: ['breakfast', 'lunch', 'dinner'].map((mealTypeId) => ({
      mealTypeId,
      label: mealTypeId,
      present: [stableGuest]
    }))
  }];
  const [screen] = buildSummaryMatrixScreens(guestDays, [stableGuest], []);
  const lunch = screen.columns.find((column) => column.mealTypeId === 'lunch');

  assert.equal(lunch.total, 1);
  assert.equal(lunch.guestCount, 0);
  assert.deepEqual(lunch.names.map((person) => person.displayName), ['Ospite stabile']);
});
