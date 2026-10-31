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

async function dataHarness({ failCommit = null, clock = null } = {}) {
  const documents = new Map();
  documents.set('centers/test', { timezone: 'Europe/Rome', reservationCutoffs: { dinner: '17:00' } });
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock?.now ?? Date.now()])); }
    static now() { return clock?.now ?? Date.now(); }
  }
  const snapshot = ref => ({ exists: () => documents.has(ref), data: () => documents.get(ref) });
  const merge = (ref, value) => documents.set(ref, { ...documents.get(ref), ...value });
  const module = await loadBrowserModule('daily-operations.js', {
    Date: ClockDate,
    serverNow: () => ClockDate.now(),
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

function openLunch(documents, dateId) {
  documents.set(`centers/test/mealWindows/${dateId}_lunch`, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
}

test('benedizione e Messa si salvano indipendentemente, anche con cache precedente', async () => {
  const { module, documents } = await dataHarness();
  const date = new Date(Date.now() + 86400000 * 2), key = `centers/test/dailyOperations/${formatDateId(date)}`;
  documents.set(`centers/test/mealWindows/${formatDateId(date)}_dinner`, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
  openLunch(documents, formatDateId(date));
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
  openLunch(denied.documents, id);
  denied.documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
  await assert.rejects(denied.module.saveBlessing(date, '18:30'), { code: 'permission-denied' });
  const race = await dataHarness({ failCommit: documents => {
    documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() - 1000) });
    return Object.assign(new Error('denied'), { code: 'permission-denied' });
  } });
  race.documents.set(key, { status: 'OPEN', closesAt: new Date(Date.now() + 86400000) });
  openLunch(race.documents, id);
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

async function cutoffHarness(now = '2030-06-02T10:00:00Z', options = {}) {
  const clock = { now: Date.parse(now) };
  const h = await dataHarness({ ...options, clock });
  const date = new Date(2030, 5, 2, 12), id = '2030-06-02';
  h.documents.set(`centers/test/mealWindows/${id}_lunch`, { status: 'OPEN', closesAt: new Date('2030-06-02T08:00:00Z') });
  h.documents.set(`centers/test/mealWindows/${id}_dinner`, { status: 'OPEN', closesAt: new Date('2030-06-02T15:00:00Z') });
  const key = `centers/test/dailyOperations/${id}`;
  return { ...h, date, id, key, clock,
    seed: time => h.documents.set(key, { dateId: id, massScheduled: true, blessingTime: time }) };
}

test('prima del limite pranzo si può inserire, modificare e cancellare; al limite esatto la fascia si blocca', async () => {
  const h = await cutoffHarness('2030-06-02T07:59:59.999Z');
  h.seed('');
  await h.module.saveBlessing(h.date, '15:00');
  await h.module.saveBlessing(h.date, '16:00');
  await h.module.saveBlessing(h.date, '');
  assert.equal(h.documents.get(h.key).massScheduled, true);
  h.clock.now = Date.parse('2030-06-02T08:00:00Z');
  for (const time of ['15:00', '17:00']) {
    await assert.rejects(h.module.saveBlessing(h.date, time), { code: 'blessing/lunch-cutoff' });
  }
  await h.module.saveBlessing(h.date, '17:01');
});

test('alle 12 rifiuta le 15; dopo il pranzo modifica e cancella soltanto benedizioni oltre il limite cena', async () => {
  const h = await cutoffHarness();
  await assert.rejects(h.module.saveBlessing(h.date, '15:00'), { code: 'blessing/lunch-cutoff' });
  assert.equal(h.documents.has(h.key), false);
  await h.module.saveBlessing(h.date, '18:00');
  await h.module.saveBlessing(h.date, '19:00');
  await assert.rejects(h.module.saveBlessing(h.date, '16:00'), { code: 'blessing/lunch-cutoff' });
  assert.equal(h.documents.get(h.key).blessingTime, '19:00');
  await h.module.saveBlessing(h.date, '');
  assert.equal(h.documents.get(h.key).blessingTime, '');
});

test('una benedizione già bloccata non si può cancellare né spostare oltre cena; la Messa resta indipendente', async () => {
  const h = await cutoffHarness();
  h.seed('15:00');
  for (const time of ['', '16:00', '18:00']) {
    await assert.rejects(h.module.saveBlessing(h.date, time), { code: 'blessing/lunch-cutoff' });
    assert.equal(h.documents.get(h.key).blessingTime, '15:00');
  }
  await h.module.saveMassStatus(h.date, false);
  assert.equal(h.documents.get(h.key).blessingTime, '15:00');
  await h.module.saveBlessing(h.date, '15:00'); // Nessuna modifica all'orario.
  assert.equal(h.documents.get(h.key).massScheduled, false);
});

test('limite cena: modifica e cancellazione consentite prima, rifiutate al limite e dopo', async () => {
  const h = await cutoffHarness('2030-06-02T14:59:59.999Z');
  await h.module.saveBlessing(h.date, '18:00');
  await h.module.saveBlessing(h.date, '19:00');
  await h.module.saveBlessing(h.date, '');
  await h.module.saveBlessing(h.date, '18:00');
  for (const now of ['2030-06-02T15:00:00Z', '2030-06-02T15:00:00.001Z']) {
    h.clock.now = Date.parse(now);
    for (const time of ['19:00', '']) await assert.rejects(h.module.saveBlessing(h.date, time), { code: 'blessing/cutoff' });
    assert.equal((await h.module.loadDailyOperation(h.date, { forceRefresh: true })).blessingTime, '18:00');
  }
});

test('configurazione personalizzata, fuso del centro e cambio giorno conservano la benedizione', async () => {
  const h = await cutoffHarness('2030-06-01T14:59:00Z'); // 23:59 Tokyo
  h.documents.set('centers/test', { timezone: 'Asia/Tokyo', reservationCutoffs: { dinner: '18:45' } });
  h.documents.set(`centers/test/mealWindows/${h.id}_lunch`, { status: 'OPEN', closesAt: new Date('2030-06-02T01:00Z') });
  h.documents.set(`centers/test/mealWindows/${h.id}_dinner`, { status: 'OPEN', closesAt: new Date('2030-06-02T09:45Z') });
  await h.module.saveBlessing(h.date, '15:00', { timezone: 'Asia/Tokyo' });
  h.clock.now = Date.parse('2030-06-01T15:01:00Z');
  assert.equal((await h.module.loadDailyOperation(h.date, { forceRefresh: true })).blessingTime, '15:00');
  await h.module.saveBlessing(h.date, '');
  h.clock.now = Date.parse('2030-06-02T03:00:00Z'); // 12:00 Tokyo
  await assert.rejects(h.module.saveBlessing(h.date, '18:45', { timezone: 'Asia/Tokyo' }), { code: 'blessing/lunch-cutoff' });
  await h.module.saveBlessing(h.date, '18:46', { timezone: 'Asia/Tokyo' });
});

test('calendario pranzo assente o invalido non consente nuove benedizioni', async () => {
  const h = await cutoffHarness();
  const key = `centers/test/mealWindows/${h.id}_lunch`;
  h.documents.delete(key);
  await assert.rejects(h.module.saveBlessing(h.date, '18:00'), { code: 'blessing/calendar-unavailable' });
  h.documents.set(key, { status: 'OPEN', closesAt: 'invalid' });
  await assert.rejects(h.module.saveBlessing(h.date, '18:00'), { code: 'blessing/calendar-unavailable' });
  h.documents.set(key, { status: 'CLOSED', closesAt: new Date('2030-06-02T13:00Z') });
  await assert.rejects(h.module.saveBlessing(h.date, '15:00'), { code: 'blessing/lunch-cutoff' });
  await h.module.saveBlessing(h.date, '18:00');
});

test('scadenza pranzo fra lettura e commit restituisce il messaggio specifico', async () => {
  const h = await cutoffHarness('2030-06-02T07:59:59Z', { failCommit: documents => {
    documents.set('centers/test/mealWindows/2030-06-02_lunch', { status: 'CLOSED', closesAt: new Date('2030-06-02T08:00Z') });
    return Object.assign(new Error('denied'), { code: 'permission-denied' });
  } });
  await assert.rejects(h.module.saveBlessing(h.date, '15:00'), { code: 'blessing/lunch-cutoff' });
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

for (const [code, key] of [['blessing/cutoff', 'blessing.cutoff'], ['blessing/past-time', 'blessing.pastTime'], ['blessing/lunch-cutoff', 'blessing.lunchCutoff']]) {
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
