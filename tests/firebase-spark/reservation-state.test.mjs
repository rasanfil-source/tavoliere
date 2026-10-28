import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummaryMatrixScreens, buildKitchenMatrixScreens } from '../../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';

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

test('selezioni personali e per altri producono identici riepilogo e cucina', () => {
  for (const rule of [residentRule, guestRule]) {
    for (const effect of [PRESENT, ABSENT]) {
      const render = source => {
        const override = { effect, source, actorUid: source === 'DELEGATED' ? 'operator' : rule.participantId, dietTags: ['3'] };
        const person = { participantId: rule.participantId, displayName: 'Persona', groupId: rule.groupId,
          dietTags: resolveEffectiveDietTags(rule, override) };
        const selected = resolveEffectiveEffect({ participantId: rule.participantId, mealTypeId, mealDate, rules: [rule], override });
        const days = [{ dateId: mealDate, meals: [{ mealTypeId, label: 'Pranzo', present: selected === PRESENT ? [person] : [] }] }];
        return { summary: buildSummaryMatrixScreens(days, [person], []), kitchen: buildKitchenMatrixScreens(days, []) };
      };
      const personal = render('PERSONAL');
      const delegated = render('DELEGATED');
      assert.deepEqual(delegated, personal);
      assert.equal(delegated.summary[0].columns[0].total, effect === PRESENT ? 1 : 0);
      assert.equal(delegated.kitchen[0].columns[0].total, effect === PRESENT ? 1 : 0);
      assert.equal(delegated.summary[0].columns[0].guestCount, 0, 'non aggiunge invitati occasionali');
    }
  }
});

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
