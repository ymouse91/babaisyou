export const APP_VERSION='1.1.1';
export const RIVER_CELLS=Object.freeze([[0,0],[0,1],[1,1],[2,1],[2,2],[2,3],[3,3],[4,3],[4,4]].map(Object.freeze));
export const isRiver=(x,y)=>RIVER_CELLS.some(([a,b])=>a===x&&b===y);
export const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
export const LEVELS={1:'MORE ROCK, MORE FLAG',2:'FAST',3:'HOT / MELT',4:'CURIOUS',5:'SQUARE',21:'WIN HARDER',22:'THIRSTY',23:'STRONG',24:'SCARED',25:'SHEEP'};
export const MAX_LEVELS=2;
export const levelWorld=id=>id>=21?2:1;
export const levelNumber=id=>id>=21?id-20:id;
export const normalizeLevels=levels=>[...new Set((Array.isArray(levels)?levels:[]).map(Number))].filter(id=>LEVELS[id]).slice(0,MAX_LEVELS).sort((a,b)=>a-b);
const nouns=new Set(['baba','keke','rock','flag','square','river']);
const props=new Set(['win','fast','hot','melt','curious','thirsty','strong','scared','sheep']);
const clone=s=>JSON.parse(JSON.stringify(s));
const inside=(x,y)=>x>=0&&x<5&&y>=0&&y<5;
const at=(s,x,y)=>s.pieces.filter(p=>p.x===x&&p.y===y);
export function initial(starter=0,levels=[1]){
 levels=normalizeLevels(levels);
 const pieces=[{id:'baba',type:'baba',x:0,y:4},{id:'keke',type:'keke',x:4,y:0},{id:'r1',type:'rock',x:0,y:0},{id:'r2',type:'rock',x:4,y:4},{id:'flag',type:'flag',x:2,y:2}];
 const add=(id,word)=>pieces.push({id,type:'text',word,x:null,y:null});
 add('t0','rock');if(levels.includes(1))add('t1','rock');add('t2','flag');if(levels.includes(1))add('t3','flag');add('t4','win');add('t5','win');
 for(const [level,words]of [[2,['fast']],[3,['hot','melt']],[4,['curious']],[5,['square']],[22,['thirsty']],[23,['strong']],[24,['scared']],[25,['sheep','sheep']]])if(levels.includes(level))for(const w of words)add(pieces.some(p=>p.id===w)?w+'2':w,w);
 if(levels.includes(21)){add('w2-win0','win');add('w2-win1','win');}
 return {version:3,levels,pieces,player:starter,left:1,turn:0,start:null,previous:null,winner:null,challenge:null,log:[],effectOrder:[],controllers:['human','human']};
}
export const signature=s=>JSON.stringify(s.pieces.map(p=>[p.type==='text'?'w:'+p.word:p.type,p.x,p.y]).sort());
export function restore(value){
 if(!value?.pieces)return initial();const s=clone(value);s.levels??=[1];s.effectOrder??=[];s.controllers=[0,1].map(i=>s.controllers?.[i]==='ai'?'ai':'human');
 const convert=str=>{if(!str)return str;try{return JSON.stringify(JSON.parse(str).map(([key,x,y])=>{const p=s.pieces.find(p=>p.id===key);return [p?(p.type==='text'?'w:'+p.word:p.type):key,x,y];}).sort());}catch{return null;}};
 if(!s.version||s.version<2){s.start=convert(s.start);s.previous=convert(s.previous);}
 const levels=normalizeLevels(s.levels);
 if(levels.length!==s.levels.length){const fresh=initial(s.player,levels);fresh.controllers=s.controllers;fresh.log=['Vanha tasoyhdistelmä rajattiin kahteen tasoon. Uusi peli aloitettu.'];return fresh;}
 s.levels=levels;s.version=3;return s;
}
export function rules(s){
 const r={baba:new Set(),keke:new Set(),rock:new Set(),flag:new Set(),square:new Set(),river:new Set()};
 const activeSquares=new Set();Object.defineProperty(r,'activeSquares',{value:activeSquares});
 const ns=[{word:'baba',x:-1,y:2},{word:'keke',x:2,y:-1},...s.pieces.filter(p=>p.x!==null&&p.type==='text'&&nouns.has(p.word))];
 const ps=[{word:'you0',x:-1,y:3},{word:'you0',x:2,y:5},{word:'you1',x:3,y:-1},{word:'you1',x:5,y:2},...s.pieces.filter(p=>p.x!==null&&p.type==='text'&&props.has(p.word))];
 for(const n of ns)for(const p of ps)if((p.x===n.x+1&&p.y===n.y)||(p.x===n.x&&p.y===n.y+1)){r[n.word].add(p.word);if(p.id)activeSquares.add(p.id);}
 if(s.levels?.includes(3))r.river.add('hot');if(s.levels?.includes(4))r.flag.add('curious');
 for(const [level,prop]of [[22,'thirsty'],[24,'scared'],[25,'sheep']])if(s.levels?.includes(level))r.rock.add(prop);
 return r;
}
export function has(s,p,prop,r=rules(s)){return (p.type==='text'?r.activeSquares.has(p.id)&&r.square.has(prop):r[p.type]?.has(prop))||false;}
const share=(s,a,b,r)=>(has(s,a,'win',r)&&(has(s,b,'you0',r)||has(s,b,'you1',r)))||(has(s,b,'win',r)&&(has(s,a,'you0',r)||has(s,a,'you1',r)))||(has(s,a,'hot',r)&&has(s,b,'melt',r))||(has(s,b,'hot',r)&&has(s,a,'melt',r));
export function winner(s,actor){const r=rules(s),w=[];for(let pl=0;pl<2;pl++)if(s.pieces.some(p=>p.x!==null&&has(s,p,'you'+pl,r)&&at(s,p.x,p.y).some(q=>q.id!==p.id&&has(s,q,'win',r))))w.push(pl);return w.includes(actor)?actor:w[0]??null;}
const changes=(before,after)=>after.pieces.flatMap(p=>{const old=before.pieces.find(q=>q.id===p.id);return p.x===old.x&&p.y===old.y?[]:[{id:p.id,from:[old.x,old.y],to:[p.x,p.y]}];});
const commit=(s,trial)=>{for(const p of trial.pieces)Object.assign(s.pieces.find(q=>q.id===p.id),p);s.log=trial.log;};

