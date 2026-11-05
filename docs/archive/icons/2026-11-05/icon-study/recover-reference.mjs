import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const root=new URL('./history/',import.meta.url);
await mkdir(root,{recursive:true});
for(const name of ['launcher-rounded-green-512.png','launcher-rounded-green-maskable-512.png','launcher-rounded-green-maskable-192.png']) {
  const bytes=execFileSync('git',['show',`7263e36:prototypes/firebase-spark-pwa/public/icons/${name}`],{maxBuffer:2_000_000});
  await writeFile(new URL(name,root),bytes);
}
