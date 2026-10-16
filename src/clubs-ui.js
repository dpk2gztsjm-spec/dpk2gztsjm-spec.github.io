import {escapeHtml} from './domain.js';
import {icon} from './icons.js';
import {CLUB_CATEGORIES,IRON_NUMBERS,categoryName,categoryShort,matchClubs} from './clubs.js';

const safe = escapeHtml;
const plus = () => icon('plus',17);
const fieldError = (errors,key) => errors?.[key] ? `<span class="field-error" role="alert">${safe(errors[key])}</span>` : '';
const textField = ({label,key,value='',placeholder='',required=false,type='text',extra='',limit=100}) => `<div class="club-field">
  <label for="club-${key}">${label} ${required?'<span class="required">必須</span>':'<span class="optional">任意</span>'}</label>
  <input id="club-${key}" data-club-field="${key}" type="${type}" ${type==='number'?'inputmode="decimal"':''} maxlength="${limit}" value="${safe(value??'')}" placeholder="${safe(placeholder)}" ${extra} autocomplete="off" />
  ${fieldError(currentErrors,key)}</div>`;
let currentErrors={};

export function bagDrawing(count) {
  const shafts = Array.from({length:Math.min(Math.max(count,3),9)},(_,i)=>{
    const x=79+i*13, tipY=(i%3)*7+22;
    return `<line x1="${x}" y1="${tipY+16}" x2="${x+9}" y2="120" stroke="#bcc9c2" stroke-width="2.2" stroke-linecap="round"/>
     ${i%3===0?`<path d="M${x-11} ${tipY+3} Q${x-14} ${tipY-6} ${x} ${tipY-6} L${x+7} ${tipY} Q${x+10} ${tipY+8} ${x-11} ${tipY+8}Z" fill="#d9e7e2"/>`:
     `<path d="M${x-6} ${tipY+3} q10 -10 17 1 l-5 13 l-12 -2Z" fill="#cbd9d2"/>`}`;
  }).join('');
  return `<svg class="bag-picture" viewBox="0 0 255 275" fill="none" role="img" aria-label="ゴルフバッグのイラスト">
    <ellipse cx="133" cy="258" rx="83" ry="9" fill="#b6c4b9" opacity=".13"/>
    ${shafts}
    <path d="M64 102 q13 -12 63 -12 q51 0 70 14 l10 18 l-9 121 q-62 24 -131 -1 L57 122Z" fill="#323d37" stroke="#52665b" stroke-width="2"/>
    <path d="M62 112q62 17 135 0" stroke="#87998c" stroke-width="2"/>
    <path d="M63 132L71 235 Q129 256 198 234L201 128" fill="#48564c"/>
    <path d="M72 150q54 12 122 -2l-6 53q-55 14 -111 0Z" fill="#36443c" stroke="#76867a" stroke-width="1"/>
    <path d="M66 108Q29 130 44 196l20 7M196 115q36 42 9 98" stroke="#c4b49b" stroke-width="9" stroke-linecap="round" opacity=".74"/>
    <path d="M110 166h40 M130 147v40" stroke="#d2dcd1" stroke-width="1" opacity=".38"/>
    <text x="132" y="222" text-anchor="middle" fill="#cbdad0" font-size="10" font-weight="700" letter-spacing="3">GOLF</text>
    <path d="M90 239h85" stroke="#8a9f90" opacity=".5"/>
  </svg>`;
}

