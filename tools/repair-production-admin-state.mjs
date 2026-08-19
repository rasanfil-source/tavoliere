import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.XDG_CONFIG_HOME ||= resolve('.firebase-cache');
const require = createRequire(import.meta.url);
const firebaseAuth = require('firebase-tools/lib/auth');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const projectId = readArgument('--project') || 'tavola-comune';
const ownerEmail = String(readArgument('--owner-email') || '').trim().toLowerCase();
const removeEmail = String(readArgument('--remove-email') || '').trim().toLowerCase();
if (!ownerEmail) throw new Error('Specifica --owner-email.');

const account = firebaseAuth.getGlobalDefaultAccount();
if (!account?.tokens?.access_token) throw new Error('Firebase CLI non autenticata.');
const token = Number(account.tokens.expires_at || 0) > Date.now() + 60_000
  ? account.tokens
  : await firebaseAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes || []);
const accessToken = token?.access_token;
if (!accessToken) throw new Error('Token Firebase non disponibile.');

const databaseName = `projects/${projectId}/databases/(default)`;
const documentRoot = `${databaseName}/documents`;
const restRoot = `https://firestore.googleapis.com/v1/${documentRoot}`;
const centers = await listDocuments('centers');
const activeCenters = centers.filter((item) => decodeFields(item.fields).status === 'ACTIVE');
if (activeCenters.length !== 1) {
  throw new Error(`Attesi esattamente un centro attivo; trovati ${activeCenters.length}.`);
}

const centerDocument = activeCenters[0];
const centerId = documentId(centerDocument.name);
const center = decodeFields(centerDocument.fields);
const admins = await listDocuments(`centers/${centerId}/admins`);
const profiles = await listDocuments('adminProfiles');
const invitations = (await listDocuments('adminInvitations'))
  .filter((item) => decodeFields(item.fields).centerId === centerId);
const ownerMatches = admins.filter((item) => String(decodeFields(item.fields).email || '').toLowerCase() === ownerEmail);
if (ownerMatches.length !== 1) {
  throw new Error(`Atteso un solo account amministrativo per ${ownerEmail}; trovati ${ownerMatches.length}.`);
}
const ownerAdmin = ownerMatches[0];
const ownerUid = documentId(ownerAdmin.name);
const existingOwnerProfile = profiles.find((item) => documentId(item.name) === ownerUid);
const ownerProfile = existingOwnerProfile || {
  name: `${documentRoot}/adminProfiles/${ownerUid}`,
  fields: {}
};

const adminsToRemove = admins.filter((item) => {
  const data = decodeFields(item.fields);
  return documentId(item.name) !== ownerUid
    && (data.role === 'OWNER' || data.role === 'ADMIN');
});
const adminUidsToRemove = new Set(adminsToRemove.map((item) => documentId(item.name)));
const profilesToRemove = profiles.filter((item) => adminUidsToRemove.has(documentId(item.name)));
for (const profile of profilesToRemove) {
  const profileData = decodeFields(profile.fields);
  const externalCenters = (profileData.centerIds || []).filter((item) => item !== centerId);
  if (externalCenters.length > 0) {
    throw new Error(`Il profilo ${documentId(profile.name)} appartiene anche ad altri centri: riparazione interrotta.`);
  }
}

const summary = {
  projectId,
  centerId,
  centerName: center.name || centerId,
  previousOwnerUid: center.ownerUid || '',
  ownerUid,
  ownerEmail,
  removeEmail,
  administratorsToRemove: adminsToRemove.length,
  profilesToRemove: profilesToRemove.length,
  invitationsToRemove: invitations.length,
  viceAdministratorsPreserved: admins.filter((item) => (
    documentId(item.name) !== ownerUid && decodeFields(item.fields).role === 'MANAGER'
  )).length,
  mode: apply ? 'APPLY' : 'DRY_RUN'
};
console.log(JSON.stringify(summary, null, 2));
if (!apply) process.exit(0);

