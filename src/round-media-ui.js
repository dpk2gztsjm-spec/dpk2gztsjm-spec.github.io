import {escapeHtml} from './domain.js';
import {icon} from './icons.js';
import {MAX_ROUND_PHOTOS,MAX_NOTE_LENGTH} from './round-media.js';
const em=escapeHtml;
/** Shared blocks rendered within the saved round-detail screen. */
export function roundMediaSections({photos,photoUrls,noteDraft,noteDirty,noteBusy,photoBusy,mediaError,noteError}){
  const picture=photos.length?`<div class="round-photo-grid">${photos.map((photo,i)=>`<article class="round-photo-tile"><img loading="lazy" alt="ラウンド写真 ${i+1}" src="${em(photoUrls.get(photo.id)||'')}"/><div class="round-photo-overlay"><span>${String(i+1).padStart(2,'0')}</span><div class="round-photo-buttons"><button type="button" data-round-action="photo-up" data-photo-id="${em(photo.id)}" aria-label="写真${i+1}を前へ" ${i===0||photoBusy?'disabled':''}>${icon('back',16)}</button><button type="button" data-round-action="photo-down" data-photo-id="${em(photo.id)}" aria-label="写真${i+1}を後ろへ" ${i===photos.length-1||photoBusy?'disabled':''}>${icon('arrow',16)}</button><button type="button" class="round-photo-delete" data-round-action="photo-delete" data-photo-id="${em(photo.id)}" aria-label="写真${i+1}を削除" ${photoBusy?'disabled':''}>${icon('trash',16)}</button></div></div></article>`).join('')}</div>`:
  `<div class="round-media-empty">${icon('calendar',24)}<strong>写真はまだありません</strong><small>コースの風景や当日の思い出を残せます。</small></div>`;
  return `<section class="section" id="round-photos"><div class="section-heading"><h2>ROUND PHOTOS</h2><span>${photos.length} / ${MAX_ROUND_PHOTOS} 枚</span></div>
  ${picture}
  <label class="round-photo-picker ${photoBusy?'is-busy':''}">${icon('plus',18)} ${photoBusy?'写真を変換・保存しています…':'写真を追加する'}<input id="round-photos-input" type="file" accept="image/*" multiple ${photoBusy||photos.length>=MAX_ROUND_PHOTOS?'disabled':''} aria-label="ラウンドに写真を追加"></label>
  <p class="round-footnote">最大${MAX_ROUND_PHOTOS}枚。1枚20MBまで。画像はリサイズして端末内に保存し、位置情報などのEXIFは削除します。矢印で順番を変更できます。</p>
  ${mediaError?`<p class="field-error" role="alert">${em(mediaError)}</p>`:''}</section>
  <section class="section" id="round-notes"><div class="section-heading"><h2>ROUND NOTES</h2><span>ラウンドメモ</span></div>
  <div class="round-notes-card"><label for="round-notes-text">プレーの振り返りや思い出を記録</label>
  <textarea id="round-notes-text" maxlength="${MAX_NOTE_LENGTH}" placeholder="例：後半はアプローチが安定。17番の景色がきれいだった。" ${noteBusy?'disabled':''}>${em(noteDraft)}</textarea>
  <div class="round-notes-footer"><span id="round-notes-count">${noteDraft.length} / ${MAX_NOTE_LENGTH}文字 ${noteDirty?'· 未保存':'· 保存済み'}</span><button type="button" class="round-secondary" data-round-action="save-notes" ${noteBusy||!noteDirty?'disabled':''}>${icon('save',16)} ${noteBusy?'保存中…':'メモを保存'}</button></div>
  ${noteError?`<p class="field-error" role="alert">${em(noteError)}</p>`:''}</div></section>
  <section class="section" aria-label="アルバム作成"><button type="button" class="round-album-launch" data-round-action="album">${icon('layers',22)}<span><strong>写真アルバムを作成</strong><small>JPEG 1440×2560px・A5 PDFに出力</small></span>${icon('arrow',18)}</button></section>`;
}
