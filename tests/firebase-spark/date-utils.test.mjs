import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDateId,
  getDateInTimeZone
} from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';

test('la data corrente segue il fuso del centro e non quello del dispositivo', () => {
  const instant = new Date('2026-01-01T00:30:00Z');
  assert.equal(formatDateId(getDateInTimeZone('Europe/Rome', instant)), '2026-01-01');
  assert.equal(formatDateId(getDateInTimeZone('America/Los_Angeles', instant)), '2025-12-31');
});
