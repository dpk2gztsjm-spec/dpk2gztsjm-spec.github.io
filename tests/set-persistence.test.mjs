import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureSettings,getAllRecords,getRecord,putRecord,activateClubSet,deleteClubSetSafely,deleteClubAndPruneSets} from '../src/db.js';

/** Deterministic transactional IndexedDB substitute. NOT a browser/real IndexedDB test. */
function makeIDBMock(){
  const stores=new Map();let didOpen=false;
  const db={
    objectStoreNames:{contains(name){return stores.has(name);}},
    createObjectStore(name){stores.set(name,new Map());},
    close(){},
    transaction(storeNames,mode){
      const selected=Array.isArray(storeNames)?storeNames:[storeNames];
      const pendingStores=new Map(selected.map(name=>[name,new Map(stores.get(name))]));
      let pending=0,closed=false,aborted=false,scheduled=false;
      const tx={error:null,oncomplete:null,onabort:null,onerror:null};
      function finish(){
        if(scheduled||closed||aborted)return;
        scheduled=true;
        setTimeout(()=>{
          scheduled=false;
          if(pending!==0||closed||aborted)return;
          closed=true;
          if(mode==='readwrite')for(const [name,records] of pendingStores)stores.set(name,records);
          tx.oncomplete?.();
        },0);
      }
      function request(action){
        const req={result:undefined,onsuccess:null};pending++;
        queueMicrotask(()=>{
          if(aborted)return;
          req.result=action();
          req.onsuccess?.({target:req});
          pending--;finish();
        });
        return req;
      }
      tx.abort=()=>{if(aborted||closed)return;aborted=true;queueMicrotask(()=>tx.onabort?.());};
      tx.objectStore=name=>{
        if(!pendingStores.has(name))throw Error('store not in transaction: '+name);
        const map=pendingStores.get(name);
        return {
          get:key=>request(()=>structuredClone(map.get(key))),
          getAll:()=>request(()=>[...map.values()].map(v=>structuredClone(v))),
          put:record=>request(()=>{if(mode!=='readwrite')throw Error('read only');map.set(record.id,structuredClone(record));return record.id;}),
          delete:key=>request(()=>{if(mode!=='readwrite')throw Error('read only');map.delete(key);return undefined;})
        };
      };
      return tx;
    }
  };
  globalThis.indexedDB={open(){
    const req={};queueMicrotask(()=>{
      req.result=db;
      if(!didOpen){didOpen=true;req.onupgradeneeded?.();}
      req.onsuccess?.();
    });return req;
  }};
  return stores;
}
makeIDBMock();
test('setting an active set commits its ID and rejects nonexistent IDs',async()=>{
  await ensureSettings();
  await putRecord('clubSets',{id:'set-a',name:'普段',clubIds:['c1'],createdAt:'start'});
  assert.equal((await activateClubSet('set-a')).activeSetId,'set-a');
  assert.equal((await getRecord('settings','app')).activeSetId,'set-a');
  await assert.rejects(activateClubSet('not-exist'),/見つかりません/);
  assert.equal((await getRecord('settings','app')).activeSetId,'set-a');
});
test('deleting an inactive set keeps the current bag selected',async()=>{
  await putRecord('clubSets',{id:'set-b',name:'予備',clubIds:['c1']});
  const changed=await deleteClubSetSafely('set-b');
  assert.equal(changed,null);
  assert.equal((await getRecord('settings','app')).activeSetId,'set-a');
});
test('deleting the active set clears active ID atomically while owning club remains',async()=>{
  await putRecord('clubs',{id:'c1',maker:'PING',model:'One',number:'7'});
  const changed=await deleteClubSetSafely('set-a');
  assert.equal(changed.activeSetId,null);
  assert.equal(await getRecord('clubSets','set-a'),null);
  assert.equal((await getRecord('settings','app')).activeSetId,null);
  assert.equal((await getRecord('clubs','c1')).id,'c1');
});
test('removing a club updates all referencing sets in one transaction',async()=>{
  await putRecord('clubs',{id:'c2',maker:'PING',model:'Two',number:'8'});
  await putRecord('clubSets',{id:'s1',name:'A',clubIds:['c1','c2']});
  await putRecord('clubSets',{id:'s2',name:'B',clubIds:['c2']});
  await putRecord('clubSets',{id:'s3',name:'C',clubIds:['c1']});
  assert.equal(await deleteClubAndPruneSets('c2'),2);
  assert.equal(await getRecord('clubs','c2'),null);
  assert.deepEqual((await getRecord('clubSets','s1')).clubIds,['c1']);
  assert.deepEqual((await getRecord('clubSets','s2')).clubIds,[]);
  assert.deepEqual((await getRecord('clubSets','s3')).clubIds,['c1']);
  assert.equal((await getAllRecords('clubs')).length,1);
});
