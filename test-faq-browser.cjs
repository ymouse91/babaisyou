const {chromium}=require('./test-support.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=process.cwd(),e=await import(pathToFileURL(path.join(root,'engine.mjs'))),browser=await chromium.launch({headless:true});
 for(const standalone of [false,true]){
  const context=await browser.newContext({viewport:{width:1440,height:1050}});await context.route('http://baba.faq.test/**',async route=>{const pathname=new URL(route.request().url()).pathname,file=path.join(root,pathname==='/'?(standalone?'peli.html':'index.html'):pathname);await route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});});
  const page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));await page.goto('http://baba.faq.test/');
  const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
  const load=async s=>{await page.evaluate(s=>localStorage.setItem('baba-world1-v2',JSON.stringify(s)),s);await page.reload();};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('baba-world1-v2')));
  let s=e.initial(0,[1,2]);Object.assign(s,{turn:2,left:2});for(const [id,x,y]of [['t0',2,4],['t1',3,0],['fast',4,0],['r1',2,3],['flag',4,1]])put(s,id,x,y);await load(s);
  const origin=await page.getByRole('gridcell').nth(17).boundingBox(),first=await page.getByRole('gridcell').nth(12).boundingBox();
  await page.mouse.move(origin.x+origin.width/2,origin.y+origin.height/2);await page.mouse.down();await page.mouse.move(first.x+first.width/2,first.y+first.height/2,{steps:8});
  assert(await page.getByRole('gridcell').nth(12).evaluate(el=>el.classList.contains('target')));assert.equal(await page.getByRole('gridcell').nth(7).evaluate(el=>el.classList.contains('target')),false);
  await page.mouse.up();let n=await saved();assert.deepEqual([n.pieces.find(p=>p.id==='r1').x,n.pieces.find(p=>p.id==='r1').y],[2,2]);assert.equal(n.left,1);
  s=e.initial(1,[4]);Object.assign(s,{turn:2,left:2});put(s,'keke',3,0);await load(s);await page.getByRole('button',{name:'Aseta IS CURIOUS',exact:true}).click();await page.getByRole('gridcell').nth(2).click();n=await saved();assert.deepEqual([n.pieces.find(p=>p.id==='keke').x,n.pieces.find(p=>p.id==='keke').y],[2,0]);
  s=e.initial(1,[4,25]);Object.assign(s,{turn:2,left:2});for(const [id,x,y]of [['baba',1,2],['keke',4,0],['r1',2,2],['r2',1,3],['flag',3,3],['curious',0,2],['sheep2',2,0]])put(s,id,x,y);await load(s);
  const before=JSON.stringify(await saved());let confirmed=0;
  page.once('dialog',async dialog=>{assert(dialog.message().includes('silmukan'));confirmed++;await dialog.dismiss();});
  await page.getByRole('gridcell').nth(4).click();await page.getByRole('gridcell').nth(9).click();assert.equal(JSON.stringify(await saved()),before);
  page.once('dialog',async dialog=>{confirmed++;await dialog.accept();});await page.getByRole('gridcell').nth(9).click();n=await saved();assert.equal(n.winner,0);assert.equal(confirmed,2);assert((await page.locator('#status').textContent()).includes('Baba voittaa'));
  assert.deepEqual(errors,[]);console.log((standalone?'peli.html':'index.html')+': FAST drag, accepted CURIOUS timing, loop confirmation/cancel/loss and no script errors passed.');await context.close();
 }
 await browser.close();
})();
