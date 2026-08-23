import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ABSENT,
  PRESENT,
  resolveEffectiveDietTags,
  resolveEffectiveEffect
} from '../../prototypes/firebase-spark-pwa/public/reservation-state.mjs';

const mealDate = '2026-08-07';
const mealTypeId = 'lunch';
const residentRule = {
  participantId: 'resident',
  groupId: 'group_residenti',
  mealTypeIds: [mealTypeId],
  startsOn: '2026-01-01',
  endsOn: null,
  status: 'ACTIVE'
};
const guestRule = {
  participantId: 'guest',
  groupId: 'group_ospiti',
  mealTypeIds: [mealTypeId],
  startsOn: '2026-01-01',
  endsOn: null,
  status: 'ACTIVE'
};

test('residenti e ospiti sono assenti senza una prenotazione esplicita', () => {
  assert.equal(resolveEffectiveEffect({
    participantId: 'resident', mealTypeId, mealDate, rules: [residentRule]
  }), ABSENT);
  assert.equal(resolveEffectiveEffect({
    participantId: 'guest', mealTypeId, mealDate, rules: [guestRule]
  }), ABSENT);
});

test('un override sostituisce il default di una regola attiva', () => {
  assert.equal(resolveEffectiveEffect({
    participantId: 'resident', mealTypeId, mealDate, rules: [residentRule], override: { effect: ABSENT }
  }), ABSENT);
  assert.equal(resolveEffectiveEffect({
    participantId: 'guest', mealTypeId, mealDate, rules: [guestRule], override: { effect: PRESENT }
  }), PRESENT);
});

test('override vecchi non riattivano persone con regola scaduta o disabilitata', () => {
  assert.equal(resolveEffectiveEffect({
    participantId: 'resident',
    mealTypeId,
    mealDate,
    rules: [{ ...residentRule, endsOn: '2026-08-06' }],
    override: { effect: PRESENT }
  }), ABSENT);
  assert.equal(resolveEffectiveEffect({
    participantId: 'resident',
    mealTypeId,
    mealDate,
    rules: [{ ...residentRule, status: 'DISABLED' }],
    override: { effect: PRESENT }
  }), ABSENT);
});

test('un override senza regola non crea una presenza', () => {
  assert.equal(resolveEffectiveEffect({
    participantId: 'unknown', mealTypeId, mealDate, rules: [], override: { effect: PRESENT }
  }), ABSENT);
});

test('la dieta fotografata nella prenotazione prevale sulla dieta anagrafica successiva', () => {
  assert.deepEqual(
    resolveEffectiveDietTags(
      { dietTags: ['7'] },
      { dietTags: ['STANDARD'] }
    ),
    ['STANDARD']
  );
  assert.deepEqual(resolveEffectiveDietTags({ dietTags: ['7'] }, null), ['7']);
  assert.deepEqual(resolveEffectiveDietTags(null, null), ['STANDARD']);
});
