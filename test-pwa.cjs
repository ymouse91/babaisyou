const {chromium,devices}=require('./test-support.cjs');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=process.cwd(),{PUBLIC_FILES}=await import(pathToFileURL(path.join(root,'build.mjs'))),e=await import(pathToFileURL(path.join(root,'engine.mjs')));
 const original=new Map(PUBLIC_FILES.map(file=>[file,fs.readFileSync(path.join(root,file))]));let files=original,missing=null;
 const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain'};
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),base=url.pathname.startsWith('/babaisyou/')?'/babaisyou/':'/',name=decodeURIComponent(url.pathname.slice(base.length))||'index.html';if(name===missing){res.writeHead(503).end();return;}const data=files.get(name);if(!data){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(name)]||'text/plain');res.setHeader('Cache-Control','no-store');res.end(data);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  for(const [name,prefix,options]of [['pc-root','/',{viewport:{width:1440,height:1050}}],['ipad-pages','/babaisyou/',devices['iPad (gen 7) landscape']]]){
   files=original;missing=null;const context=await browser.newContext({...options,serviceWorkers:'allow'}),page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
   const url=origin+prefix;
   if(prefix!=='/'){
    files=new Map(original);files.set('other.html',Buffer.from('<!doctype html><title>Other app</title>'));files.set('other-sw.js',Buffer.from("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));"));
    await page.goto(origin+'/other.html');await page.evaluate(async()=>{await navigator.serviceWorker.register('/other-sw.js',{scope:'/'});await navigator.serviceWorker.ready;await caches.open('other-game-cache');});await page.waitForFunction(()=>navigator.serviceWorker.controller);
   }
   await page.goto(url);await page.waitForFunction(()=>document.getElementById('offline-status').textContent==='Valmis offline-peliin');await page.waitForFunction(prefix=>navigator.serviceWorker.controller?.scriptURL.endsWith(prefix+'sw.js'),prefix);
   const manifest=await page.evaluate(async()=>fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json()));assert.equal(new URL(manifest.start_url,url).href,url);assert.equal(manifest.display,'standalone');assert(manifest.icons.some(icon=>icon.sizes==='192x192'));assert(manifest.icons.some(icon=>icon.purpose==='maskable'));assert.equal(await page.locator('link[rel=apple-touch-icon]').getAttribute('sizes'),'180x180');
   assert.equal(await page.locator('#app-version').textContent(),'v1.1.0');
   await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();await page.locator('[name=level][value="1"]').uncheck();await page.locator('[name=level][value="3"]').check();await page.locator('[name=level][value="25"]').check();await page.locator('#finnish-pieces').check();await page.getByRole('button',{name:'Baba aloittaa',exact:true}).click();await page.getByRole('gridcell').nth(20).click();await page.getByRole('gridcell').nth(15).click();
   const saved=await page.evaluate(()=>localStorage.getItem('baba-world1-v2'));assert(saved);
   await context.setOffline(true);await page.reload();assert.equal(await page.evaluate(()=>localStorage.getItem('baba-world1-v2')),saved);assert.equal(await page.locator('.edge.right .property').textContent(),'ONSINÄ');await page.waitForFunction(()=>document.getElementById('offline-status').textContent.includes('Offline-tila'));
   for(const asset of ['assets/icons/icon-512.png','assets/fonts/dm-sans.ttf','ai-worker.mjs','engine.mjs'])assert.equal(await page.evaluate(async asset=>(await fetch(asset)).status,asset),200);
   // Both the modular entry and the standalone entry, including their real AI, work offline.
   for(const entry of ['', 'peli.html']){
    const ai=e.initial(0,[22,25]);ai.controllers=['ai','human'];Object.assign(ai.pieces.find(p=>p.id==='r1'),{x:3,y:0});await page.evaluate(s=>localStorage.setItem('baba-world1-v2',JSON.stringify(s)),ai);await page.goto(url+entry);
    await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('baba-world1-v2'));return s.player===1||s.winner!==null;},null,{timeout:20000});
   }
   // An update is downloaded atomically but activates only after the user chooses it.
   await context.setOffline(false);const human=e.initial(0,[3,25]);await page.evaluate(s=>localStorage.setItem('baba-world1-v2',JSON.stringify(s)),human);await page.goto(url);const beforeUpdate=await page.evaluate(()=>localStorage.getItem('baba-world1-v2'));
   files=new Map([...original].map(([file,data])=>[file,['engine.mjs','peli.html','sw.js'].includes(file)?Buffer.from(data.toString().replaceAll('1.1.0','1.1.1')):data]));
   await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});await page.locator('#update-app').waitFor({state:'visible'});assert.equal(await page.locator('#app-version').textContent(),'v1.1.0');assert.equal(await page.evaluate(()=>localStorage.getItem('baba-world1-v2')),beforeUpdate);
   await page.locator('#update-app').click();await page.waitForFunction(()=>document.getElementById('app-version').textContent==='v1.1.1');assert.equal(await page.evaluate(()=>localStorage.getItem('baba-world1-v2')),beforeUpdate);
   // A broken next release must not damage the working offline revision.
   files=new Map([...files].map(([file,data])=>[file,file==='sw.js'?Buffer.from(data.toString().replaceAll('1.1.1','1.1.2')):data]));missing='assets/fonts/dm-sans.ttf';
   await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();const done=new Promise(resolve=>reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker.addEventListener('statechange',()=>{if(worker.state==='redundant')resolve();});},{once:true}));await reg.update();await done;});
   await context.setOffline(true);await page.reload();assert.equal(await page.locator('#app-version').textContent(),'v1.1.1');assert.equal(await page.evaluate(()=>localStorage.getItem('baba-world1-v2')),beforeUpdate);assert.equal(await page.locator('#update-app').isVisible(),false);
   if(prefix!=='/')assert(await page.evaluate(()=>caches.has('other-game-cache')));
   assert.deepEqual(errors,[]);console.log(name+': manifest/icons, scoped cache, offline reload/state/Finnish/AI, both entries, explicit update and failed-update recovery passed.');await context.close();
  }
  assert(!fs.existsSync(path.join(root,'dist','work')));assert(!fs.readdirSync(path.join(root,'dist')).some(file=>file.endsWith('.pdf')));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})();
