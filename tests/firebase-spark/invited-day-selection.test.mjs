import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { functions } from '../helpers/app-functions.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';
import { buildSummaryMatrixScreens, buildKitchenMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

for (const trigger of ['refreshWeekInvitedOnNewDay', 'handleWeekInvitedSave']) {
  test(`gli invitati di Domani rimangono e diventano Oggi al cambio data (${trigger})`, async () => {
    let today = new Date(2026, 11, 31, 12);
    const stored = new Map();
    let writes = 0;
    const elements = { weekOperations: { open: true }, weekOperationsDay: {}, weekOperationsDate: {},
      weekDietDuration: { options: [{}, {}] },
      weekInvitedDay: { value: '1', options: [{}, {}] }, weekInvitedSave: {}, weekInvitedStatus: {},
      weekInvitedInputs: ['lunch', 'dinner', 'breakfast'].map(meal => ({ dataset: { weekInvitedMeal: meal } })) };
    const labels = elements.weekInvitedInputs.map(input => ({ dataset: { weekInvitedLabel: input.dataset.weekInvitedMeal } }));
    const app = functions(['getWeekInvitedDates', 'refreshWeekInvited', 'handleWeekInvitedSave', 'refreshWeekInvitedOnNewDay',
      'prepareWeekOperationalDate', 'syncWeekOperationDateLabels', 'addCalendarDays', 'parseDateId'], {
      elements, state: { mode: 'week', weekOperationalDateId: '2026-12-31' }, weekInvitedRequest: 0, weekInvitedLoaded: null, weekInvitedTodayId: null, ...dates,
      escapeHtml: value => value, formatCalendarWeekLabel: dates.formatDateId, formatDateTime: dates.formatDateId,
      refreshWeekOperations: () => app.refreshWeekInvited(true),
      getCenterToday: () => new Date(today), getActiveCenterId: () => 'center',
      document: { hidden: false, querySelectorAll: () => labels }, t: key => key,
      canManageDailyOperations: () => true, blockOfflineAction: () => false,
      friendlyErrorMessage: error => error.message, renderWeekInvitedStatus: () => {},
      loadDailyHealth: async date => ({ invitedMeals: stored.get(dates.formatDateId(date)) || {} }),
      saveInvitedMeals: async (date, meals) => {
        writes++;
        stored.set(dates.formatDateId(date), { lunch: meals.lunch, dinner: meals.dinner });
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        stored.set(dates.formatDateId(next), { breakfast: meals.breakfast });
      }
    });
    await app.refreshWeekInvited();
    elements.weekInvitedInputs.forEach((input, i) => { input.value = String(i + 3); });
    await app.handleWeekInvitedSave();
    assert.equal(writes, 1);
    today = new Date(2027, 0, 1, 12);
    await app[trigger]();
    assert.equal(elements.weekInvitedDay.value, '0');
    assert.deepEqual(elements.weekInvitedInputs.map(input => input.value), ['3', '4', '5']);
    assert.match(labels[0].textContent, /invited.today$/);
    assert.match(labels[2].textContent, /invited.tomorrow$/);
    assert.equal(writes, 1, 'il cambio giorno non riscrive o sposta prenotazioni');
    elements.weekInvitedDay.value = '1';
    await app.refreshWeekInvited();
    assert.deepEqual(elements.weekInvitedInputs.map(input => input.value), ['0', '0', '0']);
    elements.weekInvitedDay.value = '0';
    await app.refreshWeekInvited();
    assert.deepEqual(elements.weekInvitedInputs.map(input => input.value), ['3', '4', '5']);
  });
}

test('Oggi e Domani salvano le date effettive e alimentano riepilogo e cucina anche a fine anno', async () => {
  const ids = ['2026-12-31', '2027-01-01', '2027-01-02'];
  const stored = new Map(ids.map(dateId => [dateId, { dateId,
    invitedMeals: { breakfast: 9, lunch: 8, dinner: 7 },
    sickPeople: [], dietAssignments: [{ participantId: 'p', dietTag: '1' }] }]));
  let commits = 0;
  const daily = await loadBrowserModule('daily-operations.js', {
    ...dates, ...diets, db: {}, getActiveCenterId: () => 'center',
    doc: (...args) => args.at(-1), serverTimestamp: () => new Date(),
    getDoc: async id => ({ exists: () => stored.has(id), data: () => stored.get(id) }),
    runTransaction: async (_, callback) => {
      const writes = [];
      const value = await callback({
        get: async id => {
          assert.equal(writes.length, 0, 'all reads precede transaction writes');
          return { exists: () => stored.has(id), data: () => structuredClone(stored.get(id)) };
        },
        set: (id, data) => writes.push([id, data])
      });
      for (const [id, data] of writes) stored.set(id, { ...stored.get(id), ...data });
      commits++;
      return value;
    }
  }, ['saveInvitedMeals', 'loadDailyHealth']);
  await daily.saveInvitedMeals(new Date(2026, 11, 31, 12), { lunch: 2, dinner: 3, breakfast: 4 }, { nextDayBreakfast: true });
  await daily.saveInvitedMeals(new Date(2027, 0, 1, 12), { lunch: 5, dinner: 6, breakfast: 7 }, { nextDayBreakfast: true });
  assert.equal(commits, 2);
  assert.deepEqual(stored.get(ids[0]).invitedMeals, { breakfast: 9, lunch: 2, dinner: 3 });
  assert.deepEqual(stored.get(ids[1]).invitedMeals, { breakfast: 4, lunch: 5, dinner: 6 });
  assert.deepEqual(stored.get(ids[2]).invitedMeals, { breakfast: 7, lunch: 8, dinner: 7 });
  const operations = await Promise.all(ids.map(async dateId => ({ dateId,
    dailyHealth: await daily.loadDailyHealth(new Date(dateId + 'T12:00:00')) })));
  assert.equal(operations[1].dailyHealth.invitedMeals.breakfast, 4, 'cache updated for next day');
  assert.deepEqual(operations[1].dailyHealth.dietAssignments, [{ participantId: 'p', dietTag: '1' }]);
  const days = ids.map(dateId => ({ dateId, meals: ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, present: [] })) }));
  for (const screens of [buildSummaryMatrixScreens(days, [], operations), buildKitchenMatrixScreens(days, operations)]) {
    assert.deepEqual(screens.map(screen => screen.columns.map(column => column.total)), [[2, 3, 4], [5, 6, 7]]);
  }
  await daily.saveInvitedMeals(new Date(2026, 11, 31, 12), { lunch: 0, dinner: 0, breakfast: 0 }, { nextDayBreakfast: true });
  assert.deepEqual(stored.get(ids[1]).invitedMeals, { breakfast: 0, lunch: 5, dinner: 6 });
  await daily.saveInvitedMeals(new Date(2027, 0, 2, 12), { lunch: 2, dinner: 3, breakfast: 99 }, {
    nextDayBreakfast: true, through: '2027-01-02'
  });
  assert.deepEqual(stored.get(ids[2]).invitedMeals, { breakfast: 7, lunch: 2, dinner: 3 });
  assert.equal(stored.has('2027-01-03'), false, 'nessuna scrittura oltre il calendario disponibile');
});

