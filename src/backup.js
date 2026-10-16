/** GOLF JOURNAL portable offline backup format v1 (JSON with base64 photo Blobs).
 * Files contain personal information: the export never accesses the network.
 */
export const BACKUP_FORMAT = 'GOLF-JOURNAL-BACKUP';
export const BACKUP_VERSION = 1;
export const MAX_FILE_BYTES = 300 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const PROHIBITED_KEYS = new Set(['__proto__','prototype','constructor']);
const MEDIA_MIME = new Set(['image/jpeg','image/png','image/webp']);

export function countRecords(stores, storeNames) {
  return Object.fromEntries(storeNames.map(name=>[name, Array.isArray(stores?.[name]) ? stores[name].length : 0]));
}
function assertSafe(value, depth=0) {
  if(depth>60) throw Error('階層が深すぎる不正なデータです。');
  if(value===null||value===undefined||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(Array.isArray(value)){for(const x of value) assertSafe(x,depth+1);return;}
  if(typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype){
    for(const [k,v] of Object.entries(value)){
      if(PROHIBITED_KEYS.has(k))throw Error('安全でないプロパティ名が含まれています。');
      assertSafe(v,depth+1);
    }
    return;
  }
  throw Error('未対応のデータ型が含まれています。');
}
function checksum32(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619)>>>0;return h.toString(16).padStart(8,'0');}
function encode64(bytes){
  let result='';
  for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(result);
}
function decode64(text){
  if(typeof text!=='string'||text.length>MAX_IMAGE_BYTES*4/3+16||text.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw Error('画像のBase64形式が正しくありません。');
  const raw=atob(text);if(raw.length>MAX_IMAGE_BYTES)throw Error('1枚の画像が30MBを超えています。');
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
}
function imageSignature(bytes,mime){
  if(mime==='image/jpeg')return bytes.length>3 && bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/png')return bytes.length>7&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
  if(mime==='image/webp')return bytes.length>11&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  return false;
}
async function serializeBlob(blob){
  if(!(blob instanceof Blob) || !MEDIA_MIME.has(blob.type))throw Error('写真はJPEG・PNG・WebPのみバックアップできます。');
  if(blob.size>MAX_IMAGE_BYTES)throw Error('30MBを超える写真があります。元画像を縮小してください。');
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(!imageSignature(bytes,blob.type))throw Error('画像の形式と実際の内容が一致しません。');
  return {mime:blob.type,base64:encode64(bytes),checksum:checksum32(bytes)};
}
function deserializeBlob(encoded){
  if(!encoded||typeof encoded!=='object'||Array.isArray(encoded)||!MEDIA_MIME.has(encoded.mime))throw Error('画像形式を復元できません。');
  const bytes=decode64(encoded.base64);
  if(!imageSignature(bytes,encoded.mime)||checksum32(bytes)!==encoded.checksum)throw Error('写真の内容が破損しています（チェックサム不一致）。');
  return new Blob([bytes],{type:encoded.mime});
}
/** Build independently of IndexedDB so it is testable and exportable. */
export async function createBackup(stores,storeNames,exportedAt=new Date().toISOString()){
  const payload={};
  for(const name of storeNames){
    if(!Array.isArray(stores[name]))throw Error(`${name} が取得できませんでした。`);
    payload[name]=[];
    for(const original of stores[name]){
      const record={...original};
      if(name==='photos'){
        for(const key of ['blob','thumbnailBlob']){
          if(record[key]!=null)record[key]=await serializeBlob(record[key]);
        }
      }
      assertSafe(record);payload[name].push(record);
    }
  }
  return {format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt,stores:payload};
}
/** Fully validate and decode *before* replacing any existing records. */
export function parseBackup(input,storeNames){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('バックアップファイルの内容が正しくありません。');
  if(input.format!==BACKUP_FORMAT)throw Error('GOLF JOURNALのバックアップではありません。');
  if(input.version!==BACKUP_VERSION)throw Error('対応していないバックアップ形式です。');
  if(typeof input.exportedAt!=='string'||Number.isNaN(Date.parse(input.exportedAt)))throw Error('作成日時が正しくありません。');
  if(!input.stores||typeof input.stores!=='object'||Array.isArray(input.stores))throw Error('データ領域が見つかりません。');
  const inputStores=Object.keys(input.stores);
  if(inputStores.length!==storeNames.length || inputStores.some(n=>!storeNames.includes(n)))throw Error('データ領域の種類が一致しません。部分的な復元はできません。');
  const output={}; let total=0;
  for(const name of storeNames){
    const list=input.stores[name];
    if(!Array.isArray(list))throw Error(`${name} の記録が見つかりません。`);
    if(list.length>100000)throw Error('記録数が多すぎます。');
    const ids=new Set();output[name]=[];total+=list.length;
    for(const record of list){
      assertSafe(record);
      if(!record||typeof record!=='object'||Array.isArray(record)||typeof record.id!=='string'||!record.id.trim()||record.id.length>256)throw Error(`${name} に不正なIDがあります。`);
      if(ids.has(record.id))throw Error(`${name} に重複したIDがあります。`);
      ids.add(record.id);
      const restored={...record};
      if(name==='photos'){
        if(restored.blob!=null)restored.blob=deserializeBlob(restored.blob);
        if(restored.thumbnailBlob!=null)restored.thumbnailBlob=deserializeBlob(restored.thumbnailBlob);
        if(!(restored.blob instanceof Blob))throw Error('写真の本体データがありません。');
      }
      output[name].push(restored);
    }
  }
  if(total>100000)throw Error('バックアップに含まれるデータが多すぎます。');
  const rounds=new Set(output.rounds.map(x=>x.id));
  const players=new Map(output.roundPlayers.map(x=>[x.id,x]));
  for(const p of output.roundPlayers)if(!rounds.has(p.roundId))throw Error('存在しないラウンドに紐づくプレイヤーがあります。');
  for(const s of output.holeScores)if(!rounds.has(s.roundId)||!players.has(s.playerId)||players.get(s.playerId).roundId!==s.roundId)throw Error('スコアの紐づけが正しくありません。');
  for(const p of output.photos){if(p.ownerType==='round'&&!rounds.has(p.ownerId))throw Error('写真のラウンド参照が正しくありません。');}
  for(const preset of output.albumPresets)if(!rounds.has(preset.roundId))throw Error('アルバム設定のラウンド参照が正しくありません。');
  return {stores:output,counts:countRecords(output,storeNames),exportedAt:input.exportedAt};
}
export function backupFilename(date=new Date()){
  const stamp=(date instanceof Date?date:new Date(date)).toISOString().slice(0,19).replace(/[-:]/g,'').replace('T','-');
  return `GOLF-JOURNAL-backup-${stamp}.json`;
}
