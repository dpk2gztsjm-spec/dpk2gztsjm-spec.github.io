/** GOLF JOURNAL Stage 10: explainable PRE-ROUND study suggestions.
 * No terrain modelling, no ball-flight simulation, no fabricated personal distances.
 * All numerical distances displayed are directly copied from complete measured shots.
 */
import {getSetClubs} from './sets.js';
import {shotTypeLabel, backswingLabel} from './shots.js';
import {cleanStrategy,validateStrategy} from './strategy.js';
const APPROACH=new Set(['chip','pitch','pitch-run','running','lob']);
const ROLL=new Set(['chip','pitch-run','running']);
const LIFT=new Set(['pitch','lob','bunker']);
const TIPS={chip:'chip-run',pitch:'pitch-shot','pitch-run':'chip-run',running:'chip-run',lob:'lob-shot',bunker:'pitch-bunker',full:'distance-carry',control:'distance-carry',punch:'flight-law',other:'approach-choice'};
const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const round1=v=>Math.round(v*10)/10;
export const STRATEGY_RESULT_LIMIT=3;
export function candidateDistance(shot){
  const measured=shot?.distanceSource==='measured';
  const carry=measured&&num(shot?.carryYards)?shot.carryYards:null;
  const roll=measured&&num(shot?.rollYards)?shot.rollYards:null;
  return {carry,roll,total:carry!==null&&roll!==null?round1(carry+roll):null,measured,complete:carry!==null&&roll!==null};
}
function clubLabel(c){return [c.maker,c.model,c.number].filter(Boolean).join(' · ');}
function baseTypeForClub(club,lie,dist){
 if(lie==='bunker')return club.category==='wedge'?'bunker':null;
 if(dist<=35){if(club.category==='wedge')return 'pitch';if(club.category==='iron')return 'running';if(club.category==='putter')return 'running';return null;}
 if(club.category==='putter')return null;
 if(dist<=95){if(club.category==='wedge')return 'pitch';if(club.category==='iron')return 'control';return null;}
 if(club.category==='wedge')return 'control';return 'full';
}
function isCompatible(s,shot,club){
 const type=shot.type;
 if(s.ballLie==='bunker'){
   if(s.bunker?.type==='greenside'||s.bunker?.lie==='plugged')return type==='bunker'&&club.category==='wedge';
   return type==='bunker'||type==='punch'||type==='control'||type==='full';
 }
 if(type==='bunker')return false;
 if(club.category==='putter'&&s.ballLie==='rough')return false;
 if(s.ballLie==='rough'&&(s.rough?.ball==='buried'||s.rough?.depth==='deep')&&type==='lob')return false;
 if(s.ballLie==='tee'&&type==='chip'&&s.targetYards>70)return false;
 return true;
}
function formatRisk(s,shot,distance){
 const risks=[];
 if(s.ballLie==='rough'&&(s.rough.depth==='deep'||s.rough.ball==='buried'))risks.push('深いラフでは抜けとキャリーが不安定');
 if(s.ballLie==='bunker'){
  risks.push(s.bunker.lie==='plugged'?'目玉では脱出を優先':'砂の硬さ・アゴで打ち方が変わる');
  if(s.bunker.lipCm!==null)risks.push('バンカーのアゴを越せるか現場確認が必要');
 }
 if(s.ballSlope.front||s.ballSlope.side)risks.push('複合を含む傾斜で打点とバランスが変わる');
 if(s.wind.direction!=='none'&&s.wind.direction!=='unknown')risks.push('風による変化は距離補正していない');
 if(s.elevationYards!==null)risks.push('高低差による飛距離変化は未補正');
 if(s.targetSlope.front||s.targetSlope.side)risks.push('着地後のランは目標地点の傾斜に左右される');
 if(s.greenHardness!=='unknown'||s.greenSpeed!=='unknown')risks.push('グリーン状態によるランは未補正');
 if(s.obstacles||s.hazards)risks.push('障害物・ハザードの位置は自動解析していない');
 if(shot.type==='lob')risks.push('ロブはダフリ・トップの難度が高い');
 if(distance.total===null)risks.push('距離の実測が不足しており届くか判断できない');
 if(s.requiredCarryYards!==null&&distance.carry===null)risks.push('必要キャリーを越える裏付けがない');
 return risks.length?risks.slice(0,5):['その日のライ・スピン・飛距離のばらつきを確認'];
}
function scoreShot(s,shot,distance,club){
 let score=0;
 if(distance.complete){
  const delta=Math.abs(distance.total-s.targetYards);
  score+=110-Math.min(100,delta*2);
  if(distance.measured)score+=15;
 }else if(distance.carry!==null){score+=22;}
 else score-=55;
 if(shot.reference)score-=22;
 if(s.targetYards<=65&&APPROACH.has(shot.type))score+=12;
 if(s.goal==='roll'&&ROLL.has(shot.type))score+=15;
 if(s.goal==='landing'&&distance.carry!==null)score+=12;
 if(s.goal==='safe'&&shot.type==='lob')score-=18;
 if(s.wind.strength==='strong'&&shot.type==='lob')score-=12;
 if(s.ballLie==='rough'&&s.rough.ball==='buried'&&['running','chip','full'].includes(shot.type))score-=7;
 if(s.ballLie==='bunker'&&shot.type==='bunker')score+=18;
 if(s.ballLie==='bunker'&&shot.type!=='bunker')score-=10;
 if(club.category==='putter'&&s.ballLie!=='fairway')score-=10;
 if(s.requiredCarryYards!==null&&distance.carry===null)score-=28;
 return score;
}
function addressHints(s,shot,handedness){
 const small=ROLL.has(shot.type)||shot.type==='pitch';
 const stance=shot.stanceWidth|| (small?'スタンスをやや狭め、無理のない幅で構える':'足元の安定を優先し、自然なスタンスを保つ');
 const ball=shot.ballPosition||(small?'中央付近を起点に打点を確認':'クラブとライに合わせて、実際の打点を確認');
 const weight=shot.weightDistribution||(small?'目標側への荷重を試す（傾斜では調整）':'両足の圧力と斜面に対するバランスを優先');
 const face=shot.faceDirection||'目標線とクラブのフェース向きを確認';
 const alignment=shot.bodyAlignment||'安全な着地点へ身体の向きを合わせる';
 const notes=[];
 if(s.ballSlope.front==='up')notes.push('左足上がり：傾斜に対し無理に逆らわず、最下点を確認');
 if(s.ballSlope.front==='down')notes.push('左足下がり：体勢が流れないよう、小さい素振りで接地確認');
 if(s.ballSlope.side==='above')notes.push('爪先上がり：球が足より高い。グリップ長と打点を確認');
 if(s.ballSlope.side==='below')notes.push('爪先下がり：球が足より低い。前傾を保てるか確認');
 if(s.ballLie==='rough')notes.push('ラフ：球と芝の抵抗を確認。抜けない場合は安全な脱出を優先');
 if(s.ballLie==='bunker')notes.push('バンカー：砂に対するソール・フェースの扱いを確認');
 return {stance,ball,weight,face,alignment,hand:handedness==='left'?'左打ち':'右打ち',notes,customPoints:shot.keyPoints||null};
}
function explain(s,shot,distance){
 const parts=[];
 if(shot.reference)parts.push('選択セットのクラブで試せる一般的なショットの型');
 else parts.push('マイショットに登録した「'+shot.name+'」を使用');
 if(distance.complete)parts.push('登録済み実測キャリーとランの合計が目標距離に近いかを評価');
 else if(distance.carry!==null)parts.push('実測キャリーのみを参照。総距離は判断していない');
 else parts.push('実測距離がないため、飛距離の適合性は判定できない');
 if(s.goal==='roll'&&ROLL.has(shot.type))parts.push('転がし優先の目的に適する型');
 if(s.ballLie==='bunker')parts.push('砂のライに適する打ち方を優先');
 if(s.requiredCarryYards!==null)parts.push('必要キャリー '+s.requiredCarryYards+'yd を確認対象とする');
 return parts;
}
export function recommendStrategy({scenario,sets=[],clubs=[],shots=[],handedness='right'}){
 const s=cleanStrategy(scenario);const errors=validateStrategy(s,sets);
 if(Object.keys(errors).length)return {candidates:[],reason:'入力条件を修正してください。',errors,summary:null};
 const set=sets.find(x=>x.id===s.setId);
 if(!set)return {candidates:[],reason:'攻略に使うマイセットを選択してください。',errors:{},summary:null};
 const selected=getSetClubs(set,clubs);
 if(!selected.length)return {candidates:[],reason:'選択セットに所有クラブがありません。クラブを追加してください。',errors:{},summary:null};
 const candidates=[];
 for(const club of selected){
  const own=shots.filter(sh=>sh.clubId===club.id);
  const entries=own.length?own:[{id:`ref-${club.id}`,name:'一般的なショット（距離未計測）',clubId:club.id,type:baseTypeForClub(club,s.ballLie,s.targetYards),backswing:'',distanceSource:'unmeasured',reference:true}];
  for(const sh of entries){
   if(!sh.type||!isCompatible(s,sh,club))continue;
   const distance=candidateDistance(sh);
   // Verified carry falling short of an explicit minimum is not acceptable.
   if(s.requiredCarryYards!==null&&distance.carry!==null&&distance.carry<s.requiredCarryYards)continue;
   // When both distances are measured, reject profoundly mismatched total distances.
   if(distance.complete&&Math.abs(distance.total-s.targetYards)>Math.max(25,s.targetYards*.4))continue;
   const score=scoreShot(s,sh,distance,club);
   candidates.push({id:`${club.id}-${sh.id}`,clubId:club.id,shotId:sh.reference?null:sh.id,club:clubLabel(club),clubNumber:club.number,
    shotName:sh.name,shotType:sh.type,shotTypeLabel:sh.reference?({bunker:'バンカーショット',running:'ランニングアプローチ',pitch:'ピッチショット',control:'コントロールショット',full:'フルショット'}[sh.type]||sh.type):shotTypeLabel(sh),
    swing:sh.reference?'未指定（一般例）':backswingLabel(sh),reference:!!sh.reference,
    dataKind:distance.complete?'本人の実測値':distance.carry!==null?'本人の実測（部分）':sh.reference?'一般的な参考例':'本人の登録ショット（距離未計測）',
    distance,score,reason:explain(s,sh,distance),risks:formatRisk(s,sh,distance),address:addressHints(s,sh,handedness),
    tipId:TIPS[sh.type]??'approach-choice'});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||(a.club.localeCompare(b.club,'ja'))||(a.shotName.localeCompare(b.shotName,'ja')));
 const chosen=candidates.slice(0,STRATEGY_RESULT_LIMIT);
 return {candidates:chosen,errors:{},reason:chosen.length?'':'入力条件に適合するショット候補がありません。選択セット・マイショット・ライ条件を確認してください。',
  summary:{setName:set.name,targetYards:s.targetYards,requiredCarryYards:s.requiredCarryYards,measuredChoices:chosen.filter(c=>c.distance.complete).length,
    evidence:chosen.length&&chosen[0].distance.complete?'実測距離との近さを優先して比較':'距離の裏付けがなく、候補順位は打ち方・ライへの適合性の参考です。',scenario:s}};
}
