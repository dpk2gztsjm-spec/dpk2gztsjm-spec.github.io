import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanProfile,escapeHtml,GENDERS,HANDEDNESS,isProfileComplete,normalizeRoute,profileSummary,validateProfile} from '../src/domain.js';

test('gender options include undisclosed and no proficiency field',()=>{
  assert.deepEqual(GENDERS.map(x=>x.value),['male','female','undisclosed']);
  assert.deepEqual(HANDEDNESS.map(x=>x.value),['right','left']);
  assert.ok(!Object.hasOwn(cleanProfile({gender:'male',handedness:'right',level:'advanced'}),'level'));
});
test('required values are required',()=>{
  const errors=validateProfile(cleanProfile({}));
  assert.ok(errors.gender); assert.ok(errors.handedness);
});
test('valid required fields allow empty optional fields',()=>{
  const p=cleanProfile({gender:'undisclosed',handedness:'left'});
  assert.equal(p.heightCm,null);assert.equal(p.handicap,null);
  assert.deepEqual(validateProfile(p),{});
  assert.ok(isProfileComplete(p));
});
test('optional height and handicap are parsed numerically',()=>{
  const p=cleanProfile({gender:'male',handedness:'right',heightCm:'175.5',handicap:'12.3'});
  assert.equal(p.heightCm,175.5);assert.equal(p.handicap,12.3);
  assert.deepEqual(validateProfile(p),{});
});
test('valid plus handicap is not silently rejected',()=>{
  const p=cleanProfile({gender:'female',handedness:'right',handicap:'-2.5'});
  assert.equal(p.handicap,-2.5);assert.deepEqual(validateProfile(p),{});
});
test('invalid gender and handedness are rejected',()=>{
  const p=cleanProfile({gender:'something',handedness:'both'});
  assert.ok(validateProfile(p).gender);assert.ok(validateProfile(p).handedness);
});
test('height boundaries and NaN are rejected',()=>{
  for(const val of ['abc','99','231']){
    const p=cleanProfile({gender:'male',handedness:'right',heightCm:val});
    assert.ok(validateProfile(p).heightCm);
  }
});
test('handicap boundaries are rejected',()=>{
  for(const val of ['-10.1','54.1','x']){
    const p=cleanProfile({gender:'male',handedness:'right',handicap:val});
    assert.ok(validateProfile(p).handicap);
  }
});
test('notes are trimmed and capped at 280 chars',()=>{
  const p=cleanProfile({gender:'male',handedness:'left',playNotes:'  '+('日'.repeat(300))+'  '});
  assert.equal(p.playNotes.length,280);
});
test('profile summary does not guess measurements',()=>{
  const value=profileSummary(cleanProfile({gender:'undisclosed',handedness:'left'}));
  assert.equal(value.gender,'回答しない'); assert.equal(value.handedness,'左打ち');
  assert.equal(value.height,'未登録');assert.equal(value.handicap,'未登録');
});
test('all nav routes and fallback are supported',()=>{
  for(const route of ['home','courses','tips','strategy','records','clubs','sets','shots','profile']) assert.equal(normalizeRoute('#'+route),route);
  assert.equal(normalizeRoute('#nonexistent'),'home');
  assert.equal(normalizeRoute(''),'home');
});
test('html special characters are escaped',()=>{
  assert.equal(escapeHtml(`<img src='x' onerror="a()">`),'&lt;img src=&#39;x&#39; onerror=&quot;a()&quot;&gt;');
});
