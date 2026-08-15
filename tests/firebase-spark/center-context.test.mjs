import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = path.resolve('prototypes/firebase-spark-pwa/public/center-context.js');
const source = fs.readFileSync(sourcePath, 'utf8');

test('il contesto del centro valida gli identificativi e usa un centro predefinito neutro', () => {
  assert.match(source, /const DEFAULT_CENTER_ID = ['"]center_default['"]/);
  assert.match(source, /CENTER_ID_PATTERN\.test\(requested\)/);
  assert.match(source, /CENTER_ID_PATTERN\.test\(stored\) \? stored : DEFAULT_CENTER_ID/);
  assert.match(source, /\{1,63\}/);
});

test('installed PWA can restore the last validated center', () => {
  assert.match(source, /tavolaComune\.centerId/);
  assert.match(source, /localStorage\.setItem\(CENTER_STORAGE_KEY, centerId\)/);
  assert.match(source, /localStorage\.getItem\(CENTER_STORAGE_KEY\)/);
});

test('ogni nuova creazione diretta genera un identificativo centro distinto', async () => {
  const module = await import(pathToFileURL(sourcePath));
  const first = module.createOwnedCenterId('utente123');
  const second = module.createOwnedCenterId('utente123');
  assert.notEqual(first, second);
  assert.match(first, /^center_utente123_[a-f0-9]{16}$/);
  assert.match(second, /^center_utente123_[a-f0-9]{16}$/);
});
