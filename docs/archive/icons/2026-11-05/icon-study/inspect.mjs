// Verifica locale e acquisizione della tavola: nessun accesso all'app o a Firebase.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1160,height:1050},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route(/^https?:/,route=>route.abort());
const assets=[];
try {
  await page.goto(pathToFileURL(resolve(root,'index.html')).href);
  await page.locator('.card').last().waitFor();
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  for(const name of ['originale.png','bozzetto-a-continuita.png','bozzetto-b-essenziale.png']) {
    const meta=await page.evaluate(async name=>{
      const img=new Image();img.src='assets/'+name;await img.decode();
      return {width:img.naturalWidth,height:img.naturalHeight};
    },name);
    const bytes=await readFile(resolve(root,'assets',name));
    assets.push({file:'assets/'+name,...meta,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  await page.screenshot({path:resolve(root,'confronto-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Circolare',exact:true}).click();
  await page.getByRole('button',{name:'Scuro',exact:true}).click();
  await page.getByRole('button',{name:'Proposta A',exact:true}).click();
  const interactive=await page.evaluate(()=>({mask:document.body.dataset.mask,dark:document.querySelectorAll('.stage.dark').length,splash:document.querySelector('#splash-icon').getAttribute('src')}));
  if(interactive.mask!=='circle'||interactive.dark!==3||!interactive.splash.includes('bozzetto-a'))throw Error('Controlli interattivi non coerenti');
  await page.screenshot({path:resolve(root,'confronto-circolare-scuro.png'),fullPage:true});
  await page.getByRole('button',{name:'Arrotondata',exact:true}).click();
  await page.getByRole('button',{name:'Chiaro',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:resolve(root,'confronto-mobile.png'),fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow||errors.length)throw Error(JSON.stringify({overflow,errors}));
  const report={date:'2026-11-05',scope:'Bozzetti locali; nessuna verifica su telefoni reali',assets,checks:{desktop:'1160 px',mobile:'390 px',imagesDecoded:true,interactiveControls:true,horizontalOverflow:false,pageErrors:errors}};
  await writeFile(resolve(root,'inspection.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
