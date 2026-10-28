import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as roles from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

test('rejected invitation audit resolves invited person without an admin account', async () => {
  const writes = [];
  const h = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, doc: (_, ...parts) => ({ id: parts.at(-1), path: parts.join('/') }),
    getDoc: async () => ({ exists: () => true, data: () => ({ status: 'ACTIVE', centerId: 'center', participantId: 'invited' }) }),
    serverTimestamp: () => 1, AUDIT_ACTIONS: { REJECT_ADMIN_INVITATION: 'REJECT_ADMIN_INVITATION' },
    writeBatch: () => ({ set: (ref, data) => writes.push([ref, data]), commit: async () => {} })
  }, ['rejectAdministratorInvitation']);
  await h.rejectAdministratorInvitation('b'.repeat(64), { uid: 'technical_uid' });
  const event = writes.find(([ref]) => ref.path.includes('/auditEvents/'))[1];
  const ui = functions(['resolveAuditActorLabel'], {
    state: { adminAccounts: [], adminParticipants: [{ participantId: 'invited', displayName: 'Mario' }] }, t: key => key
  });
  assert.equal(ui.resolveAuditActorLabel(event), 'Mario');
});

test('only administrative roles can edit the shared kitchen layout', () => {
  const state = { residentSettingsMode: true, adminRole: '' };
  const h = functions(['canEditKitchenLayout'], { state });
  assert.equal(h.canEditKitchenLayout(), false);
  state.residentSettingsMode = false;
  for (const role of ['OWNER', 'ADMIN', 'MANAGER']) {
    state.adminRole = role;
    assert.equal(h.canEditKitchenLayout(), true);
  }
  state.adminRole = '';
  assert.equal(h.canEditKitchenLayout(), false);
});

test('appearance cancellation restores the saved language and detects layout changes', async () => {
  let locale = 'fr';
  const state = { centerContactSettings: { language: 'it', summaryLayout: 'classic' } };
  const elements = { adminSummaryLayoutSelect: { value: 'international' } };
  const h = functions(['hasPendingAdminAdaptationChanges', 'handleAdminAdaptationsCancel'], {
    state, elements, DEFAULT_OPENING_VIEW: 'week', document: { documentElement: { dataset: {} } },
    applyInterfaceStyle: () => {}, setLocale: async value => { locale = value; },
    renderAllViews: () => {}, syncAdminAdaptationsForm: () => {}
  });
  assert.equal(h.hasPendingAdminAdaptationChanges(), false, 'untouched controls are not unsaved edits');
  state.editedAdaptationControls = new Set(['adminSummaryLayoutSelect']);
  assert.equal(h.hasPendingAdminAdaptationChanges(), true);
  elements.adminSummaryLayoutSelect.value = 'classic';
  assert.equal(h.hasPendingAdminAdaptationChanges(), false, 'restoring the saved value clears the warning');
  elements.adminSummaryLayoutSelect.value = 'international';
  await h.handleAdminAdaptationsCancel();
  assert.equal(locale, 'it');
  assert.equal(h.hasPendingAdminAdaptationChanges(), false);
});

test('leaving Agenda with untouched appearance controls does not trigger the browser dialog', () => {
  const state = { centerContactSettings: { defaultView: 'week', language: 'fr' } };
  const elements = { adminDefaultViewSelect: { value: 'month' }, adminLanguageSelect: { value: 'it' } };
  const h = functions(['hasPendingAdminAdaptationChanges', 'handleBeforeUnload'], {
    state, elements, DEFAULT_OPENING_VIEW: 'week'
  });
  let prevented = 0;
  const event = { preventDefault: () => prevented++ };
  h.handleBeforeUnload(event);
  assert.equal(prevented, 0);
  assert.equal(event.returnValue, undefined);
  state.editedAdaptationControls = new Set(['adminDefaultViewSelect']);
  h.handleBeforeUnload(event);
  assert.equal(prevented, 1);
  assert.equal(event.returnValue, '');
  state.editedAdaptationControls.clear();
  state.adminPersonDirty = true;
  h.handleBeforeUnload(event);
  assert.equal(prevented, 2, 'actual person edits remain protected');
});

