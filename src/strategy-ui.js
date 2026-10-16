import {escapeHtml as e} from './domain.js';
import {icon} from './icons.js';
import {STRATEGY_STEPS,STRATEGY_OPTIONS,describeStrategy} from './strategy.js';
const s9_sel=(draft,key)=>key.split('.').reduce((o,k)=>o?.[k],draft);
const s9_label=(options,value)=>options.find(([v])=>v===value)?.[1]??'未設定';
function s9_fieldErrors(errors,key){return errors?.[key]?`<p class="strategy-error" role="alert">${e(errors[key])}</p>`:'';}
function s9_selectField(d,key,title,options,errors={},help=''){
 const v=s9_sel(d,key);
 return `<label class="strategy-field"><span class="strategy-field-title">${e(title)}</span><select data-strategy-field="${e(key)}" aria-label="${e(title)}" ${errors[key]?'aria-invalid="true"':''}>${options.map(([value,text])=>`<option value="${e(value)}" ${value===v?'selected':''}>${e(text)}</option>`).join('')}</select>${s9_fieldErrors(errors,key)}${help?`<small>${e(help)}</small>`:''}</label>`;
}
function s9_numberField(d,key,title,errors={},opts={}){
 const v=s9_sel(d,key),{min=-200,max=600,unit='yd',placeholder='未入力',help=''}=opts;
 return `<label class="strategy-field"><span class="strategy-field-title">${e(title)}</span><div class="strategy-number-box"><input data-strategy-field="${e(key)}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" placeholder="${e(placeholder)}" aria-label="${e(title)}" value="${v===null?'':e(String(v))}" ${errors[key]?'aria-invalid="true"':''}><span>${e(unit)}</span></div>${s9_fieldErrors(errors,key)}${help?`<small>${e(help)}</small>`:''}</label>`;
}
function s9_textField(d,key,title,help=''){
 return `<label class="strategy-field"><span class="strategy-field-title">${e(title)}</span><textarea data-strategy-field="${e(key)}" rows="2" maxlength="240" placeholder="任意（240文字まで）">${e(s9_sel(d,key)??'')}</textarea>${help?`<small>${e(help)}</small>`:''}</label>`;
}
function s9_segmented(d,key,title,options){
 const v=s9_sel(d,key);
 return `<div class="strategy-field"><span class="strategy-field-title">${e(title)}</span><div class="strategy-choice-grid" role="group" aria-label="${e(title)}">${options.map(([value,text])=>`<button type="button" class="strategy-choice ${v===value?'is-selected':''}" data-strategy-field-choice="${e(key)}" data-value="${e(value)}" aria-pressed="${v===value}">${v===value?icon('check',15):''}${e(text)}</button>`).join('')}</div></div>`;
}
const SLOPES={
 ballSlope:{title:'ボール地点の傾斜',copy:'左足は身体の左右の足を指します。前後・左右を1つずつ組み合わせられます。',front:[['up','左足上がり'],['down','左足下がり']],side:[['above','爪先上がり'],['below','爪先下がり']]},
 targetSlope:{title:'目標地点の傾斜',copy:'ボールから目標を見た方向を基準にします。ボール地点の傾斜とは別に記録します。',front:[['away','奥下がり'],['toward','手前下がり']],side:[['right','右下がり'],['left','左下がり']]}
};
function s9_slopeDiagram(site){
 const target=site==='targetSlope';
 return `<div class="strategy-slope-diagram"><svg viewBox="0 0 330 100" role="img" aria-label="${target?'目標地点を見たときの奥・手前・左右':'足元で感じる前後・爪先方向'}の方向を示す概念図"><rect x="1" y="1" width="328" height="98" rx="12" fill="#f0f3ef"/><path d="M165 76 V20 M165 20 l-7 11 m7-11 7 11" fill="none" stroke="#698573" stroke-width="2"/><circle cx="165" cy="76" r="6" fill="#33463a"/><path d="M84 58 H134 M196 58 H246" stroke="#94ada0" stroke-width="2" stroke-dasharray="4 4"/><text x="165" y="14" text-anchor="middle" font-size="10" fill="#45614d">${target?'奥（目標方向）':'前後方向'}</text><text x="165" y="94" text-anchor="middle" font-size="10" fill="#647767">${target?'手前（ボール側）':'ボール位置'}</text><text x="42" y="62" text-anchor="middle" font-size="10" fill="#55675d">${target?'左':'爪先側'}</text><text x="288" y="62" text-anchor="middle" font-size="10" fill="#55675d">${target?'右':'身体側'}</text></svg><small>概念図です。実在の地形や勾配を示しません。</small></div>`;
}
function s9_slopeGroup(d,site){
 const c=SLOPES[site],s=d[site]||{front:null,side:null};
 const buttons=(axis,options)=>`<div class="strategy-slope-options" role="group" aria-label="${e(c.title)}・${axis==='front'?'前後':'左右'}方向">${options.map(([value,text])=>`<button type="button" class="strategy-choice ${s[axis]===value?'is-selected':''}" data-strategy-slope="${site}" data-axis="${axis}" data-value="${value}" aria-pressed="${s[axis]===value}">${s[axis]===value?icon('check',15):''}${e(text)}</button>`).join('')}</div>`;
 const current=[s9_label(c.front,s.front),s9_label(c.side,s.side)].filter(x=>x!=='未設定').join(' ＋ ')||'平坦';
 return `<div class="strategy-slope-group"><h3>${e(c.title)}</h3><p>${e(c.copy)}</p>${s9_slopeDiagram(site)}<div class="strategy-slope-header"><strong>前後方向</strong><small>最大1つ</small></div>${buttons('front',c.front)}<div class="strategy-slope-header"><strong>左右方向</strong><small>最大1つ</small></div>${buttons('side',c.side)}<button class="strategy-flat ${!s.front&&!s.side?'is-flat':''}" type="button" data-strategy-slope="${site}" data-axis="flat" data-value="flat">${icon('minus',15)} 平坦に戻す</button><p class="strategy-slope-selected"><span>現在の選択</span><b>${e(current)}</b></p><p class="strategy-field-hint">選択済みのボタンをもう一度押すと、その方向だけ解除できます。</p></div>`;
}
function s9_setStep(ctx){
 const {draft:d,sets,activeSetId}=ctx;
 return `<p class="strategy-step-tip">「現在のバッグ」を初期選択します。攻略中にセットを切り替えても普段のバッグ設定は変わりません。</p><div class="strategy-set-list">
 <button type="button" data-strategy-set="" class="strategy-set-card ${!d.setId?'selected':''}" aria-pressed="${!d.setId}"><span class="strategy-set-icon">${icon('layers',20)}</span><span><b>セット未指定</b><small>保存可能。推薦時は候補を出せません。</small></span>${!d.setId?icon('check',17):''}</button>
 ${sets.map(set=>{const count=(set.clubIds||[]).length;return `<button type="button" data-strategy-set="${e(set.id)}" class="strategy-set-card ${d.setId===set.id?'selected':''}" aria-pressed="${d.setId===set.id}"><span class="strategy-set-icon">${icon('bag',20)}</span><span><b>${e(set.name)} ${set.id===activeSetId?'<em>現在のバッグ</em>':''}</b><small>${count}/14 本 ${count>14?' · 練習用の本数超過':' '} </small></span>${d.setId===set.id?icon('check',17):''}</button>`}).join('')}</div>
 ${ctx.errors?.setId?`<p class="strategy-error" role="alert">${e(ctx.errors.setId)}</p>`:''}
 <p class="strategy-step-tip">${sets.length?'マイセットの変更や追加はホーム → マイセットから。':'マイセットが未登録です。ホームから登録できます。'} <a href="#sets">マイセットを管理 ${icon('arrow',14)}</a></p>`;
}
function s9_distanceStep(ctx){
 const d=ctx.draft;
 return `<div class="strategy-distance-hero"><span>目標総距離</span><strong data-strategy-distance-readout>${e(String(d.targetYards??'—'))}<small> yd</small></strong><input type="range" data-strategy-field="targetYards" data-strategy-distance-slider min="1" max="600" step="1" value="${e(String(d.targetYards??150))}" aria-label="目標総距離スライダー"><div class="strategy-distance-ends"><span>1yd</span><span>600yd</span></div></div>
 <div class="strategy-field-grid">${s9_numberField(d,'targetYards','目標総距離',ctx.errors,{min:1,max:600})}${s9_numberField(d,'requiredCarryYards','必要キャリー（任意）',ctx.errors,{min:0,max:600,help:'ボールを空中で運ぶ必要がある距離。未計測なら空欄でOK'})}</div>
 <p class="strategy-step-tip">振り幅％を飛距離に換算しません。マイショットの実測データがあれば、攻略案で参照します。</p>`;
}
function s9_lieStep(ctx){
 const d=ctx.draft;
 return `${s9_segmented(d,'ballLie','ボールの位置（4択のみ）',STRATEGY_OPTIONS.ballLie)}
 ${d.ballLie==='rough'?`<div class="strategy-conditional"><h3>ラフの追加条件</h3>${s9_selectField(d,'rough.depth','芝の深さ',STRATEGY_OPTIONS.roughDepth)}${s9_selectField(d,'rough.ball','ボールの浮き沈み',STRATEGY_OPTIONS.roughBall)}${s9_selectField(d,'rough.resistance','芝の抵抗',STRATEGY_OPTIONS.roughResistance)}</div>`:''}
 ${d.ballLie==='bunker'?`<div class="strategy-conditional"><h3>バンカーの追加条件</h3>${s9_selectField(d,'bunker.type','バンカー種別',STRATEGY_OPTIONS.bunkerType)}${s9_selectField(d,'bunker.lie','ボールの埋まり具合',STRATEGY_OPTIONS.bunkerLie)}${s9_selectField(d,'bunker.hardness','砂の硬さ',STRATEGY_OPTIONS.sandHardness)}${s9_selectField(d,'bunker.moisture','砂の乾き具合',STRATEGY_OPTIONS.sandMoisture)}${s9_numberField(d,'bunker.lipCm','アゴの高さ（任意）',ctx.errors,{min:0,max:500,unit:'cm',help:'分からなければ空欄'})}</div>`:''}`;
}
function s9_windStep(ctx){const d=ctx.draft;return `<div class="strategy-field-grid">${s9_selectField(d,'wind.direction','風向き',STRATEGY_OPTIONS.windDirection)}${s9_selectField(d,'wind.strength','風の強さ',STRATEGY_OPTIONS.windStrength)}</div>${s9_numberField(d,'elevationYards','目標地点との高低差（任意）',ctx.errors,{min:-200,max:200,help:'目標が高い場合は＋、低い場合は−。分からなければ空欄'})}<p class="strategy-step-tip">風向きはボールから目標を見た基準。「分からない」を選べます。</p>`;}
function s9_conditionsStep(ctx){const d=ctx.draft;return `<div class="strategy-field-grid">${s9_selectField(d,'greenHardness','グリーンの硬さ',STRATEGY_OPTIONS.greenHardness)}${s9_selectField(d,'greenSpeed','グリーンの速さ',STRATEGY_OPTIONS.greenSpeed)}</div>${s9_segmented(d,'goal','ショットの目的',STRATEGY_OPTIONS.shotGoal)}${s9_textField(d,'obstacles','障害物（任意）','樹木、バンカーのアゴ等。自由記述。')}${s9_textField(d,'hazards','ハザード・危険なエリア（任意）','池、OB、崖、ピン周辺など。')}<p class="strategy-step-tip">実際のコース形状や地形は自動取得していません。未入力情報を推測して補いません。</p>`;}
export function strategyFields(step,ctx){switch(step){case 0:return s9_setStep(ctx);case 1:return s9_distanceStep(ctx);case 2:return s9_lieStep(ctx);case 3:return s9_slopeGroup(ctx.draft,'ballSlope');case 4:return s9_slopeGroup(ctx.draft,'targetSlope');case 5:return s9_windStep(ctx);case 6:return s9_conditionsStep(ctx);default:return '';}}
function s9_status(ctx){const s=ctx.status??'未保存';return `<div class="strategy-save-status ${s.includes('失敗')||s.includes('確認')?'has-error':''}" role="status" data-strategy-save-status>${icon(s==='保存済み'?'check':'save',15)} <span>${e(s)}</span></div>${ctx.error?`<div class="alert alert-error strategy-main-error" role="alert">${e(ctx.error)}</div>`:''}`;}
function s9_saved(ctx){
 if(!ctx.records?.length)return '';
 return `<details class="strategy-saved"><summary>保存済みの条件 ${ctx.records.length}件 ${icon('chevron',15)}</summary><div class="strategy-saved-list">${[...ctx.records].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(r=>`<div class="strategy-saved-item"><button type="button" data-strategy-action="load" data-strategy-id="${e(r.id)}"><strong>${e(describeStrategy(r,ctx.sets))}</strong><small>${e(r.updatedAt?.slice(0,10)||'')}</small></button><button type="button" data-strategy-action="delete" data-strategy-id="${e(r.id)}" aria-label="保存済み条件を削除">${icon('trash',17)}</button></div>`).join('')}</div></details>`;
}
export function strategyWizardPage(ctx){
 const step=Math.max(0,Math.min(STRATEGY_STEPS.length-1,ctx.step)),info=STRATEGY_STEPS[step];
 return `<section class="strategy-page"><div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>SHOT STRATEGY</div><h1>コース攻略</h1><p>練習とラウンド前の戦略を、ひとつずつ整理。</p></div>
 <div class="strategy-notice">${icon('shield',17)} 事前学習用です。競技ラウンド中のクラブ推薦には使用しないでください。</div>
 <div class="strategy-flow-header"><span>STEP ${String(step+1).padStart(2,'0')} / ${String(STRATEGY_STEPS.length).padStart(2,'0')}</span><span>${Math.round((step+1)/STRATEGY_STEPS.length*100)}%</span></div><div class="strategy-progress" role="progressbar" aria-label="入力進捗" aria-valuemin="1" aria-valuemax="${STRATEGY_STEPS.length}" aria-valuenow="${step+1}"><div style="width:${((step+1)/STRATEGY_STEPS.length*100).toFixed(2)}%"></div></div>
 <section class="strategy-card strategy-wizard-card"><div class="strategy-step-number">${String(step+1).padStart(2,'0')}</div><h2>${info.title}</h2><p class="strategy-step-subtitle">${info.subtitle}</p>${strategyFields(step,ctx)}</section>
 ${s9_status(ctx)}
 <div class="strategy-nav"><button type="button" class="strategy-secondary" data-strategy-action="prev" ${step===0?'disabled':''}>${icon('back',17)} 前へ</button><button type="button" class="strategy-primary" data-strategy-action="next">${step===STRATEGY_STEPS.length-1?'一覧で確認':'次へ'} ${icon('arrow',17)}</button></div>
 <div class="strategy-bottom-actions"><button type="button" data-strategy-action="save" class="strategy-link">${icon('save',16)} 入力を保存</button><button type="button" data-strategy-action="review" class="strategy-link">入力一覧を確認</button><button type="button" data-strategy-action="new" class="strategy-link">最初から新しい条件</button></div>
 ${s9_saved(ctx)}</section>`;
}
export function strategyReviewPage(ctx){
 return `<section class="strategy-page"><div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>STRATEGY INPUT</div><h1>条件を確認・修正</h1><p>すべての条件をこの画面で変更できます。ステップ入力へ戻る必要はありません。</p></div>
 <div class="strategy-notice">${icon('info',17)} 条件は端末に保存します。入力を修正しても「現在のバッグ」は変わりません。</div>
 ${STRATEGY_STEPS.map((step,i)=>`<section class="strategy-card strategy-review-section" aria-label="${e(step.title)}"><div class="strategy-review-heading"><span>${String(i+1).padStart(2,'0')}</span><h2>${e(step.title)}</h2></div>${strategyFields(i,ctx)}</section>`).join('')}
 ${s9_status(ctx)}
 <div class="strategy-review-actions"><button class="strategy-primary" type="button" data-strategy-action="result">攻略案を見る ${icon('arrow',17)}</button><button class="strategy-secondary" type="button" data-strategy-action="save">${icon('save',17)} 条件を保存</button></div>
 <p class="strategy-step-tip">実測のない飛距離は補完せず、候補がある場合でもその場の風・ライによる補正は行いません。</p>
 <div class="strategy-bottom-actions"><button type="button" class="strategy-link" data-strategy-action="wizard">ステップ入力に戻る</button><button type="button" class="strategy-link" data-strategy-action="new">新しい条件を作る</button></div>${s9_saved(ctx)}</section>`;
}
export function slopeText(s,site){const c=SLOPES[site];return [s9_label(c.front,s?.front),s9_label(c.side,s?.side)].filter(x=>x!=='未設定').join(' ＋ ')||'平坦';}