// Plan on a private board: a blocked push or pull never leaves a partial move.
function singleStep(s,id,dir,pull=false,r=rules(s)){
 const p=s.pieces.find(p=>p.id===id);if(!p||p.x===null)return null;
 const [dx,dy]=dirs[dir],ox=p.x,oy=p.y,tx=ox+dx,ty=oy+dy,strong=has(s,p,'strong',r);
 if(!inside(tx,ty))return null;
 const pushGroup=group=>{
  const x=group[0].x+dx,y=group[0].y+dy;
  if(!inside(x,y)){
   if(!strong)return false;
   for(const q of group){s.log.push(`${q.word??q.type} ajettiin reunan yli ja palautui varastoon.`);q.x=null;q.y=null;}return true;
  }
  const blocked=at(s,x,y).filter(q=>!group.includes(q)&&group.some(v=>!share(s,v,q,r)));
  if(blocked.length&&(!strong||!pushGroup(blocked)))return false;
  for(const q of group){q.x=x;q.y=y;}return true;
 };
 const pushed=at(s,tx,ty).filter(q=>!share(s,p,q,r));
 if(pushed.length&&!pushGroup(pushed))return null;
 p.x=tx;p.y=ty;
 if(pull){
  const pulled=at(s,ox-dx,oy-dy);
  if(!strong&&pulled.some(q=>has(s,q,'scared',r)))return null;
  const occupants=at(s,ox,oy).filter(q=>pulled.some(v=>!share(s,v,q,r)));
  if(occupants.length&&!pushGroup(occupants))return null;
  for(const q of pulled){q.x=ox;q.y=oy;}
 }
 return {pushed:pushed.length>0};
}

