import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, relative, resolve, sep } from 'node:path';
import { build, transform } from 'esbuild';

const root = resolve('.');
const sourceRoot = resolve('prototypes/firebase-spark-pwa/public');
const defaultOutputRoot = resolve('prototypes/firebase-spark-pwa/dist');
const outputRoot = resolve(process.env.TAT_BUILD_OUTPUT || defaultOutputRoot);
// La destinazione della build non può coincidere con i sorgenti o una loro cartella superiore.
if (outputRoot !== defaultOutputRoot && !outputRoot.startsWith(resolve('.tools/build-tests') + sep)) {
  throw new Error('TAT_BUILD_OUTPUT must be dist or a temporary directory under .tools/build-tests');
}

await mkdir(outputRoot, { recursive: true });
// Conserva i moduli immutabili per le schede aperte, che possono richiedere funzionalità facoltative durante un aggiornamento dell'applicazione.
for (const entry of await readdir(outputRoot, { withFileTypes: true })) {
  if (entry.name === 'assets') continue;
  const target = resolve(outputRoot, entry.name);
  if (!target.startsWith(outputRoot + sep)) throw new Error('Invalid build path');
  await rm(target, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
await cp(sourceRoot, outputRoot, { recursive: true });

const files = (await listFiles(sourceRoot)).map(file => resolve(outputRoot, relative(sourceRoot, file)));
const buildTargets = files.filter((file) => ['.js', '.mjs', '.css'].includes(extname(file)));

await Promise.all(buildTargets.map(async (file) => {
  const extension = extname(file);
  const source = await readFile(file, 'utf8');
  const result = await transform(source, {
    loader: extension === '.css' ? 'css' : 'js',
    minify: true,
    target: extension === '.css' ? undefined : 'es2020',
    format: extension === '.css' ? undefined : 'esm',
    legalComments: 'none',
    charset: 'utf8',
    sourcefile: file
  });
  await writeFile(file, result.code, 'utf8');
}));

const firebaseVersion = JSON.parse(await readFile(resolve('node_modules/firebase/package.json'), 'utf8')).version;
const result = await build({
  entryPoints: [resolve(sourceRoot, 'app.js'), resolve(sourceRoot, 'styles.css'),
    resolve(sourceRoot, 'summary-matrix-refinements.css')],
  outdir: resolve(outputRoot, 'assets'),
  entryNames: '[name]-[hash]', chunkNames: 'chunk-[hash]', assetNames: '[name]-[hash]',
  bundle: true, splitting: true, format: 'esm', platform: 'browser',
  target: 'es2020', minify: true, charset: 'utf8', legalComments: 'eof',
  metafile: true, external: ['fs', 'url', '/icons/*'],
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'browser-module-identities',
    setup(bundler) {
      // Lo sviluppo usa import dal CDN; la produzione incorpora lo stesso SDK con Firestore completo e cache in memoria.
      bundler.onResolve({ filter: /^https:\/\/www\.gstatic\.com\/firebasejs\// }, async (args) => {
        const match = args.path.match(/\/firebasejs\/([^/]+)\/firebase-(app|auth|firestore)\.js$/);
        if (!match || match[1] !== firebaseVersion) throw new Error(`Firebase version mismatch: ${args.path}`);
        return bundler.resolve(`firebase/${match[2]}`, { kind: args.kind, resolveDir: root });
      });
      // I parametri degli import identificano lo stesso sorgente locale. La build usa URL con impronta del contenuto e un'unica istanza SDK/Auth.
      bundler.onResolve({ filter: /^\.{1,2}\/.*\?v=/ }, (args) => ({
        path: resolve(args.resolveDir, args.path.split('?')[0])
      }));
    }
  }]
});

const outputs = Object.fromEntries(Object.entries(result.metafile.outputs).map(([path, info]) => [
  webPath(resolve(path)), {
    bytes: info.bytes,
    source: info.entryPoint ? relative(sourceRoot, resolve(info.entryPoint)).replaceAll('\\', '/') : null,
    inputs: Object.keys(info.inputs).map(input => input.replaceAll('\\', '/')),
    imports: info.imports.map(item => ({ ...item, path: item.external ? item.path : webPath(resolve(item.path)) }))
  }
]));
const entryFor = source => Object.keys(outputs).find(path => outputs[path].source === source);
const entry = entryFor('app.js');
const styles = [entryFor('styles.css'), entryFor('summary-matrix-refinements.css')];
const initial = staticGraph([entry]);
const resident = staticGraph([entry, entryFor('participant-data.js')]);
const residentPreloads = resident.filter(path => !initial.includes(path));
if (!entry || !entryFor('participant-data.js') || styles.some(path => !path)) throw new Error('Missing build entry');

