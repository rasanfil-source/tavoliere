import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { functionSource } from '../tests/helpers/app-functions.mjs';
import { loadBrowserModule } from '../tests/helpers/browser-module.mjs';
import { buildSummaryMatrixScreens } from '../prototypes/firebase-spark-pwa/public/summary-matrix-model.js';
import { escapeHtml } from '../prototypes/firebase-spark-pwa/public/html-utils.js';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/romolo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = new URL('../prototypes/firebase-spark-pwa/public/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('styles.css', root), 'utf8') + await readFile(new URL('summary-matrix-refinements.css', root), 'utf8');
const catalog = JSON.parse(await readFile(new URL('i18n/it.json', root), 'utf8'));
const t = key => catalog[key] || key;
const agenda = html.slice(html.indexOf('        <details class="week-operations"'), html.indexOf('      <section class="participant-panel" data-summary-panel'))
  .replace(/<\/section>\s*$/, '');
const view = await loadBrowserModule('summary-matrix-view.js', { t, escapeHtml, getLocale: () => 'it',
  document: { documentElement: { dataset: { interfaceStyle: 'original' } } },
  normalizeKitchenDietLegend: () => [], normalizeDietCode: String, formatDietLabel: String, getDietBadgeTone: () => ''
}, ['renderScreen', 'renderInternationalScreen']);
const dates = ['2026-10-28', '2026-10-29', '2026-10-30'];
const days = dates.map(dateId => ({ dateId, meals: ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, count: 0, present: [] })) }));
const ops = dates.map((dateId, i) => ({ dateId, dailyOperation: { massScheduled: i === 0, blessingTime: i === 0 ? '18:30' : '' } }));
const screen = buildSummaryMatrixScreens(days, [], ops)[0];
const summary = `<div class="summary-layout-classic summary-layout-diners">${view.renderScreen(screen, { kitchen: false, activeIndex: 0 })}</div>`;
const international = `<div class="summary-layout-international summary-layout-kitchen">${view.renderInternationalScreen(screen, { kitchen: true, activeIndex: 0 })}</div>`;
const names = ['renderWeekOperations', 'getOpenAgendaSections', 'refreshWeekOperations', 'renderWeekBlessing', 'handleWeekBlessingSave', 'blessingSaveErrorMessage'];
const source = names.map(functionSource).join('\n');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = new URL('../artifacts/benedizioni/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  for (const width of [375, 1200]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.setContent(`<html lang="it" data-interface-style="original"><head><base href="https://preview.test/"><style>${css}</style></head><body><main style="max-width:1000px;margin:auto;padding:12px"><h2>Agenda centro · liturgista</h2>${agenda}<h2>Riepilogo</h2>${summary}<h2>Cucina · Internazionale</h2>${international}</main></body></html>`);
    await page.evaluate(({ source, names, catalog }) => {
      const elements = {};
      for (const [key, attr] of Object.entries({ weekOperations: 'operations', weekOperationsDay: 'operations-day',
        weekOperationsStatus: 'operations-status', weekBlessingSection: 'blessing-section', weekBlessingEnabled: 'blessing-enabled',
        weekBlessingTime: 'blessing-time', weekBlessingSave: 'blessing-save', weekBlessingStatus: 'blessing-status', weekBlessingDate: 'blessing-date',
        weekBookingSection: 'booking-section', weekInvitedSection: 'invited-section', weekHealthSection: 'health-section',
        weekNotesSection: 'notes-section', weekDietSection: 'diet-section' })) elements[key] = document.querySelector(`[data-week-${attr}]`);
      elements.weekOperationsDay.innerHTML = '<option value="2026-10-28">Oggi</option>';
      const state = { mode: 'week', weekOperationalDateId: '2026-10-28', weekOperationsRequestVersion: 0,
        centerContactSettings: {}, weekDailyOperations: [] };
      const reads = [], saves = [];
      const dependencies = { state, elements, document, window, bookingForView: null, canManageDailyOperations: () => false,
        canManageMass: () => true, getActiveCenterId: () => 'preview', getCurrentUser: () => ({ uid: 'liturgist' }),
        parseDateId: id => id, formatCalendarDate: () => 'Mercoledì 28 ottobre 2026', syncWeekOperationDateLabels() {},
        prepareWeekOperationalDate() {}, blockOfflineAction: () => false, friendlyErrorMessage: e => e.message,
        t: key => catalog[key] || key,
        loadMealWindowCoverage: async () => { reads.push('coverage'); return { through: '2027-10-28' }; },
        loadDailyOperation: async () => { reads.push('blessing'); return { dateId: state.weekOperationalDateId, blessingTime: '' }; },
        saveBlessing: async (dateId, blessingTime) => {
          if (window.check.saveError) throw Object.assign(new Error('Save failed'), { code: window.check.saveError });
          saves.push({ dateId, blessingTime }); return { dateId, blessingTime };
        }
      };
      const app = new Function(...Object.keys(dependencies), source + '\nreturn {' + names.join(',') + '};')(...Object.values(dependencies));
      elements.weekOperations.addEventListener('toggle', () => { if (elements.weekOperations.open) app.refreshWeekOperations(); });
      elements.weekBlessingSection.addEventListener('toggle', () => { if (elements.weekBlessingSection.open) app.refreshWeekOperations(false, elements.weekBlessingSection); });
      elements.weekBlessingEnabled.addEventListener('change', () => { elements.weekBlessingTime.disabled = !elements.weekBlessingEnabled.checked; elements.weekBlessingTime.required = elements.weekBlessingEnabled.checked; });
      elements.weekBlessingSave.addEventListener('click', app.handleWeekBlessingSave);
      app.renderWeekOperations();
      window.check = { reads, saves, elements };
    }, { source, names, catalog });
    assert.deepEqual(await page.evaluate(() => window.check.reads), []);
    await page.locator('.agenda-center-toggle').click();
    await page.locator('[data-week-blessing-section] > summary').waitFor({ state: 'visible' });
    assert.deepEqual(await page.evaluate(() => window.check.reads), []);
    assert.equal(await page.locator('.week-operation-section:visible').count(), 1);
    await page.locator('[data-week-blessing-section] > summary').click();
    await page.waitForFunction(() => !window.check.elements.weekBlessingSave.disabled);
    await page.locator('[data-week-blessing-enabled]').check();
    await page.locator('[data-week-blessing-time]').fill('18:30');
    await page.locator('[data-week-blessing-save]').click();
    await page.getByText('Benedizione aggiornata.', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.check.saves), [{ dateId: '2026-10-28', blessingTime: '18:30' }]);
    assert.deepEqual(await page.evaluate(() => window.check.reads), ['coverage', 'blessing']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: new URL(`preview-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
    if (width === 375) await page.locator('.summary-layout-classic .summary-matrix-mass-band').first().screenshot({
      path: new URL('simbolo-benedizione.png', output).pathname.replace(/^\/(\w:)/, '$1')
    });
    await page.evaluate(() => { window.check.saveError = 'blessing/cutoff'; });
    await page.locator('[data-week-blessing-save]').click();
    await page.getByText(catalog['blessing.cutoff'], { exact: true }).waitFor();
    assert.equal(await page.locator('[data-week-blessing-save]').isEnabled(), true);
    assert.equal(await page.locator('[data-week-blessing-time]').inputValue(), '18:30');
    if (width === 375) await page.locator('[data-week-blessing-section]').screenshot({
      path: new URL('limite-orario.png', output).pathname.replace(/^\/(\w:)/, '$1')
    });
    await page.evaluate(() => { window.check.saveError = 'blessing/past-time'; });
    await page.locator('[data-week-blessing-save]').click();
    await page.getByText(catalog['blessing.pastTime'], { exact: true }).waitFor();
    await page.close();
  }
  console.log('Browser: sezioni su richiesta, permessi liturgista, salvataggio e layout 375/1200 px verificati.');
} finally { await browser.close(); }
