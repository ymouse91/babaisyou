import {APP_VERSION,legal,initial,rules,actions,act,challenge,concede,dirs,isRiver,has,restore,LEVELS,MAX_LEVELS,levelWorld,levelNumber} from './engine.mjs';
const $=id=>document.getElementById(id),names={baba:'BABA',keke:'KEKE',rock:'ROCK',flag:'FLAG',win:'IS WIN',fast:'IS FAST',hot:'IS HOT',melt:'IS MELT',curious:'IS CURIOUS',square:'SQUARE',river:'RIVER',thirsty:'IS THIRSTY',strong:'IS STRONG',scared:'IS SCARED',sheep:'IS SHEEP'};
$('app-version').textContent='v'+APP_VERSION;
const FINNISH_WORDS={baba:'BABA',keke:'KEKE',rock:'KIVI',flag:'LIPPU',river:'JOKI',square:'NELIÖ',win:'VOITTO',fast:'NOPEA',hot:'KUUMA',melt:'SULAVA',curious:'UTELIAS',thirsty:'JANOINEN',strong:'VAHVA',scared:'PELOKAS',sheep:'LAMMAS',you:'SINÄ',is:'ON',default:'PERUS',world:'MAAILMA',level:'TASO',levels:'TASOT'};
const FINNISH_LEVELS={1:'LISÄÄ KIVIÄ JA LIPPUJA',2:'NOPEA',3:'KUUMA / SULAVA',4:'UTELIAS',5:'NELIÖ',21:'ENEMMÄN VOITTOJA',22:'JANOINEN',23:'VAHVA',24:'PELOKAS',25:'LAMMAS'};
let finnish=false;try{finnish=localStorage.getItem('baba-language')==='fi';}catch{}
const term=key=>finnish?(FINNISH_WORDS[key]??key.toUpperCase()):key.toUpperCase();
const ruleText=(noun,prop,owner=true)=>`${term(noun)} ${term('is')} ${term(prop.startsWith('you')?'you':prop)}${owner&&prop.startsWith('you')?` (${prop==='you0'?'Baba':'Keke'})`:''}`;
const translateInline=value=>finnish?value.replace(/\b(baba|keke|rock|flag|river|square|win|fast|hot|melt|curious|thirsty|strong|scared|sheep|you|is|default|world|levels?)\b/gi,key=>term(key.toLowerCase())):value;
const levelTitle=id=>`${term('world')} ${levelWorld(id)} · ${levelNumber(id)} · ${finnish?FINNISH_LEVELS[id]:LEVELS[id]}`;
let languageHelpOriginals=null;
let s;try{
 const saved=localStorage.getItem('baba-world1-v2')??localStorage.getItem('baba-level1-v1'),previous=JSON.parse(saved);
 s=restore(previous);
 if(previous?.levels?.length>MAX_LEVELS)localStorage.setItem('baba-before-two-level-limit',saved);
}catch{s=initial();}
let selected=null,available=[],gesture=null,suppressBoardClickUntil=0,routeAlternatives=[];
let aiWorker=null,aiWorkerURL=null,aiTimer=null,aiDeadlineTimer=null,aiBusy=false,aiPaused=false,aiFault=null,aiJob=0;
const isAITurn=()=>s.winner===null&&s.controllers?.[s.player]==='ai';
function wantedPullSteps(a,pulling){
 if(!pulling)return 0;
 const p=s.pieces.find(p=>p.id===a.id),[dx,dy]=dirs[a.dir];
 if(!p||!s.pieces.some(q=>q.x===p.x-dx&&q.y===p.y-dy))return 0;
 return Math.min(gesture?.pullUntil??a.steps,a.steps);
}
const pullMatches=(a,pulling=false)=>a.kind==='move'&&a.id===selected&&a.pullSteps===wantedPullSteps(a,pulling);
const label=p=>p.type==='text'?(names[p.word]??p.word):names[p.type];
const text=t=>{const p=document.createElement('span');p.textContent=t;return p;};
function piece(p){const el=document.createElement('span');el.className='piece '+(p.type==='text'?'text '+p.word:'object '+p.type);el.setAttribute('aria-label',names[p.word??p.type]);if(p.type==='text'){if(p.word==='rock'||p.word==='flag'){el.append(nounArt(p.word));}else if(p.word==='square'){el.append(nounArt(p.word));}else {el.append(winArt(p.word));}}else if(p.type==='baba'||p.type==='keke'){const i=document.createElement('i');i.className='avatar '+p.type;const extra=document.createElement('span');extra.className='extra-part';i.append(extra);if(p.type==='baba'){for(let leg=0;leg<4;leg++){const foot=document.createElement('span');foot.className='baba-foot foot-'+leg;i.append(foot);}}el.append(i);}else el.textContent=p.type==='rock'?'🪨':'⚑';return el;}
function message(t){$('message').textContent=t;}
const sameMove=(a,b)=>['kind','id','x','y','dir','steps','pullSteps','pull'].every(key=>a[key]===b[key]);
function perform(a){
 routeAlternatives=available.filter(b=>sameMove(a,b));
 if(routeAlternatives.length>1&&routeAlternatives.some(b=>b.thirstyChoices?.length)){chooseThirstyRoute();return;}
 finishMove(a);
}
function finishMove(a){try{const preview=legal(s,a);if(preview&&preview.winner===1-s.player&&String(preview.log[preview.log.length-1]).includes('silmukka')&&!confirm('Tämä siirto aiheuttaa äärettömän reaktiosilmukan, ja viimeksi toiminut häviää pelin. Jatketaanko?'))return;s=act(s,a);selected=null;save();render();}catch(e){message(e.message);}}
function chooseThirstyRoute(){
 const ids=[...new Set(routeAlternatives.flatMap(a=>(a.thirstyChoices??[]).map(c=>c.id)))];
 const id=ids.find(id=>new Set(routeAlternatives.map(a=>a.thirstyChoices?.find(c=>c.id===id)?.dir)).size>1);
 if(!id){const a=routeAlternatives[0];routeAlternatives=[];$('thirstyDialog').close();finishMove(a);return;}
 const routes=[...new Map(routeAlternatives.flatMap(a=>(a.thirstyChoices??[]).filter(c=>c.id===id).map(c=>[c.dir,c]))).values()],p=s.pieces.find(p=>p.id===id);
 const from=routes[0].from;
 $('thirsty-description').textContent=`${s.player===0?'Baba':'Keke'} valitsee: ${label(p)} ruudussa (rivi ${from[1]+1}, sarake ${from[0]+1}) liikkuu vuoron lopussa joelle. Valitse reitti.`;
 $('thirsty-options').replaceChildren();
 for(const route of routes){const b=document.createElement('button');b.dataset.dir=route.dir;b.textContent=['↑ Ylös','→ Oikealle','↓ Alas','← Vasemmalle'][route.dir]+` · rivi ${route.to[1]+1}, sarake ${route.to[0]+1}`;b.onclick=()=>{routeAlternatives=routeAlternatives.filter(a=>a.thirstyChoices?.some(c=>c.id===id&&c.dir===route.dir));chooseThirstyRoute();};$('thirsty-options').append(b);}
 if(!$('thirstyDialog').open)$('thirstyDialog').showModal();
}
function save(){try{localStorage.setItem('baba-world1-v2',JSON.stringify(s));}catch{}}
function render(){
 available=s.winner===null?actions(s):[];const r=rules(s),sel=s.pieces.find(p=>p.id===selected);
 $('scenario-name').textContent=term('default')+(s.levels.length?' + '+s.levels.map(levelTitle).join(' + '):'');
 $('river-note').textContent=r.river.has('hot')?'Pysyvä '+ruleText('river','hot',false):'Joki · ei ominaisuutta';
 $('river-path').classList.toggle('hot-river',r.river.has('hot'));
 $('permanent').textContent=[...(s.levels.includes(3)?[ruleText('river','hot',false)]:[]),...(s.levels.includes(4)?[ruleText('flag','curious',false)]:[]),...[[22,'thirsty'],[24,'scared'],[25,'sheep']].filter(([id])=>s.levels.includes(id)).map(([,prop])=>ruleText('rock',prop,false))].map(x=>'▣ '+x).join(' · ');
 $('reaction-settings').hidden=!s.levels.some(id=>[4,22,24].includes(id));
 renderOrder();
 $('turnLabel').textContent=s.challenge?`HAASTE · ${s.challenge.remaining} TOIMINTOA JÄLJELLÄ`:`VUORO ${s.turn+1} · ${s.player===0?'BABA':'KEKE'}`;
 $('status').textContent=s.winner!==null?`${s.winner===0?'Baba':'Keke'} voittaa!`:s.left===1?'Yksi toiminto jäljellä':'Kaksi toimintoa jäljellä';
 $('dots').replaceChildren();for(let i=0;i<(s.turn===0&&!s.challenge?1:2);i++){let el=document.createElement('i');el.className=i<s.left?'':'used';$('dots').append(el);}
 for(let pl=0;pl<2;pl++){$('p'+pl).className=s.player===pl?'active':'';$('p'+pl).querySelector('small').textContent=s.controllers?.[pl]==='ai'?'AI':'Pelaaja '+(pl+1);$('b'+pl).textContent=s.winner===pl?'VOITTO':s.winner===null&&s.player===pl?'VUORO':'';}
 $('rules').replaceChildren();for(const [noun,props]of Object.entries(r))for(const prop of props){const card=text(ruleText(noun,prop));const players=prop.startsWith('you')?[Number(prop.slice(3))]:[0,1].filter(player=>r[noun].has('you'+player));const owner=players.length===2?'both':players[0]===0?'baba':players[0]===1?'keke':'none';card.className='rule owner-'+owner+(prop==='win'?' rule-win':'');card.dataset.noun=noun;card.dataset.property=prop;card.dataset.owner=owner;card.title=({baba:'Baban hallitsemiin esineisiin liittyvä sääntö',keke:'Keken hallitsemiin esineisiin liittyvä sääntö',both:'Molempien pelaajien hallitsemiin esineisiin liittyvä sääntö',none:'Yleinen sääntö: esine ei ole kummankaan pelaajan hallinnassa'})[owner];$('rules').append(card);}
 $('board').replaceChildren();
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){
  const ps=s.pieces.filter(p=>p.x===x&&p.y===y),btn=document.createElement('button');btn.className='cell'+(ps.length>1?' stack':'');btn.dataset.x=x;btn.dataset.y=y;if(!isAITurn()&&ps.some(p=>has(s,p,'you'+s.player,r)))btn.classList.add('can-move');btn.disabled=isAITurn();btn.setAttribute('role','gridcell');btn.setAttribute('aria-label',`Rivi ${y+1}, sarake ${x+1}: ${ps.map(p=>names[p.word??p.type]).join(', ')||'tyhjä'}${isRiver(x,y)?', joki':''}`);
  let possible=available.find(a=>a.id===selected&&(a.kind==='place'?a.x===x&&a.y===y:sel&&pullMatches(a,!!gesture?.active)&&sel.x+dirs[a.dir][0]*a.steps===x&&sel.y+dirs[a.dir][1]*a.steps===y));
  if(possible){btn.classList.add('target');if(possible.kind==='move'&&possible.steps>1){const distance=text(String(possible.steps));distance.className='move-distance';btn.append(distance);btn.setAttribute('aria-label',btn.getAttribute('aria-label')+', '+possible.steps+' askeleen liike');}}if(ps.some(p=>p.id===selected))btn.classList.add('selected');for(const p of ps)btn.append(piece(p));
  if(ps.some(p=>has(s,p,'win',r))){let b=text(term('win'));b.className='badge';btn.append(b);}
  btn.onclick=()=>{if(s.winner!==null||gesture?.active||isAITurn())return;if(possible){perform(possible);return;}const own=ps.filter(p=>has(s,p,'you'+s.player,r));if(own.length){const idx=own.findIndex(p=>p.id===selected);selected=own[(idx+1)%own.length].id;render();message(has(s,own[(idx+1)%own.length],'fast',r)?`${label(own[(idx+1)%own.length])} ${term('is')} ${term('fast')}: valitse mikä tahansa korostettu kohderuutu. Kauemmas liikkuminen kuluttaa yhden toiminnon.`:`${label(own[(idx+1)%own.length])} valittu. Napsauta kohdetta ilman vetoa tai raahaa hahmoa vetääksesi mukana.`);}else message('Valitse oma hahmo tai laatta varastosta. Korostetut ruudut ovat sallittuja kohteita.');};$('board').append(btn);
 }
 $('supply').replaceChildren();for(const p of s.pieces.filter(p=>p.x===null)){const b=document.createElement('button');b.append(piece(p));b.setAttribute('aria-label','Aseta '+names[p.word??p.type]);b.className=selected===p.id?'selected':'';b.disabled=s.winner!==null||isAITurn();b.onclick=()=>{selected=p.id;render();message('Valitse korostettu tyhjä ruutu oman hahmon vierestä.');};$('supply').append(b);}
 $('log').replaceChildren();for(const item of [...s.log].reverse()){const li=document.createElement('li');li.textContent=translateInline(item.replace(/t[01]/g,'ROCK').replace(/t[23]/g,'FLAG').replace(/t[45]/g,'IS WIN').replace(/r[12]/g,'ROCK'));$('log').append(li);}
 $('challenge').disabled=isAITurn()||s.winner!==null||!!s.challenge||s.left!==(s.turn===0?1:2);$('concede').hidden=!(s.winner===null&&!isAITurn()&&!s.challenge&&!available.length);
 if(s.winner!==null)message('Peli päättyi. Voitte aloittaa uuden pelin; edellisen pelin häviäjä valitsee aloittajan.');else if(!available.length){if(s.challenge){s.winner=s.challenge.by;save();render();}else message('Et voi tehdä vaadittuja toimintoja, joten häviät, ellet haasta vastustajaa. Haasta tai myönnä tappio.');}else if(!selected)message('Napsauta hahmoa ja kohderuutua siirtyäksesi. Raahaaminen vetää mukana. Laatat asetetaan varastosta.');
 renderAIStatus();queueAI();
}
$('help').onclick=()=>{cancelAI();$('helpDialog').showModal();render();};$('reset').onclick=()=>{cancelAI();for(let pl=0;pl<2;pl++)$('controller-'+pl).value=s.controllers?.[pl]??'human';for(const box of document.querySelectorAll('[name=level]'))box.checked=s.levels.includes(Number(box.value));updateLevelLimit();$('resetDialog').showModal();render();};for(let pl=0;pl<2;pl++)$('start'+pl).onclick=()=>{cancelAI();aiPaused=false;aiFault=null;const controllers=[0,1].map(i=>$('controller-'+i).value);s=initial(pl,[...document.querySelectorAll('[name=level]:checked')].map(x=>Number(x.value)));s.controllers=controllers;selected=null;save();$('resetDialog').close();render();};
$('choose-levels').onclick=()=>$('reset').click();
$('cancel-thirsty').onclick=()=>{$('thirstyDialog').close();routeAlternatives=[];message('Toiminto peruttu.');};
$('thirstyDialog').addEventListener('cancel',()=>{routeAlternatives=[];message('Toiminto peruttu.');});
$('challenge').onclick=()=>{try{s=challenge(s);selected=null;save();render();}catch(e){message(e.message);}};
$('concede').onclick=()=>{try{s=concede(s);selected=null;save();render();}catch(e){message(e.message);}};
setupLevels();setupLanguage();setupPlayers();setupDrag();render();setupOffline();


