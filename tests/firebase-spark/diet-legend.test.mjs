import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isValidKitchenDietLabel,
  kitchenDietLabelForCode,
  normalizeKitchenDietLegend,
  updateKitchenDietLegendEntry
} from '../../prototypes/firebase-spark-pwa/public/diet-legend.mjs';

const app = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url), 'utf8');
const participantData = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/participant-data.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../prototypes/firebase-spark-pwa/public/styles.css', import.meta.url), 'utf8');

test('la legenda cucina conserva solo codici numerici ed etichette di una o due parole', () => {
  assert.deepEqual(normalizeKitchenDietLegend([
    { code: '3', label: '  senza   lattosio ' },
    { code: 'GLUTEN', label: 'Senza glutine' },
    { code: '4', label: 'tre parole qui' },
    { code: '0', label: 'Non valida' }
  ]), [
    { code: '3', label: 'senza lattosio' }
  ]);
  assert.equal(isValidKitchenDietLabel('In bianco'), true);
  assert.equal(isValidKitchenDietLabel('Troppe parole qui'), false);
});

test('aggiornare una definizione sostituisce il codice senza creare duplicati', () => {
  const legend = updateKitchenDietLegendEntry([
    { code: '1', label: 'Poco sale' },
    { code: '3', label: 'Senza glutine' }
  ], '3', 'Senza lattosio');
  assert.deepEqual(legend, [
    { code: '1', label: 'Poco sale' },
    { code: '3', label: 'Senza lattosio' }
  ]);
  assert.equal(kitchenDietLabelForCode(legend, '3'), 'Senza lattosio');
});

test('un’etichetta cucina oltre due parole viene rifiutata', () => {
  assert.throws(
    () => updateKitchenDietLegendEntry([], '3', 'senza lattosio fresco'),
    /una o due parole/i
  );
});

test('numero ed etichetta sono affiancati e salvati atomicamente con la Persona', () => {
  assert.match(index, /admin-diet-fields[\s\S]*data-admin-participant-diets[\s\S]*data-admin-participant-diet-label/);
  assert.match(index, /data-admin-diet-label-options/);
  assert.match(styles, /\.admin-diet-fields \{[\s\S]*grid-template-columns: minmax\(92px, 0\.72fr\) minmax\(120px, 1\.28fr\)/);
  assert.match(app, /saveAdminParticipant\(participant\?\.participantId \|\| '', \{[\s\S]*kitchenDietLegend: nextDietLegend/);
  assert.match(participantData, /centerUpdate\.kitchenDietLegend = kitchenDietLegend/);
  assert.match(participantData, /transaction\.set\(centerRef, \{[\s\S]*\.\.\.centerUpdate/);
});
