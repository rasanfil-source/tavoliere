import assert from 'node:assert/strict';
import test from 'node:test';
import { residentReopenHarness } from '../helpers/resident-reopen.mjs';
import { functions } from '../helpers/app-functions.mjs';

test('restoring personal week preferences completes the first calendar without a manual refresh', async () => {
  let h, changed = false;
  h = residentReopenHarness({ overrides: {
    renderMode() {
      if (!changed && h.state.residentReady) {
        changed = true;
        // renderMode switches from the guest week to the identified person's preference.
        h.state.weekStartDate = new Date(2026, 9, 11, 12);
      }
    }
  } });
  await h.run();
  assert.equal(h.state.participantWeek.length, 7);
  assert.equal(h.state.participantWeek[0].date, '2026-10-11');
  assert.ok(h.names().includes('usable'));
});

test('a delayed date alignment schedules recovery, but a newer navigation does not', async () => {
  for (const superseded of [false, true]) {
    let h, scheduled = 0, changed = false;
    h = residentReopenHarness({ read: async (name, value) => {
      if (name === 'settings' && !changed) {
        changed = true;
        h.state.weekStartDate = new Date(2026, 9, 11, 12);
        if (superseded) h.state.participantRequestVersion++;
      }
      return value;
    }, overrides: { scheduleBackgroundRefresh: () => scheduled++ } });
    await h.run();
    assert.equal(scheduled, superseded ? 0 : 1);
    assert.equal(h.state.participantWeek.length, 0);
  }
});

test('installed app reopening applies the personal view after identification', async () => {
  for (const installed of [false, true]) {
    let h;
    h = residentReopenHarness({ mode: 'participant', overrides: {
      isInstalledPersonalAppLaunch: () => installed,
      applyResidentEntryView: () => {
        assert.equal(h.state.residentReady, true);
        h.state.mode = 'week';
        h.state.participantRequestVersion++;
        return true;
      }
    } });
    await h.run();
    assert.equal(h.state.mode, installed ? 'week' : 'participant');
    assert.equal(installed ? h.state.participantWeek.length : h.state.participantMonth.length, installed ? 7 : 31);
    assert.ok(h.names().includes('usable'));
  }
});

test('only an installed launch overrides the URL, not browser reload or history navigation', () => {
  for (const display of ['browser', 'standalone', 'window-controls-overlay', 'ios']) {
    for (const type of ['navigate', 'reload', 'back_forward']) {
      const { isInstalledPersonalAppLaunch } = functions(['isInstalledPersonalAppLaunch'], {
        window: { matchMedia: query => ({ matches: query === `(display-mode: ${display})` }),
          navigator: { standalone: display === 'ios' },
          performance: { getEntriesByType: () => [{ type }] } }
      });
      assert.equal(isInstalledPersonalAppLaunch(), display !== 'browser' && type === 'navigate');
    }
  }
});