function alignRiver(){
 const board=$('board'),cells=[...board.children],b=board.getBoundingClientRect();if(cells.length!==25||!b.width)return;
 const point=(col,row)=>{const q=cells[row*5+col].getBoundingClientRect();return [(q.left+q.width/2-b.left)*500/b.width,(q.top+q.height/2-b.top)*500/b.height];};
 const [x0,y0]=point(0,0),[x1,y1]=point(1,1),[x2,y2]=point(2,2),[x3,y3]=point(3,3),[x4,y4]=point(4,4);
 $('river-path').setAttribute('d',`M ${x0} -45 C ${x0+30} -10 ${x0-25} ${y0+15} ${x0} ${y1-28} Q ${x0-12} ${y1} ${x1-22} ${y1} C ${x1+12} ${y1+14} ${x2+28} ${y1-24} ${x2} ${y1+35} C ${x2-16} ${y2-5} ${x2+12} ${y2+24} ${x2} ${y3-30} Q ${x2-10} ${y3+5} ${x3-28} ${y3} C ${x3+5} ${y3+18} ${x4-10} ${y3-26} ${x4} ${y3+12} C ${x4+32} ${y4-15} ${x4-26} ${y4+12} ${x4} 545`);
}
new ResizeObserver(alignRiver).observe($('board'));alignRiver();

