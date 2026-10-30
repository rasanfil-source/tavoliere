import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserModule, loadAppDietFunctions } from '../helpers/browser-module.mjs';
import * as reservation from '../../prototypes/firebase-spark-pwa/public/reservation-state.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';
import { buildKitchenMatrixScreens, buildSummaryMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const dateId = '2030-01-02';
const tomorrowId = '2030-01-03';
const sickPerson = {
  participantId: 'sick', displayName: 'Persona ammalata', groupId: 'group_residenti',
  phone: '123456', status: 'ACTIVE', dietTags: ['7']
};
const diner = { participantId: 'diner', displayName: 'Commensale', status: 'ACTIVE', dietTags: ['STANDARD'] };
const participants = [sickPerson, diner];
const rules = participants.map((participant) => ({
  participantId: participant.participantId, status: 'ACTIVE', startsOn: '2029-01-01',
  mealTypeIds: ['lunch', 'dinner'], dietTags: participant.dietTags
}));
const mealTypes = ['lunch', 'dinner'].map((mealTypeId, sortOrder) => ({ mealTypeId, label: mealTypeId, sortOrder, status: 'ACTIVE' }));
const { buildParticipantMealSummary } = await loadBrowserModule('participant-data.js', reservation, ['buildParticipantMealSummary']);
const { normalizeSickPeople } = await loadBrowserModule('daily-operations.js', {}, ['normalizeSickPeople']);
const { applyDailyDietsToSummary, applyDailyDietsToKitchenMeals } = await loadAppDietFunctions({ ...diets, t: (value) => value });

async function prepareDays({ assignmentsByDate = {}, sickOverrides = [] } = {}) {
  const overrides = [dateId, tomorrowId].flatMap((mealDate) => mealTypes.map(({ mealTypeId }) => ({
    participantId: diner.participantId, mealDate, mealTypeId, effect: 'PRESENT', dietTags: ['STANDARD']
  }))).concat(sickOverrides);
  const reads = [];
  const kitchen = await loadBrowserModule('kitchen-data.js', {
    ...reservation, ...dates, ...diets,
    db: {}, getActiveCenterId: () => 'test', t: (value) => value,
    collection: (_, ...parts) => ({ collection: parts.at(-1) }),
    where: (field, operator, value) => ({ field, operator, value }),
    query: (reference, ...filters) => ({ ...reference, filters }),
    getDocs: async (reference) => {
      reads.push(reference.collection);
      let rows = {
        mealTypes, mealWindows: [], reservationRules: rules, reservationOverrides: overrides
      }[reference.collection];
      assert.ok(rows, `Lettura inattesa: ${reference.collection}`);
      for (const filter of reference.filters || []) rows = rows.filter((row) => row[filter.field] === filter.value);
      return { docs: rows.map((row, index) => ({ id: row.mealTypeId || String(index), data: () => row })) };
    }
  }, ['loadKitchenCounts']);
  const kitchenDays = [], summaryDays = [], operations = [];
  for (const currentDateId of [dateId, tomorrowId]) {
    const assignments = assignmentsByDate[currentDateId] || [];
    operations.push({ dateId: currentDateId, dailyHealth: {
      sickPeople: normalizeSickPeople([sickPerson]), dietAssignments: assignments
    } });
    const rawMeals = await kitchen.loadKitchenCounts(new Date(`${currentDateId}T12:00:00`), { sessionReady: true });
    kitchenDays.push({ dateId: currentDateId, meals: applyDailyDietsToKitchenMeals(rawMeals, assignments).map((meal) => ({
      ...meal, mealTypeId: meal.key, present: meal.dietParticipants
    })) });
    const dayOverrides = overrides.filter((override) => override.mealDate === currentDateId);
    summaryDays.push({ dateId: currentDateId, meals: applyDailyDietsToSummary(
      mealTypes.map((meal) => buildParticipantMealSummary(meal, currentDateId, participants, rules, dayOverrides)),
      assignments
    ) });
  }
  return {
    kitchenDays, summaryDays, operations, reads,
    kitchen: buildKitchenMatrixScreens(kitchenDays, operations),
    summary: buildSummaryMatrixScreens(summaryDays, [], operations)
  };
}

test('la pipeline cucina conserva la dieta degli ammalati senza prenotazioni e i conteggi a tavola', async () => {
  const result = await prepareDays();
  for (const screen of result.kitchen) {
    for (const column of screen.columns) {
      assert.equal(column.sickCount, 1);
      assert.deepEqual(column.sickDiets, [{ tag: '7', count: 1 }]);
      assert.equal(column.total, 1, 'La persona ammalata non prenotata non sottrae il commensale presente');
      assert.deepEqual(column.names, []);
    }
  }
  assert.deepEqual(result.kitchen[0].columns[0].sickDiets, result.summary[0].columns[0].sickDiets);
  const meal = result.kitchenDays[0].meals[0];
  assert.equal(meal.count, 1);
  assert.deepEqual(meal.dietParticipants.map((person) => person.participantId), ['diner']);
  assert.deepEqual(meal.participantDiets, [
    { participantId: 'sick', dietTags: ['7'] },
    { participantId: 'diner', dietTags: ['STANDARD'] }
  ], 'La directory cucina contiene soltanto identificativi e diete');
  assert.ok(!result.reads.includes('participants'));
  assert.ok(!result.reads.includes('publicParticipants'));
});

test('la pipeline applica agli ammalati soltanto la dieta occasionale della giornata richiesta', async () => {
  const result = await prepareDays({ assignmentsByDate: {
    [tomorrowId]: [{ participantId: 'sick', dietTag: '9' }]
  } });
  for (const screens of [result.kitchen, result.summary]) {
    assert.deepEqual(screens[0].columns.map((column) => column.sickDiets), [
      [{ tag: '7', count: 1 }], [{ tag: '7', count: 1 }]
    ]);
    assert.deepEqual(screens[1].columns.map((column) => column.sickDiets), [
      [{ tag: '9', count: 1 }], [{ tag: '9', count: 1 }]
    ]);
  }
  assert.deepEqual(result.kitchenDays[1].meals[0].participantDiets[0].dietTags, ['7']);
  assert.deepEqual(sickPerson.dietTags, ['7'], 'La dieta abituale originale non viene modificata');
});

test('il recupero della dieta ammalati rispetta anche il pasto corrente e gli snapshot prenotati', async () => {
  const result = await prepareDays({ sickOverrides: [{
    participantId: 'sick', mealDate: dateId, mealTypeId: 'dinner', effect: 'PRESENT', dietTags: ['8']
  }] });
  for (const screens of [result.kitchen, result.summary]) {
    assert.deepEqual(screens[0].columns[0].sickDiets, [{ tag: '7', count: 1 }]);
    assert.deepEqual(screens[0].columns[1].sickDiets, [{ tag: '8', count: 1 }]);
    assert.equal(screens[0].columns[1].total, 1);
    assert.deepEqual(screens[1].columns[0].sickDiets, [{ tag: '7', count: 1 }]);
  }
});

test('la directory anagrafica del modello non eredita diete da pasti di altre date', () => {
  const days = [
    { dateId, meals: [{ mealTypeId: 'lunch', present: [] }] },
    { dateId: tomorrowId, meals: [{ mealTypeId: 'lunch', present: [{ ...sickPerson, dietTags: ['9'] }] }] }
  ];
  const operations = [{ dateId, dailyHealth: { sickPeople: normalizeSickPeople([sickPerson]) } }];
  const [screen] = buildSummaryMatrixScreens(days, [sickPerson], operations);
  assert.deepEqual(screen.columns[0].sickDiets, [{ tag: '7', count: 1 }]);
});
