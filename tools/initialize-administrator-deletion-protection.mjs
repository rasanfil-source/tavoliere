import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectId = process.argv.find(value => value.startsWith('--project='))?.slice(10);
if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) throw new Error('Specify --project=PROJECT_ID; add --apply to initialize the protection index.');
const apply = process.argv.includes('--apply');
process.env.XDG_CONFIG_HOME = resolve('.firebase-cache');
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account) throw new Error('Firebase login required');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const root = `projects/${projectId}/databases/(default)/documents`;
async function request(path, body) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Firestore request failed: HTTP ${response.status}`);
  return response.json();
}
const centers = await request(root + ':runQuery', { structuredQuery: {
  from: [{ collectionId: 'centers' }], select: { fields: [{ fieldPath: 'status' }] },
  where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'ACTIVE' } } }
} });
let centerCount = 0, membershipCount = 0;
for (const result of centers) {
  if (!result.document) continue;
  const center = result.document.name;
  const { transaction } = await request(root + ':beginTransaction', { options: { readWrite: {} } });
  try {
    const rows = await request(center + ':runQuery', { transaction, structuredQuery: { from: [{ collectionId: 'admins' }] } });
    const accounts = rows.filter(row => row.document).map(row => row.document);
    if (accounts.length > 400) throw new Error('Too many accounts for atomic initialization');
    if (apply) {
      const writes = accounts.map(account => ({ update: {
        name: center + '/administratorDeletionProtection/' + account.name.split('/').at(-1),
        fields: { participantId: account.fields.participantId || { stringValue: '' },
          role: account.fields.role, status: account.fields.status }
      }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] }));
      writes.push({ update: { name: center + '/participantMetadata/administratorProtection', fields: { ready: { booleanValue: true } } },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] });
      await request(root + ':commit', { transaction, writes });
    } else {
      await request(root + ':rollback', { transaction });
    }
    centerCount++;
    membershipCount += accounts.length;
  } catch (error) {
    await request(root + ':rollback', { transaction }).catch(() => {});
    throw error;
  }
}
console.log(`${apply ? 'Initialized' : 'Checked'} protection: ${centerCount} active centers, ${membershipCount} memberships. No accounts or people changed.`);
