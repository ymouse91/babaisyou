import assert from 'node:assert/strict';
import {initial,restore,rules,has,raw,act,actions,signature,isRiver,LEVELS,normalizeLevels} from './engine.mjs';
import {chooseAI} from './ai.mjs';
const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
const piece=(s,id)=>s.pieces.find(p=>p.id===id);
const pos=(s,id)=>[piece(s,id).x,piece(s,id).y];
const move=(id,dir,extra={})=>({kind:'move',id,dir,...extra});
const play=s=>Object.assign(s,{left:2,turn:2,start:signature(s)});

assert.deepEqual(normalizeLevels([3,25,2,25,99]),[3,25]);
assert.deepEqual(initial(0,[3,25,2]).levels,[3,25]);
assert.equal(Object.keys(LEVELS).length,10);
assert.equal(initial(0,[]).pieces.filter(p=>p.word==='win').length,2);
assert.equal(initial(0,[21]).pieces.filter(p=>p.word==='win').length,4);
assert.equal(initial(0,[25]).pieces.filter(p=>p.word==='sheep').length,2);
for(const [level,prop]of [[22,'thirsty'],[24,'scared'],[25,'sheep']])assert(rules(initial(0,[level])).rock.has(prop));
let legacy=initial(0,[1,2]);legacy.levels=[1,2,3,4,5];legacy.controllers=['ai','human'];
const migrated=restore(legacy);assert.deepEqual(migrated.levels,[1,2]);assert.deepEqual(migrated.controllers,['ai','human']);
assert.equal(signature(restore(initial(0,[3,25]))),signature(initial(0,[3,25])));

// Thirst only happens at the end of a turn; every thirsty object participates.
let s=initial(0,[22]);put(s,'r1',3,0);put(s,'r2',1,3);play(s);
let n=raw(s,move('baba',0));assert.deepEqual(pos(n,'r1'),[3,0]);assert.deepEqual(pos(n,'r2'),[1,3]);
s.left=1;n=raw(s,move('baba',0,{thirstyChoices:[{id:'r1',dir:2},{id:'r2',dir:1}]}));
assert(isRiver(...pos(n,'r1')));assert(isRiver(...pos(n,'r2')));
s=initial(0,[22]);put(s,'r1',3,0);
const a=actions(s).filter(a=>a.kind==='move'&&a.id==='baba'&&a.dir===0&&!a.pull);
assert(a.some(a=>a.thirstyChoices?.some(c=>c.id==='r1'&&c.dir===2)));
assert(a.some(a=>a.thirstyChoices?.some(c=>c.id==='r1'&&c.dir===3)));
for(const action of a){n=act(s,action);assert.equal(n.player,1);assert.equal(n.turn,1);assert(isRiver(...pos(n,'r1')));}
put(s,'flag',3,1);n=raw(s,move('baba',0,{thirstyChoices:[{id:'r1',dir:2}]}));assert.deepEqual(pos(n,'r1'),[3,3]);assert.deepEqual(pos(n,'flag'),[3,4]);
put(s,'flag',3,2);put(s,'keke',3,4);n=raw(s,move('baba',0,{thirstyChoices:[{id:'r1',dir:2}]}));assert.deepEqual(pos(n,'r1'),[3,2]);
s=initial(0,[22]);n=raw(s,move('baba',0));assert.deepEqual(pos(n,'r1'),[0,0]);assert.deepEqual(pos(n,'r2'),[4,4]);
// Entering a hot river resolves MELT during the thirsty movement.
s=initial(0,[3,22]);put(s,'t0',2,0);put(s,'melt',3,0);put(s,'r1',1,0);n=raw(s,move('baba',0,{thirstyChoices:[{id:'r1',dir:3}]}));assert.deepEqual(pos(n,'r1'),[null,null]);

// Strong pushes a whole chain, including a stack, over the edge. The actor stays on board.
s=initial(0,[23]);put(s,'strong',0,2);put(s,'baba',1,3);put(s,'r1',2,3);put(s,'r2',3,3);put(s,'flag',4,3);play(s);
const before=signature(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'baba'),[2,3]);assert.deepEqual(pos(n,'r1'),[3,3]);assert.deepEqual(pos(n,'r2'),[4,3]);assert.deepEqual(pos(n,'flag'),[null,null]);assert.equal(signature(s),before);
assert(raw(n,{kind:'place',id:'flag',x:2,y:2}));
put(s,'t4',4,3);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'t4'),[null,null]);
put(s,'strong',null,null);assert.equal(raw(s,move('baba',1)),null);
s=initial(0,[23,24]);put(s,'strong',0,2);put(s,'baba',2,3);put(s,'r1',1,3);play(s);
n=raw(s,move('baba',1,{pull:true}));assert.deepEqual(pos(n,'r1'),[2,3]);
put(s,'strong',null,null);assert.equal(raw(s,move('baba',1,{pull:true})),null);assert(raw(s,move('baba',1)));
// SCARED restricts the object being pulled, not what a scared mover may pull.
s=initial(0,[24]);put(s,'scared',0,2);put(s,'baba',1,3);put(s,'flag',0,3);play(s);n=raw(s,move('baba',1,{pull:true}));assert.deepEqual(pos(n,'flag'),[1,3]);
// Herd movement cannot bypass the restriction on pulling a scared piece.
s=initial(0,[24,25]);put(s,'baba',1,3);put(s,'r1',0,3);put(s,'r2',3,4);play(s);assert.equal(raw(s,move('baba',1,{pull:true})),null);

