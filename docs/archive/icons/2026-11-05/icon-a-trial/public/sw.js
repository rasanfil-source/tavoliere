const CACHE='tat-icon-a-r2';
const FILES=['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/icons/a-any-192-r2.png','/icons/a-any-512-r2.png','/icons/a-maskable-192-r2.png','/icons/a-maskable-512-r2.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!FILES.includes(url.pathname))return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(response=>response||Response.error())));
});
