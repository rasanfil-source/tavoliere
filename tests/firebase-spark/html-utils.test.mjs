import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml } from '../../prototypes/firebase-spark-pwa/public/html-utils.js';

test('escapeHtml neutralizza markup e attributi inseriti nei dati', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')"> & Mario`),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; Mario'
  );
});

test('escapeHtml gestisce valori vuoti e non stringa', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(7), '7');
});
