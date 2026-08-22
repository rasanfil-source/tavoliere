import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NETWORK_ACTION_SELECTOR,
  actionRequiresConnection,
  isConnectionAvailable
} from '../../prototypes/firebase-spark-pwa/public/core/connectivity.mjs';

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
    'data-week-diet-save',
    'data-week-kitchen-note-save',
    'data-admin-save-button',
    'data-admin-transfer-ownership'
  ]) {
    assert.match(NETWORK_ACTION_SELECTOR, new RegExp(`\\[${marker}\\]`));
  }
});
