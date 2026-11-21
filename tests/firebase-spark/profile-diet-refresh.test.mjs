import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserModule, loadAppDietFunctions } from '../helpers/browser-module.mjs';
import { functions } from '../helpers/app-functions.mjs';
import * as reservation from '../../prototypes/firebase-spark-pwa/public/reservation-state.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';
import * as legend from '../../prototypes/firebase-spark-pwa/public/diet-legend.mjs';
import * as revision from '../../prototypes/firebase-spark-pwa/public/core/revision.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import { validateParticipantProfile } from '../../prototypes/firebase-spark-pwa/public/domain/participant-profile.mjs';
import { escapeHtml } from '../../prototypes/firebase-spark-pwa/public/html-utils.js';
import { buildKitchenMatrixScreens, buildSummaryMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

const todayId = '2030-01-02';
const dateIds = ['2030-01-01', todayId, '2030-01-03'];
const centerId = 'synthetic_center';
const personId = 'new_diet_person';
const existingDiet = { code: '3', label: 'Senza lattosio' };
const addedDiet = { code: '1', label: 'Ipocalorica' };
const existingOnly = [{ tag: existingDiet.code, count: 1 }];
const bothDiets = [{ tag: addedDiet.code, count: 1 }, ...existingOnly];
const mealTypeIds = ['lunch', 'dinner'];
const at = dateId => new Date(`${dateId}T12:00:00`);
const t = key => key;

async function scenario(initialDiet = 'STANDARD', bookedDiet = initialDiet) {
  const records = new Map();
  let currentDateId = todayId;
  const path = (...parts) => parts.join('/');
  const put = (collection, id, data) => records.set(path('centers', centerId, collection, id), data);
  const existingPersonId = 'existing_diet_person';
  for (const [participantId, code] of [[personId, initialDiet], [existingPersonId, existingDiet.code]]) {
    const person = { displayName: participantId, signature: participantId === personId ? 'ND' : 'ED',
      groupId: 'group_residenti', dietTags: [code], status: 'ACTIVE', revision: 0 };
    put('participants', participantId, person);
    put('publicParticipants', participantId, person);
    put('reservationRules', `rule_${participantId}`, { participantId, ...person,
      mealTypeIds, startsOn: '2020-01-01', endsOn: null });
    for (const mealDate of dateIds) {
      for (const mealTypeId of mealTypeIds) put('reservationOverrides', `${participantId}_${mealDate}_${mealTypeId}`, {
        participantId, mealDate, mealTypeId, effect: 'PRESENT', dietTags: [participantId === personId ? bookedDiet : code]
      });
    }
  }
  put('mealTypes', 'lunch', { label: 'Pranzo', status: 'ACTIVE' });
  put('mealTypes', 'dinner', { label: 'Cena', status: 'ACTIVE' });
  const centerSettings = {
    timezone: 'Europe/Rome',
    kitchenDietLegend: initialDiet === addedDiet.code ? [existingDiet, addedDiet] : [existingDiet]
  };
  records.set(path('centers', centerId), centerSettings);
  const snapshot = key => ({ id: key.split('/').at(-1), exists: () => records.has(key), data: () => records.get(key) });
  const dependencies = {
    ...reservation, ...diets, ...dates, ...legend, ...revision,
    db: {}, getActiveCenterId: () => centerId, t, validateParticipantProfile,
    doc: (_, ...parts) => path(...parts),
    collection: (_, ...parts) => ({ path: path(...parts) }),
    where: (field, operator, value) => ({ field, value }),
    query: (reference, ...filters) => ({ ...reference, filters }),
    getDoc: async key => snapshot(key),
    getDocs: async reference => ({ docs: [...records.keys()]
      .filter(key => key.startsWith(reference.path + '/') && key.split('/').length === reference.path.split('/').length + 1)
      .filter(key => (reference.filters || []).every(({ field, value }) => records.get(key)[field] === value))
      .map(snapshot) }),
    serverTimestamp: () => at(todayId),
    serverNow: () => Date.parse(`${currentDateId}T00:00:00+01:00`),
    loadCenterContactSettings: async () => centerSettings,
    invalidateCenterContactSettingsCache: () => {},
    appendAuditEvent: () => {}, AUDIT_ACTIONS: { UPSERT_PARTICIPANT: 'UPSERT_PARTICIPANT' },
    runTransaction: async (_, write) => {
      const writes = [];
      await write({ get: async key => snapshot(key), set: (key, value, options) => writes.push([key, value, options]) });
      for (const [key, value, options] of writes) records.set(key, { ...(options?.merge ? records.get(key) : {}), ...value });
    }
  };
  const summary = await loadBrowserModule('participant-data.js', dependencies,
    ['loadParticipantDaySummaries', 'invalidateParticipantDataCaches']);
  const kitchen = await loadBrowserModule('kitchen-data.js', dependencies, ['loadKitchenCounts']);
  const admin = await loadBrowserModule('admin-participant-data.js', { ...dependencies,
    invalidateParticipantDataCaches: summary.invalidateParticipantDataCaches }, ['saveAdminParticipant']);
  const health = await loadBrowserModule('daily-operations.js', dependencies, ['loadDailyHealth']);
  const daily = await loadAppDietFunctions({ ...diets, t });
  const view = await loadBrowserModule('summary-matrix-view.js', { ...diets, ...legend, escapeHtml, t }, ['renderKitchenDietLegend']);
  let staticVersion = 'before';
  return {
    async changeDiet(code, label = addedDiet.label, effectiveDateId = todayId) {
      currentDateId = effectiveDateId;
      const profile = records.get(path('centers', centerId, 'participants', personId));
      const currentLegend = records.get(path('centers', centerId)).kitchenDietLegend;
      await admin.saveAdminParticipant(personId, { ...profile, dietTags: [code], expectedRevision: profile.revision,
        kitchenDietLegend: code === 'STANDARD' ? undefined
          : legend.updateKitchenDietLegendEntry(currentLegend, code, label) });
      staticVersion = `after-${profile.revision + 1}`;
    },
    async read(dateId, assignments = [], currentDayId = currentDateId, mealTypeId = 'lunch') {
      const options = { todayId: currentDayId, staticVersion, sessionReady: true };
      put('dailyHealth', dateId, { dietAssignments: assignments });
      const { dietAssignments } = await health.loadDailyHealth(at(dateId), { forceRefresh: true });
      const summaryMeals = daily.applyDailyDietsToSummary(await summary.loadParticipantDaySummaries(at(dateId), options), dietAssignments);
      const kitchenMeals = daily.applyDailyDietsToKitchenMeals(await kitchen.loadKitchenCounts(at(dateId), options), dietAssignments)
        .map(meal => ({ ...meal, mealTypeId: meal.key }));
      const summaryScreen = buildSummaryMatrixScreens([{ dateId, meals: summaryMeals }])[0];
      const kitchenScreen = buildKitchenMatrixScreens([{ dateId, meals: kitchenMeals }])[0];
      const summaryColumn = summaryScreen.columns.find(meal => meal.mealTypeId === mealTypeId);
      const kitchenColumn = kitchenScreen.columns.find(meal => meal.mealTypeId === mealTypeId);
      const present = summaryMeals.find(meal => meal.mealTypeId === mealTypeId).present;
      assert.deepEqual(new Set(present.map(person => person.participantId)), new Set([personId, existingPersonId]));
      assert.equal(summaryColumn.total, 2);
      assert.equal(kitchenColumn.total, 2);
      assert.deepEqual(summaryColumn.specialDiets, kitchenColumn.specialDiets);
      return { diets: [...summaryColumn.specialDiets.items].sort((left, right) => Number(left.tag) - Number(right.tag)),
        centerLegend: records.get(path('centers', centerId)).kitchenDietLegend,
        legendHtml: view.renderKitchenDietLegend(kitchenScreen, records.get(path('centers', centerId)).kitchenDietLegend) };
    }
  };
}

test('D1 Ipocalorica compare dopo D3 Senza lattosio anche per pasti già prenotati', async () => {
  const app = await scenario();
  assert.deepEqual((await app.read(todayId)).diets, existingOnly);
  await app.changeDiet(addedDiet.code);
  for (const dateId of [todayId, '2030-01-03']) {
    const result = await app.read(dateId);
    assert.deepEqual(result.diets, bothDiets);
    assert.deepEqual(result.centerLegend, [addedDiet, existingDiet]);
    assert.match(result.legendHtml, /D1/);
    assert.match(result.legendHtml, /Ipocalorica/);
    assert.match(result.legendHtml, /D3/);
    assert.match(result.legendHtml, /Senza lattosio/);
  }
  assert.deepEqual((await app.read('2030-01-01')).diets, existingOnly);
});

test('le diete già salvate prima della correzione aggiornano subito i pasti di oggi e futuri', async () => {
  const app = await scenario(addedDiet.code, 'STANDARD');
  for (const dateId of [todayId, '2030-01-03']) {
    assert.deepEqual((await app.read(dateId)).diets, bothDiets);
  }
  assert.deepEqual((await app.read('2030-01-01')).diets, existingOnly);
});

test('le modifiche restano nei giorni corretti dopo mezzanotte e dopo altri cambi di dieta', async () => {
  const app = await scenario();
  await app.changeDiet(addedDiet.code);
  await app.changeDiet('7', 'In bianco', '2030-01-03');
  assert.deepEqual((await app.read(todayId)).diets, bothDiets);
  assert.deepEqual((await app.read('2030-01-03', [], '2030-01-04')).diets, [...existingOnly, { tag: '7', count: 1 }]);
  assert.deepEqual((await app.read('2030-01-01')).diets, existingOnly);
});

test('più correzioni nella stessa giornata conservano soltanto l’ultima dieta di quella giornata', async () => {
  const app = await scenario('7');
  await app.changeDiet(addedDiet.code);
  await app.changeDiet('STANDARD');
  const result = await app.read(todayId, [], '2030-01-03');
  assert.deepEqual(result.diets, existingOnly);
  assert.deepEqual(result.centerLegend, [addedDiet, existingDiet]);
  assert.deepEqual((await app.read('2030-01-01')).diets, [...existingOnly, { tag: '7', count: 1 }]);
});

test('cambiare o togliere la dieta aggiorna i pasti futuri conservando la dieta dei giorni passati', async () => {
  for (const code of [addedDiet.code, 'STANDARD']) {
    const app = await scenario('7');
    await app.changeDiet(code);
    const expected = code === 'STANDARD' ? existingOnly : bothDiets;
    for (const dateId of [todayId, '2030-01-03']) assert.deepEqual((await app.read(dateId)).diets, expected);
    assert.deepEqual((await app.read('2030-01-01')).diets, [...existingOnly, { tag: '7', count: 1 }]);
  }
});

test('una dieta occasionale prevale sulla nuova dieta anagrafica per il giorno e il pasto assegnati', async () => {
  const app = await scenario();
  await app.changeDiet(addedDiet.code);
  const assignments = [{ participantId: personId, dietTag: '9', mealTypeIds: ['lunch'] }];
  assert.deepEqual((await app.read(todayId, assignments)).diets, [...existingOnly, { tag: '9', count: 1 }]);
  assert.deepEqual((await app.read(todayId, assignments, todayId, 'dinner')).diets, bothDiets);
  assert.deepEqual((await app.read('2030-01-03')).diets, bothDiets);
});

test('le viste trasmettono la data corrente del centro a entrambi i conteggi', async () => {
  const reads = [];
  const module = functions(['loadKitchenDayPayload', 'loadSummaryDayPayload'], {
    formatDateId: dates.formatDateId, getCenterToday: () => at(todayId),
    loadKitchenCounts: async (_, options) => { reads.push(options.todayId); return []; },
    loadParticipantDaySummaries: async (_, options) => { reads.push(options.todayId); return []; },
    loadKitchenNote: async () => null, loadDailyOperation: async () => null,
    loadDailyHealth: async () => ({ dietAssignments: [] }),
    startOptionalOperationalRead: () => ({ initial: Promise.resolve(), status: { value: null, settled: true } }),
    applyDailyDietsToKitchenMeals: meals => meals, applyDailyDietsToSummary: meals => meals
  });
  await module.loadKitchenDayPayload(at('2030-01-03'));
  await module.loadSummaryDayPayload(at('2030-01-03'));
  assert.deepEqual(reads, [todayId, todayId], 'Il confine storico segue oggi nel centro, non il giorno visualizzato');
});
