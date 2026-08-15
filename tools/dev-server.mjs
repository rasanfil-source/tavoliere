import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const publicRoot = resolve(process.cwd(), 'prototypes/firebase-spark-pwa/public');
const port = Number(process.env.PORT || 4180);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    let filePath = resolve(publicRoot, '.' + requestedPath);
    if (filePath !== publicRoot && !filePath.startsWith(publicRoot + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat?.isFile()) {
      filePath = resolve(publicRoot, 'index.html');
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Dev server error: ' + error.message);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tavola Comune TAT: http://127.0.0.1:${port}`);
});
