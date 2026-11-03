import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as turn } from 'node:timers/promises';
import { createPendingMealTracker } from '../../prototypes/firebase-spark-pwa/public/core/pending-meals.mjs';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

function clock() {
  let now = 0, id = 0;
  const timers = new Map(), notices = [];
  const tracker = createPendingMealTracker({ now: () => now, schedule: (fn, ms) => {
    timers.set(++id, { fn, at: now + ms }); return id;
  }, cancel: key => timers.delete(key), onWaiting: entry => notices.push(entry) });
  return { tracker, timers, notices, advance(ms) { now += ms; }, fire() {
    const due = [...timers].filter(([, timer]) => timer.at <= now);
    for (const [key, timer] of due) { timers.delete(key); timer.fn(); }
  } };
}

test('suspended timers on mobile do not cancel writes; resume checks elapsed time once', () => {
  const h = clock();
  const entry = h.tracker.begin('lunch', { effect: 'PRESENT' });
  assert.equal(h.tracker.begin('lunch', {}), null);
  h.advance(60000); // iOS/Android can freeze the page without firing its timers.
  assert.equal(h.notices.length, 0);
  h.tracker.check(); h.tracker.check();
  assert.deepEqual(h.notices, [entry]);
  assert.equal(h.tracker.get('lunch'), entry);
  assert.equal(h.tracker.finish(entry), true);
  assert.equal(h.timers.size, 0);
});

test('old identity completion cannot remove the next identity operation for the same meal', () => {
  const h = clock(); let current = true;
  const old = h.tracker.begin('lunch', { isCurrent: () => current });
  current = false;
  const next = h.tracker.begin('lunch', { isCurrent: () => true });
  assert.equal(h.tracker.finish(old), false);
  assert.equal(h.tracker.get('lunch'), next);
  h.tracker.finish(next);
});

function harness() {
  const h = clock(); let resolve, reject, writes = 0, uid = 'one';
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const meal = { mealDate: '2030-01-02', mealTypeId: 'lunch', mealWindowId: '2030-01-02_lunch', effect: 'ABSENT' };
  const state = { mode: 'week', pendingMealKeys: new Set(), selectedParticipant: { participantId: 'person' },
    participantWeek: [{ meals: [meal] }], participantMonth: [], singleMealTracker: h.tracker };
  const statuses = [], refreshes = [];
  const api = functions(['saveMealOptimistically', 'activeSingleMealKeys', 'hasBlockingMealWrites',
    'overlayPendingMeals', 'renderPendingMealStatus'], {
    state, getCurrentUser: () => ({ uid }), getActiveCenterId: () => 'center', renderParticipantMeals() {},
    getSingleMealTracker: async () => h.tracker, isMealWindowOpenAtServerTime: () => true,
    getMealPendingKey: (date, type) => date + '_' + type,
    invalidateParticipantCalendarCache() {}, t: key => key,
    setParticipantStatus: message => statuses.push(message), friendlyErrorMessage: () => 'failed',
    scheduleMealRemindersFromCurrentCalendar() {}, scheduleBackgroundRefresh: source => refreshes.push(source),
    saveParticipantMeal: async () => { writes++; await pending; meal.createdAt = 'saved'; }
  });
  return { ...h, api, state, meal, resolve, reject, statuses, refreshes, writes: () => writes,
    changeUser() { uid = 'two'; } };
}

for (const success of [true, false]) {
  test(`slow save ${success ? 'success' : 'rejection'} reconciles refreshed objects and prevents duplicate writes`, async () => {
    const h = harness();
    const save = h.api.saveMealOptimistically({ meal: h.meal, effect: 'PRESENT', sync() {} });
    await turn();
    await h.api.saveMealOptimistically({ meal: h.meal, effect: 'ABSENT', sync() {} });
    assert.equal(h.writes(), 1);
    assert.equal(h.api.hasBlockingMealWrites(), false);
    h.advance(60000); h.tracker.check(); h.api.renderPendingMealStatus();
    assert.equal(h.statuses.at(-1), 'participant.meal.save.waiting');
    const serverMeal = { ...h.meal, effect: 'ABSENT' };
    const other = { ...serverMeal, mealTypeId: 'dinner', mealWindowId: '2030-01-02_dinner' };
    h.state.participantWeek = [{ meals: [serverMeal, other] }];
    h.api.overlayPendingMeals(h.state.participantWeek);
    assert.equal(serverMeal.effect, 'PRESENT');
    assert.equal(other.effect, 'ABSENT');
    if (success) h.resolve(); else h.reject(new Error('denied'));
    await save;
    assert.equal(serverMeal.effect, success ? 'PRESENT' : 'ABSENT');
    assert.equal(h.state.pendingMealKeys.size, 0);
    assert.equal(h.tracker.values().length, 0);
    assert.equal(h.timers.size, 0);
  });
}

test('untracked bulk writes retain the conservative refresh barrier', () => {
  const h = harness();
  h.state.pendingMealKeys.add('bulk');
  assert.equal(h.api.hasBlockingMealWrites(), true);
});

test('a delayed week save updates the month without changing the newly selected day', async () => {
  const h = harness(); let selectionChanges = 0;
  const save = h.api.saveMealOptimistically({ meal: h.meal, effect: 'PRESENT', sync() {}, onSaved() { selectionChanges++; } });
  await turn();
  h.state.mode = 'participant';
  h.state.participantRequestVersion = 1;
  const newMeal = { ...h.meal, effect: 'ABSENT' };
  h.state.participantMonth = [{ meals: [newMeal] }];
  h.resolve(); await save;
  assert.equal(newMeal.effect, 'PRESENT');
  assert.equal(selectionChanges, 0);
  assert.equal(h.state.pendingMealKeys.size, 0);
});

test('late completion cannot update another signed-in user', async () => {
  const h = harness();
  const save = h.api.saveMealOptimistically({ meal: h.meal, effect: 'PRESENT', sync() {} });
  await turn(); h.changeUser();
  const next = { ...h.meal, effect: 'ABSENT' };
  h.state.participantWeek = [{ meals: [next] }];
  h.resolve(); await save;
  assert.equal(next.effect, 'ABSENT');
  assert.ok(!h.statuses.includes('participant.meal.save.success'));
});

test('only explicitly tracked local overrides may accompany server reads', async () => {
  let metadata = { fromCache: false, hasPendingWrites: true };
  const local = { metadata: { hasPendingWrites: true }, id: 'override', data: () => ({ mealWindowId: 'day_lunch', mealDate: '2030-01-02' }) };
  const api = await loadBrowserModule('participant-data.js', {
    db: {}, getActiveCenterId: () => 'center', collection() {}, query() {}, where() {},
    getDocsFromServer: async () => ({ metadata, docs: [local] })
  }, ['getOwnOverrides']);
  await assert.rejects(api.getOwnOverrides('person', '2030-01-01', '2030-01-03', true), { code: 'unavailable' });
  const values = await api.getOwnOverrides('person', '2030-01-01', '2030-01-03', true, new Set(['day_lunch']));
  assert.equal(values.serverConfirmed, false);
  metadata = { fromCache: true, hasPendingWrites: true };
  await assert.rejects(api.getOwnOverrides('person', '2030-01-01', '2030-01-03', true, new Set(['day_lunch'])), { code: 'unavailable' });
});

test('the tracker contains no eager browser, translation, authentication or Firebase dependencies', () => {
  const source = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/core/pending-meals.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s|localStorage|indexedDB|fetch\(|signOut|initializeAuth/);
});
