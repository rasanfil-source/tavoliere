import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { functions } from '../helpers/app-functions.mjs';
import { residentReopenHarness } from '../helpers/resident-reopen.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { CORE_FALLBACKS } from '../../prototypes/firebase-spark-pwa/public/i18n/i18n.mjs';

for (const locale of ['it', 'en', 'es', 'fr', 'de', 'ca']) {
  test(`calendar loading, failure and retry are translated before catalogs load (${locale})`, () => {
    const state = { mode: 'week' };
    const target = { dataset: {} };
    const h = functions(['renderCalendarPlaceholder'], { state,
      elements: { participantMeals: target, weekOperations: {} }, calendarLoadContextKey: () => 'week:person',
      t: key => { assert.ok(CORE_FALLBACKS[locale][key], key); return CORE_FALLBACKS[locale][key]; },
      escapeHtml: value => value, renderWeekControls() {}
    });
    h.renderCalendarPlaceholder();
    assert.ok(target.innerHTML.includes(CORE_FALLBACKS[locale]['common.status.loading']));
    state.calendarLoadErrorKey = 'week:person';
    h.renderCalendarPlaceholder();
    assert.match(target.innerHTML, /data-calendar-retry/);
    assert.ok(target.innerHTML.includes(CORE_FALLBACKS[locale]['calendar.loadFailed']));
    h.renderCalendarPlaceholder();
    assert.match(target.innerHTML, /data-calendar-retry/);
    state.calendarLoadErrorKey = 'other-person';
    h.renderCalendarPlaceholder();
    assert.doesNotMatch(target.innerHTML, /data-calendar-retry/);
  });
}

for (const mode of ['week', 'participant']) {
  test(`initial network failure becomes an error and explicit retry loads ${mode}`, async () => {
    let offline = true;
    let retryCount = 0;
    const h = residentReopenHarness({ mode, overrides: {
      loadCenterCalendarSettings: async () => {
        if (offline) throw Object.assign(new Error('offline'), { code: 'unavailable' });
        return { timezone: 'Europe/Rome' };
      }, scheduleBackgroundRefresh: () => { retryCount++; }
    } });
    await h.run();
    assert.ok(h.state.calendarLoadErrorKey);
    assert.equal(retryCount, 0);
    offline = false;
    await h.run();
    assert.equal(h.state.calendarLoadErrorKey, '');
    assert.ok((mode === 'week' ? h.state.participantWeek : h.state.participantMonth).length);
  });
}

test('invalid invitation IDs fail before any database call in every language', async () => {
  for (const locale of ['it', 'en', 'es', 'fr', 'de', 'ca']) {
    const catalog = JSON.parse(await readFile(new URL(`../../prototypes/firebase-spark-pwa/public/i18n/${locale}.json`, import.meta.url)));
    const h = await loadBrowserModule('admin-center.js', { t: key => catalog[key] },
      ['revokeAdministratorInvitation', 'rejectAdministratorInvitation']);
    for (const method of Object.values(h)) {
      await assert.rejects(method('bad-id', { uid: 'user' }), error => error.message === catalog['admin.invitations.invalidId']);
    }
  }
});

test('inactive operational links expire without continuous reads', async () => {
  let now = 0, reads = 0;
  class Clock extends Date { static now() { return now; } constructor(value) { super(value ?? now); } }
  const h = await loadBrowserModule('access-links.js', {
    db: {}, Date: Clock, getActiveCenterId: () => 'center', doc: (_, ...path) => path.join('/'),
    getDoc: async () => { reads++; return { exists: () => false }; }
  }, ['loadOperationalLinks']);
  await h.loadOperationalLinks();
  const firstReads = reads;
  now = 59000;
  await h.loadOperationalLinks();
  assert.equal(reads, firstReads);
  now = 61000;
  await h.loadOperationalLinks();
  assert.ok(reads > firstReads);
});

test('calendar invalidated during a read schedules one recovery, but obsolete views do not', async () => {
  for (const navigate of [false, true]) {
    let release, started;
    const pending = new Promise(resolve => { release = resolve; });
    const reading = new Promise(resolve => { started = resolve; });
    const retries = [];
    const h = residentReopenHarness({ read: async (name, value) => {
      if (name === 'mealWindows') { started(); await pending; }
      return value;
    }, overrides: { scheduleBackgroundRefresh: source => retries.push(source) } });
    const run = h.run();
    await reading;
    // Attende che l'orchestratore raggiunga la lettura del calendario dopo il precaricamento parallelo.
    await new Promise(resolve => setImmediate(resolve));
    h.invalidateCalendar();
    if (navigate) { h.state.mode = 'summary'; h.state.participantRequestVersion++; }
    release();
    await run;
    assert.equal(h.state.participantWeek.length, 0);
    assert.deepEqual(retries, navigate ? [] : ['contesto-calendario']);
  }
});

test('saving kitchen layout updates persistent presentation and preserves other preferences', async () => {
  const storage = new Map();
  storage.set('tavolaComune.centerPresentation', JSON.stringify({ kitchenLayout: 'classic', language: 'de', name: 'Center' }));
  const h = await loadBrowserModule('center-settings.js', {
    db: {}, getActiveCenterId: () => 'center', doc: (_, ...path) => path.join('/'),
    getCenterScopedStorageKey: key => key,
    window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
    runTransaction: async (_, action) => action({ get: async () => ({ exists: () => true }), update() {} }),
    serverTimestamp: () => 'now', normalizeReservationCutoffs: value => value,
    normalizeKitchenDietLegend: value => value
  }, ['updateKitchenLayout']);
  await h.updateKitchenLayout('international');
  const cached = JSON.parse(storage.get('tavolaComune.centerPresentation'));
  assert.equal(cached.kitchenLayout, 'international');
  assert.equal(cached.language, 'de');
  assert.equal(cached.name, 'Center');
});

test('identity changes during first calendar read recover only while still signed in', async () => {
  for (const signedIn of [true, false]) {
    let release, started;
    const wait = new Promise(resolve => { release = resolve; });
    const reading = new Promise(resolve => { started = resolve; });
    const retries = [];
    const h = residentReopenHarness({ read: async (name, value) => {
      if (name === 'mealWindows') { started(); await wait; }
      return value;
    }, overrides: { scheduleBackgroundRefresh: source => retries.push(source) } });
    const run = h.run();
    await reading;
    await new Promise(resolve => setImmediate(resolve));
    h.user.uid = signedIn ? 'renewed-user' : undefined;
    if (!signedIn) h.state.residentReady = false;
    release();
    await run;
    assert.equal(h.state.participantWeek.length, 0);
    assert.deepEqual(retries, signedIn ? ['contesto-calendario'] : []);
  }
});
