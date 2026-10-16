import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { setImmediate as turn } from 'node:timers/promises';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

const source = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/participant-data.js', import.meta.url), 'utf8');
const restore = source.match(/async function restoreFriendlyResidentSession\([^]*?\n}/)[0];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function harness({ profileLoader, initialUser = { uid: 'restored-uid', isAnonymous: true }, sessionUid = 'restored-uid' } = {}) {
  const auth = deferred(), session = deferred(), profile = deferred();
  const events = [];
  const context = vm.createContext({
    loadStoredResidentSignature: () => 'AA', loadStoredResidentParticipantId: () => 'person',
    loadStoredResidentToken: () => ({ tokenId: 'token', expiresAt: '2050-01-01' }),
    waitForAuthReady: () => auth.promise, getStrongAuthenticatedUser: () => null,
    getCurrentUser: () => initialUser,
    getAuthorizedAdministratorUser: async () => null,
    ensurePersonalSession: () => { events.push('session'); return session.promise.then(() => ({ uid: sessionUid })); },
    loadPublicParticipantById: () => { events.push('profile'); return profileLoader ? profileLoader() : profile.promise; },
    normalizeResidentSignature: value => value,
    rememberResidentIdentity: () => events.push('remember'),
    isRecoverableSessionError: error => error.code === 'unavailable',
    clearStoredResidentIdentity: () => events.push('clear'), clearCurrentSession() {},
    signOutCurrentUser: async () => events.push('signout')
  });
  vm.runInContext(restore, context);
  return { auth, session, profile, events, restore: context.restoreFriendlyResidentSession };
}

test('profile overlaps session after Auth; settings and identity publication still wait for session', async () => {
  const h = harness();
  const pending = h.restore({ onSessionReady: (identity) => {
    assert.equal(identity.participantId, 'person');
    assert.equal(identity.uid, 'restored-uid');
    h.events.push('settings');
  } });
  await turn();
  assert.deepEqual(h.events, []);
  h.auth.resolve(); await turn();
  assert.deepEqual(h.events, ['profile', 'session']);
  h.session.resolve(); await turn();
  assert.ok(h.events.includes('settings'));
  assert.ok(h.events.includes('profile'));
  assert.ok(!h.events.includes('remember'), 'profile is still pending; no identity is published');
  h.profile.resolve({ participantId: 'person', signature: 'AA' });
  assert.equal((await pending).participant.participantId, 'person');
  assert.ok(!h.events.includes('signout'));
});

test('failed session does not start protected preparation or clear persistent identity', async () => {
  const h = harness();
  const pending = h.restore({ onSessionReady: () => h.events.push('settings') });
  const rejected = assert.rejects(pending, error => error.preserveResidentIdentity === true);
  h.auth.resolve(); await turn();
  h.session.reject(Object.assign(new Error('network'), { code: 'unavailable' }));
  await rejected;
  assert.deepEqual(h.events, ['profile', 'session']);
});

test('completed profile cannot publish identity before the session is checked', async () => {
  const h = harness();
  const pending = h.restore();
  h.auth.resolve(); h.profile.resolve({ participantId: 'person', signature: 'AA' });
  await turn();
  assert.ok(!h.events.includes('remember'));
  h.session.resolve();
  assert.equal((await pending).participant.participantId, 'person');
});

for (const code of ['permission-denied', 'firestore/permission-denied']) {
  test(`speculative ${code} retries only after session recovery`, async () => {
    let reads = 0;
    const h = harness({ profileLoader: async () => {
      if (++reads === 1) throw Object.assign(new Error('missing session'), { code });
      return { participantId: 'person', signature: 'AA' };
    } });
    const pending = h.restore(); h.auth.resolve(); await turn();
    assert.equal(reads, 1);
    h.session.resolve();
    assert.equal((await pending).participant.participantId, 'person');
    assert.equal(reads, 2);
    assert.ok(!h.events.includes('signout'));
  });
}

test('a replaced Auth identity discards the old profile, even if it was valid', async () => {
  let reads = 0;
  const h = harness({ sessionUid: 'new-uid', profileLoader: async () => {
    reads++;
    return reads === 1 ? { participantId: 'person', signature: 'AA' } : null;
  } });
  const pending = h.restore(); h.auth.resolve(); await turn(); h.session.resolve();
  assert.equal(await pending, null);
  assert.equal(reads, 2);
  assert.ok(h.events.includes('signout'));
  assert.ok(!h.events.includes('remember'));
});

