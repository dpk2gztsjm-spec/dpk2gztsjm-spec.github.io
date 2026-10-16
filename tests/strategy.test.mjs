import test from 'node:test';
import assert from 'node:assert/strict';
import {newStrategyDraft,cleanStrategy,validateStrategy,updateStrategyField,toggleStrategySlope,strategyRecord,describeStrategy,activeStrategyConditions,STRATEGY_STEPS,STRATEGY_OPTIONS} from '../src/strategy.js';
import {strategyFields,strategyWizardPage,strategyReviewPage,slopeText} from '../src/strategy-ui.js';
const sets=[{id:'set-1',name:'いつものセット',clubIds:Array.from({length:17},(_,i)=>`c${i}`)}];
const ctx=(draft=newStrategyDraft('set-1'),extra={})=>({draft,sets,activeSetId:'set-1',records:[],step:0,errors:{},status:'未保存',error:'',...extra});
test('7 steps cover set, distance, lie, ball slope, landing slope, wind, and other conditions',()=>{
 assert.deepEqual(STRATEGY_STEPS.map(s=>s.id),['set','distance','lie','ballSlope','targetSlope','wind','conditions']);
});
test('ball location is exactly four options, no Other',()=>assert.deepEqual(STRATEGY_OPTIONS.ballLie.map(x=>x[1]),['ティーアップ','フェアウェイ','ラフ','バンカー']));
test('new scenario defaults to active set, no personal yard inference',()=>{
 const d=newStrategyDraft('set-1');assert.equal(d.setId,'set-1');assert.equal(d.requiredCarryYards,null);assert.equal(d.ballLie,'fairway');assert.equal(d.targetYards,150);
});
test('independent ball slopes accept left-foot-down and toe-up simultaneously',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'ballSlope','front','down');d=toggleStrategySlope(d,'ballSlope','side','above');
 assert.deepEqual(d.ballSlope,{front:'down',side:'above'});assert.equal(slopeText(d.ballSlope,'ballSlope'),'左足下がり ＋ 爪先上がり');
});
test('ball front directions are exclusive and toe slope remains unchanged',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'ballSlope','front','down');d=toggleStrategySlope(d,'ballSlope','side','above');d=toggleStrategySlope(d,'ballSlope','front','up');
 assert.deepEqual(d.ballSlope,{front:'up',side:'above'});
});
test('tapping the selected ball slope deselects only its axis',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'ballSlope','front','up');d=toggleStrategySlope(d,'ballSlope','side','above');d=toggleStrategySlope(d,'ballSlope','front','up');
 assert.deepEqual(d.ballSlope,{front:null,side:'above'});
});
test('flat button clears both ball slope axes',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'ballSlope','front','up');d=toggleStrategySlope(d,'ballSlope','side','above');
 d=toggleStrategySlope(d,'ballSlope','flat','flat');assert.deepEqual(d.ballSlope,{front:null,side:null});assert.equal(slopeText(d.ballSlope,'ballSlope'),'平坦');
});
test('target landing front and side independent; inverse choices exclusive',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'targetSlope','front','away');d=toggleStrategySlope(d,'targetSlope','side','right');
 assert.deepEqual(d.targetSlope,{front:'away',side:'right'});
 d=toggleStrategySlope(d,'targetSlope','side','left');assert.deepEqual(d.targetSlope,{front:'away',side:'left'});
 d=toggleStrategySlope(d,'targetSlope','flat','flat');assert.deepEqual(d.targetSlope,{front:null,side:null});
});
test('ball and target landing slope are independent',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'ballSlope','side','below');d=toggleStrategySlope(d,'targetSlope','side','right');assert.deepEqual(d.ballSlope,{front:null,side:'below'});
});
test('slopes reject unexpected axis and invalid value',()=>{
 assert.throws(()=>toggleStrategySlope(newStrategyDraft(),'ballSlope','front','right'));
 assert.throws(()=>toggleStrategySlope(newStrategyDraft(),'unlisted','front','up'));
});
test('field updates keep other values and user club set unchanged',()=>{
 const base=newStrategyDraft('set-1');const next=updateStrategyField(base,'wind.direction','head');
 assert.equal(base.wind.direction,'unknown');assert.equal(next.wind.direction,'head');assert.equal(next.setId,'set-1');
});
test('unknown schema fields are rejected',()=>assert.throws(()=>updateStrategyField(newStrategyDraft(),'__proto__.pollute',1)));
test('rough detail and bunker detail exist in schema',()=>{
 let d=newStrategyDraft();d=updateStrategyField(d,'ballLie','rough');d=updateStrategyField(d,'rough.depth','deep');assert.equal(d.rough.depth,'deep');
 d=updateStrategyField(d,'ballLie','bunker');d=updateStrategyField(d,'bunker.hardness','hard');assert.equal(d.bunker.hardness,'hard');
 assert.equal(activeStrategyConditions(d).rough,null);assert.equal(activeStrategyConditions(d).bunker.hardness,'hard');
});
test('missing carry remains null while zero carry is a numeric value',()=>{
 const d=newStrategyDraft();assert.equal(cleanStrategy(d).requiredCarryYards,null);d.requiredCarryYards='0';assert.equal(cleanStrategy(d).requiredCarryYards,0);
});
test('validate total distance as integer 1-600yd',()=>{
 for(const bad of [-1,0,601,1.5,'']){const d=newStrategyDraft();d.targetYards=bad;assert.ok(validateStrategy(d).targetYards,String(bad));}
});
test('validate carry only if entered and less or equal to total',()=>{
 const d=newStrategyDraft();d.requiredCarryYards=200;assert.ok(validateStrategy(d).requiredCarryYards);
 d.requiredCarryYards=100;assert.equal(validateStrategy(d).requiredCarryYards,undefined);
});
test('validate bunker lip cm and signed elevation yardages',()=>{
 const d=newStrategyDraft();d.bunker.lipCm=501;d.elevationYards=-201;
 assert.ok(validateStrategy(d)['bunker.lipCm']);assert.ok(validateStrategy(d).elevationYards);
});
test('validate references for deleted sets',()=>assert.ok(validateStrategy(newStrategyDraft('missing'),sets).setId));
test('valid scenario record carries stable ID and timestamps',()=>{
 const d=newStrategyDraft('set-1');const a=strategyRecord(d,{id:'one',createdAt:'2026-10-01T00:00:00Z'});
 const b=strategyRecord({...d,targetYards:170},{id:a.id,createdAt:a.createdAt});
 assert.equal(a.id,b.id);assert.equal(a.createdAt,b.createdAt);assert.equal(b.targetYards,170);assert.equal(b.schemaVersion,1);
});
test('untrusted enum values cannot be persisted',()=>{
 const d={...newStrategyDraft(),ballLie:'unknown',wind:{direction:'nonsense',strength:'strong'},ballSlope:{front:'right',side:'above'},targetSlope:{front:'right',side:'down'}};
 const cleaned=cleanStrategy(d);assert.equal(cleaned.ballLie,'fairway');assert.deepEqual(cleaned.ballSlope,{front:null,side:'above'});assert.deepEqual(cleaned.targetSlope,{front:null,side:null});
});
test('notes are trimmed and bounded to 240 chars',()=>{
 const d=newStrategyDraft();d.obstacles=' '.repeat(3)+'a'.repeat(300);assert.equal(cleanStrategy(d).obstacles.length,240);
});
test('set description remains meaningful even when club set is not selected',()=>assert.match(describeStrategy(newStrategyDraft(),sets),/セット未指定/));
test('wizard UI displays 7-step progress and next',()=>{
 const html=strategyWizardPage(ctx());assert.match(html,/STEP 01 \/ 07/);assert.match(html,/次へ/);assert.match(html,/現在のバッグ/);
});
test('wizard can display slope combos in controls',()=>{
 let d=newStrategyDraft('set-1');d=toggleStrategySlope(d,'ballSlope','front','down');d=toggleStrategySlope(d,'ballSlope','side','above');
 const html=strategyWizardPage(ctx(d,{step:3}));assert.match(html,/左足下がり ＋ 爪先上がり/);assert.match(html,/aria-pressed="true"/);assert.match(html,/平坦に戻す/);
});
test('landing slope distinguishes away/right combination',()=>{
 let d=newStrategyDraft();d=toggleStrategySlope(d,'targetSlope','front','away');d=toggleStrategySlope(d,'targetSlope','side','right');assert.match(strategyFields(4,ctx(d)),/奥下がり ＋ 右下がり/);
});
test('conditionally show rough fields only for rough',()=>{
 let d=newStrategyDraft();assert.doesNotMatch(strategyFields(2,ctx(d)),/芝の深さ/);
 d.ballLie='rough';assert.match(strategyFields(2,ctx(d)),/芝の深さ/);assert.doesNotMatch(strategyFields(2,ctx(d)),/砂の硬さ/);
});
test('conditionally show bunker fields only for bunker',()=>{
 let d=newStrategyDraft();d.ballLie='bunker';assert.match(strategyFields(2,ctx(d)),/砂の硬さ/);assert.doesNotMatch(strategyFields(2,ctx(d)),/芝の深さ/);
});
test('review shows each step editable and exact button text',()=>{
 const html=strategyReviewPage(ctx());assert.match(html,/攻略案を見る/);assert.match(html,/data-strategy-field="targetYards"/);assert.equal((html.match(/strategy-review-section/g)||[]).length,7);
});
test('strategy review correctly offers result computation after input check',()=>{const html=strategyReviewPage(ctx());assert.match(html,/攻略案を見る/);});
