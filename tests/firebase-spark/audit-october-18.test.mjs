import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as schedule from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';
import * as roles from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';

test('switching centers does not inherit a pending request failure from the old center', async () => {
  let center = 'A', rejectA;
  const reads = [];
  const h = await loadBrowserModule('center-settings.js', {
    db: {}, getActiveCenterId: () => center, measureStartupStep: (_, run) => run(),
    doc: (_, ...parts) => parts.join('/'),
    normalizeReservationCutoffs: schedule.normalizeReservationCutoffs,
    normalizeKitchenDietLegend: () => [],
    getDoc: path => {
      reads.push(path);
      if (path === 'centers/A') return new Promise((_, reject) => { rejectA = reject; });
      return Promise.resolve({ exists: () => true, data: () => path === 'centers/B' ? { name: 'Centro B' } : {} });
    }
  }, ['loadCenterContactSettings']);
  const first = h.loadCenterContactSettings();
  const failure = assert.rejects(first, /Centro A non disponibile/);
  center = 'B';
  const second = h.loadCenterContactSettings();
  assert.ok(reads.includes('centers/B'), 'new center starts without waiting for old center');
  rejectA(new Error('Centro A non disponibile'));
  await failure;
  assert.equal((await second).name, 'Centro B');
});

test('technical password validation rejects whitespace before accessing Auth', async () => {
  const h = await loadBrowserModule('firebase-client.js', {
    initializeApp: () => null, markStartupStage() {}, firestoreSettingsForBrowser: () => ({}),
    GoogleAuthProvider: class {}
  }, ['setResidentTechnicalPassword', 'setAdministratorTechnicalPassword']);
  for (const password of ['    ', '  x  ', '  abc  ']) {
    await assert.rejects(h.setResidentTechnicalPassword('center', '', password), /tra 4 e 32/);
    await assert.rejects(h.setAdministratorTechnicalPassword('center', '', password), /tra 6 e 64/);
  }
});

test('concurrent action dialogs wait for separate decisions', async () => {
  const shown = [], decisions = [];
  const h = functions(['showActionDialog'], { state: {}, openActionDialog: options => {
    shown.push(options.title);
    return new Promise(resolve => decisions.push(resolve));
  } });
  const first = h.showActionDialog({ title: 'Elimina' });
  const second = h.showActionDialog({ title: 'Notifica' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(shown, ['Elimina']);
  decisions[0]({ confirmed: false });
  assert.deepEqual(await first, { confirmed: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(shown, ['Elimina', 'Notifica']);
  decisions[1]({ confirmed: true });
  assert.deepEqual(await second, { confirmed: true });
});

test('activity loads accounts and filters using the center calendar date', () => {
  const state = { centerContactSettings: { timezone: 'Europe/Rome' }, adminAuditEvents: [
    { createdAt: { toDate: () => new Date('2026-01-01T23:30:00Z') } }
  ] };
  const elements = { adminAuditDateFilter: { value: '2026-01-02' }, adminAuditUserFilter: { value: '' },
    adminAuditTableWrap: {}, adminAuditMore: {}, adminAuditStatus: {} };
  let rendered;
  const h = functions(['adminResourcesForSection', 'renderFilteredAuditEvents', 'formatAuditDateTime'], {
    state, elements, ...dates, getLocale: () => 'it', t: key => key,
    resolveAuditActorLabel: () => 'Mario', renderAuditEvents: events => rendered = events,
    formatDateTime: (date, options, locale) => new Intl.DateTimeFormat(locale, options).format(date)
  });
  assert.ok(h.adminResourcesForSection('activity').has('accounts'));
  h.renderFilteredAuditEvents();
  assert.equal(rendered.length, 1);
  assert.match(h.formatAuditDateTime(new Date('2026-01-01T23:30:00Z')), /02.*00:30/);
});

test('secondary administrator saves center settings without acquiring the owner identity', async () => {
  const field = () => ({ value: '', setAttribute() {}, removeAttribute() {}, checkValidity: () => true });
  const elements = Object.fromEntries(['adminCenterSettingsSave', 'adminCenterSettingsSection',
    'adminCenterSettingsStatus', 'adminAdministratorName', 'adminAdministratorSignature',
    'adminAdministratorEmail', 'adminCenterName', 'adminCenterTimezone', 'adminCutoffLunch',
    'adminCutoffDinner', 'adminCutoffBreakfast'].map(key => [key, field()]));
  const state = { adminRole: 'ADMIN', adminParticipantId: 'secondary-person', centerContactSettings: {} };
  let linked = 0;
  const noop = () => {};
  const h = functions(['performAdminCenterSettingsSave'], {
    state, elements, ...roles, hasCurrentCapability: () => true, requiresAdministratorPassword: () => false,
    getCurrentUser: () => ({}), saveAdministratorAsParticipant: async () => ({ participantId: 'owner-person' }),
    updateCenterSettings: async () => ({ commonPassword: null }), applyResidentPreferences: value => value,
    linkCurrentAdministratorParticipant: async () => linked++, listAdminParticipants: async () => [],
    renderMode: noop, renderAdminOverview: noop, syncAdminCenterSettingsForm: noop,
    applyAdminCapabilityVisibility: noop, friendlyErrorMessage: error => error.message
  });
  await h.performAdminCenterSettingsSave();
  assert.match(elements.adminCenterSettingsStatus.textContent, /Configurazione e scheda Persona salvate/);
  assert.equal(linked, 0);
  assert.equal(state.adminParticipantId, 'secondary-person');
});

test('bootstrap chunks 805 people and does not reactivate suspended people', async () => {
  const commits = [];
  const snapshot = value => ({ exists: () => true, data: () => value });
  const participants = Array.from({ length: 805 }, (_, i) => ({ id: String(i), data: () => ({
    status: i === 0 ? 'DISABLED' : 'ACTIVE', groupId: 'group_residenti', dietTags: ['STANDARD']
  }) }));
  const h = await loadBrowserModule('bootstrap-demo.js', {
    ...dates, ...schedule, ...roles, db: {}, getActiveCenterId: () => 'center',
    doc: (_, ...parts) => parts.join('/'), collection: (_, ...parts) => parts.join('/'),
    serverTimestamp: () => 1, setDoc: async () => {},
    getDoc: async path => path.includes('/admins/') ? snapshot({ status: 'ACTIVE', role: 'OWNER' })
      : path.includes('operationalLinks') ? snapshot({ publicTokenId: 'public_valid', kitchenTokenId: 'kitchen_valid' })
        : snapshot({ name: 'Centro', calendarCoveredThrough: '2099-12-31' }),
    getDocs: async path => ({ docs: path.endsWith('/participants') ? participants : [] }),
    writeBatch: () => { const writes = []; return {
      set: (ref, data) => writes.push({ ref, data }), commit: async () => { assert.ok(writes.length <= 400); commits.push(writes); }
    }; }
  }, ['bootstrapCenterData']);
  await h.bootstrapCenterData({ uid: 'owner' });
  const rules = commits.flat().filter(item => item.ref.includes('/reservationRules/'));
  assert.equal(rules.length, 805);
  assert.equal(rules.find(item => item.ref.endsWith('/rule_0')).data.status, 'DISABLED');
  assert.equal(rules.find(item => item.ref.endsWith('/rule_1')).data.status, 'ACTIVE');
  assert.ok(commits.length >= 3);
});
