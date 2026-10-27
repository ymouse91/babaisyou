import assert from 'node:assert/strict';
import {initial,raw,act,actions,has,signature} from './engine.mjs';
const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
const pos=(s,id)=>{const p=s.pieces.find(p=>p.id===id);return [p.x,p.y];};
let s=initial(0,[1,2]);Object.assign(s,{turn:2,left:2});
for(const [id,x,y]of [['t0',2,4],['t1',3,0],['fast',4,0],['r1',2,3],['flag',4,1]])put(s,id,x,y);
const action={kind:'move',id:'r1',dir:0,steps:1,pullSteps:1,pull:true},before=signature(s),n=act(s,action);
assert.deepEqual(pos(n,'r1'),[2,2]);assert(!has(n,n.pieces.find(p=>p.id==='r1'),'you0'));assert(has(n,n.pieces.find(p=>p.id==='r1'),'fast'));
assert.equal(raw(s,{...action,steps:2}),null);assert(!actions(s).some(a=>a.id==='r1'&&a.dir===0&&a.steps>1&&a.pullSteps===1));assert.equal(signature(s),before);
// Accepted timing: a newly formed CURIOUS rule reacts to its placement.
s=initial(1,[4]);Object.assign(s,{turn:2,left:2});put(s,'keke',3,0);
const curious=act(s,{kind:'place',id:'curious',x:2,y:0});assert.deepEqual(pos(curious,'keke'),[2,0]);assert.deepEqual(pos(curious,'curious'),[1,0]);
// A real CURIOUS + SHEEP cycle: actor Keke loses instead of the action disappearing.
s=initial(1,[4,25]);Object.assign(s,{turn:2,left:2});
for(const [id,x,y]of [['baba',1,2],['keke',4,0],['r1',2,2],['r2',1,3],['flag',3,3],['curious',0,2],['sheep2',2,0]])put(s,id,x,y);
const loopAction={kind:'move',id:'keke',dir:2,steps:1,pullSteps:0,pull:false},loopBefore=JSON.stringify(s),lost=act(s,loopAction);
assert.equal(lost.winner,0);assert(lost.log.some(line=>line.includes('Ääretön silmukka')));assert.equal(JSON.stringify(s),loopBefore);
assert(actions(s).some(a=>a.kind==='move'&&a.id==='keke'&&a.dir===2&&a.pullSteps===0));
console.log('Accepted FAQ baseline passed: FAST stops on YOU loss, immediate CURIOUS, real loop loss, legal action visibility and source immutability.');
