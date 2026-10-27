import assert from 'node:assert/strict';
import {initial,act,challenge,concede,signature,actions,restore} from './engine.mjs';
import {chooseAI} from './ai.mjs';
const put=(s,id,x,y)=>Object.assign(s.pieces.find(p=>p.id===id),{x,y});
const play=(s,plan)=>plan.reduce((n,a)=>a.kind==='challenge'?challenge(n):a.kind==='concede'?concede(n):act(n,a),s);
const prepare=s=>{s.left=2;s.turn=4;s.start=signature(s);return s;};
// A direct win is never traded for positional material or another whole turn.
let s=initial();put(s,'t0',2,4);put(s,'t4',3,4);put(s,'baba',1,2);put(s,'r1',2,2);prepare(s);let result=chooseAI(s,{timeMs:1500});assert.equal(play(s,result.plan).winner,0);assert.equal(result.plan.length,1);
// Winning by building a rule and then moving needs both actions of one turn.
s=initial();put(s,'t0',0,2);put(s,'baba',1,3);put(s,'r1',2,3);prepare(s);result=chooseAI(s,{timeMs:2000});assert.equal(play(s,result.plan).winner,0);assert.equal(result.plan.length,2);
// The opponent threatens a two-action win. The AI must use its own turn to
// break the rule rather than leave the opponent's immediate winning turn.
s=initial();put(s,'t2',0,1);put(s,'t4',1,1);put(s,'flag',4,2);put(s,'keke',4,0);put(s,'baba',1,3);prepare(s);
result=chooseAI(s,{timeMs:3500});const defended=play(s,result.plan),reply=chooseAI(defended,{timeMs:2000,maxTurns:1});assert.notEqual(play(defended,reply.plan).winner,1);console.log('Defence search:',result.stats,result.plan);
// Ordinary search completes three full turns (up to six individual actions),
// counting at the turn boundary rather than changing players after one action.
s=initial();prepare(s);result=chooseAI(s,{timeMs:3500});assert.equal(result.stats.completedTurns,3);const end=play(s,result.plan);assert.equal(end.player,1);assert.equal(end.left,2);assert.equal(result.plan.length,2);
// Search must not alter the board or consume actual actions in its input.
const before=JSON.stringify(s);chooseAI(s,{timeMs:100});assert.equal(JSON.stringify(s),before);
// An interrupted/reloaded AI can continue the last action of its current turn.
s=act(s,actions(s)[0]);result=chooseAI(s,{timeMs:1000});assert.equal(result.plan.length,1);assert.equal(play(s,result.plan).player,1);
// Stuck players may challenge rather than be assigned an invented illegal move.
s=initial();for(const [id,x,y]of [['r1',0,0],['r2',4,4],['flag',1,3],['keke',0,2],['baba',1,2],['t2',3,0],['t3',0,1],['t0',2,1],['t4',2,2],['t5',0,3],['t1',0,4]])put(s,id,x,y);Object.assign(s,{player:1,left:2,turn:85});s.start=signature(s);assert.equal(actions(s).length,0);result=chooseAI(s,{timeMs:300});assert.equal(result.plan[0].kind,'challenge');assert.equal(play(s,result.plan).challenge.by,1);
// A short time budget still returns a valid complete turn, not a partial plan.
s=initial();prepare(s);result=chooseAI(s,{timeMs:20});assert.equal(play(s,result.plan).player,1);
const old=initial();delete old.controllers;assert.deepEqual(restore(old).controllers,['human','human']);
console.log('AI assertions passed: immediate win, two-action win, defence, three-turn depth, source immutability, mid-turn resume, challenge and time-limit fallback.');
// Variation must change real board positions, not merely interchangeable ids.
const openingBoards=new Set();
for(let seed=0;seed<10;seed++){
 const opening=initial(),answer=chooseAI(opening,{seed,timeMs:3500});openingBoards.add(signature(play(opening,answer.plan)));
 // Every seed must take a one-action win immediately.
 const win=initial();put(win,'t0',2,4);put(win,'t4',3,4);put(win,'baba',1,2);put(win,'r1',2,2);prepare(win);const winning=chooseAI(win,{seed,timeMs:2000});assert.equal(winning.plan.length,1);assert.equal(play(win,winning.plan).winner,0);
 // Every seed must still answer the known opponent threat.
 const danger=initial();put(danger,'t2',0,1);put(danger,'t4',1,1);put(danger,'flag',4,2);put(danger,'keke',4,0);put(danger,'baba',1,3);prepare(danger);const defence=chooseAI(danger,{seed,timeMs:3500}),safe=play(danger,defence.plan),enemy=chooseAI(safe,{seed,timeMs:2000,maxTurns:1});assert.notEqual(play(safe,enemy.plan).winner,1);
}
assert(openingBoards.size>1,'AI must produce more than one distinct opening board.');
const replayA=chooseAI(initial(),{seed:12345,timeMs:3500}),replayB=chooseAI(initial(),{seed:12345,timeMs:3500});assert.deepEqual(replayA.plan,replayB.plan);
console.log('Variation checks passed:',openingBoards.size,'distinct openings; immediate wins, defence and seeded replay preserved.');
