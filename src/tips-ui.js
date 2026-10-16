import {escapeHtml} from './domain.js';
import {TIP_ARTICLES,TIP_CATEGORIES,tipCategory,tipArticle,tipArticleSources,searchTipArticles} from './tips-data.js';
import {tipDiagram} from './tips-diagrams.js';

const tipSafe=x=>escapeHtml(x);
export function tipCards(items){
  return items.length?items.map(a=>`<button class="tip-article-card" type="button" data-tip-action="open" data-tip-id="${a.id}">
   <span class="tip-article-meta">${tipSafe(tipCategory(a.category).name)} <span aria-hidden="true">/</span> ${String(a.sections.length).padStart(2,'0')} TOPICS</span>
   <span class="tip-article-title">${tipSafe(a.title)}</span><span class="tip-article-sub">${tipSafe(a.subtitle)}</span>
   <span class="tip-article-arrow" aria-hidden="true">↗</span></button>`).join(''):
    `<p class="tip-none" role="status">該当する記事はありません。別の言葉で検索してください。</p>`;
}
export function tipIndexPage({query='',category='all'}={}){
 const items=searchTipArticles(query,category);
 return `<div class="tips-index">
  <div class="tips-kicker">THE GOLF DICTIONARY <span>VOL. 01 — 09</span></div>
  <div class="tips-index-title"><h1>Tips<span>.</span></h1><p>気になる技術を、<br>必要なときに調べる。</p></div>
  <div class="tip-feature"><span>THE GUIDE</span><h2>知ることが、<br>次の一打を変える。</h2><p>グリップからルールまで。9カテゴリの自由に引けるゴルフ辞典。</p><div class="tip-feature-deco" aria-hidden="true">↗</div></div>
  <div class="tip-search-field"><span aria-hidden="true">⌕</span><label class="visually-hidden" for="tip-search">記事を検索</label><input id="tip-search" type="search" placeholder="記事・技術・用語で検索" autocomplete="off" value="${tipSafe(query)}"/><button type="button" class="tip-toc-index" data-tip-action="toc" aria-label="辞典の目次を開く">☷ <span>目次</span></button></div>
  <div class="tip-section-line"><h2>9 CATEGORIES</h2><span>${TIP_CATEGORIES.length} 種類</span></div>
  <div class="tip-category-grid">${TIP_CATEGORIES.map(c=>`<button type="button" class="tip-category-tile ${category===c.id?'is-active':''}" data-tip-action="category" data-tip-category="${c.id}" aria-pressed="${category===c.id}"><span class="tip-category-number">${c.number} / ${c.en}</span><strong>${tipSafe(c.name)}</strong><span>${tipSafe(c.desc)}</span></button>`).join('')}</div>
  <div class="tip-section-line tip-search-result-title"><h2>${category==='all'?'ALL ARTICLES':tipSafe(tipCategory(category)?.name??'')}</h2><button class="tip-clear-filter" data-tip-action="reset" type="button">すべて見る ↗</button></div>
  <div class="tip-count" id="tip-count">${items.length} / ${TIP_ARTICLES.length} 記事</div>
  <div class="tip-articles" id="tip-results">${tipCards(items)}</div>
  <p class="tip-index-footer">記事は独自解説・模式図です。個々の身体・ライ・競技規則に合わせて判断してください。</p>
 </div>`;
}
export function tipArticlePage({article,handedness='right'}={}){
 if(!article)return tipIndexPage();
 const c=tipCategory(article.category);
 const refs=tipArticleSources(article);
 return `<div class="tips-article">
   <div class="tip-article-toolbar"><button type="button" data-tip-action="back" class="tip-back">← 記事一覧</button><span>${tipSafe(c.name)} <span class="tip-toolbar-divider">/</span> Tips</span></div>
   <div class="tip-article-cover"><span>${tipSafe(c.en)} <span>／</span> GOLF JOURNAL</span><h1>${tipSafe(article.title)}</h1><p>${tipSafe(article.subtitle)}</p></div>
   <p class="tip-article-intro">${tipSafe(article.summary)}</p>
   <div class="tip-hero-diagram"><button type="button" class="tip-diagram-button" data-tip-action="zoom" data-tip-diagram="${article.diagram}" aria-label="冒頭の図解を拡大する">${tipDiagram(article.diagram,handedness)}<span class="tip-zoom-hint">↗ 拡大</span></button><p>Fig. 01 · ${tipSafe(article.title)}／独自模式図（実寸ではありません）</p></div>
   <div class="tip-hand-controls"><span>図解の向き</span><div role="group" aria-label="図解の打ち手"><button type="button" data-tip-action="hand" data-tip-hand="right" aria-pressed="${handedness==='right'}" class="${handedness==='right'?'on':''}">右打ち</button><button type="button" data-tip-action="hand" data-tip-hand="left" aria-pressed="${handedness==='left'}" class="${handedness==='left'?'on':''}">左打ち</button></div></div>
   <div class="tip-article-contents"><span>IN THIS ARTICLE</span>${article.sections.map((s,i)=>`<button type="button" data-tip-action="jump" data-tip-section="${s.id}"><b>${String(i+1).padStart(2,'0')}</b>${tipSafe(s.title)}<span>↗</span></button>`).join('')}</div>
   ${article.sections.map((s,i)=>`<section class="tip-body-section" id="tip-sec-${s.id}" aria-labelledby="tip-head-${s.id}"><div class="tip-body-seq">${String(i+1).padStart(2,'0')} <i></i></div><h2 id="tip-head-${s.id}" tabindex="-1">${tipSafe(s.title)}</h2><p class="tip-section-lead">${tipSafe(s.summary)}</p><p class="tip-section-copy">${tipSafe(s.details)}</p>
   <div class="tip-section-figure"><button type="button" class="tip-diagram-button" data-tip-action="zoom" data-tip-diagram="${s.diagram}" aria-label="${tipSafe(s.title)}の図解を拡大する">${tipDiagram(s.diagram,handedness,'small')}<span class="tip-zoom-hint">↗ 拡大</span></button><p>Fig. ${String(i+2).padStart(2,'0')} · ${tipSafe(s.title)} ／ 概念図</p></div>
   <div class="tip-practice"><span>TRY THIS · 実践ドリル</span><p>${tipSafe(s.drill)}</p></div>${s.caution?`<div class="tip-caution">注意：${tipSafe(s.caution)}</div>`:''}</section>`).join('')}
   <section class="tip-article-references"><h2>参考資料・更新履歴</h2><p>最終編集：${tipSafe(article.updated)} ／ 基礎解説は一般例。公式規則は変更・詳説があるため原文を確認してください。</p><ul>${refs.map(ref=>`<li>${ref.url?`<a href="${tipSafe(ref.url)}" target="_blank" rel="noopener noreferrer">${tipSafe(ref.label)} ↗</a>`:tipSafe(ref.label)}</li>`).join('')}</ul></section>
   <section class="tip-related"><h2>RELATED ARTICLES</h2>${article.related.map(id=>tipArticle(id)).filter(Boolean).map(r=>`<button type="button" data-tip-action="open" data-tip-id="${r.id}"><span>${tipSafe(tipCategory(r.category).name)}</span><b>${tipSafe(r.title)}</b><span>↗</span></button>`).join('')}</section>
   <a href="#strategy" class="tip-strategy-link"><span>練習で確かめる</span><b>攻略シミュレーターへ ↗</b><small>第9〜10段階で連携予定。現在は開発予告画面です。</small></a>
   <button type="button" data-tip-action="back" class="tip-back-bottom">← 辞典へ戻る</button>
  </div><button type="button" class="tip-floating-toc" data-tip-action="toc" aria-label="全画面目次を開く"><span>☷</span> 目次</button>`;
}
export function tipTocTree({article=null,expanded='short',query=''}={}){
 const q=String(query).trim();
 const categories=q?TIP_CATEGORIES.filter(c=>searchTipArticles(q,c.id).length):TIP_CATEGORIES;
 return categories.length?categories.map(c=>{
  const matches=searchTipArticles(q,c.id);
  const opened=Boolean(q)||expanded===c.id;
  return `<section class="tip-toc-category"><button data-tip-action="expand" type="button" data-tip-category="${c.id}" aria-expanded="${opened}" class="tip-toc-category-button"><span class="tip-toc-cat-num">${c.number}</span><strong>${tipSafe(c.name)}</strong><span class="tip-toc-cat-count">${matches.length}</span><span>${opened?'−':'＋'}</span></button>${opened?`<div class="tip-toc-category-articles">${matches.map(a=>`<button type="button" data-tip-action="open" data-tip-id="${a.id}" ${article?.id===a.id?'aria-current="page"':''}><span>${tipSafe(a.title)}</span><span>↗</span></button>`).join('')}</div>`:''}</section>`;
 }).join(''):'<p class="tip-none">該当する記事がありません。</p>';
}
export function tipOverlay({article=null,tab='all',expanded='short',query='',zoom=null,handedness='right'}={}){
 if(zoom){
 return `<div class="tips-layer tips-zoom-layer" role="dialog" aria-modal="true" aria-label="図解の拡大表示"><div class="tip-zoom-panel"><div class="tip-toc-top"><strong>FIGURE / ${tipSafe(handedness==='left'?'LEFT':'RIGHT')} HANDED</strong><button type="button" class="tip-toc-close" data-tip-action="close-zoom" aria-label="拡大表示を閉じる">✕</button></div><div class="tip-zoom-image">${tipDiagram(zoom,handedness)}</div><p>独自制作の模式図です。縮尺・角度・飛距離は実際の値を示しません。</p><div class="tip-zoom-switch"><button data-tip-action="hand" data-tip-hand="right" aria-pressed="${handedness==='right'}" type="button">右打ち</button><button data-tip-action="hand" data-tip-hand="left" aria-pressed="${handedness==='left'}" type="button">左打ち</button></div></div></div>`;
 }
 return `<div class="tips-layer" role="dialog" aria-modal="true" aria-labelledby="tips-toc-title"><div class="tip-toc-panel"><div class="tip-toc-top"><div><span>GOLF JOURNAL / INDEX</span><h2 id="tips-toc-title">目次<span>.</span></h2></div><button type="button" data-tip-action="close-toc" class="tip-toc-close" aria-label="目次を閉じる">✕</button></div>
 <div class="tip-toc-tabs" role="group" aria-label="目次の範囲"><button type="button" data-tip-action="tab" data-tip-tab="all" aria-pressed="${tab==='all'}" class="${tab==='all'?'on':''}">辞典全体</button><button type="button" data-tip-action="tab" data-tip-tab="article" aria-pressed="${tab==='article'}" ${!article?'disabled':''} class="${tab==='article'?'on':''}">この記事</button></div>
 ${tab==='article' && article ? `<div class="tip-toc-scroll"><p class="tip-toc-article-title">${tipSafe(article.title)}</p><div class="tip-toc-anchors">${article.sections.map((s,i)=>`<button type="button" data-tip-action="jump" data-tip-section="${s.id}"><b>${String(i+1).padStart(2,'0')}</b>${tipSafe(s.title)} <span>↗</span></button>`).join('')}</div></div>`:
 `<label class="tip-toc-search">⌕ <input type="search" id="tip-toc-search" placeholder="記事を検索" value="${tipSafe(query)}" autocomplete="off"/></label><div class="tip-toc-scroll" id="tip-toc-tree">${tipTocTree({article,expanded,query})}</div>`}
 <div class="tip-toc-footer">全9カテゴリ · ${TIP_ARTICLES.length}記事 ／ オフライン閲覧対応</div></div></div>`;
}
