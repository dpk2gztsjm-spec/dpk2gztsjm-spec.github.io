import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureSettings,getRecord,getAllRecords,putRecord,deleteRecord,deleteClubAndPruneSets} from '../src/db.js';
/** Transaction simulator (not browser IndexedDB); commits multi-store writes atomically. */
function makeFakeDatabase() {
  const stores=new Map();let opened=false;
  const db={
    objectStoreNames:{contains:n=>stores.has(n)},
    createObjectStore(n){stores.set(n,new Map());},
    close(){},
    transaction(names,mode){
      const selected=Array.isArray(names)?names:[names];
      const pendingStores=new Map(selected.map(n=>[n,new Map(stores.get(n))]));
      let pending=0,finished=false,aborted=false,scheduled=false;
      const tx={error:null,oncomplete:null,onabort:null,onerror:null};
      function settle(){if(scheduled||finished||aborted)return;scheduled=true;setTimeout(()=>{scheduled=false;if(pending||finished||aborted)return;finished=true;if(mode==='readwrite')for(const [n,m] of pendingStores)stores.set(n,m);tx.oncomplete?.();},0);}
      function request(fn){const req={result:undefined,onsuccess:null};pending++;queueMicrotask(()=>{if(aborted)return;req.result=fn();req.onsuccess?.({target:req});pending--;settle();});return req;}
      tx.abort=()=>{aborted=true;queueMicrotask(()=>tx.onabort?.());};
      tx.objectStore=n=>{
        if(!pendingStores.has(n))throw Error('Missing store '+n);
        const m=pendingStores.get(n);
        return {
          get:key=>request(()=>structuredClone(m.get(key))),
          getAll:()=>request(()=>[...m.values()].map(x=>structuredClone(x))),
          put:rec=>request(()=>{m.set(rec.id,structuredClone(rec));return rec.id;}),
          delete:key=>request(()=>{m.delete(key);})
        };
      };
      return tx;
    }
  };
  globalThis.indexedDB={open(){const req={};queueMicrotask(()=>{req.result=db;if(!opened){opened=true;req.onupgradeneeded?.();}req.onsuccess?.();});return req;}};
}
makeFakeDatabase();
test('existing profile and clubSet data remain unchanged by shot edits',async()=>{
  await ensureSettings();
  await putRecord('profiles',{id:'me',gender:'male',handedness:'right'});
  await putRecord('clubs',{id:'pw',maker:'PING',model:'i230',number:'PW'});
  await putRecord('clubSets',{id:'set',name:'練習',clubIds:['pw']});
  await putRecord('shots',{id:'half',clubId:'pw',name:'ハーフ',carryYards:null,rollYards:null});
  await putRecord('shots',{id:'eighty',clubId:'pw',name:'80%',carryYards:75.5,rollYards:null,distanceSource:'measured'});
  assert.equal((await getAllRecords('shots')).length,2);
  assert.equal((await getRecord('profiles','me')).gender,'male');
  assert.deepEqual((await getRecord('clubSets','set')).clubIds,['pw']);
});
test('updating one shot preserves its ID and does not overwrite sibling shot',async()=>{
  const before=await getRecord('shots','half');
  await putRecord('shots',{...before,carryYards:47,notes:'練習'});
  assert.equal((await getAllRecords('shots')).length,2);
  assert.equal((await getRecord('shots','half')).carryYards,47);
  assert.equal((await getRecord('shots','eighty')).carryYards,75.5);
});
test('delete one shot without deleting its physical club',async()=>{
  await deleteRecord('shots','half');
  assert.equal(await getRecord('shots','half'),null);
  assert.equal((await getRecord('shots','eighty')).clubId,'pw');
  assert.ok(await getRecord('clubs','pw'));
});
test('deleting physical club atomically removes its shots and set membership',async()=>{
  await putRecord('shots',{id:'chip',clubId:'pw',name:'chip',carryYards:null});
  await putRecord('shots',{id:'unrelated',clubId:'other',name:'unrelated'});
  assert.equal(await deleteClubAndPruneSets('pw'),1);
  assert.equal(await getRecord('clubs','pw'),null);
  assert.deepEqual((await getRecord('clubSets','set')).clubIds,[]);
  assert.equal((await getAllRecords('shots')).length,1);
  assert.ok(await getRecord('shots','unrelated'));
  assert.equal(await getRecord('shots','eighty'),null);
});
