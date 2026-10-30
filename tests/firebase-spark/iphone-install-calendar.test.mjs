import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = name => readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/' + name, import.meta.url), 'utf8');

test('a fresh iPhone app restores the copied center cookie without localStorage', () => {
  const document = { cookie: 'other=1; tavolaComune.centerId=center_iphone' };
  const stored = new Map();
  const window = { location: { search: '' }, localStorage: {
    getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value)
  } };
  const context = vm.createContext({ window, document, URLSearchParams });
  vm.runInContext(read('center-context.js').replaceAll('export ', ''), context);
  assert.equal(vm.runInContext('getActiveCenterId()', context), 'center_iphone');
  assert.equal(stored.get('tavolaComune.centerId'), 'center_iphone');
  window.location.search = '?c=center_other';
  assert.equal(vm.runInContext('getActiveCenterId()', context), 'center_other');
  assert.match(document.cookie, /center_other; Path=\/;.*Secure/);
  stored.clear(); document.cookie = 'tavolaComune.centerId=invalid%20center'; window.location.search = '';
  assert.equal(vm.runInContext('getActiveCenterId()', context), 'center_default');
});

test('installation bootstrap retains the cookie center in the document URL without a service worker', () => {
  const location = new URL('https://example.test/?access=friendly');
  const link = {};
  const context = vm.createContext({ URL, URLSearchParams, navigator: {},
    localStorage: { getItem: () => null },
    document: { cookie: 'tavolaComune.centerId=center_iphone', querySelector: () => link },
    window: { location, addEventListener() {}, history: { replaceState: (_, __, url) => {
      location.href = new URL(url, location).href;
    } } }
  });
  vm.runInContext(read('index.html').match(/<script>([\s\S]*?)<\/script>/)[1], context);
  assert.equal(location.searchParams.get('c'), 'center_iphone');
  assert.equal(new URL(link.href).searchParams.get('c'), 'center_iphone');
});

const app = read('app.js');
const extract = name => app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`))[0];
function calendarContext(save) {
  const meal = { mealDate: '2026-10-13', mealTypeId: 'lunch', effect: 'ABSENT', isOpen: true };
  const monthMeal = { ...meal };
  const state = { pendingMealKeys: new Set(), selectedParticipant: {}, participantWeek: [{ meals: [meal] }],
    participantMonth: [{ meals: [monthMeal] }], mealReminderDays: [] };
  const cache = new Map([['old', {}]]);
  const context = vm.createContext({ state, participantMonthCache: cache, participantCalendarRevision: 0,
    clearPersonalCalendarSnapshots() {}, getActiveCenterId: () => 'one', getCurrentUser: () => ({ uid: 'user' }),
    scheduleBackgroundRefresh() {},
    saveParticipantMeal: save, getMealPendingKey: (date, type) => date + type,
    setParticipantStatus() {}, scheduleMealRemindersFromCurrentCalendar() {}, friendlyErrorMessage: () => 'error' });
  vm.runInContext(['invalidateParticipantCalendarCache', 'saveMealOptimistically', 'beginOptimisticBulkSelection'].map(extract).join('\n'), context);
  return { context, state, meal, monthMeal, cache };
}

test('single weekly save updates monthly meal and invalidates stale cached months', async () => {
  const h = calendarContext(async (_, meal) => { meal.createdAt = 'saved'; meal.updatedAt = 'saved'; });
  await h.context.saveMealOptimistically({ meal: h.meal, effect: 'PRESENT', sync() {} });
  assert.equal(h.monthMeal.effect, 'PRESENT');
  assert.equal(h.monthMeal.createdAt, 'saved');
  assert.equal(h.cache.size, 0);
});

test('failed weekly save restores selection and discards cache loaded during the write', async () => {
  const h = calendarContext(async () => { h.cache.set('during-write', {}); throw new Error('offline'); });
  await h.context.saveMealOptimistically({ meal: h.meal, effect: 'PRESENT', sync() {} });
  assert.equal(h.meal.effect, 'ABSENT');
  assert.equal(h.monthMeal.effect, 'ABSENT');
  assert.equal(h.cache.size, 0);
  assert.equal(h.state.pendingMealKeys.size, 0);
});

test('bulk save updates monthly selection and invalidates the cache at completion', () => {
  const h = calendarContext();
  const operation = h.context.beginOptimisticBulkSelection(h.state.participantWeek, 'PRESENT');
  h.cache.set('during-write', {});
  operation.commit(); operation.finish();
  assert.equal(h.monthMeal.effect, 'PRESENT');
  assert.ok(h.monthMeal.createdAt);
  assert.equal(h.cache.size, 0);
});

test('a month read started before a save cannot repopulate the cache after invalidation', async () => {
  const h = calendarContext();
  let finishRead;
  Object.assign(h.context, { participantMonthCacheKey: () => 'month',
    PARTICIPANT_MONTH_CACHE_MS: 60000, PARTICIPANT_MONTH_CACHE_MAX: 3,
    daysInMonth: () => 31, loadParticipantWeek: () => new Promise(resolve => { finishRead = resolve; }) });
  vm.runInContext(extract('loadParticipantMonthData'), h.context);
  const reading = h.context.loadParticipantMonthData('resident', new Date());
  h.context.invalidateParticipantCalendarCache();
  finishRead([]);
  await reading;
  assert.equal(h.cache.size, 0);
});

test('a late single save cannot alter the next resident or clear their pending selection', async () => {
  let finishSave;
  let synced = 0, completed = 0;
  const h = calendarContext(() => new Promise((resolve) => { finishSave = resolve; }));
  const oldPending = h.state.pendingMealKeys;
  const saving = h.context.saveMealOptimistically({ meal: h.meal, effect: 'PRESENT',
    sync: () => { synced++; }, onSaved: () => { completed++; } });
  h.state.selectedParticipant = { participantId: 'different-resident' };
  const nextMeal = { ...h.meal, effect: 'ABSENT' };
  h.state.participantWeek = [{ meals: [nextMeal] }];
  h.state.pendingMealKeys = new Set(['2026-10-13lunch']);
  h.cache.set('next-resident', {});
  finishSave();
  await saving;
  assert.equal(nextMeal.effect, 'ABSENT');
  assert.equal(completed, 0);
  assert.equal(synced, 1);
  assert.equal(oldPending.size, 0);
  assert.equal(h.state.pendingMealKeys.size, 1);
  assert.equal(h.cache.has('next-resident'), true);
});

test('a late bulk completion leaves the next resident calendar and pending writes alone', () => {
  const h = calendarContext();
  const oldPending = h.state.pendingMealKeys;
  const operation = h.context.beginOptimisticBulkSelection(h.state.participantWeek, 'PRESENT');
  h.state.selectedParticipant = { participantId: 'different-resident' };
  const nextMeal = { ...h.meal, effect: 'ABSENT' };
  h.state.participantWeek = [{ meals: [nextMeal] }];
  h.state.pendingMealKeys = new Set(['2026-10-13lunch']);
  h.cache.set('next-resident', {});
  operation.commit(); operation.finish();
  assert.equal(operation.isCurrent(), false);
  assert.equal(nextMeal.effect, 'ABSENT');
  assert.equal(oldPending.size, 0);
  assert.equal(h.state.pendingMealKeys.size, 1);
  assert.equal(h.cache.has('next-resident'), true);
});
