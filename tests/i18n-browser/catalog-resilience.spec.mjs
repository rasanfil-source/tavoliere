import { test as base, expect, webkit, devices } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Il contesto effimero WebKit elimina Cache Storage a ogni navigazione.
// Un profilo dedicato riproduce la memoria della normale sessione Safari/PWA.
// https://github.com/microsoft/playwright/issues/41618
const test = base.extend({
  page: async ({ page, browserName }, use) => {
    if (browserName !== 'webkit') return use(page);
    // Percorso breve: le sottocartelle WebKit superano MAX_PATH nei nomi dei test.
    const prefix = resolve('.tools/wk-');
    const profile = await mkdtemp(prefix);
    const context = await webkit.launchPersistentContext(profile, {
      ...devices['iPhone 13'], serviceWorkers: 'block', headless: true
    });
    try { await use(context.pages()[0]); } finally {
      await context.close();
      if (resolve(profile).startsWith(prefix)) await rm(profile, { recursive: true, force: true });
    }
  }
});

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const moduleSource = await readFile(new URL('i18n/i18n.mjs', root), 'utf8');
const appSource = await readFile(new URL('app.js', root), 'utf8');
const locales = ['it', 'en', 'fr', 'es', 'de', 'ca'];
const catalogs = Object.fromEntries(await Promise.all(locales.map(async locale => [locale,
  JSON.parse(await readFile(new URL(`i18n/${locale}.json`, root), 'utf8'))])));
const keys = [...new Set(['app.title', 'app.title.kitchen', 'summary.view.todayTitle',
  'time.today', 'time.tomorrow', 'meal.type.breakfast', 'meal.type.lunch', 'meal.type.dinner',
  'participant.meal.save.waiting', 'participant.meal.save.failed', 'participant.meal.save.success',
  ...Object.keys(catalogs.it).filter(key => key.startsWith('week.operations.') || key.startsWith('common.actions.'))])];
const functionNames = ['renderAllViews', 'setParticipantStatus', 'formatRefreshLabel',
  'setFreshnessStatus', 'formatKitchenRefreshLabel', 'setKitchenScreenFreshnessStatus'];
const functions = functionNames.map(name => appSource.match(new RegExp(`function ${name}\\([^]*?\\n}`))[0]).join('\n');

