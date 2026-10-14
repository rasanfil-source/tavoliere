import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { setImmediate as turn } from 'node:timers/promises';
import { loadPersonalCalendarSnapshot, savePersonalCalendarSnapshot, clearPersonalCalendarSnapshots }
  from '../../prototypes/firebase-spark-pwa/public/core/personal-calendar-cache.mjs';

const read = (file) => readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/' + file, import.meta.url), 'utf8');
const app = read('app.js');
const extract = (source, name) => {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`));
  assert.ok(match, name);
  return match[0];
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const scope = { centerId: 'one', uid: 'resolved-user', participantId: 'person', view: 'week', start: '2026-10-12', end: '2026-10-18' };
const days = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-${12 + index}`, displayName: 'must not be stored',
  meals: [{ mealTypeId: 'lunch', label: 'Pranzo', effect: index % 2 ? 'PRESENT' : 'ABSENT', isOpen: true, health: 'private' }] }));
function memoryStorage() {
  const values = new Map();
  return { values, get length() { return values.size; }, key: (index) => [...values.keys()][index],
    getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('personal snapshot needs server confirmation, isolates identity/center/period and restores read-only', () => {
  const storage = memoryStorage();
  assert.equal(savePersonalCalendarSnapshot(scope, days, { storage, now: 100 }), false);
  assert.equal(savePersonalCalendarSnapshot(scope, days, { storage, now: 100, serverConfirmed: true }), true);
  const cached = loadPersonalCalendarSnapshot(scope, { storage, now: 110 });
  assert.equal(cached.savedAt, 100);
  assert.equal(cached.days[1].meals[0].effect, 'PRESENT');
  assert.equal(cached.days[1].meals[0].isOpen, false);
  assert.doesNotMatch([...storage.values.values()][0], /displayName|private|health|must not be stored/);
  for (const field of ['uid', 'centerId', 'participantId', 'view', 'start']) {
    assert.equal(loadPersonalCalendarSnapshot({ ...scope, [field]: 'different' }, { storage, now: 110 }), null);
  }
});

test('snapshot cache is bounded, expires and tolerates corrupt/unavailable storage', () => {
  const storage = memoryStorage();
  for (let index = 0; index < 9; index++) savePersonalCalendarSnapshot({ ...scope, participantId: `p${index}` }, days,
    { storage, now: 100 + index, serverConfirmed: true });
  assert.equal(storage.length, 4);
  assert.equal(loadPersonalCalendarSnapshot({ ...scope, participantId: 'p8' }, { storage, now: 108 + 73 * 3600000 }), null);
  const key = storage.key(0);
  storage.setItem(key, '{broken');
  clearPersonalCalendarSnapshots({ centerId: 'one' }, storage);
  assert.equal(storage.length, 0);
  const unavailable = { get length() { throw Error('blocked'); }, getItem() { throw Error('blocked'); } };
  assert.equal(loadPersonalCalendarSnapshot(scope, { storage: unavailable }), null);
  assert.equal(savePersonalCalendarSnapshot(scope, days, { storage: unavailable, serverConfirmed: true }), false);
  assert.equal(savePersonalCalendarSnapshot(scope, days.slice(1), { storage, serverConfirmed: true }), false);
});

test('week and month loading show a status without a reduced grid or cached selections', () => {
  for (const mode of ['week', 'participant']) {
    const target = { dataset: { renderKey: 'old-grid' }, innerHTML: '' };
    const context = vm.createContext({ state: { mode },
      elements: { participantMeals: target, monthGrid: target, weekOperations: {} },
      escapeHtml: (value) => value, t: (key) => key, renderWeekControls() {}, renderCalendarControls() {}
    });
    vm.runInContext(extract(app, 'renderCalendarPlaceholder'), context);
    context.renderCalendarPlaceholder();
    assert.match(target.innerHTML, /role="status"[^]*common.status.loading/);
    assert.doesNotMatch(target.innerHTML, /<table|<button|<input|✓|—|…|calendar-preview|data-week-meal|data-month-meal/);
    assert.equal(target.dataset.renderKey, undefined);
    assert.equal(context.elements.weekOperations.hidden, true);
  }
});

test('month reuse is scoped to the confirmed timezone, language and Auth identity', async () => {
  let uid = scope.uid, reads = 0;
  const context = vm.createContext({ participantCalendarRevision: 0, participantMonthCache: new Map(),
    PARTICIPANT_MONTH_CACHE_MS: 60000, PARTICIPANT_MONTH_CACHE_MAX: 3,
    getCurrentUser: () => ({ uid }), getActiveCenterId: () => scope.centerId,
    getLocale: () => 'it', formatMonthId: () => '2026-10', daysInMonth: () => 31,
    loadParticipantWeek: async () => { reads++; return Object.assign([], { serverConfirmed: true }); }
  });
  vm.runInContext(extract(app, 'participantMonthCacheKey') + extract(app, 'loadParticipantMonthData'), context);
  const readMonth = (timezone = 'Europe/Rome', locale = 'it') => context.loadParticipantMonthData('person',
    new Date('2026-10-01'), { timezone, locale, requireServer: true });
  await readMonth(); await readMonth();
  assert.equal(reads, 1);
  await readMonth('Europe/London');
  assert.equal(reads, 2);
  await readMonth('Europe/London', 'en');
  assert.equal(reads, 3);
  uid = 'another-user';
  await readMonth('Europe/London', 'en');
  assert.equal(reads, 4);
});

function navigation({ cached = 'saved shell', storageError, writeError } = {}) {
  const net = deferred(), background = [];
  let expire, cancelled = 0, fetches = 0;
  const entries = new Map(cached ? [['/index.html', new Response(cached)]] : []);
  const context = vm.createContext({ CACHE_NAME: 'test', HTML_NETWORK_TIMEOUT_MS: 1200,
    setTimeout: (callback, delay) => { assert.equal(delay, 1200); expire = callback; return 1; },
    clearTimeout: () => { cancelled++; },
    fetch: () => { fetches++; return net.promise; },
    caches: { open: async () => { if (storageError) throw Error('storage'); return {
      match: async (key) => entries.get(key)?.clone(),
      put: async (key, value) => { if (writeError) throw Error('quota'); entries.set(key, value); }
    }; } }
  });
  vm.runInContext(extract(read('sw.js'), 'networkFirst'), context);
  const result = context.networkFirst({ url: 'https://example.test/?token=never-cache' }, '/index.html',
    { waitUntil: (promise) => background.push(promise) });
  return { net, result, entries, background, timeout: () => expire(), get cancelled() { return cancelled; }, get fetches() { return fetches; } };
}

test('HTML timeout serves saved shell while original request updates canonical cache in background', async () => {
  const run = navigation();
  run.timeout();
  assert.equal(await (await run.result).text(), 'saved shell');
  assert.equal(run.cancelled, 1);
  run.net.resolve(new Response('fresh shell'));
  await Promise.all(run.background);
  assert.equal(await run.entries.get('/index.html').text(), 'fresh shell');
  assert.equal(run.entries.size, 1);
  assert.equal(run.fetches, 1);
});

test('HTML handles HTTP failures, absent cache, failed cache open/write and offline rejection', async () => {
  const bad = navigation();
  bad.net.resolve(new Response('unavailable', { status: 503 }));
  assert.equal(await (await bad.result).text(), 'saved shell');
  for (const options of [{ cached: null }, { storageError: true }, { writeError: true }]) {
    const run = navigation(options);
    run.timeout();
    run.net.resolve(new Response('network shell'));
    assert.equal(await (await run.result).text(), options.writeError ? 'saved shell' : 'network shell');
    await Promise.all(run.background);
    assert.equal(run.fetches, 1);
  }
  const offline = navigation({ cached: null });
  offline.net.reject(Error('offline'));
  await assert.rejects(offline.result, /offline/);
});

test('an offline versioned module never falls back to a different release', async () => {
  for (const version of ['20261012b', '20261014b']) {
    const response = new Response('module');
    Object.defineProperty(response, 'url', { value: `https://example.test/app.js?v=${version}` });
    const context = vm.createContext({ URL, CACHE_NAME: 'test', self: { location: { origin: 'https://example.test' } },
      caches: { open: async () => ({ match: async (key) => key === '/app.js' ? response : null }) },
      fetch: async () => { throw Error('offline'); }
    });
    vm.runInContext(extract(read('sw.js'), 'versionedCacheFirst'), context);
    const result = context.versionedCacheFirst({ url: 'https://example.test/app.js?v=20261014b' }, '/app.js');
    if (version === '20261014b') assert.equal(await result, response);
    else await assert.rejects(result, /offline/);
  }
});

test('meals become usable while roles, presentation and accessory continuation remain pending', async () => {
  const calls = [];
  const meals = deferred();
  let splashHidden = false;
  const state = { mode: 'week', friendlyAccess: true, residentReady: true, residentAuthTransition: '',
    participantWeek: [], participantMonth: [], todayOverview: [], selectedParticipant: { participantId: 'person' } };
  const context = vm.createContext({ state, console,
    currentPersonalCalendarScope: () => scope, beginParticipantRequest: () => ({}), isCurrentParticipantRequest: () => true,
    preparePersonalCalendarRead: () => null,
    getCurrentUser: () => ({ uid: scope.uid }), renderCalendarPlaceholder() {},
    setParticipantStatus() {}, ensureStoredResidentSession: async () => calls.push('session'),
    loadCenterCalendarSettings: async () => { calls.push('critical-settings'); return {}; },
    loadCenterContactSettings: () => { throw Error('presentation must not block'); },
    applyResidentPreferences: (value) => value, anchorCalendarToCenterToday: () => false,
    loadCurrentParticipantCalendar: async () => { calls.push('meals'); await meals.promise; return true; },
    renderMode() {}, renderParticipantMeals: () => calls.push('render'),
    hideStartupSplash: () => { assert.ok(calls.includes('render')); splashHidden = true; },
    markStartupStage: (name) => calls.push(name), refreshParticipantExtras: () => { calls.push('extras'); return new Promise(() => {}); },
    refreshMealRemindersAfterCalendar: async () => {}, formatRefreshLabel: () => 'updated'
  });
  vm.runInContext(extract(app, 'refreshParticipant'), context);
  const refresh = context.refreshParticipant('avvio');
  await turn();
  assert.deepEqual(calls, ['session', 'critical-settings', 'meals']);
  assert.equal(splashHidden, false, 'keep the startup presentation while the real calendar is pending');
  meals.resolve();
  assert.equal(await refresh, true);
  assert.equal(splashHidden, true);
  assert.deepEqual(calls, ['session', 'critical-settings', 'meals', 'render', 'extras']);
});

test('a refresh during a pending selection does not start reads that can replace optimistic state', async () => {
  const context = vm.createContext({ state: { pendingMealKeys: new Set(['one-meal']) },
    beginParticipantRequest: () => { throw Error('must wait for write completion'); } });
  vm.runInContext(extract(app, 'refreshParticipant'), context);
  await context.refreshParticipant('manuale');
});

test('deferred presentation cannot overwrite confirmed calendar settings or load roles for a new identity', async () => {
  const role = deferred();
  const state = { mode: 'week', selectedParticipant: { participantId: 'person' },
    centerContactSettings: { timezone: 'Europe/Rome', reservationCutoffs: { lunch: 10 }, adminPasswordVersion: 2 } };
  let current = true, privilegedReads = 0, rendered = 0;
  const context = vm.createContext({ state, window: { setTimeout }, getCurrentUser: () => ({ uid: scope.uid }),
    isCurrentParticipantRequest: () => current, applyResidentPreferences: (value) => value,
    loadCenterContactSettings: async () => ({ timezone: 'America/New_York', reservationCutoffs: {},
      adminPasswordVersion: 1, appDisplayName: 'New presentation' }),
    applyCenterDefaultLanguage: async () => {}, renderMode() {}, renderParticipantMeals: () => { rendered++; },
    refreshResidentAdministratorAuthorization: () => role.promise,
    refreshStrongAdministratorOperationalAuthorization: async () => { privilegedReads++; },
    setParticipantStatus() {}, t: (key) => key
  });
  vm.runInContext(extract(app, 'refreshParticipantExtras'), context);
  const result = context.refreshParticipantExtras('avvio', {});
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(state.centerContactSettings.timezone, 'Europe/Rome');
  assert.equal(state.centerContactSettings.reservationCutoffs.lunch, 10);
  assert.equal(state.centerContactSettings.adminPasswordVersion, 2);
  assert.equal(state.centerContactSettings.appDisplayName, 'New presentation');
  assert.equal(rendered, 1);
  current = false;
  role.resolve(false);
  await result;
  assert.equal(privilegedReads, 0);
});

test('an accessory failure leaves meals available and does not suppress independent Mass data', async () => {
  const mass = deferred();
  const warnings = [];
  const state = { mode: 'week', selectedParticipant: { participantId: 'person' }, participantWeek: days,
    centerContactSettings: {}, weekStartDate: new Date(2026, 9, 12),
    weekOperationsRequestVersion: 0, weekOperationalDateId: '2026-10-12', weekMassReady: false, weekExtrasReady: false };
  const context = vm.createContext({ state, window: { setTimeout }, getCurrentUser: () => ({ uid: scope.uid }),
    isCurrentParticipantRequest: () => true, loadCenterContactSettings: async () => ({}),
    applyResidentPreferences: (value) => value, applyCenterDefaultLanguage: async () => {}, renderMode() {}, renderParticipantMeals() {},
    refreshResidentAdministratorAuthorization: async () => true, refreshStrongAdministratorOperationalAuthorization: async () => true,
    canManageMass: () => true, canManageDailyOperations: () => true, loadDailyOperations: () => mass.promise,
    addCalendarDays: (date, index) => new Date(date.getTime() + index * 86400000),
    prepareWeekOperationalDate: () => new Date(2026, 9, 12), formatDateId: () => '2026-10-12',
    listPublicParticipants: async () => [], loadDailyHealth: async () => ({}),
    loadKitchenNote: async () => { throw Error('note temporarily unavailable'); },
    setParticipantStatus: (message) => warnings.push(message), t: (key) => key
  });
  vm.runInContext(extract(app, 'refreshParticipantExtras'), context);
  const result = context.refreshParticipantExtras('avvio', {});
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(state.participantWeek, days);
  assert.equal(state.weekExtrasReady, false);
  assert.equal(warnings.length, 1);
  mass.resolve([{ dateId: '2026-10-12', massScheduled: true }]);
  await result;
  assert.equal(state.weekMassReady, true);
  assert.equal(state.weekDailyOperations[0].massScheduled, true);
  assert.equal(state.participantWeek, days);
});

test('week meal loading never starts privileged queries or waits for them', async () => {
  const state = { centerContactSettings: {}, selectedParticipant: { participantId: 'person' },
    weekStartDate: new Date(2026, 9, 12), participantWeek: [] };
  const context = vm.createContext({ state, getLocale: () => 'it',
    addCalendarDays: (date, index) => new Date(date.getTime() + index * 86400000),
    formatDateId: (date) => date.toISOString().slice(0, 10), formatCalendarWeekLabel: () => '', getCenterToday: () => new Date(),
    getSelectedDay: () => null, loadParticipantWeek: async () => days,
    loadDailyOperations: () => { throw Error('not on critical path'); },
    loadDailyHealth: () => { throw Error('not on critical path'); }, loadKitchenNote: () => { throw Error('not on critical path'); }
  });
  vm.runInContext(extract(app, 'loadCurrentParticipantWeek'), context);
  await context.loadCurrentParticipantWeek();
  assert.equal(state.participantWeek, days);
  state.participantWeek = [];
  await context.loadCurrentParticipantWeek({ isCurrentRequest: () => false });
  assert.equal(state.participantWeek.length, 0);
});

test('server provenance rejects cached or pending-write values and keeps permission errors distinct', () => {
  const context = vm.createContext({});
  vm.runInContext(extract(read('participant-data.js'), 'calendarValues'), context);
  for (const metadata of [{ fromCache: true, hasPendingWrites: false }, { fromCache: false, hasPendingWrites: true }, {}]) {
    assert.throws(() => context.calendarValues({ metadata }, [], true), { code: 'unavailable' });
  }
  assert.equal(context.calendarValues({ metadata: { fromCache: false, hasPendingWrites: false } }, [], true).serverConfirmed, true);
  const overrides = extract(read('participant-data.js'), 'getOwnOverrides');
  assert.match(overrides, /error\?\.code !== 'failed-precondition'/);
  assert.doesNotMatch(overrides, /catch[^]*getDocs\(/);
});

test('a late role response cannot enable privileges after the view or identity changes', async () => {
  const pending = deferred();
  const state = { residentReady: true, residentAdministratorAuthorized: false, centerContactSettings: { adminPasswordVersion: 1 } };
  let current = true;
  const context = vm.createContext({ state, hasStrongAdministratorIdentity: () => false,
    loadResidentAdministratorAuthorization: () => pending.promise });
  vm.runInContext(extract(app, 'refreshResidentAdministratorAuthorization'), context);
  const result = context.refreshResidentAdministratorAuthorization(() => current);
  await turn();
  current = false;
  pending.resolve({ active: true, passwordVersion: 1 });
  assert.equal(await result, false);
  assert.equal(state.residentAdministratorAuthorized, false);
});

test('essential meal reads start while current center settings are still pending', async () => {
  const settings = deferred();
  const meals = deferred();
  const calls = [];
  const state = { mode: 'week', friendlyAccess: true, residentReady: true,
    participantWeek: [], participantMonth: [], selectedParticipant: { participantId: 'person' },
    centerContactSettings: { timezone: 'Europe/Rome' }, weekStartDate: new Date(2026, 9, 12) };
  const context = vm.createContext({ state, console, participantCalendarRevision: 0,
    currentPersonalCalendarScope: () => scope, beginParticipantRequest: () => ({}), isCurrentParticipantRequest: () => true,
    getCurrentUser: () => ({ uid: scope.uid }), getLocale: () => 'it', renderCalendarPlaceholder() {},
    setParticipantStatus() {}, ensureStoredResidentSession: async () => {},
    loadParticipantWeek: () => { calls.push('meals-start'); return meals.promise; },
    loadCenterCalendarSettings: () => { calls.push('settings-start'); return settings.promise; },
    applyResidentPreferences: (value) => value, anchorCalendarToCenterToday: () => false,
    loadCurrentParticipantCalendar: async ({ preparedCalendar }) => {
      const result = await preparedCalendar.result;
      assert.equal(result.value, days);
      calls.push('usable');
    }, renderMode() {}, renderParticipantMeals() {}, hideStartupSplash() {}, markStartupStage() {},
    refreshParticipantExtras: async () => {}, refreshMealRemindersAfterCalendar: async () => {}, formatRefreshLabel: () => ''
  });
  vm.runInContext(extract(app, 'preparePersonalCalendarRead') + extract(app, 'refreshParticipant'), context);
  const result = context.refreshParticipant('avvio');
  await turn();
  assert.deepEqual(calls, ['meals-start', 'settings-start']);
  meals.resolve(days);
  await turn();
  assert.equal(calls.includes('usable'), false, 'settings must confirm the period before controls unlock');
  settings.resolve({ timezone: 'Europe/Rome' });
  assert.equal(await result, true);
  assert.equal(calls.at(-1), 'usable');
});

test('date/timezone changes discard a speculative calendar; obsolete requests cannot publish or persist', async () => {
  for (const change of ['timezone', 'period', 'identity', 'write']) {
    let persisted = 0, reloads = 0;
    let activeScope = { ...scope };
    let user = { uid: scope.uid };
    const pending = deferred();
    const state = { mode: 'week', participantRequestVersion: 1, selectedParticipant: { participantId: 'person' },
      participantWeek: [], participantMonth: [], pendingMealKeys: new Set(), centerContactSettings: { timezone: 'Europe/Rome' } };
    const context = vm.createContext({ state, participantCalendarRevision: 0,
      currentPersonalCalendarScope: () => activeScope, getActiveCenterId: () => scope.centerId, getCurrentUser: () => user,
      savePersonalCalendarSnapshot: () => { persisted++; },
      loadCurrentParticipantWeek: async (options) => {
        if (!options.calendarRead) reloads++;
        await (options.calendarRead || pending.promise);
        if (options.isCurrentRequest()) state.participantWeek = Object.assign([...days], { serverConfirmed: true });
      }
    });
    const preparedCalendar = { scope: { ...scope }, timezone: 'Europe/Rome', revision: 0,
      result: pending.promise.then((value) => ({ value })) };
    if (change === 'timezone') state.centerContactSettings.timezone = 'Europe/London';
    if (change === 'period') activeScope = { ...scope, start: '2026-10-19' };
    vm.runInContext(extract(app, 'loadCurrentParticipantCalendar'), context);
    const result = context.loadCurrentParticipantCalendar({ preparedCalendar });
    if (change === 'identity') user = { uid: 'other' };
    if (change === 'write') context.participantCalendarRevision++;
    pending.resolve(days);
    await result;
    if (['identity', 'write'].includes(change)) {
      assert.equal(state.participantWeek.length, 0);
      assert.equal(persisted, 0);
    } else assert.equal(reloads, 1, change);
  }
});
