import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('prototypes/firebase-spark-pwa/public');
const app = await readFile(resolve(root, 'app.js'), 'utf8');
const contextFunction = app.match(/function getKitchenMonthlySummaryContext\([^]*?\n}/)[0];

async function setup(page, { deferred = false } = {}) {
  const reads = [], modules = [];
  let lunch = 3;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('https://monthly.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body:
      '<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body><section data-kitchen-panel><div class="meal-grid" id="cards"></div></section></body></html>' });
    if (url.pathname === '/kitchen-monthly-summary.js') {
      modules.push(url.pathname);
      return route.fulfill({ contentType: 'text/javascript', body:
        'export async function loadKitchenMonthlySummary(monthId) { return (await fetch("/summary-data?month=" + (monthId || "current"))).json(); }' });
    }
    if (url.pathname === '/summary-data') {
      const month = url.searchParams.get('month');
      reads.push(month);
      if (deferred) await pending;
      const monthId = month === 'current' ? '2026-12' : month;
      return route.fulfill({ json: {
        monthId, earliestMonthId: '2026-11', periodStart: `${monthId}-01`,
        periodEnd: monthId === '2026-12' ? '2026-12-31' : '2026-11-30',
        counts: { breakfast: 2, lunch, dinner: 4 }, invitedTotal: 1, missingDates: [],
        closedThrough: monthId === '2026-12' ? '2026-12-09' : '2026-11-30', finalized: monthId !== '2026-12'
      } });
    }
    const file = resolve(root, '.' + url.pathname);
    if (!file.startsWith(root)) return route.abort();
    return route.fulfill({ body: await readFile(file), contentType:
      ({ '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'application/octet-stream' });
  });
  await page.goto('https://monthly.test/');
  await page.evaluate(async contextFunction => {
    const i18n = await import('/i18n/i18n.mjs?v=20261031b');
    await i18n.initI18n();
    await i18n.setLocale('it');
    const { mountSummaryMatrix } = await import('/summary-matrix-view.js');
    const getContext = new Function('loadDomainModule', 'getActiveCenterId', contextFunction + ';return getKitchenMonthlySummaryContext;')(
      () => import('/kitchen-monthly-summary.js'), () => window.centerId || 'one'
    );
    window.remount = () => mountSummaryMatrix(document.querySelector('#cards'), {
      kitchen: true, monthSummary: getContext(), days: ['2026-12-10', '2026-12-11', '2026-12-12'].map(dateId => ({ dateId,
        meals: ['breakfast', 'lunch', 'dinner'].map(mealTypeId => ({ mealTypeId, count: 3 })) }))
    });
    remount();
  }, contextFunction);
  return { reads, modules, release, setLunch(value) { lunch = value; } };
}

test('il riepilogo legge solo su apertura e selezione mese, mai sui refresh cucina', async ({ page }) => {
  const h = await setup(page);
  expect(h.modules).toEqual([]);
  expect(h.reads).toEqual([]);
  await page.evaluate(() => remount());
  expect(h.reads).toEqual([]);
  await page.locator('summary').click();
  await expect(page.locator('.kitchen-monthly-progress')).toContainText('09/12/2026');
  expect(h.modules).toHaveLength(1);
  expect(h.reads).toEqual(['current']);
  await page.evaluate(() => remount());
  await expect(page.locator('.kitchen-monthly-progress')).toContainText('09/12/2026');
  expect(h.reads).toEqual(['current']);
  await page.getByRole('button', { name: 'Mese precedente', exact: true }).click();
  await expect(page.locator('.kitchen-monthly-progress')).toHaveText('Totale definitivo');
  expect(h.reads).toEqual(['current', '2026-11']);
  await page.getByRole('button', { name: 'Mese successivo', exact: true }).click();
  await expect(page.locator('.kitchen-monthly-progress')).toContainText('09/12/2026');
  expect(h.reads).toEqual(['current', '2026-11']);
  h.setLunch(7);
  await page.locator('summary').click();
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.evaluate(() => remount());
  expect(h.reads).toEqual(['current', '2026-11']);
  await page.locator('summary').click();
  await expect.poll(() => h.reads.length).toBe(3);
  await expect(page.locator('.kitchen-monthly-progress')).toContainText('09/12/2026');
  await expect(page.locator('.kitchen-monthly-summary-content dd').nth(1)).toHaveText('7');
});

test('un refresh durante la lettura non duplica la richiesta e conserva il risultato nel nuovo box', async ({ page }) => {
  const h = await setup(page, { deferred: true });
  await page.locator('summary').click();
  await expect.poll(() => h.reads.length).toBe(1);
  await page.evaluate(() => remount());
  await expect(page.locator('[data-kitchen-monthly-summary-content]')).toContainText('Caricamento');
  expect(h.reads).toEqual(['current']);
  h.release();
  await expect(page.locator('.kitchen-monthly-progress')).toContainText('09/12/2026');
  expect(h.reads).toEqual(['current']);
  await page.evaluate(() => { centerId = 'two'; remount(); });
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.locator('[data-kitchen-monthly-summary-content]')).toBeEmpty();
  expect(h.reads).toEqual(['current']);
});
