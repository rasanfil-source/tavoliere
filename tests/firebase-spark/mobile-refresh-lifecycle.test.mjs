import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { functions, functionSource } from '../helpers/app-functions.mjs';

const turn = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function harness(mode = 'week') {
  const timers = new Map(), reads = [], messages = [];
  let now = 1000, timerId = 0, renders = 0;
  const state = { mode, participantRequestVersion: 0, kitchenRequestVersion: 0,
    residentReady: true, selectedParticipant: { participantId: 'person' },
    participantWeek: [{}], participantMonth: [{}], activeRefreshKey: mode };
  const document = { hidden: false };
  const h = functions(['refreshNow'], {
    state, globalThis: { document }, Date: { now: () => now },
    window: { setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
      clearTimeout: id => timers.delete(id) },
    buildRefreshContextKey: () => mode,
    performRefresh: (_, operation) => {
      const pending = deferred();
      if (mode === 'kitchen') operation.kitchenVersion = ++state.kitchenRequestVersion;
      else operation.request = { mode, version: ++state.participantRequestVersion };
      reads.push({ ...pending, operation });
      return pending.promise;
    },
    isCurrentParticipantRequest: request => request.version === state.participantRequestVersion,
    elements: { status: {} }, t: key => key,
    setParticipantStatus: message => messages.push(message),
    setFreshnessStatus: (_, message) => messages.push(message),
    isKitchenScreenReady: () => true, renderMeals: () => renders++,
    hideStartupSplash() {}, renderMode() {}, renderTodayOverview: () => renders++,
    calendarLoadContextKey: () => mode, renderCalendarPlaceholder: () => renders++
  });
  return { ...h, state, document, reads, messages, timers,
    advance: ms => { now += ms; }, get renders() { return renders; },
    fire: ms => {
      const match = [...timers].find(([, timer]) => timer.ms === ms);
      assert.ok(match, `Missing ${ms}ms timer`);
      timers.delete(match[0]); match[1].fn();
    } };
}

for (const mode of ['week', 'participant', 'summary', 'kitchen']) {
  test(`${mode}: soft deadline preserves the original read and accepts its late result`, async () => {
    const h = harness(mode);
    const pending = h.refreshNow('avvio');
    const version = h.state.participantRequestVersion;
    h.fire(5000);
    assert.equal(h.state.refreshInFlight, true);
    assert.equal(h.reads[0].operation.cancelled, false);
    assert.equal(h.state.participantRequestVersion, version);
    assert.equal(h.reads.length, 1);
    h.reads[0].resolve(); await pending;
    assert.equal(h.state.refreshInFlight, false);
    assert.equal(h.timers.size, 0);
    assert.equal(h.state.selectedParticipant.participantId, 'person');
  });

  test(`${mode}: resumed read owns the lock even after the suspended read completes`, async () => {
    const h = harness(mode);
    const first = h.refreshNow('avvio');
    h.advance(4001);
    const second = h.refreshNow('ripresa');
    await first;
    assert.equal(h.reads.length, 2);
    assert.equal(h.reads[0].operation.cancelled, true);
    assert.equal(h.state.activeRefreshOperation, h.reads[1].operation);
    h.reads[0].resolve(); await turn();
    assert.equal(h.state.refreshInFlight, true);
    assert.equal(h.state.residentReady, true);
    h.reads[1].resolve(); await second;
    assert.equal(h.state.refreshInFlight, false);
    assert.equal(h.timers.size, 0);
  });

  test(`${mode}: background timer does not read and leaves refresh overdue for resume`, async () => {
    const h = harness(mode);
    h.document.hidden = true;
    await h.refreshNow('timer');
    assert.equal(h.reads.length, 0);
    assert.equal(h.state.nextRefreshAt, 0);
  });
}