function clubItem(club) {
  return `<article class="club-item">
    <div class="club-icon-box" aria-hidden="true"><span>${safe(categoryShort(club.category))}</span><i>${safe(club.number)}</i></div>
    <div class="club-info">
      <div class="club-meta">${safe(categoryName(club.category))}${club.releaseYear?` · ${safe(club.releaseYear)}`:''}</div>
      <h3>${safe(club.maker)} <b>${safe(club.model)}</b></h3>
      <div class="club-details">${safe(club.number)}${club.loftDeg!==null && club.loftDeg!==undefined?` <span>· ${safe(club.loftDeg)}°</span>`:''}${club.shaft?` <span>· ${safe(club.shaft)}</span>`:''}</div>
    </div>
    <div class="club-item-actions"><button class="club-shot-link" type="button" data-club-action="make-shot" data-club-id="${safe(club.id)}" aria-label="${safe(club.number)}のショットを登録">${icon('plus',15)}<span>ショット</span></button><button class="edit-club" type="button" data-club-action="edit" data-club-id="${safe(club.id)}" aria-label="${safe(club.maker)} ${safe(club.model)} ${safe(club.number)}を編集">${icon('edit',17)}<span>編集</span></button></div>
  </article>`;
}
function emptyInventory(searching) {
  return `<div class="club-empty">${icon(searching?'search':'bag',34)}<h3>${searching?'一致するクラブがありません':'最初の一本を登録しましょう'}</h3>
    <p>${searching?'検索語や種類を変えてみてください。':'メーカー・モデル・番手を登録すると、ここに所有クラブが並びます。'}</p>
    ${searching?'':`<button type="button" data-club-action="new-single" class="mini-cta">${plus()} 単品を登録</button>`}</div>`;
}
export function clubInventory(clubs,query='',category='all') {
  const found=matchClubs(clubs,query,category).sort((a,b)=>CLUB_CATEGORIES.findIndex(c=>c.value===a.category)-CLUB_CATEGORIES.findIndex(c=>c.value===b.category) || (a.number||'').localeCompare(b.number||'', 'ja', {numeric:true}) || a.maker.localeCompare(b.maker,'ja'));
  return `<div class="inventory-heading"><strong>OWNED CLUBS</strong><span>${found.length} / ${clubs.length} 本</span></div>
    ${found.length?`<div class="club-list">${found.map(clubItem).join('')}</div>`:emptyInventory(query||category!=='all')}`;
}
export function clubsPage({clubs,query,category,toast,error}) {
  return `<div class="page-top clubs-page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>MY EQUIPMENT</div><h1>マイクラブ</h1><p>あなたが所有する一本一本を、記録する。</p></div>
    ${toast?`<div class="alert alert-success" role="status">${icon('check',17)} ${safe(toast)}</div>`:''}
    ${error?`<div class="alert alert-error" role="alert">${icon('alert',17)} ${safe(error)}</div>`:''}
    <section class="bag-overview">
      <div class="bag-text"><p class="bag-kicker">YOUR COLLECTION</p><span class="bag-count">${clubs.length}<small> CLUBS</small></span><h2>自分だけの、<br>クラブコレクション。</h2><p class="bag-helper">登録したすべてのクラブを管理。<br>登録したクラブをマイセットで組み合わせられます。</p></div>
      ${bagDrawing(clubs.length)}
    </section>
    <div class="club-add-actions"><button type="button" class="club-add-primary" data-club-action="new-single">${plus()} 単品を登録</button><button type="button" class="club-add-secondary" data-club-action="new-set">${icon('layers',17)} アイアンセットを登録</button></div>
    <section class="club-inventory-section" aria-label="登録済みクラブ">
      <div class="section-heading"><h2>CLUB LIBRARY</h2><span>あなたの所有クラブ</span></div>
      <div class="club-search"><span>${icon('search',19)}</span><input id="club-search" type="search" placeholder="メーカー・モデル・番手で検索" value="${safe(query)}" aria-label="所有クラブを検索" autocomplete="off"/></div>
      <div class="club-filter" role="group" aria-label="クラブの種類で絞り込み">
        ${[{value:'all',label:'すべて'},...CLUB_CATEGORIES].map(c=>`<button data-club-action="filter" data-category="${c.value}" type="button" class="filter-pill ${category===c.value?'selected':''}" aria-pressed="${category===c.value}">${safe(c.label)}</button>`).join('')}
      </div><div id="club-inventory" aria-live="polite">${clubInventory(clubs,query,category)}</div>
      <div class="source-clarity">${icon('info',17)}<span>検索対象は、この端末に登録したクラブです。メーカー横断の製品データベース検索は、利用許諾を確認できていないため未接続です。</span></div>
    </section>`;
}
export function clubFormPage({draft,mode,errors,busy,editing,selected,lofts}) {
  currentErrors=errors;
  const bulk=mode==='set';
  const d=draft;
  const input=(label,key,placeholder,opts={})=>textField({label,key,value:d[key],placeholder, ...opts});
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>MY EQUIPMENT</div><h1>${editing?'クラブを編集':bulk?'アイアンセット登録':'クラブを登録'}</h1><p>${editing?'登録情報を変更できます。ショット情報は削除されません。':bulk?'購入した番手だけを選び、一本ずつ独立登録します。':'メーカー・モデル・番手を入力して所有クラブを保存します。'}</p></div>
    <button type="button" class="club-back" data-club-action="cancel">${icon('back',17)} 所有クラブ一覧へ戻る</button>
    ${!editing?`<div class="club-mode-tabs" role="group" aria-label="登録方法">
      <button type="button" class="${!bulk?'selected':''}" data-club-action="mode-single" aria-pressed="${!bulk}">単品登録</button>
      <button type="button" class="${bulk?'selected':''}" data-club-action="mode-set" aria-pressed="${bulk}">アイアンセット</button>
    </div>`:''}
    <form id="club-form" class="profile-form" novalidate>
      <section class="form-card club-form-card"><div class="form-card-label"><span>01</span> ${bulk?'セットの共通情報':'クラブ情報'}</div>
      ${!bulk?`<div class="club-field"><label for="club-category">クラブの種類 <span class="required">必須</span></label>
        <select id="club-category" data-club-field="category"><option value="">選択してください</option>${CLUB_CATEGORIES.map(c=>`<option value="${c.value}" ${d.category===c.value?'selected':''}>${safe(c.label)}</option>`).join('')}</select>${fieldError(errors,'category')}</div>`:''}
      <div class="club-fields-grid">${input('メーカー','maker','例：PING',{required:true,limit:80})}${input('モデル名','model','例：G430',{required:true,limit:100})}</div>
      <div class="club-fields-grid">${input('発売年','releaseYear','例：2024',{type:'number',extra:'min="1900" max="2100" step="1"'})}${!bulk?input('番手・名称','number','例：7 / PW / 5W',{required:true,limit:24}):`<div class="club-field"><label>登録区分</label><div class="set-hint">構成番手は次の画面欄から選択</div></div>`}</div>
      ${!bulk?`<div class="club-fields-grid">${input('ロフト角（°）','loftDeg','例：30',{type:'number',extra:'min="0" max="90" step="0.1"'})}${input('シャフト','shaft','例：N.S.PRO 950GH',{limit:100})}</div>`:input('共通シャフト','shaft','例：N.S.PRO 950GH',{limit:100})}
      <div class="club-field"><label for="club-notes">メモ <span class="optional">任意</span></label><textarea id="club-notes" data-club-field="notes" rows="3" maxlength="350" placeholder="カスタム内容・購入時期・状態など">${safe(d.notes??'')}</textarea></div>
      </section>
      ${bulk?`<section class="form-card club-form-card"><div class="form-card-label"><span>02</span> 登録する番手 <small>複数選択</small></div>
        <p class="helper set-instruction">購入した番手だけにチェック。ロフト角は分かるものだけ入力してください（未計測は空欄）。</p>
        ${fieldError(errors,'selected')}
        <div class="number-grid">${IRON_NUMBERS.map(n=>`<label class="number-check ${selected.includes(n)?'checked':''}"><input type="checkbox" data-club-number="${safe(n)}" ${selected.includes(n)?'checked':''}/><span>${safe(n)}</span>${selected.includes(n)?icon('check',14):''}</label>`).join('')}</div>
        ${selected.length?`<div class="set-loft-list"><strong>選択番手のロフト角 <span>任意</span></strong>
          ${IRON_NUMBERS.filter(n=>selected.includes(n)).map(n=>`<div class="loft-row"><label for="loft-${n}">${n}</label><div><input id="loft-${n}" type="number" data-club-loft="${n}" min="0" max="90" step="0.1" inputmode="decimal" placeholder="—" value="${safe(lofts[n]??'')}"/><span>°</span></div>${fieldError(errors,`loft.${n}`)}</div>`).join('')}</div>`:''}
      </section>`:''}
      ${errors.general?`<div class="alert alert-error" role="alert">${icon('alert',18)} ${safe(errors.general)}</div>`:''}
      <button type="submit" class="save-button" ${busy?'disabled':''}>${icon('save',19)} ${busy?'保存中…':editing?'変更を保存':bulk?`${selected.length}本をまとめて登録`:'このクラブを登録'} ${icon('arrow',18)}</button>
      ${editing?`<button type="button" class="club-delete" data-club-action="delete">${icon('trash',17)} このクラブを削除</button>`:''}
      <p class="privacy-line">${icon('shield',17)} 保存は端末内のIndexedDBに行います。</p>
    </form>`;
}
