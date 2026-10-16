import test from 'node:test';
import assert from 'node:assert/strict';
import {DB_NAME, DB_VERSION, ensureSettings, saveProfile, getProfile, getAllRecords, putRecord, putRecords, deleteRecord} from '../src/db.js';

/** Transaction simulator: stages writes until all requests finish and commits at oncomplete. */
function makeIDB() {
  const stores=new Map();let installed=false;let failWrite=false;
  const db={
    objectStoreNames:{contains:name=>stores.has(name)},
    createObjectStore(name) {stores.set(name,new Map());},
    close(){},
    transaction(name,mode){
      if(!stores.has(name))throw new Error('invalid store');
      const tx={error:null,oncomplete:null,onerror:null,onabort:null};
      const staged=new Map(stores.get(name));let scheduled=false,aborted=false;
      function finish(){if(scheduled)return;scheduled=true;setTimeout(()=>{
        if(aborted){tx.error=new Error('Simulated disk failure');tx.onabort?.();return;}
        if(mode==='readwrite')stores.set(name,staged);
        tx.oncomplete?.();
      },10);}
      tx.objectStore=()=>({
        get(key){const request={result:undefined};setTimeout(()=>{request.result=structuredClone(staged.get(key));request.onsuccess?.({target:request});finish();},0);return request;},
        getAll(){const request={result:undefined};setTimeout(()=>{request.result=[...staged.values()].map(x=>structuredClone(x));request.onsuccess?.({target:request});finish();},0);return request;},
        put(record){if(mode!=='readwrite')throw new Error('readonly');if(failWrite)aborted=true;else staged.set(record.id,structuredClone(record));finish();},
        delete(key){if(mode!=='readwrite')throw new Error('readonly');if(failWrite)aborted=true;else staged.delete(key);finish();}
      });
      return tx;
    }
  };
  return {
    stores,fail(flag){failWrite=flag;},
    indexedDB:{open(name,version){assert.equal(name,DB_NAME);assert.equal(version,DB_VERSION);const request={};
      queueMicrotask(()=>{request.result=db;if(!installed){request.onupgradeneeded?.();installed=true;}request.onsuccess?.();});return request;
    }}
  };
}
const mock=makeIDB();globalThis.indexedDB=mock.indexedDB;

test('existing Stage 1 profile and app settings remain untouched by Stage 2 club changes',async()=>{
  await ensureSettings();await saveProfile({gender:'female',handedness:'right',heightCm:null,handicap:null,playNotes:'練習'});
  const original=await getProfile();
  await putRecord('clubs',{id:'c1',maker:'A',model:'M',number:'7'});
  assert.deepEqual(await getProfile(),original);
  assert.equal(mock.stores.size,14);
});
test('bulk saves commit all separate IDs and getAll after commit',async()=>{
  const items=[{id:'set-1',number:'5'},{id:'set-2',number:'7'},{id:'set-3',number:'PW'}];
  await putRecords('clubs',items);
  assert.equal((await getAllRecords('clubs')).length,4);
  assert.deepEqual((await getAllRecords('clubs')).filter(x=>x.id.startsWith('set-')).map(x=>x.number),['5','7','PW']);
});
test('edits overwrite same physical item, not another item',async()=>{
  await putRecord('clubs',{id:'set-1',number:'5',loftDeg:25});
  assert.equal((await getAllRecords('clubs')).length,4);
  assert.equal((await getAllRecords('clubs')).find(x=>x.id==='set-1').loftDeg,25);
});
test('deleting one club leaves siblings untouched',async()=>{
  await deleteRecord('clubs','set-2');
  const all=await getAllRecords('clubs');
  assert.equal(all.length,3);
  assert.ok(all.some(x=>x.id==='set-1'));
  assert.ok(!all.some(x=>x.id==='set-2'));
});
test('failed batch transaction never results in half-saved collection',async()=>{
  const before=await getAllRecords('clubs');
  mock.fail(true);
  await assert.rejects(putRecords('clubs',[{id:'failed-1'},{id:'failed-2'}]),/Simulated disk failure/);
  mock.fail(false);
  assert.deepEqual(await getAllRecords('clubs'),before);
});
test('failed single delete does not remove anything',async()=>{
  const before=await getAllRecords('clubs');mock.fail(true);
  await assert.rejects(deleteRecord('clubs','set-1'),/Simulated disk failure/);
  mock.fail(false);assert.deepEqual(await getAllRecords('clubs'),before);
});
