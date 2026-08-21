export const MEAL_REMINDER_LEAD_MS = 10 * 60 * 1000;

const REMINDER_MEAL_TYPES = new Set(['lunch', 'dinner']);

export function buildMealReminderPlan(days, {
  now = new Date(),
  sentReminderIds = [],
  leadMs = MEAL_REMINDER_LEAD_MS
} = {}) {
  const nowMs = toTimestamp(now);
  if (!Number.isFinite(nowMs)) return [];

  const today = (Array.isArray(days) ? days : []).find((day) => day?.isToday === true);
  if (!today) return [];

  const sent = new Set(Array.isArray(sentReminderIds) ? sentReminderIds : []);
  return (Array.isArray(today.meals) ? today.meals : [])
    .filter((meal) => REMINDER_MEAL_TYPES.has(String(meal?.mealTypeId || '').toLowerCase()))
    .filter((meal) => meal?.isOpen === true && meal?.effect !== 'PRESENT')
    .map((meal) => {
      const closesAtMs = toTimestamp(meal.closesAt);
      const reminderAtMs = closesAtMs - leadMs;
      const reminderId = `${meal.mealDate}_${meal.mealTypeId}_${closesAtMs}`;
      return {
        reminderId,
        meal,
        closesAtMs,
        reminderAtMs,
        delayMs: Math.max(0, reminderAtMs - nowMs)
      };
    })
    // If Android suspended the PWA at the exact reminder time, recover the
    // reminder when the app resumes, but never after the booking has closed.
    .filter((item) => Number.isFinite(item.closesAtMs)
      && nowMs < item.closesAtMs
      && !sent.has(item.reminderId))
    .sort((left, right) => left.reminderAtMs - right.reminderAtMs);
}

function toTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(value || '').getTime();
  return parsed;
}
