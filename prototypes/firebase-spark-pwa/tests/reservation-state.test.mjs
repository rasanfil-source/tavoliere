import assert from 'node:assert/strict';
import {
  ABSENT,
  PRESENT,
  resolveEffectiveEffect
} from '../public/reservation-state.mjs';

const date = '2026-08-07';
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
  defaultEffect: ABSENT,
  mealTypeIds: [mealTypeId],
  startsOn: '2026-01-01',
  endsOn: null,
  status: 'ACTIVE'
};

assert.equal(resolveEffectiveEffect({
  participantId: 'resident', mealTypeId, mealDate: date, rules: [residentRule]
}), PRESENT, 'a resident without an override is present');

assert.equal(resolveEffectiveEffect({
  participantId: 'guest', mealTypeId, mealDate: date, rules: [guestRule]
}), ABSENT, 'a guest without an override is absent');

assert.equal(resolveEffectiveEffect({
  participantId: 'resident', mealTypeId, mealDate: date, rules: [residentRule], override: { effect: ABSENT }
}), ABSENT, 'an override replaces the resident default');

assert.equal(resolveEffectiveEffect({
  participantId: 'guest', mealTypeId, mealDate: date, rules: [guestRule], override: { effect: PRESENT }
}), PRESENT, 'an override replaces the guest default');

assert.equal(resolveEffectiveEffect({
  participantId: 'resident', mealTypeId, mealDate: date,
  rules: [{ ...residentRule, endsOn: '2026-08-06' }]
}), ABSENT, 'an expired rule does not apply');

assert.equal(resolveEffectiveEffect({
  participantId: 'unknown', mealTypeId, mealDate: date, rules: []
}), ABSENT, 'no rule and no override remains absent');

console.log('reservation-state: 6 tests passed');
