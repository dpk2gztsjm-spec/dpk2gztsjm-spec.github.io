/** IndexedDB v1. Reuses the same schema as Stage 1 to preserve existing data. */
export const DB_NAME = 'golf-journal';
export const DB_VERSION = 1;
export const STORE_NAMES = [
  'profiles', 'settings', 'clubs', 'clubSets', 'shots', 'courses', 'rounds',
  'roundPlayers', 'holeScores', 'photos', 'albumPresets', 'tipArticles',
  'strategies', 'sourceRecords'
];
let dbPromise;
export function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('このブラウザではIndexedDBを利用できません。Safariの設定を確認してください。'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = undefined; };
      resolve(db);
    };
    request.onerror = () => { dbPromise = undefined; reject(request.error || new Error('DBを開けませんでした。')); };
    request.onblocked = () => { dbPromise = undefined; reject(new Error('別のタブでデータ更新がブロックされています。')); };
  });
  return dbPromise;
}

export async function getRecord(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let value;
    const tx = db.transaction(storeName, 'readonly');
    tx.objectStore(storeName).get(key).onsuccess = event => { value = event.target.result; };
    tx.oncomplete = () => resolve(value ?? null);
    tx.onerror = () => reject(tx.error || new Error('データの読み込みに失敗しました。'));
    tx.onabort = () => reject(tx.error || new Error('データの読み込みが中断されました。'));
  });
}

export async function putRecord(storeName, record) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    // Resolve only after transaction commits; onsuccess alone isn't durable.
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error || new Error('保存に失敗しました。'));
    tx.onabort = () => reject(tx.error || new Error('保存が中断されました。'));
  });
}

/** Enumerate records after a readonly transaction completes. */
export async function getAllRecords(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let records = [];
    const tx = db.transaction(storeName, 'readonly');
    tx.objectStore(storeName).getAll().onsuccess = event => { records = event.target.result; };
    tx.oncomplete = () => resolve(records);
    tx.onerror = () => reject(tx.error || new Error('一覧の読み込みに失敗しました。'));
    tx.onabort = () => reject(tx.error || new Error('一覧の読み込みが中断されました。'));
  });
}

/** All records commit as one transaction: prevents half-saved iron sets. */
export async function putRecords(storeName, records) {
  if (!Array.isArray(records) || !records.length) throw new Error('保存するレコードがありません。');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    for (const record of records) tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve(records);
    tx.onerror = () => reject(tx.error || new Error('一括保存に失敗しました。'));
    tx.onabort = () => reject(tx.error || new Error('一括保存が中断されました。'));
  });
}

export async function deleteRecord(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('削除に失敗しました。'));
    tx.onabort = () => reject(tx.error || new Error('削除が中断されました。'));
  });
}

export async function getProfile() { return getRecord('profiles', 'me'); }
export async function saveProfile(profile) {
  return putRecord('profiles', { ...profile, id: 'me', updatedAt: new Date().toISOString() });
}

export async function getSettings() {
  return (await getRecord('settings', 'app')) ?? {id:'app', activeSetId: null, createdAt: new Date().toISOString()};
}

export async function ensureSettings() {
  const existing = await getRecord('settings', 'app');
  if (existing) return existing;
  const value = {id:'app', activeSetId: null, createdAt: new Date().toISOString(), schemaVersion: 1};
  await putRecord('settings', value);
  return value;
}

