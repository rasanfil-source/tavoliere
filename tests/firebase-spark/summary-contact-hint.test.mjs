import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SUMMARY_CONTACT_HINT_VISIT_LIMIT,
  nextSummaryContactHintVisitCount,
  normalizeSummaryContactHintVisitCount,
  shouldShowSummaryContactHint,
} from '../../prototypes/firebase-spark-pwa/public/summary-contact-hint.mjs';

test('il suggerimento contatti scompare raggiunte trenta aperture', () => {
  assert.equal(SUMMARY_CONTACT_HINT_VISIT_LIMIT, 30);
  assert.equal(shouldShowSummaryContactHint(0), true);
  assert.equal(shouldShowSummaryContactHint(29), true);
  assert.equal(nextSummaryContactHintVisitCount(29), 30);
  assert.equal(shouldShowSummaryContactHint(30), false);
});

test('il contatore delle aperture resta valido con valori locali anomali', () => {
  assert.equal(normalizeSummaryContactHintVisitCount('non valido'), 0);
  assert.equal(normalizeSummaryContactHintVisitCount(-4), 0);
  assert.equal(normalizeSummaryContactHintVisitCount(300), 30);
  assert.equal(nextSummaryContactHintVisitCount(30), 30);
});
