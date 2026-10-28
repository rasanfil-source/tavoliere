import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { functions } from '../helpers/app-functions.mjs';
import { createBookingFor } from '../../prototypes/firebase-spark-pwa/public/booking-for.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as schedule from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';

function booking(loadWeek) {
  const handlers = {};
  const dialog = { opened: false, innerHTML: '', addEventListener: (key, value) => { handlers[key] = value; },
    showModal() { this.opened = true; }, close() { this.opened = false; } };
  const view = createBookingFor({ dialog, canBook: () => true, identity: () => 'operator',
    listPeople: () => [{ participantId: 'p', status: 'ACTIVE', displayName: 'Person' }],
    today: () => new Date(2030, 0, 1), loadWeek, saveMeal: async () => {},
    translate: key => key, locale: () => 'it' });
  return { view, dialog, handlers, next: () => handlers.click({ target: {
    closest: key => key === '[data-booking-week]' ? { dataset: { bookingWeek: '7' } } : null
  } }) };
}

test('failed week navigation keeps the displayed period as the next navigation origin', async () => {
  const starts = [];
  const h = booking(async (_, date) => {
    starts.push(dates.formatDateId(date));
    if (starts.length === 2) throw new Error('offline');
    return [{ date: dates.formatDateId(date), meals: [] }];
  });
  await h.view.open('p');
  await h.next();
  await h.next();
  assert.deepEqual(starts, ['2030-01-01', '2030-01-08', '2030-01-08']);
});

test('Escape closes a pending read; a late result cannot close or overwrite a reopened dialog', async () => {
  const finish = [];
  const h = booking(() => new Promise(resolve => finish.push(resolve)));
  const first = h.view.open('p');
  h.handlers.cancel({ preventDefault() {} });
  assert.equal(h.dialog.opened, false);
  const second = h.view.open('p');
  finish[0]([{ date: '2030-01-01', meals: [] }]);
  await first;
  assert.equal(h.dialog.opened, true);
  assert.match(h.dialog.innerHTML, /bookingFor.loading/);
  finish[1]([{ date: '2030-01-08', meals: [] }]);
  await second;
  assert.match(h.dialog.innerHTML, /8 gennaio/);
});

test('initial owner setup does not adopt another resident by matching the requested signature', async () => {
  let saved = false;
  const h = functions(['saveAdministratorAsParticipant'], {
    state: { centerContactSettings: {} },
    listAdminParticipants: async () => [{ participantId: 'resident', signature: 'AB' }],
    saveAdminParticipant: async () => { saved = true; }
  });
  await assert.rejects(h.saveAdministratorAsParticipant({ administratorName: 'Owner',
    administratorSignature: 'AB', previousAdministratorSignature: '' }), /altra persona/);
  assert.equal(saved, false);
});

test('removing the last sick person keeps the draft and its Save button visible', () => {
  const person = { participantId: 'p', status: 'ACTIVE', displayName: 'Person' };
  const state = { mode: 'week', weekExtrasReady: true, weekOperationalDateId: '2030-01-01',
    weekAgendaReady: { health: true },
    weekOperationalHealth: { dateId: '2030-01-01', sickPeople: [person] }, adminParticipants: [person] };
  const elements = { weekOperations: { open: true }, weekHealthSave: { disabled: false },
    weekHealthList: {}, weekDietParticipant: {}, weekHealthSection: { open: true }, weekHealthStatus: {} };
  for (const key of ['Blessing', 'Booking', 'Invited', 'Notes', 'Diet']) elements[`week${key}Section`] = { open: false };
  const h = functions(['handleWeekHealthListClick', 'getWeekSickDraft', 'renderWeekOperations'], {
    state, elements, bookingForView: null, canManageDailyOperations: () => true,
    document: { querySelector: () => ({ value: 'p' }) }, getActiveCenterId: () => 'test',
    captureWeekOperationContext: () => ({ isCurrent: () => true }), syncWeekOperationDateLabels() {},
    escapeHtml: String, t: key => key, refreshWeekInvited() {}, renderWeekKitchenNotes() {}, renderWeekDietAssignments() {}
  });
  h.handleWeekHealthListClick({ target: { closest: key => key === '[data-week-sick-remove]'
    ? { dataset: { weekSickRemove: 'p' } } : null } });
  assert.deepEqual(state.weekSickDraft.people, []);
  assert.equal(elements.weekHealthSection.open, true);
  assert.equal(elements.weekHealthSave.disabled, false);
});