// Circle noun tiles: split lettering and two solid direction triangles.
function nounArt(word){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('class','noun-art');svg.setAttribute('aria-hidden','true');
 const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','50');circle.setAttribute('cy','50');circle.setAttribute('r','49');circle.setAttribute('fill',word==='rock'?'#a47a4c':word==='square'?'#e95d68':'#d6d979');svg.append(circle);
 const lines=finnish?({rock:['KI','VI'],flag:['LIP','PU'],square:['NE','LIÖ']})[word]:(word==='rock'?['RO','CK']:word==='square'?['SQU','ARE']:['FL','AG']);
 for(let i=0;i<2;i++){const label=document.createElementNS(ns,'text');label.setAttribute('x','47');label.setAttribute('y',String(43+i*27));label.setAttribute('text-anchor','middle');label.setAttribute('class','noun-lettering'+(lines.some(line=>line.length>2)?' square-lettering':''));label.textContent=lines[i];svg.append(label);}
 for(const [direction,points]of [['right','80,43 88,49 80,55'],['down','44,81 56,81 50,89']]){const triangle=document.createElementNS(ns,'polygon');triangle.setAttribute('points',points);triangle.setAttribute('class','noun-triangle '+direction);triangle.setAttribute('fill','#18252a');svg.append(triangle);}
 return svg;
}