/** Commit active-bag switching only if the requested set still exists. */
export async function activateClubSet(setId) {
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    let updated;
    let failure;
    const tx = db.transaction(['clubSets','settings'],'readwrite');
    tx.objectStore('clubSets').get(setId).onsuccess = ev => {
      if (!ev.target.result) {failure=new Error('セットが見つかりません。');tx.abort();return;}
      tx.objectStore('settings').get('app').onsuccess = settingsEv => {
        updated={...(settingsEv.target.result ?? {id:'app',schemaVersion:1}),activeSetId:setId,updatedAt:new Date().toISOString()};
        tx.objectStore('settings').put(updated);
      };
    };
    tx.oncomplete=()=>resolve(updated);
    tx.onerror=()=>reject(failure || tx.error || new Error('バッグの切り替えに失敗しました。'));
    tx.onabort=()=>reject(failure || tx.error || new Error('バッグの切り替えが中断されました。'));
  });
}
/** Deleting an active set clears the active ID in the same transaction. */
export async function deleteClubSetSafely(setId) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    let updated=null;
    const tx=db.transaction(['clubSets','settings'],'readwrite');
    tx.objectStore('clubSets').delete(setId);
    tx.objectStore('settings').get('app').onsuccess=ev=>{
      const setting=ev.target.result;
      if (setting?.activeSetId===setId) {
        updated={...setting,activeSetId:null,updatedAt:new Date().toISOString()};
        tx.objectStore('settings').put(updated);
      }
    };
    tx.oncomplete=()=>resolve(updated);
    tx.onerror=()=>reject(tx.error || new Error('セットの削除に失敗しました。'));
    tx.onabort=()=>reject(tx.error || new Error('セットの削除が中断されました。'));
  });
}
/** Delete a physical club and remove it from every set atomically. */
export async function deleteClubAndPruneSets(clubId) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    let impacted=0;
    const tx=db.transaction(['clubs','clubSets','shots'],'readwrite');
    tx.objectStore('clubs').delete(clubId);
    const shotsStore=tx.objectStore('shots');
    shotsStore.getAll().onsuccess=ev=>{
      for(const shot of ev.target.result)if(shot.clubId===clubId)shotsStore.delete(shot.id);
    };
    const store=tx.objectStore('clubSets');
    store.getAll().onsuccess=ev=>{
      for (const s of ev.target.result) {
        if (!Array.isArray(s.clubIds) || !s.clubIds.includes(clubId)) continue;
        store.put({...s,clubIds:s.clubIds.filter(id=>id!==clubId),updatedAt:new Date().toISOString()});
        impacted++;
      }
    };
    tx.oncomplete=()=>resolve(impacted);
    tx.onerror=()=>reject(tx.error||new Error('クラブ削除とセット更新に失敗しました。'));
    tx.onabort=()=>reject(tx.error||new Error('クラブ削除とセット更新が中断されました。'));
  });
}

/** Save course metadata and its optional user-owned cover photo in one commit.
 * photoChange: undefined = keep existing, null = remove, Blob = replace.
 * Stored in pre-existing Stage 1 stores; no IndexedDB version bump required.
 */
export async function saveCourseAtomic(course, photoChange=undefined) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['courses','photos'],'readwrite');
    const photoId=`course-cover:${course.id}`;
    tx.objectStore('courses').put({...course,photoId:photoChange===null?null:(photoChange instanceof Blob?photoId:course.photoId??null)});
    if(photoChange===null)tx.objectStore('photos').delete(photoId);
    else if(photoChange instanceof Blob)tx.objectStore('photos').put({id:photoId,ownerType:'course',ownerId:course.id,blob:photoChange,updatedAt:new Date().toISOString()});
    tx.oncomplete=()=>resolve(course);
    tx.onerror=()=>reject(tx.error||new Error('コース保存に失敗しました。'));
    tx.onabort=()=>reject(tx.error||new Error('コース保存が中断されました。'));
  });
}
/** Do not break historical rounds if a course is ever linked to one. */
export async function deleteCourseSafely(courseId){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    let failure=null;
    const tx=db.transaction(['courses','photos','rounds'],'readwrite');
    tx.objectStore('rounds').getAll().onsuccess=event=>{
      const used=event.target.result.some(r=>r.courseId===courseId||r.courseSnapshot?.id===courseId||r.course?.id===courseId);
      if(used){failure=new Error('このコースを使ったラウンドが存在するため削除できません。');tx.abort();return;}
      tx.objectStore('courses').delete(courseId);
      tx.objectStore('photos').delete(`course-cover:${courseId}`);
    };
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(failure||tx.error||new Error('削除に失敗しました。'));
    tx.onabort=()=>reject(failure||tx.error||new Error('削除が中断されました。'));
  });
}