test('switching centers drops operational tokens as well as invitation parameters', () => {
  let result;
  const location = { href: 'https://example.test/?c=old&t=old-secret&invite=x&adminInvite=y' };
  const h = functions(['handleAdminCenterChange'], { window: { location: { ...location, assign: url => { result = url; } } },
    getActiveCenterId: () => 'old', activateAdminCenter: () => {} });
  h.handleAdminCenterChange({ target: { value: 'new' } });
  assert.equal(new URL(result).searchParams.has('t'), false);
});

async function credentialsHarness() {
  const center = 'centers/test';
  const secret = center + '/privateSettings/sharedCredentials';
  const documents = new Map([[center, { name: 'Test', timezone: 'Europe/Rome',
    reservationCutoffs: schedule.DEFAULT_RESERVATION_CUTOFFS, commonPassword: 'old-resident', adminPasswordVersion: 3 }],
    [center + '/accessSessions/p', { tokenId: 'persistent', status: 'ACTIVE' }]]);
  const control = { failCommit: false, failCalendar: false, wrongAdministratorPassword: false };
  const authCalls = [];
  const snapshot = ref => ({ exists: () => documents.has(ref), data: () => structuredClone(documents.get(ref)) });
  const deleted = Symbol('delete');
  const dependencies = {
    ...dates, ...schedule, db: {}, getActiveCenterId: () => 'test', getCurrentUser: () => ({ uid: 'owner' }),
    doc: (_, ...parts) => parts.join('/'), collection: (_, ...parts) => parts.join('/'),
    getDoc: async ref => snapshot(ref), serverTimestamp: () => 10, deleteField: () => deleted,
    setResidentTechnicalPassword: async (...args) => authCalls.push(['resident', ...args]),
    setAdministratorTechnicalPassword: async (...args) => {
      authCalls.push(['administrator', ...args]);
      if (control.wrongAdministratorPassword) throw Object.assign(new Error('Wrong password'), { code: 'auth/invalid-credential' });
      return { uid: 'technical', email: 'admin@test' };
    },
    runTransaction: async (_, action) => {
      const writes = [];
      const tx = { get: async ref => snapshot(ref),
        set: (ref, data, options) => writes.push([ref, data, options?.merge]),
        update: (ref, data) => writes.push([ref, data, true]) };
      const result = await action(tx);
      if (control.failCommit && writes.some(([ref, data]) => ref === secret && data.pending === null)) {
        control.failCommit = false;
        throw new Error('lost credential commit');
      }
      if (control.failCalendar && writes.some(([ref]) => ref.endsWith('/presentationSettings/current'))) throw new Error('calendar failed');
      for (const [ref, data, merge] of writes) {
        const next = merge ? { ...documents.get(ref) } : {};
        for (const [key, value] of Object.entries(data)) {
          if (value === deleted) delete next[key]; else next[key] = structuredClone(value);
        }
        documents.set(ref, next);
      }
      return result;
    }
  };
  const api = await loadBrowserModule('calendar-configuration.js', dependencies, ['saveSharedCredentials', 'saveCenterConfiguration']);
  return { ...api, documents, center, secret, control, authCalls };
}

test('legacy password migration removes the public secret without changing Auth or resident sessions', async () => {
  const h = await credentialsHarness();
  const result = await h.saveSharedCredentials('test');
  assert.equal(result.commonPasswordSet, true);
  assert.equal(Object.hasOwn(h.documents.get(h.center), 'commonPassword'), false);
  assert.equal(h.documents.get(h.secret).commonPassword, 'old-resident');
  assert.deepEqual(h.authCalls, []);
  assert.deepEqual(h.documents.get(h.center + '/accessSessions/p'), { tokenId: 'persistent', status: 'ACTIVE' });
  assert.equal(JSON.stringify(result).includes('old-resident'), false);
});