function winArt(word='win'){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('class','property-art');svg.setAttribute('aria-hidden','true');
 const rect=document.createElementNS(ns,'rect');for(const [key,value]of Object.entries({x:1,y:1,width:98,height:98,rx:5,fill:({win:'#c82c8b',fast:'#e7bd3e',hot:'#ed492e',melt:'#80c4d2',curious:'#f1cf45',thirsty:'#80c4d2',strong:'#b9bd74',scared:'#d4a5c6',sheep:'#e4ddc4'})[word]}))rect.setAttribute(key,value);svg.append(rect);
 for(const [caption,y,cls]of [[term('is'),35,'property-is'],[term(word),73,'property-win '+(term(word).length>4?'long-property':'')]]){const label=document.createElementNS(ns,'text');label.setAttribute('x','50');label.setAttribute('y',String(y));label.setAttribute('text-anchor','middle');label.setAttribute('class',cls);label.textContent=caption;svg.append(label);}return svg;
}

function setupLevels(){
 $('level-options').replaceChildren();
 for(const world of [1,2]){const group=document.createElement('fieldset'),legend=document.createElement('legend');group.dataset.world=world;legend.textContent=term('world')+' '+world;group.append(legend);
  for(const [value,name]of Object.entries(LEVELS).filter(([id])=>levelWorld(Number(id))===world)){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.name='level';box.value=value;box.checked=s.levels.includes(Number(value));box.onchange=updateLevelLimit;const caption=document.createElement('span');caption.className='level-name';caption.textContent=levelNumber(Number(value))+' · '+name;label.append(box,caption);group.append(label);}
  $('level-options').append(group);
 }
 updateLevelLimit();
 const info={2:'FAST: napsauta mitä tahansa korostettua kohderuutua samalla rivillä tai sarakkeella. Raahaus vetää mukana; napsautus ei. Rajaa FAST-veto pysähtymällä hetkeksi väliruutuun ennen jatkamista. Jokainen väliruutu käsitellään.',3:'HOT/MELT: HOT tuhoaa samassa ruudussa olevan MELT-esineen. Tuhoutunut esine palautuu varastoon. Joki on aina HOT tällä tasolla.',4:'CURIOUS: uudelle riville tai sarakkeeseen tuleva esine vetää uteliasta yhden ruudun puoleensa. Ristiriitaiset suunnat kumoavat liikkeen. Lippu on aina CURIOUS.',5:'SQUARE: vain juuri nyt säännössä olevat ominaisuuslaatat lasketaan SQUARE-esineiksi. SQUARE IS YOU antaa niiden hallinnan.'};
 Object.assign(info,{21:'WORLD 2 · WIN HARDER: lisää kaksi IS WIN -laattaa. DEFAULTin kanssa niitä on neljä.',22:'WORLD 2 · THIRSTY: ROCK IS THIRSTY on pysyvä sääntö. Vuoron päättyessä kaikki joen ulkopuoliset THIRSTY-esineet liikkuvat suoraan kohti jokea ja työntävät sääntöjen mukaan. Vuoron tehnyt pelaaja valitsee vaihtoehtoisista reiteistä. Joessa olevat eivät liiku janon vuoksi.',23:'WORLD 2 · STRONG: vahva työntää myös ketjuja ja voi työntää paloja reunan yli. Ne palautuvat varastoon. STRONG-vetäjä voi vetää myös SCARED-paloja.',24:'WORLD 2 · SCARED: ROCK IS SCARED on pysyvä sääntö. Viereen tuleva pala saa pelokkaan pakenemaan poispäin niin pitkälle kuin mahdollista, työntäen jos sallittua. Useat pakosuunnat jähmettävät sen. SCARED-palaa voi vetää vain STRONG-vetäjä.',25:'WORLD 2 · SHEEP: lisää kaksi IS SHEEP -laattaa ja pysyvän ROCK IS SHEEP -säännön. Lampaan liike mistä tahansa syystä saa muut lampaat pyrkimään samanaikaisesti samaan suuntaan yhtä monta ruutua. Lampaat työntävät, jos mahdollista. Yksi yhteisliike ei laukaise itseään uudelleen.'});
 const list=$('level-help');for(const [id,description]of Object.entries(info)){const p=document.createElement('p');p.textContent=description;list.append(p);}
}
function updateLevelLimit(){
 const boxes=[...document.querySelectorAll('[name=level]')],count=boxes.filter(box=>box.checked).length;
 for(const box of boxes)box.disabled=!box.checked&&count>=MAX_LEVELS;
 $('level-count').textContent=`${count} / ${MAX_LEVELS} tasoa valittu · DEFAULT on aina mukana`;
}
function renderOrder(){
 const list=$('effect-order');list.replaceChildren();const ids=[...(s.effectOrder??[]),...s.pieces.map(p=>p.id)].filter((id,i,a)=>a.indexOf(id)===i);
 for(let i=0;i<ids.length;i++){const p=s.pieces.find(p=>p.id===ids[i]);if(!p)continue;const row=document.createElement('li'),name=document.createElement('span'),up=document.createElement('button'),down=document.createElement('button');name.textContent=label(p)+' ('+p.id+')';up.textContent='↑';down.textContent='↓';up.setAttribute('aria-label',label(p)+' aikaisemmin');down.setAttribute('aria-label',label(p)+' myöhemmin');up.disabled=isAITurn()||i===0;down.disabled=isAITurn()||i===ids.length-1;const move=delta=>{const order=[...ids];[order[i],order[i+delta]]=[order[i+delta],order[i]];s.effectOrder=order;save();render();};up.onclick=()=>move(-1);down.onclick=()=>move(1);row.append(name,up,down);list.append(row);}
}

