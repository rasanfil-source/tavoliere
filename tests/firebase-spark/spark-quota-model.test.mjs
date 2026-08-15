import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyQuotaRisk,
  estimateSparkDailyUsage,
  formatQuotaPercent,
  simulateKitchenRefreshes
} from '../../tools/lib/spark-quota-model.mjs';

test('adaptive kitchen refresh runs about one hundred times over a full day', () => {
  const events = simulateKitchenRefreshes();

  assert.equal(events.length, 103);
});

test('ordinary 30 participant scenario stays very low on Spark quotas', () => {
  const usage = estimateSparkDailyUsage({
    participants: 30,
    participantOpensPerDay: 2,
    readsPerParticipantOpen: 20,
    writesPerActiveParticipantDay: 2,
    activeWriteParticipantRatio: 0.5,
    readsPerKitchenRefresh: 90
  });

  assert.equal(classifyQuotaRisk(usage), 'LOW');
  assert.equal(usage.reads, 10970);
  assert.equal(usage.writes, 50);
});

test('100 participant limit scenario still stays below the daily read limit with one kitchen screen', () => {
  const usage = estimateSparkDailyUsage({
    participants: 100,
    participantOpensPerDay: 3,
    readsPerParticipantOpen: 20,
    writesPerActiveParticipantDay: 3,
    activeWriteParticipantRatio: 1,
    readsPerKitchenRefresh: 300
  });

  assert.equal(classifyQuotaRisk(usage), 'WATCH');
  assert.ok(usage.reads < 50000);
  assert.equal(usage.writes, 320);
});

test('second full kitchen screen pushes the 100 participant scenario over the free read limit', () => {
  const usage = estimateSparkDailyUsage({
    participants: 100,
    participantOpensPerDay: 3,
    readsPerParticipantOpen: 20,
    writesPerActiveParticipantDay: 3,
    activeWriteParticipantRatio: 1,
    kitchenScreens: 2,
    readsPerKitchenRefresh: 300
  });

  assert.equal(classifyQuotaRisk(usage), 'OVER_LIMIT');
});

test('formats quota ratio for reports', () => {
  assert.equal(formatQuotaPercent(0.2212), '22.1%');
});
