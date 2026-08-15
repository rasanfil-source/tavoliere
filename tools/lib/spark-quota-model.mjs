import { getRecommendedRefreshDelayMs } from '../../prototypes/firebase-spark-pwa/public/refresh-schedule.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const FIREBASE_SPARK_LIMITS = Object.freeze({
  firestoreReadsPerDay: 50000,
  firestoreWritesPerDay: 20000,
  firestoreDeletesPerDay: 20000,
  firestoreStorageBytes: 1024 * 1024 * 1024,
  hostingTransferBytesPerDay: 360 * 1024 * 1024
});

export function simulateKitchenRefreshes({
  start = new Date('2026-08-04T00:00:00+02:00'),
  hours = 24,
  timeZone = 'Europe/Rome'
} = {}) {
  const events = [];
  const startMs = start.getTime();
  const endMs = startMs + hours * 60 * 60 * 1000;
  let cursorMs = startMs;

  while (cursorMs < endMs) {
    const date = new Date(cursorMs);
    const delayMs = getRecommendedRefreshDelayMs(date, timeZone);
    events.push({
      at: date,
      delayMs
    });
    cursorMs += delayMs;
  }

  return events;
}

export function estimateSparkDailyUsage({
  participants = 30,
  participantOpensPerDay = 2,
  readsPerParticipantOpen = 20,
  writesPerActiveParticipantDay = 2,
  activeWriteParticipantRatio = 0.5,
  kitchenScreens = 1,
  readsPerKitchenRefresh = participants * 3,
  adminReadsPerDay = 500,
  adminWritesPerDay = 20,
  kitchenHoursPerDay = 24,
  timeZone = 'Europe/Rome'
} = {}) {
  const kitchenRefreshes = simulateKitchenRefreshes({
    hours: kitchenHoursPerDay,
    timeZone
  }).length;
  const participantReads = participants * participantOpensPerDay * readsPerParticipantOpen;
  const kitchenReads = kitchenScreens * kitchenRefreshes * readsPerKitchenRefresh;
  const reads = participantReads + kitchenReads + adminReadsPerDay;
  const participantWrites = Math.ceil(participants * activeWriteParticipantRatio) * writesPerActiveParticipantDay;
  const writes = participantWrites + adminWritesPerDay;

  return {
    reads,
    writes,
    deletes: 0,
    kitchenRefreshes,
    participantReads,
    kitchenReads,
    adminReads: adminReadsPerDay,
    participantWrites,
    adminWrites: adminWritesPerDay,
    readLimitRatio: reads / FIREBASE_SPARK_LIMITS.firestoreReadsPerDay,
    writeLimitRatio: writes / FIREBASE_SPARK_LIMITS.firestoreWritesPerDay
  };
}

export function classifyQuotaRisk(usage) {
  if (usage.readLimitRatio >= 1 || usage.writeLimitRatio >= 1) {
    return 'OVER_LIMIT';
  }

  if (usage.readLimitRatio >= 0.75 || usage.writeLimitRatio >= 0.75) {
    return 'HIGH';
  }

  if (usage.readLimitRatio >= 0.5 || usage.writeLimitRatio >= 0.5) {
    return 'WATCH';
  }

  return 'LOW';
}

export function formatQuotaPercent(value) {
  return Math.round(value * 1000) / 10 + '%';
}
