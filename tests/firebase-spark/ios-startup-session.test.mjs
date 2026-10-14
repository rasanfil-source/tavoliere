import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { firestoreSettingsForBrowser } from '../../prototypes/firebase-spark-pwa/public/core/firebase-runtime-policy.mjs';
import { measureStartupStep } from '../../prototypes/firebase-spark-pwa/public/core/startup-timing.mjs';

const read = file => readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/' + file, import.meta.url), 'utf8');
const app = read('app.js');
const participants = read('participant-data.js');
const extract = (source, name) => source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`))[0];
const recoverable = error => ['unavailable', 'permission-denied', 'auth/network-request-failed'].includes(error.code);

test('iPhone Safari, Chrome, Firefox and standalone use the WebKit Firestore workaround', () => {
  for (const browser of ['Safari/604.1', 'CriOS/149 Mobile Safari/604.1', 'FxiOS/149 Mobile Safari/604.1', 'Mobile/15E148']) {
    const settings = firestoreSettingsForBrowser({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 ' + browser });
    assert.equal(settings.experimentalForceLongPolling, true);
    assert.equal(settings.useFetchStreams, false);
  }
  assert.equal(firestoreSettingsForBrowser({ userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 }).experimentalForceLongPolling, true);
  assert.equal(firestoreSettingsForBrowser({ userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/26.5 Safari/605.1.15' }).experimentalForceLongPolling, true);
});

test('Android and desktop Chromium retain the default Firestore transport', () => {
  for (const userAgent of ['Mozilla/5.0 (Linux; Android 17) AppleWebKit/537.36 Chrome/149 Safari/537.36',
    'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/149 Safari/537.36', 'Mozilla/5.0 (Windows) Chrome/149 Safari/537.36']) {
    assert.deepEqual(firestoreSettingsForBrowser({ userAgent }), {});
  }
  assert.deepEqual(firestoreSettingsForBrowser(), {});
});

test('Auth retains local persistence and only initializes Google support at explicit sign-in', async () => {
  const initializations = [];
  const popups = [];
  const local = {}, memory = {}, resolver = {};
  const restoredUser = { uid: 'persisted-device', isAnonymous: true };
  const context = vm.createContext({ URLSearchParams, console,
    browserLocalPersistence: local, inMemoryPersistence: memory, browserPopupRedirectResolver: resolver,
    initializeApp: () => ({}), getApps: () => [],
    initializeAuth: (app, options) => {
      initializations.push(options);
      return { app, currentUser: restoredUser };
    }, initializeFirestore: () => ({}),
    onAuthStateChanged: (auth, callback) => { queueMicrotask(() => callback(auth.currentUser)); return () => {}; },
    GoogleAuthProvider: class {}, signInWithPopup: (...args) => { popups.push(args); return Promise.resolve({}); },
    window: { location: { search: '' } }
  });
  vm.runInContext(read('core/firebase-runtime-policy.mjs').replaceAll('export ', '')
    + read('core/startup-timing.mjs').replaceAll('export ', '')
    + read('firebase-client.js').replace(/import[^;]+;\s*/g, '').replace(/^export /gm, ''), context);
  assert.equal((await context.waitForAuthReady()).uid, 'persisted-device');
  assert.equal(initializations[0].persistence, local);
  assert.equal(initializations[0].popupRedirectResolver, undefined);
  assert.equal(popups.length, 0);
  await context.signInWithGoogle();
  assert.equal(popups[0][2], resolver);
  await context.getResidentMaintenanceAuth();
  assert.equal(initializations[1].persistence, memory);
  assert.equal(initializations[1].popupRedirectResolver, undefined);
});

for (const code of ['unavailable', 'auth/network-request-failed', 'permission-denied']) {
  test(`resident restore preserves device credentials after ${code}, even online`, async () => {
    let cleared = 0, signedOut = 0;
    const context = vm.createContext({
      loadStoredResidentSignature: () => 'RM', loadStoredResidentParticipantId: () => 'resident',
      loadStoredResidentToken: () => ({ tokenId: 'personal_token', expiresAt: '2050-01-01' }),
      waitForAuthReady: async () => {}, getStrongAuthenticatedUser: () => null,
      getAuthorizedAdministratorUser: async () => null,
      ensurePersonalSession: async () => { throw Object.assign(new Error('temporary'), { code }); },
      isRecoverableSessionError: recoverable, isConnectionAvailable: () => true,
      clearStoredResidentIdentity: () => cleared++, clearCurrentSession: () => cleared++,
      signOutCurrentUser: async () => signedOut++
    });
    vm.runInContext(extract(participants, 'restoreFriendlyResidentSession'), context);
    await assert.rejects(context.restoreFriendlyResidentSession(), error => error.preserveResidentIdentity === true);
    assert.equal(cleared, 0); assert.equal(signedOut, 0);
  });
}

test('an expired personal token still requires a new login', async () => {
  let cleared = 0, signedOut = 0;
  const context = vm.createContext({
    loadStoredResidentSignature: () => 'RM', loadStoredResidentParticipantId: () => 'resident',
    loadStoredResidentToken: () => ({ tokenId: 'expired', expiresAt: '2020-01-01' }),
    waitForAuthReady: async () => {}, getStrongAuthenticatedUser: () => null,
    getAuthorizedAdministratorUser: async () => null,
    ensurePersonalSession: async () => { throw new Error('Accesso del dispositivo scaduto'); },
    isRecoverableSessionError: recoverable,
    clearStoredResidentIdentity: () => cleared++, clearCurrentSession() {},
    signOutCurrentUser: async () => signedOut++
  });
  vm.runInContext(extract(participants, 'restoreFriendlyResidentSession'), context);
  assert.equal(await context.restoreFriendlyResidentSession(), null);
  assert.equal(cleared, 1); assert.equal(signedOut, 1);
});

test('a failed common-password attempt leaves the existing resident Auth identity intact', async () => {
  let signedOut = 0;
  const user = { uid: 'existing', isAnonymous: true };
  const context = vm.createContext({
    normalizeResidentSignature: value => value, getStrongAuthenticatedUser: () => null,
    getAuthorizedAdministratorUser: async () => null, getCurrentUser: () => user,
    loadStoredResidentParticipantId: () => 'resident', loadStoredResidentSignature: () => 'RM',
    loadStoredResidentToken: () => ({}), getActiveCenterId: () => 'center',
    withResidentTechnicalSession: async () => { throw Object.assign(new Error('wrong'), { code: 'auth/invalid-credential' }); },
    clearCurrentSession: () => { throw new Error('must retain current session'); },
    signOutCurrentUser: async () => signedOut++, isRecoverableSessionError: recoverable
  });
  vm.runInContext(extract(participants, 'signInFriendlyResident'), context);
  await assert.rejects(context.signInFriendlyResident('RM', 'incorrect'));
  assert.equal(signedOut, 0);
});

test('first login keeps its identity if the calendar network read fails', async () => {
  const state = { friendlyAccess: true, residentReady: true, selectedParticipant: { participantId: 'resident' },
    mode: 'week', participantWeek: [], participantMonth: [], todayOverview: [] };
  const context = vm.createContext({ state, console: { error() {} },
    currentPersonalCalendarScope: () => null, getCurrentUser: () => ({ uid: 'user' }),
    preparePersonalCalendarRead: () => null,
    renderCalendarPlaceholder() {},
    loadCenterCalendarSettings: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); },
    beginParticipantRequest: () => ({}), isCurrentParticipantRequest: () => true,
    setParticipantStatus() {}, ensureStoredResidentSession: async () => {},
    loadCenterContactSettings: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); },
    isRecoverableSessionError: recoverable, isCenterAccessRevokedError: () => false,
    shouldPreserveResidentViewAfterRefreshError: () => false, friendlyErrorMessage: () => 'offline',
    hideStartupSplash() {}, renderResidentAccess: () => { throw new Error('must not return to login'); }
  });
  vm.runInContext(extract(app, 'refreshParticipant'), context);
  assert.equal(await context.refreshParticipant('avvio', { loginHandshake: true }), true);
  assert.equal(state.residentReady, true);
  assert.equal(state.selectedParticipant.participantId, 'resident');
});

test('ordinary residents finish common login without trying vice accounts', async () => {
  let viceCalls = 0;
  const state = {};
  const fields = { value: 'RM', focus() {}, select() {} };
  const context = vm.createContext({ state,
    elements: { residentLoginButton: {}, residentLoginStatus: {}, residentSignatureInput: fields, residentPasswordInput: { ...fields } },
    transitionAuthLifecycle() {}, invalidateViewRequests() {},
    signInFriendlyResident: async () => ({ participant: {}, participants: [{}] }),
    signInFriendlyViceAdministrator: async () => { viceCalls++; },
    applyResidentPreferences: value => value, clearAdminAuthorizationState() {}, applyResidentEntryView() {},
    renderResidentAccess() {}, renderMode() {}, refreshParticipant: async () => true, openResidentEntryGate() {},
    friendlyErrorMessage: error => error.message, canFallbackFromResidentLogin: () => true
  });
  vm.runInContext(extract(app, 'handleResidentLogin'), context);
  await context.handleResidentLogin({ preventDefault() {} });
  assert.equal(viceCalls, 0); assert.equal(state.residentReady, true);
});

for (const code of ['auth/invalid-credential', 'auth/network-request-failed']) {
  test(`only rejected credentials trigger vice login (${code})`, async () => {
    let viceCalls = 0;
    const state = {};
    const input = { value: 'RM', focus() {}, select() {} };
    const context = vm.createContext({ state,
      elements: { residentLoginButton: {}, residentLoginStatus: {}, residentSignatureInput: input, residentPasswordInput: { ...input } },
      transitionAuthLifecycle() {}, invalidateViewRequests() {},
      signInFriendlyResident: async () => { throw Object.assign(new Error('rejected'), { code }); },
      signInFriendlyViceAdministrator: async () => { viceCalls++; return { participant: {}, participants: [{}], administratorAuthorized: true }; },
      applyResidentPreferences: value => value, clearAdminAuthorizationState() {}, applyResidentEntryView() {},
      renderResidentAccess() {}, renderMode() {}, refreshParticipant: async () => true, openResidentEntryGate() {},
      friendlyErrorMessage: error => error.message, normalizeOperationalLinksFromAuthorizedLogin: () => null
    });
    vm.runInContext(extract(app, 'canFallbackFromResidentLogin') + extract(app, 'handleResidentLogin'), context);
    await context.handleResidentLogin({ preventDefault() {} });
    assert.equal(viceCalls, code === 'auth/invalid-credential' ? 1 : 0);
    assert.equal(Boolean(state.residentReady), code === 'auth/invalid-credential');
    assert.equal(state.residentAuthTransition, '');
    assert.equal(context.elements.residentLoginButton.disabled, false);
  });
}

test('ordinary resident role check avoids loading center and person without a vice session', async () => {
  let reads = 0;
  const context = vm.createContext({ db: {},
    getCurrentUser: () => ({ uid: 'resident-auth', isAnonymous: true }),
    loadStoredResidentParticipantId: () => 'resident', getActiveCenterId: () => 'center',
    doc: (...path) => path, getDoc: async () => { reads++; return { exists: () => false }; }
  });
  vm.runInContext(extract(participants, 'loadResidentAdministratorAuthorization'), context);
  assert.equal((await context.loadResidentAdministratorAuthorization()).active, false);
  assert.equal(reads, 1);
});

test('optional reminder failures never close the calendar and stale failures do not overwrite a new view', async () => {
  let isCurrent = true, clearCalls = 0;
  const state = { mealReminderDays: ['current'] };
  const context = vm.createContext({ state,
    refreshMealReminderDays: async () => { throw new Error('offline'); },
    clearMealReminderTimers: () => clearCalls++, syncMealReminderControl() {}, scheduleMealRemindersFromCurrentCalendar() {}
  });
  vm.runInContext(extract(app, 'refreshMealRemindersAfterCalendar'), context);
  isCurrent = false;
  await context.refreshMealRemindersAfterCalendar(() => isCurrent);
  assert.equal(state.mealReminderDays[0], 'current'); assert.equal(clearCalls, 0);
  isCurrent = true;
  await context.refreshMealRemindersAfterCalendar(() => isCurrent);
  assert.equal(state.mealReminderDays.length, 0); assert.equal(clearCalls, 1);
});

test('startup timing works without diagnostics or browser APIs', async () => {
  assert.equal(await measureStartupStep('calendar', async () => 'ready'), 'ready');
  await assert.rejects(measureStartupStep('calendar', async () => { throw new Error('network'); }), /network/);
});
