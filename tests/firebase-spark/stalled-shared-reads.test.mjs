import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

const turn = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

for (const [file, exported, invoke, snapshot] of [
  ['participant-data.js', 'getMealTypes', api => api.getMealTypes(), name => ({
    metadata: { fromCache: false, hasPendingWrites: false },
    docs: [{ id: 'lunch', data: () => ({ label: name, status: 'ACTIVE' }) }]
  })],
  ['kitchen-data.js', 'getActiveMealTypes', api => api.getActiveMealTypes(), name => ({
    docs: [{ id: 'lunch', data: () => ({ label: name, status: 'ACTIVE' }) }]
  })],
  ['kitchen-data.js', 'getRules', api => api.getRules(), name => ({
    docs: [{ id: 'rule', data: () => ({ label: name }) }]
  })],
  ['center-settings.js', 'loadCenterCalendarSettings', api => api.loadCenterCalendarSettings(), name => ({
    metadata: { fromCache: false, hasPendingWrites: false }, exists: () => true,
    data: () => ({ timezone: name })
  })]
]) {
  test(`${file}/${exported}: stalled shared read can be replaced; old data cannot overwrite the new cache`, async () => {
    let now = 0;
    const reads = [];
    const read = () => { const pending = deferred(); reads.push(pending); return pending.promise; };
    const api = await loadBrowserModule(file, {
      Date: { now: () => now }, db: {}, getActiveCenterId: () => 'center', getCurrentUser: () => ({ uid: 'resident' }),
      collection: () => ({}), doc: () => ({}), getDocs: read, getDocFromServer: read,
      normalizeReservationCutoffs: value => value
    }, [exported]);
    const first = invoke(api), shared = invoke(api);
    await turn(); assert.equal(reads.length, 1);
    now = 20001;
    const replacement = invoke(api);
    await turn(); assert.equal(reads.length, 2);
    reads[1].resolve(snapshot('new'));
    const current = await replacement;
    reads[0].resolve(snapshot('old'));
    await Promise.all([first, shared]);
    assert.deepEqual(await invoke(api), current);
    assert.equal(reads.length, 2);
  });
}
