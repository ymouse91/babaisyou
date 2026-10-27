import assert from 'node:assert/strict';
import {initial,raw,act,has,rules,isRiver,restore,signature,legal} from './engine.mjs';
const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
let s=initial(0,[3,4]);assert.equal(s.pieces.filter(p=>p.x===null).length,7);assert(rules(s).river.has('hot'));assert(rules(s).flag.has('curious'));
// FAST: one action can travel multiple cells, and pull only the first cell.
s=initial(0,[1,2]);put(s,'fast',0,2);let n=raw(s,{kind:'move',id:'baba',dir:1,steps:3});assert.equal(n.pieces.find(p=>p.id==='baba').x,3);
put(s,'baba',1,4);put(s,'t0',0,4);n=raw(s,{kind:'move',id:'baba',dir:1,steps:2,pullSteps:1});assert.equal(n.pieces.find(p=>p.id==='t0').x,1);assert.equal(n.pieces.find(p=>p.id==='baba').x,3);
// Non-FAST cannot use multiple steps; intermediate blocking cannot be jumped over.
assert.equal(raw(initial(),{kind:'move',id:'baba',dir:0,steps:2}),null);put(s,'t1',2,4);put(s,'t2',3,4);assert.equal(raw(s,{kind:'move',id:'baba',dir:1,steps:2}),null);
// HOT river, MELT destruction, and reuse of destroyed pieces via placement.
s=initial(0,[1,3]);put(s,'melt',0,2);put(s,'baba',1,0);n=raw(s,{kind:'move',id:'baba',dir:2});assert.equal(n.pieces.find(p=>p.id==='baba').x,null);
// Give rocks YOU so a destroyed Baba can be placed beside a rock.
put(n,'t0',2,4);assert(has(n,n.pieces.find(p=>p.id==='r1'),'you0'));n=raw(n,{kind:'place',id:'baba',x:1,y:0});assert.equal(n.pieces.find(p=>p.id==='baba').x,1);
// A pushed MELT flag dies in the first FAST step, before the actor's destination.
s=initial(0,[2,3]);put(s,'fast',0,2);put(s,'t2',3,0);put(s,'melt',4,0);put(s,'baba',2,0);put(s,'flag',1,0);put(s,'r1',4,1);
n=raw(s,{kind:'move',id:'baba',dir:3,steps:2});assert.equal(n.pieces.find(p=>p.id==='flag').x,null);assert.equal(n.pieces.find(p=>p.id==='baba').x,0);
// CURIOUS responds to placement and to new-row entry, but not movement within a row.
s=initial(0,[1,4]);put(s,'baba',1,4);n=raw(s,{kind:'place',id:'t0',x:2,y:4});assert.equal(n.pieces.find(p=>p.id==='flag').y,3);
s=initial(0,[1,4]);put(s,'baba',0,3);n=raw(s,{kind:'move',id:'baba',dir:0});assert.equal(n.pieces.find(p=>p.id==='flag').x,1);
s=initial(0,[1,4]);put(s,'baba',0,2);n=raw(s,{kind:'move',id:'baba',dir:1});assert.equal(n.pieces.find(p=>p.id==='flag').x,2);
// CURIOUS + FAST keeps approaching until its first push, then stops.
s=initial(0,[2,4]);put(s,'t2',4,1);put(s,'fast',4,2);put(s,'flag',3,4);put(s,'baba',2,2);n=raw(s,{kind:'place',id:'t0',x:3,y:2});assert.equal(n.pieces.find(p=>p.id==='flag').y,2);assert.equal(n.pieces.find(p=>p.id==='t0').y,1);
// SQUARE: an active property tile is controllable, and immediately loses control out of a rule.
s=initial(0,[1,5]);put(s,'square',2,4);put(s,'t0',0,1);put(s,'t4',1,1);const tile=s.pieces.find(p=>p.id==='t4');assert(has(s,tile,'you0'));n=raw(s,{kind:'move',id:'t4',dir:1});assert(n);assert(!has(n,n.pieces.find(p=>p.id==='t4'),'you0'));
// SQUARE IS WIN makes active property tiles into winning objects.
s=initial(0,[1,5]);put(s,'square',2,4);put(s,'t4',3,4);put(s,'t0',0,1);put(s,'t5',1,1);put(s,'baba',1,2);n=raw(s,{kind:'move',id:'baba',dir:0});assert.equal(n.winner,0);
// Legacy saved signatures are migrated without allowing full-turn reversal.
s=initial();s.left=2;s.turn=2;s.start=JSON.stringify(s.pieces.map(p=>[p.id,p.x,p.y]).sort());delete s.version;s=restore(s);n=act(s,{kind:'move',id:'baba',dir:0});assert.equal(legal(n,{kind:'move',id:'baba',dir:2}),null);
assert.equal(signature(initial()),signature(restore(initial())));assert(isRiver(2,2));console.log('Level 2–5 assertions passed: FAST, partial pull, river HOT, MELT/reuse, CURIOUS/FAST, SQUARE, save migration.');

// Simultaneous independent CURIOUS responses preserve both movements.
s=initial(0,[1,4]);put(s,'curious',0,2);put(s,'baba',1,1);put(s,'flag',3,2);n=raw(s,{kind:'place',id:'t0',x:1,y:2});assert.equal(n.pieces.find(p=>p.id==='baba').y,2);assert.equal(n.pieces.find(p=>p.id==='flag').x,2);assert.equal(n.pieces.find(p=>p.id==='t0').y,3);
// HOT + MELT on one object does not destroy that object by itself.
s=initial(0,[1,3]);put(s,'t0',2,0);put(s,'hot',3,0);put(s,'melt',2,1);put(s,'t1',2,4);put(s,'r1',4,1);n=raw(s,{kind:'move',id:'r1',dir:2});assert.equal(n.pieces.find(p=>p.id==='r1').y,2);
// A melted YOU object cannot win merely because it crossed a WIN object.
s=initial(0,[1,3]);put(s,'melt',0,2);put(s,'t0',3,3);put(s,'t4',4,3);put(s,'r1',1,1);put(s,'baba',1,0);n=raw(s,{kind:'move',id:'baba',dir:2});assert.equal(n.pieces.find(p=>p.id==='baba').x,null);assert.equal(n.winner,null);
console.log('Interaction assertions passed: simultaneous CURIOUS, no self-melt, no post-destruction win.');
