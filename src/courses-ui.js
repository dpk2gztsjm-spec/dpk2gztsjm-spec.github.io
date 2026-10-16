import {escapeHtml} from './domain.js';
import {icon} from './icons.js';
import {PREFECTURES, parTotals, searchCourses, teeTotals} from './courses.js';
const s=escapeHtml;
const err=(errors,k)=>errors?.[k]?`<p class="field-error" role="alert">${s(errors[k])}</p>`:'';
const coursePageTop=(eyebrow,title,description='')=>`<div class="page-top courses-heading"><div class="eyebrow"><span class="eyebrow-rule"></span>${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>`;
const notice=(toast,error)=>`${toast?`<div class="alert alert-success" role="status">${icon('check',17)}<span>${s(toast)}</span></div>`:''}${error?`<div class="alert alert-error" role="alert">${icon('alert',17)}<span>${s(error)}</span></div>`:''}`;
function photo(course,photos,extra='') {
  const url=photos.get(course.id);
  return url?`<img class="course-photo ${extra}" src="${s(url)}" alt="${s(course.name)}の登録写真" loading="lazy">`:
    `<div class="course-photo-placeholder ${extra}" aria-label="写真未登録"><div class="course-placeholder-rings"></div><div class="course-photo-flag">${icon('flag',32)}</div><small>PHOTO NOT REGISTERED</small></div>`;
}
export function coursesPage({courses,query,prefecture,toast,error,photos}){
  const found=searchCourses(courses,query,prefecture);
  return `${coursePageTop('COURSE LIBRARY','コースを探す','登録した日本国内のゴルフ場を、検索・編集できます。')}
  ${notice(toast,error)}
  <section class="course-summary-hero"><div><span class="course-subtitle">MY COURSE LIBRARY</span><strong>${courses.length.toLocaleString('ja-JP')}<small> COURSES</small></strong><p>お気に入りのコースを、<br>自分だけの記録に。</p></div><div class="course-hero-art" aria-hidden="true">${icon('flag',46)}</div></section>
  <button type="button" class="course-add" data-course-action="new">${icon('plus',19)} ゴルフ場を手動登録</button>
  <section class="course-search-tools" aria-label="登録済みゴルフ場検索">
    <label for="course-search">登録済みコースを検索</label>
    <div class="club-search">${icon('search',19)}<input id="course-search" type="search" value="${s(query)}" placeholder="コース名・地名で検索" maxlength="120" autocomplete="off"></div>
    <label class="course-prefecture-filter">都道府県 <select id="course-prefecture-filter"><option value="all">すべての都道府県</option>${PREFECTURES.map(x=>`<option value="${x}" ${x===prefecture?'selected':''}>${x}</option>`).join('')}</select></label>
  </section>
  <div class="section-heading course-results-title"><h2>SAVED COURSES</h2><span id="course-results-count">${found.length} / ${courses.length} 件</span></div>
  <div id="course-results">${courseResults(found,photos,!!query||prefecture!=='all')}</div>
  <div class="source-clarity">${icon('info',18)}<span>ここでの検索は<strong>端末に登録済みのゴルフ場のみ</strong>が対象です。全国コース検索は許諾済みデータAPI未接続のため、まだ利用できません。表示内容は利用者が入力した情報であり、公式確認済みデータではありません。</span></div>
  <footer class="page-footer">GOLF JOURNAL <span>V0.6.0 · COURSES</span></footer>`;
}
export function courseResults(found,photos,searching=false) {
  if(!found.length)return `<div class="course-empty">${icon('search',28)}<h2>${searching?'一致するコースがありません':'最初のコースを登録しましょう'}</h2><p>${searching?'検索語や都道府県を変えてください。':'ホールごとのPARと、ティー別ヤード数を記録できます。全国データの自動取得は未実装です。'}</p>${searching?'':`<button class="mini-cta" data-course-action="new" type="button">${icon('plus',17)} コースを登録</button>`}</div>`;
  return `<div class="course-list">${found.map(course=>{
    const pars=parTotals(course);
    return `<article class="course-list-card">
      <button type="button" class="course-card-main" data-course-action="detail" data-course-id="${s(course.id)}" aria-label="${s(course.name)}の詳細を見る">
        <div class="course-card-photo">${photo(course,photos)}</div><div class="course-card-data"><div class="course-card-region">${s(course.prefecture||'所在地未設定')} · ${course.holeCount} HOLES</div><h3>${s(course.name)}</h3><div class="course-card-stats"><span>PAR <b>${pars.total??'—'}</b></span><span>${course.tees.length} TEE${course.tees.length===1?'':'S'}</span></div><div class="course-card-cta">コースを見る ${icon('arrow',15)}</div></div>
      </button>
    </article>`;}).join('')}</div>`;
}
export function courseDetailPage({course,teeId,photos,toast,error}) {
  const pt=parTotals(course),selected=course.tees.find(t=>t.id===teeId)||course.tees[0];
  const totals=teeTotals(course,selected?.id);
  const named=course.holeCount===9?[s(course.layout||'9ホール')]:['OUT','IN'];
  return `<button class="club-back" data-course-action="back" type="button">${icon('back',17)} コース一覧へ</button>
    ${notice(toast,error)}<div class="course-detail-cover">${photo(course,photos,'detail-cover')}<span class="course-cover-chip">USER REGISTERED</span></div>
    <div class="course-detail-heading"><span class="course-detail-region">${s(course.prefecture)} / ${course.holeCount} HOLES</span><h1>${s(course.name)}</h1>${course.address?`<p>${s(course.address)}</p>`:''}</div>
    <div class="course-stat-grid"><div><small>PAR TOTAL</small><strong>${pt.total??'—'}</strong></div><div><small>HOLES</small><strong>${course.holeCount}</strong></div><div><small>TEES</small><strong>${course.tees.length}</strong></div></div>
    <div class="course-action-row"><button type="button" data-course-action="edit" class="course-edit-primary">${icon('edit',17)} コースを編集</button><button type="button" data-course-action="delete" class="course-delete-minor">${icon('trash',17)} 削除</button></div>
    <section class="section course-score-section"><div class="section-heading"><h2>HOLE GUIDE</h2><span>ホール別情報</span></div>
       <label class="course-detail-tee-select" for="course-detail-tee">使用ティー<select id="course-detail-tee">${course.tees.map(t=>`<option value="${s(t.id)}" ${selected?.id===t.id?'selected':''}>${s(t.name)}</option>`).join('')}</select></label>
       <div class="course-hole-view" role="table" aria-label="コースのホール別PARと距離">
         <div class="course-hole-view-header" role="row"><span>HOLE</span><span>PAR</span><span>YARD</span></div>
         ${course.holes.map((hole,index)=>`${index>0&&index%9===0?`<div class="course-nine-break">${named[0]} <span>PAR ${pt.first??'—'} · ${totals.sections[0].yards??'—'}yd</span></div>`:''}<div class="course-hole-view-row" role="row"><strong>H${String(hole.number).padStart(2,'0')}</strong><span>${s(hole.par??'—')}</span><b>${selected?.distances?.[hole.number]??'—'}</b></div>`).join('')}
         <div class="course-hole-total"><strong>TOTAL</strong><span>PAR ${pt.total??'—'}</span><b>${totals.total.yards!==null?`${totals.total.yards} yd`:`${totals.total.known} / ${totals.total.holes}ホール入力`}</b></div>
       </div>
       <p class="course-distance-note">距離は選択したティーのヤード数。未入力は「—」で表示し、合計距離に混ぜません。${course.holeCount===18?`OUT PAR ${pt.first??'—'} / IN PAR ${pt.second??'—'}`:''}</p>
    </section>
    ${course.description?`<section class="section course-detail-description"><div class="section-heading"><h2>COURSE NOTES</h2><span>コースの特徴</span></div><p>${s(course.description)}</p></section>`:''}
    <section class="section"><div class="section-heading"><h2>SOURCE</h2><span>登録情報</span></div><div class="course-provenance"><p>情報種別：手動登録（公式検証は未実施）</p><p>最終更新：${s(course.updatedAt?new Date(course.updatedAt).toLocaleDateString('ja-JP'):'—')}</p>${course.officialUrl?`<a href="${s(course.officialUrl)}" target="_blank" rel="noopener noreferrer">登録された公式サイトのURLを開く ${icon('arrow',15)}</a>`:''}</div></section>
    <button class="course-record-soon course-record-active" type="button" data-course-action="start-round">このコースでスコアを記録 ${icon('arrow',17)}</button>
    <p class="course-distance-note">現在選択中のティーを使用します。登録済みのPARと距離は当日の情報として保存されます。</p>`;
}
const field=(name,key,value,errors,{placeholder='',required=false,type='text',max=200}={})=>`<div class="club-field"><label for="course-${key}">${name} <span class="${required?'required':'optional'}">${required?'必須':'任意'}</span></label><input id="course-${key}" data-course-field="${key}" type="${type}" ${type==='number'?'inputmode="numeric"':''} maxlength="${max}" value="${s(value??'')}" placeholder="${s(placeholder)}" autocomplete="off">${err(errors,key)}</div>`;
export function courseFormPage({draft,errors,busy,editing,toast,error,photos,selectedPhotoUrl}) {
  const pars=draft.holes||[];
  const cover=selectedPhotoUrl||photos.get(draft.id);
  return `<button class="club-back" data-course-action="cancel" type="button">${icon('back',17)} ${editing?'詳細画面':'コース一覧'}へ戻る</button>
    ${coursePageTop('REGISTER A COURSE',editing?'コースを編集':'コースを登録','ゴルフ場名、各ホールのPAR、ティー別の距離を記録します。')}
    ${notice(toast,error)}
    <form id="course-form" novalidate class="profile-form">
      <section class="form-card course-form-card"><div class="form-card-label"><span>01</span> 基本情報</div>
        ${field('ゴルフ場名','name',draft.name,errors,{required:true,placeholder:'例：○○カントリークラブ',max:120})}
        <div class="club-field"><label for="course-prefecture">都道府県 <span class="required">必須</span></label><select id="course-prefecture" data-course-field="prefecture"><option value="">都道府県を選択</option>${PREFECTURES.map(v=>`<option value="${v}" ${draft.prefecture===v?'selected':''}>${v}</option>`).join('')}</select>${err(errors,'prefecture')}</div>
        ${field('住所・市区町村','address',draft.address,errors,{placeholder:'例：茨城県○○市…',max:250})}
        ${field('公式サイトURL','officialUrl',draft.officialUrl,errors,{placeholder:'https://...',max:500})}
        <div class="club-field"><label for="course-description">コースの特徴・メモ <span class="optional">任意</span></label><textarea rows="4" id="course-description" data-course-field="description" maxlength="1500" placeholder="コースの特徴、攻略のポイントなど">${s(draft.description)}</textarea></div>
        <div class="club-field"><label for="course-photo-input">クラブハウスなどの写真 <span class="optional">任意・自分の写真のみ</span></label><div class="course-photo-picker">${cover?`<img src="${s(cover)}" alt="登録予定のコース写真">`:`<div class="course-photo-picker-empty">${icon('flag',26)}<span>写真未登録</span></div>`}<input type="file" id="course-photo-input" data-course-photo accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" ${busy?'disabled':''}></div><p class="helper">自分で撮影した写真、または掲載の許可を得た写真だけを選択してください。保存時に縮小・JPEG再エンコードして位置情報を削除します（画像最大15MB）。</p><button type="button" class="course-photo-remove" data-course-action="remove-photo" ${!cover?'disabled':''}>写真を解除</button></div>
      </section>
      <section class="form-card course-form-card"><div class="form-card-label"><span>02</span> コース構成</div>
        <div class="course-layout-control"><div class="club-field"><label for="course-hole-count">ホール数</label><select id="course-hole-count" data-course-structure="holeCount"><option value="18" ${draft.holeCount===18?'selected':''}>18ホール</option><option value="9" ${draft.holeCount===9?'selected':''}>9ホール</option></select></div>
        ${draft.holeCount===9?`<div class="club-field"><label for="course-start-hole">ホール番号</label><select id="course-start-hole" data-course-structure="startHole"><option value="1" ${draft.startHole===1?'selected':''}>1〜9</option><option value="10" ${draft.startHole===10?'selected':''}>10〜18</option></select></div>`:''}</div>
        ${draft.holeCount===9?field('コース区分（例：OUT／IN）','layout',draft.layout,errors,{placeholder:'例：IN',max:40}):'<p class="course-inline-hint">18ホールは1〜9をOUT、10〜18をINとして管理します。</p>'}
        <p class="course-inline-hint">ホール数を変えると、該当しないホールの編集中データは表示対象外になります。保存済みのデータは、保存するまでは変更されません。</p>
      </section>
      <section class="form-card course-form-card"><div class="form-card-label"><span>03</span> 使用ティー <small>${draft.tees.length}種類</small></div>
        <p class="course-inline-hint">例えばレギュラー（白）、バック（青）、レディース（赤）。距離が不明な欄は空欄のまま保存できます。</p>
        ${draft.tees.map((t,i)=>`<div class="course-tee-editor"><div class="club-field"><label for="course-tee-${s(t.id)}">TEE ${String(i+1).padStart(2,'0')}</label><input id="course-tee-${s(t.id)}" data-course-tee-name="${s(t.id)}" value="${s(t.name)}" maxlength="40" placeholder="ティー名">${err(errors,`tee.${t.id}`)}</div><button type="button" data-course-action="remove-tee" data-tee-id="${s(t.id)}" ${draft.tees.length===1?'disabled':''} aria-label="${s(t.name)}を削除">${icon('trash',17)}</button></div>`).join('')}
        ${err(errors,'tees')}<button type="button" class="course-add-tee" data-course-action="add-tee">${icon('plus',16)} ティーを追加</button>
      </section>
      <section class="form-card course-form-card"><div class="form-card-label"><span>04</span> ホール別 PAR・ヤード</div>
        <p class="course-inline-hint">PARは各ホール必須。距離はティーごとに任意です。分からないヤード数を自動補完しません。</p>
        ${err(errors,'holes')}
        <div class="course-hole-edit-list">${pars.map((h,i)=>`<div class="course-hole-editor">${i>0&&i%9===0?`<div class="course-hole-divider">IN COURSE</div>`:''}<div class="course-hole-editor-top"><span class="course-hole-number">H${String(h.number).padStart(2,'0')}</span><label for="course-par-${h.number}">PAR</label><select id="course-par-${h.number}" data-course-par="${h.number}"><option value="">未入力</option>${[3,4,5,6].map(p=>`<option value="${p}" ${h.par!==null&&String(h.par)===String(p)?'selected':''}>${p}</option>`).join('')}</select></div>${err(errors,`par.${h.number}`)}
          <div class="course-hole-yard-grid">${draft.tees.map(t=>`<label>${s(t.name||'TEE')} <span>yd</span><input type="number" data-course-yard="${h.number}" data-tee-id="${s(t.id)}" inputmode="numeric" min="1" max="1500" step="1" placeholder="—" value="${s(t.distances?.[h.number]??'')}">${err(errors,`yard.${t.id}.${h.number}`)}</label>`).join('')}</div>
        </div>`).join('')}</div>
      </section>
      ${err(errors,'general')}
      <div class="form-actions"><button class="save-button" type="submit" ${busy?'disabled':''}>${icon('save',19)} ${busy?'保存しています…':editing?'変更を保存':'コースを保存'} ${icon('arrow',18)}</button><button class="cancel-button" type="button" data-course-action="cancel">保存せずに戻る</button></div>
      <p class="privacy-line">${icon('shield',17)} コースと写真は、現在この端末内だけに保存されます。</p>
    </form>`;
}
