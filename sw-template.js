/* Generated as sw.js by build.mjs. Keep the entire app shell in one revision. */
const REVISION=__CACHE_VERSION__;
const FILES=__PRECACHE_FILES__;
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
