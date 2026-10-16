import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserModule } from '../helpers/browser-module.mjs';
import * as dates from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';
import * as schedule from '../../prototypes/firebase-spark-pwa/public/schedule-utils.mjs';

const firstDay = '2030-01-02';
const calendarDays = 364;
const centerPath = 'centers/test';
const jobPath = `${centerPath}/privateSettings/calendarReconfiguration`;
const mealTypes = ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId }));

async function createCalendar() {
  const base = {
    name: 'Test',
    timezone: 'Europe/Rome',
    reservationCutoffs: { ...schedule.DEFAULT_RESERVATION_CUTOFFS },
    calendarCoveredThrough: schedule.addDaysToDateId(firstDay, calendarDays - 1)
  };
  const records = schedule.buildMealWindowRecords({
    startDateId: firstDay,
    days: calendarDays,
    mealTypes,
    cutoffs: base.reservationCutoffs,
    timeZone: base.timezone
  });
  const documents = new Map([[centerPath, structuredClone(base)]]);
  for (const record of records) {
    documents.set(`${centerPath}/mealWindows/${record.mealWindowId}`, structuredClone(record));
  }
  const initialWindows = new Map(records.map(record => [record.mealWindowId, record.closesAt.toISOString()]));
  const control = { today: firstDay, failWindowBatch: 2, attemptedWindowBatches: 0 };
  const committedWindowWrites = [];
  const progress = [];
  let generatedId = 0;
  const reference = (...parts) => parts.filter(part => typeof part === 'string').join('/');
  const snapshot = ref => ({
    exists: () => documents.has(ref),
    data: () => structuredClone(documents.get(ref))
  });
  const { saveCenterConfiguration } = await loadBrowserModule('calendar-configuration.js', {
    db: {},
    getCurrentUser: () => ({ uid: 'owner' }),
    getActiveCenterId: () => 'test',
    ...dates,
    ...schedule,
    getDateInTimeZone: () => new Date(`${control.today}T12:00:00`),
    collection: reference,
    doc: (...parts) => parts.length === 1 ? `${parts[0]}/generated-${++generatedId}` : reference(...parts),
    getDoc: async ref => snapshot(ref),
    serverTimestamp: () => new Date('2030-01-02T12:00:00Z'),
    runTransaction: async (_, action) => {
      const pending = [];
      await action({
        get: async ref => snapshot(ref),
        set: (ref, data, options) => pending.push([
          ref, options?.merge ? { ...documents.get(ref), ...data } : data
        ]),
        update: (ref, data) => {
          assert.ok(documents.has(ref), `update requires an existing document: ${ref}`);
          pending.push([ref, { ...documents.get(ref), ...data }]);
        }
      });
      const windowWrites = pending.filter(([ref]) => ref.includes('/mealWindows/'));
      if (windowWrites.length > 0) {
        control.attemptedWindowBatches += 1;
        if (control.attemptedWindowBatches === control.failWindowBatch) {
          throw new Error('simulated connection loss while committing windows');
        }
      }
      // Keep writes atomic, including the checkpoint stored with each chunk.
      for (const [ref, value] of pending) documents.set(ref, structuredClone(value));
      committedWindowWrites.push(...windowWrites.map(([ref]) => ref));
    }
  }, ['saveCenterConfiguration']);
  const input = {
    ...base,
    administratorName: 'Owner',
    administratorSignature: 'OW',
    adminEmail: 'owner@example.com',
    onProgress: value => progress.push(value)
  };
  const changedInput = {
    ...input,
    reservationCutoffs: { lunch: '12:00', dinner: '18:00', nextDayBreakfast: '17:00' }
  };
  return {
    base, documents, initialWindows, control, committedWindowWrites, progress,
    input, changedInput, save: saveCenterConfiguration
  };
}

