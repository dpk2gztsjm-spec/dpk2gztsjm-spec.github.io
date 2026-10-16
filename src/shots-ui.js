import {escapeHtml} from './domain.js';
import {icon} from './icons.js';
import {SHOT_TYPES,BACKSWINGS,REFERENCE_SHOTS,shotTypeLabel,backswingLabel,shotDataCategory,yards} from './shots.js';
import {categoryName} from './clubs.js';
const shotSafe=escapeHtml;
const error=(errors,k)=>errors?.[k]?`<p class="field-error" role="alert">${shotSafe(errors[k])}</p>`:'';
const displayClub=(club)=>club?`${club.maker} ${club.model} · ${club.number}`:'登録されていないクラブ';
const shotId=(shot)=>shotSafe(shot.id);
function shotCard(shot,club){
  const measured=shotDataCategory(shot)==='measured';
  return `<article class="shot-card" data-shot-id="${shotId(shot)}">
    <div class="shot-card-head"><div><span class="shot-overline">${shotSafe(displayClub(club))}</span><h3>${shotSafe(shot.name)}</h3></div><span class="shot-data-badge ${measured?'is-measured':''}">${measured?'本人の実測':'本人登録・未計測'}</span></div>
    <div class="shot-chips"><span>${shotSafe(shotTypeLabel(shot))}</span><span>${shotSafe(backswingLabel(shot))}</span></div>
    <div class="shot-distances"><div><small>CARRY</small><strong>${shotSafe(yards(shot.carryYards))}</strong></div><div><small>ROLL</small><strong>${shotSafe(yards(shot.rollYards))}</strong></div></div>
    ${shot.keyPoints?`<p class="shot-keypoint">${shotSafe(shot.keyPoints)}</p>`:''}
    <button type="button" class="shot-edit-button" data-shot-action="edit" data-shot-id="${shotId(shot)}">${icon('edit',17)} 編集・詳細を見る</button>
  </article>`;
}
function selectField(name,label,options,selected,errors,required=true){
  return `<div class="shot-field"><label for="shot-${name}">${label} ${required?'<span class="required">必須</span>':'<span class="optional">任意</span>'}</label>
  <select id="shot-${name}" data-shot-field="${name}"><option value="">選択してください</option>${options.map(o=>`<option value="${shotSafe(o.value)}" ${selected===o.value?'selected':''}>${shotSafe(o.label)}</option>`).join('')}</select>${error(errors,name)}</div>`;
}
function inputField(name,label,value,errors,opts={}){
  const type=opts.type||'text';return `<div class="shot-field"><label for="shot-${name}">${label} ${opts.required?'<span class="required">必須</span>':'<span class="optional">任意</span>'}</label>
  <input id="shot-${name}" data-shot-field="${name}" type="${type}" ${type==='number'?'min="0" max="1000" step="0.1" inputmode="decimal"':''} ${type==='text'?`maxlength="${opts.maxLength??160}"`:''} placeholder="${shotSafe(opts.placeholder||'')}" value="${shotSafe(value??'')}" autocomplete="off"/>${error(errors,name)}</div>`;
}
function textArea(name,label,value,errors,placeholder){return `<div class="shot-field"><label for="shot-${name}">${label} <span class="optional">任意</span></label><textarea id="shot-${name}" data-shot-field="${name}" rows="3" maxlength="1000" placeholder="${shotSafe(placeholder||'')}">${shotSafe(value??'')}</textarea>${error(errors,name)}</div>`;}
function shotsEmpty(clubs){return `<div class="shot-empty">${icon('target',35)}<h2>${clubs.length?'最初のマイショットを登録':'まずクラブを登録しましょう'}</h2><p>${clubs.length?'一本のクラブに、振り幅や狙い方の違うショットを何種類でも記録できます。':'マイショットは実際に所有するクラブに紐づきます。先にマイクラブで登録してください。'}</p><a href="#clubs" class="shot-secondary-link">${icon('bag',17)} マイクラブへ</a></div>`;}
export function shotsPage({shots,clubs,activeSet,clubFilter,toast,error:pageError}){
  const clubMap=new Map(clubs.map(c=>[c.id,c]));
  const shown=shots.filter(s=>clubMap.has(s.clubId)&&(!clubFilter||clubFilter==='all'||(clubFilter==='active'?(activeSet?.clubIds??[]).includes(s.clubId):s.clubId===clubFilter)));
  const byClub=new Map(); for(const shot of shown){if(!byClub.has(shot.clubId))byClub.set(shot.clubId,[]);byClub.get(shot.clubId).push(shot);}
  const sorted=[...byClub.entries()].sort((a,b)=>displayClub(clubMap.get(a[0])).localeCompare(displayClub(clubMap.get(b[0])),'ja'));
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>MY SHOT LIBRARY</div><h1>マイショット</h1><p>一本のクラブに、いくつもの打ち方。<br>あなたの距離感と技術を記録しよう。</p></div>
    ${toast?`<div class="alert alert-success" role="status">${icon('check',18)} ${shotSafe(toast)}</div>`:''}
    ${pageError?`<div class="alert alert-error" role="alert">${icon('alert',18)} ${shotSafe(pageError)}</div>`:''}
    <section class="shot-overview"><div class="shot-overview-info"><p>YOUR PRACTICE BOOK</p><strong>${shots.length}<small> SHOTS</small></strong><span>登録したショットが、次のコース攻略に繋がります。</span></div>${icon('target',76)}</section>
    <button class="shot-add" type="button" data-shot-action="new" ${clubs.length?'':'disabled'}>${icon('plus',20)} ショットを登録する</button>
    ${clubs.length?`<section class="shot-library"><div class="section-heading"><h2>YOUR SHOTS</h2><span>クラブ別に整理</span></div>
      <div class="shot-field"><label for="shot-filter">表示するクラブ</label><select id="shot-filter" data-shot-filter><option value="all" ${clubFilter==='all'?'selected':''}>すべてのクラブ</option>
      ${activeSet?`<option value="active" ${clubFilter==='active'?'selected':''}>現在のバッグ：${shotSafe(activeSet.name)}</option>`:''}
      ${clubs.map(c=>`<option value="${shotSafe(c.id)}" ${clubFilter===c.id?'selected':''}>${shotSafe(displayClub(c))}</option>`).join('')}</select></div>
      ${shown.length?sorted.map(([id,items])=>`<div class="shot-club-section"><h3>${shotSafe(displayClub(clubMap.get(id)))} <span>${items.length}件</span></h3>${items.map(shot=>shotCard(shot,clubMap.get(id))).join('')}</div>`).join(''):
        `<div class="shot-no-matches">${shots.length?'この条件に一致するショットはありません。':'保存済みのショットはまだありません。'}</div>`}</section>`:''}
    ${!shots.length?shotsEmpty(clubs):''}
    <section class="shot-reference-section"><div class="section-heading"><h2>TECHNIQUE NOTES</h2><span>一般的な参考例</span></div><p class="shot-reference-intro">以下は練習用の一般解説です。<b>個人の飛距離データではありません。</b> 距離の数値は自動入力しません。</p>
      ${REFERENCE_SHOTS.map(ref=>`<details class="shot-reference"><summary><span>${shotSafe(ref.title)}</span>${icon('chevron',16)}</summary><p>${shotSafe(ref.intro)}</p><p><b>試し方：</b>${shotSafe(ref.advice)}</p><p><b>注意：</b>${shotSafe(ref.caution)}</p></details>`).join('')}
      <a class="shot-tips-link" href="#tips">${icon('book',18)} Tips辞典へ（第8段階で記事追加）</a>
    </section>`;
}
export function shotFormPage({draft,clubs,errors,busy,editing,detailsOpen}){
  const d=draft||{};
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>MY SHOT LIBRARY</div><h1>${editing?'ショットを編集':'ショットを登録'}</h1><p>距離が分からなくても登録できます。<br>実測していない値は、実測として扱いません。</p></div>
    <button type="button" class="club-back" data-shot-action="cancel">${icon('back',17)} マイショット一覧へ戻る</button>
    <form id="shot-form" class="profile-form" novalidate>
      <section class="form-card shot-form-card"><div class="form-card-label"><span>01</span> 基本情報</div>
      ${selectField('clubId','使用クラブ',clubs.map(c=>({value:c.id,label:displayClub(c)})),d.clubId,errors)}
      ${inputField('name','ショット名',d.name,errors,{required:true,maxLength:60,placeholder:'例：PW ハーフスイング'})}
      ${selectField('type','ショットの種類',SHOT_TYPES,d.type,errors)}
      ${d.type==='other'?inputField('customType','ショットの種類（自由入力）',d.customType,errors,{required:true,placeholder:'例：低いフェード'}):''}
      ${selectField('backswing','テークバックの大きさ',BACKSWINGS,d.backswing,errors)}
      ${['clock','other'].includes(d.backswing)?inputField('customBackswing',d.backswing==='clock'?'時計式の振り幅':'振り幅（自由入力）',d.customBackswing,errors,{required:true,placeholder:d.backswing==='clock'?'例：9時〜3時':'例：テークバック約80%' }):''}
      </section>
      <section class="form-card shot-form-card"><div class="form-card-label"><span>02</span> 距離データ <small>任意</small></div>
      <div class="shot-two-col">${inputField('carryYards','キャリー（yd）',d.carryYards,errors,{type:'number',placeholder:'未登録'})}${inputField('rollYards','ラン（yd）',d.rollYards,errors,{type:'number',placeholder:'未登録'})}</div>
      <div class="shot-field"><label for="shot-distanceSource">距離データの区分</label><select id="shot-distanceSource" data-shot-field="distanceSource"><option value="unmeasured" ${d.distanceSource!=='measured'?'selected':''}>本人登録・未計測（推定値を含む）</option><option value="measured" ${d.distanceSource==='measured'?'selected':''}>本人の実測値</option></select>${error(errors,'distanceSource')}
      <p class="shot-help">キャリーとランは別々に保存。飛距離は振り幅の割合から自動計算しません。実測を選ぶ場合は、少なくとも1項目の距離を入力してください。</p></div></section>
      <section class="form-card shot-form-card"><button type="button" class="shot-details-toggle" data-shot-action="toggle-details" aria-expanded="${detailsOpen}"><span><b>03</b> アドレス・打ち方の詳細 <small>すべて任意</small></span>${icon('chevron',19)}</button>
      ${detailsOpen?`<div class="shot-details-form">
        <div class="shot-two-col">${inputField('stanceWidth','スタンス幅',d.stanceWidth,errors,{placeholder:'例：腰幅'})}${inputField('ballPosition','ボール位置',d.ballPosition,errors,{placeholder:'例：中央より右'})}</div>
        <div class="shot-two-col">${inputField('bodyAlignment','身体の向き',d.bodyAlignment,errors,{placeholder:'例：目標へスクエア'})}${inputField('weightDistribution','体重配分',d.weightDistribution,errors,{placeholder:'例：左足6：右足4'})}</div>
        ${inputField('faceDirection','フェース向き',d.faceDirection,errors,{placeholder:'例：スクエア／少し開く'})}
        ${textArea('keyPoints','打ち方の注意点',d.keyPoints,errors,'スイングの感覚や注意点')}
        ${inputField('lieConditions','計測時のライ・条件',d.lieConditions,errors,{placeholder:'例：フェアウェイ、無風'})}
        ${inputField('distanceVariability','距離のばらつき',d.distanceVariability,errors,{placeholder:'例：前後±5yd ※本人の観察'})}
        ${textArea('notes','自由メモ',d.notes,errors,'次回の練習で試したいことなど')}
      </div>`:''}</section>
      ${errors.general?`<div class="alert alert-error" role="alert">${icon('alert',17)} ${shotSafe(errors.general)}</div>`:''}
      <button type="submit" class="save-button" ${busy?'disabled':''}>${icon('save',18)} ${busy?'保存しています…':editing?'変更を保存':'ショットを保存'}</button>
      ${editing?`<button type="button" data-shot-action="delete" class="shot-delete" ${busy?'disabled':''}>${icon('trash',17)} このショットを削除</button>`:''}
      <p class="shot-help">ショットはクラブの実物IDに紐づきます。マイセットを切り替えても消えません。</p>
    </form>`;
}
