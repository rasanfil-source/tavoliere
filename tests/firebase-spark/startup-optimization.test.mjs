import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { functionSource } from '../helpers/app-functions.mjs';
import { createAdminActions } from '../../prototypes/firebase-spark-pwa/public/admin-actions.js';

test('Admin actions import and construction do not evaluate translations or start data reads', async () => {
  const deps = new Proxy({}, { get: (_, name) => {
    if (name === 'hasCurrentCapability') return () => false;
    if (name === 'CAPABILITIES') return {};
    return () => assert.fail('unexpected startup call: ' + String(name));
  } });
  const actions = createAdminActions(deps);
  await actions.handleAdminExport();
  await assert.rejects(actions.prepareCenterAvatar({ type: 'text/plain' }), /immagine/);
});

test('Admin action loader shares one import, retries failure and passes live state without translations', async () => {
  const src = functionSource('loadAdminActions');
  const names = src.match(/module\.createAdminActions\(\{([^]*?)\}\)/)[1].split(',').map(name => name.trim()).filter(Boolean);
  let attempts = 0, constructs = 0;
  const sharedState = { adminRole: 'OWNER' };
  const actions = {};
  const deps = Object.fromEntries(names.map(name => [name, () => assert.fail('unexpected call ' + name)]));
  Object.assign(deps, { state: sharedState, loadModule: async () => {
    attempts++;
    if (attempts === 1) throw new Error('network');
    return { createAdminActions: ctx => { constructs++; assert.equal(ctx.state, sharedState); return actions; } };
  } });
  const context = vm.createContext(deps);
  vm.runInContext('let adminActionsLoad = null;\n' + src.replace("import('./admin-actions.js?v=20261104a')", 'loadModule()'), context);
  await assert.rejects(context.loadAdminActions(), /network/);
  const first = context.loadAdminActions(), second = context.loadAdminActions();
  assert.equal(first, second); assert.equal(await first, actions); assert.equal(attempts, 2); assert.equal(constructs, 1);
});

for (const change of ['none', 'uid', 'center', 'version', 'mode']) {
  test(`deferred Admin action uses current shared state; context change ${change} discards it`, async () => {
    let release; const pending = new Promise(resolve => { release = resolve; });
    const state = { adminHydrationVersion: 1, mode: 'admin' }, context = { uid: 'user', center: 'center' }, calls = [];
    const deps = { state, getCurrentUser: () => ({ uid: context.uid }), getActiveCenterId: () => context.center,
      loadAdminActions: () => pending, elements: { adminStatus: {} }, friendlyErrorMessage: e => e.message, t: key => key };
    const run = new Function(...Object.keys(deps), functionSource('runAdminAction') + '; return runAdminAction;')(...Object.values(deps));
    const result = run('save', ['argument']);
    if (change === 'version') state.adminHydrationVersion++;
    else if (change === 'mode') state.mode = 'week';
    else if (change !== 'none') context[change] = 'other';
    release({ save: (...args) => calls.push(...args) }); await result;
    assert.deepEqual(calls, change === 'none' ? ['argument'] : []);
  });
}

test('diagnostics are explicitly opt-in and distinguish ready data from splash dismissal', () => {
  const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const app = readFileSync(new URL('app.js', root), 'utf8');
  const diagnostic = readFileSync(new URL('startup-diagnostics.mjs', root), 'utf8');
  assert.match(html, /choice === '1'/);
  assert.match(html, /15 \* 60 \* 1000/);
  assert.match(app, /mark\('splash-hidden'\)/);
  assert.match(app, /mark\('translations-ready'\)/);
  assert.match(app, /mark\('splash-hidden'\)/);
  assert.doesNotMatch(diagnostic, /fetch\(|sendBeacon|localStorage\.setItem|sessionStorage/);
});