const backupDirectory = resolve('private-backups');
await mkdir(backupDirectory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const backupPath = resolve(backupDirectory, `admin-repair-${centerId}-${stamp}.json`);
await writeFile(backupPath, JSON.stringify({
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  summary,
  documents: {
    center: centerDocument,
    admins,
    profiles: [ownerProfile, ...profilesToRemove],
    invitations
  }
}, null, 2), 'utf8');

const now = new Date().toISOString();
const ownerAdminData = decodeFields(ownerAdmin.fields);
const ownerProfileData = decodeFields(ownerProfile.fields);
const writes = [
  updateWrite(centerDocument.name, {
    ownerUid,
    adminEmail: ownerEmail,
    administratorPasswordRequired: false,
    updatedAt: now
  }, ['ownerUid', 'adminEmail', 'administratorPasswordRequired', 'updatedAt']),
  updateWrite(ownerAdmin.name, {
    centerId,
    participantId: ownerAdminData.participantId || ownerProfileData.participantId || '',
    status: 'ACTIVE',
    email: ownerEmail,
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    administratorPasswordRequired: false,
    passwordSetupRequired: false,
    updatedAt: now
  }, [
    'centerId', 'participantId', 'status', 'email', 'role', 'massPermission',
    'dailyOperationsPermission', 'administratorPasswordRequired', 'passwordSetupRequired',
    'invitationId', 'revokedBy', 'revokedAt', 'updatedAt'
  ]),
  updateWrite(ownerProfile.name, {
    centerId,
    centerIds: [centerId],
    participantId: ownerAdminData.participantId || ownerProfileData.participantId || '',
    status: 'ACTIVE',
    email: ownerEmail,
    role: 'OWNER',
    massPermission: true,
    dailyOperationsPermission: true,
    updatedAt: now
  }, [
    'centerId', 'centerIds', 'participantId', 'status', 'email', 'role',
    'massPermission', 'dailyOperationsPermission', 'updatedAt'
  ]),
  ...adminsToRemove.map((item) => ({ delete: item.name })),
  ...profilesToRemove.map((item) => ({ delete: item.name })),
  ...invitations.map((item) => ({ delete: item.name }))
];
if (writes.length > 450) throw new Error(`Troppe scritture atomiche (${writes.length}); riparazione interrotta.`);

const commitResponse = await fetch(`https://firestore.googleapis.com/v1/${databaseName}/documents:commit`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ writes })
});
if (!commitResponse.ok) {
  throw new Error(`Riparazione Firestore non riuscita (${commitResponse.status}): ${await commitResponse.text()}`);
}

const remainingAdmins = await listDocuments(`centers/${centerId}/admins`);
const remainingInvitations = (await listDocuments('adminInvitations'))
  .filter((item) => decodeFields(item.fields).centerId === centerId);
const repairedOwnerDocument = remainingAdmins.find((item) => documentId(item.name) === ownerUid);
const repairedAdmin = repairedOwnerDocument ? decodeFields(repairedOwnerDocument.fields) : {};
const conflictingOwners = remainingAdmins.filter((item) => {
  const data = decodeFields(item.fields);
  return documentId(item.name) !== ownerUid
    && data.status === 'ACTIVE'
    && (data.role === 'OWNER' || data.role === 'ADMIN');
});
const removedAccountStillPresent = removeEmail
  ? remainingAdmins.some((item) => String(decodeFields(item.fields).email || '').toLowerCase() === removeEmail)
  : false;
const refreshedCenters = await listDocuments('centers');
const repairedCenterDocument = refreshedCenters.find((item) => documentId(item.name) === centerId);
const repairedCenter = repairedCenterDocument ? decodeFields(repairedCenterDocument.fields) : {};
const verified = Boolean(repairedOwnerDocument)
  && repairedCenter.ownerUid === ownerUid
  && String(repairedCenter.adminEmail || '').toLowerCase() === ownerEmail
  && repairedAdmin.status === 'ACTIVE'
  && repairedAdmin.role === 'OWNER'
  && repairedAdmin.massPermission === true
  && repairedAdmin.dailyOperationsPermission === true
  && remainingInvitations.length === 0
  && conflictingOwners.length === 0
  && removedAccountStillPresent === false;
if (!verified) throw new Error('Verifica successiva alla riparazione non superata. Usa il backup locale.');

console.log(JSON.stringify({
  repaired: true,
  backupPath,
  centerId,
  ownerUid,
  remainingAdministrators: remainingAdmins.length,
  remainingInvitations: remainingInvitations.length,
  conflictingOwners: conflictingOwners.length,
  removedAccountStillPresent
}, null, 2));

function updateWrite(name, data, fieldPaths) {
  return {
    update: { name, fields: encodeFields(data) },
    updateMask: { fieldPaths }
  };
}

async function listDocuments(path) {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`${restRoot}/${path}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Lettura Firestore non riuscita (${response.status}): ${await response.text()}`);
    const payload = await response.json();
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || '';
  } while (pageToken);
  return documents;
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ? { timestampValue: value }
      : { stringValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } };
  throw new Error(`Valore Firestore non supportato: ${typeof value}`);
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeValue(value = {}) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields);
  return undefined;
}

function documentId(name = '') {
  return String(name).split('/').pop() || '';
}

function readArgument(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}
