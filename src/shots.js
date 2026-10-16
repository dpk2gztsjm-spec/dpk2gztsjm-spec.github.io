/** MY SHOTS — private user-defined shot profiles linked to a physical club ID. */
export const SHOT_TYPES = Object.freeze([
  {value:'full', label:'フルショット'},
  {value:'control', label:'コントロールショット'},
  {value:'chip', label:'チップショット'},
  {value:'pitch', label:'ピッチショット'},
  {value:'pitch-run', label:'ピッチ＆ラン'},
  {value:'running', label:'ランニングアプローチ'},
  {value:'lob', label:'ロブショット'},
  {value:'bunker', label:'バンカーショット'},
  {value:'punch', label:'パンチショット'},
  {value:'other', label:'その他'}
]);
export const BACKSWINGS = Object.freeze([
  {value:'25',label:'25%'},{value:'50',label:'50%'},
  {value:'75',label:'75%'},{value:'100',label:'100%'},
  {value:'clock',label:'時計式'},{value:'other',label:'その他'}
]);

export const DEFAULT_SHOT = Object.freeze({
  clubId:'',name:'',type:'',customType:'',backswing:'',customBackswing:'',
  carryYards:'',rollYards:'',distanceSource:'unmeasured',
  stanceWidth:'',ballPosition:'',bodyAlignment:'',weightDistribution:'',faceDirection:'',
  keyPoints:'',lieConditions:'',distanceVariability:'',notes:''
});
const SHORT_FIELDS=['name','customType','customBackswing','stanceWidth','ballPosition','bodyAlignment','weightDistribution','faceDirection','lieConditions','distanceVariability'];
const LONG_FIELDS=['keyPoints','notes'];
function numberOrNull(input) {
  if (input===null || input===undefined || String(input).trim()==='') return null;
  return Number(input);
}
export function cleanShot(input={}) {
  const result={
    clubId:String(input.clubId??''),
    type:String(input.type??''),
    backswing:String(input.backswing??''),
    carryYards:numberOrNull(input.carryYards),
    rollYards:numberOrNull(input.rollYards),
    distanceSource:input.distanceSource==='measured'?'measured':'unmeasured'
  };
  for(const key of SHORT_FIELDS)result[key]=String(input[key]??'').trim();
  for(const key of LONG_FIELDS)result[key]=String(input[key]??'').trim();
  if(result.type!=='other') result.customType='';
  if(result.backswing!=='other'&&result.backswing!=='clock') result.customBackswing='';
  return result;
}
export function validateShot(shot, clubs=[]) {
  const errors={};
  if(!clubs.some(club=>club.id===shot.clubId))errors.clubId='所有クラブを選択してください。';
  if(!shot.name)errors.name='ショット名を入力してください。';
  else if(shot.name.length>60)errors.name='ショット名は60文字以内で入力してください。';
  if(!SHOT_TYPES.some(x=>x.value===shot.type))errors.type='ショットの種類を選択してください。';
  if(shot.type==='other'&&!shot.customType)errors.customType='「その他」の種類を入力してください。';
  if(!BACKSWINGS.some(x=>x.value===shot.backswing))errors.backswing='振り幅を選択してください。';
  if((shot.backswing==='other'||shot.backswing==='clock')&&!shot.customBackswing)errors.customBackswing='振り幅の内容を入力してください。';
  for(const key of ['carryYards','rollYards']) {
    const n=shot[key];
    if(n!==null&&(!Number.isFinite(n)||n<0||n>1000||Math.round(n*10)!==n*10)) errors[key]='0〜1000yd、少数第1位まで入力してください。';
  }
  for(const key of SHORT_FIELDS) {
    if(key!=='name'&&shot[key].length>160)errors[key]='160文字以内で入力してください。';
  }
  for(const key of LONG_FIELDS)if(shot[key].length>1000)errors[key]='1000文字以内で入力してください。';
  if(shot.distanceSource==='measured'&&shot.carryYards===null&&shot.rollYards===null)errors.distanceSource='実測を選ぶ場合はキャリーまたはランを入力してください。';
  return errors;
}
export function shotTypeLabel(shot) {
  return shot?.type==='other' ? (shot.customType || 'その他') : SHOT_TYPES.find(x=>x.value===shot?.type)?.label || '未設定';
}
export function backswingLabel(shot) {
  if(shot?.backswing==='clock')return `時計式：${shot.customBackswing || '未指定'}`;
  if(shot?.backswing==='other')return shot.customBackswing || 'その他';
  return BACKSWINGS.find(x=>x.value===shot?.backswing)?.label || '未設定';
}
export function shotDataCategory(shot) {
  return shot?.distanceSource==='measured'&&(shot.carryYards!==null||shot.rollYards!==null)
    ? 'measured' : 'unmeasured';
}
export function yards(value) {return value===null||value===undefined||value===''?'未登録':`${value} yd`;}
export function newShotId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const bytes=new Uint8Array(16); globalThis.crypto.getRandomValues(bytes);
    return 'shot-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  throw new Error('IDを生成できません。HTTPSまたはlocalhostから起動してください。');
}

/** Self-authored, technique-only references; NEVER imply personal measured yards. */
export const REFERENCE_SHOTS = Object.freeze([
  {type:'chip',title:'チップ',intro:'比較的低く打ち出して、着地後のランを使う打ち方。',advice:'ボール位置と手元の位置を揃え、無理に球を持ち上げず短い振り幅で試す。',caution:'ランの長さはクラブ・芝・グリーン状態で変わる。'},
  {type:'pitch',title:'ピッチ',intro:'キャリーを使って目標付近に運ぶ打ち方。',advice:'ロフトを活かし、体の回転と振り幅を一定にして距離を測る。',caution:'強く打つだけでキャリーを合わせない。'},
  {type:'pitch-run',title:'ピッチ＆ラン',intro:'キャリーとランの両方で距離を作るアプローチ。',advice:'着地点を先に決め、そこから転がりを観察して自分の目安を記録する。',caution:'キャリーと総距離は別の情報として管理する。'},
  {type:'running',title:'ランニング',intro:'低い球と転がりを中心に距離を調整する。',advice:'障害物が少ない場所で落としどころとランの再現性を練習する。',caution:'グリーン面の傾斜や芝の影響が大きい。'},
  {type:'lob',title:'ロブ',intro:'高く打ち出して転がりを抑えることを狙う打ち方。',advice:'ロフトを活かせるライかを確認し、まず安全な条件で練習する。',caution:'技術的難度とダフリ・トップのリスクが高い。'},
  {type:'bunker',title:'バンカー',intro:'砂・ライ・バンカーの縁を考慮して打つショット。',advice:'砂の硬さやボールの埋まり具合によって基本動作を選び直す。',caution:'砂の状態次第で必要なフェースの使い方が変わる。'}
]);
