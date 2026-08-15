import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, 'public');
const port = Number(process.argv[2] || process.env.PORT || 4173);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8']
]);

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const safePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const candidate = resolve(root, safePath || 'index.html');
  const filePath = candidate === root || candidate.startsWith(root + sep)
    ? candidate
    : join(root, 'index.html');
  const resolvedFile = await resolveFile(filePath);

  if (!resolvedFile) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes.get(extname(resolvedFile)) || 'application/octet-stream',
    'Cache-Control': resolvedFile.endsWith('sw.js') ? 'no-cache' : 'no-store'
  });
  createReadStream(resolvedFile).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tavola Comune PWA gate: http://127.0.0.1:${port}/`);
});

async function resolveFile(filePath) {
  if (existsSync(filePath) && (await stat(filePath)).isFile()) {
    return filePath;
  }

  const fallback = join(root, 'index.html');
  if (existsSync(fallback)) {
    return fallback;
  }

  return null;
}
