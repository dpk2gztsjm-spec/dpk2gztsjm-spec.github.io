import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SHOT,SHOT_TYPES,BACKSWINGS,REFERENCE_SHOTS,cleanShot,validateShot,shotTypeLabel,backswingLabel,shotDataCategory,yards,newShotId} from '../src/shots.js';
const clubs=[{id:'pw-1',maker:'PING',model:'i230',number:'PW'},{id:'pw-2',maker:'PING',model:'i230',number:'PW'}];
const blank={...DEFAULT_SHOT,clubId:'pw-1',name:'PW ハーフ',type:'pitch',backswing:'50'};
const good=()=>cleanShot(blank);
test('all ten types and six backswing modes including free text',()=>{
  assert.equal(SHOT_TYPES.length,10);assert.deepEqual(BACKSWINGS.map(x=>x.value),['25','50','75','100','clock','other']);
  assert.equal(REFERENCE_SHOTS.every(x=>!('yards' in x)),true);
});
test('one physical club supports multiple independent shot profiles',()=>{
  const a=cleanShot(blank);
  const b=cleanShot({...blank,name:'PW 80%',backswing:'other',customBackswing:'テークバック80%'});
  assert.deepEqual(validateShot(a,clubs),{});
  assert.deepEqual(validateShot(b,clubs),{});
  assert.notEqual(a.name,b.name);assert.equal(a.clubId,b.clubId);
  assert.equal(backswingLabel(a),'50%');assert.equal(backswingLabel(b),'テークバック80%');
});
test('optional missing distances are null and never guessed from backswing',()=>{
  const shot=good(); assert.equal(shot.carryYards,null);assert.equal(shot.rollYards,null);
  assert.equal(yards(shot.carryYards),'未登録');assert.equal(shotDataCategory(shot),'unmeasured');
  assert.deepEqual(validateShot(shot,clubs),{});
});
test('measured distance needs observed yardage and supports partial data',()=>{
  const invalid=cleanShot({...blank,distanceSource:'measured'});
  assert.match(validateShot(invalid,clubs).distanceSource,/実測/);
  const valid=cleanShot({...blank,distanceSource:'measured',carryYards:'48.5',rollYards:''});
  assert.deepEqual(validateShot(valid,clubs),{});assert.equal(valid.carryYards,48.5);assert.equal(valid.rollYards,null);
  assert.equal(shotDataCategory(valid),'measured');
  const declared=cleanShot({...blank,distanceSource:'unmeasured',carryYards:'50'});
  assert.equal(shotDataCategory(declared),'unmeasured');
});
test('zero yards is distinct from missing and negative/NaN/too many decimals rejected',()=>{
  const zero=cleanShot({...blank,carryYards:'0',rollYards:'0'});
  assert.equal(zero.carryYards,0);assert.equal(yards(zero.rollYards),'0 yd');
  assert.deepEqual(validateShot(zero,clubs),{});
  for(const v of ['-1','1000.2','1.23','not-a-number']){
    const bad=cleanShot({...blank,carryYards:v});assert.ok(validateShot(bad,clubs).carryYards,v);
  }
});
test('other shot type requires custom text and stale custom type clears',()=>{
  const other=cleanShot({...blank,type:'other',customType:''});assert.ok(validateShot(other,clubs).customType);
  const filled=cleanShot({...blank,type:'other',customType:'低いフェード'});
  assert.deepEqual(validateShot(filled,clubs),{});assert.equal(shotTypeLabel(filled),'低いフェード');
  assert.equal(cleanShot({...filled,type:'chip'}).customType,'');
});
test('clock and other backswing modes require distinct free-text description',()=>{
  for(const mode of ['clock','other']){
    const partial=cleanShot({...blank,backswing:mode,customBackswing:''});assert.ok(validateShot(partial,clubs).customBackswing);
  }
  const clock=cleanShot({...blank,backswing:'clock',customBackswing:'9時〜3時'});
  assert.deepEqual(validateShot(clock,clubs),{});assert.equal(backswingLabel(clock),'時計式：9時〜3時');
});
test('missing club ID, empty name, wrong type invalid; same-model club IDs distinguished',()=>{
  assert.ok(validateShot(cleanShot({...blank,clubId:'unknown'}),clubs).clubId);
  assert.ok(validateShot(cleanShot({...blank,name:''}),clubs).name);
  assert.ok(validateShot(cleanShot({...blank,type:'wrong'}),clubs).type);
  assert.deepEqual(validateShot(cleanShot({...blank,clubId:'pw-2'}),clubs),{});
});
test('optional details are trimmed and retained without any estimated yards',()=>{
  const details=cleanShot({...blank,weightDistribution:' 左6：右4 ',ballPosition:' 中央より右 ',faceDirection:'スクエア',notes:'練習メモ',lieConditions:'無風',distanceVariability:'±5yd'});
  assert.equal(details.weightDistribution,'左6：右4');assert.equal(details.notes,'練習メモ');
  assert.equal(details.carryYards,null);assert.deepEqual(validateShot(details,clubs),{});
});
test('input text length bounds and script-like text are safe to validate for UI encoding',()=>{
  assert.ok(validateShot(cleanShot({...blank,name:'A'.repeat(61)}),clubs).name);
  assert.ok(validateShot(cleanShot({...blank,notes:'X'.repeat(1001)}),clubs).notes);
  assert.equal(cleanShot({...blank,name:'<img src=x onerror=alert(1)>'}).name,'<img src=x onerror=alert(1)>');
});
test('new profile IDs are opaque and unique',()=>{
  const a=newShotId();const b=newShotId();assert.notEqual(a,b);assert.ok(a.length>10);
});
