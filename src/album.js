/** Stage 11 - album publication model. Private source records never enter exported model. */
import {roundStats,roundSections,roundScoreFor,relativeText} from './rounds.js';
export const PALETTE={white:'#FFFFFF',black:'#151C25',gray:'#77818C',red:'#EDB7B5',blue:'#B7D2E5',yellow:'#F4E0AF'};
export const MAX_ALBUM_PHOTOS=5;
export const newAlbumId=()=>`album-${globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}`;
const scoreLevels=new Set(['none','total','segments','holes']);
export function defaultAlbumPreset(round,players,photos){
 const ordered=photos.slice(0,MAX_ALBUM_PHOTOS).map(p=>p.id);
 return {id:newAlbumId(),roundId:round.id,title:'',photoIds:ordered,coverType:ordered.length?'photo':'color',coverPhotoId:ordered[0]||null,color:'white',coverScorePosition:'left',layout:'gallery',scoreDirection:'horizontal',detailLevel:'simple',companionLayout:'table',companions:Object.fromEntries(players.filter(p=>!p.isSelf).map(p=>[p.id,{nameVisible:false,scoreLevel:'none'}])),crops:{},format:'jpeg',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export function sanitizeAlbumPreset(preset,round,players,photos){
 if(!preset||preset.roundId!==round.id)throw Error('このラウンドのアルバム設定ではありません。');
 const allIds=new Set(photos.map(p=>p.id));
 const ids=[...new Set((Array.isArray(preset.photoIds)?preset.photoIds:[]).filter(x=>allIds.has(x)))].slice(0,MAX_ALBUM_PHOTOS);
 const valid=(value,choices,fallback)=>choices.includes(value)?value:fallback;
 const companions={};
 for(const p of players.filter(p=>!p.isSelf)){
  const setting=preset.companions?.[p.id]||{};
  companions[p.id]={nameVisible:setting.nameVisible===true,scoreLevel:scoreLevels.has(setting.scoreLevel)?setting.scoreLevel:'none'};
 }
 const crops={};
 for(const id of ids){const c=preset.crops?.[id]||{};crops[id]={x:Math.min(1,Math.max(0,c.x===undefined?0.5:Number(c.x))),y:Math.min(1,Math.max(0,c.y===undefined?0.5:Number(c.y))),zoom:Math.min(2,Math.max(1,Number(c.zoom)||1))};}
 return {...preset,id:typeof preset.id==='string'?preset.id:newAlbumId(),roundId:round.id,photoIds:ids,
  coverType:valid(preset.coverType,['photo','color'],ids.length?'photo':'color'),
  coverPhotoId:ids.includes(preset.coverPhotoId)?preset.coverPhotoId:ids[0]||null,
  color:valid(preset.color,Object.keys(PALETTE),'white'),coverScorePosition:valid(preset.coverScorePosition,['center','left','right'],'left'),
  layout:valid(preset.layout,['gallery','mosaic'],'gallery'),scoreDirection:valid(preset.scoreDirection,['horizontal','vertical'],'horizontal'),
  detailLevel:valid(preset.detailLevel,['simple','detailed'],'simple'),companionLayout:valid(preset.companionLayout,['table','cards'],'table'),
  companions,crops,format:valid(preset.format,['jpeg','pdf'],'jpeg')};
}
/** Only data the user explicitly chose to publish is copied. No original player record leaks. */
export function buildAlbumModel(round,players,scores,photos,preset){
 const p=sanitizeAlbumPreset(preset,round,players,photos);
 const sections=roundSections(round),stat=roundStats(round,players,scores),own=players.find(x=>x.isSelf);
 if(!own)throw Error('ラウンドの本人データが見つかりません。');
 const relevant=[own,...players.filter(x=>!x.isSelf&& (p.companions[x.id]?.nameVisible || p.companions[x.id]?.scoreLevel!=='none'))];
 const published=relevant.map((person)=>{
  const ownPlayer=person.id===own.id, setting=ownPlayer?{nameVisible:true,scoreLevel:p.detailLevel==='detailed'?'holes':'segments'}:p.companions[person.id];
  const index=players.filter(x=>!x.isSelf).findIndex(x=>x.id===person.id);
  const name=ownPlayer?'YOU':setting.nameVisible?person.name:`GUEST ${index+1}`;
  const scoreLevel=setting.scoreLevel;
  const s=stat.find(x=>x.id===person.id);
  const out={name,own:ownPlayer,scoreLevel};
  if(scoreLevel!=='none'){
   out.total=s.total.strokes;out.relative=relativeText(s.total.relative);out.complete=s.total.complete;
   if(scoreLevel==='segments'||scoreLevel==='holes')out.sections=s.sections.map(x=>({name:x.name,total:x.strokes,complete:x.complete}));
   if(scoreLevel==='holes')out.holes=round.courseSnapshot.holes.map(h=>({number:h.number,par:h.par,strokes:roundScoreFor(scores,person.id,h.number)?.strokes??null}));
  }
  return out;
 });
 const ownStat=stat.find(x=>x.id===own.id);
 return {course:String(round.courseSnapshot.name||''),playedOn:String(round.playedOn||''),tee:String(round.courseSnapshot.tee?.name||''),par:round.courseSnapshot.holes.reduce((a,h)=>a+h.par,0),holeCount:round.holeCount,
  myScore:ownStat.total.strokes,myRelative:relativeText(ownStat.total.relative),myComplete:ownStat.total.complete,
  sections:sections.map(x=>({name:x.name,holes:x.holes.map(h=>({number:h.number,par:h.par}))})),
  photos:p.photoIds.map(id=>photos.find(x=>x.id===id)).filter(Boolean).map(x=>({id:x.id,blob:x.blob,crop:p.crops[x.id]})),
  coverType:p.coverType,coverPhotoId:p.coverPhotoId,color:PALETTE[p.color],coverScorePosition:p.coverScorePosition,layout:p.layout,scoreDirection:p.scoreDirection,detailLevel:p.detailLevel,companionLayout:p.companionLayout,published};
}
/** JPEG must remain legible: detailed 18-hole four-player layouts belong in multipage PDF. */
export function jpegIssue(model){
 const detailed=model.published.filter(p=>p.holes?.length);
 if(model.detailLevel==='detailed' && model.holeCount===18 && detailed.length>2)return '18ホールの詳細スコアを3人以上掲載するとJPEGの文字が小さくなります。複数ページPDFか掲載人数を減らしてください。';
 if(model.detailLevel==='detailed' && model.holeCount===18 && model.photos.length>=3 && detailed.length>=1)return '18ホール詳細と写真3枚以上を1枚のJPEGに詰めると文字が小さくなります。複数ページPDFを選択するか写真を減らしてください。';
 if(model.detailLevel==='detailed' && model.photos.length>=5 && detailed.length>=2)return '詳細スコアと写真5枚を1枚のJPEGへ入れると可読性が不足します。写真や掲載人数を減らすかPDFを選択してください。';
 return null;
}
export function albumPages(model){
 const detailed=model.detailLevel==='detailed',count=model.published.filter(p=>p.holes?.length).length;
 const separate=detailed&&(model.holeCount===18&&(count>=2||model.photos.length>=4)||count>=3);
 return separate?['cover','score']:['combined'];
}
export function albumPhotoWarning(model){
 const count=model.photos.length;
 return count<3?`アルバム写真は3〜5枚が基本です（現在${count}枚）。写真が少なくても生成できます。`:'';
}
