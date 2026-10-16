import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSet,validateSet,getSetClubs,countMissingClubs,clubGroups,setClubCount,isOverLimit,copyName,newSetId} from '../src/sets.js';
const clubs=Array.from({length:17},(_,i)=>({id:`c${i+1}`,category:i<12?'iron':'putter',maker:'Test',model:'A',number:String(i+1)}));
test('sets are separate physical ID lists and not model-name lists',()=>{
  const set=cleanSet({name:'  普段のセット  ',clubIds:['c1','c1','c2','not-owned']},clubs);
  assert.deepEqual(set,{name:'普段のセット',clubIds:['c1','c2']});
  assert.deepEqual(getSetClubs(set,clubs).map(c=>c.id),['c1','c2']);
});
test('different saved sets may reuse one owned physical club',()=>{
  const a=cleanSet({name:'A',clubIds:['c1','c2']},clubs);
  const b=cleanSet({name:'B',clubIds:['c1','c3']},clubs);
  assert.equal(a.clubIds.includes('c1') && b.clubIds.includes('c1'),true);
});
test('sets require a valid name, but may be empty editable drafts',()=>{
  assert.ok(validateSet({name:' ',clubIds:[]}).name);
  assert.ok(validateSet({name:'X'.repeat(61),clubIds:[]}).name);
  assert.deepEqual(validateSet({name:'練習用',clubIds:[]}),{});
  assert.ok(validateSet({name:'OK',clubIds:['a','a']}).clubIds);
});
test('14 clubs is informational, 15 and 17 are allowed',()=>{
  const fourteen={clubIds:clubs.slice(0,14).map(x=>x.id)};
  const fifteen={clubIds:clubs.slice(0,15).map(x=>x.id)};
  const seventeen={clubIds:clubs.map(x=>x.id)};
  assert.equal(setClubCount(fourteen),14);assert.equal(isOverLimit(fourteen),false);
  assert.equal(setClubCount(fifteen),15);assert.equal(isOverLimit(fifteen),true);
  assert.equal(setClubCount(seventeen),17);assert.equal(isOverLimit(seventeen),true);
});
test('duplicates are one count rather than fake multiple physical clubs',()=>{
  assert.equal(setClubCount({clubIds:['c1','c1','c2']}),2);
});
test('deleted club becomes absent from saved set until pruned',()=>{
  assert.equal(countMissingClubs({clubIds:['c1','gone','c2']},clubs),1);
  assert.equal(getSetClubs({clubIds:['gone','c3']},clubs).length,1);
});
test('grouped display preserves categories and individual objects',()=>{
  const groups=clubGroups(clubs);assert.equal(groups.length,2);
  assert.equal(groups[0].clubs.length,12);assert.equal(groups[1].clubs.length,5);
});
test('escaped display data is not mistaken for a normal club name',()=>{
  const set=cleanSet({name:'<svg onload=alert(1)>',clubIds:['c1']},clubs);
  assert.match(set.name,/</); // UI must escape it, domain stores the user text
});
test('duplicate name length respects 60-character cap',()=>{
  assert.ok(copyName('x'.repeat(60)).length<=60);
});
test('set IDs are unique and not derived from model names',()=>{
  assert.notEqual(newSetId(),newSetId());
});
