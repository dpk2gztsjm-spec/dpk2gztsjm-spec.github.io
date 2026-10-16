import test from 'node:test';
import assert from 'node:assert/strict';
import {DB_NAME, DB_VERSION, getProfile, getRecord, ensureSettings, putRecord, saveProfile} from '../src/db.js';

function createMockIndexedDB() {
  const stores = new Map();
  let dbInstance;
  const db = {
    objectStoreNames: {contains:name=>stores.has(name)},
    createObjectStore(name) {stores.set(name,new Map());},
    close() {},
    transaction(name, mode) {
      if (!stores.has(name)) throw new Error('No store '+name);
      const tx = {
        error: null,
        objectStore(other) {
          if(other!==name)throw new Error('wrong store');
          return {
            put(value) {
              if(mode!=='readwrite')throw new Error('read only');
              setTimeout(()=>{
                stores.get(name).set(value.id,structuredClone(value));
                tx.oncomplete?.();
              }, 1);
            },
            get(key) {
              const request = {};
              setTimeout(()=>{
                request.result=structuredClone(stores.get(name).get(key));
                request.onsuccess?.({target:request});
                setTimeout(()=>tx.oncomplete?.(),1);
              },1);
              return request;
            }
          };
        }
      };
      return tx;
    }
  };
  return {
    stores,
    indexedDB: {open(name,version) {
      assert.equal(name,DB_NAME);assert.equal(version,DB_VERSION);
      const req = {};
      queueMicrotask(()=>{
        req.result=db;
        if(!dbInstance) {req.onupgradeneeded?.();dbInstance=db;}
        req.onsuccess?.();
      });
      return req;
    }}
  };
}
const mock=createMockIndexedDB();
globalThis.indexedDB=mock.indexedDB;

test('opening DB initializes version-1 schema and settings', async()=>{
  const settings=await ensureSettings();
  assert.equal(settings.schemaVersion,1);
  assert.equal(settings.activeSetId,null);
  assert.equal(mock.stores.size,14);
  for(const name of ['profiles','clubs','clubSets','shots','rounds','holeScores','photos','sourceRecords']) assert.ok(mock.stores.has(name),name);
});
test('get missing record returns null',async()=>{
  assert.equal(await getProfile(),null);
});
test('save waits for transaction completion and reads stored profile',async()=>{
  const payload={id:'me',gender:'undisclosed',handedness:'left',heightCm:175,handicap:null,playNotes:'メモ'};
  await saveProfile(payload);
  const stored=await getProfile();
  assert.equal(stored.heightCm,175);
  assert.equal(stored.gender,'undisclosed');
  assert.match(stored.updatedAt,/^\d{4}-\d\d-\d\dT/);
});
test('future schema store IDs accept independent records',async()=>{
  await putRecord('clubs',{id:'c1',name:'Test'});
  await putRecord('clubs',{id:'c2',name:'Test'});
  assert.equal((await getRecord('clubs','c1')).id,'c1');
  assert.equal((await getRecord('clubs','c2')).id,'c2');
});
test('settings does not get overwritten on second initialization',async()=>{
  const first=await ensureSettings();
  assert.equal((await ensureSettings()).createdAt,first.createdAt);
});
test('stage 9 strategy uses pre-existing store with transaction completion before readback',async()=>{
  assert.ok(mock.stores.has('strategies'));
  const record={id:'strategy-test',targetYards:87,requiredCarryYards:50,ballSlope:{front:'down',side:'above'},targetSlope:{front:'away',side:'right'}};
  await putRecord('strategies',record);
  const saved=await getRecord('strategies','strategy-test');
  assert.deepEqual(saved.ballSlope,{front:'down',side:'above'});
  assert.equal(saved.requiredCarryYards,50);
  assert.deepEqual(saved.targetSlope,{front:'away',side:'right'});
});
