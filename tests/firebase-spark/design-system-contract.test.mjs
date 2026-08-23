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

test('i badge dieta usano una palette stabile con contrasto WCAG AA', () => {
  const tones = [...summaryStyles.matchAll(/\.diet-code-tone-(\d+) \{ color: (#[0-9a-f]{6}); background: (#[0-9a-f]{6}); \}/gi)];
  assert.equal(tones.length, 8);
  tones.forEach(([, tone, foreground, background]) => {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `badge dieta ${tone} non raggiunge 4.5:1`
    );
  });
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
  assert.match(summaryStyles, /html\[data-interface-family="cool"\][\s\S]*--cool-confirmed-soft/);
  assert.match(summaryStyles, /html\[data-interface-family="cool"\] \.month-flag-present,[\s\S]*background: var\(--cool-confirmed-soft\)/);
  assert.match(summaryStyles, /html\[data-interface-style="urban"\] \.week-meal-button,[\s\S]*border-color: transparent/);
  assert.match(summaryStyles, /html\[data-interface-style="urban"\][\s\S]*\.month-flag-mark \{[\s\S]*opacity: 0\.42/);
  assert.match(summaryStyles, /html\[data-interface-style="urban"\] \.month-day,[\s\S]*border-color: transparent;[\s\S]*background: transparent/);
  assert.match(summaryStyles, /html\[data-interface-style="urban"\] \.month-flag-present \{[\s\S]*border-color: transparent;[\s\S]*background: transparent/);
  assert.match(summaryStyles, /html\[data-interface-style="urban"\] \.week-meal-button\.meal-state-present \{[\s\S]*border-color: transparent;[\s\S]*background: var\(--cool-confirmed-soft\)/);
  assert.match(summaryStyles, /html\[data-interface-style="urban"\] \.month-day-today,[\s\S]*border-color: var\(--primary\)/);
  assert.match(app, /dataset\.interfaceStyle = style === 'urban-plus' \? 'urban' : style/);
  assert.match(summaryStyles, /html\[data-interface-variant="urban-plus"\] \.month-flag,[\s\S]*border-color: var\(--view-border\);[\s\S]*background: var\(--view-control\)/);
  assert.match(summaryStyles, /html\[data-interface-variant="urban-plus"\] \.month-flag-present \{[\s\S]*background: var\(--cool-confirmed-soft\)/);
  assert.match(summaryStyles, /html\[data-interface-variant="urban-plus"\] \.month-week-mobile-header[\s\S]*\.month-day-number-today \{[\s\S]*border-bottom: 0;[\s\S]*border-radius: 10px 10px 0 0/);
  assert.match(summaryStyles, /html\[data-interface-variant="urban-plus"\] \.month-day-today \{[\s\S]*border-top: 0;[\s\S]*border-radius: 0 0 10px 10px/);
  assert.match(summaryStyles, /html\[data-interface-style="original"\] \.month-week-mobile-header[\s\S]*\.month-day-number-today \.month-day-number-value \{[\s\S]*width: 21px;[\s\S]*height: 21px/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \.month-week-mobile-header[\s\S]*\.month-day-number-today \{[\s\S]*border-bottom: 0;[\s\S]*border-radius: 10px 10px 0 0/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \.month-week-mobile-header[\s\S]*\.month-day-number-today \.month-day-number-value \{[\s\S]*width: 21px;[\s\S]*height: 21px;[\s\S]*min-width: 21px;[\s\S]*min-height: 21px/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \.month-day-today \{[\s\S]*border-top: 0;[\s\S]*border-radius: 0 0 10px 10px/);
  assert.match(app, /getInterfaceIcon\('church', '⛪'\)/);
  assert.match(summaryStyles, /--mass-yes-bg: color-mix\(in srgb, var\(--affirmative\)/);
  assert.match(summaryStyles, /font-family: Fraunces, Georgia/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \[data-week-panel\][\s\S]*display: flex;[\s\S]*flex-direction: column/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \[data-week-panel\] > \.week-operations \{[\s\S]*order: 6/);
  assert.match(summaryStyles, /html\[data-interface-style="cool"\] \[data-week-panel\] > \.week-grid \{[\s\S]*order: 4/);
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
