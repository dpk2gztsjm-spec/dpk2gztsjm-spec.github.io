/** Re-encode user-selected images; encoded JPEG carries no source EXIF/GPS. */
export async function prepareCoursePhoto(file) {
  if(!file||typeof file.size!=='number')throw new Error('画像を選択してください。');
  if(file.size>15*1024*1024)throw new Error('画像は15MB以下を選択してください。');
  if(file.size===0)throw new Error('空のファイルは登録できません。');
  if(file.type&&!file.type.startsWith('image/'))throw new Error('画像ファイルを選択してください。');
  const url=URL.createObjectURL(file);
  let bitmap=null;
  try {
    let width,height,source;
    if(typeof createImageBitmap==='function'){
      bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
      source=bitmap;width=bitmap.width;height=bitmap.height;
    }else{
      const img=new Image();img.src=url;
      if(img.decode)await img.decode();
      else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
      source=img;width=img.naturalWidth;height=img.naturalHeight;
    }
    if(!width||!height)throw new Error('画像の縦横サイズを取得できません。');
    const scale=Math.min(1,1600/Math.max(width,height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.84));
    if(!blob||blob.type!=='image/jpeg')throw new Error('写真をJPEGに変換できませんでした。');
    return blob;
  }catch(error){throw new Error(`写真を読み込めませんでした。 ${error?.message||''}`.trim());}
  finally {bitmap?.close?.();URL.revokeObjectURL(url);}
}
