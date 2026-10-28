import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { functions } from '../helpers/app-functions.mjs';
import { escapeHtml } from '../../prototypes/firebase-spark-pwa/public/html-utils.js';
import { formatDateId } from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import { zonedLocalDateTimeToDate } from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';
import { buildKitchenMatrixScreens, buildSummaryMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const catalog = JSON.parse(await readFile(new URL('../../prototypes/firebase-spark-pwa/public/i18n/it.json', import.meta.url)));
const t = key => catalog[key] || key;

async function dataHarness({ failCommit = null } = {}) {
  const documents = new Map();
  const snapshot = ref => ({ exists: () => documents.has(ref), data: () => documents.get(ref) });
  const merge = (ref, value) => documents.set(ref, { ...documents.get(ref), ...value });
  const module = await loadBrowserModule('daily-operations.js', {
    db: {}, getActiveCenterId: () => 'test', doc: (_, ...parts) => parts.join('/'),
    formatDateId, zonedLocalDateTimeToDate, serverTimestamp: () => 'timestamp', getDoc: async ref => snapshot(ref),
    runTransaction: async (_, callback) => {
      const value = await callback({ get: async ref => snapshot(ref), set: failCommit ? () => {} : merge });
      if (failCommit) throw failCommit(documents);
      return value;
    },
    writeBatch: () => {
      const changes = [];
      return { set: (...args) => changes.push(args), commit: async () => changes.forEach(args => merge(...args)) };
    }
  }, ['loadDailyOperation', 'saveBlessing', 'saveMassStatus', 'validateBlessingTime']);
  return { module, documents };
}

test('benedizione e Messa si salvano indipendentemente, anche con cache precedente', async () => {
  const { module, documents } = await dataHarness();
  const date = new Date(Date.now() + 86400000 * 2), key = `centers/test/dailyOperations/${formatDateId(date)}`;
  documents.set(`centers/test/mealWindows/${formatDateId(date)}_dinner`, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
  assert.equal((await module.loadDailyOperation(date)).blessingTime, '');
  await module.saveBlessing(date, '18:30');
  assert.equal(documents.get(key).massScheduled, false);
  await module.saveMassStatus(date, true);
  assert.equal((await module.loadDailyOperation(date)).blessingTime, '18:30');
  await module.saveBlessing(date, '19:00');
  assert.equal(documents.get(key).massScheduled, true);
  await module.saveBlessing(date, '');
  assert.equal(documents.get(key).massScheduled, true);
  assert.equal((await module.loadDailyOperation(date)).blessingTime, '');
  documents.set(key, { ...documents.get(key), blessingTime: '20:00' });
  await module.saveMassStatus(date, false);
  assert.equal((await module.loadDailyOperation(date)).blessingTime, '20:00', 'rilettura dopo aggiornamento concorrente');
  for (const value of ['24:00', '18:60', '9:00', '18:30:00', null]) {
    await assert.rejects(module.saveBlessing(date, value), /Orario/);
  }
});

test('date e ore trascorse sono bloccate nel fuso del centro, anche a mezzanotte e al cambio ora', async () => {
  const { module } = await dataHarness();
  const now = new Date('2026-10-28T12:00:00Z');
  assert.throws(() => module.validateBlessingTime('2026-10-28', '12:59', 'Europe/Rome', now), { code: 'blessing/past-time' });
  assert.throws(() => module.validateBlessingTime('2026-10-28', '13:00', 'Europe/Rome', now), { code: 'blessing/past-time' });
  assert.doesNotThrow(() => module.validateBlessingTime('2026-10-28', '13:01', 'Europe/Rome', now));
  assert.throws(() => module.validateBlessingTime('2026-10-27', '23:59', 'Europe/Rome', now), { code: 'blessing/past-time' });
  assert.doesNotThrow(() => module.validateBlessingTime('2026-10-29', '00:01', 'Europe/Rome', now));
  assert.throws(() => module.validateBlessingTime('2026-10-28', '00:30', 'Asia/Tokyo', new Date('2026-10-27T16:00:00Z')), { code: 'blessing/past-time' });
  assert.throws(() => module.validateBlessingTime('2026-10-24', '13:00', 'Europe/Rome', new Date('2026-10-24T11:00:00Z')), { code: 'blessing/past-time' });
  assert.doesNotThrow(() => module.validateBlessingTime('2026-10-28', '', 'Europe/Rome', now));
});

test('scadenza, calendario assente e autentico rifiuto di accesso restano distinti', async () => {
  const date = new Date(Date.now() + 86400000), id = formatDateId(date);
  const key = `centers/test/mealWindows/${id}_dinner`;
  const h = await dataHarness();
  await assert.rejects(h.module.saveBlessing(date, '18:30'), { code: 'blessing/calendar-unavailable' });
  h.documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() - 1000) });
  await assert.rejects(h.module.saveBlessing(date, '18:30'), { code: 'blessing/cutoff' });
  assert.equal(h.documents.has(`centers/test/dailyOperations/${id}`), false);
  h.documents.set(key, { status: 'CLOSED', closesAt: new Date(Date.now() + 86400000) });
  await assert.rejects(h.module.saveBlessing(date, '18:30'), { code: 'blessing/cutoff' });
  const denied = await dataHarness({ failCommit: () => Object.assign(new Error('denied'), { code: 'permission-denied' }) });
  denied.documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
  await assert.rejects(denied.module.saveBlessing(date, '18:30'), { code: 'permission-denied' });
  const race = await dataHarness({ failCommit: documents => {
    documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() - 1000) });
    return Object.assign(new Error('denied'), { code: 'permission-denied' });
  } });
  race.documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
  await assert.rejects(race.module.saveBlessing(date, '18:30'), { code: 'blessing/cutoff' });
});

