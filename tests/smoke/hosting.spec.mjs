import { expect, test } from '@playwright/test';

const baseUrl = process.env.TAT_SMOKE_BASE_URL || 'https://tavola-comune.web.app';
const appOrigin = new URL(baseUrl).origin;
const viewports = [
  { name: 'desktop', viewport: { width: 1365, height: 900 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true }
];

for (const target of viewports) {
  test(`Hosting avvia l’app su viewport ${target.name}`, async ({ browser }) => {
    // Contesto usa-e-getta: nessuna sessione salvata, credenziale o scrittura di dati.
    const context = await browser.newContext({
      viewport: target.viewport,
      isMobile: target.isMobile,
      hasTouch: target.isMobile,
      serviceWorkers: 'allow'
    });
    const page = await context.newPage();
    const uncaughtErrors = [];
    const failedAssets = [];

    page.on('pageerror', error => uncaughtErrors.push(error.message));
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin !== appOrigin || !/\.(?:m?js|css)$/i.test(url.pathname)) return;

      const contentType = response.headers()['content-type'] || '';
      const isCss = url.pathname.toLowerCase().endsWith('.css');
      const hasExpectedType = isCss ? /text\/css/i.test(contentType) : /javascript|ecmascript/i.test(contentType);
      if (!response.ok() || !hasExpectedType) {
        failedAssets.push(`${response.status()} ${url.pathname} (${contentType || 'senza Content-Type'})`);
      }
    });
    page.on('requestfailed', request => {
      const url = new URL(request.url());
      if (url.origin === appOrigin && /\.(?:m?js|css)$/i.test(url.pathname)) {
        failedAssets.push(`richiesta fallita ${url.pathname}: ${request.failure()?.errorText || 'errore rete'}`);
      }
    });

    try {
      const response = await page.goto(new URL('/', baseUrl).href, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), 'la pagina iniziale deve essere servita').toBe(200);
      await expect(page.locator('[data-title]')).toBeVisible();
      await expect(page.locator('[data-title]')).not.toHaveText(/^\s*$/);

      const appShell = page.locator('[data-app-shell]');
      await expect.poll(
        () => appShell.evaluate(element => element.hasAttribute('inert')),
        { message: 'il blocco di avvio deve essere rilasciato', timeout: 18_000 }
      ).toBe(false);
      await expect(page.locator('[data-startup-gate]')).toHaveCount(0);
      expect(uncaughtErrors, 'non devono esserci eccezioni JavaScript non gestite').toEqual([]);
      expect(failedAssets, 'gli asset JS/CSS devono rispondere con il contenuto atteso').toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test('Hosting restituisce 404 per un asset JavaScript inesistente', async ({ request }) => {
  const uniqueId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const response = await request.get(`/assets/__tat_smoke_missing_${uniqueId}.js`, {
    headers: { 'Cache-Control': 'no-cache' }
  });

  expect(response.status()).toBe(404);
});
