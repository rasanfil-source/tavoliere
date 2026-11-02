import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { residentReopenHarness } from '../helpers/resident-reopen.mjs';

const turn = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function requestHarness(mode, dependencies = {}) {
  const state = { mode, participantRequestVersion: 0, monthDate: new Date(2026, 10, 1),
    weekStartDate: new Date(2026, 10, 2), summaryDayOffset: 0, kitchenDayOffset: 0,
    participantWeek: [], participantMonth: [] };
  const deps = { state, getActiveCenterId: () => 'center', getCurrentUser: () => ({ uid: 'user' }),
    formatDateId: d => String(d.getTime()), formatMonthId: d => String(d.getMonth()), ...dependencies };
  return { state, ...functions(['beginParticipantRequest', 'isCurrentParticipantRequest', 'buildRefreshContextKey',
    ...(dependencies.performRefresh ? ['refreshNow'] : [])], deps) };
}

test('summary ignores personal calendar/participant changes but rejects day, identity and generation changes', () => {
  let uid = 'user';
  const h = requestHarness('summary', { getCurrentUser: () => ({ uid }) });
  const request = h.beginParticipantRequest(); request.authUid = uid;
  const key = h.buildRefreshContextKey();
  h.state.monthDate = new Date(2027, 1, 1); h.state.weekStartDate = new Date(2027, 1, 7);
  h.state.selectedParticipant = { participantId: 'restored' };
  assert.equal(h.isCurrentParticipantRequest(request), true);
  assert.equal(h.buildRefreshContextKey(), key);
  h.state.summaryDayOffset = 1;
  assert.equal(h.isCurrentParticipantRequest(request), false);
  h.state.summaryDayOffset = 0; uid = 'other';
  assert.equal(h.isCurrentParticipantRequest(request), false);
  uid = 'user'; h.beginParticipantRequest();
  assert.equal(h.isCurrentParticipantRequest(request), false);
});

for (const mode of ['week', 'participant']) {
  test(`${mode}: irrelevant dates do not invalidate requests`, () => {
    const h = requestHarness(mode);
    const request = h.beginParticipantRequest(); const key = h.buildRefreshContextKey();
    if (mode === 'week') h.state.monthDate = new Date(2027, 1, 1);
    else h.state.weekStartDate = new Date(2027, 1, 7);
    h.state.summaryDayOffset = 1; h.state.kitchenDayOffset = 1;
    assert.equal(h.isCurrentParticipantRequest(request), true);
    assert.equal(h.buildRefreshContextKey(), key);
  });
}

for (const mode of ['summary', 'week', 'participant']) {
  test(`${mode}: timeout survives restored identity and aligned dates and suppresses late publication`, async () => {
    let timeout, published = false, visibleError = false, h;
    const pending = deferred();
    h = requestHarness(mode, {
      SUMMARY_STARTUP_LOAD_TIMEOUT_MS: 5000,
      window: { setTimeout: fn => { timeout = fn; return 1; }, clearTimeout() {} },
      performRefresh: async (_, operation) => {
        h.beginParticipantRequest(operation);
        h.state.selectedParticipant = { participantId: 'restored' };
        h.state.weekStartDate = new Date(2026, 10, 9);
        h.state.monthDate = new Date(2026, 11, 1);
        const request = h.beginParticipantRequest(operation); request.authUid = 'user';
        await pending.promise;
        if (h.isCurrentParticipantRequest(request)) published = true;
      },
      hideStartupSplash() {}, t: k => k, renderMode() {}, renderTodayOverview() {},
      renderCalendarPlaceholder() {}, calendarLoadContextKey: () => 'current',
      setParticipantStatus: () => { visibleError = true; }
    });
    const run = h.refreshNow('avvio');
    timeout(); await run;
    assert.equal(h.state.refreshInFlight, false);
    assert.equal(visibleError, true);
    pending.resolve(); await turn();
    assert.equal(published, false);
  });
}

