import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {
  NETWORK_ACTION_SELECTOR,
  actionRequiresConnection,
  isConnectionAvailable
} from '../../prototypes/firebase-spark-pwa/public/core/connectivity.mjs';

const appSource = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url), 'utf8');
function appFunction(name) {
  const match = appSource.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`));
  assert.ok(match, `Funzione ${name} presente`);
  return match[0];
}

test('offline: invitati e ripristino si fermano prima di iniziare operazioni', async () => {
  const elements = {
    offlineBanner: { hidden: true },
    weekInvitedStatus: {},
    adminBackupStatus: {}
  };
  const context = {
    elements,
    isConnectionAvailable: () => false,
    t: (key) => key,
    hasCurrentCapability: () => true,
    CAPABILITIES: { RESTORE_CENTER_DATA: 'restore' }
  };
  for (const name of ['blockOfflineAction', 'handleWeekInvitedSave', 'handleAdminRestoreSelection', 'performAdminConfigurationRestore']) {
    runInNewContext(appFunction(name), context);
  }
  // Le dipendenze di rete non sono disponibili: raggiungerle farebbe fallire il test.
  await context.handleWeekInvitedSave();
  assert.equal(elements.weekInvitedStatus.textContent, 'network.offline.guardedAction');
  const event = { target: { files: [{}], value: 'backup.json' } };
  context.handleAdminRestoreSelection(event);
  assert.equal(event.target.value, '');
  await context.performAdminConfigurationRestore({});
  assert.equal(elements.adminBackupStatus.textContent, 'network.offline.guardedAction');
  assert.equal(elements.offlineBanner.hidden, false);
});

test('la connettivita considera offline soltanto il segnale esplicito del browser', () => {
  assert.equal(isConnectionAvailable({ onLine: true }), true);
  assert.equal(isConnectionAvailable({ onLine: false }), false);
  assert.equal(isConnectionAvailable(undefined), true);
});

test('la policy distingue le scritture dalla navigazione', () => {
  const writeTarget = {
    closest(selector) {
      assert.equal(selector, NETWORK_ACTION_SELECTOR);
      return { dataset: { adminSaveButton: '' } };
    }
  };
  const navigationTarget = { closest: () => null };

  assert.equal(actionRequiresConnection(writeTarget), true);
  assert.equal(actionRequiresConnection(navigationTarget), false);
  assert.equal(actionRequiresConnection(null), false);
});

test('la policy copre tutte le famiglie di modifica quotidiana e amministrativa', () => {
  for (const marker of [
    'data-meal-date',
    'data-month-scope',
    'data-week-mass-date',
    'data-week-health-save',
    'data-week-invited-save',
    'data-admin-restore-button',
    'data-admin-restore-input',
    'data-week-diet-save',
    'data-week-kitchen-note-save',
    'data-admin-save-button',
    'data-admin-transfer-ownership'
  ]) {
    assert.match(NETWORK_ACTION_SELECTOR, new RegExp(`\\[${marker}\\]`));
  }
});
