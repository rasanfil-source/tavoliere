import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

for (const locale of ['it', 'en', 'es', 'fr', 'de', 'ca']) {
  test(`protected deletion messages cover each role in ${locale}`, async () => {
    const catalog = JSON.parse(await readFile(new URL(`../../prototypes/firebase-spark-pwa/public/i18n/${locale}.json`, import.meta.url)));
    let canManage = true;
    const state = { adminRole: 'OWNER' };
    const h = functions(['participantDeletionErrorMessage'], {
      state, CAPABILITIES: { MANAGE_ADMINS: 'admins' }, hasCurrentCapability: () => canManage,
      t: key => { assert.ok(catalog[key], key); return catalog[key]; }, friendlyErrorMessage: (_, fallback) => fallback
    });
    assert.equal(h.participantDeletionErrorMessage({ deletionProtection: 'owner' }), catalog['admin.people.protectedOwner']);
    assert.equal(h.participantDeletionErrorMessage({ deletionProtection: 'admin' }), catalog['admin.people.protectedAdmin']);
    canManage = false;
    assert.equal(h.participantDeletionErrorMessage({ deletionProtection: 'owner' }), catalog['admin.people.protectedVice']);
    assert.equal(h.participantDeletionErrorMessage({ deletionProtection: 'admin' }), catalog['admin.people.protectedVice']);
    assert.equal(h.participantDeletionErrorMessage({ deletionProtection: 'unavailable' }), catalog['admin.people.protectionUnavailable']);
  });
}

test('deletion index carries only minimal membership information and updates the concurrency guard', async () => {
  const writes = new Map();
  const h = await loadBrowserModule('administrator-deletion-protection.js', {
    db: {}, doc: (_, ...path) => path.join('/'), serverTimestamp: () => 'now'
  }, ['writeAdministratorDeletionProtection']);
  h.writeAdministratorDeletionProtection({ set: (ref, data) => writes.set(ref, data) }, 'center', 'account', {
    participantId: 'person', role: 'ADMIN', status: 'ACTIVE', email: 'private@example.test', password: 'secret'
  });
  assert.deepEqual(writes.get('centers/center/administratorDeletionProtection/account'), {
    participantId: 'person', role: 'ADMIN', status: 'ACTIVE', updatedAt: 'now'
  });
  assert.ok(writes.has('centers/center/participantMetadata/administratorProtection'));
});
