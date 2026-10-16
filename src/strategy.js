/** GOLF JOURNAL — Stage 9 scenario model. Never infer individual distances. */
const uid=()=>globalThis.crypto?.randomUUID?.()??`s${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const newStrategyId=()=>`strategy-${uid()}`;
export const STRATEGY_STEPS=[
  {id:'set',title:'使用するマイセット',subtitle:'今回の攻略に使用するクラブを選ぶ'},
  {id:'distance',title:'目標までの距離',subtitle:'総距離と必要キャリーを分けて考える'},
  {id:'lie',title:'ボールの状態',subtitle:'現在のライに応じて必要な質問だけ表示'},
  {id:'ballSlope',title:'ボール地点の傾斜',subtitle:'前後と左右は独立して選択できる'},
  {id:'targetSlope',title:'目標地点の傾斜',subtitle:'着地後のランの方向を考える'},
  {id:'wind',title:'風と高低差',subtitle:'不明な条件は無理に推定しない'},
  {id:'conditions',title:'その他の条件',subtitle:'必要な項目だけ追加できる'}
];
export const STRATEGY_OPTIONS={
  ballLie:[['tee','ティーアップ'],['fairway','フェアウェイ'],['rough','ラフ'],['bunker','バンカー']],
  roughDepth:[['unknown','分からない'],['short','浅い'],['medium','普通'],['deep','深い']],
  roughBall:[['unknown','分からない'],['floating','浮いている'],['neutral','普通'],['buried','沈んでいる']],
  roughResistance:[['unknown','分からない'],['little','少ない'],['medium','普通'],['heavy','強い']],
  bunkerType:[['unknown','分からない'],['fairway','フェアウェイバンカー'],['greenside','ガードバンカー']],
  bunkerLie:[['unknown','分からない'],['clean','浮いている'],['normal','普通'],['plugged','目玉・埋まっている']],
  sandHardness:[['unknown','分からない'],['soft','軟らかい'],['medium','普通'],['hard','硬い']],
  sandMoisture:[['unknown','分からない'],['dry','乾いている'],['normal','普通'],['wet','湿っている']],
  windDirection:[['unknown','分からない'],['none','無風'],['head','向かい風'],['tail','追い風'],['left','左から'],['right','右から']],
  windStrength:[['unknown','分からない'],['light','弱い'],['medium','普通'],['strong','強い']],
  greenHardness:[['unknown','分からない'],['soft','軟らかい'],['medium','普通'],['hard','硬い']],
  greenSpeed:[['unknown','分からない'],['slow','遅い'],['medium','普通'],['fast','速い']],
  shotGoal:[['safe','安全に狙う'],['flag','ピンを狙う'],['landing','着地点を優先'],['roll','転がしを優先']]
};
const choices=(key)=>STRATEGY_OPTIONS[key].map(([value])=>value);
export function newStrategyDraft(setId=null){
  return {
    setId:setId||null, targetYards:150, requiredCarryYards:null, ballLie:'fairway',
    rough:{depth:'unknown',ball:'unknown',resistance:'unknown'},
    bunker:{type:'unknown',lie:'unknown',hardness:'unknown',moisture:'unknown',lipCm:null},
    ballSlope:{front:null,side:null},targetSlope:{front:null,side:null},
    wind:{direction:'unknown',strength:'unknown'},elevationYards:null,
    greenHardness:'unknown',greenSpeed:'unknown',obstacles:'',hazards:'',goal:'safe'
  };
}
function validEnum(v,allowed,fallback){return allowed.includes(v)?v:fallback;}
function numericOrNull(v){if(v===null || v===undefined || v==='')return null;const x=Number(v);return Number.isFinite(x)?x:NaN;}
function cleanSlope(value,frontChoices,sideChoices){return {front:validEnum(value?.front,frontChoices,null),side:validEnum(value?.side,sideChoices,null)};}
export function cleanStrategy(draft){
  const base=newStrategyDraft(),d=draft||{};
  const rough=d.rough||{},bunker=d.bunker||{},wind=d.wind||{};
  return {
    setId:typeof d.setId==='string'&&d.setId?d.setId:null,
    targetYards:numericOrNull(d.targetYards),requiredCarryYards:numericOrNull(d.requiredCarryYards),
    ballLie:validEnum(d.ballLie,choices('ballLie'),'fairway'),
    rough:{depth:validEnum(rough.depth,choices('roughDepth'),'unknown'),ball:validEnum(rough.ball,choices('roughBall'),'unknown'),resistance:validEnum(rough.resistance,choices('roughResistance'),'unknown')},
    bunker:{type:validEnum(bunker.type,choices('bunkerType'),'unknown'),lie:validEnum(bunker.lie,choices('bunkerLie'),'unknown'),hardness:validEnum(bunker.hardness,choices('sandHardness'),'unknown'),moisture:validEnum(bunker.moisture,choices('sandMoisture'),'unknown'),lipCm:numericOrNull(bunker.lipCm)},
    ballSlope:cleanSlope(d.ballSlope,['up','down'],['above','below']),
    targetSlope:cleanSlope(d.targetSlope,['away','toward'],['right','left']),
    wind:{direction:validEnum(wind.direction,choices('windDirection'),'unknown'),strength:validEnum(wind.strength,choices('windStrength'),'unknown')},
    elevationYards:numericOrNull(d.elevationYards),
    greenHardness:validEnum(d.greenHardness,choices('greenHardness'),'unknown'),
    greenSpeed:validEnum(d.greenSpeed,choices('greenSpeed'),'unknown'),
    obstacles:String(d.obstacles??'').trim().slice(0,240),hazards:String(d.hazards??'').trim().slice(0,240),
    goal:validEnum(d.goal,choices('shotGoal'),'safe')
  };
}
export function validateStrategy(draft,sets=[]){
  const d=cleanStrategy(draft),errors={};
  if(d.targetYards===null||!Number.isInteger(d.targetYards)||d.targetYards<1||d.targetYards>600)errors.targetYards='目標距離は1〜600ydの整数で指定してください。';
  if(d.requiredCarryYards!==null&&(!Number.isInteger(d.requiredCarryYards)||d.requiredCarryYards<0||d.requiredCarryYards>600))errors.requiredCarryYards='必要キャリーは0〜600ydの整数で指定してください。';
  if(d.requiredCarryYards!==null&&d.targetYards!==null&&d.requiredCarryYards>d.targetYards)errors.requiredCarryYards='必要キャリーは総距離以下で指定してください。';
  if(d.bunker.lipCm!==null&&(!Number.isInteger(d.bunker.lipCm)||d.bunker.lipCm<0||d.bunker.lipCm>500))errors['bunker.lipCm']='アゴの高さは0〜500cmの整数で指定してください。';
  if(d.elevationYards!==null&&(!Number.isInteger(d.elevationYards)||Math.abs(d.elevationYards)>200))errors.elevationYards='高低差は−200〜200ydの整数で指定してください。';
  if(d.setId&&!sets.some(x=>x.id===d.setId))errors.setId='指定されたマイセットが見つかりません。別のセットを選択してください。';
  return errors;
}
export function updateStrategyField(draft,path,value){
  const fields=path.split('.');
  if(!['setId','targetYards','requiredCarryYards','ballLie','rough','bunker','ballSlope','targetSlope','wind','elevationYards','greenHardness','greenSpeed','obstacles','hazards','goal'].includes(fields[0])||fields.length>2)throw new Error('不明なフィールドです。');
  const next=structuredClone(draft),key=fields[0];
  if(fields.length===2){if(!Object.hasOwn(next[key]||{},fields[1]))throw new Error('不明なフィールドです。');next[key][fields[1]]=value;}
  else next[key]=value;
  // Preserve rough and sand answers for future re-selection; ignore them when the lie differs.
  if(key==='wind'&&fields[1]==='direction'&&value==='none')next.wind.strength='unknown';
  return next;
}
export function toggleStrategySlope(draft,site,axis,value){
  if(!['ballSlope','targetSlope'].includes(site))throw new Error('不正な傾斜');
  if(axis==='flat')return {...draft,[site]:{front:null,side:null}};
  if(!['front','side'].includes(axis))throw new Error('不正な傾斜方向');
  const allowed=site==='ballSlope' ? (axis==='front'?['up','down']:['above','below']) : (axis==='front'?['away','toward']:['right','left']);
  if(!allowed.includes(value))throw new Error('不正な傾斜');
  return {...draft,[site]:{...draft[site],[axis]:draft[site]?.[axis]===value?null:value}};
}
export function strategyRecord(draft,{id,createdAt,updatedAt}={}){
  const now=new Date().toISOString();
  return {id:id||newStrategyId(),...cleanStrategy(draft),schemaVersion:1,createdAt:createdAt||now,updatedAt:updatedAt||now};
}
export function activeStrategyConditions(s){
  return {...s,rough:s.ballLie==='rough'?s.rough:null,bunker:s.ballLie==='bunker'?s.bunker:null};
}
export function describeStrategy(s,sets=[]){
  const set=sets.find(x=>x.id===s.setId);
  return `${s.targetYards}yd · ${STRATEGY_OPTIONS.ballLie.find(x=>x[0]===s.ballLie)?.[1]||'未設定'} · ${set?.name||'セット未指定'}`;
}
