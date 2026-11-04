import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const watchdog = html.match(/<script data-startup-watchdog>([^]*?)<\/script>/)[1];
const diagnostic = html.match(/<script data-startup-diagnostics>([^]*?)<\/script>/)[1];

async function setup(page, query = '') {
  const requests = [];
  await page.route('https://startup.test/**', async route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path === '/') {
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html><head><meta charset="utf-8"><script>${diagnostic}</script><script>${watchdog}</script></head><body>
        <div data-startup-gate><p data-startup-status hidden></p></div></body></html>` });
    } else if (['/startup-diagnostics.mjs', '/admin-actions.js'].includes(path)) {
      await route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL(path.slice(1), root), 'utf8') });
    } else await route.abort();
  });
  await page.goto('https://startup.test/' + query);
  return requests;
}

test('slow startup shows waiting, not an error or reload; explicit load failure offers recovery', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    localStorage.setItem('tavolaComune.locale', 'fr');
    window.__showStartupRecovery();
  });
  await expect(page.locator('[data-startup-status]')).toHaveText('Chargement en cours…');
  await expect(page.locator('[data-startup-recovery]')).toHaveCount(0);
  await page.evaluate(() => { window.__appStarted = true; window.__showStartupRecovery(); });
  await expect(page.locator('[data-startup-recovery]')).toHaveCount(0);
  await page.evaluate(() => window.__showStartupRecovery(true));
  await expect(page.locator('[data-startup-recovery] button')).toHaveText('Réessayer');
});

test('normal startup neither downloads diagnostics nor creates diagnostic globals', async ({ page }) => {
  const requests = await setup(page);
  expect(await page.evaluate(() => typeof window.__startupPerf)).toBe('undefined');
  expect(requests).toEqual(['/']);
});

test('opt-in diagnostic report distinguishes splash and data without exporting user or URL data', async ({ page }) => {
  await setup(page, '?perf=1&c=private-center&t=private-token');
  await expect(page.locator('[data-startup-diagnostics]')).toBeVisible();
  const report = await page.evaluate(() => {
    __startupPerf.mark('splash-hidden');
    const before = __startupPerf.report();
    __startupPerf.mark('calendar-ready');
    __startupPerf.mark('calendar-ready');
    return { before, after: __startupPerf.report() };
  });
  expect(report.before.marksMs['calendar-ready']).toBeUndefined();
  expect(report.after.marksMs['calendar-ready']).toBeGreaterThanOrEqual(report.before.marksMs['splash-hidden']);
  expect(JSON.stringify(report)).not.toMatch(/private-center|private-token|startup\.test/);
  await page.locator('[data-startup-diagnostics] summary').click();
  await expect(page.locator('[data-startup-diagnostics] pre')).toContainText('calendar-ready');
});

test('Admin action module imports and constructs without calling translations', async ({ page }) => {
  await setup(page);
  const calls = await page.evaluate(async () => {
    let translated = 0;
    const module = await import('/admin-actions.js');
    module.createAdminActions({ t: () => { translated++; } });
    return translated;
  });
  expect(calls).toBe(0);
});

test('diagnostics survive reopening from the installed icon, expire and can be disabled explicitly', async ({ page }) => {
  await setup(page, '?perf=1');
  await expect(page.locator('[data-startup-diagnostics]')).toBeVisible();
  await page.goto('https://startup.test/');
  await expect(page.locator('[data-startup-diagnostics]')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('tavolaComune.startupDiagnosticsUntil', String(Date.now() - 1)));
  await page.reload();
  expect(await page.evaluate(() => typeof window.__startupPerf)).toBe('undefined');
  await page.goto('https://startup.test/?perf=1');
  await expect(page.locator('[data-startup-diagnostics]')).toBeVisible();
  await page.goto('https://startup.test/?perf=0');
  expect(await page.evaluate(() => typeof window.__startupPerf)).toBe('undefined');
});
