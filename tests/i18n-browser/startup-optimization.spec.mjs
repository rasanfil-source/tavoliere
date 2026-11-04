import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../prototypes/firebase-spark-pwa/public/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const watchdog = html.match(/<script data-startup-watchdog>([^]*?)<\/script>/)[1];
async function setup(page) {
  const requests = [];
  await page.route('https://startup.test/**', async route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path === '/') {
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html><head><meta charset="utf-8"><script>${watchdog}</script></head><body>
        <div data-startup-gate><p data-startup-status hidden></p></div></body></html>` });
    } else if (path === '/admin-actions.js') {
      await route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL(path.slice(1), root), 'utf8') });
    } else await route.abort();
  });
  await page.goto('https://startup.test/');
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

test('normal startup does not load diagnostic code or create diagnostic globals', async ({ page }) => {
  const requests = await setup(page);
  expect(await page.evaluate(() => typeof window.__startupPerf)).toBe('undefined');
  expect(requests).toEqual(['/']);
  expect(html).not.toMatch(/startup-diagnostics|startupDiagnosticsUntil|perf=1/);
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
