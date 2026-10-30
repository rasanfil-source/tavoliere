import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { formatDateId } from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';

function setup(overrides = {}, hidden = false) {
  const calls = [];
  const state = {
    mode: 'week', residentReady: true, residentRestorePending: false,
    participantWeek: [], participantMonth: [], nextRefreshAt: Date.now() + 3600000,
    operationalDataDateByMode: { summary: '', kitchen: '' },
    ...overrides
  };
  const app = functions(['refreshCalendarOnResume'], {
    state, document: { hidden }, formatDateId,
    getCenterToday: () => new Date('2026-10-30T12:00:00Z'),
    scheduleBackgroundRefresh: source => calls.push(source)
  });
  app.refreshCalendarOnResume();
  return calls;
}

test('reopening an empty personal calendar refreshes before the timer expires', () => {
  assert.deepEqual(setup(), ['ripresa']);
  assert.deepEqual(setup({ mode: 'participant' }), ['ripresa']);
  assert.deepEqual(setup({ residentReady: false, residentRestorePending: true }), ['ripresa']);
});

test('resume preserves the refresh schedule for populated calendars and login', () => {
  assert.deepEqual(setup({ participantWeek: [{ date: '2026-10-18' }] }), []);
  assert.deepEqual(setup({ residentReady: false }), []);
  assert.deepEqual(setup({ mode: 'summary' }), []);
  assert.deepEqual(setup({ mode: 'summary', operationalDataDateByMode: { summary: '2026-10-30' } }), []);
  assert.deepEqual(setup({ mode: 'summary', operationalDataDateByMode: { summary: '2026-10-29' } }), ['cambio-giorno']);
  assert.deepEqual(setup({ mode: 'kitchen', operationalDataDateByMode: { kitchen: '2026-10-29' } }), ['cambio-giorno']);
  assert.deepEqual(setup({}, true), []);
});

test('resume still refreshes expired data', () => {
  assert.deepEqual(setup({ nextRefreshAt: 0, participantWeek: [{}] }), ['ripresa']);
});