test('an interrupted Auth update has a private durable intent and resumes without another password prompt', async () => {
  const h = await credentialsHarness();
  h.control.failCommit = true;
  await assert.rejects(h.saveSharedCredentials('test', { commonPassword: 'new-resident',
    administratorSharedPassword: 'new-administrator', currentAdministratorSharedPassword: 'old-administrator' }), /lost credential commit/);
  assert.equal(h.documents.get(h.secret).pending.administratorPassword, 'new-administrator');
  assert.equal(h.documents.get(h.center).adminPasswordVersion, 3);
  const restored = await h.saveSharedCredentials('test');
  assert.equal(restored.adminPasswordVersion, 4);
  assert.equal(h.documents.get(h.secret).commonPassword, 'new-resident');
  assert.equal(h.documents.get(h.secret).pending, null);
  assert.equal(Object.hasOwn(h.documents.get(h.center), 'commonPassword'), false);
  await h.saveSharedCredentials('test');
  assert.equal(h.documents.get(h.center).adminPasswordVersion, 4);
});

test('calendar failure does not undo committed credentials or leak them through returned settings', async () => {
  const h = await credentialsHarness();
  const input = { name: 'Test', timezone: 'Europe/Rome', reservationCutoffs: schedule.DEFAULT_RESERVATION_CUTOFFS,
    administratorName: 'Owner', administratorSignature: 'OW', commonPassword: 'new-resident',
    administratorSharedPassword: 'new-administrator' };
  h.control.failCalendar = true;
  await assert.rejects(h.saveCenterConfiguration(input), /calendar failed/);
  assert.equal(h.documents.get(h.center).adminPasswordVersion, 4);
  assert.equal(h.documents.get(h.secret).pending, null);
  h.control.failCalendar = false;
  const result = await h.saveCenterConfiguration({ ...input, commonPassword: '', administratorSharedPassword: '' });
  assert.equal(result.commonPassword, null);
  assert.equal(result.administratorSharedPassword, null);
  assert.equal(result.adminPasswordVersion, 4);
});

test('a wrong administrator password can be corrected without trapping subsequent saves in the old intent', async () => {
  const h = await credentialsHarness();
  h.control.wrongAdministratorPassword = true;
  await assert.rejects(h.saveSharedCredentials('test', { commonPassword: 'new-resident',
    administratorSharedPassword: 'new-administrator', currentAdministratorSharedPassword: 'incorrect' }), /Wrong password/);
  assert.equal(h.documents.get(h.secret).pending, null);
  assert.equal(h.documents.get(h.secret).commonPassword, 'new-resident', 'the successful resident update is retained');
  h.control.wrongAdministratorPassword = false;
  await h.saveSharedCredentials('test', { administratorSharedPassword: 'new-administrator', currentAdministratorSharedPassword: 'correct' });
  assert.equal(h.authCalls.at(-1)[2], 'correct');
  assert.equal(h.documents.get(h.center).adminPasswordVersion, 4);
});

test('administrator Auth retry accepts the password already applied by an interrupted attempt', async () => {
  const signedIn = [];
  const h = await loadBrowserModule('firebase-client.js', {
    initializeApp: () => null, markStartupStage() {}, firestoreSettingsForBrowser: () => ({}),
    GoogleAuthProvider: class {}, getApps: () => [{ name: 'tavola-comune-resident-maintenance' }],
    initializeAuth: () => ({}), inMemoryPersistence: {}, signOut: async () => {},
    signInWithEmailAndPassword: async (_, email, password) => {
      signedIn.push(password);
      if (signedIn.length === 1) throw Object.assign(new Error('old password'), { code: 'auth/invalid-credential' });
      return { user: { uid: 'technical' } };
    }, updatePassword: async () => {}
  }, ['setAdministratorTechnicalPassword']);
  const result = await h.setAdministratorTechnicalPassword('test', 'old-password', 'new-password');
  assert.equal(result.uid, 'technical');
  assert.equal(signedIn.length, 2);
  assert.notEqual(signedIn[0], signedIn[1]);
});

