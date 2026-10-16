import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { functions } from '../helpers/app-functions.mjs';
import { CAPABILITIES, hasCapability } from '../../prototypes/firebase-spark-pwa/public/role-policy.mjs';
import { buildMealReminderPlan } from '../../prototypes/firebase-spark-pwa/public/meal-reminders.mjs';

const noop = () => {};
const field = () => ({ value: '', textContent: '', disabled: false, checkValidity: () => true,
  setAttribute: noop, removeAttribute: noop });

test('missing required administrator controls show a recoverable error before any write', async () => {
  const { createInertElement } = functions(['createInertElement']);
  for (const missing of ['adminAdministratorName', 'adminAdministratorSignature', 'adminAdministratorEmail']) {
    const elements = Object.fromEntries(['adminCenterSettingsSave', 'adminCenterSettingsSection',
      'adminCenterSettingsStatus', 'adminAdministratorName', 'adminAdministratorSignature',
      'adminAdministratorEmail'].map(key => [key, field()]));
    elements[missing] = createInertElement();
    let writes = 0;
    const handler = functions(['performAdminCenterSettingsSave'], {
      elements, CAPABILITIES, hasCurrentCapability: () => true,
      updateCenterSettings: () => writes++, friendlyErrorMessage: error => error.message
    });
    await handler.performAdminCenterSettingsSave();
    assert.equal(writes, 0);
    assert.match(elements.adminCenterSettingsStatus.textContent, /Modulo.*incompleto/);
    assert.doesNotMatch(elements.adminCenterSettingsStatus.textContent, /TypeError|checkValidity/);
    assert.equal(elements.adminCenterSettingsSave.disabled, false);
  }
});

test('a deputy can read the existing diet legend without gaining editing permission', () => {
  for (const role of ['MANAGER', 'ADMIN', 'OWNER']) {
    const input = field();
    const module = functions(['syncAdminDietLabelField'], {
      elements: { adminParticipantDietLabel: input, adminParticipantDiets: { value: '2' } },
      state: { centerContactSettings: { kitchenDietLegend: [] } }, CAPABILITIES,
      hasCurrentCapability: capability => hasCapability(role, capability),
      selectedAdminDietCode: () => '2', kitchenDietLabelForCode: () => 'Senza latte'
    });
    module.syncAdminDietLabelField({ resetValue: true });
    assert.equal(input.value, 'Senza latte');
    assert.equal(input.disabled, role === 'MANAGER');
  }
});

test('a rejected notification permission is caught and restores the disabled preference', async () => {
  const target = { value: 'enabled', disabled: false };
  const stored = [], statuses = [];
  let cleared = 0;
  const module = functions(['handleMealReminderPreferenceChange', 'setContextualTranslation'], {
    elements: { mealReminderStatus: { ...field(), dataset: {} } }, t: key => key, mealRemindersAreSupported: () => true,
    Notification: { permission: 'default', requestPermission: async () => { throw new DOMException('test', 'NotAllowedError'); } },
    storeMealReminderPreference: enabled => stored.push(enabled), clearMealReminderTimers: () => cleared++,
    syncMealReminderControl: key => { statuses.push(key); target.value = 'disabled'; }
  });
  await module.handleMealReminderPreferenceChange({ target });
  assert.deepEqual(stored, [false]);
  assert.deepEqual(statuses, ['mealReminder.status.failed']);
  assert.equal(cleared, 1);
  assert.equal(target.disabled, false);
  assert.equal(target.value, 'disabled');
});

function reminderHarness() {
  const state = { residentReady: true, selectedParticipant: { participantId: 'synthetic' },
    mode: 'summary', participantWeek: [], participantMonth: [], centerContactSettings: { timezone: 'Europe/Rome' } };
  const timers = new Map();
  const days = [{ date: '2026-10-12', isToday: true, meals: [{ mealDate: '2026-10-12', mealTypeId: 'lunch',
    isOpen: true, effect: 'ABSENT', closesAt: new Date(Date.now() + 30 * 60000).toISOString() }] }];
  const deps = { state, buildMealReminderPlan, getCenterToday: () => new Date(), getLocale: () => 'it',
    mealRemindersAreSupported: () => true, loadMealReminderPreference: () => true, Notification: { permission: 'granted' },
    loadSentMealReminderIds: () => [], mealReminderTimers: timers, mealReminderInFlight: new Set(),
    window: { clearTimeout: noop, setTimeout: () => 'timer' }, loadParticipantWeek: async () => days };
  const module = functions(['refreshMealReminderDays', 'getLoadedResidentCalendarDays',
    'scheduleMealRemindersFromCurrentCalendar', 'clearMealReminderTimers'], deps);
  return { state, timers, days, deps, module };
}

test('a fresh Summary view loads today independently and plans its reminder', async () => {
  const { state, timers, module } = reminderHarness();
  await module.refreshMealReminderDays();
  module.scheduleMealRemindersFromCurrentCalendar();
  assert.equal(timers.size, 1);
  assert.deepEqual(state.participantWeek, []);
  assert.deepEqual(state.participantMonth, []);
});

