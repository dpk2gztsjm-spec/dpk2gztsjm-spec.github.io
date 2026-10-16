import test from 'node:test';
import assert from 'node:assert/strict';
import {DB_VERSION,DB_NAME,getRecord,getAllRecords,putRecord,deleteClubAndPruneSets,createRoundAtomic,deleteRoundAtomic,addRoundPlayerAtomic,deleteRoundPlayerAtomic,deleteCourseSafely} from '../src/db.js';
import {createRoundRecords,newRoundPlayerId,scoreId} from '../src/rounds.js';
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
const course={id:'course-a',name:'Original course',holeCount:9,layout:'IN',holes:Array.from({length:9},(_,i)=>({number:i+10,par:4})),tees:[{id:'tee1',name:'White',distances:{10:330}}]};
const club={id:'club1',maker:'M',model:'Old model',number:'PW'};
let created;
test('seed course, club, bag with v1 stores',async()=>{
  await putRecord('courses',course);await putRecord('clubs',club);await putRecord('clubSets',{id:'set1',name:'Day bag',clubIds:[club.id]});
  assert.equal(mock.stores.size,14);
});
test('create 4-player round + 36 scores atomically',async()=>{
  created=createRoundRecords({courseId:course.id,teeId:'tee1',date:'2026-10-16',weather:'Fine',setId:'set1',companions:['A','B','C']},course,{id:'set1',name:'Day bag',clubIds:['club1']},[club]);
  await createRoundAtomic(created);
  assert.equal((await getAllRecords('rounds')).length,1);
  assert.equal((await getAllRecords('roundPlayers')).length,4);
  assert.equal((await getAllRecords('holeScores')).length,36);
  assert.equal((await getRecord('rounds',created.round.id)).setSnapshot.clubs[0].model,'Old model');
});
test('course and club edits do not mutate historical snapshots',async()=>{
  await putRecord('courses',{...course,name:'Edited course',holes:course.holes.map(h=>({...h,par:6}))});
  await deleteClubAndPruneSets('club1');
  const round=await getRecord('rounds',created.round.id);
  assert.equal(round.courseSnapshot.name,'Original course');
  assert.equal(round.courseSnapshot.holes[0].par,4);
  assert.equal(round.setSnapshot.clubs[0].model,'Old model');
  assert.equal(round.setSnapshot.clubIds.length,1);
});
test('course deletion is protected for linked historical rounds',async()=>{
  await assert.rejects(deleteCourseSafely(course.id),/ラウンド/);
});
test('individual score persists without changing other players',async()=>{
  const original=created.scores[0];
  await putRecord('holeScores',{...original,strokes:4,putts:2});
  assert.equal((await getRecord('holeScores',original.id)).strokes,4);
  assert.equal((await getRecord('holeScores',created.scores[1].id)).strokes,null);
});
test('late companion addition is atomic; up to four only',async()=>{
  await assert.rejects(addRoundPlayerAtomic(created.round,{id:'too-many',roundId:created.round.id,isSelf:false},[]),/4名/);
  const lone=createRoundRecords({courseId:course.id,teeId:'tee1',date:'2026-10-16',companions:[],setId:''},course,null,[]);
  await createRoundAtomic(lone);
  const p={id:'late',roundId:lone.round.id,name:'Late person',order:1,isSelf:false};
  const scores=course.holes.map(h=>({id:scoreId(lone.round.id,'late',h.number),roundId:lone.round.id,playerId:'late',holeNumber:h.number,strokes:null,putts:null}));
  await addRoundPlayerAtomic(lone.round,p,scores);
  assert.equal((await getAllRecords('roundPlayers')).filter(x=>x.roundId===lone.round.id).length,2);
  assert.equal((await getAllRecords('holeScores')).filter(x=>x.playerId==='late').length,9);
});
test('cannot remove self; deletion of companion removes related scores only',async()=>{
  const self=created.players[0];
  await assert.rejects(deleteRoundPlayerAtomic(created.round.id,self.id),/削除できない/);
  const other=created.players[2];
  await deleteRoundPlayerAtomic(created.round.id,other.id);
  assert.equal(await getRecord('roundPlayers',other.id),null);
  assert.equal((await getAllRecords('holeScores')).filter(x=>x.playerId===other.id).length,0);
  assert.ok(await getRecord('roundPlayers',self.id));
});
test('commit failure rolls back round, players and blank scores',async()=>{
  const before=[(await getAllRecords('rounds')).length,(await getAllRecords('roundPlayers')).length,(await getAllRecords('holeScores')).length];
  const bad=createRoundRecords({courseId:course.id,teeId:'tee1',date:'2026-10-16',companions:['New'],setId:''},course,null,[]);
  mock.fail(true);
  await assert.rejects(createRoundAtomic(bad),/Simulated commit failure/);
  mock.fail(false);
  assert.deepEqual([(await getAllRecords('rounds')).length,(await getAllRecords('roundPlayers')).length,(await getAllRecords('holeScores')).length],before);
});
test('deleting one round atomically removes its children but preserves another round',async()=>{
  await deleteRoundAtomic(created.round.id);
  assert.equal(await getRecord('rounds',created.round.id),null);
  assert.equal((await getAllRecords('holeScores')).filter(s=>s.roundId===created.round.id).length,0);
  assert.equal((await getAllRecords('roundPlayers')).filter(p=>p.roundId===created.round.id).length,0);
  assert.equal((await getAllRecords('rounds')).length,1);
});