async function interruptAfterFirstChunk(calendar) {
  await assert.rejects(calendar.save(calendar.changedInput), /simulated connection loss/);
  const job = structuredClone(calendar.documents.get(jobPath));
  assert.equal(job.status, 'ACTIVE');
  assert.ok(job.through >= firstDay);
  assert.ok(job.through < calendar.base.calendarCoveredThrough);
  assert.deepEqual(calendar.documents.get(centerPath).reservationCutoffs, calendar.base.reservationCutoffs);
  assert.notEqual(
    calendar.documents.get(`${centerPath}/mealWindows/${firstDay}_lunch`).closesAt.toISOString(),
    calendar.initialWindows.get(`${firstDay}_lunch`)
  );
  const nextDay = schedule.addDaysToDateId(job.through, 1);
  assert.equal(
    calendar.documents.get(`${centerPath}/mealWindows/${nextDay}_lunch`).closesAt.toISOString(),
    calendar.initialWindows.get(`${nextDay}_lunch`)
  );
  calendar.control.failWindowBatch = 0;
  calendar.committedWindowWrites.length = 0;
  calendar.progress.length = 0;
  return job;
}

function assertOriginalCalendarRestored(calendar) {
  for (const [windowId, expected] of calendar.initialWindows) {
    assert.equal(
      calendar.documents.get(`${centerPath}/mealWindows/${windowId}`).closesAt.toISOString(),
      expected,
      windowId
    );
  }
  assert.deepEqual(calendar.documents.get(centerPath).reservationCutoffs, calendar.base.reservationCutoffs);
  assert.equal(calendar.documents.get(jobPath).status, 'COMPLETED');
  assert.deepEqual(calendar.progress.at(-1), {
    completedDays: calendarDays, totalDays: calendarDays, status: 'COMPLETED'
  });
}

test('returning to saved cutoffs after an interrupted rewrite restores every calendar window', async () => {
  const calendar = await createCalendar();
  const interrupted = await interruptAfterFirstChunk(calendar);

  await calendar.save(calendar.input);

  assertOriginalCalendarRestored(calendar);
  assert.notEqual(calendar.documents.get(jobPath).operationId, interrupted.operationId);
  assert.equal(calendar.committedWindowWrites.length, calendarDays * mealTypes.length);
});

test('reverting on a later day also restores windows already rewritten before today', async () => {
  const calendar = await createCalendar();
  await interruptAfterFirstChunk(calendar);
  calendar.control.today = schedule.addDaysToDateId(firstDay, 2);
  // Even if coverage metadata changed, the unfinished job still owns its range.
  calendar.documents.get(centerPath).calendarCoveredThrough = schedule.addDaysToDateId(firstDay, 200);

  await calendar.save(calendar.input);

  assertOriginalCalendarRestored(calendar);
  assert.equal(calendar.documents.get(jobPath).startDate, firstDay);
  assert.equal(calendar.documents.get(jobPath).targetThrough, calendar.base.calendarCoveredThrough);
});

test('retrying the same target resumes after the last committed chunk and completes it', async () => {
  const calendar = await createCalendar();
  const interrupted = await interruptAfterFirstChunk(calendar);
  const completedDays = schedule.daysBetweenDateIds(firstDay, interrupted.through);

  await calendar.save(calendar.changedInput);

  const completed = calendar.documents.get(jobPath);
  assert.equal(completed.operationId, interrupted.operationId);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.through, calendar.base.calendarCoveredThrough);
  assert.deepEqual(calendar.documents.get(centerPath).reservationCutoffs, calendar.changedInput.reservationCutoffs);
  assert.deepEqual(calendar.progress[0], { completedDays, totalDays: calendarDays, status: 'ACTIVE' });
  assert.equal(calendar.committedWindowWrites.length, (calendarDays - completedDays) * mealTypes.length);
  assert.ok(calendar.committedWindowWrites.every(path => path.split('/').at(-1).slice(0, 10) > interrupted.through));
  for (const record of schedule.buildMealWindowRecords({
    startDateId: firstDay,
    days: calendarDays,
    mealTypes,
    cutoffs: calendar.changedInput.reservationCutoffs,
    timeZone: calendar.base.timezone
  })) {
    assert.equal(
      calendar.documents.get(`${centerPath}/mealWindows/${record.mealWindowId}`).closesAt.toISOString(),
      record.closesAt.toISOString(),
      record.mealWindowId
    );
  }
});
