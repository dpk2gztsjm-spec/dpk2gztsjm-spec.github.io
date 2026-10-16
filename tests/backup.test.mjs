import test from 'node:test';
import assert from 'node:assert/strict';
import {BACKUP_FORMAT,BACKUP_VERSION,createBackup,parseBackup,countRecords,backupFilename} from '../src/backup.js';
import {STORE_NAMES} from '../src/db.js';
const jpeg=Uint8Array.from([255,216,255,224,0,2,0,0,255,217]);
const blob=new Blob([jpeg],{type:'image/jpeg'});
function fixture(){
 const data=Object.fromEntries(STORE_NAMES.map(n=>[n,[]]));
 data.profiles=[{id:'me',gender:'undisclosed',handedness:'right',playNotes:'長期の目標'}];
 data.settings=[{id:'app',activeSetId:'s1',schemaVersion:1}];
 data.clubs=[{id:'c1',maker:'Sample',number:'PW',shaft:'A'}];
 data.clubSets=[{id:'s1',name:'main',clubIds:['c1']}];
 data.shots=[{id:'sh1',clubId:'c1',carryYards:53,rollYards:8}];
 data.courses=[{id:'course',name:'オリジナルコース',tees:[{id:'tee',name:'R'}]}];
 data.rounds=[{id:'round',courseId:'course',notes:'バーディ'}];
 data.roundPlayers=[{id:'player',roundId:'round',name:'同伴者'}];
 data.holeScores=[{id:'score',roundId:'round',playerId:'player',holeNumber:1,strokes:3}];
 data.photos=[{id:'photo',ownerType:'round',ownerId:'round',blob,thumbnailBlob:blob}];
 data.albumPresets=[{id:'preset',roundId:'round',color:'white'}];
 data.strategies=[{id:'strategy',ballSlope:{front:'down',side:'above'}}];
 return data;
}
const stamp='2026-10-16T12:00:00.000Z';

test('all store names included; base64 photos restored byte-identically',async()=>{
 const originals=fixture(); const encoded=await createBackup(originals,STORE_NAMES,stamp);
 assert.equal(encoded.format,BACKUP_FORMAT);assert.equal(encoded.version,BACKUP_VERSION);
 assert.equal(encoded.stores.photos[0].blob.mime,'image/jpeg');
 assert.equal(encoded.stores.photos[0].blob.base64,'/9j/4AACAAD/2Q==');
 const restored=parseBackup(JSON.parse(JSON.stringify(encoded)),STORE_NAMES);
 assert.equal(restored.counts.photos,1);
 assert.equal(restored.counts.holeScores,1);
 assert.equal(restored.stores.strategies[0].ballSlope.side,'above');
 assert.equal(restored.stores.roundPlayers[0].name,'同伴者');
 assert.deepEqual(new Uint8Array(await restored.stores.photos[0].blob.arrayBuffer()),jpeg);
 assert.deepEqual(new Uint8Array(await restored.stores.photos[0].thumbnailBlob.arrayBuffer()),jpeg);
 assert.equal(originals.photos[0].blob,blob,'export does not replace original Blob');
});
test('missing store, unknown version, duplicate IDs, orphan score rejected',async()=>{
 const encoded=await createBackup(fixture(),STORE_NAMES,stamp);
 for(const mutate of [
  x=>{delete x.stores.shots;},
  x=>{x.version=100;},
  x=>{x.stores.clubs.push({...x.stores.clubs[0]});},
  x=>{x.stores.holeScores[0].playerId='invalid';},
  x=>{x.stores.albumPresets[0].roundId='invalid';}
 ]){
  const copy=structuredClone(encoded);mutate(copy);
  assert.throws(()=>parseBackup(copy,STORE_NAMES));
 }
});
test('corrupt photo, unknown format and prototype pollution rejected',async()=>{
 const encoded=await createBackup(fixture(),STORE_NAMES,stamp);
 const invalid=structuredClone(encoded);invalid.stores.photos[0].blob.base64='AAAA';
 assert.throws(()=>parseBackup(invalid,STORE_NAMES),/破損|形式/);
 assert.throws(()=>parseBackup({format:'WRONG',version:1,stores:{}},STORE_NAMES));
 const poisoned=JSON.parse(JSON.stringify(encoded));
 poisoned.stores.clubs[0]['__proto__']={malicious:true}; // JS assignment may be inert; define a JSON key instead
 poisoned.stores.clubs[0]=JSON.parse('{"id":"c1","__proto__":{"polluted":true}}');
 assert.throws(()=>parseBackup(poisoned,STORE_NAMES),/安全/);
 assert.equal({}.polluted,undefined);
});
test('non-image content refused during export; parse disallows unsupported mime',async()=>{
 const source=fixture();source.photos[0].blob=new Blob(['NOT A JPEG'],{type:'image/jpeg'});
 await assert.rejects(()=>createBackup(source,STORE_NAMES),/形式/);
 const encoded=await createBackup(fixture(),STORE_NAMES,stamp);
 encoded.stores.photos[0].blob.mime='text/html';
 assert.throws(()=>parseBackup(encoded,STORE_NAMES));
});
test('empty collection roundtrip, counts and filename',async()=>{
 const empty=Object.fromEntries(STORE_NAMES.map(k=>[k,[]]));
 const encoded=await createBackup(empty,STORE_NAMES,stamp);
 const restored=parseBackup(encoded,STORE_NAMES);
 assert.deepEqual(restored.counts,countRecords(empty,STORE_NAMES));
 assert.equal(backupFilename(new Date(stamp)),'GOLF-JOURNAL-backup-20261016-120000.json');
});
