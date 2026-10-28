import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyApplicationError,
  isRecoverableSessionError,
  toUserMessage
} from '../../prototypes/firebase-spark-pwa/public/core/user-error.mjs';

test('gli errori temporanei non invalidano una sessione residente persistente', () => {
  for (const code of [
    'auth/network-request-failed',
    'firestore/unavailable',
    'firestore/deadline-exceeded',
    'firestore/permission-denied',
    'resource-exhausted'
  ]) {
    assert.equal(isRecoverableSessionError({ code }), true, code);
  }
  assert.equal(isRecoverableSessionError({ message: 'Failed to fetch' }), true);
  assert.equal(isRecoverableSessionError({ message: 'Load failed' }), true);
  assert.equal(isRecoverableSessionError({ message: 'NetworkError when attempting to fetch resource' }), true);
  assert.equal(isRecoverableSessionError({ message: 'Connessione assente' }), true);
  assert.equal(classifyApplicationError({ message: 'Load failed' }), 'offline');
  assert.notEqual(toUserMessage({ message: 'Load failed' }), 'Load failed');
});

test('gli errori permanenti locali restano distinguibili da quelli temporanei', () => {
  assert.equal(isRecoverableSessionError({ code: 'resident/access-expired' }), false);
  assert.equal(isRecoverableSessionError({ code: 'resident/identity-mismatch' }), false);
  assert.equal(isRecoverableSessionError({ message: 'Sigla non attiva' }), false);
});