let html = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
html = html.replace(/^.*rel="modulepreload"[^\n]*\n/gm, '');
const preloadPlaceholder = /var residentModulePreloads = \[[^\]]*\];/;
if (!preloadPlaceholder.test(html)) throw new Error('Missing resident preload placeholder');
html = html.replace(preloadPlaceholder, `var residentModulePreloads = ${JSON.stringify(residentPreloads)};`);
html = html.replace(/src="\/app\.js\?v=[^"]+"/, `src="${entry}"`);
for (const name of ['styles.css', 'summary-matrix-refinements.css']) {
  html = html.replace(new RegExp(`href="/${name.replaceAll('.', '\\.')}\\?v=[^"]+"`), `href="${entryFor(name)}"`);
}
html = html.replace('</head>', initial.filter(path => path !== entry)
  .map(path => `    <link rel="modulepreload" href="${path}">`).join('\n') + '\n  </head>');
await writeFile(resolve(outputRoot, 'index.html'), html);

// La cache iniziale deriva dal grafo effettivo dei moduli e non precarica le funzioni facoltative amministrative, cucina, riepilogo o copie di sicurezza.
const staticShell = ['/', '/index.html', '/manifest.webmanifest', '/manifest-kitchen.webmanifest',
  '/icons/splash-512-transparent.png?v=20260824a', '/icons/whatsapp.svg'];
let worker = await readFile(resolve(sourceRoot, 'sw.js'), 'utf8');
const release = digest(html + JSON.stringify(outputs) + worker).slice(0, 16);
worker = worker.replace(/const CACHE_NAME = [^;]+;/, `const CACHE_NAME = CACHE_PREFIX + 'bundle-${release}';`);
worker = worker.replace(/const SHELL_ENTRY = [^;]+;/, `const SHELL_ENTRY = ${JSON.stringify(entry)};`);
worker = worker.replace(/const FIREBASE_SDK = \[[^]*?;/, 'const FIREBASE_SDK = [];');
worker = worker.replace(/const APP_SHELL = \[[^]*?\n\];/,
  `const APP_SHELL = ${JSON.stringify([...staticShell, ...styles, ...resident])};`);
const compiledWorker = await transform(worker, { loader: 'js', minify: true, target: 'es2020',
  format: 'esm', legalComments: 'none', charset: 'utf8' });
await writeFile(resolve(outputRoot, 'sw.js'), compiledWorker.code);

const releaseFiles = [...new Set([...files.map(webPath), ...Object.keys(outputs)])].sort();
const hashes = Object.fromEntries(await Promise.all(releaseFiles.map(async path => [
  path, digest(await readFile(resolve(outputRoot, '.' + path)))
])));
const sourcePaths = [...await listFiles(sourceRoot), resolve('tools/build-public.mjs'), resolve('package-lock.json')];
const sources = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [
  relative(root, path).replaceAll('\\', '/'), digest(await readFile(path))
])));
const manifest = { schema: 1, release, firebaseVersion, firestore: 'full', entry, styles,
  initial, resident, residentPreloads, outputs, files: hashes, sources };
await writeFile(resolve(outputRoot, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const bytes = paths => paths.reduce((total, path) => total + outputs[path].bytes, 0);
console.log(`Build web: ${Object.keys(outputs).length} bundle; avvio ${initial.length} file JS / ${bytes(initial)} byte; residente ${resident.length} file JS / ${bytes(resident)} byte (Firebase incluso).`);
console.log(`Firestore completo ${firebaseVersion}; moduli amministrativi su richiesta; release ${release}.`);

function webPath(path) { return '/' + relative(outputRoot, path).replaceAll('\\', '/'); }
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function staticGraph(entries) {
  const seen = new Set();
  function visit(path) {
    if (!path || seen.has(path)) return;
    const output = outputs[path];
    if (!output) throw new Error(`Unresolved build import: ${path}`);
    seen.add(path);
    for (const item of output.imports) if (!item.external && item.kind !== 'dynamic-import') visit(item.path);
  }
  entries.forEach(visit);
  return [...seen].sort();
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}
