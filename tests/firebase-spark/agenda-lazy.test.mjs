import test from 'node:test';
import assert from 'node:assert/strict';
import { functions, functionSource } from '../helpers/app-functions.mjs';

function setup({ admin = true, liturgist = false } = {}) {
  const reads = [], timers = [];
  const content = { inert: false };
  const elements = { weekOperations: { open: false, querySelector: () => content },
    weekOperationsDay: { value: '2026-10-28' }, weekOperationsStatus: {} };
  for (const key of ['Blessing', 'Booking', 'Invited', 'Health', 'Notes', 'Diet']) {
    elements[`week${key}Section`] = { open: false, hidden: key !== 'Blessing' && !admin };
  }
  const state = { mode: 'week', weekOperationsRequestVersion: 0, weekOperationalDateId: '2026-10-28', centerContactSettings: {} };
  const app = functions(['refreshWeekOperations', 'getOpenAgendaSections'], {
    state, elements, canManageDailyOperations: () => admin, canManageMass: () => liturgist,
    getActiveCenterId: () => 'center', getCurrentUser: () => ({ uid: 'operator' }),
    window: { setTimeout: cb => timers.push(cb) }, parseDateId: id => id, t: key => key,
    loadDailyHealth: async () => { reads.push('health'); return { dateId: state.weekOperationalDateId }; },
    loadKitchenNote: async () => { reads.push('notes'); return { mealDate: state.weekOperationalDateId }; },
    listPublicParticipants: async () => { reads.push('people'); return []; },
    loadDailyOperation: async () => { reads.push('blessing'); return { dateId: state.weekOperationalDateId }; },
    loadMealWindowCoverage: async () => { reads.push('coverage'); return { through: '2027-10-28' }; },
    prepareWeekOperationalDate() {}, renderWeekOperations() {}, renderWeekBlessing() {},
    friendlyErrorMessage: error => error.message
  });
  return { app, state, elements, reads, timers, content };
}

test('avvio e apertura della sola Agenda non leggono dati delle sezioni', async () => {
  const h = setup();
  await h.app.refreshWeekOperations();
  h.elements.weekOperations.open = true;
  await h.app.refreshWeekOperations();
  assert.deepEqual(h.reads, []);
  assert.equal(h.content.inert, false);
});

for (const [section, expected] of [
  ['Blessing', ['coverage', 'blessing']], ['Booking', ['people', 'coverage']],
  ['Health', ['health', 'people', 'coverage']], ['Notes', ['notes', 'coverage']],
  ['Diet', ['health', 'people', 'coverage']]
]) {
  test(`aprire ${section} carica soltanto le sue dipendenze`, async () => {
    const h = setup();
    h.elements.weekOperations.open = true;
    const selected = h.elements[`week${section}Section`];
    selected.open = true;
    await h.app.refreshWeekOperations(false, selected);
    assert.deepEqual(h.reads, expected);
    assert.equal(h.state.weekAgendaReady[section.toLowerCase()], true);
    assert.equal(h.content.inert, false);
  });
}

test('il liturgista carica la benedizione senza directory, salute o note', async () => {
  const h = setup({ admin: false, liturgist: true });
  h.elements.weekOperations.open = h.elements.weekBlessingSection.open = true;
  h.elements.weekNotesSection.open = true;
  await h.app.refreshWeekOperations();
  assert.deepEqual(h.reads, ['coverage', 'blessing']);
});

test('aprire un’altra sezione non ricarica quelle già aperte', async () => {
  const h = setup();
  h.elements.weekOperations.open = h.elements.weekBlessingSection.open = true;
  await h.app.refreshWeekOperations();
  h.reads.length = 0;
  h.elements.weekNotesSection.open = true;
  await h.app.refreshWeekOperations(false, h.elements.weekNotesSection);
  assert.deepEqual(h.reads, ['notes', 'coverage']);
  assert.equal(h.state.weekAgendaReady.blessing, true);
});

test('avvio calendario rinvia le letture dell’agenda', () => {
  const extras = functionSource('refreshParticipantExtras');
  assert.doesNotMatch(extras, /listPublicParticipants\(|loadDailyHealth\(|loadKitchenNote\(|loadDailyOperation\(/);
  assert.match(extras, /elements.weekOperations.open && \(canManageDailyOperations\(\) \|\| canManageMass\(\)\)/);
  assert.match(functionSource('renderWeekOperations'), /!elements.weekOperations.open/);
});
