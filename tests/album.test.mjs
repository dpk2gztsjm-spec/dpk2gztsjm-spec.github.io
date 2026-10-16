import test from 'node:test';import assert from 'node:assert/strict';
import {defaultAlbumPreset,sanitizeAlbumPreset,buildAlbumModel,albumPages,jpegIssue,PALETTE} from '../src/album.js';
import {buildA5Pdf,A5_WIDTH_PT,A5_HEIGHT_PT} from '../src/album-pdf.js';
const holes=Array.from({length:18},(_,i)=>({number:i+1,par:4,yards:300}));
const round={id:'r1',courseSnapshot:{name:'テストカントリー',tee:{name:'レギュラー'},holes},holeCount:18,playedOn:'2026-10-16'};
const players=[{id:'p1',isSelf:true,name:'自分',order:0},{id:'p2',isSelf:false,name:'秘密の同伴者さん',order:1},{id:'p3',isSelf:false,name:'非公開の名前',order:2}];
const scores=players.flatMap((p,i)=>holes.map(h=>({id:`${p.id}${h.number}`,playerId:p.id,holeNumber:h.number,strokes:4+i})));
const photos=Array.from({length:6},(_,i)=>({id:`photo${i}`,ownerType:'round',ownerId:'r1',blob:{source:`x${i}`}}));
test('Private companion names and scores are not copied into export model by default',()=>{
 const p=defaultAlbumPreset(round,players,photos),model=buildAlbumModel(round,players,scores,photos,p);
 assert.equal(model.published.length,1);assert.equal(JSON.stringify(model).includes('秘密の同伴者'),false);assert.equal(JSON.stringify(model).includes('非公開の名前'),false);
 assert.equal(p.photoIds.length,5);assert.equal(model.photos.length,5);assert.equal(model.myScore,72);
});
test('Per-person name and score visibility stay independent and anonymous',()=>{
 const p=defaultAlbumPreset(round,players,photos);p.companions.p2={nameVisible:false,scoreLevel:'holes'};p.companions.p3={nameVisible:true,scoreLevel:'none'};
 const model=buildAlbumModel(round,players,scores,photos,p);
 assert.equal(model.published.length,3);assert.equal(model.published[1].name,'GUEST 1');assert.equal(model.published[1].holes.length,18);assert.equal(model.published[2].name,'非公開の名前');assert.equal(model.published[2].total,undefined);
 assert.equal(JSON.stringify(model).includes('秘密の同伴者'),false);
 assert.equal(albumPages({...model,detailLevel:'detailed'}).length,2);
});
test('Presets ignore non-owned photos, remove duplicates, clamp crops and invalid settings',()=>{
 const p=defaultAlbumPreset(round,players,photos);p.photoIds=['photo0','photo0','missing','photo2'];p.color='evil';p.crops={photo0:{x:40,y:-4,zoom:13}};p.companions.p2={nameVisible:'yes',scoreLevel:'invalid'};
 const r=sanitizeAlbumPreset(p,round,players,photos);assert.deepEqual(r.photoIds,['photo0','photo2']);assert.equal(r.color,'white');assert.deepEqual(r.crops.photo0,{x:1,y:0,zoom:2});assert.deepEqual(r.companions.p2,{nameVisible:false,scoreLevel:'none'});
});
test('Dense JPEG warning, A5 page planner, physical size',()=>{
 const p=defaultAlbumPreset(round,players,photos);p.detailLevel='detailed';for(const player of players.slice(1))p.companions[player.id]={nameVisible:true,scoreLevel:'holes'};
 const model=buildAlbumModel(round,players,scores,photos,p);assert.match(jpegIssue(model),/JPEG/);assert.deepEqual(albumPages(model),['cover','score']);assert.ok(A5_WIDTH_PT>419&&A5_WIDTH_PT<420);assert.ok(A5_HEIGHT_PT>595&&A5_HEIGHT_PT<596);
});
test('PDF writes xref offsets and emits no hidden person names in PDF streams',()=>{
 const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,0x00,0x02,0x11,0x22,0xff,0xd9]);
 const bytes=buildA5Pdf([{jpeg,width:10,height:20},{jpeg,width:10,height:20}]);const txt=new TextDecoder('latin1').decode(bytes);
 assert.ok(txt.startsWith('%PDF-1.4'));assert.match(txt,/\/Count 2/);assert.match(txt,/\/MediaBox \[0 0 419/);assert.match(txt,/\/Filter \/DCTDecode/);assert.ok(!txt.includes('秘密の同伴者'));assert.match(txt,/xref\n0 9\n/);
});
