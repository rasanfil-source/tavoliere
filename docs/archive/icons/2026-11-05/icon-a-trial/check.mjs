import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir,mkdtemp,rm } from 'node:fs/promises';
import { resolve,dirname,extname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root=dirname(fileURLToPath(import.meta.url));
const publicRoot=resolve(root,'public');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const config=JSON.parse(await readFile(resolve(root,'firebase.json'),'utf8'));
const server=createServer(async(req,res)=>{
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    const file=resolve(publicRoot,'.'+(path==='/'?'/index.html':path));
    if(!file.startsWith(publicRoot+sep)){res.writeHead(403).end();return;}
    const body=await readFile(file);
    const headers=Object.fromEntries(config.hosting.headers[0].headers.map(h=>[h.key,h.value]));
    res.writeHead(200,{...headers,'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);
  }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
const profileRoot=resolve(root,'../../.tools');
await mkdir(profileRoot,{recursive:true});
const profile=await mkdtemp(resolve(profileRoot,'icon-border-browser-'));
try{
  browser=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,viewport:{width:390,height:844}});
  const context=browser;
  const page=await context.newPage();const errors=[];const outside=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(!request.url().startsWith(base))outside.push(request.url());});
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('#diagnostics').textContent.includes('Worker: pronto'));
  const assets=[];
  for(const kind of ['any','maskable'])for(const size of [192,512]){
    const name=`a-${kind}-${size}-r2.png`;
    const pixels=await page.evaluate(async name=>{
      const img=new Image();img.src='/icons/'+name;await img.decode();
      const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
      let nonOpaque=0,whitePeripheral=0,nonGreenPeripheral=0,whiteOutsideSafe=0,maxWhiteRadius=0,minCenterAlpha=255;
      const outsideSamples=[];
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const i=(y*canvas.width+x)*4;const [r,g,b,a]=data.slice(i,i+4);
        const radius=Math.hypot((x+.5)/canvas.width-.5,(y+.5)/canvas.height-.5);
        if(a!==255)nonOpaque++;
        if(x>canvas.width*.2&&x<canvas.width*.8&&y>canvas.height*.2&&y<canvas.height*.8)minCenterAlpha=Math.min(minCenterAlpha,a);
        // Neutral white detects the utensils/ring, excluding green-tinted glossy highlights.
        const white=a>250&&r>205&&g>205&&b>205&&Math.max(r,g,b)-Math.min(r,g,b)<15;
        if(white){maxWhiteRadius=Math.max(maxWhiteRadius,radius);if(radius>.4){whiteOutsideSafe++;if(outsideSamples.length<8)outsideSamples.push({x,y,r,g,b,radius});}}
        if(x<canvas.width*.08||x>=canvas.width*.92||y<canvas.height*.08||y>=canvas.height*.92){
          if(white)whitePeripheral++;
          if(a>250&&!(g>r&&g>b))nonGreenPeripheral++;
        }
      }
      const cornerAlphas=[3,(canvas.width-1)*4+3,(canvas.height-1)*canvas.width*4+3,data.length-1].map(i=>data[i]);
      return {width:canvas.width,height:canvas.height,nonOpaque,cornerAlphas,minCenterAlpha,whitePeripheral,nonGreenPeripheral,whiteOutsideSafe,maxWhiteRadius,outsideSamples};
    },name);
    assert.equal(pixels.width,size);assert.equal(pixels.height,size);
    if(kind==='maskable')assert.equal(pixels.nonOpaque,0,'Maskable must be opaque');
    else{
      assert.deepEqual(pixels.cornerAlphas,[0,0,0,0],'Any icon corners must be transparent');
      assert.ok(pixels.nonOpaque>size*size*.01,'Any icon needs actual transparent corner areas');
      assert.ok(pixels.minCenterAlpha>=250,'The central image must remain solid');
    }
    assert.equal(pixels.whitePeripheral,0,'No white frame in image');
    assert.equal(pixels.nonGreenPeripheral,0,'All outer 8% pixels must be green');
    if(kind==='maskable')assert.equal(pixels.whiteOutsideSafe,0,'White symbol must fit inside maskable safe circle: '+JSON.stringify(pixels.outsideSamples));
    const bytes=await readFile(resolve(publicRoot,'icons',name));
    assets.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,...pixels});
  }
  const manifest=await(await fetch(base+'/manifest.webmanifest')).json();
  assert.equal(manifest.id,'/tat-icon-a-r2');assert.equal(manifest.start_url,'/');
  for(const icon of manifest.icons){const response=await fetch(base+icon.src);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);}
  assert.deepEqual(manifest.icons.map(i=>i.purpose),['any','any','maskable','maskable']);
  assert.equal(await page.locator('.opening img').getAttribute('src'),'/icons/a-any-512-r2.png');
  assert.equal(await page.locator('.opening img').evaluate(img=>getComputedStyle(img).borderRadius),'0px','Rounded silhouette must come from PNG alpha, not CSS');
  const cdp=await context.newCDPSession(page);
  const installability=await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors,[],'Browser installability diagnostics');
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:resolve(root,'preview-mobile.png'),fullPage:true});
  // Exercise only our event handler; this synthetic event does not prove native installability.
  await page.evaluate(()=>{const event=new Event('beforeinstallprompt');event.prompt=async()=>{};event.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(event);});
  await page.getByRole('button',{name:'Installa «TAT Prova A2»'}).click();
  await page.getByText('Richiesta accettata.',{exact:false}).waitFor();
  await page.selectOption('#device',{label:'Realme GT 5G'});
  await page.check('[name=border][value=green]');await page.selectOption('#installation','install');
  const downloadPromise=page.waitForEvent('download');await page.click('#save');
  const download=await downloadPromise;assert.equal(download.suggestedFilename(),'tat-prova-a-r2.json');
  await page.setViewportSize({width:1100,height:900});await page.reload();
  await page.waitForFunction(()=>document.querySelector('#diagnostics').textContent.includes('Worker: pronto'));
  await page.screenshot({path:resolve(root,'preview-desktop.png'),fullPage:true});
  await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Verde, con angoli trasparenti.'}).waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  const report={date:'2026-11-05',assets,checks:{staticManifest:true,allIconURLs200:true,installabilityErrors:installability.installabilityErrors,mobileNoOverflow:true,installHandler:true,reportDownload:true,offlineReload:true,externalRequests:outside,pageErrors:errors},limits:'Desktop Edge automation; real Android installation and Home rendering still to test.'};
  await writeFile(resolve(root,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
  await browser?.close();await new Promise(done=>server.close(done));
  if(dirname(resolve(profile))!==profileRoot||!profile.startsWith(resolve(profileRoot,'icon-border-browser-')))throw Error('Unexpected temporary profile path');
  await rm(profile,{recursive:true,force:true});
}
