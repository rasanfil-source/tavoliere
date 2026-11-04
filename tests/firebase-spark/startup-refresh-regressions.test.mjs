import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { residentReopenHarness } from '../helpers/resident-reopen.mjs';

for (const mode of ['summary', 'week', 'participant']) {
  test(`${mode}: a stalled refresh releases the lock and allows retry without clearing identity`, async () => {
    let timeout;
    let complete;
    let renders = 0;
    let calls = 0;
    const state = { mode, participantRequestVersion: 1, residentReady: true,
      selectedParticipant: { participantId: 'person' }, participantWeek: [], participantMonth: [] };
    const h = functions(['refreshNow'], {
      state, SUMMARY_STARTUP_LOAD_TIMEOUT_MS: 5000,
      window: { setTimeout: fn => { timeout = fn; return 1; }, clearTimeout() {} },
      buildRefreshContextKey: () => mode, calendarLoadContextKey: () => mode,
      isCurrentParticipantRequest: request => request.version === state.participantRequestVersion,
      performRefresh: (_, operation) => { operation.request = { mode, version: state.participantRequestVersion }; calls++; return calls === 1 ? new Promise(resolve => { complete = resolve; }) : Promise.resolve(); },
      hideStartupSplash() {}, t: key => key, renderMode() {},
      renderTodayOverview: () => renders++, renderCalendarPlaceholder: () => renders++,
      setParticipantStatus() {}
    });
    const first = h.refreshNow('avvio');
    timeout();
    await first;
    assert.equal(state.refreshInFlight, false);
    assert.equal(state.participantRequestVersion, 2);
    assert.equal(renders, 1);
    assert.equal(state.residentReady, true);
    assert.equal(state.selectedParticipant.participantId, 'person');
    await h.refreshNow('manuale');
    assert.equal(calls, 2);
    complete();
    await Promise.resolve();
    assert.equal(state.refreshInFlight, false);
  });
}

test('session renewal binds the calendar to the returned identity and publishes it', async () => {
  let h;
  h = residentReopenHarness({ overrides: {
    ensureStoredResidentSession: async () => {
      h.user.uid = 'renewed-session';
      return h.user;
    }
  } });
  h.state.residentReady = true;
  h.state.selectedParticipant = { participantId: 'person', signature: 'AA' };
  await h.run();
  assert.equal(h.state.residentReady, true);
  assert.equal(h.state.participantWeek.length, 7);
  assert.equal(h.state.personalCalendarScope.uid, 'renewed-session');
});

test('session renewal cannot revive a request invalidated by navigation', async () => {
  let h;
  h = residentReopenHarness({ overrides: {
    ensureStoredResidentSession: async () => {
      h.state.participantRequestVersion++;
      h.user.uid = 'renewed-session';
      return h.user;
    }
  } });
  h.state.residentReady = true;
  h.state.selectedParticipant = { participantId: 'person', signature: 'AA' };
  await h.run();
  assert.equal(h.state.participantWeek.length, 0);
});

test('a timed out refresh preserves a calendar already on screen', async () => {
  let timeout;
  const state = { mode: 'week', participantRequestVersion: 1, participantWeek: [{}] };
  const h = functions(['refreshNow'], {
    state, window: { setTimeout: fn => { timeout = fn; return 1; }, clearTimeout() {} },
    buildRefreshContextKey: () => 'week', calendarLoadContextKey: () => 'week',
    isCurrentParticipantRequest: () => true,
    performRefresh: (_, operation) => { operation.request = { mode: 'week' }; return new Promise(() => {}); }, hideStartupSplash() {}, t: key => key,
    renderCalendarPlaceholder: () => assert.fail('Visible calendar must remain'), setParticipantStatus() {}
  });
  const pending = h.refreshNow('timer');
  timeout();
  await pending;
  assert.equal(state.participantWeek.length, 1);
  assert.equal(state.refreshInFlight, false);
});
