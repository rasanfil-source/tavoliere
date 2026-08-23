import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDietLabel,
  getDietBadgeTone,
  normalizeDietCode,
  normalizeDietTags
} from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';

test('le etichette dieta espongono soltanto il modello numerico', () => {
  assert.equal(formatDietLabel('8'), 'D8');
  assert.equal(formatDietLabel('STANDARD', (key) => ({
    'diet.option.STANDARD': 'Nessuna dieta'
  })[key] || key), 'Nessuna dieta');
  assert.equal(formatDietLabel('DIAB'), 'Standard');
});

test('i codici dieta usano il prefisso D e colori stabili', () => {
  assert.equal(formatDietLabel('3'), 'D3');
  assert.equal(getDietBadgeTone('1'), 1);
  assert.equal(getDietBadgeTone('8'), 8);
  assert.equal(getDietBadgeTone('9'), 1);
  assert.equal(getDietBadgeTone('STANDARD'), 8);
});

test('la normalizzazione accetta soltanto numeri da 1 a 999', () => {
  assert.equal(normalizeDietCode('003'), '3');
  assert.equal(normalizeDietCode('2L'), 'STANDARD');
  assert.equal(normalizeDietCode('1000'), 'STANDARD');
  assert.deepEqual(normalizeDietTags(['3', '003', 'DIAB']), ['3']);
  assert.deepEqual(normalizeDietTags(['DIAB']), ['STANDARD']);
});