// Pointer capture belongs to the stable board, since rendering replaces the cells.
function setupDrag(){
 const board=$('board');
 const cellAt=(x,y)=>{const cell=document.elementFromPoint(x,y)?.closest('.cell');return cell&&board.contains(cell)?cell:null;};
 const actionAt=(x,y)=>{const cell=cellAt(x,y),p=s.pieces.find(p=>p.id===selected);if(!cell||!p)return null;return available.find(a=>pullMatches(a,true)&&p.x+dirs[a.dir][0]*a.steps===Number(cell.dataset.x)&&p.y+dirs[a.dir][1]*a.steps===Number(cell.dataset.y))??null;};
 const clearHover=()=>board.querySelectorAll('.drag-over').forEach(cell=>cell.classList.remove('drag-over'));
 function finish(event,cancel=false){
  if(!gesture||event.pointerId!==gesture.pointerId)return;
  clearTimeout(gesture.pauseTimer);const current=gesture,action=current.active&&!cancel&&s===current.state?actionAt(event.clientX,event.clientY):null;
  gesture=null;board.classList.remove('dragging');clearHover();
  if(board.hasPointerCapture(current.pointerId))board.releasePointerCapture(current.pointerId);
  if(!current.active)return;
  suppressBoardClickUntil=performance.now()+600;
  if(action)perform(action);else{render();message(cancel?'Vetosiirto peruttu. Toimintoa ei kulunut.':'Vetosiirto ei ole sallittu tähän ruutuun. Toimintoa ei kulunut.');}
 }
 board.addEventListener('pointerdown',event=>{
  suppressBoardClickUntil=0;
  if(gesture||!event.isPrimary||event.button!==0||s.winner!==null||isAITurn())return;
  const cell=event.target.closest('.cell');if(!cell)return;
  const r=rules(s),own=s.pieces.filter(p=>p.x===Number(cell.dataset.x)&&p.y===Number(cell.dataset.y)&&has(s,p,'you'+s.player,r));
  if(!own.length)return;
  const id=own.find(p=>p.id===selected)?.id??own[0].id;
  gesture={pointerId:event.pointerId,id,x:event.clientX,y:event.clientY,state:s,active:false};
 });
 board.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.pointerId)return;
  if(!gesture.active){
   if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<8)return;
   board.setPointerCapture(event.pointerId);gesture.active=true;selected=gesture.id;render();board.classList.add('dragging');
  }
  event.preventDefault();clearHover();const action=actionAt(event.clientX,event.clientY);
  if(action){
   cellAt(event.clientX,event.clientY)?.classList.add('drag-over');message(`Vapauta tähän: ${action.steps} askelta${action.pullSteps?', veto '+action.pullSteps+' askelta':', ei vedettävää takana'}.`);
   const key=action.dir+':'+action.steps;
   if(gesture.hoverKey!==key){clearTimeout(gesture.pauseTimer);gesture.hoverKey=key;
    const p=s.pieces.find(p=>p.id===selected);
    if(action.pullSteps&&gesture.pullUntil===undefined&&has(s,p,'fast')){
     gesture.pauseTimer=setTimeout(()=>{if(!gesture?.active||gesture.hoverKey!==key)return;gesture.pullUntil=action.steps;render();message(`Veto lukittu ${action.steps} askeleeseen. Jatka samaan suuntaan tai vapauta.`);},650);
    }
   }
  }else{clearTimeout(gesture.pauseTimer);gesture.hoverKey=null;message('Raahaa korostettuun ruutuun ja vapauta. Laudan ulkopuolelle vapauttaminen peruu siirron.');}
 });
 board.addEventListener('pointerup',event=>finish(event));
 board.addEventListener('pointercancel',event=>finish(event,true));
 board.addEventListener('lostpointercapture',event=>{if(gesture?.active)finish(event,true);});
 board.addEventListener('click',event=>{if(performance.now()<suppressBoardClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&gesture){finish({pointerId:gesture.pointerId},true);event.preventDefault();}});
}

