import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { functions } from '../helpers/app-functions.mjs';
import * as roles from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

const person = id => ({ participantId: id, displayName: id, groupId: 'group_residenti' });

async function healthHarness(people) {
  let saved;
  const module = await loadBrowserModule('daily-operations.js', {
    db: {}, getActiveCenterId: () => 'center', formatDateId: () => '2026-10-17',
    doc: () => 'health', serverTimestamp: () => 1,
    runTransaction: async (_, operation) => operation({
      get: async () => ({ exists: () => true, data: () => ({ sickPeople: people, invitedMeals: { lunch: 2 } }) }),
      set: (_, value) => { saved = value; }
    })
  }, ['saveSickPeople']);
  return { module, saved: () => saved };
}

test('removing sick people works without a cache or explicit baseline', async () => {
  const h = await healthHarness([person('a'), person('b')]);
  const result = await h.module.saveSickPeople(new Date(), [person('b')]);
  assert.deepEqual(h.saved().sickPeople.map(p => p.participantId), ['b']);
  assert.equal(result.invitedMeals.lunch, 2);
});

test('an explicit health baseline preserves another operator additions', async () => {
  const h = await healthHarness([person('a'), person('b')]);
  await h.module.saveSickPeople(new Date(), [], { previousPeople: [person('a')] });
  assert.deepEqual(h.saved().sickPeople.map(p => p.participantId), ['b']);
});

test('plural fallback works in a browser before catalogs load and for many', async () => {
  const source = (await readFile(new URL('../../prototypes/firebase-spark-pwa/public/i18n/i18n.mjs', import.meta.url), 'utf8'))
    .replace(/^export /gm, '').replaceAll('import.meta.url', "'https://example.test/i18n/i18n.mjs'");
  const context = vm.createContext({ URL, Intl, console });
  vm.runInContext(source + '\n globalThis.translate = t;', context);
  assert.equal(context.translate('summary.cover', { count: 1 }), 'coperto');
  assert.equal(context.translate('summary.cover', { count: 1000000 }), 'coperti');
});

test('password toggle uses translations and updates keys for subsequent language switches', () => {
  const attrs = new Map();
  const toggle = { setAttribute: (key, value) => attrs.set(key, value) };
  const input = { type: 'password' };
  const { togglePasswordVisibility } = functions(['togglePasswordVisibility'], { t: key => 'translated:' + key });
  togglePasswordVisibility(input, toggle);
  assert.equal(input.type, 'text');
  assert.equal(toggle.textContent, 'translated:auth.resident.password.hide');
  assert.equal(attrs.get('data-i18n-aria-label'), 'auth.resident.password.hide');
  togglePasswordVisibility(input, toggle);
  assert.equal(input.type, 'password');
  assert.equal(attrs.get('data-i18n'), 'auth.resident.password.show');
});

test('linking a new owner repairs a stale administrator navigation profile in the same batch', async () => {
  const writes = new Map();
  let committed = false;
  const module = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, getActiveCenterId: () => 'center',
    doc: (_, ...parts) => parts.join('/'),
    getDoc: async path => ({ exists: () => true, data: () => path.includes('/admins/')
      ? { status: 'ACTIVE', role: 'OWNER' }
      : { status: 'ACTIVE', role: 'ADMIN', centerId: 'previous' } }),
    arrayUnion: value => ({ union: value }), serverTimestamp: () => 1,
    writeBatch: () => ({ update: (path, value) => writes.set(path, value), commit: async () => { committed = true; } })
  }, ['linkCurrentAdministratorParticipant']);
  await module.linkCurrentAdministratorParticipant('person', { uid: 'owner', isAnonymous: false });
  assert.equal(committed, true);
  const profile = writes.get('adminProfiles/owner');
  assert.equal(profile.role, 'OWNER');
  assert.equal(profile.centerId, 'center');
  assert.equal(profile.participantId, 'person');
  assert.deepEqual(profile.centerIds, { union: 'center' });
});
