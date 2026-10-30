import {
  PRESENT,
  resolveEffectiveEffect
} from '../prototypes/firebase-spark-pwa/public/reservation-state.mjs?v=20261014b';
import {
  addDaysToDateId,
  zonedLocalDateTimeToDate
} from '../prototypes/firebase-spark-pwa/public/schedule-utils.mjs?v=20261014b';

const projectId = process.env.GCP_PROJECT_ID;
const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
const mealTypeIds = ['breakfast', 'lunch', 'dinner'];
const dailyCollection = 'kitchenDailyTotals';
const monthlyCollection = 'kitchenMonthlySummaries';
const totalsMetadataCollection = 'kitchenTotalsMetadata';
const retentionMonths = 3;
const firstTrackedDate = '2026-11-01';
const dailyCloseTime = '23:00';
const monthEndCloseTime = '21:00';
const apiRoot = projectId
  ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`
  : '';

if (!projectId || !accessToken) {
  throw new Error('GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN are required.');
}

const now = new Date();
const centers = await listDocuments('centers');
let processedCenters = 0;
let writtenDailyTotals = 0;
let writtenMonthlySummaries = 0;
let deletedDocuments = 0;

for (const centerDocument of centers) {
  const center = decodeFields(centerDocument.fields || {});
  const centerId = documentId(centerDocument.name);
  if (!centerId) continue;

  const timeZone = typeof center.timezone === 'string' ? center.timezone : 'Europe/Rome';
  const localToday = localDateId(now, timeZone);
  if (center.status === 'ACTIVE') {
    const trackingPath = `centers/${centerId}/${totalsMetadataCollection}/tracking`;
    let trackingDocument = await getDocument(trackingPath);
    if (!trackingDocument) {
      await createDocument(trackingPath, {
        centerId,
        trackingStartedOn: firstTrackedDate,
        createdAt: now
      });
      trackingDocument = await getDocument(trackingPath);
    }
    const trackingStartedOn = decodeFields(trackingDocument?.fields || {}).trackingStartedOn || localToday;
    const targetDates = Array.from({ length: 8 }, (_, daysBack) => daysBack)
      .map((daysBack) => addDaysToDateId(localToday, -daysBack))
      .reverse()
      .filter((dateId) => dateId >= trackingStartedOn);
    let rules = null;

    for (const dateId of targetDates) {
      const path = `centers/${centerId}/${dailyCollection}/${dateId}`;
      if (await getDocument(path)) continue;

      const windows = await queryDocuments(`centers/${centerId}`, 'mealWindows', [
        { field: 'mealDate', op: 'EQUAL', value: dateId }
      ]);
      const mealCutoff = latestCompleteCutoff(windows);
      const booksClose = accountingClose(dateId, timeZone);
      const closesAt = mealCutoff && mealCutoff > booksClose ? mealCutoff : booksClose;
      if (!closesAt || closesAt > now) continue;

      if (!rules) {
        rules = (await listDocuments(`centers/${centerId}/reservationRules`))
          .map((document) => decodeFields(document.fields || {}));
      }

      const overrides = (await queryDocuments(`centers/${centerId}`, 'reservationOverrides', [
        { field: 'mealDate', op: 'EQUAL', value: dateId }
      ])).map((document) => decodeFields(document.fields || {}));
      const dailyHealthDocument = await getDocument(`centers/${centerId}/dailyHealth/${dateId}`);
      const dailyHealth = dailyHealthDocument
        ? decodeFields(dailyHealthDocument.fields || {})
        : {};
      const counts = countKitchenMeals({ rules, overrides, dailyHealth, dateId });

      await createDocument(path, {
        centerId,
        dateId,
        counts,
        recordedAt: new Date(),
        purgeAfter: localMidnight(addMonthsClamped(dateId, retentionMonths), timeZone)
      });
      writtenDailyTotals += 1;
    }

    writtenMonthlySummaries += await createAvailableMonthlySummary({
      centerId,
      localToday,
      timeZone,
      now
    });
  }

  deletedDocuments += await purgeExpiredDocuments(centerId, now);
  processedCenters += 1;
}

console.log(JSON.stringify({
  processedCenters,
  writtenDailyTotals,
  writtenMonthlySummaries,
  deletedDocuments
}));

function countKitchenMeals({ rules, overrides, dailyHealth, dateId }) {
  const rulesByParticipant = new Map();
  rules.forEach((rule) => {
    if (typeof rule.participantId !== 'string' || !rule.participantId) return;
    const participantRules = rulesByParticipant.get(rule.participantId) || [];
    participantRules.push(rule);
    rulesByParticipant.set(rule.participantId, participantRules);
  });

  const sickIds = new Set((Array.isArray(dailyHealth.sickPeople) ? dailyHealth.sickPeople : [])
    .map((person) => String(person?.participantId || '').trim())
    .filter(Boolean));
  const invitedMeals = dailyHealth.invitedMeals || {};
  const counts = {};

  for (const mealTypeId of mealTypeIds) {
    const mealOverrides = overrides.filter((override) => override.mealTypeId === mealTypeId);
    const overrideByParticipant = new Map(mealOverrides.map((override) => [
      override.participantId,
      override
    ]));
    const participantIds = new Set([
      ...rulesByParticipant.keys(),
      ...mealOverrides.map((override) => override.participantId)
    ]);
    let presentCount = 0;

    for (const participantId of participantIds) {
      const participantRules = rulesByParticipant.get(participantId) || [];
      const override = overrideByParticipant.get(participantId);
      const effect = resolveEffectiveEffect({
        participantId,
        mealTypeId,
        mealDate: dateId,
        rules: participantRules,
        override
      });
      if (effect === PRESENT && !sickIds.has(participantId)) presentCount += 1;
    }

    const invitedCount = Math.min(999, Math.max(0, Math.floor(Number(invitedMeals[mealTypeId]) || 0)));
    counts[mealTypeId] = presentCount + invitedCount;
  }

  return counts;
}

function latestCompleteCutoff(windowDocuments) {
  const windows = windowDocuments.map((document) => decodeFields(document.fields || {}));
  const closesAt = windows
    .map((window) => window.closesAt)
    .filter((value) => value instanceof Date && Number.isFinite(value.getTime()));
  if (closesAt.length === 0) return null;
  return new Date(Math.max(...closesAt.map((value) => value.getTime())));
}

async function createAvailableMonthlySummary({ centerId, localToday, timeZone, now: currentTime }) {
  const candidateMonths = [previousMonthId(localToday), localToday.slice(0, 7)];
  let created = 0;

  for (const monthId of candidateMonths) {
    const periodStart = `${monthId}-01`;
    const periodEnd = monthEndDateId(monthId);
    if (localToday < periodEnd) continue;

    const summaryPath = `centers/${centerId}/${monthlyCollection}/${monthId}`;
    const windows = await queryDocuments(`centers/${centerId}`, 'mealWindows', [
      { field: 'mealDate', op: 'EQUAL', value: periodEnd }
    ]);
    const mealCutoff = latestCompleteCutoff(windows);
    const booksClose = localDateTime(periodEnd, monthEndCloseTime, timeZone);
    const availableFrom = mealCutoff && mealCutoff > booksClose ? mealCutoff : booksClose;
    if (!availableFrom || availableFrom > currentTime) continue;

    const existingSummary = await getDocument(summaryPath);
    const summary = existingSummary
      ? decodeFields(existingSummary.fields || {})
      : await calculateMonthlySummary({
          centerId,
          monthId,
          periodStart,
          periodEnd,
          availableFrom,
          currentTime,
          timeZone
        });
    if (!summary) continue;

    if (!existingSummary) {
      await createDocument(summaryPath, summary);
      created += 1;
    }
    await advanceCurrentSummary(centerId, summary);
  }

  return created;
}

async function calculateMonthlySummary({
  centerId,
  monthId,
  periodStart,
  periodEnd,
  availableFrom,
  currentTime,
  timeZone
}) {
  const dailyDocuments = await queryDocuments(`centers/${centerId}`, dailyCollection, [
    { field: 'dateId', op: 'GREATER_THAN_OR_EQUAL', value: periodStart },
    { field: 'dateId', op: 'LESS_THAN_OR_EQUAL', value: periodEnd }
  ]);
  const dailyByDate = new Map(dailyDocuments.map((document) => {
    const data = decodeFields(document.fields || {});
    return [data.dateId, data];
  }));
  const expectedDayCount = daysInMonth(monthId);
  if (dailyByDate.size !== expectedDayCount) return null;

  const counts = Object.fromEntries(mealTypeIds.map((mealTypeId) => [mealTypeId, 0]));
  for (let offset = 0; offset < expectedDayCount; offset += 1) {
    const dateId = addDaysToDateId(periodStart, offset);
    const dailyCounts = dailyByDate.get(dateId)?.counts;
    if (!dailyCounts || mealTypeIds.some((mealTypeId) => !validCount(dailyCounts[mealTypeId]))) {
      return null;
    }
    mealTypeIds.forEach((mealTypeId) => { counts[mealTypeId] += dailyCounts[mealTypeId]; });
  }

  return {
    centerId,
    monthId,
    periodStart,
    periodEnd,
    counts,
    availableFrom,
    recordedAt: currentTime,
    purgeAfter: localMidnight(addMonthsClamped(periodEnd, retentionMonths), timeZone)
  };
}

async function advanceCurrentSummary(centerId, summary) {
  const currentPath = `centers/${centerId}/${totalsMetadataCollection}/currentSummary`;
  const currentDocument = await getDocument(currentPath);
  const currentMonthId = decodeFields(currentDocument?.fields || {}).monthId || '';
  if (currentMonthId > summary.monthId) return;

  await upsertDocument(currentPath, {
    centerId,
    monthId: summary.monthId,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    counts: summary.counts,
    availableFrom: summary.availableFrom,
    updatedAt: new Date()
  });
}

async function purgeExpiredDocuments(centerId, currentTime) {
  let deleted = 0;
  for (const collectionId of [dailyCollection, monthlyCollection]) {
    const expired = await queryDocuments(`centers/${centerId}`, collectionId, [
      { field: 'purgeAfter', op: 'LESS_THAN_OR_EQUAL', value: currentTime }
    ]);
    for (let offset = 0; offset < expired.length; offset += 400) {
      const batch = expired.slice(offset, offset + 400);
      await commitWrites(batch.map((document) => ({ delete: document.name })));
      deleted += batch.length;
    }
  }

  return deleted;
}

async function listDocuments(collectionPath) {
  const documents = [];
  let pageToken = '';
  do {
    const suffix = `?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const response = await requestJson(`/${encodePath(collectionPath)}${suffix}`);
    documents.push(...(response.documents || []));
    pageToken = response.nextPageToken || '';
  } while (pageToken);
  return documents;
}