test('reopening activity starts from the newest page rather than old pagination cursors', () => {
  let calls = 0;
  const state = { adminAuditEvents: [{ eventId: 'old' }], adminAuditCursors: { administrator: 'old' } };
  const elements = { adminAuditDialog: { open: false, showModal() { this.open = true; } }, adminAuditLoad: { dataset: { loaded: 'true' } } };
  const h = functions(['handleAuditDialogOpen'], { state, elements, hasCurrentCapability: () => true,
    CAPABILITIES: {}, handleAuditLoad: () => calls++ });
  h.handleAuditDialogOpen();
  assert.deepEqual(state.adminAuditEvents, []);
  assert.deepEqual(state.adminAuditCursors, {});
  assert.equal(calls, 1);
});

test('activity filter scans subsequent pages until a matching historical event is found', async () => {
  const state = { adminAuditEvents: [], adminAuditCursors: {}, adminHydrationVersion: 1 };
  const elements = { adminAuditLoad: { dataset: {}, setAttribute() {} }, adminAuditMore: {}, adminAuditStatus: {},
    adminAuditTableWrap: {}, adminAuditDialog: { open: true }, adminAuditDateFilter: { value: '' }, adminAuditUserFilter: { value: 'Mario' } };
  let calls = 0;
  const h = functions(['performAuditLoad'], { state, elements, CAPABILITIES: {}, hasCurrentCapability: () => true,
    getActiveCenterId: () => 'test', getCurrentUser: () => ({ uid: 'owner' }), t: key => key,
    auditTimestampValue: value => value, friendlyErrorMessage: error => { throw error; },
    renderFilteredAuditEvents: () => state.adminAuditEvents.filter(event => event.actorLabel === 'Mario').length,
    listAuditEvents: async () => { calls++; return { events: [{ eventId: String(calls), actorLabel: calls === 3 ? 'Mario' : 'Other', createdAt: 5 - calls }],
      cursors: { administrator: calls }, hasMore: calls < 3 }; }
  });
  await h.performAuditLoad();
  assert.equal(calls, 3);
  assert.equal(state.adminAuditEvents.at(-1).actorLabel, 'Mario');
});

test('an unmatched audit search stops after three pages and resumes from its cursor', async () => {
  const state = { adminAuditEvents: [], adminAuditCursors: {}, adminHydrationVersion: 1 };
  const elements = { adminAuditLoad: { dataset: {}, setAttribute() {} }, adminAuditMore: {}, adminAuditStatus: {},
    adminAuditTableWrap: {}, adminAuditDialog: { open: true }, adminAuditDateFilter: { value: '' }, adminAuditUserFilter: { value: 'Absent' } };
  let calls = 0;
  const h = functions(['performAuditLoad'], { state, elements, CAPABILITIES: {}, hasCurrentCapability: () => true,
    getActiveCenterId: () => 'test', getCurrentUser: () => ({ uid: 'owner' }), t: key => key,
    auditTimestampValue: value => value, friendlyErrorMessage: error => { throw error; },
    renderFilteredAuditEvents: () => 0,
    listAuditEvents: async ({ cursors }) => {
      assert.equal(cursors.administrator || 0, calls);
      calls++;
      return { events: [], cursors: { administrator: calls }, hasMore: true };
    }
  });
  await h.performAuditLoad();
  assert.equal(calls, 3);
  assert.equal(state.adminAuditHasMore, true);
  assert.equal(elements.adminAuditMore.disabled, false);
  await h.performAuditLoad();
  assert.equal(calls, 6);
});

test('configuration result preserves legacy profile completeness during restore', async () => {
  const h = await credentialsHarness();
  const result = await h.saveCenterConfiguration({ name: 'Restored', timezone: 'Europe/Rome',
    reservationCutoffs: schedule.DEFAULT_RESERVATION_CUTOFFS, preserveAdministratorProfile: true });
  assert.equal(result.administratorProfileComplete, true);
});
