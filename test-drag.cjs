const {chromium,devices}=require('./test-support.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
(async()=>{
 const root=process.cwd(),e=await import(pathToFileURL(path.join(root,'engine.mjs'))),browser=await chromium.launch({headless:true});
 for(const [name,opts,standalone]of [['mouse',{viewport:{width:1440,height:1050}},false],['touch',devices['iPad (gen 7) landscape'],true]]){
  const ctx=await browser.newContext(opts);await ctx.route('http://baba.test/**',async route=>{const url=new URL(route.request().url()),file=path.join(root,url.pathname==='/'?(standalone?'peli.html':'index.html'):url.pathname);await route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));await page.goto('http://baba.test/');const cdp=name==='touch'?await ctx.newCDPSession(page):null;
  const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
  function state(fast=false){const s=e.initial(0,fast?[1,2]:[1]);put(s,'baba',1,fast?4:2);put(s,'r1',0,fast?4:2);put(s,'flag',1,0);if(fast)put(s,'fast',0,2);Object.assign(s,{turn:2,left:2,start:null});return s;}
  const load=async s=>{await page.evaluate(v=>localStorage.setItem('baba-world1-v2',JSON.stringify(v)),s);await page.reload();await page.locator('#board').scrollIntoViewIfNeeded();};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('baba-world1-v2')));
  const center=async i=>{const b=await page.getByRole('gridcell').nth(i).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
  async function drag(from,to,cancel=false,pauseAt=null){const a=await center(from),b=to===null?{x:5,y:5}:await center(to);if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});if(pauseAt!==null){const p=await center(pauseAt);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});await page.waitForTimeout(750);}for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/12,y:a.y+(b.y-a.y)*i/12,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}else{await page.mouse.move(a.x,a.y);await page.mouse.down();if(pauseAt!==null){const p=await center(pauseAt);await page.mouse.move(p.x,p.y,{steps:8});await page.waitForTimeout(750);}await page.mouse.move(b.x,b.y,{steps:12});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();}}
  // Ordinary clicks do not pull, even if arrow/keyboard pull mode is checked.
  await load(state());await page.getByRole('gridcell').nth(11).click();await page.getByRole('gridcell').nth(12).click();let s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,2);assert.equal(s.pieces.find(p=>p.id==='r1').x,0);assert.equal(s.left,1);
  // A drag selects its source directly, pulls the rock and consumes exactly one action.
  await load(state());await drag(11,12);s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,2);assert.equal(s.pieces.find(p=>p.id==='r1').x,1);assert.equal(s.left,1);assert.equal(s.player,0);
  // FAST defaults to pulling throughout the full two-square drag.
  await load(state(true));await drag(21,23);s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,3);assert.equal(s.pieces.find(p=>p.id==='r1').x,2);assert.equal(s.left,1);
  // The optional duration stops pulling after the first FAST step.
  await load(state(true));await drag(21,23,false,22);s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,3);assert.equal(s.pieces.find(p=>p.id==='r1').x,1);assert.equal(s.left,1);
  // Off-board, blocked-target, and interrupted drags leave the turn unchanged.
  for(const [target,cancel]of [[null,false],[7,false],[12,true]]){await load(state());await drag(11,target,cancel);s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,1);assert.equal(s.pieces.find(p=>p.id==='r1').x,0);assert.equal(s.left,2);}
  // A drag with nothing behind still moves; it does not require a pullable object.
  const empty=state();put(empty,'r1',0,0);await load(empty);await drag(11,12);s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,2);assert.equal(s.left,1);
  // A fresh click after a drag cancellation is not swallowed.
  await load(state());await drag(11,null);await page.getByRole('gridcell').nth(12).click();s=await saved();assert.equal(s.pieces.find(p=>p.id==='baba').x,2);assert.equal(s.pieces.find(p=>p.id==='r1').x,0);assert.equal(s.left,1);
  assert.deepEqual(errors,[]);console.log(name+': click/no-pull, drag/pull, FAST/full/partial, cancellation, empty pull and click suppression passed.');await ctx.close();
 }
 await browser.close();
})();
