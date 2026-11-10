import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { addDaysToDateId, zonedLocalDateTimeToDate } from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';

const source = readFileSync('tools/kitchen-monthly-summary.mjs', 'utf8');
function harness() {
  const context = vm.createContext({ process: { env: {} }, Date, Intl, addDaysToDateId, zonedLocalDateTimeToDate });
  vm.runInContext(source.slice(source.indexOf('const projectId'), source.indexOf('if (!projectId'))
    + source.slice(source.indexOf('function latestCompleteCutoff')), context);
  const api = vm.runInContext('({ createAvailableMonthlySummary, encodeFields })', context);
  const documents = new Map(), writes = [], queries = [];
  const snapshot = (path, data) => data ? { name: path, fields: api.encodeFields(data) } : null;
  context.getDocument = async path => snapshot(path, documents.get(path));
  context.queryDocuments = async (parent, collection, filters) => {
    queries.push(collection);
    return [...documents].filter(([path, data]) => path.startsWith(`${parent}/${collection}/`)
      && filters.every(({ field, op, value }) => op === 'EQUAL' ? data[field] === value
        : op === 'GREATER_THAN_OR_EQUAL' ? data[field] >= value : data[field] <= value))
      .map(([path, data]) => snapshot(path, data));
  };
  context.createDocument = context.upsertDocument = async (path, data) => {
    writes.push(path);
    documents.set(path, data);
  };
  const dailyPath = dateId => `centers/one/kitchenDailyTotals/${dateId}`;
  const addDay = dateId => documents.set(dailyPath(dateId), {
    dateId, counts: { breakfast: 2, lunch: 3, dinner: 4 }, invitedCounts: { breakfast: 1, lunch: 0, dinner: 1 }
  });
  const addMonth = (month, count) => {
    for (let day = 1; day <= count; day++) addDay(`${month}-${String(day).padStart(2, '0')}`);
  };
  return {
    documents, writes, queries, addDay, addMonth,
    summary: month => documents.get(`centers/one/kitchenMonthlySummaries/${month}`),
    current: () => documents.get('centers/one/kitchenTotalsMetadata/currentSummary'),
    run: date => api.createAvailableMonthlySummary({ centerId: 'one', localToday: date.slice(0, 10),
      timeZone: 'Europe/Rome', now: zonedLocalDateTimeToDate(date.slice(0, 10), date.slice(11), 'Europe/Rome') })
  };
}

test('il mese cresce solo con giornate concluse e non riscrive totali invariati', async () => {
  const h = harness();
  h.addMonth('2026-11', 9);
  await h.run('2026-11-10T12:00');
  const summary = h.summary('2026-11');
  assert.equal(summary.closedThrough, '2026-11-09');
  assert.equal(summary.finalized, false);
  assert.equal(summary.counts.lunch, 27);
  assert.equal(summary.invitedTotal, 18);
  assert.equal(summary.invitedCounts.breakfast, 9);
  assert.equal(summary.invitedCounts.lunch, 0);
  assert.equal(summary.invitedCounts.dinner, 9);
  assert.equal(summary.missingDates.length, 0);
  assert.equal(h.summary('2026-10'), undefined);
  assert.equal(h.current().monthId, '2026-11');
  h.writes.length = h.queries.length = 0;
  await h.run('2026-11-10T13:00');
  assert.equal(h.writes.length, 0);
  assert.equal(h.queries.includes('kitchenDailyTotals'), false);
  h.addDay('2026-11-10');
  await h.run('2026-11-10T23:05');
  assert.equal(h.current().closedThrough, '2026-11-10');
  assert.equal(h.current().counts.lunch, 30);
  assert.equal(h.current().invitedCounts.dinner, 10);
});

test('aggiunge la ripartizione invitati ai totali progressivi esistenti senza duplicare i pasti', async () => {
  const h = harness();
  h.addMonth('2026-11', 2);
  h.documents.set('centers/one/kitchenDailyTotals/2026-11-02', {
    dateId: '2026-11-02', counts: { breakfast: 3, lunch: 5, dinner: 7 },
    invitedCounts: { breakfast: 2, lunch: 3, dinner: 4 }
  });
  await h.run('2026-11-03T12:00');
  const summary = h.summary('2026-11');
  assert.equal(summary.counts.breakfast, 5);
  assert.equal(summary.counts.lunch, 8);
  assert.equal(summary.counts.dinner, 11);
  assert.equal(summary.invitedTotal, 11);
  assert.equal(summary.invitedCounts.breakfast, 3);
  assert.equal(summary.invitedCounts.lunch, 3);
  assert.equal(summary.invitedCounts.dinner, 5);
  delete summary.invitedCounts;
  delete h.current().invitedCounts;
  h.writes.length = 0;
  await h.run('2026-11-03T13:00');
  assert.equal(h.writes.length, 2);
  assert.equal(h.current().invitedCounts.dinner, 5);
  assert.equal(h.current().counts.dinner, 11);
  h.writes.length = h.queries.length = 0;
  await h.run('2026-11-03T14:00');
  assert.equal(h.writes.length, 0);
  assert.equal(h.queries.includes('kitchenDailyTotals'), false);
});