test('late reminder data for an old participant does not overwrite current data', async () => {
  const { state, days, deps } = reminderHarness();
  let release;
  deps.loadParticipantWeek = () => new Promise(resolve => { release = resolve; });
  const module = functions(['refreshMealReminderDays'], deps);
  const loading = module.refreshMealReminderDays();
  state.selectedParticipant = { participantId: 'other' };
  release(days);
  await loading;
  assert.equal(state.mealReminderDays, undefined);
});

test('fresh reminder data replaces stale today data left by a previous calendar view', async () => {
  const { state, days, module } = reminderHarness();
  state.participantMonth = [{ ...days[0], meals: [] }];
  await module.refreshMealReminderDays();
  assert.equal(module.getLoadedResidentCalendarDays().length, 1);
  assert.equal(module.getLoadedResidentCalendarDays()[0].meals.length, 1);
});

test('duplicate responsible signature is rejected before configuration or passwords are written', async () => {
  const elements = Object.fromEntries(['adminCenterSettingsSave', 'adminCenterSettingsSection',
    'adminCenterSettingsStatus', 'adminAdministratorName', 'adminAdministratorSignature',
    'adminAdministratorEmail'].map(key => [key, field()]));
  elements.adminAdministratorSignature.value = 'NEXT';
  const state = { centerContactSettings: { administratorSignature: 'OLD' }, adminParticipants: [
    { participantId: 'a', signature: 'OLD' }, { participantId: 'b', signature: 'NEXT' }
  ] };
  let writes = 0;
  const module = functions(['performAdminCenterSettingsSave', 'saveAdministratorAsParticipant'], {
    state, elements, CAPABILITIES, hasCurrentCapability: () => true,
    updateAdministratorPassword: () => writes++, updateCenterSettings: () => writes++,
    friendlyErrorMessage: error => error.message
  });
  await module.performAdminCenterSettingsSave();
  assert.equal(writes, 0);
  assert.match(elements.adminCenterSettingsStatus.textContent, /sigla appartiene/);
  assert.equal(state.centerContactSettings.administratorSignature, 'OLD');
});

test('installed manifests preserve the requested center in both start URL and identity', async () => {
  const workerSource = await readFile(new URL('../../prototypes/firebase-spark-pwa/public/sw.js', import.meta.url), 'utf8');
  const manifests = new Map(await Promise.all(['manifest.webmanifest', 'manifest-kitchen.webmanifest'].map(async name => [
    '/' + name, await readFile(new URL('../../prototypes/firebase-spark-pwa/public/' + name, import.meta.url), 'utf8')
  ])));
  const listeners = {};
  const context = vm.createContext({ URL, Response, JSON,
    self: { location: { origin: 'https://example.test' }, addEventListener: (name, handler) => { listeners[name] = handler; } },
    caches: { open: async () => ({ match: async path => new Response(manifests.get(path)) }) }
  });
  vm.runInContext(workerSource, context);
  for (const name of manifests.keys()) {
    let response;
    listeners.fetch({ request: { method: 'GET', url: `https://example.test${name}?c=center_second` },
      respondWith: promise => { response = promise; } });
    const manifest = await (await response).json();
    const start = new URL(manifest.start_url, 'https://example.test');
    assert.equal(start.searchParams.get('c'), 'center_second');
    assert.equal(manifest.id, manifest.start_url);
    assert.equal(start.searchParams.get('view'), name.includes('kitchen') ? 'kitchen' : null);
  }
});

test('a post-commit membership error accurately reports the saved configuration and person', async () => {
  const elements = Object.fromEntries(['adminCenterSettingsSave', 'adminCenterSettingsSection',
    'adminCenterSettingsStatus', 'adminAdministratorName', 'adminAdministratorSignature',
    'adminAdministratorEmail', 'adminCenterName', 'adminCenterTimezone', 'adminCutoffLunch',
    'adminCutoffDinner', 'adminCutoffBreakfast'].map(key => [key, field()]));
  const state = { adminRole: 'OWNER', centerContactSettings: {} };
  const module = functions(['performAdminCenterSettingsSave'], {
    state, elements, CAPABILITIES, PERSONAL_APPEARANCE_DEFAULTS: {},
    hasCurrentCapability: () => true, requiresAdministratorPassword: () => false,
    getCurrentUser: () => ({ email: 'owner@example.test' }),
    saveAdministratorAsParticipant: async () => ({ participantId: 'saved-person' }),
    updateCenterSettings: async () => ({ name: 'Centro salvato', commonPassword: null, administratorParticipantId: 'saved-person' }),
    applyResidentPreferences: settings => settings,
    linkCurrentAdministratorParticipant: async () => { throw new Error('Errore di collegamento sintetico'); },
    friendlyErrorMessage: error => error.message
  });
  await module.performAdminCenterSettingsSave();
  assert.equal(state.centerContactSettings.name, 'Centro salvato');
  assert.equal(state.adminParticipantId, 'saved-person');
  assert.match(elements.adminCenterSettingsStatus.textContent, /Configurazione e Persona salvate/);
  assert.doesNotMatch(elements.adminCenterSettingsStatus.textContent, /Centro non salvato/);
  assert.equal(elements.adminCenterSettingsSave.disabled, false);
});