function step(s,id,dir,pull=false){
 const before=clone(s),p=s.pieces.find(p=>p.id===id);if(!p||p.x===null)return null;
 const r=rules(s),[dx,dy]=dirs[dir];
 if(pull&&!has(s,p,'strong',r)&&at(s,p.x-dx,p.y-dy).some(q=>has(s,q,'scared',r)))return null;
 const solo=clone(s),result=singleStep(solo,id,dir,pull,r);
 const herd=s.pieces.filter(q=>q.x!==null&&has(s,q,'sheep',r));
 const triggered=herd.some(q=>q.id===id||at(s,p.x+dx,p.y+dy).some(v=>v.id===q.id&&!share(s,p,v,r))||(pull&&q.x===p.x-dx&&q.y===p.y-dy)||(result&&changes(before,solo).some(ev=>ev.id===q.id)));
 let trial=solo,pushed=result?.pushed??false;
 if(triggered){
  trial=clone(s);const moved=new Set();
  // Front-to-back planning lets adjacent sheep vacate their squares together.
  // A sheep pushed by another member is counted once, never triggered again.
  const roots=[...new Set([id,...herd.map(q=>q.id)])].sort((a,b)=>{const pa=s.pieces.find(q=>q.id===a),pb=s.pieces.find(q=>q.id===b);return (pb.x-pa.x)*dx+(pb.y-pa.y)*dy||(a===id?-1:b===id?1:a.localeCompare(b));});
  for(const root of roots){
   if(moved.has(root))continue;
   const next=clone(trial),one=singleStep(next,root,dir,root===id&&pull,r);if(!one)continue;
   for(const ev of changes(trial,next))moved.add(ev.id);commit(trial,next);pushed||=one.pushed;
  }
  const movedPrimary=trial.pieces.find(q=>q.id===id);
  if(movedPrimary.x!==p.x+dx||movedPrimary.y!==p.y+dy)return null;
 }else if(!result)return null;
 const events=changes(before,trial);commit(s,trial);return {events,pushed,before};
}
function melt(s){
 // Removing a rule can remove HOT/MELT, so recompute between simultaneous waves.
 while(true){const r=rules(s),dead=s.pieces.filter(p=>p.x!==null&&has(s,p,'melt',r)&&((r.river.has('hot')&&isRiver(p.x,p.y))||at(s,p.x,p.y).some(q=>q.id!==p.id&&has(s,q,'hot',r))));if(!dead.length)break;for(const p of dead){s.log.push(`${p.word??p.type} suli ja palautui varastoon.`);p.x=null;p.y=null;}}
}
function reactions(s,batch){
 const queue=[batch],seen=new Set();let rounds=0;
 while(queue.length){
  const task=queue.shift();melt(s);const r=rules(s);let intents=[];
  if(task.intents){
   intents=task.intents.filter(i=>{const p=s.pieces.find(p=>p.id===i.id);return p?.x!==null&&p&&has(s,p,i.effect,r)&&(!task.continuing||i.effect==='scared'||has(s,p,'fast',r));});
  }else{
   const {events,before}=task;
   for(const q of s.pieces.filter(p=>p.x!==null&&(has(s,p,'curious',r)||has(s,p,'scared',r)))){
    const old=before.pieces.find(p=>p.id===q.id);if(!old||old.x===null)continue;
    const wants=[];
    if(has(s,q,'curious',r)){
     const ds=new Set();for(const ev of events){if(ev.id===q.id||ev.to[0]===null)continue;const [fx,fy]=ev.from,[x,y]=ev.to;
      if(y===old.y&&(fy!==old.y||fx===null)&&x!==old.x)ds.add(x>old.x?1:3);
      if(x===old.x&&(fx!==old.x||fy===null)&&y!==old.y)ds.add(y>old.y?2:0);
     }
     if(ds.size===1)wants.push({id:q.id,dir:[...ds][0],effect:'curious',fast:has(s,q,'fast',r)});
    }
    if(has(s,q,'scared',r)){
     const triggered=events.some(ev=>ev.id!==q.id&&ev.to[0]!==null&&Math.abs(ev.to[0]-q.x)+Math.abs(ev.to[1]-q.y)===1&&(ev.from[0]===null||Math.abs(ev.from[0]-old.x)+Math.abs(ev.from[1]-old.y)!==1));
     if(triggered){
      const ds=new Set(s.pieces.filter(p=>p.id!==q.id&&p.x!==null&&Math.abs(p.x-q.x)+Math.abs(p.y-q.y)===1).map(p=>p.x>q.x?3:p.x<q.x?1:p.y>q.y?0:2));
      if(ds.size===1)wants.push({id:q.id,dir:[...ds][0],effect:'scared'});
     }
    }
    if(new Set(wants.map(i=>i.dir)).size===1)intents.push(wants.find(i=>i.effect==='scared')??wants[0]);
   }
  }
  if(!intents.length)continue;
  const order=s.effectOrder??[];intents.sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)||a.id.localeCompare(b.id);});
  const key=signature(s)+JSON.stringify(intents);if(seen.has(key))throw Object.assign(Error('Reaktiot muodostavat kehän. Valitse toinen ratkaisujärjestys.'),{loop:{ids:intents.map(i=>i.id)}});seen.add(key);if(++rounds>200)throw Object.assign(Error('Liian pitkä reaktioketju. Vaihda ratkaisujärjestystä.'),{loop:{ids:intents.map(i=>i.id)}});
  // Compatible plans share the same starting board. Identical herd displacements
  // from several leaders are merged, so each sheep moves once in this wave.
  const plans=intents.map(i=>{const trial=clone(s),result=step(trial,i.id,i.dir);return {intent:i,trial,result};}).filter(p=>p.result);
  let independent=true;const changed=new Map();
  for(const plan of plans)for(const ev of plan.result.events){const other=changed.get(ev.id);if(other&&other.to.join(',')!==ev.to.join(','))independent=false;changed.set(ev.id,ev);}
  // Also account for a stationary piece in a conflicting plan's destination.
  for(const ev of changed.values())if(ev.to[0]!==null)for(const q of s.pieces){if(q.id===ev.id)continue;const pos=changed.get(q.id)?.to??[q.x,q.y];if(pos[0]===ev.to[0]&&pos[1]===ev.to[1]&&!share(s,s.pieces.find(p=>p.id===ev.id),q,r))independent=false;}
  if(independent&&plans.length){
   const prev=clone(s),all=[...changed.values()];for(const ev of all)Object.assign(s.pieces.find(q=>q.id===ev.id),{x:ev.to[0],y:ev.to[1]});
   for(const plan of plans)for(const line of plan.trial.log.slice(prev.log.length))if(!s.log.slice(prev.log.length).includes(line))s.log.push(line);
   melt(s);const continuing=plans.filter(p=>p.intent.effect==='scared'||p.intent.fast&&!p.result.pushed).map(p=>p.intent);
   queue.unshift({events:all,before:prev},...(continuing.length?[{intents:continuing,continuing:true}]:[]));
  }else if(plans.length)queue.unshift(...intents.map(intent=>({intents:[intent]})));
 }
}

