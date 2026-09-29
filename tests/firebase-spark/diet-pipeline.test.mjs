import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserModule, loadAppDietFunctions } from '../helpers/browser-module.mjs';
import * as reservation from '../../prototypes/firebase-spark-pwa/public/reservation-state.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';
import { buildKitchenMatrixScreens, buildSummaryMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const { countEffectiveReservations } = await loadBrowserModule('kitchen-data.js', {
  ...reservation, ...diets
}, ['countEffectiveReservations']);
const { buildParticipantMealSummary } = await loadBrowserModule('participant-data.js', reservation, ['buildParticipantMealSummary']);
const { applyDailyDietsToSummary, applyDailyDietsToKitchenMeals } = await loadAppDietFunctions({
  ...diets, t: (value) => value
});
const dateId = '2030-01-02';
const participant = { participantId: 'synthetic_person', displayName: 'Persona sintetica', dietTags: ['1'] };

test('la dieta temporanea sostituisce quella abituale in tutta la catena cucina e riepilogo', () => {
  const assignments = [{ participantId: participant.participantId, dietTag: '2' }];
  const operations = [{ dateId, dailyHealth: { sickPeople: [], dietAssignments: assignments } }];
  const rawMeals = [{ key: 'lunch', label: 'Pranzo', count: 1, dietParticipants: [participant] }];
  const preparedMeals = applyDailyDietsToKitchenMeals(rawMeals, assignments).map((meal) => ({
    ...meal, mealTypeId: meal.key, present: meal.dietParticipants
  }));
  const kitchen = buildKitchenMatrixScreens([{ dateId, meals: preparedMeals }], operations)[0];
  const summaryMeals = applyDailyDietsToSummary([{ mealTypeId: 'lunch', present: [participant] }], assignments);
  const summary = buildSummaryMatrixScreens([{ dateId, meals: summaryMeals }], [], operations)[0];
  assert.deepEqual(kitchen.columns[0].specialDiets.items, [{ tag: '2', count: 1 }]);
  assert.deepEqual(summary.columns[0].specialDiets, kitchen.columns[0].specialDiets);
  assert.deepEqual(preparedMeals[0].dietParticipants[0].dietTags, ['2']);
  assert.deepEqual(rawMeals[0].dietParticipants[0].dietTags, ['1'], 'La dieta originale non deve essere mutata');
});

test('riepilogo e cucina conservano la dieta prenotata dopo una modifica anagrafica', () => {
  const current = { ...participant, dietTags: ['2'] };
  const rule = { participantId: participant.participantId, status: 'ACTIVE', mealTypeIds: ['lunch'],
    startsOn: '2020-01-01', endsOn: null, dietTags: ['2'] };
  for (const bookedDiet of ['1', 'STANDARD']) {
    const override = { participantId: participant.participantId, mealTypeId: 'lunch', effect: 'PRESENT', dietTags: [bookedDiet] };
    const summary = buildParticipantMealSummary({ mealTypeId: 'lunch' }, dateId, [current], [rule], [override]);
    const kitchen = countEffectiveReservations(new Map([[participant.participantId, [rule]]]), [override], 'lunch', dateId);
    assert.deepEqual(summary.present[0].dietTags, [bookedDiet]);
    assert.deepEqual(summary.present[0].dietTags, kitchen.participants[0].dietTags);
  }
});

test('le diete temporanee degli ammalati rispettano giorno pasto e rimozione', () => {
  const days = [dateId, '2030-01-03'].map((day) => ({ dateId: day, meals: ['lunch', 'dinner'].map((mealTypeId) => ({
    mealTypeId, present: [participant]
  })) }));
  const operations = [{ dateId, dailyHealth: { sickPeople: [participant], dietAssignments: [
    { participantId: participant.participantId, dietTag: '2', mealTypeIds: ['lunch'] },
    { participantId: participant.participantId, dietTag: '3', status: 'REMOVED' }
  ] } }];
  const screens = buildKitchenMatrixScreens(days, operations);
  assert.deepEqual(screens[0].columns[0].sickDiets, [{ tag: '2', count: 1 }]);
  assert.deepEqual(screens[0].columns[1].sickDiets, [{ tag: '1', count: 1 }]);
  assert.deepEqual(screens[1].columns[0].specialDiets.items, [{ tag: '1', count: 1 }]);
});

test('la dieta occasionale sostituisce quella abituale anche per un ammalato fuori sala', () => {
  const days = [{ dateId, meals: [{ mealTypeId: 'lunch', present: [] }] }];
  const operations = [{ dateId, dailyHealth: { sickPeople: [participant], dietAssignments: [
    { participantId: participant.participantId, dietTag: '2' }
  ] } }];
  const [screen] = buildSummaryMatrixScreens(days, [participant], operations);
  assert.deepEqual(screen.columns[0].sickDiets, [{ tag: '2', count: 1 }]);
});
