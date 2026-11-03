import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as turn } from 'node:timers/promises';
import test from 'node:test';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const app = readFileSync(new URL('app.js', root), 'utf8');
const participant = readFileSync(new URL('participant-data.js', root), 'utf8');
const extract = (source, name) => source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`))[0];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

async function authHarness() {
  const originalUser = { uid: 'persistent-owner', isAnonymous: false };
  const primary = { currentUser: originalUser };
  const events = [], writes = [], persistences = [];
  const control = { failDelete: null, failedEmails: new Set() };
  const deps = {
    initializeApp: (_, name = 'primary') => ({ name }), getApps: () => [],
    initializeAuth: (app, options) => {
      persistences.push(options.persistence);
      if (app.name === 'primary') { primary.app = app; return primary; }
      return { app, currentUser: null };
    },
    browserLocalPersistence: 'local', inMemoryPersistence: 'memory',
    firestoreSettingsForBrowser: () => ({}), initializeFirestore: app => ({ app }),
    GoogleAuthProvider: class {},
    onAuthStateChanged: (auth, callback) => {
      queueMicrotask(() => callback(auth.currentUser));
      return () => {};
    },
    signInWithEmailAndPassword: async (auth, email) => {
      events.push(`login:${email}`);
      if (control.failedEmails.has(email)) throw Object.assign(new Error('credentials'), { code: 'auth/invalid-credential' });
      auth.currentUser = { uid: 'technical' };
      return { user: auth.currentUser };
    },
    signOut: async auth => { events.push(`logout:${auth.app.name}`); auth.currentUser = null; },
    doc: (db, ...path) => ({ db, path: path.join('/') }),
    deleteDoc: async ref => {
      events.push(`delete:${ref.path}`);
      if (control.failDelete) throw control.failDelete;
    },
    setDoc: async (ref, data) => { events.push(`write:${ref.path}`); writes.push({ ref, data }); },
    Timestamp: { fromDate: date => ({ toDate: () => date }) }, serverTimestamp: () => 'server'
  };
  const api = await loadBrowserModule('firebase-client.js', deps,
    ['withResidentTechnicalSession', 'withAdministratorTechnicalSession', 'authorizeResidentAdministratorSession']);
  return { api, deps, primary, originalUser, events, writes, persistences, control };
}

for (const administrator of [false, true]) {
  test(`invalid ${administrator ? 'administrator' : 'resident'} center cannot trap the next technical login`, { timeout: 1500 }, async () => {
    const h = await authHarness();
    const run = (center, operation) => administrator
      ? h.api.withAdministratorTechnicalSession(center, 'secret', 1, operation)
      : h.api.withResidentTechnicalSession(center, 'secret', operation);
    await assert.rejects(run('invalid/center', () => {}), /Identificativo/);
    await assert.rejects(run('test', () => { throw new Error('operation failed'); }), /operation failed/);
    assert.equal(await run('test', () => 'ok'), 'ok');
    assert.equal(h.primary.currentUser, h.originalUser);
    assert.deepEqual(h.persistences, ['local', 'memory']);
    assert.equal(h.events.filter(event => event.startsWith('logout:')).length, 2);
  });
}

function viceHarness(h, { vice = true, failPersonal = false } = {}) {
  const deps = {
    normalizeResidentSignature: value => value, getActiveCenterId: () => 'test',
    residentLoginError: (message, code) => Object.assign(new Error(message), { code }),
    ensurePublicDemoSession: async () => { h.events.push('public'); },
    loadCenterContactSettings: async () => ({ adminSharedPasswordSet: true, adminPasswordVersion: 1 }),
    getAdministratorTechnicalEmail: (_, version) => version ? 'admin-v1' : 'admin-legacy',
    withAdministratorTechnicalSession: h.api.withAdministratorTechnicalSession,
    loadPublicParticipantBySignature: async () => ({ participantId: 'person', viceAdminRole: vice }),
    createPersonalTokenForParticipant: async () => ({ tokenId: 'token' }),
    createPersonalAnonymousSession: async () => {
      h.events.push('personal');
      if (failPersonal) throw Object.assign(new Error('personal failed'), { code: 'auth/invalid-credential' });
      h.primary.currentUser = { uid: 'personal-uid', isAnonymous: true };
    },
    rememberResidentIdentity: () => h.events.push('remember'),
    db: {}, doc: h.deps.doc, getDoc: async () => ({ exists: () => true, data: () => ({ token: 'link' }) })
  };
  return new Function(...Object.keys(deps), extract(participant, 'signInFriendlyViceAdministrator')
    + '; return signInFriendlyViceAdministrator;')(...Object.values(deps));
}

test('vice login authorizes the final personal UID within one technical login and preserves it after cleanup', async () => {
  const h = await authHarness();
  const result = await viceHarness(h)('AA', 'secret');
  assert.equal(result.administratorAuthorized, true);
  assert.equal(h.events.filter(event => event.startsWith('login:')).length, 1);
  assert.equal(h.events.filter(event => event.startsWith('logout:')).length, 1);
  assert.equal(h.primary.currentUser.uid, 'personal-uid');
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].data.authUid, 'personal-uid');
  assert.equal(h.writes[0].data.participantId, 'person');
  assert.equal(h.writes[0].ref.db.app.name, 'tavola-comune-resident-maintenance');
  assert.ok(h.events.indexOf('personal') < h.events.findIndex(event => event.startsWith('write:')));
  assert.ok(h.events.findIndex(event => event.startsWith('write:')) < h.events.findIndex(event => event.startsWith('logout:')));
});

test('technical email fallback occurs only before credentials have been accepted', async () => {
  const h = await authHarness();
  h.control.failedEmails.add('admin-v1');
  await viceHarness(h)('AA', 'secret');
  assert.deepEqual(h.events.filter(event => event.startsWith('login:')), ['login:admin-v1', 'login:admin-legacy']);
  assert.equal(h.events.filter(event => event === 'personal').length, 1);
});

test('personal-session failure never retries credentials or loses the previous main identity', async () => {
  const h = await authHarness();
  await assert.rejects(viceHarness(h, { failPersonal: true })('AA', 'secret'), /personal failed/);
  assert.equal(h.events.filter(event => event.startsWith('login:')).length, 1);
  assert.equal(h.primary.currentUser, h.originalUser);
  assert.equal(h.writes.length, 0);
  await h.api.withResidentTechnicalSession('test', 'secret', () => {});
});

test('a non-vice cannot replace the primary identity or receive vice authorization', async () => {
  const h = await authHarness();
  await assert.rejects(viceHarness(h, { vice: false })('AA', 'secret'), { code: 'resident/not-vice' });
  assert.equal(h.primary.currentUser, h.originalUser);
  assert.equal(h.writes.length, 0);
  assert.ok(!h.events.includes('personal'));
});

test('failed vice authorization cleans up the technical identity and retains the personal session', async () => {
  const h = await authHarness();
  h.control.failDelete = new Error('network');
  await assert.rejects(viceHarness(h)('AA', 'secret'), /network/);
  assert.equal(h.primary.currentUser.uid, 'personal-uid');
  assert.equal(h.writes.length, 0);
  assert.equal(h.events.filter(event => event.startsWith('logout:')).length, 1);
  await h.api.withResidentTechnicalSession('test', 'secret', () => {});
});

function massHarness(name) {
  const clock = deferred(), save = deferred();
  const state = { mode: 'week', weekStartDate: new Date('2026-11-02'), selectedParticipant: { participantId: 'person' },
    participantWeek: [{ date: '2026-11-03' }], weekDailyOperations: [] };
  const attributes = new Map();
  const button = { disabled: false, dataset: { weekMassDate: '2026-11-03', weekMassScheduled: 'false' },
    getAttribute: key => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key) };
  const calls = [], statuses = [];
  const control = { open: true };
  const deps = { state, canManageMass: () => true, getActiveCenterId: () => 'test',
    getCurrentUser: () => ({ uid: 'personal-uid' }), synchronizeServerClock: () => clock.promise,
    getMassWindowState: () => ({ isOpen: control.open }), formatCutoffLabel: () => 'closed',
    setParticipantStatus: message => statuses.push(message), parseDateId: value => value,
    syncWeekGridFromState: () => { button.disabled = attributes.get('aria-busy') === 'true' || !control.open; },
    friendlyErrorMessage: error => error.message,
    saveMassStatus: (...args) => { calls.push(args); return save.promise; },
    saveMassStatuses: (...args) => { calls.push(args); return save.promise; } };
  const run = new Function(...Object.keys(deps), extract(app, 'setMassStatusInState') + '\n'
    + extract(app, name) + `; return ${name};`)(...Object.values(deps));
  return { state, button, calls, statuses, clock, save, control, run: () => run(button) };
}

for (const name of ['handleWeekMassButton', 'handleWeekMassBulkButton']) {
  test(`${name}: immediately busy, repeated tap ignored, no write before clock verification`, async () => {
    const h = massHarness(name);
    const pending = h.run();
    assert.equal(h.button.disabled, true);
    assert.equal(h.button.getAttribute('aria-busy'), 'true');
    await h.run();
    assert.equal(h.calls.length, 0);
    h.clock.resolve(); await turn();
    assert.equal(h.calls.length, 1);
    h.save.resolve(); await pending;
    assert.equal(h.button.getAttribute('aria-busy'), undefined);
    assert.equal(h.button.disabled, false);
  });
  test(`${name}: expired cutoff is rechecked and busy state clears without saving`, async () => {
    const h = massHarness(name);
    const pending = h.run();
    h.control.open = false;
    h.clock.resolve(); await pending;
    assert.equal(h.calls.length, 0);
    assert.equal(h.button.getAttribute('aria-busy'), undefined);
    assert.equal(h.button.disabled, true);
  });
  test(`${name}: navigation during synchronization cancels the old operation`, async () => {
    const h = massHarness(name);
    const pending = h.run();
    h.state.weekStartDate = new Date('2026-11-09');
    h.clock.resolve(); await pending;
    assert.equal(h.calls.length, 0);
    assert.equal(h.button.getAttribute('aria-busy'), undefined);
    assert.deepEqual(h.statuses, []);
  });
  test(`${name}: late write failure cannot roll back the newly opened week`, async () => {
    const h = massHarness(name);
    const pending = h.run();
    h.clock.resolve(); await turn();
    h.state.weekStartDate = new Date('2026-11-09');
    const nextOperations = [{ dateId: '2026-11-10', massScheduled: true }];
    h.state.weekDailyOperations = nextOperations;
    h.save.reject(new Error('late failure')); await pending;
    assert.equal(h.state.weekDailyOperations, nextOperations);
    assert.ok(!h.statuses.includes('late failure'));
  });
  test(`${name}: clock failure releases the button without a write`, async () => {
    const h = massHarness(name);
    const pending = h.run();
    h.clock.reject(new Error('clock failure')); await pending;
    assert.equal(h.calls.length, 0);
    assert.equal(h.button.getAttribute('aria-busy'), undefined);
    assert.equal(h.button.disabled, false);
  });
}

for (const [strongIdentity, signature] of [[false, ''], [true, ''], [false, 'AA']]) {
  test(`startup waits for persistent Auth; restore is skipped only without identity (strong=${strongIdentity}, signature=${signature})`, async () => {
    const ready = deferred();
    const state = { mode: 'week', friendlyAccess: true, residentReady: false, residentRestorePending: false,
      participantWeek: [], participantMonth: [], participantRequestVersion: 1,
      weekStartDate: new Date('2026-11-02'), monthDate: new Date('2026-11-01') };
    const request = { version: 1, mode: 'week', centerId: 'test', weekStartDate: state.weekStartDate.getTime(),
      monthDate: state.monthDate.getTime() };
    let restores = 0, hides = 0, loginRenders = 0;
    const user = strongIdentity ? { uid: 'persisted-owner' } : null;
    const deps = { state, participantCalendarRevision: 0, beginParticipantRequest: () => request,
      currentPersonalCalendarScope: () => null, setParticipantStatus() {}, renderCalendarPlaceholder() {},
      waitForAuthReady: () => ready.promise, isCurrentParticipantRequest: () => true,
      hasStrongAdministratorIdentity: () => strongIdentity, loadStoredResidentSignature: () => signature,
      canUseWeekWithoutParticipant: () => false, isResidentEntryGateClosed: () => false,
      shouldBlockResidentEntryRestore: () => false, getActiveCenterId: () => 'test', getCurrentUser: () => user,
      restoreFriendlyResidentSession: async () => { restores++; return null; },
      renderResidentAccess: () => loginRenders++, hideStartupSplash: () => hides++ };
    const refresh = new Function(...Object.keys(deps), extract(app, 'refreshParticipant')
      + '; return refreshParticipant;')(...Object.values(deps));
    const pending = refresh('avvio');
    await turn();
    assert.equal(hides, 0);
    assert.equal(loginRenders, 0);
    ready.resolve(user); await pending;
    assert.equal(restores, strongIdentity || signature ? 1 : 0);
    assert.equal(loginRenders, 1);
    assert.ok(hides > 0);
    assert.equal(deps.getCurrentUser(), user);
  });
}
