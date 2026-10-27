import assert from 'node:assert/strict';
import {initial,rules,raw,act,legal,winner,challenge,concede,actions,signature} from './engine.mjs';
let s=initial();assert.equal(s.pieces.filter(p=>p.x===null).length,6);
assert.equal(act(s,{kind:'move',id:'baba',dir:0,pull:false}).player,1);
assert.equal(raw(s,{kind:'place',id:'t0',x:2,y:3}),null);
s=act(s,{kind:'place',id:'t0',x:1,y:4});assert.equal(s.left,2);
assert.equal(raw(s,{kind:'move',id:'keke',dir:1}),null);
s=initial();s.pieces.find(p=>p.id==='t0').x=2;s.pieces.find(p=>p.id==='t0').y=4;
assert(rules(s).rock.has('you0'));
s.pieces.find(p=>p.id==='t1').x=4;s.pieces.find(p=>p.id==='t1').y=2;assert(rules(s).rock.has('you1'));
s.pieces.find(p=>p.id==='t4').x=3;s.pieces.find(p=>p.id==='t4').y=4;assert(rules(s).rock.has('win'));assert.equal(winner(s,0),null);
s.pieces.find(p=>p.id==='r1').x=3;s.pieces.find(p=>p.id==='r1').y=4;assert.equal(winner(s,1),null);
let n=raw(s,{kind:'move',id:'r1',dir:1,pull:false});assert.equal(n.winner,0);
s=initial();s.pieces.find(p=>p.id==='t0').x=0;s.pieces.find(p=>p.id==='t0').y=3;s.pieces.find(p=>p.id==='t1').x=0;s.pieces.find(p=>p.id==='t1').y=2;assert.equal(raw(s,{kind:'move',id:'baba',dir:0}),null);
s=initial();s.pieces.find(p=>p.id==='t0').x=0;s.pieces.find(p=>p.id==='t0').y=3;
n=raw(s,{kind:'move',id:'baba',dir:1,pull:false});assert.equal(n.pieces.find(p=>p.id==='baba').x,1);
s.pieces.find(p=>p.id==='t0').x=1;s.pieces.find(p=>p.id==='t0').y=4;n=raw(s,{kind:'move',id:'baba',dir:3,pull:true});assert.equal(n,null);
s=initial();s.pieces.find(p=>p.id==='t0').x=0;s.pieces.find(p=>p.id==='t0').y=3;
n=raw(s,{kind:'move',id:'baba',dir:2,pull:true});assert.equal(n,null);
s=initial();s.pieces.find(p=>p.id==='baba').y=3;s.pieces.find(p=>p.id==='t0').x=0;s.pieces.find(p=>p.id==='t0').y=4;
n=raw(s,{kind:'move',id:'baba',dir:0,pull:true});assert.equal(n.pieces.find(p=>p.id==='t0').y,3);
s=initial();s.left=2;s.turn=2;s.start=signature(s);n=act(s,{kind:'move',id:'baba',dir:0});assert.equal(legal(n,{kind:'move',id:'baba',dir:2}),null);
s=challenge(initial());assert.equal(s.player,1);assert.equal(s.challenge.remaining,10);
console.log('Engine assertions passed: setup, control, WIN, push blocking, pull, turn reversal, challenge.');

// --- Added: stuck player loses unless they challenge (rulebook p.9, end #3)
const put=(s,id,x,y)=>{const p=s.pieces.find(p=>p.id===id);p.x=x;p.y=y;};
let st=initial();
for(const [id,x,y] of [['r1',0,0],['r2',4,4],['flag',1,3],['keke',0,2],['baba',1,2],['t2',3,0],['t3',0,1],['t0',2,1],['t4',2,2],['t5',0,3],['t1',0,4]])put(st,id,x,y);
st.player=1;st.left=2;st.turn=85;st.start=signature(st);
assert.equal(actions(st).length,0);
assert.throws(()=>concede(initial()));
assert.equal(concede(st).winner,0);
assert.equal(challenge(st).challenge.by,1);
// --- Added: identical tiles are interchangeable for the board-looks-different rule
let a=initial(),b=initial();put(b,'r1',4,4);put(b,'r2',0,0);assert.equal(signature(a),signature(b));
b=initial();put(b,'t0',0,0);assert.notEqual(signature(a),signature(b));
// --- Added: Level 1 card example, both players are ROCK; whoever acts last wins
for(const pl of [0,1]){let q=initial();put(q,'t0',2,4);put(q,'t1',4,2);put(q,'t4',3,4);put(q,'flag',0,0);put(q,'r1',1,2);put(q,'r2',2,2);q.player=pl;q.left=2;assert.equal(raw(q,{kind:'move',id:'r2',dir:3,pull:false}).winner,pl);}
// --- Added: mover shares a space with a WIN rock and pushes the other thing in the stack
let k=initial();put(k,'t0',2,4);put(k,'t4',3,4);put(k,'baba',0,2);put(k,'r1',1,2);put(k,'flag',1,2);let m=raw(k,{kind:'move',id:'baba',dir:1,pull:false});assert.equal(m.winner,0);assert.equal(m.pieces.find(p=>p.id==='flag').x,2);
// --- Added: pushing the opponent onto a WIN rock gives the opponent the win
let o=initial();put(o,'flag',3,1);put(o,'t0',2,4);put(o,'t4',3,4);put(o,'baba',0,2);put(o,'keke',1,2);put(o,'r1',2,2);assert.equal(raw(o,{kind:'move',id:'baba',dir:1,pull:false}).winner,1);
console.log('Added assertions passed: stuck/concede, identical-tile signature, tie win, WIN stacks.');
