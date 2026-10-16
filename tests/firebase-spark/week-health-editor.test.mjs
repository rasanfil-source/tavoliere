import assert from 'node:assert/strict';
import test from 'node:test';
import { functions } from '../helpers/app-functions.mjs';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as diets from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';

const dateId = '2030-01-02';
const people = ['a', 'b', 'c'].map(participantId => ({ participantId, displayName: participantId,
  groupId: 'group_residenti', status: 'ACTIVE' }));
const ids = value => value.map(person => person.participantId).sort();

async function harness(initialIds = []) {
  let stored = { dateId, sickPeople: people.filter(person => initialIds.includes(person.participantId)),
    invitedMeals: {}, dietAssignments: [] };
  let beforeCommit = async () => {};
  let writes = 0;
  const daily = await loadBrowserModule('daily-operations.js', {
    ...dates, ...diets, db: {}, getActiveCenterId: () => 'test', doc: () => ({}),
    serverTimestamp: () => new Date(),
    runTransaction: async (_, action) => {
      await beforeCommit();
      return action({
        get: async () => ({ exists: () => true, data: () => structuredClone(stored) }),
        set: (_, data) => { stored = { ...stored, ...data }; writes++; }
      });
    }
  }, ['saveSickPeople']);
  const state = { mode: 'week', weekOperationalDateId: dateId, weekOperationsRequestVersion: 1,
    weekOperationalHealth: structuredClone(stored), adminParticipants: people, weekSickDraft: null };
  let selected = 'a';
  const elements = { weekHealthSave: { disabled: false }, weekHealthStatus: {},
    weekHealthList: {
      querySelector: () => ({ value: selected }),
      querySelectorAll: selector => selector === '[data-week-sick-selected]'
        ? (app.getWeekSickDraft()?.people || state.weekOperationalHealth.sickPeople || [])
          .map(person => ({ dataset: { weekSickSelected: person.participantId } })) : []
    }
  };
  const app = functions(['captureWeekOperationContext', 'getWeekSickDraft', 'handleWeekHealthListClick',
    'handleWeekHealthSave'], {
    state, elements, getActiveCenterId: () => 'test', renderWeekOperations: () => {},
    t: key => key, parseDateId: id => new Date(id + 'T12:00:00'),
    friendlyErrorMessage: error => error.message, saveSickPeople: daily.saveSickPeople
  });
  return { state, elements, app,
    get stored() { return stored; }, get writes() { return writes; },
    setBeforeCommit(fn) { beforeCommit = fn; },
    add(id) {
      selected = id;
      app.handleWeekHealthListClick({ target: { closest: selector => selector === '[data-week-sick-add]' ? {} : null } });
    },
    remove(id) {
      app.handleWeekHealthListClick({ target: { closest: selector => selector === '[data-week-sick-remove]'
        ? { dataset: { weekSickRemove: id } } : null } });
    }
  };
}

test('Aggiungi e Salva persiste davvero l ammalato e conserva il dato caricato fino al commit', async () => {
  const h = await harness();
  h.add('a');
  assert.deepEqual(ids(h.state.weekOperationalHealth.sickPeople), []);
  assert.deepEqual(ids(h.state.weekSickDraft.people), ['a']);
  await h.app.handleWeekHealthSave();
  assert.deepEqual(ids(h.stored.sickPeople), ['a']);
  assert.deepEqual(ids(h.state.weekOperationalHealth.sickPeople), ['a']);
  assert.equal(h.state.weekSickDraft, null);
  assert.equal(h.elements.weekHealthStatus.textContent, 'week.operations.health.saved');
});

test('Rimuovi e Salva elimina l ammalato senza eliminare aggiunte concorrenti', async () => {
  const h = await harness(['a']);
  h.remove('a');
  h.stored.sickPeople.push(people[1]);
  await h.app.handleWeekHealthSave();
  assert.deepEqual(ids(h.stored.sickPeople), ['b']);
  assert.equal(h.elements.weekHealthStatus.textContent, 'week.operations.health.saved');
});

test('refresh e salvataggi di altri campi non cambiano la baseline della selezione in modifica', async () => {
  const h = await harness(['a']);
  h.remove('a'); h.add('c');
  h.stored.sickPeople.push(people[1]);
  h.state.weekOperationalHealth = structuredClone(h.stored);
  h.state.weekOperationalHealth.invitedMeals.lunch = 3;
  await h.app.handleWeekHealthSave();
  assert.deepEqual(ids(h.stored.sickPeople), ['b', 'c']);
});

test('un errore lascia la selezione pronta per un secondo tentativo', async () => {
  const h = await harness();
  h.add('a');
  h.setBeforeCommit(async () => { throw Error('rete sintetica'); });
  await h.app.handleWeekHealthSave();
  assert.equal(h.writes, 0);
  assert.deepEqual(ids(h.state.weekSickDraft.people), ['a']);
  assert.equal(h.elements.weekHealthSave.disabled, false);
  h.setBeforeCommit(async () => {});
  await h.app.handleWeekHealthSave();
  assert.deepEqual(ids(h.stored.sickPeople), ['a']);
});

test('durante il salvataggio non si perdono nuove selezioni e non parte un secondo invio', async () => {
  const h = await harness();
  h.add('a');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  h.setBeforeCommit(() => gate);
  const saving = h.app.handleWeekHealthSave();
  h.add('b');
  await h.app.handleWeekHealthSave();
  assert.deepEqual(ids(h.state.weekSickDraft.people), ['a']);
  release(); await saving;
  assert.equal(h.writes, 1);
  assert.deepEqual(ids(h.stored.sickPeople), ['a']);
});

test('una selezione del giorno precedente non entra nel giorno nuovo', async () => {
  const h = await harness();
  h.add('a');
  h.state.weekOperationalDateId = '2030-01-03';
  h.state.weekOperationalHealth = { ...h.state.weekOperationalHealth, dateId: '2030-01-03' };
  assert.equal(h.app.getWeekSickDraft(), null);
  h.add('b');
  assert.deepEqual(ids(h.state.weekSickDraft.people), ['b']);
  assert.deepEqual(h.state.weekSickDraft.previousPeople, []);
});
