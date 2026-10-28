import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadBrowserModule } from '../tests/helpers/browser-module.mjs';
import { buildSummaryMatrixScreens } from '../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';
import { escapeHtml } from '../prototypes/firebase-spark-pwa/public/html-utils.js';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/romolo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const publicRoot = new URL('../prototypes/firebase-spark-pwa/public/', import.meta.url);
const outputDir = new URL('../artifacts/benedizioni/', import.meta.url);
const css = await readFile(new URL('styles.css', publicRoot), 'utf8')
  + await readFile(new URL('summary-matrix-refinements.css', publicRoot), 'utf8');
const catalog = JSON.parse(await readFile(new URL('i18n/it.json', publicRoot), 'utf8'));
const t = key => catalog[key] || key;
const view = await loadBrowserModule('summary-matrix-view.js', {
  t,
  escapeHtml,
  getLocale: () => 'it',
  document: { documentElement: { dataset: { interfaceStyle: 'urban' } } },
  normalizeKitchenDietLegend: () => [],
  normalizeDietCode: String,
  formatDietLabel: String,
  getDietBadgeTone: () => '',
}, ['renderScreen']);

const dates = ['2026-10-28', '2026-10-29', '2026-10-30'];
const days = dates.map(dateId => ({
  dateId,
  meals: ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, count: 0, present: [] })),
}));
const operations = dates.map((dateId, index) => ({
  dateId,
  dailyOperation: { massScheduled: index === 0, blessingTime: index === 0 ? '18:30' : '' },
}));
const screen = buildSummaryMatrixScreens(days, [], operations)[0];
const summary = `<div class="summary-layout-classic summary-layout-diners">${view.renderScreen(screen, { kitchen: false, activeIndex: 0 })}</div>`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir(outputDir, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 480, height: 760 }, deviceScaleFactor: 2 });
  await page.setContent(`<html lang="it" data-interface-style="urban"><head><style>${css}
    body { background: #f1f0eb; padding: 22px; }
    .prototype { max-width: 480px; margin: auto; padding: 22px; border: 1px solid #e5e1d8; border-radius: 18px; background: #fff; box-shadow: 0 10px 30px #24342a12; }
    .prototype h1 { margin: 0 0 6px; font-size: 20px; }
    .prototype p { margin: 0 0 18px; color: #66736f; font-size: 14px; }
    .prototype .summary-matrix-track { width: 100%; }
    .prototype .summary-layout-classic { width: 100%; }
  </style></head><body><main class="prototype"><h1>Riepilogo · Messa</h1><p>Prototipo vettoriale compatto · stile lineare</p>${summary}</main></body></html>`);
  await page.locator('.prototype').screenshot({ path: new URL('prototipo-benedizione-piu-in-linea.png', outputDir).pathname.replace(/^\/(\w:)/, '$1') });
  const massCell = page.locator('.summary-matrix-mass-band').first();
  await massCell.screenshot({ path: new URL('prototipo-benedizione-piu-in-linea-casella.png', outputDir).pathname.replace(/^\/(\w:)/, '$1') });
  await page.close();

  const narrowOperations = dates.map((dateId, index) => ({
    dateId,
    dailyOperation: { massScheduled: index < 2, blessingTime: index === 1 ? '18:30' : '' },
  }));
  const narrowScreen = buildSummaryMatrixScreens(days, [], narrowOperations)[0];
  const narrowSummary = `<div class="summary-layout-classic summary-layout-diners">${view.renderScreen(narrowScreen, { kitchen: false, activeIndex: 0 })}</div>`;
  const narrowPage = await browser.newPage({ viewport: { width: 375, height: 760 }, deviceScaleFactor: 2 });
  await narrowPage.setContent(`<html lang="it" data-interface-style="urban"><head><style>${css}
    body { background: #f1f0eb; padding: 14px; }
    .prototype { max-width: 480px; margin: auto; padding: 16px; border: 1px solid #e5e1d8; border-radius: 18px; background: #fff; box-shadow: 0 10px 30px #24342a12; }
    .prototype h1 { margin: 0 0 6px; font-size: 18px; }
    .prototype p { margin: 0 0 14px; color: #66736f; font-size: 13px; }
    .prototype .summary-matrix-track { width: 100%; }
    .prototype .summary-layout-classic { width: 100%; }
  </style></head><body><main class="prototype"><h1>Colonna stretta · Domani</h1><p>Prova mobile con benedizione</p>${narrowSummary}</main></body></html>`);
  await narrowPage.locator('.prototype').screenshot({ path: new URL('prototipo-benedizione-colonna-stretta.png', outputDir).pathname.replace(/^\/(\w:)/, '$1') });
  await narrowPage.close();
} finally {
  await browser.close();
}
