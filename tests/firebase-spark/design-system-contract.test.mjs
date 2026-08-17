import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile('prototypes/firebase-spark-pwa/public/styles.css', 'utf8');
const summaryStyles = await readFile('prototypes/firebase-spark-pwa/public/summary-matrix-refinements.css', 'utf8');

test('l attivazione del centro evita la testata amministrativa duplicata', () => {
  assert.match(
    styles,
    /body\[data-center-activation="true"\]\s+\.admin-shell-summary\s*\{[^}]*display:\s*none;/s
  );
  assert.match(
    styles,
    /body\[data-center-activation="true"\]\s+\.admin-shell-body\s*\{[^}]*padding-top:\s*14px;/s
  );
});
const app = await readFile('prototypes/firebase-spark-pwa/public/app.js', 'utf8');

test('i colori testuali principali rispettano il contrasto WCAG AA', () => {
  const colors = readColorTokens(styles);
  for (const [foreground, background] of [
    ['ink', 'bg'],
    ['muted', 'bg'],
    ['ink', 'surface'],
    ['primary', 'surface'],
    ['today-ink', 'today-surface']
  ]) {
    assert.ok(
      contrastRatio(colors[foreground], colors[background]) >= 4.5,
      `${foreground} su ${background} non raggiunge 4.5:1`
    );
  }
  assert.ok(contrastRatio('#ffffff', colors.primary) >= 4.5);
});

test('focus e movimento ridotto fanno parte del sistema grafico', () => {
  assert.match(styles, /:where\(button, a, input, select, textarea\):focus-visible/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /outline:[^;]+;/);
});

test('hover e focus seguono la palette selezionata', () => {
  assert.match(styles, /--primary-hover: color-mix\(in srgb, var\(--primary\)/);
  assert.match(styles, /--hover-surface: color-mix\(in srgb, var\(--primary\)/);
  assert.match(styles, /\.primary-action:hover,[\s\S]*background: var\(--primary-hover\) !important/);
  assert.match(styles, /\.secondary-action:hover,[\s\S]*background: var\(--hover-surface\) !important/);
  assert.doesNotMatch(styles, /\.primary-action:hover,[\s\S]{0,120}#0f514b/);
});

test('stati positivi e settimana completa si armonizzano con ogni palette', () => {
  assert.match(styles, /html\[data-theme="terracotta"\][\s\S]*--good: #4f7049/);
  assert.match(styles, /html\[data-theme="confetto"\][\s\S]*--good: #47785f/);
  assert.match(styles, /--complete-surface: color-mix\(in srgb, var\(--confirmed\)/);
  assert.match(summaryStyles, /--week-complete-surface: color-mix\(in srgb, var\(--primary\)/);
  assert.match(summaryStyles, /\.month-week-action-row\.month-week-complete \{[\s\S]*border-color: var\(--week-complete-line\);[\s\S]*background: var\(--week-complete-surface\)/);
  assert.match(styles, /html\[data-theme="terracotta"\][\s\S]*--calendar-heading-bg: #f3e3d7/);
});

test('la presenza ai pasti non viene comunicata soltanto dal colore', () => {
  assert.match(app, /const visibleMark = isPresent \? '✓'/);
  assert.match(app, /aria-pressed="\$\{isPresent\}"/);
  assert.match(app, /stateLabel = getMealStateLabel\(isPresent\)/);
});

test('Cool usa icone a tratto e conferme leggere lasciando il pieno alle selezioni', () => {
  assert.match(app, /function getInterfaceIcon\(kind, fallback/);
  assert.match(app, /meal-line-icon meal-line-icon-\$\{kind\}/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\][\s\S]*--cool-confirmed-soft/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \.month-flag-present,[\s\S]*background: var\(--cool-confirmed-soft\)/);
  assert.match(summaryStyles, /--mass-yes-bg: color-mix\(in srgb, var\(--affirmative\)/);
  assert.match(summaryStyles, /font-family: Fraunces, Georgia/);
});

function readColorTokens(css) {
  return Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)]
    .map(([, name, value]) => [name, value]));
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}
