const {chromium,devices}=require('./test-support.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=process.cwd(),e=await import(pathToFileURL(path.join(root,'engine.mjs'))),browser=await chromium.launch({headless:true});
 for(const [name,options,standalone]of [['pc',{viewport:{width:1440,height:1050}},false],['ipad-landscape',devices['iPad (gen 7) landscape'],true]]){
  const context=await browser.newContext(options);await context.route('http://baba.test/**',async route=>{const pathname=new URL(route.request().url()).pathname,file=path.join(root,pathname==='/'?(standalone?'peli.html':'index.html'):pathname);await route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://baba.test/');
  const load=async s=>{await page.evaluate(s=>localStorage.setItem('baba-world1-v2',JSON.stringify(s)),s);await page.reload();};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('baba-world1-v2')));
  const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
  // Cross-world selection is a single shared allowance. Users can always uncheck.
  await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();
  assert.equal(await page.locator('[name=level]').count(),10);assert.equal(await page.locator('#level-options fieldset').count(),2);
  if(name==='ipad-landscape'){const button=await page.getByRole('button',{name:'Baba aloittaa',exact:true}).boundingBox();assert(button.y+button.height<=page.viewportSize().height);}
  await page.locator('[name=level][value="1"]').uncheck();await page.locator('[name=level][value="3"]').check();await page.locator('[name=level][value="25"]').check();
  assert.equal(await page.locator('[name=level]:checked').count(),2);assert.equal(await page.locator('[name=level]:disabled').count(),8);
  await page.locator('[name=level][value="25"]').uncheck();assert.equal(await page.locator('[name=level]:disabled').count(),0);await page.locator('[name=level][value="25"]').check();
  await page.getByRole('button',{name:'Baba aloittaa',exact:true}).click();assert.deepEqual((await saved()).levels,[3,25]);
  assert((await page.locator('#scenario-name').textContent()).includes('WORLD 2 · 5 · SHEEP'));assert((await page.locator('#permanent').textContent()).includes('ROCK IS SHEEP'));assert.equal(await page.getByRole('button',{name:'Aseta IS SHEEP',exact:true}).count(),2);
  // Every new property gets English/Finnish artwork and a usable level option.
  for(const [level,word,fi]of [[22,'THIRSTY','JANOINEN'],[23,'STRONG','VAHVA'],[24,'SCARED','PELOKAS'],[25,'SHEEP','LAMMAS']]){
   await load(e.initial(0,[level]));assert(await page.getByRole('button',{name:'Aseta IS '+word,exact:true}).first().isVisible());
   await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();await page.locator('#finnish-pieces').check();await page.getByRole('button',{name:'Sulje',exact:true}).click();
   assert(await page.getByRole('button',{name:'Aseta ON '+fi,exact:true}).first().isVisible());
   assert.equal(await page.locator('.piece.'+word.toLowerCase()+' .property-win').first().textContent(),fi);
   await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();await page.locator('#finnish-pieces').uncheck();await page.getByRole('button',{name:'Sulje',exact:true}).click();
  }
  await load(e.initial(0,[21]));assert.equal(await page.getByRole('button',{name:'Aseta IS WIN',exact:true}).count(),4);
  await load(e.initial(0,[5,25]));await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();await page.locator('#finnish-pieces').check();await page.getByRole('button',{name:'Sulje',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Aseta NELIÖ',exact:true}).count(),1);
  await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();await page.locator('#finnish-pieces').uncheck();await page.getByRole('button',{name:'Sulje',exact:true}).click();
  // The actor chooses a real end-of-turn river route. Cancel spends no action.
  let game=e.initial(0,[22]);put(game,'r1',3,0);await load(game);const before=JSON.stringify(await saved());
  await page.getByRole('gridcell').nth(20).click();await page.getByRole('gridcell').nth(15).click();assert(await page.locator('#thirstyDialog').isVisible());assert.equal(JSON.stringify(await saved()),before);
  assert.equal(await page.locator('#thirsty-options button').count(),2);await page.getByRole('button',{name:'Peruuta toiminto',exact:true}).click();assert.equal(JSON.stringify(await saved()),before);
  await page.getByRole('gridcell').nth(15).click();await page.locator('#thirsty-options [data-dir="2"]').click();
  let current=await saved();assert.deepEqual([current.pieces.find(p=>p.id==='r1').x,current.pieces.find(p=>p.id==='r1').y],[3,3]);assert.equal(current.player,1);assert.equal(current.turn,1);assert.equal(current.left,2);assert.equal(await page.locator('#thirstyDialog').isVisible(),false);
  // Three-square FAST movement carries the herd exactly three squares.
  game=e.initial(0,[2,25]);for(const [id,x,y]of [['t0',2,4],['fast',3,4],['r1',0,2],['r2',1,2],['flag',0,0]])put(game,id,x,y);Object.assign(game,{turn:2,left:2});await load(game);
  await page.getByRole('gridcell').nth(10).click();assert(await page.getByRole('gridcell').nth(13).evaluate(el=>el.classList.contains('target')));await page.getByRole('gridcell').nth(13).click();current=await saved();assert.equal(current.pieces.find(p=>p.id==='r1').x,3);assert.equal(current.pieces.find(p=>p.id==='r2').x,4);assert.equal(current.left,1);
  // The same world-two state is playable by the real background AI worker.
  game=e.initial(0,[22,25]);put(game,'r1',3,0);game.controllers=['ai','human'];await load(game);
  await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('baba-world1-v2'));return s.player===1||s.winner!==null;},null,{timeout:20000});assert.equal(await page.locator('#thirstyDialog').isVisible(),false);assert(!(await page.locator('#ai-info').textContent()).includes('ei voitu'));
  const old=e.initial(0,[1,2]);old.levels=[1,2,3];await load(old);const backup=await page.evaluate(()=>JSON.parse(localStorage.getItem('baba-before-two-level-limit')));assert.deepEqual(backup.levels,[1,2,3]);await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();assert.equal(await page.locator('[name=level]:checked').count(),2);await page.getByRole('button',{name:'Sulje',exact:true}).click();
  await load(e.initial(0,[3,25]));await page.getByRole('button',{name:'Valitse tasot',exact:true}).click();await page.screenshot({path:path.join(root,'work',name+'-world2-levels.png'),fullPage:true});await page.getByRole('button',{name:'Sulje',exact:true}).click();await page.screenshot({path:path.join(root,'work',name+'-world2-board.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log(name+': World 2, cross-world max-two selection, translations, THIRSTY choice/cancel, FAST herd and AI passed.');await context.close();
 }
 await browser.close();
})();
