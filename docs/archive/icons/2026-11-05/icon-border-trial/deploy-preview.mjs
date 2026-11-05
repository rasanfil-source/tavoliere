// This command can publish only the fixed preview channel, never live Hosting.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative} from 'node:path';
const trial=dirname(fileURLToPath(import.meta.url));
const repo=resolve(trial,'../..');
const config=JSON.parse(await readFile(resolve(trial,'firebase.json'),'utf8'));
if(config.hosting.site!=='tavola-comune'||config.hosting.public!=='public'||Object.keys(config).length!==1)throw Error('Unexpected preview configuration');
const checks=JSON.parse(await readFile(resolve(trial,'checks.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const asset of checks.assets)if(digest(await readFile(resolve(trial,'public/icons',asset.name)))!==asset.sha256)throw Error('Run checks after asset changes');
const livePaths=['/build-manifest.json','/manifest.webmanifest','/icons/launcher-512-maskable.png'];
async function remoteHash(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}: ${url}`);return digest(Buffer.from(await response.arrayBuffer()));}
const before=Object.fromEntries(await Promise.all(livePaths.map(async path=>[path,await remoteHash('https://tavola-comune.web.app'+path)])));
const result=spawnSync(process.execPath,[resolve(repo,'tools/firebase-cli.mjs'),'hosting:channel:deploy','icona-bordo-r1','--project','tavola-comune','--config',resolve(trial,'firebase.json'),'--expires','14d','--json'],{cwd:repo,encoding:'utf8',maxBuffer:2_000_000});
if(result.status!==0){console.error(result.stdout);console.error(result.stderr);process.exit(result.status||1);}
let output;try{output=JSON.parse(result.stdout);}catch{throw Error('Deployment returned an unexpected response; inspect channel before retrying');}
const serialized=JSON.stringify(output);
const urls=[...new Set(serialized.match(/https:\/\/tavola-comune--icona-bordo-r1-[a-z0-9-]+\.web\.app/g)||[])];
if(urls.length!==1)throw Error('Cannot identify preview URL; inspect channel before retrying');
const url=urls[0];
const files={};
async function list(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=resolve(directory,entry.name);if(entry.isDirectory())await list(file);else{const path='/'+relative(resolve(trial,'public'),file).replaceAll('\\','/');files[path]=digest(await readFile(file));}}}
await list(resolve(trial,'public'));
for(const [path,hash] of Object.entries(files)){if(await remoteHash(url+path)!==hash)throw Error('Preview does not match local file: '+path);}
const after=Object.fromEntries(await Promise.all(livePaths.map(async path=>[path,await remoteHash('https://tavola-comune.web.app'+path)])));
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Live files changed during the preview deploy; investigate concurrent deployment');
const record={publishedAt:new Date().toISOString(),channel:'icona-bordo-r1',url,expiresIn:'14d',files,liveBefore:before,liveAfter:after,liveUnchanged:true};
await writeFile(resolve(trial,'deployment.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
