import {successors,signature,rules,has,challenge,concede,actions} from './engine.mjs';
const AI_MATE=1000000;
const aiCopy=s=>JSON.parse(JSON.stringify(s));
const aiDistance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const aiKey=s=>[signature(s),s.player,s.left,s.turn===0,s.start,s.previous,s.challenge?.by,s.challenge?.remaining,JSON.stringify(s.effectOrder??[])].join('|');

// All scoring is from one player's perspective, including at opponent nodes.
export function evaluateAI(s,player){
 if(s.winner!==null)return s.winner===player?AI_MATE:-AI_MATE;
 const r=rules(s),on=s.pieces.filter(p=>p.x!==null),goals=on.filter(p=>has(s,p,'win',r));
 const value=side=>{
  const own=on.filter(p=>has(s,p,'you'+side,r));if(!own.length)return -800;
  let score=own.length*32;
  for(const p of own){score+=8-(Math.abs(p.x-2)+Math.abs(p.y-2))*2;if(has(s,p,'fast',r))score+=12;if(has(s,p,'hot',r))score+=5;if(has(s,p,'melt',r))score-=8;}
  let nearest=20;for(const p of own)for(const goal of goals)if(p.id!==goal.id)nearest=Math.min(nearest,aiDistance(p,goal));
  if(nearest<20)score+=180/(nearest+.6);
  // A nearby WIN is much more urgent for the player who moves next. This
  // keeps defensive rule-breaking inside the beam before deeper minimax.
  if(s.player===side&&nearest<=2)score+=nearest===1?450:250;
  // A noun near YOU can set up a property with the second action. Reward useful
  // rule construction rather than treating every unused text tile as worthless.
  const winAvailable=s.pieces.some(p=>p.word==='win'&&p.x===null);
  if(winAvailable)for(const noun of on.filter(p=>p.type==='text'&&['rock','flag','square'].includes(p.word))){
   const targets=on.filter(p=>p.type===noun.word||(noun.word==='square'&&r.activeSquares.has(p.id)));
   if(!targets.length)continue;
   for(const [dx,dy]of [[1,0],[0,1]]){const x=noun.x+dx,y=noun.y+dy;if(x>4||y>4||on.some(p=>p.x===x&&p.y===y)||!own.some(p=>Math.abs(p.x-x)+Math.abs(p.y-y)===1))continue;
    let distance=20;for(const p of own)for(const goal of targets)if(p.id!==goal.id)distance=Math.min(distance,aiDistance(p,goal));if(distance<20)score+=35/(distance+.8);
   }
  }
  return score;
 };
 return value(player)-value(1-player);
}

