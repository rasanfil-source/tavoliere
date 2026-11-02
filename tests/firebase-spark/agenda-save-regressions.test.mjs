import assert from 'node:assert/strict';
import test from 'node:test';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';

function noteHarness() {
  let resolve, reject, sent;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const elements = {
    weekKitchenNoteInput: { value: '  Prima nota  ' },
    weekKitchenNoteSave: { disabled: false }, weekKitchenNoteStatus: {}
  };
  const state = {};
  const handler = functions(['handleWeekKitchenNoteSave'], {
    state, elements, captureWeekOperationContext: () => ({ dateId: '2026-11-02', isCurrent: () => true }),
    parseDateId: value => value, t: key => key,
    saveKitchenNote: (_date, text) => { sent = text; return pending; },
    renderWeekKitchenNotes: () => {}, friendlyErrorMessage: () => 'error'
  });
  return { ...handler, state, elements, resolve, reject, sent: () => sent };
}

test('saving a note preserves a new draft entered while the request is pending', async () => {
  const h = noteHarness();
  const saving = h.handleWeekKitchenNoteSave();
  h.elements.weekKitchenNoteInput.value = 'Seconda nota';
  h.resolve({ messages: [{ text: h.sent() }] });
  await saving;
  assert.equal(h.sent(), 'Prima nota');
  assert.equal(h.elements.weekKitchenNoteInput.value, 'Seconda nota');
  assert.equal(h.state.weekOperationalNote.messages[0].text, 'Prima nota');
  assert.equal(h.elements.weekKitchenNoteSave.disabled, false);
});

test('saving an unchanged note clears its submitted draft including surrounding whitespace', async () => {
  const h = noteHarness();
  const saving = h.handleWeekKitchenNoteSave();
  h.resolve({ messages: [{ text: h.sent() }] });
  await saving;
  assert.equal(h.elements.weekKitchenNoteInput.value, '');
});

test('a failed note save preserves the current draft for retry', async () => {
  const h = noteHarness();
  const saving = h.handleWeekKitchenNoteSave();
  h.elements.weekKitchenNoteInput.value = 'Bozza corretta';
  h.reject(new Error('unavailable'));
  await saving;
  assert.equal(h.elements.weekKitchenNoteInput.value, 'Bozza corretta');
  assert.equal(h.elements.weekKitchenNoteSave.disabled, false);
});

test('the two-day diet UI submits one atomic operation and displays its first day', async () => {
  const state = {};
  const calls = [];
  const health = { dateId: '2026-11-02', dietAssignments: [{ participantId: 'p', dietTag: '7' }] };
  const elements = { weekDietSave: {}, weekDietStatus: {}, weekDietParticipant: { value: 'p' },
    weekDietDuration: { value: '2' }, weekDietType: {}, weekDietNumber: {} };
  const handler = functions(['handleWeekDietSave'], {
    state, elements, captureWeekOperationContext: () => ({ dateId: health.dateId, isCurrent: () => true }),
    parseDateId: value => value, readDietCode: () => '7', t: key => key,
    saveDietAssignments: async (...args) => { calls.push(args); return health; },
    renderWeekOperations: () => {}, friendlyErrorMessage: error => error.message
  });
  await handler.handleWeekDietSave();
  assert.deepEqual(calls, [[health.dateId, 'p', '7', { duration: 2 }]]);
  assert.equal(state.weekOperationalHealth, health);
  assert.equal(elements.weekDietStatus.textContent, 'Dieta salvata per due giorni');
});

async function dailyHarness() {
  const records = new Map();
  let failCommit = false, transactions = 0;
  const snapshot = id => ({ exists: () => records.has(id), data: () => structuredClone(records.get(id)) });
  const module = await loadBrowserModule('daily-operations.js', {
    ...dates, ...diets, db: {}, getActiveCenterId: () => 'center',
    doc: (_, ...parts) => parts.at(-1), serverTimestamp: () => 'server-time', getDoc: async id => snapshot(id),
    runTransaction: async (_, action) => {
      transactions++;
      const writes = [];
      const result = await action({ get: async id => {
        assert.equal(writes.length, 0, 'Every read must precede writes');
        return snapshot(id);
      }, set: (id, value) => writes.push([id, value]) });
      if (failCommit) throw new Error('unavailable');
      for (const [id, value] of writes) records.set(id, { ...records.get(id), ...value });
      return result;
    }
  }, ['saveDietAssignments', 'loadDailyHealth']);
  return { ...module, records, setFailCommit: value => { failCommit = value; }, transactions: () => transactions };
}

test('two-day diets preserve unrelated health data and update both cached days after commit', async () => {
  const h = await dailyHarness();
  const start = new Date('2026-10-31T12:00:00');
  for (const dateId of ['2026-10-31', '2026-11-01']) {
    h.records.set(dateId, { invitedMeals: { lunch: 3 }, sickPeople: [{ participantId: 's', displayName: 'S' }],
      dietAssignments: [{ participantId: 'other', dietTag: '2' }] });
  }
  await h.saveDietAssignments(start, 'p', '7', { duration: 2 });
  assert.equal(h.transactions(), 1);
  for (const dateId of ['2026-10-31', '2026-11-01']) {
    const health = await h.loadDailyHealth(new Date(`${dateId}T12:00:00`));
    assert.deepEqual(health.dietAssignments, [{ participantId: 'other', dietTag: '2' }, { participantId: 'p', dietTag: '7' }]);
    assert.equal(health.invitedMeals.lunch, 3);
    assert.equal(health.sickPeople[0].participantId, 's');
  }
  await h.saveDietAssignments(start, 'p', 'STANDARD', { duration: 2 });
  for (const record of h.records.values()) assert.deepEqual(record.dietAssignments, [{ participantId: 'other', dietTag: '2' }]);
});

test('a failed two-day commit changes neither stored data nor cached health', async () => {
  const h = await dailyHarness();
  const start = new Date('2026-11-02T12:00:00');
  await h.loadDailyHealth(start);
  h.setFailCommit(true);
  await assert.rejects(h.saveDietAssignments(start, 'p', '7', { duration: 2 }), /unavailable/);
  assert.equal(h.records.size, 0);
  assert.deepEqual((await h.loadDailyHealth(start)).dietAssignments, []);
  h.setFailCommit(false);
  await h.saveDietAssignments(start, 'p', '7', { duration: 2 });
  assert.equal(h.records.size, 2);
});
