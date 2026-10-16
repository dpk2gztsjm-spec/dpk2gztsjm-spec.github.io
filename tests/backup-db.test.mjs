import test from 'node:test';
import assert from 'node:assert/strict';
import {STORE_NAMES,snapshotAllStores,restoreAllStoresAtomic,getRecord} from '../src/db.js';

function createTransactionalMemoryDB(){
 const stores=new Map(STORE_NAMES.map(name=>[name,new Map()]));
 let failId=null;
 const database={
  objectStoreNames:{contains(name){return stores.has(name);}},
  createObjectStore(name){stores.set(name,new Map());},close(){},
  transaction(names,mode){
   const originals=[].concat(names);
   const draft=new Map(originals.map(n=>[n,new Map(stores.get(n))]));
   let aborted=false,scheduled=false;
   const tx={error:null,oncomplete:null,onabort:null,onerror:null,
    abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},
    objectStore(name){
     const m=draft.get(name);if(!m)throw Error('missing store');
     return {
      clear(){if(mode!=='readwrite')throw Error('readonly');m.clear();schedule();},
      put(record){if(mode!=='readwrite')throw Error('readonly');if(record.id===failId)throw Error('simulated disk rejection');m.set(record.id,structuredClone(record));schedule();},
      getAll(){const request={result:undefined};queueMicrotask(()=>{request.result=[...m.values()].map(v=>structuredClone(v));request.onsuccess?.({target:request});});schedule();return request;},
      get(id){const request={result:undefined};queueMicrotask(()=>{request.result=structuredClone(m.get(id));request.onsuccess?.({target:request});});schedule();return request;}
     };
    }
   };
   function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{if(!aborted){for(const n of originals)if(mode==='readwrite')stores.set(n,draft.get(n));tx.oncomplete?.();}},4);}
   return tx;
  }
 };
 globalThis.indexedDB={open:()=>{
  const req={result:database};queueMicrotask(()=>req.onsuccess?.());return req;
 }};
 return {stores,setFailure(id){failId=id;}};
}
const fake=createTransactionalMemoryDB();
const empty=()=>Object.fromEntries(STORE_NAMES.map(n=>[n,[]]));

test('full restore and export snapshot include photos as Blob',async()=>{
 const values=empty();values.profiles=[{id:'me',gender:'male'}];
 values.clubs=[{id:'PW',maker:'Test'}];
 const jpeg=new Blob([Uint8Array.of(255,216,255,224,3,255,217)],{type:'image/jpeg'});
 values.photos=[{id:'photo1',blob:jpeg}];
 await restoreAllStoresAtomic(values);
 const snap=await snapshotAllStores();
 assert.equal(snap.clubs[0].id,'PW');assert.equal(snap.profiles[0].gender,'male');
 assert.equal(snap.photos[0].blob.size,7);
 assert.equal(snap.settings.length,0);
});
test('failed multi-store replacement rolls back all prior stores',async()=>{
 const before=await snapshotAllStores();
 const broken=empty();broken.profiles=[{id:'me',gender:'female'}];
 broken.clubs=[{id:'BREAK',maker:'fault'}];
 fake.setFailure('BREAK');
 await assert.rejects(()=>restoreAllStoresAtomic(broken),/disk rejection/);
 fake.setFailure(null);
 assert.deepEqual(await snapshotAllStores(),before);
 assert.equal((await getRecord('profiles','me')).gender,'male');
});
test('incomplete restore is rejected before transaction',async()=>{
 await assert.rejects(()=>restoreAllStoresAtomic({profiles:[]}),/不完全/);
});
