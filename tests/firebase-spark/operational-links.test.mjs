import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../prototypes/firebase-spark-pwa/public/access-links.js', import.meta.url),
  'utf8'
);

test('i collegamenti mancanti vengono creati insieme e una sola volta', () => {
  assert.match(source, /export async function ensureOperationalLinks/);
  assert.match(source, /const currentPublicSnapshot = currentPublicRef/);
  assert.match(source, /const currentKitchenSnapshot = currentKitchenRef/);
  assert.match(source, /const publicUsable = tokenIsUsable/);
  assert.match(source, /const kitchenUsable = tokenIsUsable/);
  assert.match(source, /scope: 'PUBLIC'/);
  assert.match(source, /scope: 'KITCHEN'/);
  assert.match(source, /transaction\.set\(configurationRef/);
});

test('i collegamenti già attivi non vengono rigenerati né revocati', () => {
  assert.match(source, /if \(publicUsable && kitchenUsable\) \{[\s\S]*publicStatus: 'ACTIVE'[\s\S]*kitchenStatus: 'ACTIVE'/);
  assert.match(source, /if \(!publicUsable\) \{[\s\S]*currentPublicSnapshot\?\.exists\(\)/);
  assert.match(source, /if \(!kitchenUsable\) \{[\s\S]*currentKitchenSnapshot\?\.exists\(\)/);
  assert.doesNotMatch(source, /export async function rotateOperationalLink/);
  assert.doesNotMatch(source, /deleteSessionsForToken/);
});
