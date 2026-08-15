import test from 'node:test';
import assert from 'node:assert/strict';

import { createOperationGuard } from '../../prototypes/firebase-spark-pwa/public/core/operation-guard.mjs';
import { createStateStore } from '../../prototypes/firebase-spark-pwa/public/core/state-store.mjs';
import { classifyApplicationError, toUserMessage } from '../../prototypes/firebase-spark-pwa/public/core/user-error.mjs';
import {
  normalizePhoneNumber,
  normalizeResidentSignature,
  validateParticipantProfile
} from '../../prototypes/firebase-spark-pwa/public/domain/participant-profile.mjs';
import {
  assertCurrentRevision,
  nextRevision,
  normalizeRevision
} from '../../prototypes/firebase-spark-pwa/public/core/revision.mjs';

test('il guardiano riutilizza la stessa operazione quando arrivano due invii uguali', async () => {
  const guard = createOperationGuard();
  let executions = 0;
  let release;
  const operation = () => {
    executions += 1;
    return new Promise((resolve) => { release = resolve; });
  };

  const first = guard.run('salva-persona', operation);
  const second = guard.run('salva-persona', operation);

  assert.equal(first, second);
  assert.equal(guard.isPending('salva-persona'), true);
  await Promise.resolve();
  release('salvato');
  assert.equal(await first, 'salvato');
  assert.equal(executions, 1);
  assert.equal(guard.isPending('salva-persona'), false);
});

test('lo stato revisionato notifica le modifiche e riconosce le risposte superate', () => {
  const store = createStateStore({ loading: false, value: 1 });
  const notifications = [];
  const unsubscribe = store.subscribe((state, revision) => notifications.push({ state, revision }));
  const firstRequest = store.beginRequest('people');
  const secondRequest = store.beginRequest('people');

  store.update({ value: 2 });
  unsubscribe();

  assert.equal(store.getRevision(), 1);
  assert.equal(store.getState().value, 2);
  assert.equal(notifications.length, 1);
  assert.equal(store.isCurrentRequest(firstRequest), false);
  assert.equal(store.isCurrentRequest(secondRequest), true);
});

test('gli errori tecnici diventano messaggi comprensibili', () => {
  assert.equal(classifyApplicationError({ code: 'permission-denied' }), 'permission');
  assert.match(toUserMessage({ code: 'permission-denied' }), /ruolo/);
  assert.equal(classifyApplicationError({ code: 'unavailable' }), 'offline');
  assert.match(toUserMessage({ code: 'aborted' }), /cambiati/);
  for (const error of [
    { code: 'permission-denied' },
    { code: 'aborted' },
    { code: 'deadline-exceeded' },
    { code: 'unavailable' }
  ]) {
    assert.match(toUserMessage(error, 'Salva le modifiche'), /Salva le modifiche/);
  }
});

test('il profilo persona viene normalizzato in un solo punto', () => {
  const profile = validateParticipantProfile({
    displayName: '  Mario Rossi ',
    signature: ' mr ',
    phone: '+39 333-1234567',
    dietTags: ['2L'],
    viceAdminRole: true
  });

  assert.equal(profile.displayName, 'Mario Rossi');
  assert.equal(profile.signature, 'MR');
  assert.equal(profile.phone, '+393331234567');
  assert.deepEqual(profile.dietTags, ['3']);
  assert.equal(profile.viceAdminRole, true);
  assert.equal(normalizeResidentSignature(' ab12 '), 'AB12');
  assert.equal(normalizePhoneNumber('06 123-456'), '06123456');
});

test('la validazione rifiuta sigle e telefoni non utilizzabili', () => {
  assert.throws(
    () => validateParticipantProfile({ displayName: 'Mario', signature: 'M' }),
    /sigla/i
  );
  assert.throws(
    () => validateParticipantProfile({ displayName: 'Mario', signature: 'MR', phone: '123' }),
    /telefono/i
  );
});

test('la revisione persistente impedisce di salvare una scheda superata', () => {
  assert.equal(normalizeRevision(undefined), 0);
  assert.equal(nextRevision(4), 5);
  assert.equal(assertCurrentRevision(3, 3), 3);
  assert.throws(
    () => assertCurrentRevision(4, 3),
    (error) => error.code === 'aborted' && /modificata da un altro amministratore/.test(error.message)
  );
});
