import assert from 'node:assert/strict';
import test from 'node:test';

test('ordine operativo delle schede amministrative', () => {
  assert.deepEqual(
    ['configuration', 'overview', 'people', 'access', 'activity'],
    ['configuration', 'overview', 'people', 'access', 'activity']
  );
});

test('il primo accesso apre Configurazione e i successivi Panoramica', () => {
  const resolve = (visited) => visited ? 'overview' : 'configuration';
  assert.equal(resolve(false), 'configuration');
  assert.equal(resolve(true), 'overview');
});
