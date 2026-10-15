import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { verifyBuild } from '../../tools/verify-build.mjs';

const buildRoot = resolve('prototypes/firebase-spark-pwa/dist');
const manifest = await verifyBuild(buildRoot);
const source = await readFile(resolve(buildRoot, 'sw.js'), 'utf8');
const origin = 'https://app.example.test';

test('HTML preloads only the additional resident graph on personal routes', async () => {
  const html = await readFile(resolve(buildRoot, 'index.html'), 'utf8');
  const script = html.match(/<script data-resident-modulepreload>([^]*?)<\/script>/)?.[1];
  assert.ok(script);
  for (const [search, expected] of [
    ['', true], ['?access=friendly&c=test', true], ['?view=participant', true], ['?view=week', true],
    ['?view=unknown', true], ['?view=admin', false], ['?view=kitchen', false], ['?view=summary', false],
    ['?invite=example', false], ['?adminInvite=example', false]
  ]) {
    const links = [];
    vm.runInNewContext(script, { URLSearchParams, window: { location: { search } }, document: {
      createElement: () => ({}), head: { appendChild: link => links.push(link) }
    } });
    assert.deepEqual(links.map(link => link.href), expected ? manifest.residentPreloads : [], search);
    assert.ok(links.every(link => link.rel === 'modulepreload'));
  }
  for (const path of manifest.residentPreloads) {
    assert.ok(!manifest.outputs[path].inputs.some(input => /daily-operations|admin-center|kitchen-data/.test(input)));
  }
});

function worker() {
  const handlers = {}, entries = new Map(), requests = [], installs = [];
  let offline = false;
  const key = request => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const cache = {
    match: async request => entries.get(key(request))?.clone(),
    put: async (request, response) => entries.set(key(request), response.clone()),
    addAll: async paths => {
      installs.push(...paths);
      for (const path of paths) entries.set(key(path), new Response('installed'));
    }
  };
  vm.runInNewContext(source, { URL, Response, setTimeout, clearTimeout,
    self: { location: { origin }, clients: { claim: async () => {} },
      addEventListener: (type, handler) => { handlers[type] = handler; } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => {} },
    fetch: async request => {
      requests.push(key(request));
      if (offline) throw new Error('offline');
      return new Response('network');
    }
  });
  return { entries, requests, installs, setOffline: () => { offline = true; },
    async install() {
      let done;
      handlers.install({ waitUntil: promise => { done = promise; } });
      await done;
    },
    fetch(path) {
      let response;
      handlers.fetch({ request: { url: key(path), method: 'GET' },
        respondWith: promise => { response = promise; }, waitUntil() {} });
      return response;
    }
  };
}

test('generated worker installs the complete resident graph without administrative chunks', async () => {
  const sw = worker();
  await sw.install();
  for (const path of [...manifest.resident, ...manifest.styles]) assert.ok(sw.installs.includes(path), path);
  for (const path of sw.installs.filter(path => path.startsWith('/assets/'))) {
    assert.ok(manifest.files[path], path);
    assert.ok(!path.includes('?'), 'hashed assets use one URL identity');
    const inputs = manifest.outputs[path].inputs;
    assert.ok(!inputs.some(input => /admin-participant-data|admin-center|domain\/center-(backup|restore)/.test(input)));
  }
});

test('installed calendar chunks reopen offline without requests or Firebase data caching', async () => {
  const sw = worker();
  await sw.install(); sw.setOffline();
  for (const path of manifest.resident) assert.equal(await (await sw.fetch(path)).text(), 'installed');
  assert.equal(sw.requests.length, 0);
  for (const url of ['https://firestore.googleapis.com/v1/projects/test',
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup', '/api/session']) {
    assert.equal(sw.fetch(url), undefined);
  }
});

test('old hashed chunks remain cacheable and are never substituted for a different release', async () => {
  const sw = worker();
  const old = '/assets/app-AAAAAAAA.js', current = '/assets/app-BBBBBBBB.js';
  assert.equal(await (await sw.fetch(old)).text(), 'network');
  sw.setOffline();
  assert.equal(await (await sw.fetch(old)).text(), 'network');
  await assert.rejects(sw.fetch(current), /offline/);
});

test('bundling preserves full SDK identity and live locale URLs', async () => {
  const sources = await Promise.all(manifest.resident.map(path => readFile(resolve(buildRoot, '.' + path), 'utf8')));
  assert.ok(sources.some(source => source.includes('/i18n/')));
  assert.ok(manifest.resident.length < 20);
  const files = Object.keys(manifest.outputs);
  assert.ok(files.every(path => /^\/assets\/[\w-]+-[A-Z0-9]{8}\.(js|css)$/.test(path)));
});

test('rebuild is reproducible and retains immutable files needed by already open pages', async () => {
  const scratchRoot = resolve('.tools/build-tests');
  await mkdir(scratchRoot, { recursive: true });
  const scratch = await mkdtemp(resolve(scratchRoot, 'release-'));
  assert.ok(scratch.startsWith(scratchRoot + sep));
  try {
    await mkdir(resolve(scratch, 'assets'));
    const retained = resolve(scratch, 'assets/chunk-AAAAAAAA.js');
    await writeFile(retained, 'previous published chunk');
    const built = spawnSync(process.execPath, ['tools/build-public.mjs'], {
      encoding: 'utf8', env: { ...process.env, TAT_BUILD_OUTPUT: scratch }
    });
    assert.equal(built.status, 0, built.stderr);
    const rebuilt = JSON.parse(await readFile(resolve(scratch, 'build-manifest.json'), 'utf8'));
    assert.equal(rebuilt.release, manifest.release);
    assert.deepEqual(rebuilt.files, manifest.files);
    assert.equal(await readFile(retained, 'utf8'), 'previous published chunk');
    await verifyBuild(scratch);
  } finally {
    if (!scratch.startsWith(scratchRoot + sep)) throw new Error('Unsafe cleanup path');
    await rm(scratch, { recursive: true, force: true });
  }
});