// Scared flees as far as possible, pushes normally, and freezes with conflicting threats.
s=initial(0,[24]);put(s,'baba',0,2);put(s,'r1',2,2);play(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'r1'),[4,2]);
put(s,'flag',3,2);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'r1'),[2,2]); // threats on opposite sides
put(s,'flag',3,3);put(s,'r1',2,3);put(s,'baba',2,1);n=raw(s,move('baba',2));assert.deepEqual(pos(n,'r1'),[2,3]); // threat above, standing threat right
put(s,'flag',2,4);n=raw(s,move('baba',2));assert.deepEqual(pos(n,'r1'),[2,3]);assert.deepEqual(pos(n,'flag'),[2,4]);
// A moving threat can make the rock push a piece further down its escape line.
s=initial(0,[24]);put(s,'baba',0,2);put(s,'r1',2,2);put(s,'flag',4,2);play(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'r1'),[3,2]);assert.deepEqual(pos(n,'flag'),[4,2]);
// STRONG + SCARED can push the obstruction off the board.
s=initial(0,[23,24]);put(s,'t0',3,0);put(s,'strong',4,0);put(s,'baba',0,2);put(s,'r1',2,2);put(s,'flag',4,2);play(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'r1'),[4,2]);assert.deepEqual(pos(n,'flag'),[null,null]);

// Sheep move together, including adjacent sheep that must vacate each other's targets.
s=initial(0,[25]);put(s,'baba',0,3);put(s,'r1',1,3);put(s,'r2',2,3);play(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'baba'),[1,3]);assert.deepEqual(pos(n,'r1'),[2,3]);assert.deepEqual(pos(n,'r2'),[3,3]);
// Pulling any sheep also triggers the herd; a blocked follower does not stop the others.
s=initial(0,[25]);put(s,'baba',1,3);put(s,'r1',0,3);put(s,'r2',3,4);play(s);n=raw(s,move('baba',1,{pull:true}));assert.deepEqual(pos(n,'r1'),[1,3]);assert.deepEqual(pos(n,'r2'),[4,4]);
put(s,'sheep',0,2);put(s,'baba',0,3);put(s,'r1',1,3);put(s,'r2',4,4);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'baba'),[1,3]);assert.deepEqual(pos(n,'r1'),[2,3]);assert.deepEqual(pos(n,'r2'),[4,4]);
// Every FAST step is one simultaneous herd displacement, without recursive retriggering.
s=initial(0,[2,25]);put(s,'t0',2,4);put(s,'fast',3,4);put(s,'r1',0,2);put(s,'r2',1,2);put(s,'flag',0,0);play(s);n=raw(s,move('r1',1,{steps:3}));assert.deepEqual(pos(n,'r1'),[3,2]);assert.deepEqual(pos(n,'r2'),[4,2]);
// A sheep follower pushes its own obstacle when possible.
s=initial(0,[25]);put(s,'sheep',0,2);put(s,'baba',0,3);put(s,'r1',2,1);put(s,'r2',4,4);put(s,'flag',3,1);play(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'r1'),[3,1]);assert.deepEqual(pos(n,'flag'),[4,1]);
// Scared and thirsty automatic moves also trigger herd movement.
s=initial(0,[22,25]);put(s,'r1',1,0);put(s,'r2',4,4);n=raw(s,move('baba',0,{thirstyChoices:[{id:'r1',dir:3}]}));assert.deepEqual(pos(n,'r1'),[0,0]);assert.deepEqual(pos(n,'r2'),[3,3]);
s=initial(0,[24,25]);put(s,'r1',2,2);put(s,'r2',1,4);put(s,'baba',0,2);play(s);n=raw(s,move('baba',1));assert.deepEqual(pos(n,'r1'),[4,2]);assert.deepEqual(pos(n,'r2'),[3,4]);
// A SQUARE property tile can receive the new properties too.
s=initial(0,[5,23]);put(s,'square',2,4);put(s,'strong',0,2);assert(has(s,piece(s,'strong'),'you0'));assert(has(s,piece(s,'baba'),'strong'));

// Every selectable pair initializes, offers legal actions, and survives play/save round trips.
const ids=Object.keys(LEVELS).map(Number);let pairs=0;
for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
 let game=initial(0,[ids[i],ids[j]]);for(let turn=0;turn<4&&game.winner===null;turn++){const choices=actions(game);assert(choices.length,`${ids[i]} + ${ids[j]}`);game=act(game,choices[(turn*7)%choices.length]);assert.equal(game.levels.length,2);assert.equal(signature(restore(game)),signature(game));}pairs++;
}
// AI route choices are part of a normal complete-turn plan, not extra actions.
s=initial(0,[22,25]);put(s,'r1',3,0);const ai=chooseAI(s,{timeMs:200,maxTurns:1,seed:7});assert(ai.plan.length);for(const a of ai.plan)s=act(s,a);assert(s.turn>0||s.winner!==null);
console.log(`World 2 passed: inventories, max two levels, migration, THIRSTY choices/timing/push/MELT, STRONG chains/edge/pull, SCARED flight/freeze, simultaneous SHEEP/FAST/automatic movement, ${pairs} pairs and AI.`);