async function setup(page, { locale = 'it', mode = 'week', delivery = 'ok' } = {}) {
  const blocked = [], requests = [], unexpected = [];
  let deliveryMode = delivery;
  let version = 'catalog-test-v1';
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://i18n.test') { unexpected.push(url.href); return route.abort(); }
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta name="description"></head><body>
      ${keys.map(key => `<span data-i18n="${key}"></span>`).join('')}
      <button data-i18n="common.action.add" data-i18n-title="common.actions.add" data-i18n-aria-label="common.actions.add"></button>
      <input data-i18n-placeholder="common.actions.add">
      <p id="participant"></p><p id="week"></p><p id="summary"></p><p id="kitchen"></p>
      </body></html>` });
    if (url.pathname === '/i18n/i18n.mjs') return route.fulfill({ contentType: 'text/javascript',
      body: moduleSource.replace(/const CATALOG_CACHE_KEY = [^;]+;/, `const CATALOG_CACHE_KEY = '${version}';`) });
    const match = url.pathname.match(/^\/i18n\/(\w+)\.json$/);
    if (match) {
      requests.push(match[1]);
      if (deliveryMode === 'delayed') return new Promise(resolve => blocked.push({ route, locale: match[1], resolve }));
      if (deliveryMode === 'offline') return route.abort('internetdisconnected');
      if (deliveryMode === 'selected-offline' && match[1] !== 'it') return route.abort('internetdisconnected');
      if (deliveryMode === 'malformed') return route.fulfill({ contentType: 'application/json', body: '{broken' });
      return route.fulfill({ json: catalogs[match[1]] });
    }
    unexpected.push(url.href); return route.abort();
  });
  await page.goto(`https://i18n.test/?view=${mode}`);
  const initialize = () => page.evaluate(async ({ locale, mode, functions }) => {
    localStorage.setItem('tavolaComune.locale', locale);
    window.i18n = await import('/i18n/i18n.mjs');
    const state = { mode, lastSuccessfulRefreshAt: new Date('2026-11-03T11:24:00Z'), kitchenUpdatedAt: new Date('2026-11-03T11:24:00Z') };
    const elements = { participantStatus: document.querySelector('#participant'), weekStatus: document.querySelector('#week'),
      summaryStatus: document.querySelector('#summary'), status: document.querySelector('#kitchen') };
    const deps = { state, elements, document, t: i18n.t, getLocale: i18n.getLocale, applyTranslations: i18n.applyTranslations,
      formatLastUpdateTime: () => '11:24', renderMode() {}, renderParticipantMeals() {}, renderMeals() {}, renderPendingMealStatus() {},
      isKitchenScreenReady: () => true, isKitchenScreenDegraded: () => window.degraded === true };
    window.ui = new Function(...Object.keys(deps), functions + '; return {renderAllViews, formatRefreshLabel, setParticipantStatus, setKitchenScreenFreshnessStatus};')(...Object.values(deps));
    window.paint = () => {
      if (mode === 'kitchen') ui.setKitchenScreenFreshnessStatus();
      else ui.setParticipantStatus(ui.formatRefreshLabel(mode === 'week' ? 'settimana' : 'timer'), 'current');
      i18n.applyTranslations(document);
    };
    window.start = () => { window.finished = false; window.initializing = i18n.initI18n().then(() => { ui.renderAllViews(); window.finished = true; }); paint(); };
  }, { locale, mode, functions });
  await initialize();
  return {
    requests, unexpected,
    setDelivery(value) { deliveryMode = value; },
    setVersion(value) { version = value; },
    async reopen() { await page.reload(); await initialize(); await page.evaluate(async () => { start(); await initializing; }); },
    async release() {
      deliveryMode = 'ok';
      for (const item of blocked.splice(0)) { await item.route.fulfill({ json: catalogs[item.locale] }); item.resolve(); }
    }
  };
}

for (const locale of locales) {
  test(`${locale}: local catalogs survive reopen and an app update; changed catalog version fetches again`, async ({ page }) => {
    const h = await setup(page, { locale });
    await page.evaluate(async () => { localStorage.setItem('auth-sentinel', 'unchanged'); start(); await initializing; });
    const count = locale === 'it' ? 1 : 2;
    await expect.poll(() => page.evaluate(async () => (await (await caches.open('tavola-comune-i18n-v1')).keys()).length)).toBe(count);
    expect(h.requests.length).toBe(count);
    h.setDelivery('offline');
    for (let i = 0; i < 2; i++) { await h.reopen(); await assertLabels(page, locale); }
    expect(h.requests.length).toBe(count);
    h.setDelivery('ok'); h.setVersion('catalog-test-v2');
    await h.reopen(); await assertLabels(page, locale);
    expect(h.requests.length).toBe(count * 2);
    expect(await page.evaluate(() => localStorage.getItem('auth-sentinel'))).toBe('unchanged');
  });
}

test('unavailable storage keeps translations working through the network', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'caches', { value: { open: async () => { throw new Error('denied'); } } }));
  const h = await setup(page, { locale: 'fr' });
  await page.evaluate(async () => { start(); await initializing; });
  await assertLabels(page, 'fr');
  await h.reopen(); await assertLabels(page, 'fr');
  expect(h.requests.length).toBe(4);
});

test('a corrupted local catalog is replaced and does not hide the selected language', async ({ page }) => {
  const h = await setup(page, { locale: 'de' });
  await page.evaluate(async () => {
    const cache = await caches.open('tavola-comune-i18n-v1');
    await cache.put('/i18n/de.json?v=catalog-test-v1', new Response('{broken'));
    start(); await initializing;
  });
  await assertLabels(page, 'de');
  await expect.poll(() => page.evaluate(async () => {
    const response = await (await caches.open('tavola-comune-i18n-v1')).match('/i18n/de.json?v=catalog-test-v1');
    try { return (await response.json())['app.title']; } catch { return ''; }
  })).toBe(catalogs.de['app.title']);
  h.setDelivery('offline'); await h.reopen(); await assertLabels(page, 'de');
  expect(h.requests.length).toBe(2);
});