function setupLanguage(){
 languageHelpOriginals=[...document.querySelectorAll('#helpDialog li,#helpDialog>p,#level-help p')].map(node=>[node,node.textContent]);
 $('finnish-pieces').onchange=()=>{finnish=$('finnish-pieces').checked;try{localStorage.setItem('baba-language',finnish?'fi':'en');}catch{}localize();render();};
 localize();
}
function localize(){
 document.documentElement.dataset.pieceLanguage=finnish?'fi':'en';$('finnish-pieces').checked=finnish;
 for(const key of Object.keys(names))names[key]=['win','fast','hot','melt','curious','thirsty','strong','scared','sheep'].includes(key)?term('is')+' '+term(key):term(key);
 for(const property of document.querySelectorAll('.edge .fixed.property')){
  property.replaceChildren(document.createTextNode(term('is')),document.createElement('br'),document.createTextNode(term('you')));
  const edge=property.closest('.edge'),owner=edge.classList.contains('top')||edge.classList.contains('right')?'Keken':'Baban';
  property.setAttribute('aria-label',term('is')+' '+term('you')+', '+owner+' pelaaja');
 }
 for(const label of document.querySelectorAll('#level-options label')){const level=Number(label.querySelector('input').value);label.querySelector('.level-name').textContent=levelNumber(level)+' · '+(finnish?FINNISH_LEVELS[level]:LEVELS[level]);}
 for(const group of document.querySelectorAll('#level-options fieldset'))group.querySelector('legend').textContent=term('world')+' '+group.dataset.world;
 const world=finnish?'MAAILMAT 1–2 · 10 TASOA':'WORLDS 1–2 · 10 LEVELS';document.querySelector('.edition span').textContent=world;document.querySelector('.intro>.eyebrow').textContent=world;
 for(const [node,original]of languageHelpOriginals??[])node.textContent=translateInline(original);
}

