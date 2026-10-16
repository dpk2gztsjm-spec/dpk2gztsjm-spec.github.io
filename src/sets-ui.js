import {escapeHtml} from './domain.js';
import {clubGroups, getSetClubs, countMissingClubs, setClubCount, isOverLimit} from './sets.js';
import {categoryShort} from './clubs.js';
import {icon} from './icons.js';
import {bagDrawing} from './clubs-ui.js';
const setSafe=escapeHtml;
const countLabel = set=>`${setClubCount(set)}/14`;
function warning(set) {return isOverLimit(set)?`<div class="set-warning" role="status">${icon('alert',16)}14本を超えています。公式ラウンドではクラブ本数の規則を確認してください。保存・使用セットの選択は可能です。</div>`:'';}
function setHeader({name,count,active=false}) {return `<div class="set-name-line"><strong>${setSafe(name)}</strong>${active?'<span class="set-active-chip">現在のバッグ</span>':''}</div><div class="set-count ${count>14?'over-limit':''}">${count}<span> / 14</span></div>`;}
function clubPills(set,clubs) {
  const actual=getSetClubs(set,clubs);
  return actual.length?`<div class="set-pills">${actual.slice(0,8).map(c=>`<span>${setSafe(categoryShort(c.category))} ${setSafe(c.number)}</span>`).join('')}${actual.length>8?`<span>+${actual.length-8}本</span>`:''}</div>`:'<p class="set-empty-text">クラブは未選択です</p>';
}
export function setsPage({sets,clubs,activeId,toast,error}) {
  const active=sets.find(s=>s.id===activeId);
  const selectedCount=active?setClubCount(active):0;
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>YOUR GOLF EQUIPMENT</div><h1>マイセット</h1><p>持っているクラブを自由に組み合わせて、用途別のバッグを保存。</p></div>
  ${toast?`<div class="alert alert-success" role="status">${icon('check',17)} ${setSafe(toast)}</div>`:''}
  ${error?`<div class="alert alert-error" role="alert">${icon('alert',17)} ${setSafe(error)}</div>`:''}
  <section class="set-hero" aria-label="現在のバッグ">
    <div class="set-hero-main"><div class="set-hero-kicker">CURRENT BAG <span class="small-dot"></span> ${active?'ACTIVE':'NOT SELECTED'}</div>
      <h2>${active?setSafe(active.name):'バッグを、選ぼう。'}</h2>
      <div class="set-hero-count">${active?`${selectedCount}<span> / 14 CLUBS</span>`:'— <span>CLUBS</span>'}</div>
      <p>${active?'現在使用するセットとして指定されています。':'セットを作って「現在のバッグにする」を押してください。'}</p>
      <a class="set-hero-link" href="#clubs">所有クラブを見る ${icon('arrow',14)}</a>
    </div>
    ${bagDrawing(selectedCount)}
  </section>
  ${active?warning(active):''}
  <div class="set-heading-line"><div><h2>MY SETS</h2><span>${sets.length} セット保存済み</span></div><button class="set-new" type="button" data-set-action="new">${icon('plus',17)} セットを作成</button></div>
  ${sets.length?`<div class="set-cards">${sets.map(s=>{
    const isActive=s.id===activeId;
    const missing=countMissingClubs(s,clubs);
    return `<article class="set-card ${isActive?'is-active':''}">
      <div class="set-card-top">${setHeader({name:s.name,count:setClubCount(s),active:isActive})}</div>
      ${clubPills(s,clubs)}
      ${missing?`<p class="set-missing">登録済みクラブを${missing}本参照できません。編集して更新してください。</p>`:''}
      ${isOverLimit(s)?`<span class="set-inline-warning">${icon('alert',14)} 14本を超過</span>`:''}
      <div class="set-card-actions">
        <button data-set-action="preview" data-set-id="${setSafe(s.id)}" type="button">構成を見る ${icon('chevron',15)}</button>
        ${isActive?`<span class="set-is-current">${icon('check',16)} 使用中</span>`:`<button class="set-activate" data-set-action="activate" data-set-id="${setSafe(s.id)}" type="button">現在のバッグにする</button>`}
      </div>
    </article>`;
  }).join('')}</div>`:
  `<div class="set-empty-state">${icon('layers',31)}<h3>まだマイセットがありません</h3><p>普段のバッグや練習用など、複数のセットを保存できます。</p><button data-set-action="new" type="button">${icon('plus',16)} 最初のセットを作成</button></div>`}
  <div class="set-explanation">${icon('info',18)} <span>所有クラブは「マイクラブ」で管理します。セットをプレビューしても現在のバッグは変わりません。15本以上でも保存できます。</span></div>`;
}
export function setDetailPage({set,clubs,activeId,toast,error,busy}) {
  const active=set.id===activeId;
  const selected=getSetClubs(set,clubs);
  const missing=countMissingClubs(set,clubs);
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>MY SET / PREVIEW</div><h1>${setSafe(set.name)}</h1><p>この画面を見るだけでは現在のバッグは変更されません。</p></div>
    <button class="club-back" type="button" data-set-action="back">${icon('back',17)} セット一覧へ戻る</button>
    ${toast?`<div class="alert alert-success" role="status">${icon('check',17)} ${setSafe(toast)}</div>`:''}
    ${error?`<div class="alert alert-error" role="alert">${icon('alert',17)} ${setSafe(error)}</div>`:''}
    <section class="set-detail-hero"><div><span>SET COMPOSITION</span><h2>${setSafe(set.name)}</h2><strong class="${isOverLimit(set)?'over-limit':''}">${countLabel(set)} <small>CLUBS</small></strong>${active?'<em>現在のバッグ</em>':''}</div>${bagDrawing(selected.length)}</section>
    ${warning(set)}
    ${missing?`<div class="set-warning">${missing}本のクラブが見つかりません。編集時に登録済みクラブだけを再選択できます。</div>`:''}
    <div class="set-detail-actions">
      ${active?`<div class="set-selected-notice">${icon('check',17)} 現在のバッグに設定済み</div>`:`<button type="button" class="set-primary-button" data-set-action="activate" data-set-id="${setSafe(set.id)}" ${busy?'disabled':''}>${icon('bag',18)} 現在のバッグにする</button>`}
      <button type="button" class="set-outline-button" data-set-action="edit" data-set-id="${setSafe(set.id)}">${icon('edit',16)} 構成を編集</button>
    </div>
    <div class="section-heading set-detail-title"><h2>CLUB COMPOSITION</h2><span>${selected.length}本</span></div>
    ${selected.length?`<div class="set-detail-clubs">${clubGroups(selected).map(group=>`<section><h3>${setSafe(group.category.label)} <small>${group.clubs.length}本</small></h3>${group.clubs.map(c=>`<div class="set-detail-club"><span class="set-club-number">${setSafe(c.number)}</span><div><strong>${setSafe(c.maker)} ${setSafe(c.model)}</strong><p>${c.loftDeg!==null && c.loftDeg!==undefined?`${setSafe(c.loftDeg)}° · `:''}${setSafe(c.shaft||'')}</p></div></div>`).join('')}</section>`).join('')}</div>`:'<div class="set-empty-state"><p>クラブがありません。編集から追加できます。</p></div>'}
    <div class="set-bottom-actions"><button type="button" data-set-action="duplicate" data-set-id="${setSafe(set.id)}" ${busy?'disabled':''}>${icon('layers',16)} このセットを複製</button><button type="button" class="set-danger" data-set-action="delete" data-set-id="${setSafe(set.id)}" ${busy?'disabled':''}>${icon('trash',16)} 削除</button></div>`;
}
export function setFormPage({draft,clubs,errors,busy,editing}) {
  const selected=new Set(draft.clubIds ?? []);
  const count=selected.size;
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>MY SET / EDIT</div><h1>${editing?'マイセットを編集':'新しいマイセット'}</h1><p>同じクラブは1セットに1本だけ。異なるセットには何度でも登録できます。</p></div>
    <button type="button" class="club-back" data-set-action="cancel">${icon('back',17)} ${editing?'セット詳細':'セット一覧'}へ戻る</button>
    <form id="set-form" class="profile-form" novalidate>
      <section class="form-card set-form-card"><div class="form-card-label"><span>01</span> セットの名前</div>
        <div class="club-field"><label for="set-name">セット名 <span class="required">必須</span></label><input id="set-name" name="name" data-set-field="name" maxlength="60" placeholder="例：普段のセット" autocomplete="off" value="${setSafe(draft.name)}"/>
        ${errors.name?`<p class="field-error" role="alert">${setSafe(errors.name)}</p>`:''}</div>
      </section>
      <section class="form-card set-form-card"><div class="form-card-label"><span>02</span> クラブを選ぶ</div>
        <div class="set-counter ${count>14?'over-limit':''}"><strong>${count} <small>/ 14 本</small></strong><span>${count>14?'14本を超過（保存可能）':'所有クラブから選択'}</span></div>
        ${count>14?`<div class="set-warning">${icon('alert',16)}公式ラウンドの本数制限に注意。15本以上でも保存できます。</div>`:''}
        ${clubs.length?clubGroups(clubs).map(group=>`<fieldset class="set-club-group"><legend>${setSafe(group.category.label)} <small>${group.clubs.length}</small></legend>
          ${group.clubs.map(c=>`<label class="set-club-option ${selected.has(c.id)?'selected':''}"><input type="checkbox" data-set-club-id="${setSafe(c.id)}" ${selected.has(c.id)?'checked':''}/><span class="set-club-badge">${setSafe(c.number)}</span><span class="set-club-description"><strong>${setSafe(c.maker)} ${setSafe(c.model)}</strong><small>${c.loftDeg!==null&&c.loftDeg!==undefined?`${setSafe(c.loftDeg)}° · `:''}${setSafe(c.shaft||group.category.label)}</small></span><span class="set-option-check">${selected.has(c.id)?icon('check',16):icon('plus',16)}</span></label>`).join('')}
        </fieldset>`).join(''):`<div class="set-empty-state"><p>まだ所有クラブがありません。先にマイクラブから登録すると選択できます。</p><a class="set-new" href="#clubs">マイクラブへ ${icon('arrow',15)}</a></div>`}
      </section>
      ${errors.general?`<div class="alert alert-error" role="alert">${icon('alert',16)} ${setSafe(errors.general)}</div>`:''}
      <button type="submit" class="save-button" ${busy?'disabled':''}>${icon('save',18)} ${busy?'保存中…':editing?'変更を保存':'マイセットを保存'} ${icon('arrow',16)}</button>
      <p class="privacy-line">${icon('shield',17)} 保存しても自動で現在のバッグに切り替わりません。</p>
    </form>`;
}
