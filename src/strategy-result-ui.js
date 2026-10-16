import {escapeHtml as e} from './domain.js';
import {icon} from './icons.js';
import {describeStrategy} from './strategy.js';
import {slopeText} from './strategy-ui.js';
import {recommendStrategy} from './strategy-engine.js';
const rs10_safe=(n)=>n===null||n===undefined?'未計測':`${Number(n).toLocaleString('ja-JP',{maximumFractionDigits:1})} yd`;
const text=(s)=>e(String(s??''));
const cap=(t)=>`<small class="sr10-caption">${text(t)}</small>`;
function overheadDiagram(s,c,i){
 const left=s.targetSlope.side==='left',right=s.targetSlope.side==='right';
 const sx=left?-26:right?26:0;
 const dx=sx?`M175 82 l${sx} -13`:'M175 82 v-23';
 const flag=(s.targetSlope.front||s.targetSlope.side)?`<path d="${dx}" stroke="#a96d52" stroke-width="3.5" stroke-linecap="round" marker-end="url(#rs10Slope${i})"/><text x="220" y="73" font-size="11" fill="#945f49">傾斜</text>`:'';
 return `<div class="sr10-diagram"><svg viewBox="0 0 350 235" role="img" aria-label="練習用の上空模式図。青色は飛球、橙色はラン。傾斜は方向だけを示します。">
 <defs><marker id="rs10Air${i}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#547d9e"/></marker><marker id="rs10Roll${i}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#c48759"/></marker><marker id="rs10Slope${i}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#a96d52"/></marker></defs>
 <rect x="14" y="12" width="322" height="211" rx="16" fill="#f2f5f0"/>
 <path d="M175 212 Q64 167 92 83 Q135 2 235 41 Q302 78 240 178" stroke="#dce5d9" stroke-width="2" fill="none" stroke-dasharray="4 7"/>
 <ellipse cx="175" cy="77" rx="74" ry="34" stroke="#8fb59a" stroke-width="1.5" fill="#e6efe4"/>
 <ellipse cx="175" cy="96" rx="48" ry="18" fill="#d6e6d5" fill-opacity=".65" stroke="#c7dac7" stroke-dasharray="4 4"/>
 <circle cx="175" cy="186" r="7" fill="#303e34"/><text x="186" y="203" font-size="11" fill="#516154">ボール</text>
 <path d="M175 174 Q135 131 173 107" fill="none" stroke="#547d9e" stroke-width="4" stroke-linecap="round" marker-end="url(#rs10Air${i})"/>
 <circle cx="173" cy="101" r="8" fill="#fff" stroke="#547d9e" stroke-width="2"/><circle cx="173" cy="101" r="2.5" fill="#547d9e"/>
 <path d="M173 91 Q181 69 188 56" fill="none" stroke="#c48759" stroke-width="4" stroke-linecap="round" marker-end="url(#rs10Roll${i})"/>
 <path d="M194 61 V28 L213 35 L194 42" stroke="#606f58" stroke-width="1.8" fill="#f8fcf7"/><circle cx="194" cy="61" r="3.5" fill="#596e5b"/>
 ${flag}<text x="26" y="34" font-size="10" fill="#7b8d7d">TOP VIEW · 模式図</text><text x="25" y="214" font-size="10" fill="#748477">距離・形状・角度は実測図ではありません</text>
 </svg><div class="sr10-legend"><span><i class="air"></i>飛球</span><span><i class="roll"></i>ラン</span><span><i class="slope"></i>傾斜（入力時）</span></div></div>`;
}
function addressFront(s,c,hand){
 const mir=hand==='left'?'translate(340,0) scale(-1,1)':'';
 const slope=s.ballSlope.front==='up'?-13:s.ballSlope.front==='down'?13:0;
 return `<svg viewBox="0 0 340 186" role="img" aria-label="${text(hand==='left'?'左打ち':'右打ち')}のアドレス正面模式図。前後方向の傾斜を足元のラインで模式的に表示。爪先方向は文字で説明。">
 <rect width="340" height="186" rx="12" fill="#f1f4ef"/><text x="14" y="20" font-size="10" fill="#667b6a">正面 / ${hand==='left'?'左打ち':'右打ち'}</text><g transform="${mir}">
 <path d="M18 162 L322 ${162+slope}" stroke="#b4c9af" stroke-width="3"/>
 <circle cx="152" cy="48" r="17" fill="#e9eee7" stroke="#496052" stroke-width="2"/>
 <path d="M149 67 L164 109 L195 116" stroke="#496052" stroke-width="8" fill="none" stroke-linecap="round"/>
 <path d="M164 107 L131 136 L118 159 M164 107 L188 137 L200 159" stroke="#496052" stroke-width="7" fill="none" stroke-linecap="round"/>
 <path d="M153 82 L183 101 L205 101 M158 81 L181 108 L205 101" fill="none" stroke="#718b78" stroke-width="5" stroke-linecap="round"/>
 <path d="M205 101 L241 153" stroke="#798994" stroke-width="2.5"/><path d="M238 153 L257 155" stroke="#41566a" stroke-width="4" stroke-linecap="round"/>
 <circle cx="266" cy="${157+slope*0.8}" r="6" fill="white" stroke="#456c8a" stroke-width="2"/>
 </g><text x="170" y="180" text-anchor="middle" font-size="9" fill="#718073">姿勢・角度は固定値の指示ではありません</text></svg>`;
}
function addressTop(s,c,hand){
 const mir=hand==='left'?'translate(340,0) scale(-1,1)':'';
 return `<svg viewBox="0 0 340 186" role="img" aria-label="${text(hand==='left'?'左打ち':'右打ち')}のアドレス上空模式図。クラブとボールの位置関係の学習用。">
 <rect width="340" height="186" rx="12" fill="#f1f4ef"/><text x="14" y="20" font-size="10" fill="#667b6a">上空 / ${hand==='left'?'左打ち':'右打ち'}</text><g transform="${mir}">
 <path d="M30 54 H310" stroke="#aec5b1" stroke-dasharray="6 5" stroke-width="2"/>
 <path d="M170 157 V35" stroke="#e0e5dd" stroke-dasharray="5 5" stroke-width="2"/>
 <ellipse cx="155" cy="132" rx="45" ry="19" fill="#d8e4d6" stroke="#5e7961" stroke-width="2"/>
 <ellipse cx="107" cy="127" rx="14" ry="25" transform="rotate(-10 107 127)" fill="#668272"/>
 <ellipse cx="204" cy="127" rx="14" ry="25" transform="rotate(12 204 127)" fill="#668272"/>
 <circle cx="152" cy="91" r="9" fill="none" stroke="#708a76" stroke-width="3"/><path d="M152 100 L152 66" stroke="#5f7c68" stroke-width="5" stroke-linecap="round"/>
 <path d="M152 85 L185 63" stroke="#697e8d" stroke-width="3"/><rect x="180" y="54" width="23" height="8" rx="2" transform="rotate(-30 180 54)" fill="#445567"/>
 <circle cx="207" cy="52" r="6" fill="white" stroke="#456c8a" stroke-width="2"/>
 </g><text x="170" y="180" text-anchor="middle" font-size="9" fill="#718073">目標方向は上・左打ちでは表示を左右反転</text></svg>`;
}
function addressPanel(s,c,hand,view){
 const a=c.address;
 return `<section class="sr10-address"><div class="sr10-diagram-heading"><h4>アドレスの確認</h4><div class="sr10-switch"><button type="button" data-strategy-result-action="view" data-view="front" aria-pressed="${view==='front'}" class="${view==='front'?'selected':''}">正面</button><button type="button" data-strategy-result-action="view" data-view="top" aria-pressed="${view==='top'}" class="${view==='top'?'selected':''}">上空</button></div></div>
 <div class="sr10-address-visual">${view==='top'?addressTop(s,c,hand):addressFront(s,c,hand)}</div>
 <dl class="sr10-address-grid"><div><dt>スタンス</dt><dd>${text(a.stance)}</dd></div><div><dt>ボール位置</dt><dd>${text(a.ball)}</dd></div><div><dt>体重配分</dt><dd>${text(a.weight)}</dd></div><div><dt>フェース向き</dt><dd>${text(a.face)}</dd></div><div><dt>身体の向き</dt><dd>${text(a.alignment)}</dd></div></dl>
 ${a.customPoints?`<p class="sr10-custom"><b>本人の登録したポイント：</b>${text(a.customPoints)}</p>`:''}
 ${a.notes.length?`<div class="sr10-address-notes"><b>ライ・傾斜の注意点</b><ul>${a.notes.map(n=>`<li>${text(n)}</li>`).join('')}</ul></div>`:''}
 ${cap('独自SVGによる一般的な模式図。個別の関節角度・荷重量は再現していません。')}</section>`;
}
function details(s,c,i,hand,view){
 return `<div class="sr10-details"><div class="sr10-metrics"><div><span>キャリー</span><strong>${rs10_safe(c.distance.carry)}</strong></div><div><span>ラン</span><strong>${rs10_safe(c.distance.roll)}</strong></div><div><span>合計</span><strong>${rs10_safe(c.distance.total)}</strong></div></div>
 <p class="sr10-source">${icon('info',15)} ${text(c.dataKind)}。数値はマイショットから取得した実測値のみ。風・高低差・芝・傾斜による補正は行っていません。</p>
 <div class="sr10-section-heading"><h4>着地点とラン</h4><span>上空図</span></div>${overheadDiagram(s,c,i)}
 ${cap('矢印は説明用であり、推定軌道・正確な着地点・ラン距離を示しません。')}
 <div class="sr10-section-heading"><h4>この候補を考える理由</h4><span>根拠</span></div><ul class="sr10-reasons">${c.reason.map(r=>`<li>${text(r)}</li>`).join('')}</ul>
 <div class="sr10-risk"><strong>${icon('alert',16)} リスク・不確実性</strong><ul>${c.risks.map(r=>`<li>${text(r)}</li>`).join('')}</ul></div>
 ${addressPanel(s,c,hand,view)}
 <button type="button" class="sr10-tip-link" data-strategy-tip="${text(c.tipId)}">関連するTipsを読む ${icon('arrow',17)}</button></div>`;
}
function candidateCard(s,c,index,ctx){
 const main=index===0,open=main||ctx.expandedAlt===index,hand=ctx.handedness==='left'?'left':'right';
 return `<article class="sr10-candidate ${main?'sr10-primary':''} ${open?'is-open':''}">
 <div class="sr10-candidate-head"><div class="sr10-rank"><span>${main?'第一候補':index===1?'代替案 01':'代替案 02'}</span>${main?'<b>BEST MATCH*</b>':''}</div><div class="sr10-data-chip ${c.distance.complete?'measured':'unmeasured'}">${text(c.dataKind)}</div></div>
 ${main?`<h2>${text(c.clubNumber||c.club)}</h2><p class="sr10-club">${text(c.club)}</p><h3>${text(c.shotName)}</h3>`:`<h3>${text(c.clubNumber||c.club)} · ${text(c.shotName)}</h3><p class="sr10-club">${text(c.club)}</p>`}
 <div class="sr10-tags"><span>${text(c.shotTypeLabel)}</span><span>${text(c.swing)}</span></div>
 ${!main?`<button type="button" class="sr10-expand" aria-expanded="${open}" data-strategy-result-action="expand" data-index="${index}">${open?'詳細を閉じる':'推奨理由・図解を見る'} ${icon(open?'back':'chevron',16)}</button>`:''}
 ${open?details(s,c,index,hand,ctx.addressView):''}</article>`;
}
export function strategyResultPage(ctx){
 const result=recommendStrategy({scenario:ctx.draft,sets:ctx.sets,clubs:ctx.clubs,shots:ctx.shots,handedness:ctx.handedness});
 const s=ctx.draft;
 return `<section class="strategy-page sr10-page"><div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>SHOT STRATEGY / RESULTS</div><h1>攻略案</h1><p>マイセットとマイショットから、練習・事前攻略の候補を比較。</p></div>
 <div class="strategy-notice">${icon('shield',17)} 練習・ラウンド前の検討専用。競技中のクラブ推薦として使わないでください。</div>
 <section class="sr10-summary"><div><span>目標総距離</span><strong>${text(s.targetYards)}<small> yd</small></strong></div><div><span>使用セット</span><strong class="sr10-setname">${text(result.summary?.setName||ctx.sets.find(x=>x.id===s.setId)?.name||'未指定')}</strong></div></section>
 <p class="sr10-situation">ボール地点：${text(slopeText(s.ballSlope,'ballSlope'))}<span> ／ </span>着地点：${text(slopeText(s.targetSlope,'targetSlope'))}</p>
 ${result.candidates.length?`<p class="sr10-evidence">${icon('info',16)} ${text(result.summary.evidence)} *第一候補は条件付きの順位で、飛距離や安全を保証しません。</p>${result.candidates.map((c,i)=>candidateCard(s,c,i,ctx)).join('')}`:
 `<div class="strategy-card sr10-empty"><div class="sr10-empty-icon">${icon('target',32)}</div><h2>確かな候補を表示できません</h2><p>${text(result.reason)}</p><p>距離不明のショットは勝手に補完しません。必要ならマイセット・ショット情報を登録してから再検討してください。</p><a href="#sets" class="sr10-tip-link">マイセットを確認 ${icon('arrow',17)}</a></div>`}
 <div class="sr10-summary-note"><b>この推薦の限界</b><p>着地点の形や障害物の位置を読み取る機能はありません。実測がある場合も、その環境で同じ距離が出るとは限りません。複合傾斜、風、ラフ、グリーン条件は注意点・候補選別に用い、根拠のない数値補正はしていません。</p></div>
 <button type="button" class="strategy-primary strategy-full" data-strategy-action="review">${icon('back',17)} 条件を修正する</button>
 <p class="sr10-footer">${text(describeStrategy(s,ctx.sets))}</p></section>`;
}
