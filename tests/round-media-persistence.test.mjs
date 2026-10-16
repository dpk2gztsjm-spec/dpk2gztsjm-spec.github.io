import test from 'node:test';
import assert from 'node:assert/strict';
import {DB_NAME,DB_VERSION,putRecord,getRecord,getAllRecords,saveRoundNotesAtomic,addRoundPhotosAtomic,deleteRoundPhotoAtomic,reorderRoundPhotosAtomic,deleteRoundAtomic} from '../src/db.js';
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
const initial={id:'round-media-test',notes:'old',courseSnapshot:{name:'Test'},updatedAt:'before'};
const img=(id)=>({id,ownerType:'round',ownerId:initial.id,blob:new Blob(['full'],{type:'image/jpeg'}),thumbnailBlob:new Blob(['thumb'],{type:'image/jpeg'}),createdAt:'2026-10-16',updatedAt:'2026-10-16'});
test('initial round and unrelated course cover survive',async()=>{
 await putRecord('rounds',initial);
 await putRecord('photos',{id:'course-cover:unrelated',ownerType:'course',ownerId:'unrelated',blob:new Blob(['course'])});
 assert.equal((await getAllRecords('rounds')).length,1);
});
test('round memo saves and does not mutate scorecard snapshot',async()=>{
 const saved=await saveRoundNotesAtomic(initial.id,'天気：晴れ\nアプローチ良好');
 assert.equal(saved.notes,'天気：晴れ\nアプローチ良好');
 assert.equal((await getRecord('rounds',initial.id)).courseSnapshot.name,'Test');
});
test('multiple round JPEGs and thumbnails are committed together',async()=>{
 await addRoundPhotosAtomic(initial.id,[img('a'),img('b'),img('c')]);
 const all=(await getAllRecords('photos')).filter(p=>p.ownerType==='round');
 assert.deepEqual(all.map(x=>x.order),[0,1,2]);
 assert.equal(all[0].blob.type,'image/jpeg');
 assert.equal(all[0].thumbnailBlob.type,'image/jpeg');
});
test('cannot insert photos for nonexistent round or exceed capacity',async()=>{
 await assert.rejects(addRoundPhotosAtomic('missing',[{...img('bad'),ownerId:'missing'}]),/ラウンド/);
 await assert.rejects(addRoundPhotosAtomic(initial.id,[img('d'),img('e')],4),/最大4枚/);
 assert.equal((await getAllRecords('photos')).filter(p=>p.ownerType==='round').length,3);
});
test('reorder validates exact IDs and persists order',async()=>{
 await assert.rejects(reorderRoundPhotosAtomic(initial.id,['a','b']),/正しくありません/);
 await reorderRoundPhotosAtomic(initial.id,['c','a','b']);
 const all=(await getAllRecords('photos')).filter(p=>p.ownerType==='round').sort((a,b)=>a.order-b.order);
 assert.deepEqual(all.map(p=>p.id),['c','a','b']);
});
test('photo deletion rejects another owner and preserves remaining images',async()=>{
 await assert.rejects(deleteRoundPhotoAtomic(initial.id,'course-cover:unrelated'),/見つかりません/);
 await deleteRoundPhotoAtomic(initial.id,'b');
 assert.equal(await getRecord('photos','b'),null);
 assert.ok(await getRecord('photos','a'));
});
test('simulated failed transaction rolls back photos and notes',async()=>{
 mock.fail(true);
 await assert.rejects(addRoundPhotosAtomic(initial.id,[img('retry')]),/Simulated commit failure/);
 await assert.rejects(saveRoundNotesAtomic(initial.id,'unsaved'),/Simulated commit failure/);
 mock.fail(false);
 assert.equal(await getRecord('photos','retry'),null);
 assert.equal((await getRecord('rounds',initial.id)).notes,'天気：晴れ\nアプローチ良好');
});
test('round deletion removes owned photos, scores and names but not course cover',async()=>{
 await putRecord('roundPlayers',{id:'player',roundId:initial.id,isSelf:true});
 await putRecord('holeScores',{id:'score',roundId:initial.id,strokes:4});
 await deleteRoundAtomic(initial.id);
 assert.equal(await getRecord('rounds',initial.id),null);
 assert.equal(await getRecord('photos','a'),null);
 assert.equal(await getRecord('photos','c'),null);
 assert.equal(await getRecord('roundPlayers','player'),null);
 assert.equal(await getRecord('holeScores','score'),null);
 assert.ok(await getRecord('photos','course-cover:unrelated'));
});
