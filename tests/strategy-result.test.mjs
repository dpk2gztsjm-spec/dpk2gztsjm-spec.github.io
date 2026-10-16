import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendStrategy,candidateDistance,STRATEGY_RESULT_LIMIT} from '../src/strategy-engine.js';
import {strategyResultPage} from '../src/strategy-result-ui.js';
import {newStrategyDraft} from '../src/strategy.js';
const c1={id:'c1',category:'wedge',maker:'Sample',model:'Wedge X',number:'PW'};
const c2={id:'c2',category:'iron',maker:'Sample',model:'Iron 9',number:'9I'};
const c3={id:'c3',category:'wedge',maker:'Sample',model:'Wedge Y',number:'SW'};
const clubs=[c1,c2,c3];
const sets=[{id:'set1',name:'普段のバッグ',clubIds:['c1','c2','c3']},{id:'set2',name:'PWだけ',clubIds:['c1']}];
const shot=(id,clubId,type,carryYards,rollYards,extra={})=>({id,clubId,type,name:id,backswing:'75',carryYards,rollYards,distanceSource:'measured',...extra});
const shots=[shot('PW 70','c1','pitch',65,5),shot('PW low','c1','chip',20,50),shot('9I 70','c2','running',30,40),shot('SW 70','c3','pitch',67,3)];
const draft=()=>({...newStrategyDraft('set1'),targetYards:70,requiredCarryYards:null});
const result=(scenario=draft(),opts={})=>recommendStrategy({scenario,sets,clubs,shots,handedness:'right',...opts});
const ctx=(scenario=draft(),extra={})=>({draft:scenario,sets,clubs,shots,expandedAlt:null,addressView:'front',handedness:'right',...extra});
test('can only recommend physical clubs from the specifically selected set',()=>{
 const r=result({...draft(),setId:'set2'});assert.ok(r.candidates.length>0);assert.ok(r.candidates.every(x=>x.clubId==='c1'));
});
test('keeps original active-bag settings unchanged',()=>{
 const orig=structuredClone(sets);result({...draft(),setId:'set2'});assert.deepEqual(sets,orig);
});
test('at most three candidates (best and two alternatives)',()=>{
 const r=result();assert.equal(r.candidates.length,STRATEGY_RESULT_LIMIT);assert.equal(r.candidates[0].distance.total,70);
});
test('two shots on one club are independent candidates',()=>{
 const r=result();const own=r.candidates.filter(c=>c.clubId==='c1');assert.ok(own.length>=1);assert.ok(new Set(r.candidates.map(c=>c.id)).size===r.candidates.length);
});
test('measured distance arithmetic is copied exactly and never inferred from swing percent',()=>{
 assert.deepEqual(candidateDistance(shots[0]),{carry:65,roll:5,total:70,measured:true,complete:true});
});
test('carry-only measured distance cannot produce fabricated total',()=>{
 const d=candidateDistance(shot('p','c1','pitch',72,null));assert.equal(d.total,null);assert.equal(d.roll,null);assert.equal(d.carry,72);
});
test('roll-only measured shot is not an invented total distance',()=>{
 const d=candidateDistance(shot('p','c1','pitch',null,5));assert.equal(d.total,null);assert.equal(d.carry,null);
});
test('numeric values with unmeasured provenance are excluded from distance calculations',()=>{
 const d=candidateDistance(shot('p','c1','pitch',85,3,{distanceSource:'unmeasured'}));assert.equal(d.total,null);assert.equal(d.carry,null);
});
test('do not treat no-data 75-percent swing as 75-percent carry',()=>{
 const r=result(draft(),{shots:[shot('s','c1','pitch',null,null,{distanceSource:'unmeasured',backswing:'75'})]});
 assert.equal(r.candidates[0].distance.total,null);
});
test('measured carry below hard minimum is disqualified, even if total fits',()=>{
 const s={...draft(),requiredCarryYards:64};const r=result(s);assert.ok(r.candidates.every(c=>c.distance.carry===null||c.distance.carry>=64));
 assert.ok(!r.candidates.some(c=>c.shotId==='PW low'));
});
test('missing measured carry with a carry requirement produces an explicit risk',()=>{
 const s={...draft(),requiredCarryYards:45};const r=result(s,{shots:[shot('Unverified','c1','pitch',null,null,{distanceSource:'unmeasured'})]});
 assert.match(r.candidates[0].risks.join(' '),/必要キャリーを越える裏付けがない/);
});
test('dramatically mismatched measured shots are filtered',()=>{
 const r=result(draft(),{shots:[shot('huge','c1','full',290,55)]});assert.ok(!r.candidates.some(c=>c.shotId==='huge'));
});
test('greenside plugged bunker allows only wedge bunker shots',()=>{
 const s={...draft(),ballLie:'bunker',bunker:{type:'greenside',lie:'plugged',hardness:'unknown',moisture:'unknown',lipCm:30}};
 const r=result(s,{shots:[...shots,shot('Bunker blast','c3','bunker',50,20)]});assert.ok(r.candidates.length===1);assert.equal(r.candidates[0].shotName,'Bunker blast');
});
test('ordinary bunker shot is not proposed for fairway',()=>{
 const r=result(draft(),{shots:[shot('sand','c1','bunker',60,10)]});assert.ok(r.candidates.every(c=>c.shotType!=='bunker'));
});
test('lob is filtered for buried deep rough',()=>{
 const s={...draft(),ballLie:'rough',rough:{depth:'deep',ball:'buried',resistance:'heavy'}};
 const r=result(s,{shots:[shot('lobbed','c1','lob',65,5),shots[1]]});assert.ok(!r.candidates.some(c=>c.shotId==='lobbed'));
});
test('reference shots never claim yardages',()=>{
 const r=result(draft(),{shots:[]});assert.ok(r.candidates.length>0);
 assert.ok(r.candidates.every(c=>c.reference&&c.distance.total===null&&c.dataKind==='一般的な参考例'));
});
test('invalid scenario returns validation errors and no suggestion',()=>{
 const r=result({...draft(),targetYards:-15});assert.equal(r.candidates.length,0);assert.ok(r.errors.targetYards);
});
test('unknown set produces no advice; no clubs in set produces no advice',()=>{
 const s={...draft(),setId:null};assert.equal(result(s).candidates.length,0);
 const r=result({...draft(),setId:'set1'},{clubs:[]});assert.equal(r.candidates.length,0);
});
test('ball slope both axes informs caution and stance, no yard correction',()=>{
 const s={...draft(),ballSlope:{front:'down',side:'above'}};
 const r=result(s);assert.match(r.candidates[0].address.notes.join(' '),/左足下がり/);assert.match(r.candidates[0].address.notes.join(' '),/爪先上がり/);
 assert.equal(r.candidates[0].distance.total,70);
});
test('target slope both axes informs caution',()=>{
 const s={...draft(),targetSlope:{front:'away',side:'right'}};const r=result(s);
 assert.match(r.candidates[0].risks.join(' '),/ラン/);
});
test('wind/elevation/hazards add cautions, do not numerically modify distance',()=>{
 const s={...draft(),wind:{direction:'head',strength:'strong'},elevationYards:9,hazards:'水辺とOB'};
 const r=result(s);assert.equal(r.candidates[0].distance.total,70);
 assert.match(r.candidates[0].risks.join(' '),/風/);assert.match(r.candidates[0].risks.join(' '),/高低差/);
});
test('left handed profile is propagated into visualization hints',()=>{
 const r=result(draft(),{handedness:'left'});assert.equal(r.candidates[0].address.hand,'左打ち');
});
test('shot-specific registered stance and face override the general instructional guidance',()=>{
 const x={...shots[0],stanceWidth:'細め',faceDirection:'スクエアを意識',keyPoints:'足元を確認'};
 const r=result(draft(),{shots:[x]});assert.equal(r.candidates[0].address.stance,'細め');assert.equal(r.candidates[0].address.face,'スクエアを意識');
});
test('result HTML shows first and alternate cards, draw both views, review action and tips link',()=>{
 const h=strategyResultPage(ctx());assert.match(h,/第一候補/);assert.match(h,/代替案 01/);assert.match(h,/代替案 02/);
 assert.match(h,/TOP VIEW/);assert.match(h,/データの種類|本人の実測値/);assert.match(h,/data-strategy-tip/);
 assert.match(h,/条件を修正する/);assert.match(h,/正面/);assert.match(h,/上空/);
});
test('expand a selected alternative shows details; other alternatives remain compact',()=>{
 const h=strategyResultPage(ctx(draft(),{expandedAlt:1}));assert.match(h,/data-strategy-result-action="expand" data-index="1"/);
 assert.ok((h.match(/class="sr10-details"/g)||[]).length===2);
});
test('view switch draws top address geometry and left-handed caption',()=>{
 const h=strategyResultPage(ctx(draft(),{addressView:'top',handedness:'left'}));assert.match(h,/上空 \/ 左打ち/);assert.match(h,/scale\(-1,1\)/);
});
test('no club produces a real empty state, not fabricated recommendation',()=>{
 const h=strategyResultPage(ctx(draft(),{clubs:[]}));assert.match(h,/確かな候補を表示できません/);assert.doesNotMatch(h,/BEST MATCH/);
});
test('untrusted personal text is HTML-escaped in result',()=>{
 const dirty=shot('<img src=x onerror=alert(1)>','c1','pitch',65,5,{keyPoints:'<script>bad</script>'});
 const h=strategyResultPage(ctx(draft(),{shots:[dirty],clubs:[c1],sets:[{id:'set1',name:'<script>x</script>',clubIds:['c1']}]}));
 assert.doesNotMatch(h,/<script>/);assert.doesNotMatch(h,/<img src/);assert.match(h,/&lt;script&gt;/);
});
