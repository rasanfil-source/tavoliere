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
    dietAssignments: []
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
});