test('slow Auth survives both the hard deadline and resume without replacing the request', async () => {
  const h = harness();
  const pending = h.refreshNow('avvio');
  h.reads[0].operation.waitingForAuth = true;
  h.advance(30000); h.fire(20000);
  await h.refreshNow('ripresa');
  assert.equal(h.reads.length, 1);
  assert.equal(h.state.refreshInFlight, true);
  assert.equal(h.reads[0].operation.cancelled, false);
  h.reads[0].operation.waitingForAuth = false;
  h.reads[0].resolve(); await pending;
  assert.equal(h.state.residentReady, true);
});

test('kitchen hard deadline releases its lock, invalidates late data and retains visible meals', async () => {
  const h = harness('kitchen');
  const pending = h.refreshNow('timer');
  h.fire(20000); await pending;
  assert.equal(h.state.refreshInFlight, false);
  assert.equal(h.state.kitchenRequestVersion, 2);
  assert.equal(h.reads[0].operation.cancelled, true);
  assert.equal(h.renders, 0);
  assert.deepEqual(h.messages, ['errors.timeout']);
});

test('presentation and data module downloads do not wait for full translation catalogs', async () => {
  const calls = [];
  const h = functions(['loadDomainModule'], {
    domainModuleLoads: new Map(),
    domainModuleLoaders: {
      summaryView: async () => { calls.push('view'); return {}; },
      participant: async () => { calls.push('data'); return {}; }
    }
  });
  const view = h.loadDomainModule('summaryView');
  await h.loadDomainModule('participant');
  await view;
  assert.deepEqual(calls, ['view', 'data']);
});

test('worker registration, durable storage and meal modules are scheduled after render and only once', async () => {
  const calls = [];
  let timer, idle;
  const h = functions(['schedulePostStartupWork'], {
    state: { mode: 'week' },
    window: { setTimeout: fn => { timer = fn; }, requestIdleCallback: fn => { idle = fn; } },
    navigator: { storage: { persist: async () => { calls.push('persist'); return false; } } },
    registerServiceWorker: () => calls.push('worker'),
    loadDomainModule: async name => calls.push(name)
  });
  h.schedulePostStartupWork(); h.schedulePostStartupWork();
  assert.deepEqual(calls, []); timer(); assert.deepEqual(calls, []);
  idle(); await turn();
  assert.deepEqual(calls, ['worker', 'persist', 'pendingMeals', 'mealJournal']);
});

test('center getter memoizes persistence reads and still honors URL changes and the iOS cookie fallback', () => {
  let reads = 0, writes = 0, stored = '', cookie = 'tavolaComune.centerId=ios_center';
  const window = { location: { search: '' }, localStorage: {
    getItem: () => { reads++; return stored; }, setItem: (_, value) => { writes++; stored = value; }
  } };
  const context = vm.createContext({ window, URLSearchParams, document: {
    get cookie() { reads++; return cookie; }, set cookie(value) { writes++; cookie = value; }
  } });
  vm.runInContext(readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/center-context.js', import.meta.url), 'utf8')
    .replaceAll('export ', ''), context);
  assert.equal(context.getActiveCenterId(), 'ios_center');
  const firstReads = reads, firstWrites = writes;
  for (let i = 0; i < 500; i++) assert.equal(context.getActiveCenterId(), 'ios_center');
  assert.equal(reads, firstReads); assert.equal(writes, firstWrites);
  window.location.search = '?c=another_center';
  assert.equal(context.getActiveCenterId(), 'another_center');
  assert.equal(stored, 'another_center');
});

test('admin fallback shows progress without reconciling an uninitialized Auth user', () => {
  let timer, progress = 0;
  const context = vm.createContext({ elements: { authStatus: {}, authButton: {} },
    state: { mode: 'admin' }, isFirebaseConfigured: true, t: key => key, watchAuth() {},
    window: { setTimeout: fn => { timer = fn; } }, showStartupProgress: () => progress++,
    reconcileAdminAccessWithoutStrongUser: () => assert.fail('Auth has not decided') });
  vm.runInContext(functionSource('initializeAuthPanel'), context);
  context.initializeAuthPanel(); timer();
  assert.equal(progress, 1);
});
