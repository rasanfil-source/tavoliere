import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url), 'utf8');
const names = ['captureWeekOperationContext', 'getWeekSickDraft', 'handleWeekInvitedSave', 'handleWeekHealthSave',
  'handleWeekDietSave', 'handleWeekDietListClick', 'handleWeekKitchenNoteSave', 'handleWeekKitchenNoteListClick'];
const functions = names.map(name => source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`))[0]).join('\n');

function setup() {
  const state = { mode: 'week', weekOperationalDateId: '2026-10-05', weekOperationsRequestVersion: 1,
    weekOperationalHealth: { dateId: '2026-10-05', dietAssignments: [] }, adminParticipants: [] };
  const elements = Object.fromEntries(['weekInvitedSave', 'weekInvitedStatus', 'weekHealthSave', 'weekHealthStatus',
    'weekDietSave', 'weekDietStatus', 'weekKitchenNoteSave', 'weekKitchenNoteStatus'].map(key => [key, {}]));
  Object.assign(elements, { weekInvitedInputs: [], weekHealthList: { querySelectorAll: () => [] },
    weekDietParticipant: { value: 'person' }, weekDietDuration: { value: '1' }, weekKitchenNoteInput: { value: 'note' } });
  let resolve, reject;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const calls = [];
  const save = (...args) => { calls.push(args); return pending; };
  let renders = 0;
  const deps = { state, elements, getActiveCenterId: () => 'center_test', t: x => x,
    blockOfflineAction: () => false,
    parseDateId: x => x, formatDateId: x => x, addCalendarDays: x => x, readDietCode: () => '1',
    renderWeekOperations: () => renders++, renderWeekKitchenNotes: () => renders++,
    friendlyErrorMessage: () => 'error', saveInvitedMeals: save, saveSickPeople: save,
    saveDietAssignments: save, saveKitchenNote: save, removeKitchenNoteMessage: save };
  const handlers = new Function(...Object.keys(deps), functions + '\nreturn {' + names.join(',') + '};')(...Object.values(deps));
  const event = { target: { closest: () => ({ dataset: { weekDietRemove: 'person', weekKitchenNoteRemove: 'note' } }) } };
  return { state, elements, handlers, event, resolve, reject, calls, renders: () => renders };
}

for (const name of names.slice(2)) {
  for (const failure of [false, true]) {
    test(`${name}: a late ${failure ? 'error' : 'result'} leaves the newly selected day intact`, async () => {
      const h = setup();
      const operation = h.handlers[name](h.event);
      h.state.weekOperationalDateId = '2026-10-06';
      h.state.weekOperationsRequestVersion++;
      const health = { dateId: '2026-10-06' };
      const note = { mealDate: '2026-10-06', text: 'new day' };
      h.state.weekOperationalHealth = health;
      h.state.weekOperationalNote = note;
      h.elements.weekKitchenNoteInput.value = 'new draft';
      for (const key of Object.keys(h.elements).filter(key => key.endsWith('Status'))) h.elements[key].textContent = 'new status';
      if (failure) h.reject(new Error('late error'));
      else h.resolve({ dateId: '2026-10-05' });
      await operation;
      assert.equal(h.calls[0][0], '2026-10-05');
      assert.equal(h.state.weekOperationalHealth, health);
      assert.equal(h.state.weekOperationalNote, note);
      assert.equal(h.elements.weekKitchenNoteInput.value, 'new draft');
      assert.equal(h.renders(), 0);
      for (const key of Object.keys(h.elements).filter(key => key.endsWith('Status'))) assert.equal(h.elements[key].textContent, 'new status');
    });
  }
  test(`${name}: cannot save previous day data while the new day loads`, async () => {
    const h = setup();
    h.state.weekOperationalDateId = '2026-10-06';
    await h.handlers[name](h.event);
    assert.equal(h.calls.length, 0);
  });
  test(`${name}: current day save still updates the view`, async () => {
    const h = setup();
    const operation = h.handlers[name](h.event);
    h.resolve({ dateId: '2026-10-05' });
    await operation;
    assert.equal(h.renders(), 1);
  });
}