test('il selettore carica la colazione successiva e ignora risposte tardive del giorno precedente', async () => {
  const elements = { weekInvitedDay: { value: '0' }, weekInvitedSave: {}, weekInvitedStatus: {},
    weekInvitedInputs: ['lunch', 'dinner', 'breakfast'].map(meal => ({ dataset: { weekInvitedMeal: meal } })) };
  const labels = elements.weekInvitedInputs.map(input => ({ dataset: { weekInvitedLabel: input.dataset.weekInvitedMeal } }));
  const pending = [];
  const saves = [];
  const app = functions(['getWeekInvitedDates', 'refreshWeekInvited', 'handleWeekInvitedSave'], {
    elements, state: { mode: 'week' }, weekInvitedRequest: 0, weekInvitedLoaded: null, weekInvitedTodayId: null, ...dates,
    refreshWeekInvitedOnNewDay: () => {},
    getCenterToday: () => new Date(2026, 11, 31, 12), getActiveCenterId: () => 'center',
    document: { querySelectorAll: () => labels }, t: key => key,
    canManageDailyOperations: () => true, blockOfflineAction: () => false,
    friendlyErrorMessage: error => error.message, renderWeekInvitedStatus: () => {},
    loadDailyHealth: date => new Promise(resolve => pending.push({ date: dates.formatDateId(date), resolve })),
    saveInvitedMeals: async (...args) => saves.push(args)
  });
  const today = app.refreshWeekInvited();
  elements.weekInvitedDay.value = '1';
  const tomorrow = app.refreshWeekInvited();
  assert.deepEqual(pending.map(p => p.date), ['2026-12-31', '2027-01-01', '2027-01-01', '2027-01-02']);
  pending[2].resolve({ invitedMeals: { lunch: 5, dinner: 6, breakfast: 4 } });
  pending[3].resolve({ invitedMeals: { breakfast: 7 } });
  await tomorrow;
  pending[0].resolve({ invitedMeals: { lunch: 1, dinner: 2 } });
  pending[1].resolve({ invitedMeals: { breakfast: 3 } });
  await today;
  assert.deepEqual(elements.weekInvitedInputs.map(input => input.value), ['5', '6', '7']);
  assert.match(labels[2].textContent, /afterTomorrow/);
  await app.handleWeekInvitedSave();
  assert.equal(dates.formatDateId(saves[0][0]), '2027-01-01');
  assert.deepEqual(saves[0][1], { lunch: 5, dinner: 6, breakfast: 7 });
  assert.deepEqual(saves[0][2], { nextDayBreakfast: true });
});
