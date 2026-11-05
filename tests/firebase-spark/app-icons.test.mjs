import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const root=new URL('../../prototypes/firebase-spark-pwa/public/',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
// Hashes from the actual A2 package accepted on the Realme, not regenerated artwork.
const approved={
  'app-icon-any-192-v2.png':'7f793d96cf03b4249d7d33a2d0363cdd9948abd075544908857ada1f6da8cffc',
  'app-icon-any-512-v2.png':'6bf58931631783e139853ec743ae631c95f272a51087ebb35b9681ba3008bc91',
  'app-icon-maskable-192-v2.png':'c42285acf4eb451204d9ccaa35e63d561f90204dae381c7a52769ded5202b95d',
  'app-icon-maskable-512-v2.png':'a74dcc46121f30867d46fa18d4d1127bc50e11b3e2f949c21d861162268d86b5'
};

// Minimal decoder for the RGB/RGBA 8-bit, non-interlaced PNG exports used here.
function decodePNG(bytes){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),type=bytes[25];
  assert.equal(bytes[24],8);assert.ok([2,6].includes(type));assert.equal(bytes[28],0);
  const channels=type===6?4:3,parts=[];
  for(let i=8;i<bytes.length;){const length=bytes.readUInt32BE(i);if(bytes.toString('ascii',i+4,i+8)==='IDAT')parts.push(bytes.subarray(i+8,i+8+length));i+=length+12;}
  const raw=inflateSync(Buffer.concat(parts)),stride=width*channels,pixels=Buffer.alloc(height*stride);
  assert.equal(raw.length,(stride+1)*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];assert.ok(filter<=4);
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;
      pixels[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
    }
  }
  return {width,height,pixel(x,y){const i=(y*width+x)*channels;return [...pixels.subarray(i,i+3),channels===4?pixels[i+3]:255];}};
}

for(const [name,hash] of Object.entries(approved))test(`icona approvata: ${name}`,()=>{
  const bytes=read('icons/'+name);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  const png=decodePNG(bytes),size=Number(name.match(/(192|512)/)[0]);assert.equal(png.width,size);assert.equal(png.height,size);
  if(name.includes('-any-')){
    for(const [x,y] of [[0,0],[size-1,0],[0,size-1],[size-1,size-1]])assert.equal(png.pixel(x,y)[3],0);
    assert.ok(png.pixel(size/2,size/2)[3]>=250);
  }else{
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const [r,g,b,a]=png.pixel(x,y);assert.equal(a,255);
      if(x<size*.08||x>=size*.92||y<size*.08||y>=size*.92)assert.ok(g>r&&g>b,'Periferia verde, senza cornice bianca');
      if(r>205&&g>205&&b>205&&Math.max(r,g,b)-Math.min(r,g,b)<15)assert.ok(Math.hypot((x+.5)/size-.5,(y+.5)/size-.5)<=.4,'Simbolo nella zona sicura');
    }
  }
});

test('manifest, avvio e notifiche usano A2; nessun asset storico viene pubblicato',()=>{
  for(const file of ['manifest.webmanifest','manifest-kitchen.webmanifest']){
    const manifest=JSON.parse(read(file));assert.equal(manifest.icons.length,4);
    for(const icon of manifest.icons){const name=icon.src.split('/').at(-1);assert.ok(approved[name]);assert.equal(icon.purpose,name.includes('maskable')?'maskable':'any');}
  }
  const html=read('index.html').toString(),app=read('app.js').toString(),sw=read('sw.js').toString();
  assert.match(html,/rel="preload" as="image" href="\/icons\/app-icon-any-512-v2\.png"/);
  assert.match(html,/<img src="\/icons\/app-icon-any-512-v2\.png"/);
  assert.match(html,/rel="apple-touch-icon" sizes="192x192" href="\/icons\/app-icon-any-192-v2\.png"/);
  assert.match(app,/icon: '\/icons\/app-icon-any-192-v2\.png'/);
  assert.doesNotMatch(html+app+sw,/icon-preview|icon-study|icon-a-trial|icon-border-trial|splash-512|launcher-/);
  assert.ok(readdirSync(new URL('icons/',root)).every(name=>!/^launcher-|^splash-|^icon-192/.test(name)));
  const hosting=JSON.parse(readFileSync(new URL('../../prototypes/firebase-spark-pwa/firebase.json',import.meta.url))).hosting;
  for(const redirect of hosting.redirects){assert.ok(approved[redirect.destination.split('/').at(-1)]);assert.equal(redirect.type,302);}
});