function setupPlayers(){
 for(let pl=0;pl<2;pl++){
  $('controller-'+pl).value=s.controllers?.[pl]??'human';
  $('controller-'+pl).onchange=()=>{cancelAI();s.controllers=[0,1].map(i=>$('controller-'+i).value);aiPaused=false;aiFault=null;selected=null;save();render();};
 }
 $('resetDialog').addEventListener('close',()=>render());$('helpDialog').addEventListener('close',()=>render());
 $('ai-pause').onclick=()=>{cancelAI();aiPaused=!aiPaused;aiFault=null;render();};
}
function releaseAIWorker(){
 if(aiWorker){aiWorker.terminate();aiWorker=null;}if(aiWorkerURL){URL.revokeObjectURL(aiWorkerURL);aiWorkerURL=null;}
 clearTimeout(aiDeadlineTimer);aiDeadlineTimer=null;
}
function cancelAI(){aiJob++;clearTimeout(aiTimer);aiTimer=null;releaseAIWorker();aiBusy=false;}
function renderAIStatus(){
 const active=isAITurn();$('ai-panel').hidden=!active&&!aiPaused;
 $('ai-pause').textContent=aiPaused?'Jatka AI:ta':'Keskeytä AI';
 const who=s.player===0?'Baba':'Keke';
 $('ai-info').textContent=aiFault??(aiPaused?'AI on keskeytetty.':active?(aiBusy?who+' miettii…':who+' · AI:n vuoro'):'');
 $('board').setAttribute('aria-busy',String(aiBusy));
 if(active)message(aiPaused?'AI on keskeytetty. Jatka AI:ta tai vaihda pelaaja ihmiseksi tasovalinnassa.':who+' on AI. Voit keskeyttää sen tai avata tasovalinnan.');
}
function queueAI(){
 if(!isAITurn()||aiPaused||aiBusy||aiTimer||document.querySelector('dialog[open]'))return;
 aiTimer=setTimeout(()=>{aiTimer=null;if(isAITurn()&&!aiPaused&&!document.querySelector('dialog[open]'))startAI();},180);
}
function startAI(){
 const job=++aiJob;aiBusy=true;aiFault=null;renderAIStatus();
 try{
  const embedded=$('ai-worker-source');
  if(embedded){aiWorkerURL=URL.createObjectURL(new Blob([embedded.textContent],{type:'text/javascript'}));aiWorker=new Worker(aiWorkerURL);}
  else aiWorker=new Worker(new URL('./ai-worker.mjs',import.meta.url),{type:'module'});
  const fail=text=>{if(job!==aiJob)return;releaseAIWorker();aiBusy=false;aiPaused=true;aiFault=text;render();};
  aiWorker.onerror=event=>{event.preventDefault();fail('AI:n käynnistys epäonnistui. Voit yrittää uudelleen tai valita ihmispelaajan.');};
  aiDeadlineTimer=setTimeout(()=>fail('AI:n mietintä keskeytettiin aikarajalla. Jatka yrittääksesi uudelleen.'),6500);
  aiWorker.onmessage=event=>{
   if(job!==aiJob||event.data.id!==job)return;
   if(event.data.error){fail('AI ei löytänyt siirtoa: '+event.data.error);return;}
   const {plan,stats}=event.data.result;releaseAIWorker();
   $('ai-panel').dataset.depth=stats.completedTurns;$('ai-panel').dataset.nodes=stats.nodes;
   $('ai-info').textContent=(s.player===0?'Baba':'Keke')+' siirtää…';
   if(!plan.length){fail('AI ei löytänyt sallittua toimintoa.');return;}
   const applyNext=index=>{
    if(job!==aiJob||!isAITurn()||aiPaused)return;
    try{
     const action=plan[index];
     s=action.kind==='challenge'?challenge(s):action.kind==='concede'?concede(s):act(s,action);
     selected=null;save();render();
     if(s.winner!==null||index+1===plan.length){aiBusy=false;render();return;}
     aiTimer=setTimeout(()=>{aiTimer=null;applyNext(index+1);},450);
    }catch(error){fail('AI:n siirtoa ei voitu tehdä: '+error.message);}
   };
   aiTimer=setTimeout(()=>{aiTimer=null;applyNext(0);},300);
  };
  aiWorker.postMessage({id:job,state:s,options:{timeMs:2500,maxTurns:3,turnWidth:6,firstWidth:8}});
 }catch(error){releaseAIWorker();aiBusy=false;aiPaused=true;aiFault='AI ei käynnistynyt: '+error.message;render();}
}