test('accepting a second center invitation preserves account creation date', async () => {
  const writes = [];
  const h = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, doc: (_, ...parts) => parts.join('/'),
    getDoc: async () => ({ exists: () => true, data: () => ({ createdAt: 42 }) }),
    arrayUnion: value => [value], requiresAdministratorPassword: () => false, serverTimestamp: () => 99,
    writeBatch: () => ({ set: (ref, data) => writes.push([ref, data]), commit: async () => {} })
  }, ['claimRoleInvitation']);
  await h.claimRoleInvitation('a'.repeat(64), { centerId: 'second', role: 'ADMIN' },
    { uid: 'owner', email: 'owner@example.com', emailVerified: true, providerData: [{ providerId: 'password' }] });
  assert.equal(Object.hasOwn(writes.find(([ref]) => ref === 'adminProfiles/owner')[1], 'createdAt'), false);
});

test('operational links are rechecked after cached token expiration', async () => {
  let now = 1000, reads = 0;
  class Clock extends Date { constructor(value) { super(value === undefined ? now : value); } }
  const h = await loadBrowserModule('access-links.js', {
    db: {}, Date: Clock, getActiveCenterId: () => 'center', doc: (_, ...parts) => parts.at(-1),
    getDoc: async id => { reads++; return { exists: () => true, data: () => id === 'operationalLinks'
      ? { publicTokenId: 'public_test123', kitchenTokenId: 'kitchen_test123' }
      : { status: 'ACTIVE', scope: id.startsWith('public') ? 'PUBLIC' : 'KITCHEN', targetType: 'CENTER', expiresAt: new Clock(2000) } }; }
  }, ['loadOperationalLinks']);
  assert.equal((await h.loadOperationalLinks()).publicStatus, 'ACTIVE');
  const before = reads;
  await h.loadOperationalLinks();
  assert.equal(reads, before);
  now = 3000;
  assert.equal((await h.loadOperationalLinks()).publicStatus, 'INACTIVE');
  assert.ok(reads > before);
});

test('configuration finds the existing responsible person even before directory hydration', async () => {
  let saved;
  const person = { participantId: 'owner', signature: 'OLD', revision: 7, sortOrder: 12, phone: '123', status: 'ACTIVE' };
  const h = functions(['saveAdministratorAsParticipant'], {
    state: { adminParticipants: [], centerContactSettings: { administratorParticipantId: 'owner' } },
    listAdminParticipants: async () => [person], saveAdminParticipant: async (...args) => { saved = args; }
  });
  await h.saveAdministratorAsParticipant({ administratorName: 'Owner', administratorSignature: 'NEW', previousAdministratorSignature: 'OLD' });
  assert.equal(saved[0], 'owner');
  assert.equal(saved[1].expectedRevision, 7);
  assert.equal(saved[1].phone, '123');
  assert.equal(saved[1].sortOrder, 12);
});

test('audit pages merge two uneven streams without late insertion or skipped events', async () => {
  const row = (id, time) => ({ id, data: () => ({ createdAt: new Date(time) }) });
  const streams = { auditEvents: [row('a', 100), row('b', 90), row('c', 80)], viceAuditEvents: [row('a', 10)] };
  const h = await loadBrowserModule('audit-log.js', {
    db: {}, getActiveCenterId: () => 'center', collection: (_, ...parts) => parts.at(-1),
    orderBy: () => ({}), startAfter: cursor => ({ cursor }), limit: maximum => ({ maximum }),
    query: (name, ...parts) => ({ name, ...Object.assign({}, ...parts) }),
    getDocs: async ({ name, cursor, maximum }) => {
      const docs = streams[name].slice(cursor ? streams[name].indexOf(cursor) + 1 : 0).slice(0, maximum);
      return { docs, size: docs.length };
    }
  }, ['listAuditEvents']);
  const first = await h.listAuditEvents({ maximum: 2 });
  const second = await h.listAuditEvents({ maximum: 2, cursors: first.cursors });
  assert.deepEqual(first.events.map(e => e.eventId), ['administrator:a', 'administrator:b']);
  assert.deepEqual(second.events.map(e => e.eventId), ['administrator:c', 'vice:a']);
  assert.equal(second.hasMore, false);
});

