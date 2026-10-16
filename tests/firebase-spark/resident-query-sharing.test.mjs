import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const snapshot = (value = 'current', fromCache = false) => ({
  metadata: { fromCache, hasPendingWrites: false },
  exists: () => true, id: 'rule_person', data: () => ({ value }),
  docs: [{ id: 'window', data: () => ({ value }) }]
});

async function harness() {
  const scope = { uid: 'user', centerId: 'center' }, reads = [];
  const read = source => ref => {
    const pending = deferred(); reads.push({ source, ref, ...pending }); return pending.promise;
  };
  const api = await loadBrowserModule('participant-data.js', {
    db: {}, getCurrentUser: () => ({ uid: scope.uid }), getActiveCenterId: () => scope.centerId,
    doc: (_, ...parts) => parts, collection: (_, ...parts) => parts,
    query: (...parts) => parts, where: (...parts) => parts,
    getDoc: read('default'), getDocs: read('default'),
    getDocFromServer: read('server'), getDocsFromServer: read('server')
  }, ['getParticipantRules', 'getMealWindowsInRange', 'invalidateParticipantDataCaches']);
  return { scope, reads, ...api };
}

for (const kind of ['rule', 'windows']) {
  const request = (h, force = false, server = true, id = 'person') => kind === 'rule'
    ? h.getParticipantRules(id, force, server)
    : h.getMealWindowsInRange(id === 'person' ? '2026-10-12' : '2026-10-13', '2026-10-18', force, server);

  test(`${kind}: concurrent identical reads share I/O and server provenance`, async () => {
    const h = await harness();
    const first = request(h), second = request(h); await turn();
    assert.equal(h.reads.length, 1);
    h.reads[0].resolve(snapshot());
    const [a, b] = await Promise.all([first, second]);
    assert.equal(a, b); assert.equal(a.serverConfirmed, true);
    assert.equal(await request(h), a);
    assert.equal(h.reads.length, 1);
  });

  test(`${kind}: failure releases the shared read for retry`, async () => {
    const h = await harness();
    const attempts = [request(h), request(h)];
    const checked = attempts.map(p => assert.rejects(p, /offline/));
    await turn(); assert.equal(h.reads.length, 1);
    h.reads[0].reject(new Error('offline')); await Promise.all(checked);
    const retry = request(h); await turn(); assert.equal(h.reads.length, 2);
    h.reads[1].resolve(snapshot()); await retry;
  });

  test(`${kind}: center, UID, range/person, server requirement and manual refresh isolate in-flight reads`, async () => {
    for (const change of ['center', 'uid', 'target', 'source', 'manual']) {
      const h = await harness();
      const first = request(h);
      if (change === 'center') h.scope.centerId = 'other';
      if (change === 'uid') h.scope.uid = 'other';
      const second = request(h, change === 'manual', change !== 'source', change === 'target' ? 'other' : 'person');
      await turn(); assert.equal(h.reads.length, 2, change);
      h.reads.forEach(read => read.resolve(snapshot()));
      await Promise.all([first, second]);
    }
  });

  test(`${kind}: a shared server read still rejects unconfirmed data`, async () => {
    const h = await harness();
    const checked = [request(h), request(h)].map(p => assert.rejects(p, error => error.code === 'unavailable'));
    await turn(); h.reads[0].resolve(snapshot('cached', true)); await Promise.all(checked);
  });
}

test('admin invalidation separates rule reads and prevents a late old read from repopulating the cache', async () => {
  const h = await harness();
  const old = h.getParticipantRules('person', false, true); await turn();
  h.invalidateParticipantDataCaches('person');
  const fresh = h.getParticipantRules('person', false, true); await turn();
  assert.equal(h.reads.length, 2);
  h.reads[1].resolve(snapshot('new')); await fresh;
  h.reads[0].resolve(snapshot('old')); await old;
  const current = await h.getParticipantRules('person', false, true);
  assert.equal(current[0].value, 'new'); assert.equal(h.reads.length, 2);
});
