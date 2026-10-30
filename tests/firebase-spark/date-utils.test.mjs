import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserModule } from '../helpers/browser-module.mjs';

import {
  formatDateId,
  getDateInTimeZone
} from '../../prototypes/firebase-spark-pwa/public/date-utils.mjs';

test('la data corrente segue il fuso del centro e non quello del dispositivo', () => {
  const instant = new Date('2026-01-01T00:30:00Z');
  assert.equal(formatDateId(getDateInTimeZone('Europe/Rome', instant)), '2026-01-01');
  assert.equal(formatDateId(getDateInTimeZone('America/Los_Angeles', instant)), '2025-12-31');
});

test('il formatter riutilizzato segue mezzanotte, ora legale e cambio del fuso', () => {
  for (const instant of ['2026-03-28T23:30:00Z', '2026-03-29T01:30:00Z',
    '2026-10-24T22:30:00Z', '2026-10-25T01:30:00Z', '2026-10-25T23:30:00Z']) {
    for (const timeZone of ['Europe/Rome', 'Europe/London', 'America/Los_Angeles']) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
      assert.equal(formatDateId(getDateInTimeZone(timeZone, new Date(instant))),
        `${parts.year}-${parts.month}-${parts.day}`);
    }
  }
});

test('la cache dei formatter riduce le costruzioni e resta limitata', async () => {
  let count = 0;
  const IntlProxy = { DateTimeFormat: function (...args) { count++; return new Intl.DateTimeFormat(...args); } };
  const { getDateInTimeZone: convert } = await loadBrowserModule('date-utils.mjs',
    { Intl: IntlProxy }, ['getDateInTimeZone']);
  for (let i = 0; i < 20; i++) convert('Europe/Rome', new Date(2026, 9, i + 1));
  assert.equal(count, 1);
  for (const zone of ['Europe/London', 'Europe/Paris', 'Europe/Madrid', 'Europe/Berlin',
    'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney']) convert(zone);
  const beforeReload = count;
  convert('Europe/Rome');
  assert.equal(count, beforeReload + 1, 'old formatter is evicted after eight entries');
  assert.throws(() => convert('Invalid/Timezone'), RangeError);
});

test('le etichette del calendario riutilizzano i formatter senza confondere le cinque lingue', async () => {
  let count = 0;
  const IntlProxy = { DateTimeFormat: function (...args) { count++; return new Intl.DateTimeFormat(...args); } };
  const { formatLongDate } = await loadBrowserModule('participant-data.js',
    { Intl: IntlProxy }, ['formatLongDate']);
  for (const locale of ['it', 'en', 'es', 'fr', 'de', 'it']) {
    for (let offset = 0; offset < 31; offset++) {
      const date = new Date(2026, 9, offset + 1);
      const expected = new Intl.DateTimeFormat(locale, {
        weekday: 'short', day: '2-digit', month: 'short'
      }).format(date);
      assert.equal(formatLongDate(date, locale), expected);
    }
  }
  assert.equal(count, 5);
});
