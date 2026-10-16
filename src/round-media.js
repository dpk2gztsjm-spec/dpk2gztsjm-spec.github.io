/** Round photos are owned by individual rounds. No external image URLs are required. */
export const MAX_ROUND_PHOTOS=24;
export const MAX_NOTE_LENGTH=5000;
export const roundPhotoId=()=>`round-photo-${globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}`;
export function roundPhotosFor(photos,roundId){
  return photos.filter(p=>p.ownerType==='round'&&p.ownerId===roundId)
    .sort((a,b)=>(a.order??0)-(b.order??0)||String(a.createdAt).localeCompare(String(b.createdAt))||a.id.localeCompare(b.id));
}
export function validateRoundNotes(notes){
  if(typeof notes!=='string')throw Error('メモは文字列で入力してください。');
  if(notes.length>MAX_NOTE_LENGTH)throw Error(`ラウンドメモは${MAX_NOTE_LENGTH}文字以内で入力してください。`);
  return notes;
}
export function moveRoundPhoto(photos,photoId,direction){
  const ordered=[...photos];const index=ordered.findIndex(p=>p.id===photoId);const next=index+direction;
  if(index<0||next<0||next>=ordered.length)return ordered.map(p=>p.id);
  [ordered[index],ordered[next]]=[ordered[next],ordered[index]];
  return ordered.map(p=>p.id);
}
/** Decode, honor EXIF orientation, downsample, and freshly encode JPEG to discard EXIF/GPS.
 * Thumbnail is separately encoded; originals are deliberately not retained.
 */
export async function prepareRoundPhoto(file){
  if(!file||typeof file.size!=='number'||file.size===0)throw Error('画像ファイルを選択してください。');
  if(file.size>20*1024*1024)throw Error('1枚20MB以下の画像を選択してください。');
  if(file.type&&!file.type.startsWith('image/'))throw Error('画像ファイルを選択してください。');
  const url=URL.createObjectURL(file);let bitmap=null;
  try{
    let source,w,h;
    if(typeof createImageBitmap==='function'){
      bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
      source=bitmap;w=bitmap.width;h=bitmap.height;
    }else{
      const img=new Image();img.src=url;
      if(img.decode)await img.decode();
      else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
      source=img;w=img.naturalWidth;h=img.naturalHeight;
    }
    if(!w||!h||w*h>100000000)throw Error('画像のサイズを読み取れないか、大きすぎます。');
    async function encode(maxDimension,quality){
      const ratio=Math.min(1,maxDimension/Math.max(w,h));
      const width=Math.max(1,Math.round(w*ratio)),height=Math.max(1,Math.round(h*ratio));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('画像の変換機能が利用できません。');
      ctx.drawImage(source,0,0,width,height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      if(!blob||blob.type!=='image/jpeg')throw Error('JPEGへ変換できませんでした。');
      canvas.width=canvas.height=0;
      return {blob,width,height};
    }
    const full=await encode(1920,0.84);const thumb=await encode(420,0.72);
    return {blob:full.blob,thumbnailBlob:thumb.blob,width:full.width,height:full.height};
  }catch(err){throw Error(`写真を読み込めませんでした。 ${err?.message||''}`.trim());}
  finally{bitmap?.close?.();URL.revokeObjectURL(url);}
}
