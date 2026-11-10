import { countKitchenMeals } from './lib/kitchen-accounting.mjs';
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
const dailyRetentionMonths = 3;
const monthlyRetentionMonths = 24;
const firstTrackedDate = '2026-11-01';
const dailyCloseTime = '23:00';
const monthEndCloseTime = '21:00';
const requestAttempts = 5;
const requestTimeoutMs = 30_000;
const retryableHttpStatuses = new Set([408, 429, 500, 502, 503, 504]);
const resourceRoot = projectId
  ? `projects/${encodeURIComponent(projectId)}/databases/(default)/documents`
  : '';
const apiRoot = projectId
  ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`
  : '';

if (!projectId || !accessToken) {
  throw new Error('GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN are required.');
}

const now = new Date();
const centers = await listDocuments('centers');
let activeCentersProcessed = 0;
let centerDocumentsFound = 0;
let deletedCenterDocuments = 0;
let otherNonActiveCenterDocuments = 0;
let writtenDailyTotals = 0;
let writtenMonthlySummaries = 0;
let deletedDocuments = 0;

for (const centerDocument of centers) {
  centerDocumentsFound += 1;
  const center = decodeFields(centerDocument.fields || {});
  const centerId = documentId(centerDocument.name);
  if (!centerId) continue;

  if (center.status === 'ACTIVE') activeCentersProcessed += 1;
  else if (center.status === 'DELETED') deletedCenterDocuments += 1;
  else otherNonActiveCenterDocuments += 1;

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
    const dailySnapshots = new Map();
    const dailyCutoffs = new Map();

    for (const dateId of targetDates) {
      const path = `centers/${centerId}/${dailyCollection}/${dateId}`;
      const existing = await getDocument(path);
      dailySnapshots.set(dateId, existing);
      if (existing) continue;

      const windows = await queryDocuments(`centers/${centerId}`, 'mealWindows', [
        { field: 'mealDate', op: 'EQUAL', value: dateId }
      ]);
      const mealCutoff = latestCompleteCutoff(windows);
      const booksClose = accountingClose(dateId, timeZone);
      const closesAt = mealCutoff && mealCutoff > booksClose ? mealCutoff : booksClose;
      dailyCutoffs.set(dateId, closesAt);
      if (!closesAt || closesAt > now) continue;

      const overrides = (await queryDocuments(`centers/${centerId}`, 'reservationOverrides', [
        { field: 'mealDate', op: 'EQUAL', value: dateId }
      ])).map((document) => decodeFields(document.fields || {}));
      const dailyHealthDocument = await getDocument(`centers/${centerId}/dailyHealth/${dateId}`);
      const dailyHealth = dailyHealthDocument
        ? decodeFields(dailyHealthDocument.fields || {})
        : {};
      const { counts, invitedCounts } = countKitchenMeals({ overrides, dailyHealth, dateId });

      await createDocument(path, {
        centerId,
        dateId,
        counts,
        invitedCounts,
        recordedAt: new Date(),
        purgeAfter: localMidnight(addMonthsClamped(dateId, dailyRetentionMonths), timeZone)
      });
      writtenDailyTotals += 1;
      dailySnapshots.delete(dateId);
    }

    writtenMonthlySummaries += await createAvailableMonthlySummary({
      centerId,
      localToday,
      timeZone,
      now,
      dailySnapshots,
      dailyCutoffs
    });
  }

  deletedDocuments += await purgeExpiredDocuments(centerId, now);
}

console.log(JSON.stringify({
  centerDocumentsFound,
  activeCentersProcessed,
  deletedCenterDocuments,
  otherNonActiveCenterDocuments,
  writtenDailyTotals,
  writtenMonthlySummaries,
  deletedDocuments
}));

function latestCompleteCutoff(windowDocuments) {
  const windows = windowDocuments.map((document) => decodeFields(document.fields || {}));
  const closesAt = windows
    .map((window) => window.closesAt)
    .filter((value) => value instanceof Date && Number.isFinite(value.getTime()));
  if (closesAt.length === 0) return null;
  return new Date(Math.max(...closesAt.map((value) => value.getTime())));
}

async function createAvailableMonthlySummary({
  centerId, localToday, timeZone, now: currentTime,
  dailySnapshots = new Map(), dailyCutoffs = new Map()
}) {
  const candidateMonths = [previousMonthId(localToday), localToday.slice(0, 7)];
  let created = 0;
  let latestSummary = null;

  for (const monthId of candidateMonths) {
    const periodStart = `${monthId}-01`;
    const periodEnd = monthEndDateId(monthId);
    if (periodStart < firstTrackedDate) continue;

    const summaryPath = `centers/${centerId}/${monthlyCollection}/${monthId}`;
    const existingSnapshot = await getDocument(summaryPath);
    const existingSummary = existingSnapshot
      ? decodeFields(existingSnapshot.fields || {})
      : null;
    // Un mese completo e consolidato non viene più ricalcolato.
    if (existingSummary?.finalized === true) {
      latestSummary = existingSummary;
      continue;
    }

    let closedThrough = localToday < periodEnd ? localToday : periodEnd;
    while (closedThrough >= periodStart) {
      if (dailySnapshots.get(closedThrough)) break;
      if (!dailyCutoffs.has(closedThrough)) {
        const windows = await queryDocuments(`centers/${centerId}`, 'mealWindows', [
          { field: 'mealDate', op: 'EQUAL', value: closedThrough }
        ]);
        const mealCutoff = latestCompleteCutoff(windows);
        const booksClose = accountingClose(closedThrough, timeZone);
        dailyCutoffs.set(closedThrough, mealCutoff && mealCutoff > booksClose ? mealCutoff : booksClose);
      }
      const cutoff = dailyCutoffs.get(closedThrough);
      if (cutoff && cutoff <= currentTime) break;
      closedThrough = addDaysToDateId(closedThrough, -1);
    }
    if (closedThrough < periodStart) closedThrough = null;

    let needsRecalculation = !existingSummary
      || existingSummary.closedThrough !== closedThrough
      || typeof existingSummary.finalized !== 'boolean';
    // Ripara anche una giornata recuperata dopo la prima pubblicazione,
    // senza rileggere ogni volta tutti i registri del mese.
    if (!needsRecalculation) {
      for (const dateId of existingSummary.missingDates || []) {
        if (!dailySnapshots.has(dateId)) {
          dailySnapshots.set(dateId, await getDocument(`centers/${centerId}/${dailyCollection}/${dateId}`));
        }
        if (dailySnapshots.get(dateId)) {
          needsRecalculation = true;
          break;
        }
      }
    }
    if (!needsRecalculation) {
      latestSummary = existingSummary;
      continue;
    }

    const calculatedSummary = await calculateMonthlySummary({
      centerId,
      monthId,
      periodStart,
      periodEnd,
      availableFrom: localMidnight(periodStart, timeZone),
      closedThrough,
      currentTime,
      timeZone
    });
    let summary = calculatedSummary;
    if (!existingSummary) {
      await createDocument(summaryPath, summary);
      created += 1;
    } else if (sameSummaryData(existingSummary, calculatedSummary)) {
      summary = existingSummary;
    } else {
      await upsertDocument(summaryPath, calculatedSummary);
    }
    latestSummary = summary;
  }

  if (latestSummary) await advanceCurrentSummary(centerId, latestSummary);
  return created;
}

async function calculateMonthlySummary({
  centerId,
  monthId,
  periodStart,
  periodEnd,
  closedThrough,
  availableFrom,
  currentTime,
  timeZone
}) {
  const dailyDocuments = closedThrough ? await queryDocuments(`centers/${centerId}`, dailyCollection, [
    { field: 'dateId', op: 'GREATER_THAN_OR_EQUAL', value: periodStart },
    { field: 'dateId', op: 'LESS_THAN_OR_EQUAL', value: closedThrough }
  ]) : [];
  const dailyByDate = new Map(dailyDocuments.map((document) => {
    const data = decodeFields(document.fields || {});
    return [data.dateId, data];
  }));
  const expectedDayCount = closedThrough ? Number(closedThrough.slice(-2)) : 0;

  const counts = Object.fromEntries(mealTypeIds.map((mealTypeId) => [mealTypeId, 0]));
  const missingDates = [];
  let invitedTotal = 0;
  for (let offset = 0; offset < expectedDayCount; offset += 1) {
    const dateId = addDaysToDateId(periodStart, offset);
    const dailyRecord = dailyByDate.get(dateId);
    const dailyCounts = dailyRecord?.counts;
    if (!dailyCounts || mealTypeIds.some((mealTypeId) => !validCount(dailyCounts[mealTypeId]))) {
      missingDates.push(dateId);
      continue;
    }
    let invitedCounts = dailyRecord.invitedCounts;
    if (!invitedCounts) {
      const dailyHealthDocument = await getDocument('centers/' + centerId + '/dailyHealth/' + dateId);
      const dailyHealth = dailyHealthDocument
        ? decodeFields(dailyHealthDocument.fields || {})
        : {};
      invitedCounts = normalizeInvitedCounts(dailyHealth.invitedMeals || {});
    }
    if (!invitedCounts || mealTypeIds.some((mealTypeId) => !validCount(invitedCounts[mealTypeId]))) {
      missingDates.push(dateId);
      continue;
    }
    invitedTotal += mealTypeIds.reduce((total, mealTypeId) => total + invitedCounts[mealTypeId], 0);
    mealTypeIds.forEach((mealTypeId) => { counts[mealTypeId] += dailyCounts[mealTypeId]; });
  }

  return {
    centerId,
    monthId,
    periodStart,
    periodEnd,
    counts,
    invitedTotal,
    missingDates,
    closedThrough,
    finalized: closedThrough === periodEnd && missingDates.length === 0,
    availableFrom,
    recordedAt: currentTime,
    purgeAfter: localMidnight(addMonthsClamped(periodEnd, monthlyRetentionMonths), timeZone)
  };
}

function sameSummaryData(existing, calculated) {
  return existing.monthId === calculated.monthId
    && existing.periodStart === calculated.periodStart
    && existing.periodEnd === calculated.periodEnd
    && existing.closedThrough === calculated.closedThrough
    && existing.finalized === calculated.finalized
    && existing.invitedTotal === calculated.invitedTotal
    && mealTypeIds.every((mealTypeId) => existing.counts?.[mealTypeId] === calculated.counts[mealTypeId])
    && JSON.stringify(existing.missingDates || []) === JSON.stringify(calculated.missingDates);
}

async function advanceCurrentSummary(centerId, summary) {
  const currentPath = `centers/${centerId}/${totalsMetadataCollection}/currentSummary`;
  const currentDocument = await getDocument(currentPath);
  const currentSummary = decodeFields(currentDocument?.fields || {});
  const currentMonthId = currentSummary.monthId || '';
  if (currentMonthId > summary.monthId) return;
  if (sameSummaryData(currentSummary, summary)) return;

  await upsertDocument(currentPath, {
    centerId,
    monthId: summary.monthId,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    counts: summary.counts,
    invitedTotal: summary.invitedTotal,
    missingDates: summary.missingDates || [],
    closedThrough: summary.closedThrough,
    finalized: summary.finalized,
    availableFrom: summary.availableFrom,
    purgeAfter: summary.purgeAfter,
    updatedAt: new Date()
  });
}

async function purgeExpiredDocuments(centerId, currentTime) {
  let deleted = 0;
  for (const collectionId of [dailyCollection, monthlyCollection, totalsMetadataCollection]) {
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
  const name = `${resourceRoot}/${encodePath(documentPath)}`;
  try {
    await commitWrites([{
      update: { name, fields: encodeFields(data) },
      currentDocument: { exists: false }
    }]);
  } catch (error) {
    if (error.status === 409 && await getDocument(documentPath)) return;
    throw error;
  }
}

async function upsertDocument(documentPath, data) {
  const name = `${resourceRoot}/${encodePath(documentPath)}`;
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
  let response;
  let responseText;
  for (let attempt = 0; attempt < requestAttempts; attempt += 1) {
    try {
      response = await fetch(`${apiRoot}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(requestTimeoutMs),
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      if (retryableHttpStatuses.has(response.status) && attempt + 1 < requestAttempts) {
        await waitBeforeRetry(attempt, response.headers.get('retry-after'));
        continue;
      }
      responseText = await response.text();
      break;
    } catch (error) {
      if (attempt + 1 >= requestAttempts || !isRetryableNetworkError(error)) throw error;
      await waitBeforeRetry(attempt);
    }
  }

  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`Firestore API ${method} ${path} failed (${response.status}): ${responseText}`);
    error.status = response.status;
    throw error;
  }
  return responseText ? JSON.parse(responseText) : null;
}

function isRetryableNetworkError(error) {
  const retryableCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH']);
  const pending = [error];
  const seen = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (retryableCodes.has(current.code) || current.name === 'TimeoutError' || current.name === 'AbortError') {
      return true;
    }
    if (current.cause) pending.push(current.cause);
    if (Array.isArray(current.errors)) pending.push(...current.errors);
  }
  return false;
}

async function waitBeforeRetry(attempt, retryAfter = null) {
  let delayMs = Math.min(1000 * (2 ** attempt), 10_000);
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const retryAt = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(retryAt) && retryAt >= 0) delayMs = Math.min(retryAt, 30_000);
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
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

function previousMonthId(dateId) {
  const [year, month] = dateId.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}

function normalizeInvitedCounts(invitedMeals = {}) {
  return Object.fromEntries(mealTypeIds.map((mealTypeId) => [
    mealTypeId,
    Math.min(999, Math.max(0, Math.floor(Number(invitedMeals[mealTypeId]) || 0)))
  ]));
}

function validCount(value) {
  return Number.isInteger(value) && value >= 0;
}
