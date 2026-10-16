/** User-owned Japanese course library. No unlicensed external course records are supplied. */
export const PREFECTURES = Object.freeze([
'北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県']);

const val = (v,max) => String(v??'').trim().slice(0,max);
const own = (obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
export const newCourseId = () => `course-${globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}`;
export const newTeeId = () => `tee-${globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}`;
export const holeNumbers = (count,start=1) => Array.from({length:Number(count)===9?9:18},(_,i)=>Number(count)===9?Number(start)===10?i+10:i+1:i+1);

export function emptyCourse() {
  return {name:'',prefecture:'',address:'',description:'',officialUrl:'',holeCount:18,startHole:1,
    layout:'OUT / IN',tees:[{id:newTeeId(),name:'レギュラー',distances:{}}],
    holes:holeNumbers(18).map(number=>({number,par:null})),sourceType:'manual'};
}
export function reshapeHoles(input, count, start=1) {
  const existing=new Map((input.holes||[]).map(x=>[Number(x.number),x]));
  return {...input,holeCount:Number(count),startHole:Number(count)===9?(Number(start)===10?10:1):1,
    layout:Number(count)===9&&input.layout==='OUT / IN'?'OUT':input.layout,
    holes:holeNumbers(count,start).map(number=>({number,par:existing.get(number)?.par??null}))};
}
/** Accept blanks as null; never invent PAR or yardage. */
export function cleanCourse(input) {
  const holeCount=Number(input.holeCount)===9?9:18;
  const startHole=holeCount===9&&Number(input.startHole)===10?10:1;
  const numbers=holeNumbers(holeCount,startHole);
  const rows=new Map((input.holes||[]).map(row=>[Number(row.number),row]));
  const holes=numbers.map(number=>{
    const raw=rows.get(number)?.par;
    return {number,par:raw===null||raw===undefined||String(raw).trim()===''?null:Number(raw)};
  });
  const tees=(Array.isArray(input.tees)?input.tees:[]).map(t=>{
    const source=t.distances&&typeof t.distances==='object'?t.distances:{};
    const distances={};
    for(const n of numbers){
      const raw=own(source,n)?source[n]:null;
      distances[n]=raw===null||raw===undefined||String(raw).trim()===''?null:Number(raw);
    }
    return {id:val(t.id,100)||newTeeId(),name:val(t.name,40),distances};
  });
  return {name:val(input.name,120),prefecture:val(input.prefecture,12),address:val(input.address,250),description:val(input.description,1500),
    officialUrl:val(input.officialUrl,500),holeCount,startHole,layout:holeCount===18?'OUT / IN':val(input.layout,40)||'9ホール',
    holes,tees,sourceType:'manual'};
}
export function validateCourse(course) {
  const errors={};
  if(!course.name)errors.name='ゴルフ場名を入力してください。';
  if(!PREFECTURES.includes(course.prefecture))errors.prefecture='都道府県を選択してください。';
  if(course.officialUrl){
    try {const url=new URL(course.officialUrl);if(!['https:','http:'].includes(url.protocol))throw Error('protocol');}
    catch{errors.officialUrl='公式サイトのURLは http:// または https:// で入力してください。';}
  }
  if(![9,18].includes(course.holeCount))errors.holeCount='9または18ホールを選択してください。';
  if(course.holes.length!==course.holeCount||new Set(course.holes.map(h=>h.number)).size!==course.holeCount)errors.holes='ホールの構成が正しくありません。';
  for(const hole of course.holes){if(hole.par===null||!Number.isInteger(hole.par)||hole.par<3||hole.par>6)errors[`par.${hole.number}`]=`H${hole.number}：PARは3〜6から選択してください。`;}
  if(!course.tees.length)errors.tees='ティーを1種類以上登録してください。';
  const seen=new Set(); const teeIds=new Set();
  for(const tee of course.tees){
    if(!tee.name)errors[`tee.${tee.id}`]='ティー名を入力してください。';
    const name=tee.name.normalize('NFKC').toLocaleLowerCase('ja');
    if(seen.has(name))errors[`tee.${tee.id}`]='ティー名が重複しています。';
    seen.add(name);
    if(teeIds.has(tee.id))errors.tees='ティーIDが重複しています。';teeIds.add(tee.id);
    for(const hole of course.holes){const d=tee.distances[hole.number];
      if(d!==null&&(!Number.isInteger(d)||d<1||d>1500))errors[`yard.${tee.id}.${hole.number}`]=`H${hole.number}：距離は1〜1500ydの整数、または空欄にしてください。`;
    }
  }
  return errors;
}
export function searchCourses(courses,query='',prefecture='all') {
  const q=val(query,120).normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g,'');
  return courses.filter(course=>{
    if(prefecture!=='all'&&course.prefecture!==prefecture)return false;
    if(!q)return true;
    const text=[course.name,course.prefecture,course.address,course.description].join(' ').normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g,'');
    return text.includes(q);
  }).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')||(a.name||'').localeCompare(b.name||'','ja'));
}
export function teeTotals(course,teeId) {
  const tee=course.tees.find(x=>x.id===teeId)||course.tees[0];
  if(!tee)return null;
  const numbers=course.holes.map(h=>h.number);
  const sections=course.holeCount===18?[numbers.slice(0,9),numbers.slice(9)]:[numbers];
  function total(ns){const defined=ns.map(n=>tee.distances?.[n]).filter(n=>Number.isInteger(n)&&n>0);
    return {known:defined.length,holes:ns.length,yards:defined.length===ns.length?defined.reduce((a,b)=>a+b,0):null,partial:defined.reduce((a,b)=>a+b,0)};
  }
  return {tee,sections:sections.map(total),total:total(numbers)};
}
export function parTotals(course) {
  const holes=course.holes||[];
  const complete=holes.every(h=>Number.isInteger(h.par));
  return {total:complete?holes.reduce((x,h)=>x+h.par,0):null,
    first:holes.slice(0,9).every(h=>Number.isInteger(h.par))?holes.slice(0,9).reduce((x,h)=>x+h.par,0):null,
    second:holes.length===18&&holes.slice(9).every(h=>Number.isInteger(h.par))?holes.slice(9).reduce((x,h)=>x+h.par,0):null};
}
