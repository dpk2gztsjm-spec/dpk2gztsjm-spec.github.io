/** All album previews and files use this one deterministic canvas renderer. */
import {albumPages} from './album.js';
import {buildA5Pdf,blobBytes} from './album-pdf.js';
export const JPEG_SIZE={width:1440,height:2560};
export const PDF_SIZE={width:1776,height:2520}; // A5 portrait ~300 dpi
const font='"Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
const ink='#17212B',muted='#65717D';
function albumRect(g,x,y,w,h,color,r=0){g.fillStyle=color;g.beginPath();if(r){g.roundRect(x,y,w,h,r);}else g.rect(x,y,w,h);g.fill();}
function albumLine(g,x,y,X,Y,color='#DCE2E8',width=2){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.stroke();}
function albumTxt(g,s,x,y,size=34,color=ink,weight=400,maxWidth=Infinity,align='left'){
 g.fillStyle=color;g.textAlign=align;g.textBaseline='alphabetic';g.font=`${weight} ${size}px ${font}`;
 let v=String(s??'—');if(g.measureText(v).width>maxWidth){while(v.length>1&&g.measureText(v+'…').width>maxWidth)v=v.slice(0,-1);v+='…';}
 g.fillText(v,x,y);g.textAlign='left';
}
export async function loadAlbumImages(model){
 const loaded=new Map();
 try{
  for(const p of model.photos){
   if(!p.blob)continue;
   if(typeof createImageBitmap==='function'){
    try{const image=await createImageBitmap(p.blob);loaded.set(p.id,{image,close:()=>image.close?.()});continue;}catch{}
   }
   const url=URL.createObjectURL(p.blob);const image=new Image();image.src=url;
   try{if(image.decode)await image.decode();else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});loaded.set(p.id,{image,close:()=>URL.revokeObjectURL(url)});}
   catch(err){URL.revokeObjectURL(url);throw Error('アルバム写真を読み込めませんでした。');}
  }
  return loaded;
 }catch(err){closeAlbumImages(loaded);throw err;}
}
export function closeAlbumImages(images){for(const x of images.values())x.close?.();}
function drawPhoto(g,p,images,x,y,w,h,r=0){
 const asset=images.get(p?.id);if(!asset){albumRect(g,x,y,w,h,'#D9E0E4',r);return;}
 const img=asset.image, iw=img.width||img.naturalWidth,ih=img.height||img.naturalHeight;
 const crop=p?.crop||{};const zoom=Math.min(2,Math.max(1,crop.zoom||1));
 const scale=Math.max(w/iw,h/ih)*zoom, sw=w/scale,sh=h/scale;
 const cx=Math.min(1,Math.max(0,crop.x??0.5)),cy=Math.min(1,Math.max(0,crop.y??0.5));
 const sx=Math.max(0,Math.min(iw-sw,(iw-sw)*cx)),sy=Math.max(0,Math.min(ih-sh,(ih-sh)*cy));
 g.save();g.beginPath();g.roundRect(x,y,w,h,r);g.clip();g.drawImage(img,sx,sy,sw,sh,x,y,w,h);g.restore();
}
function albumHead(g,W,title,subtitle,y=78){
 albumTxt(g,'G O L F   J O U R N A L',72,y,27,muted,700);
 albumTxt(g,title,72,y+72,52,ink,800,W-144);
 albumTxt(g,subtitle,72,y+126,28,muted,400,W-144);
}
function hero(g,W,H,m,images,y,height){
 const photo=m.coverType==='photo'&&m.coverPhotoId?m.photos.find(p=>p.id===m.coverPhotoId):null;
 if(photo){drawPhoto(g,photo,images,64,y,W-128,height,23);}
 else albumRect(g,64,y,W-128,height,m.color,23);
 const dark=photo||m.color==='#151C25';
 if(photo){const gradient=g.createLinearGradient(0,y,0,y+height);gradient.addColorStop(0,'rgba(9,17,27,.06)');gradient.addColorStop(0.5,'rgba(9,17,27,.28)');gradient.addColorStop(1,'rgba(9,17,27,.84)');albumRect(g,64,y,W-128,height,gradient,23);}
 const color=dark?'#FFFFFF':ink,sub=dark?'#F6F6F6':'#344454';
 albumTxt(g,'ROUND MEMORY',106,y+86,30,color,700);
 albumTxt(g,m.course,106,y+166,54,color,800,W-208);
 albumTxt(g,`${m.playedOn}  /  ${m.tee}`,106,y+215,30,sub,500,W-200);
 const pos=m.coverScorePosition;
 const x=pos==='center'?W/2:pos==='right'?W-116:112;
 const align=pos==='center'?'center':pos==='right'?'right':'left';
 const endY=y+height-72;
 albumTxt(g,m.myScore??'—',x,endY-34,134,color,800,550,align);
 albumTxt(g,`${m.myRelative} TO PAR ${m.myComplete?'':'· 暫定'}`,x,endY+22,37,color,700,460,align);
}
function photoWall(g,W,m,images,y,height){
 const pp=m.coverType==='photo'?m.photos.filter(p=>p.id!==m.coverPhotoId):m.photos;
 if(!pp.length){albumRect(g,64,y,W-128,height,'#F2F4F5',20);albumTxt(g,'ADD YOUR ROUND PHOTOS',W/2,y+height/2,38,muted,600,W-160,'center');return;}
 const gap=12,left=64,totalW=W-128;
 if(m.layout==='mosaic'&&pp.length>=2){
  const leadW=totalW*.61,sideW=totalW-leadW-gap;
  drawPhoto(g,pp[0],images,left,y,leadW,height,18);
  for(let i=1;i<pp.length;i++){const h=(height-gap*(pp.length-2))/(pp.length-1);drawPhoto(g,pp[i],images,left+leadW+gap,y+(i-1)*(h+gap),sideW,h,12);}
 }else{
  const cols=pp.length===1?1:2,rows=Math.ceil(pp.length/cols),cw=(totalW-(cols-1)*gap)/cols,rh=(height-(rows-1)*gap)/rows;
  pp.forEach((p,i)=>drawPhoto(g,p,images,left+(i%cols)*(cw+gap),y+Math.floor(i/cols)*(rh+gap),cw,rh,14));
 }
}
function compactScores(g,W,m,y,availableHeight){
 albumTxt(g,'SCORE SUMMARY',70,y+35,30,muted,700);
 const people=m.published.slice(0,4),gap=12,boxH=Math.min(175,(availableHeight-65)/Math.max(1,Math.ceil(people.length/(m.companionLayout==='cards'?2:1))));
 const cards=m.companionLayout==='cards';
 let base=y+62;
 for(let i=0;i<people.length;i++){
  const p=people[i],row=cards?Math.floor(i/2):i,col=cards?i%2:0;
  const width=cards?(W-140-gap)/2:W-128,x=64+col*(width+gap),ry=base+row*(boxH+10);
  albumRect(g,x,ry,width,boxH,'#F3F6F7',13);
  const compact=boxH<135,nameY=compact?Math.max(28,boxH*.39):57,scoreY=compact?Math.max(38,boxH*.57):73,subtitleY=compact?Math.max(57,boxH-14):110;
  albumTxt(g,p.name,x+26,ry+nameY,compact?25:32,ink,700,cards?width-150:width-270);
  const score=p.scoreLevel==='none'?'非公開':p.total===null?'—':String(p.total);
  albumTxt(g,score,x+width-25,ry+scoreY,compact?42:55,ink,750,cards?135:170,'right');
  if(p.scoreLevel!=='none'){
   const sections=p.sections?.map(s=>`${s.name} ${s.total??'—'}`).join('  /  ');
   albumTxt(g,sections||`${p.relative||'—'} TO PAR`,x+26,ry+subtitleY,compact?20:25,muted,500,width-55);
   if(p.complete===false)albumTxt(g,'入力途中',x+width-26,ry+subtitleY,compact?18:22,muted,400,110,'right');
  }
 }
}
function drawHoleGrid(g,W,m,y,height,scorePage=false){
 const holePeople=m.published.filter(p=>p.holes?.length);
 if(!holePeople.length){compactScores(g,W,m,y,Math.min(height,420));return;}
 const sections=m.sections;
 albumTxt(g,'DETAILED SCORECARD',70,y+42,35,ink,800);
 const horizontal=m.scoreDirection==='horizontal'&&sections.length===2;
 const tables=horizontal?sections.length:1;
 const contentY=y+72,contentH=height-96;
 for(let s=0;s<sections.length;s++){
  const section=sections[s],boxX=horizontal?64+s*((W-128)/2):64,boxW=horizontal?(W-128)/2-8:W-128;
  const boxY=horizontal?contentY:contentY+s*(contentH/sections.length);
  const boxH=horizontal?contentH:contentH/sections.length-14;
  const rowH=Math.min(scorePage?126:76,Math.floor((boxH-50)/(holePeople.length+1)));
  const startY=boxY+16;
  albumTxt(g,`${section.name}  /  PAR ${section.holes.reduce((a,h)=>a+h.par,0)}`,boxX+10,startY+25,30,ink,700);
  const colName=Math.min(horizontal?126:200,boxW*.23),cw=(boxW-colName-18)/(section.holes.length+1);
  const firstY=startY+90;
  albumRect(g,boxX,firstY-35,boxW,rowH,'#E9EFF1',8);
  albumTxt(g,'HOLE',boxX+8,firstY+10,23,muted,700,colName-12);
  section.holes.forEach((h,i)=>albumTxt(g,h.number,boxX+colName+cw*(i+.5),firstY+10,scorePage?29:horizontal?23:28,ink,650,cw-2,'center'));
  albumTxt(g,'Σ',boxX+colName+cw*(section.holes.length+.5),firstY+10,27,ink,750,cw-2,'center');
  let parY=firstY+rowH;
  albumTxt(g,'PAR',boxX+8,parY+5,24,muted,600);
  section.holes.forEach((h,i)=>albumTxt(g,h.par,boxX+colName+cw*(i+.5),parY+5,24,muted,500,cw-2,'center'));
  const parTotal=section.holes.reduce((a,h)=>a+h.par,0);albumTxt(g,parTotal,boxX+colName+cw*(section.holes.length+.5),parY+5,24,muted,500,cw-2,'center');
  holePeople.forEach((p,pi)=>{
   const ry=parY+rowH*(pi+1);if(pi%2===0)albumRect(g,boxX,ry-rowH+8,boxW,rowH,'#F5F7F8',5);
   albumTxt(g,p.name,boxX+8,ry+1,scorePage?26:horizontal?22:27,ink,700,colName-15);
   const numbers=section.holes.map(h=>p.holes.find(x=>x.number===h.number)?.strokes??null);
   numbers.forEach((value,i)=>albumTxt(g,value??'—',boxX+colName+cw*(i+.5),ry+1,scorePage?29:25,ink,600,cw-2,'center'));
   const subtotal=numbers.every(Number.isInteger)?numbers.reduce((a,b)=>a+b,0):'—';
   albumTxt(g,subtotal,boxX+colName+cw*(section.holes.length+.5),ry+1,scorePage?29:25,ink,800,cw-2,'center');
  });
 }
 const other=m.published.filter(x=>!x.holes?.length);
 if(other.length)albumTxt(g,`${other.map(p=>`${p.name}: ${p.scoreLevel==='none'?'非公開':p.total??'—'}`).join('  ·  ')}`,72,y+height-10,25,muted,500,W-144);
}
/** Render layout at final pixel resolution, no post-export layout substitution. */
export function drawAlbumPage(model,pageKind,images,{width=JPEG_SIZE.width,height=JPEG_SIZE.height}={}){
 if(typeof document==='undefined')throw Error('Canvasレンダリングにはブラウザーが必要です。');
 const cv=document.createElement('canvas');cv.width=width;cv.height=height;
 const g=cv.getContext('2d',{alpha:false});if(!g)throw Error('Canvasを利用できません。');
 const W=1440,H=height/width*W;g.scale(width/W,height/H);
 albumRect(g,0,0,W,H,'#FFFFFF');
 if(pageKind==='score'){
  albumHead(g,W,'SCORECARD',`${model.course}  /  ${model.playedOn}`);
  drawHoleGrid(g,W,model,270,H-400,true);
  albumLine(g,72,H-105,W-72,H-105);albumTxt(g,'GOLF JOURNAL',72,H-58,25,muted,700);albumTxt(g,'A5 / SCORECARD',W-72,H-58,24,muted,500,500,'right');
 }else{
  const coverOnly=pageKind==='cover',coverY=66,spacious=model.detailLevel==='simple'&&model.published.length<=2,coverH=coverOnly?H*.40:spacious?H*.44:H*.36;
  hero(g,W,H,model,images,coverY,coverH);
  const photoY=coverY+coverH+24,photoH=coverOnly?H*.27:spacious?H*.33:H*.305;
  photoWall(g,W,model,images,photoY,photoH);
  const scoreY=photoY+photoH+18,avail=H-scoreY-122;
  if(!coverOnly&&model.detailLevel==='detailed')drawHoleGrid(g,W,model,scoreY,avail);
  else compactScores(g,W,model,scoreY,avail);
  albumLine(g,72,H-93,W-72,H-93);albumTxt(g,'GOLF JOURNAL',72,H-49,25,muted,700);albumTxt(g,`${model.playedOn} · ${model.holeCount} HOLES`,W-72,H-49,24,muted,500,500,'right');
 }
 return cv;
}
export async function canvasJpeg(canvas,quality=.9){
 const b=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(!b||b.type!=='image/jpeg')throw Error('JPEGの出力に失敗しました。');return b;
}
export async function renderAlbumFiles(model,format){
 const images=await loadAlbumImages(model);
 try{
  const kinds=format==='pdf'?albumPages(model):['combined'];
  const pages=[];
  for(const kind of kinds){const size=format==='pdf'?PDF_SIZE:JPEG_SIZE,canvas=drawAlbumPage(model,kind,images,size);const jpeg=await canvasJpeg(canvas,format==='pdf'?.93:.91);pages.push({kind,blob:jpeg,width:size.width,height:size.height});canvas.width=canvas.height=0;}
  if(format==='jpeg')return {blob:pages[0].blob,pages,mime:'image/jpeg'};
  if(format==='pdf')return {blob:new Blob([buildA5Pdf(await Promise.all(pages.map(async p=>({jpeg:await blobBytes(p.blob),width:p.width,height:p.height}))))],{type:'application/pdf'}),pages,mime:'application/pdf'};
  throw Error('出力形式が不正です。');
 }finally{closeAlbumImages(images);}
}