/** Create a round, its named players and blank score cells atomically. */
export async function createRoundAtomic({round,players,scores}) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    let failure=null;
    const tx=db.transaction(['rounds','roundPlayers','holeScores','courses'],'readwrite');
    tx.objectStore('courses').get(round.courseId).onsuccess=ev=>{
      if(!ev.target.result){failure=new Error('コースが削除されています。作成し直してください。');tx.abort();return;}
      tx.objectStore('rounds').put(round);
      for(const player of players)tx.objectStore('roundPlayers').put(player);
      for(const score of scores)tx.objectStore('holeScores').put(score);
    };
    tx.oncomplete=()=>resolve({round,players,scores});
    tx.onerror=()=>reject(failure||tx.error||new Error('ラウンド作成に失敗しました。'));
    tx.onabort=()=>reject(failure||tx.error||new Error('ラウンド作成が中断されました。'));
  });
}
/** Delete all linked scores and players in one transaction; unrelated records stay intact. */
export async function deleteRoundAtomic(roundId) {
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['rounds','roundPlayers','holeScores','photos','albumPresets'],'readwrite');
  tx.objectStore('rounds').delete(roundId);
  for(const name of ['photos','albumPresets']){
    const store=tx.objectStore(name);
    store.getAll().onsuccess=ev=>{for(const item of ev.target.result)if((item.ownerType==='round'&&item.ownerId===roundId)||(name==='albumPresets'&&item.roundId===roundId))store.delete(item.id);};
  }
  for(const name of ['roundPlayers','holeScores']){
    const store=tx.objectStore(name);
    store.getAll().onsuccess=ev=>{for(const item of ev.target.result)if(item.roundId===roundId)store.delete(item.id);};
  }
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||new Error('ラウンド削除に失敗しました。'));
  tx.onabort=()=>reject(tx.error||new Error('ラウンド削除が中断されました。'));
 });
}
/** Add a late companion along with all of their unentered hole records. */
export async function addRoundPlayerAtomic(round,player,scores) {
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  let failure=null;
  const tx=db.transaction(['rounds','roundPlayers','holeScores'],'readwrite');
  tx.objectStore('rounds').get(round.id).onsuccess=ev=>{
    if(!ev.target.result){failure=new Error('ラウンドが見つかりません。');tx.abort();return;}
    tx.objectStore('roundPlayers').getAll().onsuccess=pEv=>{
      if(pEv.target.result.filter(p=>p.roundId===round.id).length>=4){failure=new Error('登録できるプレイヤーは4名までです。');tx.abort();return;}
      tx.objectStore('roundPlayers').put(player);
      for(const score of scores)tx.objectStore('holeScores').put(score);
    };
  };
  tx.oncomplete=()=>resolve(player);
  tx.onerror=()=>reject(failure||tx.error||new Error('同伴者の追加に失敗しました。'));
  tx.onabort=()=>reject(failure||tx.error||new Error('同伴者の追加が中断されました。'));
 });
}
export async function deleteRoundPlayerAtomic(roundId,playerId) {
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  let failure=null;
  const tx=db.transaction(['roundPlayers','holeScores'],'readwrite');
  tx.objectStore('roundPlayers').get(playerId).onsuccess=ev=>{
    const player=ev.target.result;
    if(!player||player.roundId!==roundId||player.isSelf){failure=new Error('削除できないプレイヤーです。');tx.abort();return;}
    tx.objectStore('roundPlayers').delete(playerId);
    const store=tx.objectStore('holeScores');
    store.getAll().onsuccess=sEv=>{for(const score of sEv.target.result)if(score.playerId===playerId&&score.roundId===roundId)store.delete(score.id);};
  };
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(failure||tx.error||new Error('同伴者の削除に失敗しました。'));
  tx.onabort=()=>reject(failure||tx.error||new Error('同伴者の削除が中断されました。'));
 });
}