test('tutti i riepiloghi mostrano + e ora nel giorno giusto anche senza Messa', async () => {
  const days = ['2026-10-28', '2026-10-29', '2026-10-30'].map(dateId => ({ dateId,
    meals: ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, present: [], count: 0 })) }));
  const operations = days.map((day, i) => ({ dateId: day.dateId,
    dailyOperation: { massScheduled: false, blessingTime: i === 1 ? '18:30' : '' } }));
  const view = await loadBrowserModule('summary-matrix-view.js', {
    t, escapeHtml, getLocale: () => 'it', normalizeKitchenDietLegend: () => [],
    formatDietLabel: String, getDietBadgeTone: () => '', normalizeDietCode: String,
    document: { documentElement: { dataset: { interfaceStyle: 'original' } } },
    window: { requestAnimationFrame() {} }, buildKitchenMatrixScreens, buildSummaryMatrixScreens
  }, ['renderScreen', 'renderInternationalScreen', 'renderFutureSummary']);
  for (const kitchen of [false, true]) {
    const screens = kitchen ? buildKitchenMatrixScreens(days, operations) : buildSummaryMatrixScreens(days, [], operations);
    assert.equal(screens[0].columns.find(column => column.mealTypeId === 'lunch').blessingTime, '');
    assert.equal(screens[1].columns.find(column => column.mealTypeId === 'lunch').blessingTime, '18:30');
    for (const render of [view.renderScreen, view.renderInternationalScreen]) {
      const html = render(screens[1], { kitchen, activeIndex: 1 });
      assert.match(html, /Benedizione eucaristica \(18:30\)/);
      assert.match(html, /class="blessing-plus(?: blessing-plus-side)?"[^>]*>\+<\/span>/);
      assert.match(html, /class="blessing-icon" viewBox="0 0 24 24"[^>]*>/);
      assert.match(html, /(?:class="blessing-time" aria-hidden="true">|<small aria-hidden="true">)\(18:30\)/);
      assert.match(html, />No<\//);
    }
    if (!kitchen) {
      const container = { innerHTML: '', querySelector: () => null };
      view.renderFutureSummary(container, screens, 'name', 1);
      assert.match(container.innerHTML, /Benedizione eucaristica \(18:30\)/);
    }
  }
});