async function assertLabels(page, locale) {
  const values = await page.locator('[data-i18n]').evaluateAll(nodes => nodes.map(node => [node.dataset.i18n, node.textContent]));
  for (const [key, value] of values) expect(value, `${locale}: ${key}`).toBe(catalogs[locale][key === 'common.action.add' ? 'common.actions.add' : key]);
  await expect(page.locator('button')).toHaveAttribute('title', catalogs[locale]['common.actions.add']);
  await expect(page.locator('button')).toHaveAttribute('aria-label', catalogs[locale]['common.actions.add']);
  await expect(page.locator('input')).toHaveAttribute('placeholder', catalogs[locale]['common.actions.add']);
}

for (const locale of locales) {
  for (const delivery of ['delayed', 'offline', 'malformed', 'selected-offline']) {
    test(`${locale}: ${delivery} catalogs retain readable UI and the saved language`, async ({ page }) => {
      const h = await setup(page, { locale, delivery });
      await page.evaluate(() => start());
      if (delivery === 'delayed') {
        await expect.poll(() => h.requests.length).toBeGreaterThan(0);
        expect(await page.evaluate(() => finished)).toBe(false);
        // Before the catalog arrives the embedded default must be readable, never raw keys.
        await assertLabels(page, 'it');
        await h.release();
      }
      await expect.poll(() => page.evaluate(() => finished)).toBe(true);
      await assertLabels(page, locale);
      expect(await page.evaluate(() => i18n.t('status.updatedAt', { time: '11:24' })))
        .toBe(catalogs[locale]['status.updatedAt'].replace('{time}', '11:24'));
      expect(await page.evaluate(() => i18n.t('week.operations.note.forDate', { date: '03/11' })))
        .toBe(catalogs[locale]['week.operations.note.forDate'].replace('{date}', '03/11'));
      expect(await page.evaluate(() => i18n.t('week.operations.health.count', { count: 3 })))
        .toBe(catalogs[locale]['week.operations.health.count'].replace('{count}', '3'));
      expect(await page.evaluate(() => localStorage.getItem('tavolaComune.locale'))).toBe(locale);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      expect(h.unexpected).toEqual([]);
      if (delivery !== 'delayed') {
        h.setDelivery('ok');
        await page.evaluate(async locale => { await i18n.setLocale(locale); ui.renderAllViews(); }, locale);
        await assertLabels(page, locale);
      }
    });
  }
}

for (const mode of ['week', 'participant', 'summary', 'kitchen']) {
  test(`${mode}: language switches update dynamic freshness and preserve timestamps without data requests`, async ({ page }) => {
    const h = await setup(page, { mode });
    await page.evaluate(async () => { start(); await initializing; });
    for (const locale of locales) {
      await page.evaluate(async locale => { await i18n.setLocale(locale); ui.renderAllViews(); }, locale);
      await assertLabels(page, locale);
      await expect(page.locator(`#${mode}`)).toHaveText(catalogs[locale]['status.updatedAt'].replace('{time}', '11:24'));
      expect(await page.title()).toBe(catalogs[locale][mode === 'kitchen' ? 'app.title.kitchen' : 'app.title']);
    }
    const count = h.requests.length;
    await page.evaluate(async () => { await i18n.setLocale('en'); ui.renderAllViews(); });
    expect(h.requests.length).toBe(count);
    expect(h.unexpected).toEqual([]);
  });
}

test('a slow older language choice cannot overwrite a newer one', async ({ page }) => {
  const h = await setup(page);
  await page.evaluate(async () => { start(); await initializing; });
  h.setDelivery('delayed');
  await page.evaluate(() => { window.older = i18n.setLocale('fr'); });
  await expect.poll(() => h.requests.includes('fr')).toBe(true);
  h.setDelivery('ok');
  await page.evaluate(async () => { await i18n.setLocale('de'); ui.renderAllViews(); });
  await h.release();
  await page.evaluate(async () => { await older; ui.renderAllViews(); });
  await assertLabels(page, 'de');
  expect(await page.evaluate(() => localStorage.getItem('tavolaComune.locale'))).toBe('de');
});
