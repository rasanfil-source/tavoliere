import { readFile } from 'node:fs/promises';
import { getAccessToken, getGlobalDefaultAccount } from 'firebase-tools/lib/auth.js';
import { buildCenterRestorePlan } from '../prototypes/firebase-spark-pwa/public/domain/center-restore.mjs';

const [filePath, expectedCenterId = ''] = process.argv.slice(2);
if (!filePath) {
  console.error('Uso: node tools/restore-center-backup-firestore.mjs <backup.json> [centerId]');
  process.exit(1);
}

const backup = JSON.parse(await readFile(filePath, 'utf8'));
const plan = buildCenterRestorePlan(backup, { expectedCenterId });
const projectId = String(backup.projectId || 'tavola-comune');
const account = getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) {
  throw new Error('Nessuna sessione Firebase CLI disponibile. Esegui firebase login.');
}
const auth = await getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:batchWrite`;

console.log(`Ripristino ${plan.centerId}: ${plan.totalWrites} documenti.`);
plan.inspection.warnings.forEach((message) => console.warn(`Avviso: ${message}`));

for (let offset = 0; offset < plan.operations.length; offset += 400) {
  const chunk = plan.operations.slice(offset, offset + 400);
  const writes = chunk.map((operation) => {
    const update = {
      name: `projects/${projectId}/databases/(default)/documents/${operation.path}`,
      fields: encodeFields(operation.data)
    };
    const write = { update };
    if (operation.mode === 'merge') {
      write.updateMask = { fieldPaths: Object.keys(operation.data) };
    }
    return write;
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${auth.access_token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ writes })
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Firestore batch ${offset}-${offset + chunk.length} fallito (${response.status}): ${body}`);
  }
  const result = JSON.parse(body);
  const failed = (result.status || []).filter((status) => Number(status.code || 0) !== 0);
  if (failed.length > 0) {
    throw new Error(`Firestore ha rifiutato ${failed.length} scritture nel lotto ${offset}: ${JSON.stringify(failed[0])}`);
  }
  console.log(`Confermate ${Math.min(offset + chunk.length, plan.operations.length)} di ${plan.operations.length} scritture.`);
}

console.log('Ripristino Firestore completato.');

function encodeFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, encodeValue(nested)]));
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (isExportedTimestamp(value)) {
    const millis = Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
    return { timestampValue: new Date(millis).toISOString() };
  }
  return { mapValue: { fields: encodeFields(value) } };
}

function isExportedTimestamp(value) {
  return value && value.type === 'firestore/timestamp/1.0'
    && Number.isFinite(Number(value.seconds))
    && Number.isFinite(Number(value.nanoseconds));
}