/** Stage 7: commit memo edits against the latest persisted round, preserving score snapshots. */
export async function saveRoundNotesAtomic(roundId,notes){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('rounds','readwrite');let saved,failure;
  const store=tx.objectStore('rounds');
  store.get(roundId).onsuccess=ev=>{
   const round=ev.target.result;
   if(!round){failure=Error('ラウンドが見つかりません。');tx.abort();return;}
   saved={...round,notes,updatedAt:new Date().toISOString()};store.put(saved);
  };
  tx.oncomplete=()=>resolve(saved);
  tx.onerror=()=>reject(failure||tx.error||Error('メモの保存に失敗しました。'));
  tx.onabort=()=>reject(failure||tx.error||Error('メモの保存が中断されました。'));
 });
}
/** Add photos and update round modified time in a single durable commit. */
export async function addRoundPhotosAtomic(roundId,records,maxCount=24){
 if(!Array.isArray(records)||!records.length)throw Error('追加する写真がありません。');
 if(new Set(records.map(p=>p.id)).size!==records.length)throw Error('重複した写真IDです。');
 if(records.some(p=>p.ownerType!=='round'||p.ownerId!==roundId||!(p.blob instanceof Blob)||!(p.thumbnailBlob instanceof Blob)))throw Error('写真データが正しくありません。');
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['rounds','photos'],'readwrite');let failure;
  const roundStore=tx.objectStore('rounds'),photoStore=tx.objectStore('photos');
  roundStore.get(roundId).onsuccess=ev=>{
   const round=ev.target.result;if(!round){failure=Error('ラウンドが見つかりません。');tx.abort();return;}
   photoStore.getAll().onsuccess=pEv=>{
    const existing=pEv.target.result.filter(p=>p.ownerType==='round'&&p.ownerId===roundId);
    if(existing.length+records.length>maxCount){failure=Error(`写真は最大${maxCount}枚まで登録できます。`);tx.abort();return;}
    if(records.some(p=>existing.some(x=>x.id===p.id))){failure=Error('重複した写真IDです。');tx.abort();return;}
    const start=Math.max(-1,...existing.map(p=>Number(p.order)||0))+1;
    records.forEach((p,i)=>photoStore.put({...p,order:start+i}));
    roundStore.put({...round,updatedAt:new Date().toISOString()});
   };
  };
  tx.oncomplete=()=>resolve(records.length);
  tx.onerror=()=>reject(failure||tx.error||Error('写真の保存に失敗しました。'));
  tx.onabort=()=>reject(failure||tx.error||Error('写真の保存が中断されました。'));
 });
}
export async function deleteRoundPhotoAtomic(roundId,photoId){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['rounds','photos'],'readwrite');let failure;
  const rounds=tx.objectStore('rounds'),photos=tx.objectStore('photos');
  rounds.get(roundId).onsuccess=ev=>{
   const round=ev.target.result;if(!round){failure=Error('ラウンドが見つかりません。');tx.abort();return;}
   photos.get(photoId).onsuccess=pEv=>{
    const photo=pEv.target.result;
    if(!photo||photo.ownerType!=='round'||photo.ownerId!==roundId){failure=Error('削除対象の写真が見つかりません。');tx.abort();return;}
    photos.delete(photoId);rounds.put({...round,updatedAt:new Date().toISOString()});
   };
  };
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(failure||tx.error||Error('写真の削除に失敗しました。'));
  tx.onabort=()=>reject(failure||tx.error||Error('写真の削除が中断されました。'));
 });
}
export async function reorderRoundPhotosAtomic(roundId,orderedIds){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['rounds','photos'],'readwrite');let failure;
  const rounds=tx.objectStore('rounds'),photos=tx.objectStore('photos');
  rounds.get(roundId).onsuccess=rEv=>{
   const round=rEv.target.result;if(!round){failure=Error('ラウンドが見つかりません。');tx.abort();return;}
   photos.getAll().onsuccess=pEv=>{
    const items=pEv.target.result.filter(p=>p.ownerType==='round'&&p.ownerId===roundId);
    const ids=items.map(p=>p.id);
    if(new Set(orderedIds).size!==ids.length||orderedIds.length!==ids.length||orderedIds.some(id=>!ids.includes(id))){failure=Error('写真の並び順が正しくありません。');tx.abort();return;}
    const byId=new Map(items.map(p=>[p.id,p]));
    orderedIds.forEach((id,index)=>photos.put({...byId.get(id),order:index,updatedAt:new Date().toISOString()}));
    rounds.put({...round,updatedAt:new Date().toISOString()});
   };
  };
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(failure||tx.error||Error('写真の順序を保存できませんでした。'));
  tx.onabort=()=>reject(failure||tx.error||Error('写真の順序の保存が中断されました。'));
 });
}


/** Stage 12: Snapshot every store in a single readonly transaction.
 * Data remains consistent even when another tab edits records concurrently.
 */
export async function snapshotAllStores(){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAMES,'readonly');
    const stores={};
    for(const name of STORE_NAMES){
      const request=tx.objectStore(name).getAll();
      request.onsuccess=()=>{stores[name]=request.result;};
    }
    tx.oncomplete=()=>resolve(stores);
    tx.onerror=()=>reject(tx.error||Error('バックアップ用データを取得できませんでした。'));
    tx.onabort=()=>reject(tx.error||Error('バックアップの読み取りが中断されました。'));
  });
}
/** Replace ALL stores in one IDB transaction. On any failure, the old DB is left unchanged. */
export async function restoreAllStoresAtomic(restored){
  const db=await openDatabase();
  if(STORE_NAMES.some(name=>!Array.isArray(restored?.[name])))throw Error('復元対象が不完全です。');
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAMES,'readwrite');
    try{
      for(const name of STORE_NAMES){
        const store=tx.objectStore(name);store.clear();
        for(const record of restored[name])store.put(record);
      }
    }catch(error){try{tx.abort();}catch{}reject(error);return;}
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||Error('復元に失敗しました。元データは保持されます。'));
    tx.onabort=()=>reject(tx.error||Error('復元が中断されました。元データは保持されます。'));
  });
}