// Each thirsty object chooses a straight route to the first river square in
// that direction. The actor may set effectOrder when movements interfere.
function thirst(s,a,requireChoices){
 const order=s.effectOrder??[],ids=s.pieces.filter(p=>p.x!==null&&has(s,p,'thirsty')).map(p=>p.id).sort((a,b)=>(order.indexOf(a)<0?999:order.indexOf(a))-(order.indexOf(b)<0?999:order.indexOf(b))||a.localeCompare(b));
 for(const id of ids){
  const p=s.pieces.find(p=>p.id===id);if(p.x===null||isRiver(p.x,p.y)||!has(s,p,'thirsty'))continue;
  const options=[];
  for(let dir=0;dir<4;dir++){
   const [dx,dy]=dirs[dir];for(let distance=1;distance<5;distance++){const x=p.x+dx*distance,y=p.y+dy*distance;if(!inside(x,y))break;if(!isRiver(x,y))continue;
    const trial=clone(s);if(step(trial,id,dir))options.push({dir,from:[p.x,p.y],to:[x,y]});break;
   }
  }
  if(!options.length)continue;
  const chosen=a.thirstyChoices?.find(choice=>choice.id===id);
  if(requireChoices&&options.length>1&&!chosen){const error=new Error('Valitse janoisen reitti joelle.');error.routeChoice={id,options};throw error;}
  const route=chosen?options.find(option=>option.dir===chosen.dir):options[0];if(!route)throw Error('Janoisen valittu reitti ei ole sallittu.');
  for(let distance=0;distance<4&&p.x!==null&&!isRiver(p.x,p.y)&&has(s,p,'thirsty');distance++){
   const result=step(s,id,route.dir);if(!result)break;reactions(s,result);
  }
 }
}

