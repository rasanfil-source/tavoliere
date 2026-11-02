import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';

for (const readyState of ['loading', 'interactive', 'complete']) {
  test(`service worker registers when application starts with document ${readyState}`, async () => {
    const calls = [];
    let onLoad;
    const h = functions(['registerServiceWorker'], {
      document: { readyState },
      window: { addEventListener: (name, fn, options) => {
        assert.equal(name, 'load'); assert.equal(options.once, true); onLoad = fn;
      } },
      navigator: { serviceWorker: { register: async (url, options) => {
        calls.push([url, options.updateViaCache]);
        return { update: async () => calls.push('update') };
      } } }
    });
    h.registerServiceWorker();
    if (readyState !== 'complete') {
      assert.deepEqual(calls, []);
      onLoad();
    } else assert.equal(onLoad, undefined);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, [['/sw.js', 'none'], 'update']);
  });
}

for (const failure of ['sync', 'async', 'update']) {
  test(`service worker ${failure} failure does not reject application startup`, async () => {
    const h = functions(['registerServiceWorker'], {
      document: { readyState: 'complete' }, window: {},
      navigator: { serviceWorker: { register: () => {
        if (failure === 'sync') throw Error('restricted');
        if (failure === 'async') return Promise.reject(Error('restricted'));
        return Promise.resolve({ update: () => Promise.reject(Error('offline')) });
      } } }
    });
    assert.doesNotThrow(() => h.registerServiceWorker());
    await new Promise(resolve => setImmediate(resolve));
  });
}