test('without an existing anonymous identity the profile waits for session creation', async () => {
  const h = harness({ initialUser: null });
  const pending = h.restore(); h.auth.resolve(); await turn();
  assert.deepEqual(h.events, ['session']);
  h.session.resolve(); h.profile.resolve({ participantId: 'person', signature: 'AA' });
  assert.equal((await pending).participant.participantId, 'person');
});

test('network failure of speculative profile preserves credentials and does not retry', async () => {
  const h = harness();
  const pending = h.restore();
  const rejected = assert.rejects(pending, error => error.preserveResidentIdentity === true);
  h.auth.resolve(); await turn();
  h.profile.reject(Object.assign(new Error('offline'), { code: 'unavailable' }));
  await turn(); h.session.resolve(); await rejected;
  assert.equal(h.events.filter(event => event === 'profile').length, 1);
  assert.ok(!h.events.includes('clear'));
});

test('optional preload failure cannot sign out the resident', async () => {
  const h = harness();
  const pending = h.restore({ onSessionReady: async () => { throw new Error('preload'); } });
  h.auth.resolve(); h.session.resolve();
  await turn();
  h.profile.resolve({ participantId: 'person', signature: 'AA' });
  assert.equal((await pending).participant.participantId, 'person');
  assert.ok(!h.events.includes('clear'));
  assert.ok(!h.events.includes('signout'));
});

test('preparation and calendar share one server-confirmed settings read', async () => {
  const read = deferred();
  let count = 0;
  const { loadCenterCalendarSettings } = await loadBrowserModule('center-settings.js', {
    db: {}, getActiveCenterId: () => 'center', doc: (...parts) => parts,
    getDocFromServer: () => { count++; return read.promise; },
    measureStartupStep: (_, operation) => operation(), normalizeReservationCutoffs: value => value
  }, ['loadCenterCalendarSettings']);
  const preparation = loadCenterCalendarSettings();
  const calendar = loadCenterCalendarSettings();
  assert.equal(count, 1);
  read.resolve({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => true,
    data: () => ({ timezone: 'Europe/Rome', reservationCutoffs: { lunch: '10:00' } }) });
  assert.deepEqual(await preparation, await calendar);
  await loadCenterCalendarSettings();
  assert.equal(count, 1);
});

test('administrative activation retains its transaction and invalidates resident caches only after commit', async () => {
  const writes = [], invalidations = [], commit = deferred();
  const { setAdminParticipantActiveStatus } = await loadBrowserModule('admin-participant-data.js', {
    db: {}, getActiveCenterId: () => 'center', doc: (_, ...parts) => parts.join('/'),
    serverTimestamp: () => 'timestamp', normalizeRevision: value => value,
    assertCurrentRevision: (actual, expected) => { assert.equal(actual, expected); return actual; },
    nextRevision: value => value + 1, appendAuditEvent: () => writes.push('audit'), AUDIT_ACTIONS: {},
    runTransaction: async (_, operation) => {
      await operation({ get: async () => ({ exists: () => true, data: () => ({ revision: 2 }) }),
        update: (...args) => writes.push(args), set: (...args) => writes.push(args) });
      await commit.promise;
    },
    invalidateParticipantDataCaches: id => invalidations.push(id),
    invalidateCenterContactSettingsCache: () => invalidations.push('settings')
  }, ['setAdminParticipantActiveStatus']);
  const pending = setAdminParticipantActiveStatus('person', true, 2);
  await turn();
  assert.equal(invalidations.length, 0);
  assert.equal(writes.filter(Array.isArray).length, 4);
  commit.resolve();
  assert.deepEqual(await pending, { participantId: 'person', status: 'ACTIVE', revision: 3 });
  assert.deepEqual(invalidations, ['person', 'settings']);
});

test('optional module loading shares work and releases a failed attempt for retry', async () => {
  const app = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url), 'utf8');
  const loader = app.match(/function loadDomainModule\([^]*?\n}/)[0];
  let attempts = 0;
  const module = {};
  const context = vm.createContext({ domainModuleLoads: new Map(), domainModuleLoaders: {
    admin: async () => { if (++attempts === 1) throw new Error('network'); return module; }
  } });
  vm.runInContext(loader, context);
  const first = context.loadDomainModule('admin');
  assert.equal(context.loadDomainModule('admin'), first);
  await assert.rejects(first, /network/);
  assert.equal(await context.loadDomainModule('admin'), module);
  assert.equal(await context.loadDomainModule('admin'), module);
  assert.equal(attempts, 2);
});