async function queryDocuments(parentPath, collectionId, filters, limit = 1000) {
  const fieldFilters = filters.map(({ field, op, value }) => ({
    fieldFilter: {
      field: { fieldPath: field },
      op,
      value: encodeValue(value)
    }
  }));
  const where = fieldFilters.length === 1
    ? fieldFilters[0]
    : { compositeFilter: { op: 'AND', filters: fieldFilters } };
  const response = await requestJson(`/${encodePath(parentPath)}:runQuery`, {
    method: 'POST',
    body: {
      structuredQuery: {
        from: [{ collectionId }],
        where,
        limit
      }
    }
  });
  return (Array.isArray(response) ? response : [])
    .map((item) => item.document)
    .filter(Boolean);
}

async function getDocument(documentPath) {
  return requestJson(`/${encodePath(documentPath)}`, { allowNotFound: true });
}

async function createDocument(documentPath, data) {
  const name = `${apiRoot}/${encodePath(documentPath)}`;
  await commitWrites([{
    update: { name, fields: encodeFields(data) },
    currentDocument: { exists: false }
  }]);
}

async function upsertDocument(documentPath, data) {
  const name = `${apiRoot}/${encodePath(documentPath)}`;
  await commitWrites([{ update: { name, fields: encodeFields(data) } }]);
}

