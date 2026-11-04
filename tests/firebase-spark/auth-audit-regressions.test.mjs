import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { setImmediate as turn } from 'node:timers/promises';
import { functionSource } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { residentReopenHarness } from '../helpers/resident-reopen.mjs';
import { CAPABILITIES, hasCapability, normalizeCenterRole } from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const source = file => readFileSync(new URL(file, root), 'utf8');
const extract = (text, name) => text.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`))[0];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function compile(names, deps, text) {
  return new Function(...Object.keys(deps), names.map(name => text ? extract(text, name) : functionSource(name)).join('\n')
    + '\nreturn {' + names.join(',') + '};')(...Object.values(deps));
}

function hydrationHarness() {
  const state = { mode: 'admin', adminHydrationVersion: 0, adminAuthorizationPending: true };
  const context = { user: { uid: 'owner' }, center: 'first', invitation: '' };
  const requests = [], published = [], finished = [];
  const deps = { state, getCurrentUser: () => context.user, getActiveCenterId: () => context.center,
    getAdminRoleInvitationId: () => context.invitation,
    resolveAdminAuthState: async (user, isCurrent) => {
      const pending = deferred(); requests.push(pending);
      const complete = await pending.promise;
      if (!isCurrent() || !complete) return false;
      published.push(user.uid); return true;
    }, finishAdminAuthorizationCheck: () => { finished.push(true); state.adminAuthorizationPending = false; } };
  const api = new Function(...Object.keys(deps), 'let adminHydrationLoad = null;\n'
    + functionSource('getAdminHydrationKey') + '\n' + functionSource('applyAdminAuthState')
    + '\nreturn applyAdminAuthState;')(...Object.values(deps));
  return { state, context, requests, published, finished, apply: () => api(context.user) };
}

test('concurrent Admin observer and navigation share one valid hydration', async () => {
  const h = hydrationHarness();
  const first = h.apply(), second = h.apply();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve(true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.deepEqual(h.published, ['owner']);
  assert.equal(h.finished.length, 1);
});

test('invalidation with the same UID and center starts fresh work; old cleanup cannot remove it', async () => {
  const h = hydrationHarness();
  const old = h.apply(); h.state.adminHydrationVersion++;
  const next = h.apply();
  assert.equal(h.requests.length, 2);
  h.requests[0].resolve(true); assert.equal(await old, false);
  assert.equal(h.state.adminPanelHydrating, true);
  const joined = h.apply(); assert.equal(h.requests.length, 2);
  h.requests[1].resolve(true); await Promise.all([next, joined]);
  assert.deepEqual(h.published, ['owner']);
  assert.equal(h.finished.length, 1);
});

for (const change of ['user', 'center', 'invitation', 'mode']) {
  test(`late Admin completion after ${change} change cannot publish or dismiss the pending screen`, async () => {
    const h = hydrationHarness(); const pending = h.apply();
    if (change === 'mode') h.state.mode = 'week';
    else h.context[change] = change === 'user' ? null : 'changed';
    h.requests[0].resolve(true); assert.equal(await pending, false);
    assert.deepEqual(h.published, []); assert.deepEqual(h.finished, []);
  });
}

test('an obsolete Admin error cannot overwrite a newer successful screen', async () => {
  const h = hydrationHarness(); const old = h.apply();
  h.state.adminHydrationVersion++; const next = h.apply();
  h.requests[1].resolve(true); await next;
  h.requests[0].reject(new Error('old network failure'));
  assert.equal(await old, false); assert.equal(h.finished.length, 1);
});

test('the real Admin resolver discards a membership response invalidated during its read', async () => {
  const pending = deferred(); let current = true, reads = 0;
  const { resolveAdminAuthState } = compile(['resolveAdminAuthState'], {
    loadDomainModule: async () => ({ isPlatformOwnerUser: () => false,
      loadAdminCenterAccess: () => { reads++; return pending.promise; } })
  });
  const result = resolveAdminAuthState({ uid: 'owner' }, () => current);
  await turn(); assert.equal(reads, 1); current = false;
  pending.resolve({ active: true, role: 'OWNER' });
  assert.equal(await result, false);
});

for (const rejectInvitation of [false, true]) {
  test(`real Admin hydration publishes one panel with concurrent navigation${rejectInvitation ? ' after rejecting an invitation' : ''}`, async () => {
    const user = { uid: 'owner', email: 'owner@example.test' };
    const state = { mode: 'admin', adminHydrationVersion: 0, adminAuthorizationPending: true, adminActiveSection: 'people' };
    const participants = deferred(); let reads = 0, finishes = 0;
    const window = { location: { href: 'https://example.test/?view=admin' + (rejectInvitation ? '&adminInvite=test' : '') },
      history: { replaceState: (_, __, path) => { window.location.href = new URL(path, window.location.href).href; } } };
    const elements = new Proxy({}, { get: (target, key) => target[key] ||= {
      hidden: true, dataset: {}, classList: { add() {} }, focus() {}
    } });
    const deps = { user, state, window, URL, elements, getCurrentUser: () => user,
      getActiveCenterId: () => 'center', getAdminRoleInvitationId: () => new URL(window.location.href).searchParams.get('adminInvite') || '',
      loadDomainModule: async () => ({ isPlatformOwnerUser: () => false,
        loadAdminCenterAccess: async () => { reads++; return { active: true, role: 'OWNER', centerId: 'center', invitationPending: rejectInvitation }; },
        rejectAdministratorInvitation: async () => {} }),
      loadAdminInvitationDecision: () => rejectInvitation ? 'REJECT' : '', requiresAdministratorPassword: () => false,
      clearAdminInvitationDecision() {}, hasPendingAdminSuccession: () => false,
      ensureAuthorizedAdminRoute() {}, hasCurrentCapability: () => true, CAPABILITIES,
      renderAdminCenterSwitcher() {}, showRequiredAdminPasswordSetup() {}, t: key => key,
      renderAdminSuccessionNotice() {}, applyAdminCapabilityVisibility() {},
      refreshAdminParticipants: () => participants.promise, renderMode() {},
      finishAdminAuthorizationCheck: () => { finishes++; state.adminAuthorizationPending = false; }
    };
    const apply = new Function(...Object.keys(deps), 'let adminHydrationLoad = null;\n'
      + ['getAdminHydrationKey', 'applyAdminAuthState', 'resolveAdminAuthState'].map(functionSource).join('\n')
      + '\nreturn () => applyAdminAuthState(user);')(...Object.values(deps));
    const first = apply(); await turn();
    assert.equal(state.adminRole, 'OWNER'); assert.equal(elements.adminPanel.hidden, true);
    const second = apply(); assert.equal(reads, 1);
    participants.resolve(); assert.deepEqual(await Promise.all([first, second]), [true, true]);
    assert.equal(elements.adminPanel.hidden, false); assert.equal(finishes, 1);
  });
}

function membershipHarness({ linked = true } = {}) {
  const context = { user: { uid: 'owner', isAnonymous: false }, center: 'first' };
  const membership = deferred(), profile = deferred(), settings = deferred();
  const reads = [], writes = [];
  const deps = {
    db: {}, getActiveCenterId: () => context.center, getCurrentUser: () => context.user,
    waitForAuthReady: async () => {}, isResidentTechnicalEmail: () => false,
    CAPABILITIES, hasCapability, normalizeCenterRole,
    doc: (_, ...path) => path.join('/'), getDoc: ref => { reads.push(ref); return membership.promise; },
    loadPublicParticipantById: () => profile.promise, loadPublicParticipantBySignature: () => profile.promise,
    loadCenterContactSettings: () => settings.promise, normalizeResidentSignature: value => value,
    writeStoredResidentValues: values => writes.push(values),
    RESIDENT_SIGNATURE_STORAGE_KEY: 'signature', RESIDENT_PARTICIPANT_STORAGE_KEY: 'participant',
    loadStoredResidentSignature: () => '', loadStoredResidentParticipantId: () => '', loadStoredResidentToken: () => ({})
  };
  const api = compile(['getStrongAuthenticatedUser', 'assertCurrentResidentIdentity', 'getAuthorizedAdministratorAccess',
    'getAuthorizedAdministratorUser', 'restoreResidentIdentityForAuthorizedAdministrator', 'restoreFriendlyResidentSession'],
  deps, source('participant-data.js'));
  const resolveMembership = (status = 'ACTIVE') => membership.resolve({ exists: () => true,
    data: () => ({ status, role: 'OWNER', participantId: linked ? 'person' : '' }) });
  return { ...api, context, membership, profile, settings, reads, writes, resolveMembership };
}

test('Admin resident restore reads membership once and returns its verified UID and center', async () => {
  const h = membershipHarness(); const pending = h.restoreFriendlyResidentSession();
  h.resolveMembership(); h.profile.resolve({ participantId: 'person', signature: 'AA' });
  const result = await pending;
  assert.deepEqual(h.reads, ['centers/first/admins/owner']);
  assert.equal(result.verifiedUser, h.context.user); assert.equal(result.verifiedCenterId, 'first');
  assert.equal(h.writes.length, 1);
  await h.getAuthorizedAdministratorUser(); assert.equal(h.reads.length, 2, 'later checks do not reuse a permission cache');
});

for (const stage of ['membership', 'settings', 'profile']) for (const change of ['user', 'center']) {
  test(`Admin restore after ${change} changes during ${stage} cannot write device identity`, async () => {
    const h = membershipHarness({ linked: stage !== 'settings' });
    const pending = h.restoreFriendlyResidentSession();
    const rejected = assert.rejects(pending, error => error.code === 'resident/session-changed');
    await turn();
    if (stage !== 'membership') { h.resolveMembership(); await turn(); }
    h.context[change] = change === 'user' ? { uid: 'other', isAnonymous: false } : 'other';
    h.resolveMembership(); h.settings.resolve({ administratorParticipantId: 'person' });
    h.profile.resolve({ participantId: 'person', signature: 'AA' });
    await rejected; assert.deepEqual(h.writes, []);
  });
}

test('inactive membership cannot restore a participant', async () => {
  const h = membershipHarness(); const pending = h.restoreFriendlyResidentSession();
  h.resolveMembership('DISABLED'); assert.equal(await pending, null); assert.deepEqual(h.writes, []);
});

test('first calendar uses the explicitly verified restore; later refresh checks the session again', async () => {
  let checks = 0;
  const h = residentReopenHarness({ overrides: { ensureStoredResidentSession: async () => { checks++; return h.user; } } });
  await h.run();
  assert.equal(checks, 0); assert.equal(h.state.participantWeek.length, 7);
  await h.run(); assert.equal(checks, 1);
});

test('a resident identity changed during profile loading is neither remembered nor signed out', async () => {
  let h;
  h = residentReopenHarness({ read: async (name, value) => {
    if (name === 'profile') h.user.uid = 'replacement';
    return value;
  }, overrides: { ensurePersonalSession: async () => ({ uid: 'restored-user', isAnonymous: true }) } });
  await h.run();
  assert.equal(h.state.residentReady, false);
  assert.equal(h.state.participantWeek.length, 0);
  for (const event of ['identity', 'clear-identity', 'signout']) assert.ok(!h.names().includes(event));
});

async function popupHarness() {
  const popup = deferred(), anonymous = deferred();
  const auth = { currentUser: { uid: 'persisted', isAnonymous: true } };
  const listeners = new Set(); const calls = [], persistences = [];
  const emit = () => { for (const listener of listeners) listener(auth.currentUser); };
  const api = await loadBrowserModule('firebase-client.js', {
    initializeApp: () => ({}), initializeAuth: (_, options) => { persistences.push(options.persistence); return auth; },
    initializeFirestore: () => ({}), firestoreSettingsForBrowser: () => ({}), browserLocalPersistence: 'local',
    browserPopupRedirectResolver: 'popup-resolver', GoogleAuthProvider: class {},
    onAuthStateChanged: (_, callback) => { listeners.add(callback); return () => listeners.delete(callback); },
    signInWithPopup: (...args) => { calls.push(args); return popup.promise; },
    signOut: async () => { auth.currentUser = null; emit(); },
    signInAnonymously: async () => { await anonymous.promise; auth.currentUser = { uid: 'new-anon', isAnonymous: true }; emit(); return { user: auth.currentUser }; }
  }, ['signInWithGoogle', 'waitForAuthReady', 'watchAuth', 'replaceWithAnonymousUser']);
  return { api, auth, popup, anonymous, calls, persistences, emit };
}

test('Google popup waits for persistent Auth but does not block reads while open; cancellation preserves user', async () => {
  const h = await popupHarness(); const original = h.auth.currentUser;
  const login = h.api.signInWithGoogle();
  const rejected = assert.rejects(login, { code: 'auth/popup-closed-by-user' });
  await turn(); assert.equal(h.calls.length, 0);
  h.emit(); await turn(); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][2], 'popup-resolver'); assert.deepEqual(h.persistences, ['local']);
  assert.equal(await h.api.waitForAuthReady(), original);
  h.popup.reject(Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }));
  await rejected; assert.equal(h.auth.currentUser, original);
});

test('Google waits for an existing composite mutation; observers still hide its intermediate null', async () => {
  const h = await popupHarness(); h.emit(); await h.api.waitForAuthReady();
  const seen = []; h.api.watchAuth(user => seen.push(user?.uid ?? null));
  const replacement = h.api.replaceWithAnonymousUser();
  await turn(); const login = h.api.signInWithGoogle(); await turn();
  assert.deepEqual(seen, []); assert.equal(h.calls.length, 0);
  h.anonymous.resolve(); await replacement; await turn();
  assert.deepEqual(seen, ['new-anon']); assert.equal(h.calls.length, 1);
  h.auth.currentUser = { uid: 'google', isAnonymous: false }; h.emit();
  h.popup.resolve({ user: h.auth.currentUser }); await login; await turn();
  assert.deepEqual(seen, ['new-anon', 'google']);
});

for (const failure of [false, true]) {
  test(`Admin access overlaps protection and centers once, awaiting protection ${failure ? 'failure' : 'success'}`, async () => {
    const protection = deferred(), centers = deferred(); const calls = [];
    const { loadAdminCenterAccess } = compile(['loadAdminCenterAccess'], {
      db: {}, getAdminInvitationId: () => '', normalizeInvitationId: () => '', URLSearchParams,
      window: { location: { search: '' } }, getActiveCenterId: () => 'center', ADMIN_PROFILE_COLLECTION: 'profiles',
      doc: (_, ...path) => path.join('/'), readCenterAdmin: async () => ({ active: true, role: 'OWNER' }),
      getDoc: async () => ({ exists: () => true, data: () => ({}) }), getAdminRoleInvitationId: () => '',
      adminProfileNeedsRepair: () => false,
      synchronizeAdministratorDeletionProtection: () => { calls.push('protection'); return protection.promise; },
      listAccessibleAdminCenters: () => { calls.push('centers'); return centers.promise; }
    }, source('admin-center.js'));
    let settled = false;
    const pending = loadAdminCenterAccess({ uid: 'owner' });
    const checked = failure ? assert.rejects(pending, /protection failure/) : pending;
    pending.then(() => { settled = true; }, () => { settled = true; });
    await turn(); assert.deepEqual(calls, ['protection', 'centers']);
    centers.resolve(['center']); await turn(); assert.equal(settled, false);
    if (failure) protection.reject(new Error('protection failure')); else protection.resolve();
    const result = await checked;
    if (!failure) assert.deepEqual(result.availableCenters, ['center']);
  });
}
