/* Generated as sw.js by build.mjs. Keep the entire app shell in one revision. */
const REVISION="1.1.0-36ebf112a4ba";
const FILES=[
 "./",
 "./index.html",
 "./peli.html",
 "./style.css",
 "./app.mjs",
 "./engine.mjs",
 "./ai.mjs",
 "./ai-worker.mjs",
 "./manifest.webmanifest",
 "./assets/icons/icon.svg",
 "./assets/icons/icon-192.png",
 "./assets/icons/icon-512.png",
 "./assets/icons/icon-maskable-512.png",
 "./assets/icons/apple-touch-icon.png",
 "./assets/fonts/dm-sans.ttf",
 "./assets/fonts/space-grotesk.ttf",
 "./assets/fonts/OFL-DMSans.txt",
 "./assets/fonts/OFL-SpaceGrotesk.txt"
];
const SCOPE=new URL(self.registration.scope);
const PREFIX='baba-keke:'+SCOPE.pathname+':';
const CACHE=PREFIX+REVISION;
const URLS=FILES.map(file=>new URL(file,SCOPE).href);
const ALLOWED=new Set(URLS);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));}
  catch(error){await caches.delete(CACHE);throw error;}
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 url.search='';url.hash='';if(!ALLOWED.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),saved=await cache.match(url.href);
  return saved??fetch(event.request);
 })());
});
