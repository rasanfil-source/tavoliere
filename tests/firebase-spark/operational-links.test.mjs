import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/access-links.js', import.meta.url),
  'utf8'
);

test('i collegamenti mancanti vengono creati insieme e una sola volta', () => {
  assert.match(source, /export async function ensureOperationalLinks/);
  assert.match(source, /if \(currentLinks\.publicTokenId && currentLinks\.kitchenTokenId\)/);
  assert.match(source, /scope: 'PUBLIC'/);
  assert.match(source, /scope: 'KITCHEN'/);
  assert.match(source, /transaction\.set\(configurationRef/);
});

test('la rotazione non tenta di revocare un token inesistente', () => {
  assert.match(source, /if \(previousTokenId\) \{\s*transaction\.update\(previousTokenRef/);
});

test('la rotazione elimina le sessioni create con il collegamento precedente', () => {
  assert.match(source, /await deleteSessionsForToken\(centerId, previousTokenId\)/);
  assert.match(source, /collection\(db, 'centers', centerId, 'accessSessions'\)/);
  assert.match(source, /where\('tokenId', '==', tokenId\)/);
  assert.match(source, /sessionSnapshot\.docs\.slice[\s\S]*batch\.delete\(snapshot\.ref\)/);
});