test('a manager cannot revoke another deputy', async () => {
  const h = await loadBrowserModule('admin-center.js', {
    ...roles, db: {}, getActiveCenterId: () => 'center', doc: () => '',
    getDoc: async () => ({ exists: () => true, data: () => ({ status: 'ACTIVE', role: 'MANAGER' }) })
  }, ['revokeViceAdministratorAccess']);
  await assert.rejects(h.revokeViceAdministratorAccess('other', { uid: 'vice' }), /Solo il responsabile/);
});

test('audit pagination retains the remaining four events from two streams of twelve', async () => {
  const row = n => ({ id: String(n), data: () => ({ createdAt: new Date(n * 1000) }) });
  const streams = { auditEvents: Array.from({ length: 12 }, (_, n) => row(100 - n)),
    viceAuditEvents: Array.from({ length: 12 }, (_, n) => row(50 - n)) };
  const h = await loadBrowserModule('audit-log.js', {
    db: {}, getActiveCenterId: () => 'center', collection: (_, ...p) => p.at(-1),
    orderBy: () => ({}), startAfter: cursor => ({ cursor }), limit: maximum => ({ maximum }),
    query: (name, ...parts) => ({ name, ...Object.assign({}, ...parts) }),
    getDocs: async ({ name, cursor, maximum }) => {
      const docs = streams[name].slice(cursor ? streams[name].indexOf(cursor) + 1 : 0).slice(0, maximum);
      return { docs, size: docs.length };
    }
  }, ['listAuditEvents']);
  const first = await h.listAuditEvents();
  assert.equal(first.events.length, 20);
  assert.equal(first.hasMore, true);
  const second = await h.listAuditEvents({ cursors: first.cursors });
  assert.equal(second.events.length, 4);
  assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.events, ...second.events].map(e => e.eventId)).size, 24);
});

test('changing week origin on Sunday keeps today and reloads personal meals', () => {
  const state = { weekStartDate: new Date(2026, 9, 12), participantWeek: ['old'], selectedParticipant: {}, mode: 'week' };
  let refreshed = 0;
  const h = functions(['realignPersonalWeek'], { state,
    getCenterToday: () => new Date(2026, 9, 18, 12),
    addCalendarDays: (d, n) => { const next = new Date(d); next.setDate(next.getDate() + n); return next; },
    startOfWeek: d => { const next = new Date(d); next.setDate(next.getDate() - next.getDay()); next.setHours(0, 0, 0, 0); return next; },
    invalidateParticipantCalendarCache: () => {}, scheduleBackgroundRefresh: () => { refreshed++; }
  });
  h.realignPersonalWeek();
  assert.equal(state.weekStartDate.getDate(), 18);
  assert.equal(state.participantWeek.length, 0);
  assert.equal(refreshed, 1);
});

test('guest diets remain visible in the fallback summary without double counting', () => {
  const h = functions(['renderGroupedSummary', 'renderDietNameList'], {
    renderNameList: () => '', renderParticipantContact: (p, suffix) => p.displayName + suffix,
    formatDietLabel: code => 'Dieta ' + code, t: key => key
  });
  const html = h.renderGroupedSummary([{ groupId: 'group_ospiti', displayName: 'Guest', dietTags: ['2'] }]);
  assert.match(html, /Guest \(Dieta 2\)/);
  assert.match(html, /Totale<\/h3>\s*<span>1/);
});

test('booking own meals invalidates personal cache after a successful save', async () => {
  const calls = [];
  const h = functions(['saveBookingForMeal'], { state: { selectedParticipant: { participantId: 'me' } },
    getActiveCenterId: () => 'center', getCurrentUser: () => ({ uid: 'user' }),
    saveParticipantMeal: async () => calls.push('save'), invalidateParticipantCalendarCache: () => calls.push('invalidate'),
    refreshParticipant: async () => calls.push('refresh')
  });
  await h.saveBookingForMeal({ participantId: 'me' }, {}, 'PRESENT');
  assert.deepEqual(calls, ['save', 'invalidate', 'refresh']);
});