// Offline installation stays separate from the local game state and AI search.
async function setupOffline(){
 if(!/^https?:$/.test(location.protocol))return;
 const panel=$('offline-panel'),status=$('offline-status'),update=$('update-app');panel.hidden=false;
 if(!('serviceWorker'in navigator)||!window.isSecureContext){status.textContent='Offline-asennus toimii pelin HTTPS-osoitteessa.';return;}
 status.textContent='Valmistellaan offline-peliä…';let ready=false,waiting=false,reloadAfterUpdate=false;
 const showStatus=()=>{status.textContent=waiting?'Uusi versio on saatavilla. Voit jatkaa peliä tai päivittää.':ready?(navigator.onLine?'Valmis offline-peliin':'Offline-tila · peli toimii ilman verkkoa'):'Valmistellaan offline-peliä…';};
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadAfterUpdate)location.reload();});
 try{
  const scope=new URL('./',location.href).href,workerURL=new URL('./sw.js',location.href).href;
  const existing=await navigator.serviceWorker.getRegistration(scope),current=existing?.active??existing?.waiting??existing?.installing;
  const registration=existing?.scope===scope&&current?.scriptURL===workerURL?existing:await navigator.serviceWorker.register(workerURL,{scope,updateViaCache:'none'});
  const offerUpdate=()=>{if(registration.waiting&&registration.active){waiting=true;update.hidden=false;showStatus();}};
  offerUpdate();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offerUpdate();});});
  update.onclick=()=>{if(!registration.waiting)return;save();reloadAfterUpdate=true;update.disabled=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});};
  if(!registration.active)await new Promise((resolve,reject)=>{const worker=registration.installing??registration.waiting;if(!worker){reject(Error('Offline-asennus keskeytyi.'));return;}const changed=()=>{if(worker.state==='activated')resolve();else if(worker.state==='redundant')reject(Error('Offline-asennus epäonnistui.'));};worker.addEventListener('statechange',changed);changed();});
  ready=true;showStatus();offerUpdate();
  window.addEventListener('offline',showStatus);window.addEventListener('online',()=>{showStatus();registration.update().catch(()=>{});});
  registration.update().catch(()=>{});
 }catch{status.textContent='Offline-tallennus ei onnistunut. Avaa peli uudelleen verkkoyhteydessä.';}
}
