export const DEFAULT_RESERVATION_CUTOFFS = Object.freeze({
  lunch: '09:30',
  dinner: '15:00',
  nextDayBreakfast: '15:00'
});

export const OPERATIONAL_LINK_LIFETIME_DAYS = 9000;
export const CALENDAR_COVERAGE_DAYS = 365;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const zonedDateTimeFormatterCache = new Map();

export function createOperationalAccessExpiry(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + OPERATIONAL_LINK_LIFETIME_DAYS);
  return expiresAt;
}

export function normalizeReservationCutoffs(value = {}) {
  const cutoffs = {
    lunch: value.lunch || DEFAULT_RESERVATION_CUTOFFS.lunch,
    dinner: value.dinner || DEFAULT_RESERVATION_CUTOFFS.dinner,
    nextDayBreakfast: value.nextDayBreakfast || DEFAULT_RESERVATION_CUTOFFS.nextDayBreakfast
  };
  if (!Object.values(cutoffs).every((time) => TIME_PATTERN.test(time))) {
    throw new Error('Gli orari limite devono usare il formato HH:MM');
  }
  return cutoffs;
}

export function addDaysToDateId(dateId, days) {
  const date = parseDateId(dateId);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDateId(date);
}

export function addYearsToDateId(dateId, years) {
  const date = parseDateId(dateId);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return formatUtcDateId(date);
}

export function daysBetweenDateIds(startDateId, endDateId) {
  const start = parseDateId(startDateId);
  const end = parseDateId(endDateId);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function getMealCutoffDate(mealDate, mealTypeId, cutoffsValue, timeZone = 'Europe/Rome') {
  const cutoffs = normalizeReservationCutoffs(cutoffsValue);
  return getMealCutoffDateFromNormalizedCutoffs(mealDate, mealTypeId, cutoffs, timeZone);
}

function getMealCutoffDateFromNormalizedCutoffs(mealDate, mealTypeId, cutoffs, timeZone) {
  if (mealTypeId === 'breakfast') {
    return zonedLocalDateTimeToDate(addDaysToDateId(mealDate, -1), cutoffs.nextDayBreakfast, timeZone);
  }
  if (mealTypeId === 'lunch') {
    return zonedLocalDateTimeToDate(mealDate, cutoffs.lunch, timeZone);
  }
  return zonedLocalDateTimeToDate(mealDate, cutoffs.dinner, timeZone);
}

export function buildMealWindowRecords({ startDateId, days, mealTypes, cutoffs, timeZone }) {
  const records = [];
  const normalizedCutoffs = normalizeReservationCutoffs(cutoffs);
  for (let offset = 0; offset < days; offset += 1) {
    const mealDate = addDaysToDateId(startDateId, offset);
    for (const meal of mealTypes) {
      records.push({
        mealWindowId: `${mealDate}_${meal.mealTypeId}`,
        mealDate,
        mealTypeId: meal.mealTypeId,
        closesAt: getMealCutoffDateFromNormalizedCutoffs(
          mealDate,
          meal.mealTypeId,
          normalizedCutoffs,
          timeZone
        )
      });
    }
  }
  return records;
}

export function zonedLocalDateTimeToDate(dateId, timeValue, timeZone) {
  const [year, month, day] = dateId.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error('Data o ora non valida');
  }

  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = targetAsUtc;
  const formatter = getZonedDateTimeFormatter(timeZone);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value])
    );
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    const correction = targetAsUtc - representedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }

  return new Date(candidate);
}

function getZonedDateTimeFormatter(timeZone) {
  if (!zonedDateTimeFormatterCache.has(timeZone)) {
    zonedDateTimeFormatterCache.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }));
  }
  return zonedDateTimeFormatterCache.get(timeZone);
}

function parseDateId(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDateId(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}
