import test from 'node:test';
import assert from 'node:assert/strict';
import {DB_NAME, DB_VERSION, getAllRecords, getRecord, putRecord, saveCourseAtomic, deleteCourseSafely, getProfile, saveProfile} from '../src/db.js';

/** Minimal multistore IndexedDB fake with delayed commit and abort rollback. */
function makeDB(){
  const stores=new Map();let initialized=false,failCommit=false;
  const db={
    objectStoreNames:{contains:n=>stores.has(n)},
    createObjectStore(n){stores.set(n,new Map());},close(){},
    transaction(names,mode){
      names=Array.isArray(names)?names:[names];
      const staged=new Map(names.map(n=>[n,new Map(stores.get(n))]));
      let pending=0,scheduled=false,done=false,aborted=false,mutated=false;
      const tx={error:null,oncomplete:null,onabort:null,onerror:null};
      const clone=x=>x===undefined?undefined:structuredClone(x);
      function finish(){if(scheduled)return;scheduled=true;setTimeout(()=>{
        scheduled=false;if(pending||done||aborted)return;
        if(failCommit&&mutated){tx.error=new Error('Simulated commit failure');tx.abort();return;}
        done=true;
        if(mode==='readwrite')for(const [n,map] of staged)stores.set(n,map);
        tx.oncomplete?.();
      },1);}
      function enqueue(fn){const req={result:undefined,onsuccess:null};pending++;
        setTimeout(()=>{
          if(aborted)return;
          try{req.result=fn();req.onsuccess?.({target:req});}
          catch(e){tx.error=e;tx.abort();return;}
          pending--;if(pending===0)finish();
        },0);return req;
      }
      tx.abort=()=>{if(done||aborted)return;aborted=true;setTimeout(()=>tx.onabort?.(),0);};
      tx.objectStore=(name)=>{
        if(!staged.has(name))throw Error('Invalid store '+name);
        const map=staged.get(name);
        return {
          get:key=>enqueue(()=>clone(map.get(key))),
          getAll:()=>enqueue(()=>[...map.values()].map(clone)),
          put:r=>enqueue(()=>{if(mode!=='readwrite')throw Error('readonly');mutated=true;map.set(r.id,clone(r));return r.id;}),
          delete:key=>enqueue(()=>{if(mode!=='readwrite')throw Error('readonly');mutated=true;map.delete(key);})
        };
      };
      return tx;
    }
  };
  return {
    stores,fail(flag){failCommit=flag;},
    indexedDB:{open:(name,version)=>{
      assert.equal(name,DB_NAME);assert.equal(version,DB_VERSION);
      const req={};queueMicrotask(()=>{req.result=db;if(!initialized){req.onupgradeneeded?.();initialized=true;}req.onsuccess?.();});return req;
    }}
  };
}
const mock=makeDB();globalThis.indexedDB=mock.indexedDB;
const course=(id,name)=>({id,name,sourceType:'manual',holes:[{number:1,par:4}],tees:[{id:'reg',name:'レギュラー',distances:{1:310}}]});

test('Stage 1 profile and v1 schema survive course additions',async()=>{
 await saveProfile({gender:'undisclosed',handedness:'right',heightCm:null,handicap:null,playNotes:''});
 assert.equal(mock.stores.size,14);assert.equal((await getProfile()).gender,'undisclosed');
});
test('course and its Blob photo are persisted in the same transaction',async()=>{
 const photo=new Blob(['photo jpg'],{type:'image/jpeg'});
 await saveCourseAtomic(course('c1','茨城カントリー'),photo);
 assert.equal((await getRecord('courses','c1')).name,'茨城カントリー');
 const cover=await getRecord('photos','course-cover:c1');
 assert.equal(cover.ownerId,'c1');assert.equal(cover.blob.type,'image/jpeg');
 assert.equal((await getProfile()).handedness,'right');
});
test('changing course without photo change retains old photo; null deletes it',async()=>{
 await saveCourseAtomic({...course('c1','茨城カントリー更新'),photoId:'course-cover:c1'});
 assert.ok(await getRecord('photos','course-cover:c1'));
 await saveCourseAtomic({...course('c1','茨城カントリー更新'),photoId:null},null);
 assert.equal(await getRecord('photos','course-cover:c1'),null);
 assert.equal((await getRecord('courses','c1')).name,'茨城カントリー更新');
});
test('transaction commit failure rolls back both course and photo',async()=>{
 const before=(await getAllRecords('courses')).length;
 mock.fail(true);
 await assert.rejects(saveCourseAtomic(course('failed','Should Rollback'),new Blob(['test'],{type:'image/jpeg'})),/Simulated commit failure/);
 mock.fail(false);
 assert.equal((await getAllRecords('courses')).length,before);
 assert.equal(await getRecord('photos','course-cover:failed'),null);
});
test('cannot remove course referenced by historical round',async()=>{
 await putRecord('rounds',{id:'round-1',courseId:'c1'});
 await assert.rejects(deleteCourseSafely('c1'),/ラウンド/);
 assert.ok(await getRecord('courses','c1'));
});
test('can safely remove unreferenced course and cover, without touching another',async()=>{
 await saveCourseAtomic(course('c2','保存用'),new Blob(['image'],{type:'image/jpeg'}));
 await deleteCourseSafely('c2');
 assert.equal(await getRecord('courses','c2'),null);
 assert.equal(await getRecord('photos','course-cover:c2'),null);
 assert.ok(await getRecord('courses','c1'));
});
