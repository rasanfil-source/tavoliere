import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatDateId, getDateInTimeZone } from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import { findApplicableRule, resolveEffectiveDietTags, resolveEffectiveEffect } from '../../prototypes/firebase-spark-pwa/public/reservation-state.mjs';
import { buildSummaryMatrixScreens, buildKitchenMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const read = name => readFileSync(new URL(`../../prototypes/firebase-spark-pwa/public/${name}`, import.meta.url), 'utf8');
const app = read('app.js');
const participant = read('participant-data.js');
const kitchen = read('kitchen-data.js');
function extract(source, name) {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`));
  assert.ok(match, name);
  return match[0];
}
function bind(source, names, deps) {
  return new Function(...Object.keys(deps), names.map(name => extract(source, name)).join('\n') + `\nreturn {${names.join(',')}};`)(...Object.values(deps));
}

// Esegue le espressioni effettive di selezione delle date nei due percorsi di aggiornamento.
const dateExpressions = ['summary', 'kitchen'].map(view => {
  const match = app.match(new RegExp(`const ${view}Dates = ([^;]+);`));
  assert.ok(match, view);
  return match[1];
});
const meals = ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, label: mealTypeId }));
const people = Array.from({ length: 5 }, (_, i) => ({ participantId: `p${i}`, displayName: `Person ${i}`, dietTags: i === 1 ? ['3'] : ['STANDARD'] }));

for (const now of [
  '2026-10-10T10:00:00Z', // Sabato → domenica
  '2026-10-11T10:00:00Z', // Domenica → lunedì
  '2026-10-12T10:00:00Z', // Lunedì → martedì
  '2026-01-31T23:30:00Z', // Nel centro è già domenica 1 febbraio.
  '2026-12-31T23:30:00Z', // Nel centro è già iniziato il nuovo anno.
  '2026-03-28T23:30:00Z', // Inizio dell'ora legale
  '2026-10-24T22:30:00Z'  // Fine dell'ora legale
]) {
  test(`personal week start does not change today/tomorrow dining counts: ${now}`, async () => {
    const results = [];
    for (const weekStartsOn of ['monday', 'sunday']) {
      const state = { centerContactSettings: { timezone: 'Europe/Rome', weekStartsOn }, summaryDayOffset: 0, kitchenDayOffset: 0 };
      const dateFns = bind(app, ['getCenterToday', 'addCalendarDays', 'getSummaryDate', 'getKitchenDate', 'startOfWeek'], {
        state, serverNow: () => Date.parse(now),
        getDateInTimeZone: zone => getDateInTimeZone(zone, new Date(now))
      });
      state.weekStartDate = dateFns.startOfWeek(dateFns.getCenterToday());
      assert.equal(state.weekStartDate.getDay(), weekStartsOn === 'sunday' ? 0 : 1);
      const datesByView = dateExpressions.map(expression => new Function('getCenterToday', 'addCalendarDays', `return ${expression};`)(dateFns.getCenterToday, dateFns.addCalendarDays));
      assert.deepEqual(datesByView[0], datesByView[1]);
      const dates = datesByView[0];
      const ids = dates.map(formatDateId);
      for (const offset of [0, 1]) {
        state.summaryDayOffset = state.kitchenDayOffset = offset;
        assert.equal(formatDateId(dateFns.getSummaryDate()), ids[offset]);
        assert.equal(formatDateId(dateFns.getKitchenDate()), ids[offset]);
      }
      const rules = people.map(person => ({ ...person, status: 'ACTIVE', mealTypeIds: meals.map(meal => meal.mealTypeId), startsOn: ids[0], endsOn: ids[2] }));
      const reads = [];
      const deps = {
        state, db: {}, formatDateId, findApplicableRule, resolveEffectiveDietTags, resolveEffectiveEffect,
        getMealTypes: async () => meals, getActiveMealTypes: async () => meals,
        listSummaryParticipants: async () => people, getRules: async () => rules,
        getMealWindows: async () => [], formatDietLabel: tag => tag, t: key => key,
        getOverrides: async dateId => {
          reads.push(dateId);
          const index = ids.indexOf(dateId);
          assert.ok(index >= 0, `unexpected date ${dateId}`);
          return meals.flatMap(meal => people.map((person, i) => ({
            participantId: person.participantId, mealTypeId: meal.mealTypeId,
            effect: i < index + 2 ? 'PRESENT' : 'ABSENT'
          })));
        }
      };
      const summaryLoader = bind(participant, ['loadParticipantDaySummaries', 'buildParticipantMealSummary', 'groupRulesByParticipant'], deps);
      const kitchenLoader = bind(kitchen, ['loadKitchenCounts', 'countEffectiveReservations', 'groupRulesByParticipant', 'formatDietCounts', 'addDietCounts'], deps);
      const summaryDays = [], kitchenDays = [];
      for (const [i, date] of dates.entries()) {
        const summaryMeals = await summaryLoader.loadParticipantDaySummaries(date);
        const kitchenMeals = await kitchenLoader.loadKitchenCounts(date, { sessionReady: true });
        for (const meal of summaryMeals) assert.equal(meal.present.length, i + 2);
        for (const meal of kitchenMeals) assert.equal(meal.count, i + 2);
        summaryDays.push({ dateId: ids[i], meals: summaryMeals });
        kitchenDays.push({ dateId: ids[i], meals: kitchenMeals.map(meal => ({ ...meal, mealTypeId: meal.key, present: meal.dietParticipants })) });
      }
      assert.deepEqual(reads, ids.flatMap(id => [id, id]));
      const operations = ids.map((dateId, i) => ({ dateId, dailyHealth: {
        sickPeople: [people[0]], dietAssignments: [],
        invitedMeals: { breakfast: i + 1, lunch: i + 1, dinner: i + 1 }
      } }));
      const summaryScreens = buildSummaryMatrixScreens(summaryDays, people, operations);
      const kitchenScreens = buildKitchenMatrixScreens(kitchenDays, operations);
      const counts = screens => screens.map(screen => screen.columns.map(column => ({
        dateId: column.dateId, meal: column.mealTypeId, total: column.total,
        invited: column.guestCount, sick: column.sickCount, diets: column.specialDiets
      })));
      assert.deepEqual(counts(summaryScreens), counts(kitchenScreens));
      for (const [screenIndex, screen] of summaryScreens.entries()) {
        assert.deepEqual(screen.columns.map(column => [column.dateId, column.mealTypeId]), [
          [ids[screenIndex], 'lunch'], [ids[screenIndex], 'dinner'], [ids[screenIndex + 1], 'breakfast']
        ]);
        for (const column of screen.columns) {
          const dayIndex = ids.indexOf(column.dateId);
          assert.equal(column.total, (dayIndex + 2) - 1 + (dayIndex + 1));
          assert.equal(column.sickCount, 1);
          assert.equal(column.guestCount, dayIndex + 1);
        }
      }
      results.push({ ids, counts: counts(summaryScreens) });
    }
    assert.deepEqual(results[0], results[1]);
  });
}
