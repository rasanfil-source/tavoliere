import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('prototypes/firebase-spark-pwa/public/app.js', 'utf8');
function harness() {
  const storage = new Map();
  const context = vm.createContext({
    DEFAULT_OPENING_VIEW: 'week', RESIDENT_PREFERENCES_STORAGE_KEY: 'preferences',
    state: {}, user: null, center: 'one',
    window: { localStorage: {
      getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)
    } }
  });
  vm.runInContext(`function getCurrentUser() { return user; }
    function isResidentTechnicalEmail(email) { return email === 'technical'; }
    function getCenterScopedStorageKey(key) { return center + ':' + key; }
    ${source.slice(source.indexOf('const PERSONAL_APPEARANCE_DEFAULTS'), source.indexOf('function readDietCode('))}`, context);
  return { context, run: code => vm.runInContext(code, context) };
}

test('appearance is isolated between owners, deputies, residents and centers', () => {
  const { run } = harness();
  run(`user = { uid: 'owner' }; storeResidentPreferences({themePalette:'mare', defaultView:'month'});`);
  assert.equal(run(`applyResidentPreferences({}).themePalette`), 'mare');
  run(`user = { uid: 'deputy' };`);
  assert.equal(run(`applyResidentPreferences({themePalette:'mare'}).themePalette`), 'inchiostro');
  run(`storeResidentPreferences({themePalette:'bosco'}); user = {uid:'technical', email:'technical'}; state.selectedParticipant = {participantId:'alice'};`);
  assert.equal(run(`applyResidentPreferences({}).themePalette`), 'inchiostro');
  run(`storeResidentPreferences({themePalette:'sole'}); state.selectedParticipant = {participantId:'bob'};`);
  assert.equal(run(`applyResidentPreferences({}).themePalette`), 'inchiostro');
  run(`state.selectedParticipant = {participantId:'alice'}; state.adminRole = 'MANAGER';`);
  assert.equal(run(`applyResidentPreferences({}).themePalette`), 'sole');
  run(`center = 'two';`);
  assert.equal(run(`applyResidentPreferences({}).themePalette`), 'inchiostro');
  run(`center = 'one'; user = {uid:'owner'};`);
  assert.equal(run(`applyResidentPreferences({}).defaultView`), 'month');
});

test('legacy shared preferences and center appearance cannot leak into a new user', () => {
  const { run } = harness();
  run(`window.localStorage.setItem('one:preferences', JSON.stringify({themePalette:'mare'}));`);
  assert.equal(run(`applyResidentPreferences({themePalette:'bosco', name:'Center'}).themePalette`), 'inchiostro');
  assert.equal(run(`applyResidentPreferences({name:'Center'}).name`), 'Center');
});

test('saving appearance never writes center settings and storage failures are reported', () => {
  const handler = source.slice(source.indexOf('async function handleAdminAdaptationsSave()'), source.indexOf('function handleAdminAdaptationsCancel()'));
  assert.doesNotMatch(handler, /updateCenterSettings|state\.residentSettingsMode/);
  const { run } = harness();
  run(`window.localStorage.setItem = () => { throw new Error('Storage unavailable'); };`);
  assert.throws(() => run(`storeResidentPreferences({themePalette:'mare'})`), /Storage unavailable/);
});