function formHarness() {
  const dateId = '2026-10-28';
  const state = { mode: 'week', weekOperationalDateId: dateId, weekOperationsRequestVersion: 1,
    centerContactSettings: {},
    weekAgendaReady: { blessing: true }, weekOperationalBlessing: { dateId, blessingTime: '' }, weekDailyOperations: [] };
  const elements = { weekBlessingSave: {}, weekBlessingEnabled: { checked: true },
    weekBlessingTime: { value: '18:30', reportValidity() {} }, weekBlessingStatus: {}, weekBlessingDate: {} };
  let resolve, reject;
  const pending = new Promise((done, fail) => { resolve = done; reject = fail; });
  const calls = [];
  const app = functions(['handleWeekBlessingSave', 'renderWeekBlessing', 'blessingSaveErrorMessage'], {
    state, elements, canManageDailyOperations: () => true, canManageMass: () => false,
    blockOfflineAction: () => false, getActiveCenterId: () => 'test', getCurrentUser: () => ({ uid: 'admin' }),
    parseDateId: id => id, formatCalendarDate: id => id, t, friendlyErrorMessage: e => e.message,
    saveBlessing: (...args) => { calls.push(args); return pending; }
  });
  return { state, elements, app, calls, resolve, reject };
}

test('il form richiede un orario e blocca il doppio salvataggio', async () => {
  const h = formHarness();
  h.elements.weekBlessingTime.value = '';
  await h.app.handleWeekBlessingSave();
  assert.equal(h.calls.length, 0);
  h.elements.weekBlessingTime.value = '18:30';
  const pending = h.app.handleWeekBlessingSave();
  await h.app.handleWeekBlessingSave();
  assert.equal(h.calls.length, 1);
  h.resolve({ dateId: '2026-10-28', blessingTime: '18:30', massScheduled: false });
  await pending;
  assert.equal(h.elements.weekBlessingSave.disabled, false);
  assert.equal(h.elements.weekBlessingStatus.textContent, 'Benedizione aggiornata.');
});

test('una risposta tardiva non modifica il giorno selezionato successivamente', async () => {
  const h = formHarness();
  const pending = h.app.handleWeekBlessingSave();
  h.state.weekOperationalDateId = '2026-10-29';
  h.state.weekOperationsRequestVersion++;
  h.elements.weekBlessingTime.value = '20:00';
  h.resolve({ dateId: '2026-10-28', blessingTime: '18:30' });
  await pending;
  assert.equal(h.elements.weekBlessingTime.value, '20:00');
});

for (const [code, key] of [['blessing/cutoff', 'blessing.cutoff'], ['blessing/past-time', 'blessing.pastTime']]) {
  test(`il form spiega ${code} e permette di correggere l’inserimento`, async () => {
    const h = formHarness();
    const pending = h.app.handleWeekBlessingSave();
    h.reject(Object.assign(new Error('errore'), { code }));
    await pending;
    assert.equal(h.elements.weekBlessingStatus.textContent, t(key));
    assert.doesNotMatch(h.elements.weekBlessingStatus.textContent, /ruolo|autorizzat/);
    assert.equal(h.elements.weekBlessingSave.disabled, false);
    assert.equal(h.elements.weekBlessingTime.value, '18:30');
  });
}

test('il liturgista vede soltanto Benedizioni, l’amministratore tutte le sezioni', () => {
  for (const admin of [false, true]) {
    const elements = { weekOperations: { open: false } };
    for (const key of ['Blessing', 'Booking', 'Invited', 'Health', 'Notes', 'Diet']) elements[`week${key}Section`] = { open: true };
    const app = functions(['renderWeekOperations'], { state: { mode: 'week' }, elements,
      bookingForView: null, canManageDailyOperations: () => admin, canManageMass: () => !admin });
    app.renderWeekOperations();
    assert.equal(elements.weekOperations.hidden, false);
    assert.equal(elements.weekBlessingSection.hidden, false);
    for (const key of ['Booking', 'Invited', 'Health', 'Notes', 'Diet']) {
      assert.equal(elements[`week${key}Section`].hidden, !admin);
      if (!admin) assert.equal(elements[`week${key}Section`].open, false);
    }
  }
});
