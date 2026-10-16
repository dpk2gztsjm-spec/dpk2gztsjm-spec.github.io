import {escapeHtml as e} from './domain.js';
import {PALETTE,albumPhotoWarning,jpegIssue,albumPages} from './album.js';
import {icon} from './icons.js';
const opts=(choices,selected)=>choices.map(([value,label])=>`<option value="${e(value)}" ${selected===value?'selected':''}>${e(label)}</option>`).join('');
const check=(checked)=>checked?'checked':'';
export function albumPage({round,players,photos,photoUrls,preset,model,previewUrls=[],busy=false,status='',error='',shareWarning=false,presets=[],cropOpen=false}){
 if(!preset||!model)return '<p>アルバム設定が見つかりません。</p>';
 const companions=players.filter(p=>!p.isSelf),issue=jpegIssue(model),photoWarning=albumPhotoWarning(model),pdfPageCount=albumPages(model).length;
 const coverPhoto=preset.coverType==='photo';
 return `<div class="album-app">
 <button type="button" class="club-back" data-album-action="back">${icon('back',17)} ラウンド詳細へ戻る</button>
 <header class="album-heading"><div class="album-eyebrow">GOLF JOURNAL / ALBUM STUDIO</div><h1>写真アルバム</h1><p>${e(round.courseSnapshot.name)} · ${e(round.playedOn)}</p></header>
 ${status?`<p class="album-notice" role="status">${e(status)}</p>`:''}${error?`<p class="field-error" role="alert">${e(error)}</p>`:''}
 <div class="album-stage">
 <section class="album-step"><div class="album-step-header"><span class="album-num">01</span><div><h2>同伴者の表示</h2><p>名前・スコアを一人ずつ公開設定</p></div></div>
 <div class="album-row"><label>まとめの表示方法<select data-album-field="companionLayout">${opts([['table','表形式'],['cards','カード形式']],preset.companionLayout)}</select></label></div>
 ${companions.length?companions.map((p,i)=>{const c=preset.companions[p.id]||{};return `<div class="album-person"><strong>${e(p.name)}</strong><small>PLAYER ${i+2}</small><label class="album-check"><input type="checkbox" data-album-companion="${e(p.id)}" data-part="nameVisible" ${check(c.nameVisible)} /> 名前を掲載する</label><label>スコアの公開範囲<select data-album-companion="${e(p.id)}" data-part="scoreLevel">${opts([['none','非表示'],['total','TOTALのみ'],['segments','OUT・IN・TOTAL'],['holes','ホール別詳細']],c.scoreLevel)}</select></label></div>`}).join(''):'<div class="album-muted">同伴者の登録はありません。</div>'}
 <p class="album-hint">SNS向け初期設定では同伴者は非表示。名前を非公開にしてスコアだけ掲載すると GUEST 表記になります。</p></section>
 <section class="album-step"><div class="album-step-header"><span class="album-num">02</span><div><h2>写真配置とカバー</h2><p>カバーも含めて写真3〜5枚を基本に</p></div></div>
 <div class="album-row"><label>写真配置<select data-album-field="layout">${opts([['gallery','ギャラリー型'],['mosaic','モザイク型']],preset.layout)}</select></label><label>カバー<select data-album-field="coverType">${opts([['photo','写真'],['color','単色']],preset.coverType)}</select></label></div>
 ${!coverPhoto?`<div class="album-palette" role="group" aria-label="カバーの背景色">${Object.entries(PALETTE).map(([k,c])=>`<button type="button" data-album-action="color" data-value="${e(k)}" aria-label="${e(k)}" aria-pressed="${preset.color===k}" class="${preset.color===k?'selected':''}" style="--album-color:${c}"></button>`).join('')}</div>`:''}
 <div class="album-row"><label>カバーのスコア位置<select data-album-field="coverScorePosition">${opts([['center','中央'],['left','左下'],['right','右下']],preset.coverScorePosition)}</select></label>
 ${coverPhoto?`<label>カバー写真<select data-album-field="coverPhotoId">${opts(preset.photoIds.map((id,i)=>[id,`写真 ${photos.findIndex(p=>p.id===id)+1} · 選択 ${i+1}`]),preset.coverPhotoId)}</select></label>`:''}</div>
 <div class="album-photo-list">${photos.map((photo,i)=>{const selected=preset.photoIds.includes(photo.id),index=preset.photoIds.indexOf(photo.id),crop=preset.crops?.[photo.id]||{};return `<div class="album-photo-item"><label><input type="checkbox" data-album-photo="${e(photo.id)}" ${check(selected)}/><img src="${e(photoUrls.get(photo.id)||'')}" alt="ラウンド写真 ${i+1}" loading="lazy"/><span>写真 ${i+1} ${selected?'・使用中':''}</span></label>${selected?`<div class="album-photo-actions"><button type="button" data-album-action="photo-up" data-id="${e(photo.id)}" ${index===0?'disabled':''} aria-label="写真${i+1}を前に移動">↑</button><button type="button" data-album-action="photo-down" data-id="${e(photo.id)}" ${index===preset.photoIds.length-1?'disabled':''} aria-label="写真${i+1}を後ろへ移動">↓</button></div>`:''}</div>`;}).join('')}</div>
 ${photos.length===0?'<p class="album-hint">ラウンド詳細画面で写真を登録できます。単色カバーだけでも出力できます。</p>':''}
 ${photoWarning?`<p class="album-hint">${e(photoWarning)}</p>`:''}
 ${preset.photoIds.length?`<details class="album-crop-controls" ${cropOpen?'open':''}><summary>写真のトリミング調整</summary><p class="album-hint">拡大率・左右・上下の注視位置を調整できます。</p>${preset.photoIds.map((id,i)=>{const c=preset.crops?.[id]||{x:.5,y:.5,zoom:1};return `<div class="album-crop-item"><strong>写真 ${i+1}</strong><label>拡大 <input type="range" min="1" max="2" step="0.1" data-album-crop="${e(id)}" data-axis="zoom" value="${c.zoom??1}"/></label><label>左右 <input type="range" min="0" max="1" step="0.05" data-album-crop="${e(id)}" data-axis="x" value="${c.x??.5}"/></label><label>上下 <input type="range" min="0" max="1" step="0.05" data-album-crop="${e(id)}" data-axis="y" value="${c.y??.5}"/></label></div>`}).join('')}</details>`:''}</section>
 <section class="album-step"><div class="album-step-header"><span class="album-num">03</span><div><h2>スコアカードの向き</h2><p>ファイルではなく、スコア表の内部配置</p></div></div><div class="album-row"><label>配置<select data-album-field="scoreDirection">${opts([['horizontal','横（OUT・INを並べる）'],['vertical','縦（OUT・INを上下に）']],preset.scoreDirection)}</select></label></div></section>
 <section class="album-step"><div class="album-step-header"><span class="album-num">04</span><div><h2>スコアの情報量</h2><p>簡易または18ホール詳細</p></div></div><div class="album-row"><label>情報量<select data-album-field="detailLevel">${opts([['simple','簡易・総スコア中心'],['detailed','詳細・ホール別']],preset.detailLevel)}</select></label><label>出力形式<select data-album-field="format">${opts([['jpeg','JPEG · 1440×2560px'],['pdf','PDF · A5縦']],preset.format)}</select></label></div><p class="album-hint">PDFは情報量に応じて${pdfPageCount}ページで出力。両形式ともプレビューと同じ描画処理を使います。</p></section>
 </div>
 <section class="album-preview-section"><div class="section-heading"><h2>LIVE PREVIEW</h2><span>${preset.format==='pdf'?'A5 / PDF':'9:16 / JPEG'}</span></div>
 ${issue&&preset.format==='jpeg'?`<p class="album-problem" role="alert">${e(issue)}</p>`:''}
 <div id="album-previews" class="album-previews">${previewUrls.length?previewUrls.map((url,i)=>`<figure><img src="${e(url)}" alt="アルバム ${i+1}ページのプレビュー"/><figcaption>${i+1} / ${previewUrls.length}</figcaption></figure>`).join(''):'<div class="album-loading">プレビューを生成しています…</div>'}</div>
 <div class="album-export-actions"><button type="button" data-album-action="download" ${busy||(issue&&preset.format==='jpeg')?'disabled':''}>${icon('download',17)} ダウンロード</button><button type="button" data-album-action="share" ${busy||(issue&&preset.format==='jpeg')?'disabled':''}>${icon('share',17)} 共有</button></div>
 ${shareWarning?`<div class="album-sharing-warning" role="alertdialog" aria-labelledby="album-warning-title"><h3 id="album-warning-title">共有前に確認してください</h3><p>写真に写る人物のプライバシー、同伴者名・スコアの公開範囲、第三者による保存・再共有の可能性があります。関係者の同意を確認してください。</p><div class="album-warning-buttons"><button type="button" data-album-action="cancel-share">キャンセル</button><button type="button" data-album-action="confirm-share">OK</button></div></div>`:''}
 <p class="album-hint">非表示にした同伴者情報は、出力用モデルへ取り込まず、JPEG・PDFの文字レイヤーやメタデータにも含めません。</p>
 <div class="album-save-preset"><button type="button" data-album-action="save">${icon('save',16)} 現在の設定を保存</button><button type="button" data-album-action="new">別のアルバムを作る</button></div>
 ${presets.length?`<div class="album-saved"><strong>保存したアルバム設定</strong>${presets.map((p,i)=>`<div><button type="button" data-album-action="load" data-id="${e(p.id)}">設定 ${i+1} · ${e(p.updatedAt?.slice(0,10)||'')}</button><button type="button" data-album-action="delete" data-id="${e(p.id)}" aria-label="設定${i+1}を削除">削除</button></div>`).join('')}</div>`:''}
 </section></div>`;
}
