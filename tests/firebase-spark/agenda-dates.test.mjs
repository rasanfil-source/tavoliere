import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { functions, functionSource } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import { formatDateId } from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import { escapeHtml } from '../../prototypes/firebase-spark-pwa/public/html-utils.js';
import { buildSummaryMatrixScreens, buildKitchenMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const locales = ['it', 'en', 'fr', 'es', 'de', 'ca'];
const catalogs = Object.fromEntries(await Promise.all(locales.map(async locale => [locale,
  JSON.parse(await readFile(new URL(`../../prototypes/firebase-spark-pwa/public/i18n/${locale}.json`, import.meta.url)))])));
const catalog = catalogs.it;
const t = (key, values = {}) => (catalog[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');

function setup(todayId = '2026-10-17', locale = 'it') {
  const translate = (key, values = {}) => (catalogs[locale][key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  let today = new Date(todayId + 'T12:00:00');
  const elements = {
    weekOperationsDay: {}, weekOperationsDate: {}, weekInvitedDay: { value: '0', options: [{}, {}] },
    weekDietDuration: { options: [{}, {}] }, weekKitchenNoteInput: { value: 'old draft' }, weekKitchenNoteDate: {},
    weekInvitedInputs: ['lunch', 'dinner', 'breakfast'].map(meal => ({ dataset: { weekInvitedMeal: meal } })),
    weekInvitedSave: {}, weekInvitedStatus: {}, weekOperations: { open: true }
  };
  const state = { mode: 'week', weekOperationalDateId: '', weekOperationsRequestVersion: 0 };
  const labels = elements.weekInvitedInputs.map(input => ({ dataset: { weekInvitedLabel: input.dataset.weekInvitedMeal } }));
  const reads = [], saves = [], stored = new Map();
  let finishSave;
  let deferSave = false;
  const formatDateTime = (date, options) => new Intl.DateTimeFormat(locale, options).format(date);
  const app = functions(['prepareWeekOperationalDate', 'handleWeekOperationalDateChange', 'syncWeekOperationDateLabels',
    'openWeekOperationalDatePicker',
    'getWeekInvitedDates', 'refreshWeekInvited', 'handleWeekInvitedSave', 'addCalendarDays', 'parseDateId',
    'refreshWeekInvitedOnNewDay'], {
    state, elements, formatDateId, escapeHtml, t: translate, formatDateTime,
    formatCalendarWeekLabel: date => formatDateTime(date, { weekday: 'short', day: 'numeric', month: 'short' }),
    getCenterToday: () => new Date(today), getActiveCenterId: () => 'center', canManageDailyOperations: () => true,
    weekInvitedRequest: 0, weekInvitedLoaded: null, weekInvitedTodayId: null,
    document: { hidden: false, querySelectorAll: () => labels },
    refreshWeekOperations: async () => {
      state.weekOperationsRequestVersion++;
      return app.refreshWeekInvited(true);
    },
    loadDailyHealth: async date => {
      reads.push(formatDateId(date));
      return { invitedMeals: stored.get(formatDateId(date)) || {} };
    },
    saveInvitedMeals: async (date, meals) => {
      saves.push({ dateId: formatDateId(date), meals });
      if (deferSave) await new Promise(resolve => { finishSave = resolve; });
    },
    renderWeekInvitedStatus: () => { elements.weekInvitedStatus.textContent = 'saved'; },
    blockOfflineAction: () => false, friendlyErrorMessage: error => error.message
  });
  return { app, elements, state, labels, reads, saves, stored,
    today: value => { today = new Date(value + 'T12:00:00'); },
    deferSave: () => { deferSave = true; }, finishSave: () => finishSave() };
}

for (const locale of locales) {
  test(`giorno di riferimento, invitati e durate dieta sono tradotti in ${locale}`, async () => {
    const h = setup('2026-10-17', locale);
    h.app.prepareWeekOperationalDate();
    assert.equal(h.elements.weekInvitedDay.options[0].textContent, catalogs[locale]['time.today']);
    assert.equal(h.elements.weekInvitedDay.options[1].textContent, catalogs[locale]['time.tomorrow']);
    assert.ok(h.elements.weekOperationsDay.innerHTML.includes(escapeHtml(catalogs[locale]['time.today'])));
    await h.app.handleWeekOperationalDateChange({ target: { value: '2026-11-20' } });
    const label = date => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
    const first = new Date(2026, 10, 20, 12), second = new Date(2026, 10, 21, 12);
    assert.equal(h.elements.weekInvitedDay.options[0].textContent, label(first));
    assert.equal(h.elements.weekInvitedDay.options[1].textContent, label(second));
    assert.equal(h.elements.weekDietDuration.options[0].textContent,
      catalogs[locale]['week.operations.duration.todayOnly'] + ` (${label(first)})`);
    const pair = catalogs[locale]['week.operations.datePair']
      .replace('{first}', new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(first))
      .replace('{second}', new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(second));
    assert.equal(h.elements.weekDietDuration.options[1].textContent,
      catalogs[locale]['week.operations.duration.todayAndNext'] + ` (${pair})`);
    assert.ok(h.labels[0].textContent.includes(catalogs[locale]['meal.type.lunch']));
    assert.ok(h.labels[2].textContent.includes(label(second)));
    assert.equal(h.elements.weekKitchenNoteDate.textContent,
      catalogs[locale]['week.operations.note.forDate'].replace('{date}', label(first)));
    assert.equal(h.elements.weekKitchenNoteDate.hidden, false);
    await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-18' } });
    assert.equal(h.elements.weekKitchenNoteDate.textContent, catalogs[locale]['week.operations.note.forTomorrow']);
    await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-17' } });
    assert.equal(h.elements.weekKitchenNoteDate.hidden, true);
    assert.equal(h.elements.weekKitchenNoteDate.textContent, '');
  });
}

test('agenda offers today and six following days independently of the personal calendar', () => {
  const h = setup('2026-12-29');
  h.app.prepareWeekOperationalDate([new Date(2026, 11, 21)]);
  assert.deepEqual([...h.elements.weekOperationsDay.innerHTML.matchAll(/value="([^"]+)"/g)].map(match => match[1]),
    ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04']);
  assert.equal(h.elements.weekOperationsDay.value, '2026-12-29');
  assert.match(h.elements.weekOperationsDay.innerHTML, />Oggi</);
  assert.equal(h.elements.weekOperationsDate.min, '2026-12-29');
});

test('l’icona apre direttamente il selettore nativo a ogni tocco', () => {
  const h = setup();
  let opened = 0;
  h.elements.weekOperationsDate.showPicker = () => opened++;
  h.app.openWeekOperationalDatePicker();
  h.app.openWeekOperationalDatePicker();
  assert.equal(opened, 2);
});

test('il selettore rispetta la copertura del centro e si aggiorna dopo un’estensione', async () => {
  const h = setup();
  h.state.weekCalendarCoverage = { through: '2026-10-20' };
  h.app.prepareWeekOperationalDate();
  assert.equal(h.elements.weekOperationsDate.max, '2026-10-20');
  assert.doesNotMatch(h.elements.weekOperationsDay.innerHTML, /2026-10-21/);
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-21' } });
  assert.equal(h.state.weekOperationalDateId, '2026-10-17');
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-20' } });
  assert.equal(h.elements.weekDietDuration.options[1].disabled, true);
  assert.equal(h.elements.weekInvitedDay.options[1].disabled, true);
  assert.equal(h.elements.weekInvitedInputs.find(input => input.dataset.weekInvitedMeal === 'breakfast').disabled, true);
  h.state.weekCalendarCoverage = { through: '2026-11-20' };
  h.app.prepareWeekOperationalDate();
  assert.equal(h.elements.weekOperationsDate.max, '2026-11-20');
  assert.equal(h.elements.weekDietDuration.options[1].disabled, false);
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-11-20' } });
  assert.equal(h.state.weekOperationalDateId, '2026-11-20');
});

test('choosing a distant date makes it the master for invited guests and diet durations', async () => {
  const h = setup();
  h.app.prepareWeekOperationalDate();
  h.elements.weekInvitedDay.value = '1';
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-11-20' } });
  assert.equal(h.state.weekOperationalDateId, '2026-11-20');
  assert.equal(h.elements.weekOperationsDay.value, '2026-11-20');
  assert.equal(h.elements.weekOperationsDate.value, '2026-11-20');
  assert.match(h.elements.weekOperationsDay.innerHTML, /value="2026-11-20"/);
  assert.equal(h.elements.weekInvitedDay.value, '0');
  assert.match(h.elements.weekInvitedDay.options[0].textContent, /20 nov/);
  assert.match(h.elements.weekInvitedDay.options[1].textContent, /21 nov/);
  assert.match(h.elements.weekDietDuration.options[0].textContent, /Solo questo giorno \(ven 20 nov\)/);
  assert.equal(h.elements.weekDietDuration.options[1].textContent, 'Questo giorno e il successivo (20 e 21 nov)');
  assert.equal(h.elements.weekKitchenNoteInput.value, '');
  assert.deepEqual(h.reads, ['2026-11-20', '2026-11-21']);
  h.elements.weekInvitedInputs.forEach((input, i) => { input.value = String(i + 2); });
  await h.app.handleWeekInvitedSave();
  assert.deepEqual(h.saves, [{ dateId: '2026-11-20', meals: { lunch: 2, dinner: 3, breakfast: 4 } }]);
  h.elements.weekInvitedDay.value = '1';
  await h.app.refreshWeekInvited();
  assert.deepEqual(h.reads.slice(-2), ['2026-11-21', '2026-11-22']);
  assert.match(h.labels[2].textContent, /22 nov/);
});

test('invited loading, dirty preservation and saving accept a NodeList without map or some', async () => {
  const h = setup();
  const inputs = h.elements.weekInvitedInputs;
  h.elements.weekInvitedInputs = { ...inputs, length: inputs.length,
    forEach: callback => inputs.forEach(callback), [Symbol.iterator]: () => inputs.values() };
  assert.equal(h.elements.weekInvitedInputs.map, undefined);
  assert.equal(h.elements.weekInvitedInputs.some, undefined);
  h.app.prepareWeekOperationalDate();
  await h.app.refreshWeekInvited();
  assert.equal(h.elements.weekInvitedSave.disabled, false);
  inputs[0].value = '19';
  await h.app.refreshWeekInvited(true);
  assert.equal(inputs[0].value, '19');
  await h.app.handleWeekInvitedSave();
  assert.equal(h.saves[0].meals.lunch, 19);
  assert.equal(h.elements.weekInvitedSave.disabled, false);
});

test('refreshing agenda preserves unsaved invited counts on the same day', async () => {
  const h = setup();
  h.app.prepareWeekOperationalDate();
  await h.app.refreshWeekInvited();
  h.elements.weekInvitedInputs[0].value = '19';
  await h.app.refreshWeekInvited(true);
  assert.equal(h.elements.weekInvitedInputs[0].value, '19');
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-20' } });
  assert.equal(h.elements.weekInvitedInputs[0].value, '0');
});

test('diet date labels handle month and year boundaries and reset to today wording', async () => {
  const h = setup();
  for (const [dateId, pair] of [['2026-10-31', '31 ott e 1 nov'], ['2026-12-31', '31 dic 2026 e 1 gen 2027']]) {
    await h.app.handleWeekOperationalDateChange({ target: { value: dateId } });
    assert.ok(h.elements.weekDietDuration.options[1].textContent.includes(`(${pair})`));
  }
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-17' } });
  assert.equal(h.elements.weekInvitedDay.options[0].textContent, 'Oggi');
  assert.equal(h.elements.weekInvitedDay.options[1].textContent, 'Domani');
  assert.equal(h.elements.weekDietDuration.options[0].textContent, 'Solo questo giorno');
  assert.equal(h.elements.weekDietDuration.options[1].textContent, 'Questo giorno e il successivo');
  for (const invalid of ['', '2026-10-16', '2026-02-31']) {
    await h.app.handleWeekOperationalDateChange({ target: { value: invalid } });
    assert.equal(h.state.weekOperationalDateId, '2026-10-17');
  }
});

test('changing the master date during a save never writes the new day with old counts', async () => {
  const h = setup();
  h.app.prepareWeekOperationalDate();
  await h.app.refreshWeekInvited();
  h.elements.weekInvitedInputs.forEach(input => { input.value = '8'; });
  h.deferSave();
  const saving = h.app.handleWeekInvitedSave();
  await h.app.handleWeekOperationalDateChange({ target: { value: '2026-10-22' } });
  h.stored.set('2026-10-22', { lunch: 2, dinner: 3 });
  h.stored.set('2026-10-23', { breakfast: 4 });
  h.finishSave();
  await saving;
  assert.deepEqual(h.saves, [{ dateId: '2026-10-17', meals: { lunch: 8, dinner: 8, breakfast: 8 } }]);
  assert.deepEqual(h.elements.weekInvitedInputs.map(input => input.value), ['2', '3', '4']);
});

for (const targetDateId of ['2026-10-22', '2027-02-12']) {
test(`nota scritta a ottobre per ${targetDateId}: visibile nei riepiloghi Domani del giorno precedente`, async () => {
  const documents = new Map();
  const notes = await loadBrowserModule('kitchen-notes.js', {
    db: {}, formatDateId, getActiveCenterId: () => 'center', doc: (_, ...parts) => parts.at(-1),
    serverTimestamp: () => new Date('2026-10-17T12:00:00Z'),
    getDoc: async id => ({ exists: () => documents.has(id), data: () => documents.get(id) }),
    runTransaction: async (_, action) => action({
      get: async id => ({ exists: () => documents.has(id), data: () => documents.get(id) }),
      set: (id, value) => documents.set(id, value)
    })
  }, ['saveKitchenNote', 'loadKitchenNote']);
  const target = new Date(targetDateId + 'T12:00:00');
  await notes.saveKitchenNote(target, 'Festeggiamento di Marco a pranzo');
  const stored = documents.get(targetDateId);
  stored.messages[0].createdAt = '2026-10-17T12:00:00.000Z';
  delete stored.mealDate;
  const note = await notes.loadKitchenNote(target, { forceRefresh: true });
  assert.equal(note.mealDate, targetDateId, 'la data dei documenti precedenti deriva dal percorso');
  const days = [-1, 0, 1].map(offset => {
    const date = new Date(target);
    date.setDate(date.getDate() + offset);
    return formatDateId(date);
  }).map(dateId => ({ dateId,
    meals: ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, label: mealTypeId, present: [] })) }));
  const operations = [{ dateId: note.mealDate, notes: note.messages }];
  const dates = days.map(day => new Date(day.dateId + 'T12:00:00'));
  const summaryState = { centerContactSettings: {}, summaryDayOffset: 1, summaryPayloadCenterId: '',
    summaryDays: [], summaryOperations: [] };
  const kitchenState = { mode: 'kitchen', centerContactSettings: {}, kitchenDayOffset: 1,
    kitchenPayloadCenterId: '', kitchenDays: [], kitchenOperations: [], kitchenNotes: [], meals: [] };
  const payloadDependencies = {
    OPTIONAL_OPERATIONAL_READ_TIMEOUT_MS: 4000, window: { setTimeout, clearTimeout }, console,
    state: summaryState, formatDateId, getCenterToday: () => dates[0],
    loadDailyOperation: async () => null,
    loadDailyHealth: async () => ({ dietAssignments: [], sickPeople: [] }),
    loadKitchenNote: notes.loadKitchenNote,
    loadParticipantDaySummaries: async date => days.find(day => day.dateId === formatDateId(date)).meals,
    loadKitchenCounts: async date => days.find(day => day.dateId === formatDateId(date)).meals,
    applyDailyDietsToSummary: meals => meals, applyDailyDietsToKitchenMeals: meals => meals,
    reportOptionalOperationalRead: () => { throw new Error('Unexpected read failure'); }
  };
  const payloads = functions(['startOptionalOperationalRead', 'loadSummaryDayPayload', 'loadKitchenDayPayload',
    'alignSummaryPayloadState', 'storeSummaryDayPayload', 'alignKitchenPayloadState', 'storeKitchenDayPayload'], payloadDependencies);
  const kitchenPayloads = functions(['startOptionalOperationalRead', 'loadKitchenDayPayload',
    'alignKitchenPayloadState', 'storeKitchenDayPayload'], { ...payloadDependencies, state: kitchenState });
  payloads.alignSummaryPayloadState(dates, 'center');
  const summaryPayload = await payloads.loadSummaryDayPayload(dates[1], { source: 'manuale' });
  payloads.storeSummaryDayPayload(1, summaryPayload);
  assert.deepEqual(summaryState.summaryOperations[1].notes, note.messages);
  kitchenPayloads.alignKitchenPayloadState(dates, 'center');
  const kitchenPayload = await kitchenPayloads.loadKitchenDayPayload(dates[1], { source: 'manuale' });
  kitchenPayloads.storeKitchenDayPayload(1, kitchenPayload);
  const followingKitchenPayload = await kitchenPayloads.loadKitchenDayPayload(dates[2], { source: 'manuale' });
  kitchenPayloads.storeKitchenDayPayload(2, followingKitchenPayload);
  let kitchenView;
  const kitchenUI = functions(['renderMeals', 'filterKitchenNoteForToday'], {
    state: kitchenState, formatDateId, escapeHtml: value => value, getCenterToday: () => dates[0], isKitchenScreenReady: () => true,
    elements: { kitchenNote: {}, kitchenSick: {}, kitchenPanel: { querySelector: () => null }, cards: {} },
    renderKitchenHeading: () => {}, renderKitchenNote: () => {}, renderKitchenMass: () => {},
    renderKitchenSickPeople: () => {}, scheduleOperationalAutoScroll: () => {},
    getKitchenMonthlySummaryContext: () => null,
    mountSummaryMatrix: (_, options) => { kitchenView = options; }
  });
  kitchenUI.renderMeals();
  assert.deepEqual(kitchenView.operationDays[1].notes, note.messages);
  assert.equal(kitchenView.activeIndex, 1);
  const kitchenTomorrow = buildKitchenMatrixScreens(kitchenView.days, kitchenView.operationDays)[1];
  assert.equal(kitchenTomorrow.dateId, targetDateId);
  assert.equal(kitchenTomorrow.notesByDate[0].notes[0].text, 'Festeggiamento di Marco a pranzo');
  const view = await loadBrowserModule('summary-matrix-view.js', {
    t, escapeHtml, getLocale: () => 'it', normalizeDietCode: value => value, formatDietLabel: value => value,
    document: { documentElement: { dataset: { interfaceStyle: 'original' } } },
    window: { requestAnimationFrame: callback => callback() },
    getDietBadgeTone: () => '', normalizeKitchenDietLegend: () => []
  }, ['renderScreen', 'renderInternationalScreen', 'renderFutureSummary']);
  for (const build of [buildSummaryMatrixScreens, (days, _, ops) => buildKitchenMatrixScreens(days, ops)]) {
    const tomorrow = build(days, [], operations)[1];
    assert.equal(tomorrow.dateId, targetDateId);
    assert.equal(tomorrow.notesByDate[0].dateId, targetDateId);
    for (const kitchen of [false, true]) for (const render of [view.renderScreen, view.renderInternationalScreen]) {
      const html = render(tomorrow, { kitchen, activeIndex: 1 });
      assert.match(html, /Festeggiamento di Marco a pranzo/);
      assert.ok(html.includes(`datetime="${targetDateId}"`));
    }
  }
  const container = { innerHTML: '', querySelector: () => null };
  view.renderFutureSummary(container, buildSummaryMatrixScreens(days, [], summaryState.summaryOperations), 'name', 1);
  assert.match(container.innerHTML, /Festeggiamento di Marco a pranzo/);
});
}

test('the independent booking section precedes the agenda master date and its dependent sections', async () => {
  const html = await readFile(new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url), 'utf8');
  const booking = html.indexOf('data-week-booking-section');
  const master = html.indexOf('data-week-operations-day');
  const invited = html.indexOf('data-week-invited-section');
  assert.ok(booking > 0 && master > booking && invited > master);
  assert.match(html, /type="date" data-week-operations-date/);
  assert.match(html, /data-week-operations-date-toggle[\s\S]*aria-controls="agenda-date-picker"/);
  assert.doesNotMatch(html, /data-week-operations-date-field/);
});
