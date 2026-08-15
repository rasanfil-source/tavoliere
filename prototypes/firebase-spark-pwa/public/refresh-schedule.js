export const KITCHEN_REFRESH_POLICIES = Object.freeze({
  LIVE: Object.freeze({
    key: 'LIVE',
    label: 'operativo',
    intervalMs: 5 * 60 * 1000
  }),
  NORMAL: Object.freeze({
    key: 'NORMAL',
    label: 'ordinario',
    intervalMs: 45 * 60 * 1000
  }),
  NIGHT: Object.freeze({
    key: 'NIGHT',
    label: 'notturno',
    intervalMs: 90 * 60 * 1000
  })
});

const MINUTES_PER_DAY = 24 * 60;
const BOUNDARIES = Object.freeze([
  7 * 60,
  10 * 60,
  13 * 60 + 30,
  17 * 60 + 30,
  23 * 60
]);

export function getKitchenRefreshPolicyForMinutes(minutesOfDay) {
  const minutes = normalizeMinutes(minutesOfDay);

  if (minutes >= 23 * 60 || minutes < 7 * 60) {
    return KITCHEN_REFRESH_POLICIES.NIGHT;
  }

  if (
    (minutes >= 7 * 60 && minutes < 10 * 60) ||
    (minutes >= 13 * 60 + 30 && minutes < 17 * 60 + 30)
  ) {
    return KITCHEN_REFRESH_POLICIES.LIVE;
  }

  return KITCHEN_REFRESH_POLICIES.NORMAL;
}

export function getKitchenRefreshPolicy(date = new Date(), timeZone = 'Europe/Rome') {
  return getKitchenRefreshPolicyForMinutes(getMinutesOfDay(date, timeZone));
}

export function getRecommendedRefreshDelayMs(date = new Date(), timeZone = 'Europe/Rome') {
  const minutes = getMinutesOfDay(date, timeZone);
  const policy = getKitchenRefreshPolicyForMinutes(minutes);
  const boundaryDelayMs = getNextPolicyBoundaryDelayMsForMinutes(minutes);

  return Math.min(policy.intervalMs, boundaryDelayMs);
}

export function getNextPolicyBoundaryDelayMsForMinutes(minutesOfDay) {
  const minutes = normalizeMinutes(minutesOfDay);
  const nextBoundary = BOUNDARIES.find((boundary) => minutes < boundary);
  const deltaMinutes = nextBoundary === undefined
    ? MINUTES_PER_DAY - minutes + BOUNDARIES[0]
    : nextBoundary - minutes;

  return Math.max(deltaMinutes, 1) * 60 * 1000;
}

export function getMinutesOfDay(date, timeZone = 'Europe/Rome') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);

  return hour * 60 + minute;
}

export function formatDelay(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return minutes + ' min';
  }

  if (minutes === 0) {
    return hours + ' h';
  }

  return hours + ' h ' + minutes + ' min';
}

function normalizeMinutes(minutesOfDay) {
  if (!Number.isFinite(minutesOfDay)) {
    return 0;
  }

  return ((Math.floor(minutesOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
