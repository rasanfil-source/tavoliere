import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const index = readFileSync(new URL('index.html', root), 'utf8');
const view = readFileSync(new URL('summary-matrix-view.js', root), 'utf8');
const styles = readFileSync(new URL('summary-matrix-refinements.css', root), 'utf8');

test('riepilogo e cucina conservano Classic e Internazionale come viste distinte', () => {
  assert.match(view, /summary-layout-\$\{layout\}/);
  assert.match(styles, /\.summary-layout-classic \.summary-matrix/);
  assert.match(styles, /\.summary-international-grid[\s\S]*grid-template-columns: repeat\(3/);
});

test('le due giornate sono schermate intere con snap orizzontale', () => {
  assert.match(styles, /\.summary-matrix-track[\s\S]*scroll-snap-type: inline mandatory/);
  assert.match(styles, /\.summary-matrix-screen[\s\S]*flex: 0 0 100%/);
  assert.equal((index.match(/class="summary-day-segment"/g) || []).length, 2);
  assert.match(styles, /\[data-kitchen-panel\] \.meal-grid > \.summary-matrix-track[\s\S]*grid-column: 1 \/ -1/);
  assert.match(view, /summary-day-tone-\$\{normalizeDayTone\(column\.dayIndex\)\}/);
  assert.match(styles, /--summary-day-next:/);
  assert.match(styles, /--summary-day-following:/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.summary-international-mass \{[\s\S]*grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/);
});

test('la fascia Messa distingue visivamente Sì e No in ogni palette', () => {
  assert.match(view, /summary-mass-state-yes/);
  assert.match(view, /summary-mass-state-no/);
  assert.match(styles, /--mass-yes-bg:/);
  assert.match(styles, /--mass-no-bg:/);
  assert.match(styles, /\.summary-matrix-mass-band\.summary-mass-state-yes/);
  assert.match(styles, /\.summary-international-mass-group\.summary-mass-state-no/);
});

test('la Cucina non mostra Prevista e il riepilogo mantiene nomi e contatti', () => {
  assert.match(view, /if \(kitchen \|\| column\.mealTypeId !== "breakfast"\) return ""/);
  assert.match(view, /href="tel:/);
  assert.match(view, /https:\/\/wa\.me\//);
  assert.match(view, /\$\{kitchen \? "" : `<section class="summary-international-names"/);
});

test('il mobile compatta le situazioni ordinarie senza sacrificare quelle speciali', () => {
  assert.match(view, /summary-screen-has-special/);
  assert.match(view, /summary-screen-ordinary/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.summary-matrix-unit \{\s*display: none/);
  assert.match(styles, /\.summary-screen-ordinary \.summary-international-card \{[\s\S]*grid-template-columns: minmax\(112px, 0\.82fr\) minmax\(0, 1\.18fr\)/);
  assert.match(styles, /\.summary-layout-classic \.summary-matrix-row-meals td \{\s*height: 62px/);
});

test('telefono e WhatsApp sono separati e WhatsApp resta leggermente piu piccola', () => {
  assert.match(styles, /\.summary-matrix-contact-actions \{[\s\S]*gap: 8px/);
  assert.match(styles, /\.summary-matrix-whatsapp img \{[\s\S]*width: 18px;[\s\S]*height: 18px/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.summary-matrix-contact-actions \{\s*gap: 6px/);
});

test('impostazioni e manutenzione presentano controlli graficamente raggruppati', () => {
  assert.match(index, /fieldset class="admin-layout-settings-card"/);
  assert.match(index, /details class="admin-audit-disclosure" data-admin-audit-load/);
  assert.doesNotMatch(index, /Caricate solo quando servono\./);
});