export function chooseAI(state,{timeMs=2500,maxTurns=3,turnWidth=6,firstWidth=8,variation=4,seed}={}){
 const searchSeed=(seed??(globalThis.crypto?.getRandomValues?globalThis.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)))>>>0;
 let randomState=searchSeed;
 const random=()=>{randomState=(randomState+0x6D2B79F5)>>>0;let t=randomState;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 const shuffled=entries=>{const result=[...entries];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
 const pick=entries=>entries[Math.floor(random()*entries.length)];
 const began=performance.now(),deadline=began+Math.max(20,timeMs),rootPlayer=state.player;
 const env={nodes:0,turns:0,timedOut:false,pruned:false};
 const STOP={};
 const check=()=>{if(performance.now()>=deadline){env.timedOut=true;throw STOP;}};
 const score=s=>evaluateAI(s,rootPlayer);
 const afterAction=(before,n)=>n.winner!==null||n.turn!==before.turn;
 const order=(a,b,side)=>(side===rootPlayer?b.rank-a.rank:a.rank-b.rank)||(a.rank===(side===rootPlayer?AI_MATE:-AI_MATE)?a.plan.length-b.plan.length:0);
 const turnCache=new Map(),table=new Map();
 function addUnique(map,entry){const key=aiKey(entry.state),old=map.get(key);if(!old||entry.plan.length<old.plan.length)map.set(key,entry);}
 function fallback(s){
  const first=[];for(const edge of successors(s)){env.nodes++;const plan=[edge.action];if(afterAction(s,edge.state))return {state:edge.state,plan,rank:score(edge.state)};first.push(edge);}
  for(const edge of first)for(const next of successors(edge.state)){env.nodes++;if(afterAction(s,next.state))return {state:next.state,plan:[edge.action,next.action],rank:score(next.state)};}
  if(s.challenge){const n=aiCopy(s);n.winner=s.challenge.by;return {state:n,plan:[],rank:score(n)};}
  try{const n=challenge(s);return {state:n,plan:[{kind:'challenge'}],rank:score(n)};}catch{const n=concede(s);return {state:n,plan:[{kind:'concede'}],rank:score(n)};}
 }
 function options(s){
  const key=aiKey(s);if(turnCache.has(key))return turnCache.get(key);
  check();const seedMap=new Map(),done=new Map();
  for(const edge of successors(s)){check();env.nodes++;const entry={state:edge.state,plan:[edge.action],rank:score(edge.state)};if(afterAction(s,edge.state))addUnique(done,entry);else addUnique(seedMap,entry);}
  const seeds=shuffled(seedMap.values()).sort((a,b)=>order(a,b,s.player));
  if(seeds.length>firstWidth)env.pruned=true;
  // Winning first actions need no second action and always survive the beam.
  for(const seed of seeds.slice(0,firstWidth))for(const edge of successors(seed.state)){
   check();env.nodes++;if(!afterAction(s,edge.state))continue;addUnique(done,{state:edge.state,plan:[...seed.plan,edge.action],rank:score(edge.state)});
  }
  let result=shuffled(done.values()).sort((a,b)=>order(a,b,s.player));
  // If all retained first actions were dead ends, use a legal complete fallback
  // rather than declaring a loss merely because a beam discarded a continuation.
  if(!result.length)result=[fallback(s)];
  if(result.length>turnWidth)env.pruned=true;
  result=result.slice(0,turnWidth);turnCache.set(key,result);env.turns++;return result;
 }
 function search(s,depth,alpha,beta){
  check();if(s.winner!==null||depth===0)return score(s);
  const key=aiKey(s)+'#'+depth,cached=table.get(key);if(cached!==undefined)return cached;
  const alphaBefore=alpha,betaBefore=beta,maximizing=s.player===rootPlayer;let best=maximizing?-Infinity:Infinity,cut=false;
  for(const entry of options(s)){
   const v=search(entry.state,depth-1,alpha,beta);best=maximizing?Math.max(best,v):Math.min(best,v);
   if(maximizing)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
   if(beta<=alpha){cut=true;break;}
  }
  if(!cut&&best>alphaBefore&&best<betaBefore)table.set(key,best);return best;
 }
 const fallbackEntry=fallback(state);let chosen=fallbackEntry,completedDepth=0,rootOptions=null;
 try{
  rootOptions=options(state);
  const immediate=rootOptions.filter(entry=>entry.state.winner===rootPlayer);
  if(immediate.length){const shortest=Math.min(...immediate.map(entry=>entry.plan.length));chosen=pick(immediate.filter(entry=>entry.plan.length===shortest));completedDepth=1;}
  else for(let depth=1;depth<=Math.min(3,maxTurns);depth++){
   let bestValue=-Infinity;const scored=[];
   // Each root alternative gets a full-window score. An alpha-beta bound from
   // a rejected alternative must not be mistaken for a near-equal true value.
   for(const entry of rootOptions){const value=search(entry.state,depth-1,-Infinity,Infinity);scored.push({entry,value});bestValue=Math.max(bestValue,value);}
   const margin=Math.max(0,Number(variation)||0);
   const eligible=scored.filter(({value})=>bestValue>=AI_MATE?value>=AI_MATE:bestValue>-AI_MATE?value>-AI_MATE&&value>=bestValue-margin:value===bestValue);
   if(eligible.length){chosen=pick(eligible).entry;completedDepth=depth;rootOptions=[chosen,...rootOptions.filter(entry=>entry!==chosen)];}
   if(bestValue>=AI_MATE||bestValue<=-AI_MATE)break;
  }
 }catch(error){if(error!==STOP)throw error;}
 return {plan:chosen.plan,stats:{seed:searchSeed,completedTurns:completedDepth,targetTurns:3,nodes:env.nodes,expandedTurns:env.turns,pruned:env.pruned,timedOut:env.timedOut,elapsedMs:Math.round(performance.now()-began)}};
}
