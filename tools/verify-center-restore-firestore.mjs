import { getAccessToken, getGlobalDefaultAccount } from 'firebase-tools/lib/auth.js';
const centerId = process.argv[2];
const account = getGlobalDefaultAccount();
const token = await getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const base = `https://firestore.googleapis.com/v1/projects/tavola-comune/databases/(default)/documents/centers/${centerId}`;
const headers = { authorization: `Bearer ${token.access_token}` };
for (const suffix of ['', '/participants?pageSize=100', '/mealWindows?pageSize=2000']) {
  const response = await fetch(base + suffix, { headers });
  const body = await response.json();
  console.log(suffix || '/center', response.status, JSON.stringify({
    name: body.fields?.name?.stringValue,
    documents: body.documents?.length,
    error: body.error?.message
  }));
}
