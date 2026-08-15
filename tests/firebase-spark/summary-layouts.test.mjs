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
});

test('la Cucina non mostra Prevista e il riepilogo mantiene nomi e contatti', () => {
  assert.match(view, /if \(kitchen \|\| column\.mealTypeId !== "breakfast"\) return ""/);
  assert.match(view, /href="tel:/);
  assert.match(view, /https:\/\/wa\.me\//);
  assert.match(view, /\$\{kitchen \? "" : `<section class="summary-international-names"/);
});

test('impostazioni e manutenzione presentano controlli graficamente raggruppati', () => {
  assert.match(index, /fieldset class="admin-layout-settings-card"/);
  assert.match(index, /details class="admin-audit-disclosure" data-admin-audit-load/);
  assert.doesNotMatch(index, /Caricate solo quando servono\./);
});