const permutations=a=>a.length<2?[a]:a.flatMap((x,i)=>permutations([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));
// Official FAQ: an infinite loop makes the player who last acted lose. The actor may still choose another
// resolution order, so the loss only applies when every order loops; otherwise the action is rejected as before.
export function raw(s,a,options={}){
 const box={};
 try{return rawCore(s,a,options,box);}
 catch(error){
  if(!error.loop||options.noLoopCheck||!box.n)throw error;
  const ids=[...new Set([...s.pieces.filter(p=>p.type!=='text'&&p.x!==null).map(p=>p.id),...error.loop.ids])];
  if(ids.length>6)throw error;
  let avoidable=false;
  for(const order of permutations(ids)){
   try{rawCore({...s,effectOrder:order},a,{...options,noLoopCheck:true},{});avoidable=true;}catch(inner){if(!inner.loop)avoidable=true;}
   if(avoidable)break;
  }
  if(avoidable)throw error;
  const lost=box.n;lost.winner=1-s.player;lost.log.push('Ääretön silmukka: '+(s.player===0?'Baba':'Keke')+' menettää pelin, koska toimi viimeksi.');lost.log=lost.log.slice(-20);return lost;
 }
}
function rawCore(s,a,{requireChoices=false}={},box={}){
 if(s.winner!==null)return null;const n=clone(s),r=rules(s);box.n=n;
 if(a.kind==='place'){
  const p=n.pieces.find(p=>p.id===a.id);if(!p||p.x!==null||!inside(a.x,a.y)||at(s,a.x,a.y).length||!s.pieces.some(q=>q.x!==null&&has(s,q,'you'+s.player,r)&&Math.abs(q.x-a.x)+Math.abs(q.y-a.y)===1))return null;
  p.x=a.x;p.y=a.y;reactions(n,{before:clone(s),events:[{id:p.id,from:[null,null],to:[a.x,a.y]}]});
 }else if(a.kind==='move'){
  const p=n.pieces.find(p=>p.id===a.id),steps=a.steps??1,pullSteps=a.pullSteps??(a.pull?steps:0);
  if(!p||p.x===null||!has(s,p,'you'+s.player,r)||!dirs[a.dir]||!Number.isSafeInteger(steps)||steps<1||!Number.isInteger(pullSteps)||pullSteps<0||pullSteps>steps)return null;
  if(steps>1&&!has(s,p,'fast',r))return null;
  for(let i=0;i<steps;i++){
   if(p.x===null)break;if(i>0&&(!has(n,p,'fast')||!has(n,p,'you'+s.player)))return null;
   const result=step(n,p.id,a.dir,i<pullSteps);if(!result)return null;reactions(n,result);
  }
 }else return null;
 n.winner=winner(n,s.player);
 if(n.winner===null&&s.left===1){thirst(n,a,requireChoices);n.winner=winner(n,s.player);}
 n.log=n.log.slice(-20);return n;
}
function* candidates(s){
 const r=rules(s);for(const p of s.pieces){if(p.x===null){const targets=new Set();for(const q of s.pieces.filter(q=>q.x!==null&&has(s,q,'you'+s.player,r)))for(const [dx,dy]of dirs){const x=q.x+dx,y=q.y+dy;if(inside(x,y)&&!at(s,x,y).length&&!targets.has(x+','+y)){targets.add(x+','+y);yield {kind:'place',id:p.id,x,y};}}}
 else if(has(s,p,'you'+s.player,r))for(let dir=0;dir<4;dir++){const [dx,dy]=dirs[dir],behind=at(s,p.x-dx,p.y-dy).length>0;for(const steps of (has(s,p,'fast',r)?[...new Set([1,2,3,4,s.fastLimit??4])]:[1]))for(const pullSteps of (behind?[...new Set([0,1,2,3,4,steps,s.fastPull??1])].filter(n=>n<=steps):[0]))yield {kind:'move',id:p.id,dir,steps,pullSteps,pull:pullSteps>0};}}
}
const validEnd=(s,n)=>signature(n)!==(s.start??signature(s))&&signature(n)!==s.previous;
function* variants(s,a){
 const pending=[a],seen=new Set();while(pending.length){const action=pending.pop();let state;
  try{state=raw(s,action,{requireChoices:true});}catch(error){if(error.routeChoice){const {id,options}=error.routeChoice;for(const route of [...options].reverse())pending.push({...action,thirstyChoices:[...(action.thirstyChoices??[]),{id,...route}]});}continue;}
  if(state){const key=signature(state)+'|'+state.winner;if(!seen.has(key)){seen.add(key);yield {action,state};}}
 }
}
function validate(s,n,lookAhead){if(!n)return null;if(n.winner!==null)return n;if(s.left===1&&!validEnd(s,n))return null;if(s.left===2&&lookAhead){const second={...n,left:1,start:s.start??signature(s)};let found=false;for(const b of candidates(second)){for(const {state:end}of variants(second,b))if(end.winner!==null||validEnd(second,end)){found=true;break;}if(found)break;}if(!found)return null;}return n;}
export function legal(s,a,lookAhead=true){let n;try{n=raw(s,a);}catch{return null;}return validate(s,n,lookAhead);}
export function actions(s){const result=[];for(const a of candidates(s))for(const {action,state}of variants(s,a))if(validate(s,state,true))result.push(action);return result;}
export function act(s,a){const n=legal(s,a);if(!n)throw Error('Toiminto ei ole sallittu. Tarkista kohde, työntö, veto ja vuoron lopputilanne.');return finishAction(s,a,n);}
function finishAction(s,a,n){const start=s.start??signature(s),p=s.pieces.find(p=>p.id===a.id);n.log.push(`${s.player===0?'Baba':'Keke'}: ${a.kind==='place'?'asetti':'liikkui'} ${p.word??p.type}${a.steps>1?' '+a.steps+' askelta':''}${(a.pullSteps??(a.pull?1:0))?' ja veti':''}.`);n.log=n.log.slice(-20);n.left--;
 if(n.challenge){n.challenge.remaining--;if(n.winner===null&&n.challenge.remaining===0)n.winner=n.challenge.by;}
 if(n.left===0&&n.winner===null){n.previous=n.challenge?s.previous:start;n.start=signature(n);n.player=n.challenge?s.player:1-s.player;n.left=2;n.turn++;}else n.start=start;return n;}
export function challenge(s){if(s.winner!==null||s.challenge||s.left!==(s.turn===0?1:2))throw Error('Haaste tehdään oman vuoron alussa.');const n=clone(s);n.challenge={by:s.player,remaining:10};n.player=1-s.player;n.left=2;n.start=signature(s);n.previous=s.start??signature(s);n.log.push('Haaste! Vastustajalla on 10 toimintoa voittaa.');return n;}
export function concede(s){if(s.winner!==null||s.challenge||actions(s).length)throw Error('Tappion voi myöntää, kun vaadittuja toimintoja ei voi tehdä.');const n=clone(s);n.winner=1-s.player;return n;}

// Search may explore an unfinished first action, but only complete legal turns
// are offered to the AI. Human actions retain the existing completion check.
export function* successors(s){
 for(const a of candidates(s))for(const {action,state}of variants(s,a)){const n=validate(s,state,false);if(n)yield {action,state:finishAction(s,action,n)};}
}
