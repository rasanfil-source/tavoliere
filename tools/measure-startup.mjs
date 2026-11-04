// Misura la build reale senza credenziali o richieste al backend. Il login vuoto
// non è una misura del tempo fino al calendario: usare ?perf=1 sui telefoni per quello.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import { chromium, webkit, devices } from '@playwright/test';

const root = resolve(process.env.TAT_PERF_ROOT || 'prototypes/firebase-spark-pwa/dist');
const previousRoot = process.env.TAT_PERF_PREVIOUS_ROOT ? resolve(process.env.TAT_PERF_PREVIOUS_ROOT) : null;
let servingRoot = previousRoot || root;
const output = resolve(process.env.TAT_PERF_OUTPUT || '.tools/startup-measurement.json');
const iphone = process.env.TAT_PERF_DEVICE === 'iphone';
const desktop = process.env.TAT_PERF_DEVICE === 'desktop';
const runs = Number(process.env.TAT_PERF_RUNS || 3);
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml' };
const resources = new Map();
const transfers = [];
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const path = resolve(servingRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(servingRoot + sep)) { response.writeHead(403).end(); return; }
    let body = resources.get(path);
    if (!body) { body = brotliCompressSync(await readFile(path)); resources.set(path, body); }
    transfers.push({ path: pathname, bytes: body.length });
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Content-Encoding': 'br', 'Content-Length': body.length,
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await (iphone ? webkit : chromium).launch({
  ...(iphone ? {} : { channel: process.env.TAT_SMOKE_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) })
});
const measurements = [];
try {
  for (let run = 0; run < runs; run++) {
    servingRoot = previousRoot || root;
    const context = await browser.newContext({ ...(desktop ? { viewport: { width: 1280, height: 900 } } : iphone ? devices['iPhone 13'] : devices['Pixel 7']), serviceWorkers: 'allow' });
    // Blocca soltanto servizi remoti. I file locali mantengono la cache HTTP reale.
    await context.route(/https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const cdp = iphone ? null : await context.newCDPSession(page);
    if (cdp) {
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
        downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Performance.enable');
    }
    for (const scenario of previousRoot ? ['previous-cold', 'previous-warm', 'updated-first'] : ['cold', 'warm']) {
      if (scenario === 'updated-first') servingRoot = root;
      const transferOffset = transfers.length;
      await page.goto(origin + '/?view=participant', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => window.__booted === true, null, { timeout: 60000 }).catch(async error => {
        console.error({ errors, state: await page.evaluate(() => ({ booted: window.__booted,
          text: document.body.innerText.slice(0, 1800), resources: performance.getEntriesByType('resource').map(r => r.name) })) });
        throw error;
      });
      const metrics = await page.evaluate(() => ({
        navigationMs: performance.now(),
        fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        jsTransferBytes: performance.getEntriesByType('resource').filter(r => /\/assets\/.*\.js/.test(r.name)).reduce((n, r) => n + r.transferSize, 0),
        jsRequests: performance.getEntriesByType('resource').filter(r => /\/assets\/.*\.js/.test(r.name)).length,
        serviceWorker: Boolean(navigator.serviceWorker?.controller),
        documentEntry: document.querySelector('script[type="module"][src]')?.getAttribute('src'),
        loginVisible: [...document.querySelectorAll('input')].some(input => input.getClientRects().length > 0)
      }));
      const scriptTransfers = transfers.slice(transferOffset).filter(item => /\.(?:m?js)$/.test(item.path));
      metrics.networkJsBytes = scriptTransfers.reduce((sum, item) => sum + item.bytes, 0);
      metrics.networkJsRequests = scriptTransfers.length;
      metrics.expectedEntry = JSON.parse(await readFile(resolve(servingRoot, 'build-manifest.json'), 'utf8')).entry;
      const after = cdp ? (await cdp.send('Performance.getMetrics')).metrics : [];
      for (const name of ['ScriptDuration', 'TaskDuration']) {
        if (cdp) metrics[name + 'Ms'] = 1000 * (after.find(m => m.name === name)?.value || 0);
      }
      measurements.push({ run: run + 1, scenario, ...metrics, errors: [...errors] });
      if (errors.length) throw new Error(errors.join('\n'));
      if (scenario === 'cold' || scenario === 'previous-cold') {
        await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active), null, { timeout: 60000 });
        await page.evaluate(() => navigator.serviceWorker.ready);
      }
    }
    await context.close();
  }
  const manifest = JSON.parse(await readFile(resolve(root, 'build-manifest.json'), 'utf8'));
  const report = { release: manifest.release, device: iphone ? 'iPhone WebKit emulation, no CPU/network throttling' : `${desktop ? 'Edge desktop' : 'Pixel 7 emulation'}, Slow 4G 1.6 Mbps/150 ms, CPU 4x`,
    scope: 'Unauthenticated resident login; real production JS, no personal data. Not a physical-device or calendar benchmark.', measurements };
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
