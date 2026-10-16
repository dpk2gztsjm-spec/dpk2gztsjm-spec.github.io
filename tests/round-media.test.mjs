import test from 'node:test';
import assert from 'node:assert/strict';
import {roundPhotosFor,moveRoundPhoto,validateRoundNotes,MAX_ROUND_PHOTOS} from '../src/round-media.js';
const p=(id,order,ownerId='x')=>({id,order,ownerType:'round',ownerId,createdAt:'2026-10-16'});
test('photos are isolated to their round and sorted by order',()=>{
 const sorted=roundPhotosFor([p('c',2),p('b',0),p('a',1),p('foreign',-1,'y'),{id:'cover',ownerType:'course',ownerId:'x'}],'x');
 assert.deepEqual(sorted.map(x=>x.id),['b','a','c']);
});
test('photo reorder moves one position and preserves other IDs',()=>{
 const photos=[p('a',0),p('b',1),p('c',2)];
 assert.deepEqual(moveRoundPhoto(photos,'b',-1),['b','a','c']);
 assert.deepEqual(moveRoundPhoto(photos,'b',1),['a','c','b']);
 assert.deepEqual(moveRoundPhoto(photos,'a',-1),['a','b','c']);
 assert.deepEqual(moveRoundPhoto(photos,'absent',1),['a','b','c']);
});
test('memo accepts multiline Japanese but enforces its bound',()=>{
 assert.equal(validateRoundNotes('17番でバーディー\n青空が美しい'),'17番でバーディー\n青空が美しい');
 assert.equal(validateRoundNotes(''), '');
 assert.throws(()=>validateRoundNotes('x'.repeat(5001)),/5000/);
 assert.throws(()=>validateRoundNotes({foo:'bar'}),/文字列/);
 assert.equal(MAX_ROUND_PHOTOS,24);
});
