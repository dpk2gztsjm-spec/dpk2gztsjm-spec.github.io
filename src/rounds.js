/** Stage 6 — scorecard domain. No inferred scores, yardages or historical references. */
export const newRoundId=()=>`round-${globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}`;
export const newRoundPlayerId=()=>`player-${globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}`;
export const scoreId=(roundId,playerId,holeNumber)=>`${roundId}:${playerId}:${holeNumber}`;
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function sectionName(round, holes) {
  if(round.holeCount===9) return round.courseSnapshot.layout || (holes[0]?.number>=10?'IN':'OUT');
  return holes[0]?.number>=10?'IN':'OUT';
}
export function roundSections(round){
  const holes=round.courseSnapshot.holes;
  return round.holeCount===9?[{name:sectionName(round,holes),holes}]:[
    {name:'OUT',holes:holes.slice(0,9)},{name:'IN',holes:holes.slice(9,18)}
  ];
}
/** Score null means unentered. A recorded 0 is invalid, never treated as an empty cell. */
export function cleanScore(value,{optional=false}={}){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);
  if(!Number.isInteger(n)||n<(optional?0:1)||n>30)throw new Error(optional?'パット数は0〜30の整数で入力してください。':'打数は1〜30の整数で入力してください。');
  return n;
}
export function scoreStats(holes, playerId, scores){
  const records=holes.map(h=>scores.find(s=>s.playerId===playerId&&s.holeNumber===h.number));
  const entries=records.map(s=>s?.strokes).filter(n=>Number.isInteger(n)&&n>=1);
  const entered=entries.length;
  const strokes=entered?entries.reduce((sum,n)=>sum+n,0):null;
  const playedPar=holes.reduce((sum,h,index)=>sum+(Number.isInteger(records[index]?.strokes)&&records[index].strokes>=1?h.par:0),0);
  const par=holes.reduce((sum,h)=>sum+h.par,0);
  return {entered,totalHoles:holes.length,complete:entered===holes.length,strokes,playedPar,par,
    relative:strokes===null?null:strokes-playedPar};
}
export function roundStats(round,players,scores){
  const sections=roundSections(round);
  return players.map(player=>({
    ...player,sections:sections.map(section=>({name:section.name,...scoreStats(section.holes,player.id,scores)})),
    total:scoreStats(round.courseSnapshot.holes,player.id,scores)
  }));
}
export function relativeText(relative){if(relative===null)return '—';return relative===0?'E':relative>0?`+${relative}`:String(relative);}
export function snapCourse(course,teeId){
  const tee=course.tees.find(t=>t.id===teeId);
  if(!tee)throw new Error('選択したティーが見つかりません。');
  if(![9,18].includes(course.holeCount)||course.holes.length!==course.holeCount)throw new Error('ホール構成が正しくありません。');
  return {id:course.id,name:course.name,prefecture:course.prefecture??'',layout:course.layout??'',holeCount:course.holeCount,
    tee:{id:tee.id,name:tee.name},
    holes:course.holes.map(h=>({number:Number(h.number),par:Number(h.par),yards:tee.distances?.[h.number]??null}))};
}
export function snapSet(selectedSet,clubs){
  if(!selectedSet)return null;
  return {id:selectedSet.id,name:selectedSet.name,clubIds:[...selectedSet.clubIds],
    clubs:selectedSet.clubIds.map(id=>clubs.find(c=>c.id===id)).filter(Boolean).map(c=>({id:c.id,maker:c.maker,model:c.model,number:c.number,category:c.category,loftDeg:c.loftDeg??null,shaft:c.shaft??''}))};
}
export function validateRoundDraft(draft,courses,sets){
  const errors={};const course=courses.find(c=>c.id===draft.courseId);
  if(!course)errors.courseId='登録済みのゴルフ場を選択してください。';
  else if(!course.tees.some(t=>t.id===draft.teeId))errors.teeId='使用ティーを選択してください。';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date||'')||Number.isNaN(Date.parse(`${draft.date}T12:00:00`))||localDate(new Date(`${draft.date}T12:00:00`))!==draft.date) errors.date='正しいプレー日を入力してください。';
  const names=(draft.companions||[]).map(n=>String(n??'').trim());
  if(names.length>3)errors.companions='同伴者は3人まで登録できます。';
  if(names.some(n=>!n||n.length>40))errors.companions='同伴者名は1〜40文字で入力してください。';
  if(draft.setId && !sets.some(s=>s.id===draft.setId))errors.setId='マイセットを選び直してください。';
  if(String(draft.weather??'').length>100)errors.weather='天候は100文字以内で入力してください。';
  return errors;
}
export function createRoundRecords(draft,course,set,clubs,now=new Date().toISOString(),makeRoundId=newRoundId,makePlayerId=newRoundPlayerId){
  const id=makeRoundId(),courseSnapshot=snapCourse(course,draft.teeId),setSnapshot=snapSet(set,clubs);
  const round={id,courseId:course.id,courseSnapshot,holeCount:courseSnapshot.holeCount,
    playedOn:draft.date,weather:String(draft.weather??'').trim(),notes:'',setSnapshot,
    createdAt:now,updatedAt:now};
  const players=['自分',...(draft.companions||[]).map(x=>String(x).trim())].map((name,index)=>({id:makePlayerId(),roundId:id,name,order:index,isSelf:index===0,createdAt:now,updatedAt:now}));
  const scores=players.flatMap(p=>courseSnapshot.holes.map(h=>({id:scoreId(id,p.id,h.number),roundId:id,playerId:p.id,holeNumber:h.number,strokes:null,putts:null,updatedAt:now})));
  return {round,players,scores};
}
/** Scorecard records survive profile, course, bag and club edits. */
export function roundScoreFor(scores,playerId,holeNumber){return scores.find(s=>s.playerId===playerId&&s.holeNumber===holeNumber)||null;}