test('una giornata mancante recuperata aggiorna anche un riepilogo già pubblicato', async () => {
  const h = harness();
  h.addMonth('2026-11', 9);
  h.documents.delete('centers/one/kitchenDailyTotals/2026-11-03');
  await h.run('2026-11-10T12:00');
  assert.deepEqual([...h.current().missingDates], ['2026-11-03']);
  h.addDay('2026-11-03');
  await h.run('2026-11-10T13:00');
  assert.equal(h.current().counts.lunch, 27);
  assert.equal(h.current().missingDates.length, 0);
});

test('il primo giorno mostra zero provvisorio senza dichiarare mancanti i giorni futuri', async () => {
  const h = harness();
  await h.run('2026-11-01T12:00');
  assert.equal(h.current().closedThrough, null);
  assert.equal(h.current().counts.lunch, 0);
  assert.equal(h.current().missingDates.length, 0);
  assert.equal(h.queries.includes('kitchenDailyTotals'), false);
});

test('un mese consolidato rimane fisso e il mese successivo riparte da zero', async () => {
  const h = harness();
  h.addMonth('2026-11', 29);
  await h.run('2026-11-30T20:59');
  assert.equal(h.current().closedThrough, '2026-11-29');
  assert.equal(h.current().finalized, false);
  h.addDay('2026-11-30');
  await h.run('2026-11-30T21:05');
  assert.equal(h.current().finalized, true);
  assert.equal(h.current().counts.lunch, 90);
  h.documents.delete('centers/one/kitchenDailyTotals/2026-11-01');
  h.queries.length = h.writes.length = 0;
  await h.run('2026-11-30T22:05');
  assert.equal(h.current().counts.lunch, 90);
  assert.equal(h.queries.length, 0);
  assert.equal(h.writes.length, 0);
  await h.run('2026-12-01T12:00');
  assert.equal(h.summary('2026-11').finalized, true);
  assert.equal(h.current().monthId, '2026-12');
  assert.equal(h.current().counts.lunch, 0);
});

test('gli orari reali dei pasti possono rinviare la chiusura contabile di fine mese', async () => {
  const h = harness();
  h.addMonth('2026-11', 29);
  h.documents.set('centers/one/mealWindows/late-dinner', { mealDate: '2026-11-30',
    closesAt: zonedLocalDateTimeToDate('2026-11-30', '22:30', 'Europe/Rome') });
  await h.run('2026-11-30T21:05');
  assert.equal(h.current().closedThrough, '2026-11-29');
  assert.equal(h.current().finalized, false);
  h.addDay('2026-11-30');
  await h.run('2026-11-30T22:35');
  assert.equal(h.current().finalized, true);
});

test('un mese terminato ma incompleto si consolida soltanto dopo il recupero', async () => {
  const h = harness();
  h.addMonth('2026-11', 29);
  await h.run('2026-11-30T21:05');
  assert.equal(h.current().finalized, false);
  assert.deepEqual([...h.current().missingDates], ['2026-11-30']);
  h.addDay('2026-11-30');
  await h.run('2026-12-01T12:00');
  assert.equal(h.summary('2026-11').finalized, true);
  assert.equal(h.summary('2026-11').counts.lunch, 90);
});

test('il client accetta riepiloghi progressivi, rifiuta incoerenze e legge gli archivi precedenti', () => {
  const clientSource = readFileSync('prototypes/firebase-spark-pwa/public/kitchen-monthly-summary.js', 'utf8');
  const context = vm.createContext({ Date, serverNow: () => Date.parse('2026-11-10T12:00:00Z') });
  vm.runInContext(`const FIRST_TRACKED_MONTH = '2026-11'; const MEAL_TYPE_IDS = ['breakfast','lunch','dinner'];
    ${clientSource.slice(clientSource.indexOf('function validateSummary'))}`, context);
  const validate = vm.runInContext('validateSummary', context);
  const summary = { monthId: '2026-11', periodStart: '2026-11-01', periodEnd: '2026-11-30',
    availableFrom: new Date('2026-11-01T00:00:00Z'), purgeAfter: new Date('2028-11-30T00:00:00Z'),
    counts: { breakfast: 2, lunch: 3, dinner: 4 }, invitedTotal: 1,
    closedThrough: '2026-11-09', finalized: false, missingDates: [] };
  assert.equal(validate(summary).closedThrough, '2026-11-09');
  assert.equal(validate(summary).invitedCounts, null);
  const breakdown = { breakfast: 0, lunch: 1, dinner: 0 };
  assert.equal(validate({ ...summary, invitedCounts: breakdown }).invitedCounts.lunch, 1);
  assert.equal(validate({ ...summary, invitedCounts: { breakfast: 0, lunch: 2, dinner: 0 } }), null);
  assert.equal(validate({ ...summary, invitedCounts: { breakfast: -1, lunch: 2, dinner: 0 } }), null);
  assert.equal(validate({ ...summary, invitedCounts: { breakfast: 0, lunch: 4, dinner: 0 }, invitedTotal: 4 }), null);
  assert.equal(validate({ ...summary, finalized: true }), null);
  assert.equal(validate({ ...summary, missingDates: ['2026-11-11'] }), null);
  assert.equal(validate({ ...summary, closedThrough: null }), null);
  assert.equal(validate({ ...summary, closedThrough: null, counts: { breakfast: 0, lunch: 0, dinner: 0 }, invitedTotal: 0 }).closedThrough, null);
  const legacy = { ...summary }; delete legacy.closedThrough; delete legacy.finalized;
  assert.equal(validate(legacy).finalized, true);
});
