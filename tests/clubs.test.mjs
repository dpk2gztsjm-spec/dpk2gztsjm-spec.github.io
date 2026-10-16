import test from 'node:test';
import assert from 'node:assert/strict';
import {CLUB_CATEGORIES,IRON_NUMBERS,cleanClub,validateClub,cleanIronSet,validateIronSet,buildIronSet,categoryForIronNumber,matchClubs} from '../src/clubs.js';

const valid = {category:'iron',maker:'PING',model:'i230',number:'7',loftDeg:'33',releaseYear:'2022',shaft:'N.S.PRO',notes:'練習用'};

test('six categories, iron numbers, and wedge-classified set additions',()=>{
  assert.equal(CLUB_CATEGORIES.length,6);
  assert.ok(IRON_NUMBERS.includes('PW'));
  assert.equal(categoryForIronNumber('PW'),'iron');
  assert.equal(categoryForIronNumber('SW'),'wedge');
});
test('single club data are typed, independent, and not auto-estimated',()=>{
  const c=cleanClub(valid);
  assert.equal(c.releaseYear,2022);assert.equal(c.loftDeg,33);assert.deepEqual(validateClub(c),{});
  const empty=cleanClub({...valid,loftDeg:'',releaseYear:''});
  assert.equal(empty.loftDeg,null);assert.equal(empty.releaseYear,null);
  assert.ok(!('carry' in empty));
});
test('mandatory fields and boundaries',()=>{
  const c=cleanClub({category:'',maker:' ',model:'',number:' ',loftDeg:'99',releaseYear:'1999.5'});
  const errors=validateClub(c);
  for(const x of ['category','maker','model','number','loftDeg','releaseYear']) assert.ok(errors[x],x);
  assert.deepEqual(validateClub(cleanClub({...valid,loftDeg:'0',releaseYear:'1900'})),{});
  assert.deepEqual(validateClub(cleanClub({...valid,loftDeg:'90',releaseYear:'2100'})),{});
});
test('iron set requires selected numbers and creates distinct physical items',()=>{
  const data=cleanIronSet(valid,['5','7','PW','SW','SW','unexpected']);
  assert.deepEqual(data.selected,['5','7','PW','SW']);
  assert.deepEqual(validateIronSet(data.base,data.selected),{});
  assert.ok(validateIronSet(data.base,{}).selected);
  let id=0;
  const rows=buildIronSet(data.base,data.selected,{5:'25',PW:'45'},()=>`club-${++id}`,'2026-10-16T00:00:00Z');
  assert.deepEqual(rows.map(x=>x.id),['club-1','club-2','club-3','club-4']);
  assert.deepEqual(rows.map(x=>x.category),['iron','iron','iron','wedge']);
  assert.equal(rows[0].loftDeg,25);
  assert.equal(rows[1].loftDeg,null);
  assert.equal(rows[2].loftDeg,45);
  assert.equal(rows[0].registeredAsSet,true);
});
test('searches saved clubs by model maker, shaft, number and category',()=>{
  const a={...cleanClub(valid),id:'a'},b={...cleanClub({...valid,model:'Blade',maker:'Mizuno',category:'wedge',number:'SW'}),id:'b'};
  assert.equal(matchClubs([a,b],'mizuno').length,1);
  assert.equal(matchClubs([a,b],'NS.PRO').length,0);
  assert.equal(matchClubs([a,b],'n.s.pro').length,2);
  assert.equal(matchClubs([a,b],'','iron').length,1);
  assert.equal(matchClubs([a,b],'','wedge').length,1);
});
test('separate identical models are valid (no forced deduplication)',()=>{
  const a=cleanClub(valid),b=cleanClub(valid);
  assert.deepEqual(validateClub(a),{});
  assert.deepEqual(validateClub(b),{});
});
