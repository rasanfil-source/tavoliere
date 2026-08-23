import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDietLabel,
  getDietBadgeTone,
  getDietOptions,
  isCustomDietNumber,
  normalizeDietCode,
  normalizeDietTags,
  resolveDietSelection
} from '../../prototypes/firebase-spark-pwa/public/diet-utils.mjs';

test('il catalogo diete governa opzioni ed etichette da un solo modulo', () => {
  const permanentOptions = getDietOptions();
  const temporaryOptions = getDietOptions({ emptyLabel: 'Nessuna dieta occasionale' });
  assert.equal(permanentOptions[0].label, 'Nessuna dieta');
  assert.equal(temporaryOptions[0].label, 'Nessuna dieta occasionale');
  assert.equal(permanentOptions.find((item) => item.value === 'BIANCO').label, 'In bianco');
  assert.equal(formatDietLabel('DIAB'), 'Diabete');
  assert.equal(formatDietLabel('8'), 'D8');
  assert.equal(formatDietLabel('BIANCO', (key) => ({
    'diet.option.BIANCO': 'Plain'
  })[key] || key), 'Plain');
});

test('i codici dieta usano il prefisso D e colori stabili', () => {
  assert.equal(formatDietLabel('3'), 'D3');
  assert.equal(getDietBadgeTone('1'), 1);
  assert.equal(getDietBadgeTone('8'), 8);
  assert.equal(getDietBadgeTone('9'), 1);
  assert.equal(getDietBadgeTone('DIAB'), 2);
});

test('la selezione dieta normalizza codici e numeri personalizzati', () => {
  assert.equal(normalizeDietCode('2l'), '3');
  assert.deepEqual(normalizeDietTags(['2L', '3']), ['3']);
  assert.equal(isCustomDietNumber('5'), true);
  assert.equal(isCustomDietNumber('1000'), false);
  assert.equal(resolveDietSelection('CUSTOM', '12'), '12');
  assert.throws(() => resolveDietSelection('CUSTOM', '4'), /compreso tra 5 e 999/);
});