async function commitWrites(writes) {
  if (writes.length === 0) return;
  await requestJson(':commit', {
    method: 'POST',
    body: { writes }
  });
}

async function requestJson(path, { method = 'GET', body, allowNotFound = false } = {}) {
  const response = await fetch(`${apiRoot}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (allowNotFound && response.status === 404) return null;
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Firestore API ${method} ${path} failed (${response.status}): ${responseText}`);
  }
  return responseText ? JSON.parse(responseText) : null;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function documentId(name = '') {
  return decodeURIComponent(String(name).split('/').at(-1) || '');
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('nullValue' in value) return null;
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  return undefined;
}

function encodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)]));
}

function encodeValue(value) {
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

function localDateId(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function localMidnight(dateId, timeZone) {
  return zonedLocalDateTimeToDate(dateId, '00:00', timeZone);
}

function localDateTime(dateId, time, timeZone) {
  return zonedLocalDateTimeToDate(dateId, time, timeZone);
}

function accountingClose(dateId, timeZone) {
  const monthEnd = monthEndDateId(dateId.slice(0, 7));
  const closeTime = dateId === monthEnd ? monthEndCloseTime : dailyCloseTime;
  return localDateTime(dateId, closeTime, timeZone);
}

function addMonthsClamped(dateId, amount) {
  const [year, month, day] = dateId.split('-').map(Number);
  const targetFirst = new Date(Date.UTC(year, month - 1 + amount, 1));
  const lastDay = new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0))
    .getUTCDate();
  return [
    targetFirst.getUTCFullYear(),
    String(targetFirst.getUTCMonth() + 1).padStart(2, '0'),
    String(Math.min(day, lastDay)).padStart(2, '0')
  ].join('-');
}

function monthEndDateId(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthId}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function previousMonthId(dateId) {
  const [year, month] = dateId.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}

function validCount(value) {
  return Number.isInteger(value) && value >= 0;
}
