import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { residentReopenHarness } from '../helpers/resident-reopen.mjs';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

for (const mode of ['week', 'participant']) {
  test(`${mode}: Auth gates profile/session; session gates meals; publication waits for all essential data`, async () => {
    const gates = Object.fromEntries(['auth', 'session', 'profile', 'settings', 'overrides', 'extras']
      .map(key => [key, deferred()]));
    const h = residentReopenHarness({ mode, read: async (name, value) => {
      if (gates[name]) await gates[name].promise;
      return value;
    } });
    const pending = h.run();
    await turn();
    assert.deepEqual(h.names(), ['auth']);
    gates.auth.resolve(); await turn();
    assert.deepEqual(h.names(), ['auth', 'profile', 'session']);
    gates.session.resolve(); await turn();
    for (const name of ['profile', 'settings', 'mealTypes', 'mealWindows', 'overrides', 'rule']) {
      assert.ok(h.names().includes(name), name);
    }
    assert.equal(h.state.selectedParticipant, undefined);
    assert.ok(!h.names().includes('usable'));
    gates.settings.resolve(); gates.overrides.resolve(); await turn();
    assert.ok(!h.names().includes('usable'), 'unverified profile cannot enable the calendar');
    gates.profile.resolve();
    await pending;
    const days = mode === 'week' ? h.state.participantWeek : h.state.participantMonth;
    assert.equal(days.length, mode === 'week' ? 7 : 31);
    assert.equal(days.flatMap(day => day.meals).length, days.length * 3);
    assert.equal(days[0].meals[0].effect, 'ABSENT');
    assert.equal(days[0].meals[1].effect, 'PRESENT');
    assert.equal(days[0].meals[1].isOpen, true);
    assert.ok(h.names().includes('usable'), 'accessories are still pending');
    for (const name of ['session', 'profile', 'settings', 'mealTypes', 'mealWindows', 'overrides', 'rule']) {
      assert.equal(h.names().filter(value => value === name).length, 1, `no duplicate ${name}`);
    }
    assert.ok(!h.names().includes('empty-week-label'), 'resident does not construct a discarded week');
    gates.extras.resolve();
  });
}

test('completed profile cannot publish while settings or previous selections are pending', async () => {
  for (const delayed of ['settings', 'overrides']) {
    const gate = deferred();
    const h = residentReopenHarness({ read: async (name, value) => {
      if (name === delayed) await gate.promise;
      return value;
    } });
    const pending = h.run(); await turn();
    assert.ok(h.names().includes('identity'));
    assert.ok(!h.names().includes('usable'));
    gate.resolve(); await pending;
    assert.ok(h.names().includes('usable'));
  }
});

test('missing or mismatching profile cannot publish a prefetched calendar', async () => {
  for (const profile of [null, { participantId: 'person', signature: 'DIFFERENT' }]) {
    const gate = deferred();
    const h = residentReopenHarness({ profile, read: async (name, value) => {
      if (name === 'profile') await gate.promise;
      return value;
    } });
    const pending = h.run(); await turn();
    assert.ok(h.names().includes('overrides'));
    gate.resolve(); await pending;
    assert.ok(h.names().includes('signout'));
    assert.ok(!h.names().includes('usable'));
    assert.ok(!h.names().includes('snapshot'));
  }
});

test('obsolete restoration after identity/route change cannot publish or persist prefetched data', async () => {
  for (const change of ['identity', 'route']) {
    const gate = deferred();
    const h = residentReopenHarness({ read: async (name, value) => {
      if (name === 'profile') await gate.promise;
      return value;
    } });
    const pending = h.run(); await turn();
    if (change === 'identity') h.user.uid = 'other-user';
    else { h.state.mode = 'summary'; h.state.participantRequestVersion++; }
    gate.resolve(); await pending;
    assert.ok(!h.names().includes('usable'));
    assert.ok(!h.names().includes('snapshot'));
    assert.equal(h.state.selectedParticipant, undefined);
  }
});

test('failed calendar prefetch is handled while profile is pending and does not grant access', async () => {
  const profile = deferred();
  const h = residentReopenHarness({ read: async (name, value) => {
    if (name === 'profile') await profile.promise;
    if (name === 'overrides') throw Object.assign(new Error('revoked'), { code: 'permission-denied' });
    return value;
  } });
  const pending = h.run(); await turn();
  profile.resolve(); await pending;
  assert.ok(!h.names().includes('usable'));
  assert.ok(!h.names().includes('snapshot'));
});

test('deadline is checked again after a slow profile before the grid becomes usable', async () => {
  const profile = deferred();
  const originalNow = Date.now;
  try {
    Date.now = () => new Date('2049-12-31T12:00:00Z').getTime();
    const h = residentReopenHarness({ read: async (name, value) => {
      if (name === 'profile') await profile.promise;
      return value;
    } });
    const pending = h.run(); await turn();
    Date.now = () => new Date('2050-01-01T12:00:00Z').getTime();
    profile.resolve(); await pending;
    assert.ok(h.names().includes('usable'));
    assert.ok(h.state.participantWeek.flatMap(day => day.meals).every(meal => !meal.isOpen));
  } finally { Date.now = originalNow; }
});