test('an expired operation cannot cancel a newer request or overwrite another view', async () => {
  let timeout, h;
  h = requestHarness('summary', {
    SUMMARY_STARTUP_LOAD_TIMEOUT_MS: 5000,
    window: { setTimeout: fn => { timeout = fn; return 1; }, clearTimeout() {} },
    performRefresh: (_, operation) => { h.beginParticipantRequest(operation); return new Promise(() => {}); },
    hideStartupSplash: () => assert.fail('obsolete request'), setParticipantStatus: () => assert.fail('obsolete request')
  });
  const run = h.refreshNow('avvio');
  h.state.mode = 'week';
  const current = h.beginParticipantRequest();
  timeout(); await run;
  assert.equal(h.isCurrentParticipantRequest(current), true);
});

test('anchoring calendar dates does not drop the authenticated identity guard', async () => {
  let h;
  h = residentReopenHarness({ overrides: {
    anchorCalendarToCenterToday: () => { h.user.uid = 'different-user'; return true; },
    scheduleBackgroundRefresh() {}
  } });
  await h.run();
  assert.equal(h.state.participantWeek.length, 0);
});

test('direct summary preserves public-token entry and restores resident entry without a public token', () => {
  const { isFriendlyResidentRoute: route } = functions(['isFriendlyResidentRoute'], { URLSearchParams });
  assert.equal(route('summary', '?view=summary'), true);
  assert.equal(route('summary', '?view=summary&t=public_token'), false);
  assert.equal(route('summary', '?view=summary&t=public_token&access=friendly'), true);
  assert.equal(route('admin', '?view=admin'), false);
  assert.equal(route('kitchen', '?view=kitchen'), false);
});

test('summary requires health/diets but not accessory reads; late results update the payload', async () => {
  const operation = deferred(), note = deferred(), health = deferred();
  const updates = [];
  const h = functions(['startOptionalOperationalRead', 'loadSummaryDayPayload'], {
    OPTIONAL_OPERATIONAL_READ_TIMEOUT_MS: 4000,
    window: { setTimeout: () => 1, clearTimeout() {} }, formatDateId: () => '2026-11-02',
    loadDailyOperation: () => operation.promise, loadKitchenNote: () => note.promise,
    loadDailyHealth: () => health.promise, loadParticipantDaySummaries: async () => ['meal'],
    applyDailyDietsToSummary: (meals, diets) => { assert.deepEqual(diets, ['diet']); return meals; },
    reportOptionalOperationalRead() {}, console
  });
  let loaded = false;
  const run = h.loadSummaryDayPayload(new Date(), { onLateUpdate: p => updates.push({ ...p }) });
  run.then(() => { loaded = true; });
  await turn(); assert.equal(loaded, false);
  health.resolve({ dietAssignments: ['diet'] });
  const payload = await run;
  assert.deepEqual(payload.meals, ['meal']); assert.equal(payload.degraded, true);
  operation.resolve({ mass: true }); await turn();
  assert.deepEqual(payload.dailyOperation, { mass: true });
  note.resolve({ text: 'note' }); await turn();
  assert.equal(payload.notes[0].text, 'note'); assert.equal(payload.degraded, false);
  assert.equal(updates.length, 2);
});

for (const mode of ['summary', 'kitchen']) {
  test(`${mode}: failed matrix import exposes retry; retry mounts without reloading data`, async () => {
    let retry, attempts = 0, mounted = 0;
    const container = { isConnected: true, dataset: {}, innerHTML: '', querySelector: () => ({ addEventListener: (_, fn) => { retry = fn; } }) };
    const state = { mode, participantRequestVersion: 1, kitchenRequestVersion: 1 };
    const h = functions(['mountSummaryMatrix'], { state, t: k => k, escapeHtml: s => s,
      loadDomainModule: async () => { if (++attempts === 1) throw Error('network'); return { mountSummaryMatrix: () => mounted++ }; }
    });
    h.mountSummaryMatrix(container, {}); await turn();
    assert.match(container.innerHTML, /data-matrix-retry/);
    retry(); await turn();
    assert.equal(attempts, 2); assert.equal(mounted, 1);
  });
}

test('obsolete matrix failure does not replace a newer render', async () => {
  const pending = deferred();
  const container = { isConnected: true, dataset: {}, innerHTML: 'new' };
  const state = { mode: 'summary', participantRequestVersion: 1 };
  const h = functions(['mountSummaryMatrix'], { state, loadDomainModule: () => pending.promise });
  h.mountSummaryMatrix(container, {});
  state.participantRequestVersion++;
  pending.reject(Error('offline')); await turn();
  assert.equal(container.innerHTML, 'new');
});
