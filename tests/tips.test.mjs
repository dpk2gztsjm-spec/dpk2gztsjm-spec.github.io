import test from 'node:test';
import assert from 'node:assert/strict';
import {TIP_CATEGORIES,TIP_ARTICLES,TIP_SOURCES,tipArticle,tipCategory,tipArticleSection,searchTipArticles,tipArticleSources} from '../src/tips-data.js';
import {tipDiagram,TIP_DIAGRAM_TYPES} from '../src/tips-diagrams.js';
import {tipIndexPage,tipArticlePage,tipOverlay,tipCards,tipTocTree} from '../src/tips-ui.js';

test('exactly 9 nonempty categories with unique ids',()=>{
 assert.equal(TIP_CATEGORIES.length,9);
 assert.equal(new Set(TIP_CATEGORIES.map(c=>c.id)).size,9);
 for(const cat of TIP_CATEGORIES)assert.ok(TIP_ARTICLES.filter(a=>a.category===cat.id).length>=2,cat.id);
});
test('23 articles are unique and have drill + detailed section figures',()=>{
 assert.equal(TIP_ARTICLES.length,23);
 assert.equal(new Set(TIP_ARTICLES.map(a=>a.id)).size,23);
 for(const a of TIP_ARTICLES){
   assert.ok(a.title.length>=4 && a.summary.length>=15,a.id);
   assert.ok(TIP_DIAGRAM_TYPES.includes(a.diagram),a.id);
   assert.ok(a.sections.length>=2,a.id);
   assert.ok(new Set(a.sections.map(s=>s.id)).size===a.sections.length,a.id);
   assert.ok(tipArticle(a.id)===a&&tipCategory(a.category),a.id);
   for(const s of a.sections){
     assert.ok(s.summary.length>8&&s.details.length>=28&&s.drill.length>=14,a.id+'/'+s.id);
     assert.ok(TIP_DIAGRAM_TYPES.includes(s.diagram),a.id+'/'+s.id);
     assert.equal(tipArticleSection(a.id,s.id),s);
   }
   for(const related of a.related){assert.ok(tipArticle(related),related);assert.notEqual(related,a.id);}
   for(const ref of a.sources)assert.ok(TIP_SOURCES[ref],ref);
 }
});
test('fullwidth normalisation, category, heading, tags, nonexistent query',()=>{
 assert.ok(searchTipArticles('ピッチ').length>=3);
 assert.ok(searchTipArticles('pＷ').length>=1);
 assert.ok(searchTipArticles('左足下がり','lie').some(a=>a.id==='slope-four'));
 assert.equal(searchTipArticles('ダフリ','rules').length,0);
 assert.equal(searchTipArticles('not-a-real-keyword').length,0);
 assert.equal(searchTipArticles().length,TIP_ARTICLES.length);
});
test('official source links and editorial provenance are safe',()=>{
 for(const a of TIP_ARTICLES){for(const s of tipArticleSources(a)){
   assert.ok(s.url===null||s.url.startsWith('https://'));
   assert.ok(s.label);
 }}
});
test('21 original SVG diagram types, inline paths and mirrored geometry without flipping labels',()=>{
 assert.equal(TIP_DIAGRAM_TYPES.length,21);
 for(const type of TIP_DIAGRAM_TYPES){
  const right=tipDiagram(type,'right');const left=tipDiagram(type,'left');
  assert.match(right,/<svg[^>]+viewBox=/);assert.match(right,/右打ち/);
  assert.match(left,/transform="translate\(360 0\) scale\(-1 1\)"/);
  assert.match(left,/左打ち/);
  assert.ok(left.indexOf('</g>')<left.indexOf('<text'), 'Japanese diagram annotations must be outside mirrored geometry');
  assert.doesNotMatch(right,/<image|<script/);
 }
});
test('article view has hero and per-section diagrams, references, related and sticky toc',()=>{
 for(const a of TIP_ARTICLES){
  const html=tipArticlePage({article:a,handedness:'left'});
  assert.equal((html.match(/class="tip-diagram-button"/g)||[]).length,1+a.sections.length,a.id);
  assert.match(html,/tip-floating-toc/);
  assert.match(html,/tip-article-references/);
  for(const section of a.sections)assert.ok(html.includes('id="tip-sec-'+section.id+'"'));
 }
});
test('index and modal support search, categories, current article toc, article jump',()=>{
 const index=tipIndexPage();assert.equal((index.match(/tip-category-tile/g)||[]).length,9);
 assert.match(index,/<input id="tip-search"/);assert.equal((index.match(/class="tip-article-card"/g)||[]).length,TIP_ARTICLES.length);
 const article=tipArticle('approach-choice');
 assert.match(tipOverlay({article,tab:'article'}),/data-tip-section="landing"/);
 assert.match(tipOverlay({article,tab:'all',query:'ダフリ'}),/tip-toc-tree/);
 assert.match(tipTocTree({query:'バンカー'}),/pitch-bunker/);
 assert.match(tipCards(searchTipArticles('nonsense')),/該当/);
 assert.match(tipOverlay({article,zoom:'slope',handedness:'left'}),/tip-zoom-image/);
});
