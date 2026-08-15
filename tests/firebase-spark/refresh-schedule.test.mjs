import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KITCHEN_REFRESH_POLICIES,
  formatDelay,
  getKitchenRefreshPolicyForMinutes,
  getNextPolicyBoundaryDelayMsForMinutes,
  getRecommendedRefreshDelayMs
} from '../../prototypes/firebase-spark-pwa/public/refresh-schedule.js';

const minute = 60 * 1000;

test('uses live refresh during morning operational window', () => {
  assert.equal(getKitchenRefreshPolicyForMinutes(7 * 60).key, 'LIVE');
  assert.equal(getKitchenRefreshPolicyForMinutes(9 * 60 + 59).key, 'LIVE');
});

test('uses live refresh during afternoon operational window', () => {
  assert.equal(getKitchenRefreshPolicyForMinutes(13 * 60 + 30).key, 'LIVE');
  assert.equal(getKitchenRefreshPolicyForMinutes(17 * 60 + 29).key, 'LIVE');
});

test('uses normal refresh outside operational windows before night', () => {
  assert.equal(getKitchenRefreshPolicyForMinutes(10 * 60).key, 'NORMAL');
  assert.equal(getKitchenRefreshPolicyForMinutes(17 * 60 + 30).key, 'NORMAL');
  assert.equal(getKitchenRefreshPolicyForMinutes(22 * 60 + 59).key, 'NORMAL');
});

test('uses night refresh between 23:00 and 07:00', () => {
  assert.equal(getKitchenRefreshPolicyForMinutes(23 * 60).key, 'NIGHT');
  assert.equal(getKitchenRefreshPolicyForMinutes(6 * 60 + 59).key, 'NIGHT');
});

test('does not schedule past a policy boundary', () => {
  assert.equal(getRecommendedRefreshDelayMs(dateAtUtc('2026-08-04T06:30:00'), 'UTC'), 30 * minute);
  assert.equal(getRecommendedRefreshDelayMs(dateAtUtc('2026-08-04T22:59:00'), 'UTC'), 1 * minute);
});

test('uses policy interval when boundary is farther away', () => {
  assert.equal(getRecommendedRefreshDelayMs(dateAtUtc('2026-08-04T07:10:00'), 'UTC'), KITCHEN_REFRESH_POLICIES.LIVE.intervalMs);
  assert.equal(getRecommendedRefreshDelayMs(dateAtUtc('2026-08-04T18:00:00'), 'UTC'), KITCHEN_REFRESH_POLICIES.NORMAL.intervalMs);
  assert.equal(getRecommendedRefreshDelayMs(dateAtUtc('2026-08-04T23:30:00'), 'UTC'), KITCHEN_REFRESH_POLICIES.NIGHT.intervalMs);
});

test('reports next boundary delay with day wrap', () => {
  assert.equal(getNextPolicyBoundaryDelayMsForMinutes(23 * 60 + 30), 450 * minute);
});

test('formats delays for compact UI', () => {
  assert.equal(formatDelay(5 * minute), '5 min');
  assert.equal(formatDelay(45 * minute), '45 min');
  assert.equal(formatDelay(90 * minute), '1 h 30 min');
});

function dateAtUtc(value) {
  return new Date(value + 'Z');
}
