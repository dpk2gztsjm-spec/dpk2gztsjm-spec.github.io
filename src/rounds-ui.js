import {escapeHtml} from './domain.js';
import {icon} from './icons.js';
import {roundSections,roundStats,roundScoreFor,relativeText,scoreStats} from './rounds.js';
import {roundPhotosFor} from './round-media.js';
import {roundMediaSections} from './round-media-ui.js';
const e=escapeHtml;
const roundTop=(label,title,subtitle='')=>`<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>${label}</div><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>`;
const roundNotice=(toast,error)=>`${error?`<div class="alert alert-error" role="alert">${icon('alert',18)} ${e(error)} <button type="button" data-round-action="retry" class="round-inline-retry" ${error.includes('再試行')?'':'hidden'}>再試行</button></div>`:''}${toast?`<div class="alert alert-success" role="status">${icon('check',17)} ${e(toast)}</div>`:''}`;
const pill=(text,cls='')=>`<span class="round-pill ${cls}">${e(text)}</span>`;
function summaryText(stats){if(!stats||stats.strokes===null)return '未入力';return `${stats.strokes}打 ${relativeText(stats.relative)}${stats.complete?'':' · 暫定'}`;}
export function roundsPage({rounds,courses,players,scores,photos=[],photoUrls=new Map(),toast,error}){
 const sorted=[...rounds].sort((a,b)=>b.playedOn.localeCompare(a.playedOn)||b.createdAt.localeCompare(a.createdAt));
 return `${roundTop('ROUND ARCHIVE','ラウンド記録','一打ずつ残して、自分と仲間のラウンドを振り返る。')}${roundNotice(toast,error)}
 <button class="round-primary" data-round-action="new" type="button">${icon('plus',18)} 新しいラウンドを記録する ${icon('arrow',17)}</button>
 ${!courses.length?`<div class="round-info">先にゴルフ場とホール別PARを登録してください。<a href="#courses">コース登録へ ${icon('arrow',15)}</a></div>`:''}
 <section class="section"><div class="section-heading"><h2>SAVED ROUNDS</h2><span>${rounds.length} ラウンド</span></div>
 ${!sorted.length?`<div class="recent-empty">${icon('calendar',27)}<span>まだラウンド記録はありません</span><small>コースとティーを選び、ホールごとに入力できます。</small></div>`:
 `<div class="round-list">${sorted.map(round=>{const p=players.filter(x=>x.roundId===round.id),ss=scores.filter(s=>s.roundId===round.id);const mine=roundStats(round,p,ss).find(x=>x.isSelf)?.total;const cover=roundPhotosFor(photos,round.id)[0];return `<button type="button" class="round-list-card ${cover?'has-photo':''}" data-round-action="detail" data-round-id="${e(round.id)}">${cover?`<img loading="lazy" class="round-list-cover" alt="" src="${e(photoUrls.get(cover.id)||'')}"/>`:''}<span class="round-list-content"><span class="round-list-head"><small>${e(round.playedOn)} · ${round.holeCount} HOLES</small>${pill(mine?.complete?'確定':'入力途中',mine?.complete?'is-complete':'')}</span><strong>${e(round.courseSnapshot.name)}</strong><span class="round-list-bottom"><span>${e(round.courseSnapshot.tee.name)} · ${p.length}人</span><b>${summaryText(mine)}</b>${icon('arrow',16)}</span></span></button>`}).join('')}</div>`}
 </section><p class="round-footnote">スコアと同伴者名はこの端末内に保存されます。未入力は空欄のままです。</p>`;
}
export function roundFormPage({draft,courses,sets,errors,busy,error}){
 const course=courses.find(c=>c.id===draft.courseId),tees=course?.tees||[];
 const errorFor=(key)=>errors[key]?`<p class="field-error" role="alert">${e(errors[key])}</p>`:'';
 return `<button type="button" class="club-back" data-round-action="cancel-form">${icon('back',17)} 記録一覧に戻る</button>
 ${roundTop('NEW ROUND','ラウンドを作成','登録済みのコース情報と当日のバッグを、この時点で固定保存します。')}${error?`<div class="alert alert-error">${e(error)}</div>`:''}
 <form id="round-form" class="profile-form" novalidate>
 <section class="form-card"><div class="form-card-label"><span>01</span> ラウンド情報</div>
 <div class="round-field"><label for="round-date">プレー日 <span class="required">必須</span></label><input id="round-date" type="date" data-round-field="date" value="${e(draft.date)}" required>${errorFor('date')}</div>
 <div class="round-field"><label for="round-course">ゴルフ場 <span class="required">必須</span></label><select id="round-course" data-round-field="courseId"><option value="">ゴルフ場を選択</option>${courses.map(c=>`<option value="${e(c.id)}" ${draft.courseId===c.id?'selected':''}>${e(c.name)} · ${c.holeCount}H</option>`).join('')}</select>${errorFor('courseId')}</div>
 <div class="round-field"><label for="round-tee">使用ティー <span class="required">必須</span></label><select id="round-tee" data-round-field="teeId" ${!course?'disabled':''}>${tees.map(t=>`<option value="${e(t.id)}" ${draft.teeId===t.id?'selected':''}>${e(t.name)}</option>`).join('')}</select>${errorFor('teeId')}</div>
 <div class="round-field"><label for="round-weather">天候 <span class="optional">任意</span></label><input id="round-weather" data-round-field="weather" maxlength="100" placeholder="例：晴れ・弱風" value="${e(draft.weather)}">${errorFor('weather')}</div>
 </section>
 <section class="form-card"><div class="form-card-label"><span>02</span> プレイヤー <small>1〜4名</small></div><p class="round-hint">自分は自動で登録します。同伴者は任意で最大3名まで追加できます。</p>
 <div class="round-self">${icon('user',18)} <strong>自分</strong>${pill('プレイヤー 1')}</div>
 ${(draft.companions||[]).map((n,i)=>`<div class="round-companion"><label for="round-companion-${i}">プレイヤー ${i+2}</label><input id="round-companion-${i}" data-round-companion="${i}" maxlength="40" placeholder="同伴者の名前" value="${e(n)}"/><button type="button" data-round-action="remove-companion" data-index="${i}" aria-label="プレイヤー${i+2}を削除">${icon('trash',17)}</button></div>`).join('')}
 ${errorFor('companions')}<button type="button" class="round-secondary" data-round-action="add-companion" ${(draft.companions||[]).length>=3?'disabled':''}>${icon('plus',16)} 同伴者を追加（${1+(draft.companions||[]).length}/4人）</button></section>
 <section class="form-card"><div class="form-card-label"><span>03</span> 使用マイセット</div><p class="round-hint">現在のバッグが初期選択です。セットの中身はラウンド作成時点で保存します。</p>
 <div class="round-field"><label for="round-set">使用セット <span class="optional">任意</span></label><select id="round-set" data-round-field="setId"><option value="">セットなし／未登録</option>${sets.map(s=>`<option value="${e(s.id)}" ${draft.setId===s.id?'selected':''}>${e(s.name)} · ${s.clubIds.length}/14</option>`).join('')}</select>${errorFor('setId')}</div></section>
 ${errorFor('general')}<button class="round-primary" type="submit" ${busy||!courses.length?'disabled':''}>${icon('check',17)} ${busy?'作成しています…':'ラウンドを作成してスコア入力へ'} ${icon('arrow',18)}</button>
 <p class="round-footnote">空欄のスコアは0やPARとして補完されません。入力途中でも保存できます。</p></form>`;
}
function progress(round,players,scores){const mine=players.find(p=>p.isSelf),stats=mine?scoreStats(round.courseSnapshot.holes,mine.id,scores):null;return stats?`${stats.entered}/${stats.totalHoles} ホール入力`:'0ホール入力';}
export function holeEntryPage({round,players,scores,index,showPutts,status,error,toast}){
 const holes=round.courseSnapshot.holes,h=holes[index],par=h.par,n=holes.length,topStats=roundStats(round,players,scores);
 return `<button type="button" class="club-back" data-round-action="detail">${icon('back',17)} スコアカードに戻る</button>
 ${roundTop('SCORE ENTRY',e(round.courseSnapshot.name),`${e(round.playedOn)} · ${e(round.courseSnapshot.tee.name)} · ${n}ホール`)}${roundNotice(toast,error)}
 <div class="round-hole-hero"><div class="round-hole-upper"><span>HOLE ${String(h.number).padStart(2,'0')}</span><span>${index+1} / ${n}</span></div><div class="round-hole-title"><strong>${String(h.number).padStart(2,'0')}</strong><div><small>PAR</small><b>${h.par}</b><small>${h.yards===null?'DISTANCE —':`${h.yards} yd`}</small></div></div>
 <div class="round-progress"><span>${progress(round,players,scores)}</span><span role="status" aria-live="polite" id="score-save-status">${e(status)}</span></div></div>
 <div class="round-hole-dots" role="group" aria-label="ホールを選択">${holes.map((hole,i)=>`<button type="button" data-round-action="goto-hole" data-hole-index="${i}" class="${i===index?'is-current':''}" aria-label="ホール${hole.number}へ移動" aria-current="${i===index?'step':'false'}">${hole.number}</button>`).join('')}</div>
 <section class="round-player-list"><div class="section-heading"><h2>PLAYERS</h2><span>${players.length}名</span></div>
 ${players.map((p,i)=>{const score=roundScoreFor(scores,p.id,h.number),strokes=score?.strokes??null,putts=score?.putts??null;
   const stats=topStats.find(x=>x.id===p.id)?.total;
   return `<article class="round-player-card"><div class="round-player-heading"><div><small>${p.isSelf?'YOU':`PLAYER ${i+1}`}</small><h3>${e(p.name)}</h3></div><span>${summaryText(stats)}</span></div>
   <div class="round-score-control"><button type="button" data-round-action="adjust-score" data-player-id="${e(p.id)}" data-change="-1" aria-label="${e(p.name)}の打数を減らす" ${strokes===null||strokes<=1?'disabled':''}>${icon('minus',19)}</button>
    <label><span>打数</span><input type="number" inputmode="numeric" min="1" max="30" step="1" data-score-field="strokes" data-player-id="${e(p.id)}" data-hole="${h.number}" aria-label="${e(p.name)}の打数（空欄で未入力）" placeholder="—" value="${strokes??''}"></label>
    <button type="button" data-round-action="adjust-score" data-player-id="${e(p.id)}" data-change="1" aria-label="${e(p.name)}の打数を増やす" ${strokes!==null&&strokes>=30?'disabled':''}>${icon('plus',19)}</button></div>
    ${showPutts?`<label class="round-putts-field">パット数 <span>任意</span><input type="number" min="0" max="30" step="1" inputmode="numeric" data-score-field="putts" data-player-id="${e(p.id)}" data-hole="${h.number}" placeholder="—" value="${putts??''}" aria-label="${e(p.name)}のパット数"></label>`:''}
   </article>`;}).join('')}
 </section>
 <label class="round-toggle-putts"><input type="checkbox" id="round-show-putts" ${showPutts?'checked':''}> パット数も入力する（任意）</label>
 <div class="round-nav-actions"><button type="button" class="round-secondary" data-round-action="prev-hole" ${index===0?'disabled':''}>${icon('back',17)} 前のホール</button><button type="button" class="round-primary" data-round-action="next-hole">${index===n-1?'スコアカードへ':'次のホール'} ${icon('arrow',17)}</button></div>
 <p class="round-footnote">＋／−は入力した打数を自動保存します。直接入力した数字は確定時に保存されます。空欄は未入力のままです。</p>`;
}
function segmentSummary(stat){if(stat.strokes===null)return '—';return `${stat.strokes}${stat.complete?'':` (${stat.entered}/${stat.totalHoles})`}`;}
export function scorecardTable(round,players,scores){
 const sections=roundSections(round),stats=roundStats(round,players,scores),allHoles=round.courseSnapshot.holes;
 let head='<th class="round-sticky">HOLE</th>', par='<th class="round-sticky">PAR</th>';
 for(const section of sections){for(const hole of section.holes){head+=`<th scope="col">${hole.number}</th>`;par+=`<td>${hole.par}</td>`;}
  head+=`<th scope="col" class="round-total-col">${e(section.name)}</th>`;par+=`<td class="round-total-col">${section.holes.reduce((s,h)=>s+h.par,0)}</td>`;}
 head+='<th scope="col" class="round-total-col">TOTAL</th>';par+=`<td class="round-total-col">${allHoles.reduce((s,h)=>s+h.par,0)}</td>`;
 const rows=players.map(p=>{const s=stats.find(x=>x.id===p.id);let cells='';sections.forEach((section,i)=>{
  cells+=section.holes.map(h=>{const sc=roundScoreFor(scores,p.id,h.number),v=sc?.strokes??null;const color=v===null?'round-cell-empty':v<h.par?'round-cell-birdie':v>h.par?'round-cell-over':'';return `<td class="${color}"><button type="button" data-round-action="edit-hole" data-hole-number="${h.number}" title="ホール${h.number}を編集">${v??'—'}</button></td>`;}).join('');
  cells+=`<td class="round-total-col">${segmentSummary(s.sections[i])}</td>`;
 });cells+=`<td class="round-total-col"><b>${segmentSummary(s.total)}</b></td>`;
 return `<tr><th class="round-sticky round-name-col" scope="row" title="${e(p.name)}"><span>${e(p.name)}</span>${p.isSelf?'<small>YOU</small>':''}</th>${cells}</tr>`;}).join('');
 return `<div class="round-table-container"><div class="round-table-scroller" role="region" tabindex="0" aria-label="横スクロール可能なスコアカード"><table class="round-score-table"><thead><tr>${head}</tr><tr>${par}</tr></thead><tbody>${rows}</tbody></table></div><p class="round-table-help">${icon('arrow',15)} ホール番号と全員の打数が一緒に横移動します。左端の名前は固定。打数タップで編集。</p></div>`;
}
export function roundDetailPage({round,players,scores,photos=[],photoUrls=new Map(),photoBusy=false,mediaError='',noteDraft='',noteDirty=false,noteBusy=false,noteError='',toast,error,status,showAddPlayer,playerEditingId,playerDraft,playerError}){
 const stats=roundStats(round,players,scores),mine=stats.find(p=>p.isSelf)?.total;
 const allEntered=stats.every(p=>p.total.complete),holes=round.courseSnapshot.holes;
 return `<button type="button" class="club-back" data-round-action="back">${icon('back',17)} 記録一覧へ</button>${roundNotice(toast,error)}
 <div class="round-detail-top"><small>${e(round.playedOn)} / ${round.holeCount} HOLES</small><h1>${e(round.courseSnapshot.name)}</h1><p>${e(round.courseSnapshot.tee.name)} · ${e(round.courseSnapshot.prefecture||'')} ${pill(allEntered?'全員入力完了':'入力途中',allEntered?'is-complete':'')}</p></div>
 <div class="round-detail-summary"><div><span>MY SCORE</span><strong>${mine?.strokes??'—'}</strong><small>${mine?.complete?'確定':`${mine?.entered??0}/${holes.length} ホール入力`}</small></div><div><span>TO PAR</span><strong>${relativeText(mine?.relative??null)}</strong><small>${mine?.complete?'確定':'入力済みホールのみ'}</small></div><div><span>PLAYERS</span><strong>${players.length}</strong><small>1〜4人</small></div></div>
 <div class="round-detail-actions"><button type="button" class="round-primary" data-round-action="resume">${icon('edit',17)} スコア入力・修正 ${icon('arrow',17)}</button></div>
 <section class="section"><div class="section-heading"><h2>SCORECARD</h2><span>ホール別スコア</span></div>${scorecardTable(round,players,scores)}
 <p class="round-footnote">（例：41 (8/9)）は入力済み8ホールの暫定打数です。全ホールを入力するまで確定扱いしません。</p></section>
 ${roundMediaSections({photos,photoUrls,photoBusy,mediaError,noteDraft,noteDirty,noteBusy,noteError})}
 <section class="section"><div class="section-heading"><h2>PLAYERS</h2><span>同伴者の管理</span></div>
 <div class="round-companion-manager">${players.map(p=>`<div class="round-player-manage-row"><div><strong>${e(p.name)}</strong><small>${p.isSelf?'本人':`登録済み · ${scoreStats(holes,p.id,scores).entered}/${holes.length}H`}</small></div>${!p.isSelf?`<button type="button" data-round-action="rename-player" data-player-id="${e(p.id)}">編集</button><button type="button" data-round-action="remove-player" data-player-id="${e(p.id)}" class="round-danger-link">削除</button>`:''}</div>${playerEditingId===p.id?`<form id="round-player-form" class="round-player-rename"><input id="round-player-name" maxlength="40" required value="${e(playerDraft)}" aria-label="同伴者名"> <button type="submit">保存</button><button type="button" data-round-action="cancel-player">取消</button></form>`:''}`).join('')}</div>
 ${playerError?`<div class="field-error" role="alert">${e(playerError)}</div>`:''}
 ${showAddPlayer?`<form id="round-add-player" class="round-player-rename"><input id="round-new-player-name" maxlength="40" required placeholder="同伴者名" value="${e(playerDraft)}"><button type="submit">追加</button><button type="button" data-round-action="cancel-player">取消</button></form>`:''}
 ${!showAddPlayer&&players.length<4?`<button type="button" class="round-secondary" data-round-action="add-player">${icon('plus',17)} 同伴者を追加</button>`:''}</section>
 <section class="section"><div class="section-heading"><h2>ROUND INFORMATION</h2><span>保存時の記録</span></div>
 <div class="round-snapshot"><p><span>プレー日</span><strong>${e(round.playedOn)}</strong></p><p><span>使用ティー</span><strong>${e(round.courseSnapshot.tee.name)}</strong></p><p><span>天候</span><strong>${e(round.weather||'未登録')}</strong></p><p><span>使用セット</span><strong>${e(round.setSnapshot?`${round.setSnapshot.name} · ${round.setSnapshot.clubIds.length}本`:'未設定')}</strong></p></div>
 ${round.setSnapshot?`<details class="round-snapshot-clubs"><summary>当日のクラブ構成を表示</summary>${round.setSnapshot.clubs.length?`<ul>${round.setSnapshot.clubs.map(c=>`<li>${e([c.maker,c.model,c.number].filter(Boolean).join(' '))}</li>`).join('')}</ul>`:'<p>当日のクラブ構成は空でした。</p>'}</details>`:''}
 <p class="round-footnote">PAR・ヤード数・ティー・使用セットは作成時のスナップショット。コースやクラブを編集してもこの記録は変更されません。</p></section>
 <button type="button" data-round-action="delete" class="round-danger">このラウンドを削除する</button>
 <p class="round-footnote">写真とメモは端末内に保存されます。アルバムの公開範囲は出力前に選択できます。</p>`;
}
