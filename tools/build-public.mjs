import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { transform } from 'esbuild';

const sourceRoot = resolve('prototypes/firebase-spark-pwa/public');
const outputRoot = resolve(process.env.TAT_BUILD_OUTPUT || 'prototypes/firebase-spark-pwa/dist');

await rm(outputRoot, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });

const files = await listFiles(outputRoot);
const buildTargets = files.filter((file) => ['.js', '.mjs', '.css'].includes(extname(file)));
let sourceBytes = 0;
let outputBytes = 0;

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
  sourceBytes += Buffer.byteLength(source);
  outputBytes += Buffer.byteLength(result.code);
}));

const reduction = sourceBytes > 0 ? Math.round((1 - outputBytes / sourceBytes) * 100) : 0;
console.log(`Build web completata: ${buildTargets.length} asset, riduzione ${reduction}% (${sourceBytes} -> ${outputBytes} byte).`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}
