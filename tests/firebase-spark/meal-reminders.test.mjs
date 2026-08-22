import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildMealReminderPlan,
  MEAL_REMINDER_LEAD_MS
} from '../../prototypes/firebase-spark-pwa/public/meal-reminders.mjs';

const appPath = new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url);
const htmlPath = new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url);
const workerPath = new URL('../../prototypes/firebase-spark-pwa/public/sw.js', import.meta.url);

function todayWithMeals(meals) {
  return [{ date: '2026-08-21', isToday: true, meals }];
}

test('il promemoria considera solo pranzo e cena non ancora prenotati', () => {
  const closesAt = '2026-08-21T10:00:00.000Z';
  const plan = buildMealReminderPlan(todayWithMeals([
    { mealDate: '2026-08-21', mealTypeId: 'breakfast', isOpen: true, effect: 'ABSENT', closesAt },
    { mealDate: '2026-08-21', mealTypeId: 'lunch', isOpen: true, effect: 'ABSENT', closesAt },
    { mealDate: '2026-08-21', mealTypeId: 'dinner', isOpen: true, effect: 'PRESENT', closesAt }
  ]), { now: new Date('2026-08-21T09:40:00.000Z') });

  assert.equal(plan.length, 1);
  assert.equal(plan[0].meal.mealTypeId, 'lunch');
  assert.equal(plan[0].delayMs, 10 * 60 * 1000);
  assert.equal(plan[0].reminderAtMs, new Date(closesAt).getTime() - MEAL_REMINDER_LEAD_MS);
});

test('una PWA ripresa nella finestra utile recupera il promemoria una sola volta', () => {
  const meal = {
    mealDate: '2026-08-21',
    mealTypeId: 'dinner',
    isOpen: true,
    effect: 'ABSENT',
    closesAt: '2026-08-21T15:00:00.000Z'
  };
  const recovered = buildMealReminderPlan(todayWithMeals([meal]), {
    now: new Date('2026-08-21T14:55:00.000Z')
  });
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].delayMs, 0);

  const alreadySent = buildMealReminderPlan(todayWithMeals([meal]), {
    now: new Date('2026-08-21T14:55:00.000Z'),
    sentReminderIds: [recovered[0].reminderId]
  });
  assert.deepEqual(alreadySent, []);

  const closed = buildMealReminderPlan(todayWithMeals([meal]), {
    now: new Date('2026-08-21T15:00:00.000Z')
  });
  assert.deepEqual(closed, []);
});

test('permesso, preferenza e disattivazione restano gesti espliciti del dispositivo', async () => {
  const [app, html, worker] = await Promise.all([
    readFile(appPath, 'utf8'),
    readFile(htmlPath, 'utf8'),
    readFile(workerPath, 'utf8')
  ]);

  assert.match(html, /data-meal-reminder-select/);
  assert.match(app, /addEventListener\('change', handleMealReminderPreferenceChange\)/);
  assert.match(app, /Notification\.requestPermission\(\)/);
  assert.match(app, /registration\.showNotification/);
  assert.match(app, /const MEAL_REMINDER_RECONCILE_MS = 60 \* 1000/);
  assert.match(app, /window\.setInterval\([\s\S]*scheduleMealRemindersFromCurrentCalendar\(\)[\s\S]*MEAL_REMINDER_RECONCILE_MS/);
  assert.match(app, /window\.addEventListener\('focus', scheduleMealRemindersFromCurrentCalendar\)/);
  assert.match(worker, /addEventListener\('notificationclick'/);
  assert.match(worker, /searchParams\.set\('mealReminders', 'off'\)/);
  assert.match(worker, /'\/meal-reminders\.mjs'/);
});
