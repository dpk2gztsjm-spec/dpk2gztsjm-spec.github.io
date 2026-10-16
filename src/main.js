import {cleanProfile, escapeHtml, GENDERS, HANDEDNESS, isProfileComplete, normalizeRoute, profileSummary, validateProfile} from './domain.js';
import {ensureSettings, getProfile, saveProfile, getAllRecords, putRecord, putRecords, activateClubSet, deleteClubSetSafely, deleteClubAndPruneSets, deleteRecord} from './db.js';
import {cleanClub, validateClub, cleanIronSet, validateIronSet, buildIronSet, newClubId} from './clubs.js';
import {clubsPage, clubFormPage, clubInventory} from './clubs-ui.js';
import {cleanSet, validateSet, newSetId, copyName, setClubCount} from './sets.js';
import {setsPage, setDetailPage, setFormPage} from './sets-ui.js';
import {icon} from './icons.js';
import {DEFAULT_SHOT, cleanShot, validateShot, newShotId} from './shots.js';
import {shotsPage, shotFormPage} from './shots-ui.js';
import {PREFECTURES, emptyCourse, cleanCourse, reshapeHoles, validateCourse, newCourseId, newTeeId, searchCourses} from './courses.js';
import {coursesPage, courseResults, courseDetailPage, courseFormPage} from './courses-ui.js';
import {prepareCoursePhoto} from './course-images.js';
import {saveCourseAtomic, deleteCourseSafely, createRoundAtomic, deleteRoundAtomic, addRoundPlayerAtomic, deleteRoundPlayerAtomic} from './db.js';
import {newRoundId,newRoundPlayerId,scoreId,localDate,roundScoreFor,roundStats,validateRoundDraft,createRoundRecords,cleanScore} from './rounds.js';
import {roundsPage,roundFormPage,holeEntryPage,roundDetailPage} from './rounds-ui.js';
import {roundPhotosFor,moveRoundPhoto,validateRoundNotes,prepareRoundPhoto,roundPhotoId,MAX_ROUND_PHOTOS} from './round-media.js';
import {saveRoundNotesAtomic,addRoundPhotosAtomic,deleteRoundPhotoAtomic,reorderRoundPhotosAtomic} from './db.js';
import {TIP_ARTICLES,tipArticle,searchTipArticles,tipCategory} from './tips-data.js';
import {tipIndexPage,tipArticlePage,tipOverlay,tipCards,tipTocTree} from './tips-ui.js';
import {STRATEGY_STEPS,newStrategyDraft,newStrategyId,cleanStrategy,validateStrategy,updateStrategyField,toggleStrategySlope,strategyRecord} from './strategy.js';
import {strategyWizardPage,strategyReviewPage} from './strategy-ui.js';
import {strategyResultPage} from './strategy-result-ui.js';
import {defaultAlbumPreset,sanitizeAlbumPreset,buildAlbumModel,jpegIssue,albumPages} from './album.js';
import {albumPage} from './album-ui.js';
import {loadAlbumImages,closeAlbumImages,drawAlbumPage,canvasJpeg,renderAlbumFiles,JPEG_SIZE,PDF_SIZE} from './album-render.js';
import {STORE_NAMES,snapshotAllStores,restoreAllStoresAtomic} from './db.js';
import {createBackup,parseBackup,countRecords,backupFilename,MAX_FILE_BYTES} from './backup.js';
import {backupPage} from './backup-ui.js';

const app = document.querySelector('#app');
const NAV = [
  {key:'courses', text:'コース', symbol:'search'},
  {key:'tips', text:'Tips', symbol:'book'},
  {key:'strategy', text:'攻略', symbol:'target'},
  {key:'records', text:'記録', symbol:'flag'}
];
const state = {
  profile: null,
  settings: null,
  route: normalizeRoute(location.hash),
  draft: null,
  errors: {},
  busy: false,
  dirty: false,
  toast: '',
  bootError: null,
  clubs: [], clubView:'list', clubMode:'single', clubEditingId:null,
  clubDraft:null, clubSelected:[], clubLofts:{}, clubErrors:{},
  clubQuery:'', clubCategory:'all', clubDirty:false, clubBusy:false,
  clubToast:'', clubError:'',
  sets:[], setView:'list', setSelectedId:null, setEditingId:null,
  setDraft:null, setErrors:{}, setDirty:false, setBusy:false, setToast:'', setError:'',
  shots:[], shotView:'list', shotEditingId:null, shotDraft:null, shotErrors:{},
  shotBusy:false, shotDirty:false, shotDetailsOpen:false, shotFilter:'all', shotToast:'', shotError:'',
  courses:[], courseView:'list', courseSelectedId:null, courseEditingId:null, courseDraft:null, courseErrors:{},
  courseBusy:false,courseDirty:false,courseQuery:'',coursePrefecture:'all',courseTeeId:null,courseToast:'',courseError:'',
  coursePhotoChange:undefined,coursePhotoUrl:null,coursePhotos:new Map(),
  rounds:[],roundPlayers:[],holeScores:[],roundView:'list',roundSelectedId:null,roundHoleIndex:0,
  roundDraft:null,roundErrors:{},roundToast:'',roundError:'',roundBusy:false,roundDirty:false,
  roundShowPutts:false,roundSaveStatus:'保存済み',roundAddPlayer:false,roundEditingPlayerId:null,
  roundPlayerDraft:'',roundPlayerError:'',
  roundPhotos:[], roundPhotoUrls:new Map(), roundPhotoBusy:false, roundMediaError:'',
  roundNotesDraft:'', roundNotesDirty:false, roundNotesBusy:false, roundNotesError:'',
  tipArticleId:null,tipCategory:'all',tipQuery:'',tipTocOpen:false,tipTocTab:'all',tipTocExpanded:'short',tipTocQuery:'',tipZoom:null,tipHand:null,
  strategyRecords:[], strategyView:'wizard', strategyStep:0, strategyId:null, strategyCreatedAt:null,
  strategyDraft:null, strategyErrors:{}, strategyStatus:'未保存',strategyError:'',strategyBusy:false,
  strategyDirty:false,strategyRevision:0,strategyExpandedAlt:null,strategyAddressView:'front',
  albumPresets:[],albumPreset:null,albumPreviews:[],albumPreviewBusy:false,albumBusy:false,albumError:'',albumStatus:'',albumShareWarning:false,albumPreviewVersion:0,albumCropOpen:false,
  backupBusy:false,backupError:'',backupStatus:'',backupCounts:{},backupPreview:null,
  offline:typeof navigator!=='undefined'?!navigator.onLine:false,storagePersisted:null,storageQuota:null
};

function brand(small=false) {
  return `<a class="brand ${small?'brand-small':''}" href="#home" aria-label="GOLF JOURNAL ホーム">
    <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
    <span class="brand-word">GOLF <strong>JOURNAL<span class="brand-dot">.</span></strong></span>
  </a>`;
}
function header() {
  return `<header class="site-header">${brand()}<a class="profile-button ${state.route === 'profile'?'selected':''}" href="#profile" aria-label="プロフィールを開く">${icon('user',19)}</a></header>`;
}
function nav() {
  return `<nav class="bottom-nav" aria-label="メインナビゲーション">${NAV.map(item=>`<a href="#${item.key}" class="nav-link ${state.route===item.key?'active':''}" ${state.route===item.key?'aria-current="page"':''}>
    ${icon(item.symbol,22)}<span>${item.text}</span>${state.route===item.key?'<i class="nav-active-dot" aria-hidden="true"></i>':''}
  </a>`).join('')}</nav>`;
}
function pageTop(eyebrow, title, desc='') {
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>${eyebrow}</div><h1>${title}</h1>${desc?`<p>${desc}</p>`:''}</div>`;
}
function actionLink(route,text,kind='dark',symbol='arrow') {
  return `<a class="action action-${kind}" href="#${route}">${escapeHtml(text)} ${icon(symbol,17)}</a>`;
}
function badge(text, color='neutral') { return `<span class="badge badge-${color}">${escapeHtml(text)}</span>`; }
function placeholderStage(num) {return badge(`第${num}段階で実装`, 'light');}

function home() {
  const profile = profileSummary(state.profile);
  return `${pageTop('YOUR PERSONAL GOLF SPACE','ゴルフを、<br>もっと自分のものに。','学ぶ。考える。記録する。<br>あなたのゴルフを、一冊に。')}
    <section class="hero-card" aria-labelledby="hero-label">
      <div class="hero-content">
        <p class="hero-kicker">YOUR NEXT ROUND</p>
        <h2 id="hero-label">一打ずつ、<br>自分の記録に。</h2>
        <p>ゴルフ場と当日のスコアを記録。<br>一打ずつ、ラウンドの記憶に。</p>
        <a href="#records" class="hero-cta">ラウンド記録を見る ${icon('arrow',17)}</a>
      </div>
      <div class="hero-art" aria-hidden="true"><span class="art-ring art-ring-one"></span><span class="art-ring art-ring-two"></span><span class="art-center"></span><span class="art-flag"></span></div>
      <span class="hero-index">GJ — 009</span>
    </section>
    <a class="course-search-entry" href="#courses">${icon('search',20)}<span>ゴルフ場を探す</span><span class="course-search-suffix">登録済み ${state.courses.length} 件 ${icon('arrow',16)}</span></a>
    <section class="section" aria-labelledby="tools-title">
      <div class="section-heading"><h2 id="tools-title">MY GOLF</h2><span>MY EQUIPMENT & PROFILE</span></div>
      <div class="quick-grid">
        <a href="#clubs" class="quick-card"><span class="quick-icon pastel-blue">${icon('bag',24)}</span><strong>マイクラブ</strong><small>所有クラブを管理</small>${icon('arrow',16)}</a>
        <a href="#sets" class="quick-card"><span class="quick-icon pastel-yellow">${icon('layers',24)}</span><strong>マイセット</strong><small>バッグを組み合わせる</small>${icon('arrow',16)}</a>
        <a href="#shots" class="quick-card"><span class="quick-icon pastel-red">${icon('target',24)}</span><strong>マイショット</strong><small>打ち方と飛距離を記録</small>${icon('arrow',16)}</a>
        <a href="#profile" class="quick-card"><span class="quick-icon pastel-gray">${icon('user',24)}</span><strong>プロフィール</strong><small>${escapeHtml(profile?.handedness||'基本情報を編集')}</small>${icon('arrow',16)}</a>
      </div>
    </section>
    <section class="section" aria-labelledby="bag-title">
      <div class="section-heading"><h2 id="bag-title">CURRENT BAG</h2><span>現在のバッグ</span></div>
      ${(()=>{ const s=state.sets.find(x=>x.id===state.settings?.activeSetId);return `<a href="#sets" class="empty-summary"><div class="summary-art" aria-hidden="true">${icon('bag',34)}</div><div class="summary-copy"><strong>${s?`${escapeHtml(s.name)} · ${setClubCount(s)}/14 本`:'現在のバッグは未設定'}</strong><p>${s?(setClubCount(s)>14?'14本を超えています。競技の本数制限に注意。':'登録したセットをいつでも切り替えられます。'):'マイセットを作成し「現在のバッグにする」を選んでください。'}</p></div>${icon('chevron',19)}</a>`;})()}
    </section>
    <section class="section recent-section" aria-labelledby="rounds-title">
      <div class="section-heading"><h2 id="rounds-title">RECENT ROUNDS</h2><span>最近のラウンド</span></div>
      ${state.rounds.length ? `<div class="round-home-recent">${[...state.rounds].sort((a,b)=>b.playedOn.localeCompare(a.playedOn)).slice(0,3).map(round=>{const own=state.roundPlayers.find(p=>p.roundId===round.id&&p.isSelf);const ss=own?roundStats(round,[own],state.holeScores.filter(x=>x.roundId===round.id))[0].total:null;return `<button type="button" class="round-home-link" data-round-action="detail" data-round-id="${escapeHtml(round.id)}"><span>${escapeHtml(round.playedOn)} · ${escapeHtml(round.courseSnapshot.name)}</span><b>${ss?.strokes??'—'}${ss?.complete?'':' 暫定'}</b>${icon('arrow',16)}</button>`}).join('')}</div>`:`<div class="recent-empty">${icon('calendar',24)}<span>ラウンド記録はまだありません</span><small>「記録」から新しいラウンドを作成できます。</small></div>`}
    </section>
    <a class="course-search-entry" href="#backup">${icon('shield',19)}<span>バックアップ・復元</span><span class="course-search-suffix">データを守る ${icon('arrow',16)}</span></a>
    <footer class="page-footer">GOLF JOURNAL <span>V0.12.0 · BACKUP & PWA</span></footer>`;
}

function choiceButtons(name, options, selected, errorText) {
  return `<div class="segmented-options ${errorText?'field-invalid':''}" role="group" aria-label="${name==='gender'?'性別':'利き打ち'}">
    ${options.map(({value,label})=>`<button type="button" class="choice ${selected===value?'is-selected':''}" data-select="${name}" data-value="${value}" aria-pressed="${selected===value}">${selected===value?icon('check',16):''}<span>${label}</span></button>`).join('')}
  </div>${errorText?`<p class="field-error" role="alert">${escapeHtml(errorText)}</p>`:''}`;
}
function profileForm(onboarding=false) {
  const p = state.draft ?? {gender:'',handedness:'',heightCm:'',handicap:'',playNotes:''};
  const h = p.heightCm ?? '';
  const hd = p.handicap ?? '';
  return `<form id="profile-form" class="profile-form" novalidate>
    <section class="form-card">
      <div class="form-card-label"><span>01</span> 必須項目</div>
      <div class="field-group"><div class="field-header"><label>性別 <span class="required">必須</span></label><small>回答しないを選べます</small></div>
        ${choiceButtons('gender',GENDERS,p.gender,state.errors.gender)}</div>
      <div class="field-group"><div class="field-header"><label>利き打ち <span class="required">必須</span></label><small>右打ち・左打ち</small></div>
        ${choiceButtons('handedness',HANDEDNESS,p.handedness,state.errors.handedness)}</div>
    </section>
    <section class="form-card">
      <div class="form-card-label"><span>02</span> 任意項目</div>
      <div class="two-col-fields">
        <div class="field-group"><label for="height">身長 <span class="optional">任意</span></label><div class="input-unit"><input id="height" data-field="heightCm" type="number" inputmode="decimal" step="0.1" min="100" max="230" placeholder="175" value="${escapeHtml(h)}"/><span>cm</span></div>${state.errors.heightCm?`<p class="field-error">${escapeHtml(state.errors.heightCm)}</p>`:''}</div>
        <div class="field-group"><label for="handicap">ハンディキャップ <span class="optional">任意</span></label><div class="input-unit"><input id="handicap" data-field="handicap" type="number" inputmode="decimal" step="0.1" min="-10" max="54" placeholder="未登録" value="${escapeHtml(hd)}"/><span>HCP</span></div>${state.errors.handicap?`<p class="field-error">${escapeHtml(state.errors.handicap)}</p>`:''}</div>
      </div>
      <div class="field-group notes-field"><label for="notes">プレー特性・メモ <span class="optional">任意</span></label><textarea id="notes" data-field="playNotes" maxlength="280" rows="3" placeholder="例：現在練習中のテーマなど">${escapeHtml(p.playNotes)}</textarea><p class="helper">クラブ選択や飛距離の推定に、性別だけを利用することはありません。</p></div>
    </section>
    ${state.errors.general?`<div class="alert alert-error" role="alert">${icon('alert',18)}<span>${escapeHtml(state.errors.general)}</span></div>`:''}
    ${state.toast?`<div class="alert alert-success" role="status">${icon('check',18)}<span>${escapeHtml(state.toast)}</span></div>`:''}
    <div class="form-actions"><button class="save-button" type="submit" ${state.busy?'disabled':''}>${icon('save',19)} ${state.busy?'保存しています…':onboarding?'保存して始める':'変更を保存'} ${icon('arrow',18)}</button>
    ${!onboarding?`<button type="button" class="cancel-button" data-action="cancel-profile">変更を破棄する</button>`:''}</div>
    <p class="privacy-line">${icon('shield',17)} プロフィールは、この端末内に保存されます。</p>
  </form>`;
}
function profilePage(onboarding=false) {
  return `${pageTop(onboarding?'WELCOME TO GOLF JOURNAL':'YOUR PROFILE',onboarding?'あなたのゴルフを、<br>ここから。':'プロフィール',onboarding?'最初に基本情報を登録してください。<br>あとからいつでも変更できます。':'プレースタイルの基本情報を登録・編集できます。')}
  ${profileForm(onboarding)}${!onboarding?'<a class="course-search-entry" href="#backup">バックアップ・復元へ →</a>':''}`;
}
function upcomingPage({overline,title,description,number,iconName,steps,aside}) {
  return `${pageTop(overline,title,description)}
  <section class="upcoming-hero"><div class="upcoming-illustration">${icon(iconName,55)}<div class="upcoming-orbit"></div></div>
    ${placeholderStage(number)}<h2>この機能は、これから。</h2>
    <p>第${number}段階で実際に使える機能として追加します。<br>現時点では、登録・保存などの処理は未実装です。</p>
  </section>
  <section class="section"><div class="section-heading"><h2>COMING FEATURES</h2><span>実装予定</span></div>
    <div class="feature-list">${steps.map((step,index)=>`<div class="feature-row"><span class="feature-number">0${index+1}</span><span>${escapeHtml(step)}</span>${icon('check',17)}</div>`).join('')}</div>
  </section>
  ${aside?`<div class="info-note">${icon('info',20)}<p>${escapeHtml(aside)}</p></div>`:''}
  <a href="#home" class="return-link">${icon('back',17)} ホームへ戻る</a>`;
}
function pageForRoute(route) {
  switch (route) {
    case 'home': return home();
    case 'profile': return profilePage(false);
    case 'courses': return state.courseView==='form' ? courseFormPage({draft:state.courseDraft,errors:state.courseErrors,busy:state.courseBusy,editing:!!state.courseEditingId,toast:state.courseToast,error:state.courseError,photos:state.coursePhotoChange===null?new Map([...state.coursePhotos].filter(([id])=>id!==state.courseDraft?.id)):state.coursePhotos,selectedPhotoUrl:state.coursePhotoUrl}) : state.courseView==='detail' && state.courses.some(c=>c.id===state.courseSelectedId) ? courseDetailPage({course:state.courses.find(c=>c.id===state.courseSelectedId),teeId:state.courseTeeId,photos:state.coursePhotos,toast:state.courseToast,error:state.courseError}) : coursesPage({courses:state.courses,query:state.courseQuery,prefecture:state.coursePrefecture,toast:state.courseToast,error:state.courseError,photos:state.coursePhotos});
    case 'tips': return state.tipArticleId ? tipArticlePage({article:tipArticle(state.tipArticleId),handedness:tipHandedness()}) : tipIndexPage({query:state.tipQuery,category:state.tipCategory});
    case 'strategy': {
      const ctx={draft:state.strategyDraft??newStrategyDraft(state.settings?.activeSetId),sets:state.sets,activeSetId:state.settings?.activeSetId,step:state.strategyStep,errors:state.strategyErrors,status:state.strategyStatus,error:state.strategyError,records:state.strategyRecords,clubs:state.clubs,shots:state.shots,handedness:tipHandedness(),expandedAlt:state.strategyExpandedAlt,addressView:state.strategyAddressView};
      return state.strategyView==='review'?strategyReviewPage(ctx):state.strategyView==='result'?strategyResultPage(ctx):strategyWizardPage(ctx);
    }
    case 'records': {
      const round=state.rounds.find(r=>r.id===state.roundSelectedId);
      const players=state.roundPlayers.filter(p=>p.roundId===round?.id).sort((a,b)=>a.order-b.order);
      const scores=state.holeScores.filter(x=>x.roundId===round?.id);
      if(state.roundView==='form'&&state.roundDraft)return roundFormPage({draft:state.roundDraft,courses:state.courses,sets:state.sets,errors:state.roundErrors,busy:state.roundBusy,error:state.roundError});
      if(round&&state.roundView==='holes')return holeEntryPage({round,players,scores,index:Math.max(0,Math.min(state.roundHoleIndex,round.holeCount-1)),showPutts:state.roundShowPutts,status:state.roundSaveStatus,error:state.roundError,toast:state.roundToast});
      if(round&&state.roundView==='album'&&state.albumPreset){const preset=sanitizeAlbumPreset(state.albumPreset,round,players,roundPhotoView(round.id));return albumPage({round,players,photos:roundPhotoView(round.id),photoUrls:state.roundPhotoUrls,preset,model:buildAlbumModel(round,players,scores,roundPhotoView(round.id),preset),previewUrls:state.albumPreviews,busy:state.albumBusy,status:state.albumStatus,error:state.albumError,shareWarning:state.albumShareWarning,presets:state.albumPresets.filter(p=>p.roundId===round.id),cropOpen:state.albumCropOpen});}
      if(round&&state.roundView==='detail')return roundDetailPage({round,players,scores,photos:roundPhotoView(round.id),photoUrls:state.roundPhotoUrls,photoBusy:state.roundPhotoBusy,mediaError:state.roundMediaError,noteDraft:state.roundNotesDraft,noteDirty:state.roundNotesDirty,noteBusy:state.roundNotesBusy,noteError:state.roundNotesError,toast:state.roundToast,error:state.roundError,status:state.roundSaveStatus,showAddPlayer:state.roundAddPlayer,playerEditingId:state.roundEditingPlayerId,playerDraft:state.roundPlayerDraft,playerError:state.roundPlayerError});
      return roundsPage({rounds:state.rounds,courses:state.courses,players:state.roundPlayers,scores:state.holeScores,photos:state.roundPhotos,photoUrls:state.roundPhotoUrls,toast:state.roundToast,error:state.roundError});
    }
    case 'backup': return backupPage({counts:state.backupCounts,preview:state.backupPreview,busy:state.backupBusy,status:state.backupStatus,error:state.backupError,offline:state.offline,persisted:state.storagePersisted,quota:state.storageQuota});
    case 'clubs': return state.clubView==='form'
      ? clubFormPage({draft:state.clubDraft,mode:state.clubMode,errors:state.clubErrors,busy:state.clubBusy,editing:!!state.clubEditingId,selected:state.clubSelected,lofts:state.clubLofts})
      : clubsPage({clubs:state.clubs,query:state.clubQuery,category:state.clubCategory,toast:state.clubToast,error:state.clubError});
    case 'sets': return state.setView==='form' ? setFormPage({draft:state.setDraft,clubs:state.clubs,errors:state.setErrors,busy:state.setBusy,editing:!!state.setEditingId})
      : state.setView==='detail' ? (state.sets.find(s=>s.id===state.setSelectedId) ? setDetailPage({set:state.sets.find(s=>s.id===state.setSelectedId),clubs:state.clubs,activeId:state.settings?.activeSetId,toast:state.setToast,error:state.setError,busy:state.setBusy}) : setsPage({sets:state.sets,clubs:state.clubs,activeId:state.settings?.activeSetId,toast:state.setToast,error:state.setError}))
      : setsPage({sets:state.sets,clubs:state.clubs,activeId:state.settings?.activeSetId,toast:state.setToast,error:state.setError});
    case 'shots': return state.shotView==='form' ? shotFormPage({draft:state.shotDraft,clubs:state.clubs,errors:state.shotErrors,busy:state.shotBusy,editing:!!state.shotEditingId,detailsOpen:state.shotDetailsOpen})
      : shotsPage({shots:state.shots,clubs:state.clubs,activeSet:state.sets.find(x=>x.id===state.settings?.activeSetId),clubFilter:state.shotFilter,toast:state.shotToast,error:state.shotError});
    default: return home();
  }
}
function render() {
  if (state.bootError) {
    app.innerHTML = `<div class="fatal-error"><div class="error-symbol">${icon('alert',42)}</div><h1>データを開けませんでした</h1><p>${escapeHtml(state.bootError)}</p><button data-action="reload">再読み込みする ${icon('arrow',16)}</button></div>`;
    return;
  }
  const onboarding = !isProfileComplete(state.profile);
  if (onboarding && !state.draft) state.draft = {gender:'',handedness:'',heightCm:'',handicap:'',playNotes:''};
  app.innerHTML = `<div class="shell ${onboarding?'shell-onboarding':''}">
    ${header()}
    <main class="main-content" id="main">${onboarding ? profilePage(true) : pageForRoute(state.route)}</main>
    ${onboarding ? '' : nav()}
  </div>${!onboarding && state.route==='tips' && (state.tipTocOpen||state.tipZoom) ? tipOverlay({article:tipArticle(state.tipArticleId),tab:state.tipTocTab,expanded:state.tipTocExpanded,query:state.tipTocQuery,zoom:state.tipZoom,handedness:tipHandedness()}) : ''}`;
  document.documentElement.classList.toggle('tip-modal-open',!onboarding && state.route==='tips' && Boolean(state.tipTocOpen||state.tipZoom));
  document.title = `${onboarding?'はじめる':({home:'ホーム',courses:'コース',tips:'Tips',strategy:'攻略',records:'記録',clubs:'マイクラブ',sets:'マイセット',shots:'マイショット',profile:'プロフィール',backup:'バックアップ・復元'}[state.route])} | GOLF JOURNAL`;
}
function resetDraft() {
  const p = state.profile;
  state.draft = p ? {gender:p.gender,handedness:p.handedness,heightCm:p.heightCm ?? '',handicap:p.handicap ?? '',playNotes:p.playNotes ?? ''} : {gender:'',handedness:'',heightCm:'',handicap:'',playNotes:''};
  state.dirty = false;
  state.errors = {};
}
function blankClubDraft() {return {category:'',maker:'',model:'',number:'',releaseYear:'',loftDeg:'',shaft:'',notes:''};}
function openClubForm(mode='single', id=null) {
  const editing = id && state.clubs.find(c=>c.id===id);
  if (id && !editing) {state.clubError='クラブが見つかりません。再読み込みしてください。';render();return;}
  state.clubView='form';state.clubEditingId=editing?.id||null;
  state.clubMode=editing?'single':mode;
  state.clubDraft=editing ? {...editing,releaseYear:editing.releaseYear??'',loftDeg:editing.loftDeg??''} : blankClubDraft();
  state.clubSelected=[];state.clubLofts={};state.clubErrors={};state.clubDirty=false;
  state.clubToast='';state.clubError='';render();window.scrollTo(0,0);
}
function closeClubForm(force=false) {
  if (!force && state.clubDirty && !window.confirm('未保存のクラブ情報を破棄して一覧へ戻りますか？')) return;
  state.clubView='list';state.clubEditingId=null;state.clubDraft=null;state.clubSelected=[];
  state.clubErrors={};state.clubLofts={};state.clubDirty=false;
  render();window.scrollTo(0,0);
}
async function submitClub() {
  if (state.clubBusy) return;
  const bulk=state.clubMode==='set' && !state.clubEditingId;
  const normal=bulk?cleanIronSet(state.clubDraft,state.clubSelected):null;
  const cleaned=bulk?normal.base:cleanClub(state.clubDraft);
  const errors=bulk?validateIronSet(cleaned,normal.selected):validateClub(cleaned);
  if (bulk) {
    for (const n of normal.selected) {
      const value=String(state.clubLofts[n]??'').trim();
      if (value!=='' && (!Number.isFinite(Number(value)) || Number(value)<0 || Number(value)>90)) errors[`loft.${n}`]=`${n}のロフト角は0〜90°の範囲で指定してください。`;
    }
  }
  state.clubErrors=errors;
  if (Object.keys(errors).length) {render();return;}
  state.clubBusy=true;render();
  try {
    const now=new Date().toISOString();
    if (bulk) {
      const records=buildIronSet(cleaned,normal.selected,state.clubLofts,newClubId,now);
      await putRecords('clubs',records);
      state.clubToast=`${records.length}本のクラブを登録しました。`;
    } else {
      const previous=state.clubEditingId?state.clubs.find(c=>c.id===state.clubEditingId):null;
      const record={...cleaned,id:previous?.id??newClubId(),createdAt:previous?.createdAt??now,
        updatedAt:now,sourceType:previous?.sourceType??'manual',registeredAsSet:previous?.registeredAsSet??false};
      await putRecord('clubs',record);
      state.clubToast=previous?'クラブの変更を保存しました。':'クラブを1本登録しました。';
    }
    state.clubs=await getAllRecords('clubs');
    state.clubDirty=false;
    closeClubForm(true);
  } catch(error) {
    state.clubErrors={general:`保存できませんでした。入力は保持しています。 ${error?.message||'不明なエラー'}`};
    state.clubToast='';
  } finally {state.clubBusy=false;render();}
}
async function removeClub() {
  if (state.clubBusy || !state.clubEditingId) return;
  const target=state.clubs.find(c=>c.id===state.clubEditingId);
  if (!target) return;
  const affectedSets=state.sets.filter(set=>set.clubIds?.includes(target.id)).length;
  const affectedShots=state.shots.filter(shot=>shot.clubId===target.id).length;
  if (!window.confirm(`「${target.maker} ${target.model} ${target.number}」を削除しますか？${affectedSets?` このクラブは${affectedSets}つのマイセットからも除外されます。`:''}${affectedShots?` 関連する${affectedShots}件のマイショットも削除されます。`:''} この操作は取り消せません。`)) return;
  state.clubBusy=true;render();
  try {
    const affected=await deleteClubAndPruneSets(target.id);
    [state.clubs,state.sets,state.shots]=await Promise.all([getAllRecords('clubs'),getAllRecords('clubSets'),getAllRecords('shots')]);
    state.clubToast=affected?`クラブを削除しました。${affected}セットからも除外しました。`:'クラブを削除しました。';
    state.clubDirty=false;
    closeClubForm(true);
  } catch(error) {
    state.clubErrors={general:`削除に失敗しました。 ${error?.message||'不明なエラー'}`};
  } finally {state.clubBusy=false;render();}
}
function handleClubAction(button) {
  const action=button.dataset.clubAction;
  if (state.clubBusy) return;
  if (action==='new-single') return openClubForm('single');
  if (action==='new-set') return openClubForm('set');
  if (action==='edit') return openClubForm('single',button.dataset.clubId);
  if (action==='make-shot') {state.route='shots';openShotForm(null,button.dataset.clubId);location.hash='#shots';return;}
  if (action==='cancel') return closeClubForm();
  if (action==='delete') {void removeClub();return;}
  if (action==='filter') {state.clubCategory=button.dataset.category;render();return;}
  if (action==='mode-single' || action==='mode-set') {
    state.clubMode=action==='mode-set'?'set':'single';
    state.clubErrors={};state.clubDirty=true;render();return;
  }
}
function openSetForm(id=null) {
  const source=id?state.sets.find(s=>s.id===id):null;
  if (id && !source) {state.setError='セットが見つかりません。';render();return;}
  state.setEditingId=id;
  state.setSelectedId=id||null;
  state.setDraft={name:source?.name??'',clubIds:[...(source?.clubIds??[]).filter(c=>state.clubs.some(x=>x.id===c))]};
  state.setView='form';state.setDirty=false;state.setErrors={};state.setToast='';state.setError='';render();window.scrollTo(0,0);
}
function closeSetForm(force=false) {
  if (!force && state.setDirty && !window.confirm('未保存のセット構成を破棄しますか？')) return;
  state.setView=state.setEditingId?'detail':'list';state.setDirty=false;state.setDraft=null;state.setErrors={};state.setEditingId=null;
  render();window.scrollTo(0,0);
}
async function saveSetForm() {
  if (state.setBusy) return;
  const errors=validateSet(state.setDraft);
  state.setErrors=errors;
  if(Object.keys(errors).length){render();return;}
  const cleaned=cleanSet(state.setDraft,state.clubs);
  if (cleaned.clubIds.length !== state.setDraft.clubIds.length) {
    state.setErrors={general:'所有クラブの構成が変わりました。画面を戻してクラブを選び直してください。'};render();return;
  }
  state.setBusy=true;render();
  try {
    const existing=state.setEditingId?state.sets.find(s=>s.id===state.setEditingId):null;
    const now=new Date().toISOString();
    const record={...cleaned,id:existing?.id??newSetId(),createdAt:existing?.createdAt??now,updatedAt:now};
    await putRecord('clubSets',record);
    state.sets=await getAllRecords('clubSets');
    state.setSelectedId=record.id;
    state.setToast=existing?'セットの変更を保存しました。':'新しいマイセットを保存しました。';
    state.setDirty=false;state.setDraft=null;state.setErrors={};state.setEditingId=null;state.setView='detail';
    window.scrollTo(0,0);
  } catch(error) {
    state.setErrors={general:`保存できませんでした。入力は保持しています。 ${error?.message||'不明なエラー'}`};
  } finally {state.setBusy=false;render();}
}
async function activateSet(id) {
  if(state.setBusy)return;
  state.setBusy=true;state.setError='';render();
  try {
    state.settings=await activateClubSet(id);
    state.setToast='現在のバッグを切り替えました。';
  } catch(error) {state.setError=`バッグを切り替えられませんでした。 ${error?.message||''}`;}
  finally {state.setBusy=false;render();}
}
async function duplicateSet(id) {
  if(state.setBusy)return;
  const source=state.sets.find(s=>s.id===id);
  if(!source)return;
  state.setBusy=true;state.setError='';render();
  try {
    const now=new Date().toISOString();
    const record={id:newSetId(),name:copyName(source.name),clubIds:[...source.clubIds],createdAt:now,updatedAt:now};
    await putRecord('clubSets',record);
    state.sets=await getAllRecords('clubSets');
    state.setSelectedId=record.id;state.setView='detail';
    state.setToast='セットを複製しました。現在のバッグは変更していません。';
  } catch(error){state.setError=`複製に失敗しました。 ${error?.message||''}`;}
  finally{state.setBusy=false;render();}
}
async function deleteSet(id) {
  if(state.setBusy)return;
  const target=state.sets.find(s=>s.id===id);if(!target)return;
  const current=id===state.settings?.activeSetId;
  if(!window.confirm(`「${target.name}」を削除しますか？${current?' 現在のバッグは未設定になります。':''} この操作は取り消せません。`))return;
  state.setBusy=true;state.setError='';render();
  try {
    const updated=await deleteClubSetSafely(id);
    if(updated)state.settings=updated;
    state.sets=await getAllRecords('clubSets');state.setSelectedId=null;state.setView='list';
    state.setToast='マイセットを削除しました。所有クラブは削除されません。';
    window.scrollTo(0,0);
  } catch(error){state.setError=`削除に失敗しました。 ${error?.message||''}`;}
  finally{state.setBusy=false;render();}
}
function handleSetAction(button) {
  if(state.setBusy)return;
  const action=button.dataset.setAction,id=button.dataset.setId;
  if(action==='new')return openSetForm();
  if(action==='edit')return openSetForm(id);
  if(action==='cancel')return closeSetForm();
  if(action==='back'){state.setSelectedId=null;state.setView='list';state.setError='';state.setToast='';render();window.scrollTo(0,0);return;}
  if(action==='preview'){state.setSelectedId=id;state.setView='detail';state.setToast='';state.setError='';render();window.scrollTo(0,0);return;}
  if(action==='activate'){void activateSet(id);return;}
  if(action==='duplicate'){void duplicateSet(id);return;}
  if(action==='delete'){void deleteSet(id);return;}
}
function openShotForm(id=null, clubId=null) {
  const existing=id?state.shots.find(s=>s.id===id):null;
  if(id&&!existing){state.shotError='ショットが見つかりません。';render();return;}
  state.shotView='form'; state.shotEditingId=existing?.id??null;
  state.shotDraft=existing?{...DEFAULT_SHOT,...existing,carryYards:existing.carryYards??'',rollYards:existing.rollYards??''}:{...DEFAULT_SHOT,clubId:clubId&&state.clubs.some(c=>c.id===clubId)?clubId:(state.clubs.length===1?state.clubs[0].id:'')};
  state.shotErrors={};state.shotDirty=false;state.shotDetailsOpen=!!existing && ['stanceWidth','ballPosition','bodyAlignment','weightDistribution','faceDirection','keyPoints','lieConditions','distanceVariability','notes'].some(k=>existing[k]);
  state.shotToast='';state.shotError='';render();window.scrollTo(0,0);
}
function closeShotForm(force=false) {
  if(!force&&state.shotDirty&&!window.confirm('未保存のショット情報を破棄して戻りますか？'))return;
  state.shotView='list';state.shotEditingId=null;state.shotDraft=null;state.shotErrors={};state.shotDirty=false;
  render();window.scrollTo(0,0);
}
async function submitShot() {
  if(state.shotBusy||!state.shotDraft)return;
  const clean=cleanShot(state.shotDraft);
  state.shotErrors=validateShot(clean,state.clubs);
  if(Object.keys(state.shotErrors).length){if(Object.keys(state.shotErrors).some(k=>['stanceWidth','ballPosition','bodyAlignment','weightDistribution','faceDirection','lieConditions','distanceVariability','keyPoints','notes'].includes(k)))state.shotDetailsOpen=true;render();return;}
  state.shotBusy=true;render();
  try {
    const previous=state.shotEditingId?state.shots.find(s=>s.id===state.shotEditingId):null;
    const now=new Date().toISOString();
    const record={...clean,id:previous?.id??newShotId(),createdAt:previous?.createdAt??now,updatedAt:now,recordKind:'personal'};
    await putRecord('shots',record);
    state.shots=await getAllRecords('shots');
    state.shotToast=previous?'マイショットを更新しました。':'マイショットを登録しました。';
    state.shotDirty=false;closeShotForm(true);
  } catch(error){state.shotErrors={general:`保存できませんでした。入力は保持しています。 ${error?.message||'不明なエラー'}`};}
  finally {state.shotBusy=false;render();}
}
async function removeShot() {
  if(state.shotBusy||!state.shotEditingId)return;
  const target=state.shots.find(s=>s.id===state.shotEditingId);
  if(!target)return;
  if(!window.confirm(`「${target.name}」を削除しますか？この操作は取り消せません。`))return;
  state.shotBusy=true;render();
  try {await deleteRecord('shots',target.id);state.shots=await getAllRecords('shots');state.shotToast='マイショットを削除しました。';state.shotDirty=false;closeShotForm(true);}
  catch(error){state.shotErrors={general:`削除に失敗しました。 ${error?.message||'不明なエラー'}`};}
  finally {state.shotBusy=false;render();}
}
function handleShotAction(button) {
  if(state.shotBusy)return;
  const action=button.dataset.shotAction;
  if(action==='new')return openShotForm();
  if(action==='edit')return openShotForm(button.dataset.shotId);
  if(action==='cancel')return closeShotForm();
  if(action==='delete'){void removeShot();return;}
  if(action==='toggle-details'){state.shotDetailsOpen=!state.shotDetailsOpen;render();return;}
}
function refreshCoursePhotos(photoRecords) {
  for(const url of state.coursePhotos.values())URL.revokeObjectURL(url);
  state.coursePhotos=new Map();
  for(const item of photoRecords){
    if(item.ownerType==='course' && item.ownerId && item.blob instanceof Blob){
      state.coursePhotos.set(item.ownerId,URL.createObjectURL(item.blob));
    }
  }
}
function clearCourseForm(){
  if(state.coursePhotoUrl)URL.revokeObjectURL(state.coursePhotoUrl);
  state.coursePhotoUrl=null;state.coursePhotoChange=undefined;state.courseDirty=false;
  state.courseDraft=null;state.courseEditingId=null;state.courseErrors={};
}
function openCourseForm(courseId=null){
  const previous=courseId?state.courses.find(c=>c.id===courseId):null;
  if(courseId&&!previous){state.courseError='コースが見つかりません。';render();return;}
  clearCourseForm();
  state.courseEditingId=previous?.id??null;
  state.courseSelectedId=previous?.id??null;
  state.courseDraft=previous?structuredClone(previous):emptyCourse();
  state.courseView='form';state.courseToast='';state.courseError='';render();window.scrollTo(0,0);
}
function closeCourseForm(force=false){
  if(!force&&state.courseDirty&&!window.confirm('未保存のコース情報を破棄しますか？'))return;
  const editing=!!state.courseEditingId;
  clearCourseForm();state.courseView=editing?'detail':'list';
  render();window.scrollTo(0,0);
}
async function selectCoursePhoto(file){
  if(!file||state.courseBusy||!state.courseDraft)return;
  state.courseBusy=true;state.courseError='';
  try{
    const blob=await prepareCoursePhoto(file);
    if(state.coursePhotoUrl)URL.revokeObjectURL(state.coursePhotoUrl);
    state.coursePhotoChange=blob;
    state.coursePhotoUrl=URL.createObjectURL(blob);
    state.courseDirty=true;
  }catch(err){state.courseError=err?.message||'画像を読み込めませんでした。';}
  finally{state.courseBusy=false;render();}
}
async function saveCourseForm(){
  if(state.courseBusy||!state.courseDraft)return;
  const course=cleanCourse(state.courseDraft);
  const errors=validateCourse(course);
  state.courseErrors=errors;state.courseError='';
  if(Object.keys(errors).length){render();return;}
  state.courseBusy=true;render();
  try{
    const existing=state.courseEditingId?state.courses.find(c=>c.id===state.courseEditingId):null;
    if(state.courseEditingId&&!existing)throw new Error('編集対象のコースがなくなりました。');
    const now=new Date().toISOString();
    const id=existing?.id??newCourseId();
    const imageChange=state.coursePhotoChange;
    const record={...course,id,photoId:imageChange===null?null:
      (imageChange instanceof Blob?`course-cover:${id}`:(existing?.photoId??null)),
      createdAt:existing?.createdAt??now,updatedAt:now,sourceType:'manual',sourceCheckedAt:null};
    await saveCourseAtomic(record,imageChange);
    state.courses=await getAllRecords('courses');
    refreshCoursePhotos(await getAllRecords('photos'));
    clearCourseForm();state.courseView='detail';state.courseSelectedId=id;
    state.courseTeeId=record.tees[0]?.id??null;
    state.courseToast=existing?'コースの変更を保存しました。':'ゴルフ場を登録しました。';
  }catch(err){state.courseErrors={general:`保存できませんでした。入力内容は残しています。 ${err?.message||'不明なエラー'}`};}
  finally{state.courseBusy=false;render();}
}
async function removeCourse(){
  if(state.courseBusy||!state.courseSelectedId)return;
  const course=state.courses.find(c=>c.id===state.courseSelectedId);
  if(!course)return;
  if(!window.confirm(`「${course.name}」を削除しますか？登録写真も削除されます。この操作は取り消せません。`))return;
  state.courseBusy=true;render();
  try{
    await deleteCourseSafely(course.id);
    state.courses=await getAllRecords('courses');
    refreshCoursePhotos(await getAllRecords('photos'));
    state.courseView='list';state.courseSelectedId=null;state.courseTeeId=null;
    state.courseToast='ゴルフ場を削除しました。';state.courseError='';
  }catch(err){state.courseError=err?.message||'削除に失敗しました。';}
  finally{state.courseBusy=false;render();}
}
function handleCourseAction(button){
  if(state.courseBusy)return;
  const action=button.dataset.courseAction;
  if(action==='start-round'){const course=state.courses.find(c=>c.id===state.courseSelectedId);if(course){openRoundForm(course.id,state.courseTeeId);location.hash='#records';}return;}
  if(action==='new')return openCourseForm();
  if(action==='detail'){
    const course=state.courses.find(c=>c.id===button.dataset.courseId);
    if(!course){state.courseError='コースが見つかりません。';render();return;}
    state.courseView='detail';state.courseSelectedId=course.id;
    state.courseTeeId=course.tees[0]?.id??null;state.courseError='';state.courseToast='';render();window.scrollTo(0,0);return;
  }
  if(action==='back'){state.courseView='list';state.courseSelectedId=null;state.courseError='';state.courseToast='';render();window.scrollTo(0,0);return;}
  if(action==='edit')return openCourseForm(state.courseSelectedId);
  if(action==='cancel')return closeCourseForm();
  if(action==='delete'){void removeCourse();return;}
  if(action==='add-tee'){
    const id=newTeeId();state.courseDraft.tees.push({id,name:'',distances:{}});
    state.courseDirty=true;state.courseErrors={};render();return;
  }
  if(action==='remove-tee'){
    if(state.courseDraft.tees.length<=1)return;
    state.courseDraft.tees=state.courseDraft.tees.filter(t=>t.id!==button.dataset.teeId);
    state.courseDirty=true;state.courseErrors={};render();return;
  }
  if(action==='remove-photo'){
    if(state.coursePhotoUrl)URL.revokeObjectURL(state.coursePhotoUrl);
    state.coursePhotoUrl=null;state.coursePhotoChange=null;state.courseDirty=true;
    render();return;
  }
}
const scoreWrites=new Map();
let scoreFlushing=false;
function refreshRoundPhotos(records){
  for(const url of state.roundPhotoUrls.values())URL.revokeObjectURL(url);
  state.roundPhotoUrls=new Map();
  state.roundPhotos=records.filter(p=>p.ownerType==='round'&&p.ownerId);
  for(const p of state.roundPhotos){
    const thumbnail=p.thumbnailBlob instanceof Blob?p.thumbnailBlob:p.blob;
    if(thumbnail instanceof Blob)state.roundPhotoUrls.set(p.id,URL.createObjectURL(thumbnail));
  }
}
async function reloadRoundPhotos(){refreshRoundPhotos(await getAllRecords('photos'));}
function roundPhotoView(id){return roundPhotosFor(state.roundPhotos,id);}
function resetRoundMediaDraft(round){
  state.roundNotesDraft=String(round?.notes??'');state.roundNotesDirty=false;
  state.roundNotesError='';state.roundMediaError='';
}
function discardNotesWarning(){
  return !state.roundNotesDirty || window.confirm('未保存のラウンドメモを破棄しますか？');
}
function refreshRoundData(){
  return Promise.all([getAllRecords('rounds'),getAllRecords('roundPlayers'),getAllRecords('holeScores')]).then(([rounds,players,scores])=>{state.rounds=rounds;state.roundPlayers=players;state.holeScores=scores;});
}
function roundCurrent(){return state.rounds.find(r=>r.id===state.roundSelectedId);}
function openRoundForm(courseId=null,teeId=null){
  const course=state.courses.find(c=>c.id===courseId)|| (state.courses.length===1?state.courses[0]:null);
  state.roundDraft={date:localDate(),courseId:course?.id??'',teeId:course?.tees.some(t=>t.id===teeId)?teeId:(course?.tees[0]?.id??''),weather:'',setId:state.settings?.activeSetId&&state.sets.some(s=>s.id===state.settings.activeSetId)?state.settings.activeSetId:'',companions:[]};
  state.roundView='form';state.roundSelectedId=null;state.roundDirty=false;state.roundErrors={};state.roundToast='';state.roundError='';render();window.scrollTo(0,0);
}
function closeRoundForm(force=false){
  if(!force&&state.roundDirty&&!window.confirm('保存していないラウンド情報を破棄しますか？'))return;
  state.roundDirty=false;state.roundDraft=null;state.roundView='list';state.roundErrors={};state.roundError='';render();window.scrollTo(0,0);
}
async function submitRound(){
  if(state.roundBusy||!state.roundDraft)return;
  const errors=validateRoundDraft(state.roundDraft,state.courses,state.sets);
  state.roundErrors=errors;if(Object.keys(errors).length){render();return;}
  state.roundBusy=true;render();
  try{
    const course=state.courses.find(c=>c.id===state.roundDraft.courseId);
    const set=state.sets.find(s=>s.id===state.roundDraft.setId);
    const records=createRoundRecords(state.roundDraft,course,set,state.clubs);
    await createRoundAtomic(records);
    await refreshRoundData();state.roundSelectedId=records.round.id;state.roundView='holes';state.roundHoleIndex=0;
    state.roundDraft=null;state.roundDirty=false;resetRoundMediaDraft(records.round);state.roundToast='ラウンドを作成しました。打数を入力してください。';state.roundError='';state.roundSaveStatus='保存済み';
  }catch(err){state.roundErrors={general:err?.message||'ラウンドを作成できませんでした。'};}
  finally{state.roundBusy=false;render();window.scrollTo(0,0);}
}
function openRoundDetail(id){
  if(!state.rounds.some(r=>r.id===id)||!discardNotesWarning())return;
  resetRoundMediaDraft(state.rounds.find(r=>r.id===id));
  state.roundSelectedId=id;state.roundView='detail';state.roundError='';state.roundToast='';state.roundPlayerError='';state.roundAddPlayer=false;state.roundEditingPlayerId=null;
  if(state.route!=='records')location.hash='#records';else {render();window.scrollTo(0,0);}
}
// Stage 11: album processing uses the same renderer for previews and final exports.
function albumReleasePreviews(){for(const url of state.albumPreviews)URL.revokeObjectURL(url);state.albumPreviews=[];}
function albumModel(){const round=roundCurrent();if(!round||!state.albumPreset)throw Error('ラウンドまたはアルバム設定がありません。');return buildAlbumModel(round,state.roundPlayers.filter(p=>p.roundId===round.id).sort((a,b)=>a.order-b.order),state.holeScores.filter(s=>s.roundId===round.id),roundPhotoView(round.id),state.albumPreset);}
async function refreshAlbumPreview(){
 const version=++state.albumPreviewVersion;
 state.albumPreviewBusy=true;
 let images;
 try{
  const model=albumModel();images=await loadAlbumImages(model);
  const format=state.albumPreset.format;
  const kinds=format==='pdf'?albumPages(model):['combined'];
  const next=[];
  for(const kind of kinds){const dims=format==='pdf'?{width:680,height:965}:{width:675,height:1200};const cv=drawAlbumPage(model,kind,images,dims);const blob=await canvasJpeg(cv,.79);cv.width=cv.height=0;next.push(URL.createObjectURL(blob));}
  if(version!==state.albumPreviewVersion||state.roundView!=='album'){next.forEach(URL.revokeObjectURL);return;}
  albumReleasePreviews();state.albumPreviews=next;
  const holder=document.getElementById('album-previews');if(holder)holder.innerHTML=next.map((url,i)=>`<figure><img src="${url}" alt="アルバム ${i+1}ページのプレビュー"><figcaption>${i+1} / ${next.length}</figcaption></figure>`).join('');
 }catch(err){if(version===state.albumPreviewVersion){state.albumError=err?.message||'プレビュー生成に失敗しました。';const holder=document.getElementById('album-previews');if(holder)holder.textContent=state.albumError;}}
 finally{if(images)closeAlbumImages(images);if(version===state.albumPreviewVersion)state.albumPreviewBusy=false;}
}
function openAlbum(){
 const round=roundCurrent();if(!round||!discardNotesWarning())return;
 if(state.roundPhotoBusy||scoreWrites.size){state.roundError='保存中の項目があります。完了してからアルバムを開いてください。';render();return;}
 const players=state.roundPlayers.filter(p=>p.roundId===round.id).sort((a,b)=>a.order-b.order);
 const saved=state.albumPresets.filter(p=>p.roundId===round.id).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
 state.albumPreset=sanitizeAlbumPreset(saved??defaultAlbumPreset(round,players,roundPhotoView(round.id)),round,players,roundPhotoView(round.id));
 state.albumError='';state.albumStatus='';state.albumShareWarning=false;state.albumCropOpen=false;albumReleasePreviews();state.roundView='album';render();window.scrollTo(0,0);void refreshAlbumPreview();
}
function albumChanged(){
 const y=window.scrollY;state.albumError='';state.albumStatus='';state.albumShareWarning=false;
 const round=roundCurrent();state.albumPreset=sanitizeAlbumPreset(state.albumPreset,round,state.roundPlayers.filter(x=>x.roundId===round.id),roundPhotoView(round.id));
 albumReleasePreviews();render();window.scrollTo(0,y);void refreshAlbumPreview();
}
async function albumSave(){
 if(state.albumBusy)return;
 state.albumBusy=true;state.albumError='';state.albumStatus='';render();
 try{const record={...state.albumPreset,updatedAt:new Date().toISOString()};await putRecord('albumPresets',record);state.albumPresets=[...state.albumPresets.filter(x=>x.id!==record.id),record];state.albumStatus='アルバム設定を保存しました。';}
 catch(err){state.albumError=err?.message||'アルバム設定を保存できませんでした。';}
 finally{state.albumBusy=false;render();}
}
function albumFileName(ext){const round=roundCurrent();return `GOLF-JOURNAL_${round?.playedOn||'round'}_${(round?.courseSnapshot.name||'golf').replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龠ー_-]/g,'_').slice(0,30)}.${ext}`;}
function browserDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function albumExport(share=false){
 if(state.albumBusy)return;
 let model;
 try{model=albumModel();if(state.albumPreset.format==='jpeg'&&jpegIssue(model))throw Error(jpegIssue(model));}
 catch(err){state.albumError=err.message;render();return;}
 state.albumBusy=true;state.albumError='';state.albumStatus='';state.albumShareWarning=false;render();
 try{
  const format=state.albumPreset.format,result=await renderAlbumFiles(model,format),name=albumFileName(format==='jpeg'?'jpg':'pdf');
  if(share&&typeof navigator.share==='function'&&typeof File==='function'){
   const file=new File([result.blob],name,{type:result.mime});
   if(!navigator.canShare||navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:'GOLF JOURNAL'});state.albumStatus='共有画面を開きました。';return;}
    catch(err){if(err?.name==='AbortError'){state.albumStatus='共有をキャンセルしました。';return;}state.albumStatus='共有シートを利用できなかったためファイルをダウンロードします。';}
   }
  }
  browserDownload(result.blob,name);if(!state.albumStatus)state.albumStatus=`${format==='jpeg'?'JPEG':'A5 PDF'}を生成しました。`; 
 }catch(err){state.albumError=err?.message||'ファイルを生成できませんでした。';}
 finally{state.albumBusy=false;render();}
}
function handleAlbumAction(button){
 const action=button.dataset.albumAction,id=button.dataset.id;
 if(action==='back'){state.albumPreviewVersion++;albumReleasePreviews();state.albumShareWarning=false;state.roundView='detail';render();window.scrollTo(0,0);return;}
 if(action==='share'){state.albumShareWarning=true;render();return;}
 if(action==='cancel-share'){state.albumShareWarning=false;render();return;}
 if(action==='confirm-share'){void albumExport(true);return;}
 if(action==='download'){void albumExport(false);return;}
 if(action==='save'){void albumSave();return;}
 if(action==='new'){
  state.albumPreset=defaultAlbumPreset(roundCurrent(),state.roundPlayers.filter(p=>p.roundId===state.roundSelectedId),roundPhotoView(state.roundSelectedId));albumChanged();return;
 }
 if(action==='load'){const p=state.albumPresets.find(p=>p.id===id&&p.roundId===state.roundSelectedId);if(p){state.albumPreset={...p};albumChanged();}return;}
 if(action==='delete'){
  if(!window.confirm('保存したアルバム設定を削除しますか？'))return;
  void deleteRecord('albumPresets',id).then(()=>{state.albumPresets=state.albumPresets.filter(p=>p.id!==id);if(state.albumPreset.id===id)state.albumPreset=defaultAlbumPreset(roundCurrent(),state.roundPlayers.filter(p=>p.roundId===state.roundSelectedId),roundPhotoView(state.roundSelectedId));albumChanged();}).catch(err=>{state.albumError=err.message;render();});return;
 }
 if(action==='color'){state.albumPreset.color=button.dataset.value;albumChanged();return;}
 if(action==='photo-up'||action==='photo-down'){const i=state.albumPreset.photoIds.indexOf(id),j=i+(action==='photo-up'?-1:1);if(j<0||j>=state.albumPreset.photoIds.length)return;[state.albumPreset.photoIds[i],state.albumPreset.photoIds[j]]=[state.albumPreset.photoIds[j],state.albumPreset.photoIds[i]];albumChanged();}
}
function handleAlbumChange(el){
 if(!state.albumPreset)return false;
 if(el.dataset.albumField){state.albumPreset[el.dataset.albumField]=el.value;albumChanged();return true;}
 if(el.dataset.albumCompanion){state.albumPreset.companions[el.dataset.albumCompanion]??={nameVisible:false,scoreLevel:'none'};
  state.albumPreset.companions[el.dataset.albumCompanion][el.dataset.part]=el.dataset.part==='nameVisible'?el.checked:el.value;albumChanged();return true;}
 if(el.dataset.albumPhoto){const id=el.dataset.albumPhoto,ids=state.albumPreset.photoIds;
  if(el.checked&&ids.length>=5){el.checked=false;state.albumError='写真は最大5枚まで選択できます。';render();return true;}
  state.albumPreset.photoIds=el.checked?[...ids,id]:ids.filter(x=>x!==id);albumChanged();return true;}
 if(el.dataset.albumCrop){state.albumPreset.crops??={};const crop=state.albumPreset.crops[el.dataset.albumCrop]??={x:.5,y:.5,zoom:1};crop[el.dataset.axis]=Number(el.value);albumChanged();return true;}
 return false;
}
function openRoundHole(index=0){
  const round=roundCurrent();if(!round||!discardNotesWarning())return;
  state.roundHoleIndex=Math.max(0,Math.min(index,round.holeCount-1));state.roundView='holes';state.roundError='';state.roundToast='';render();window.scrollTo(0,0);
}
function scoreIndicator(){const el=document.getElementById('score-save-status');if(el)el.textContent=state.roundSaveStatus;}
async function flushScoreWrites(){
  if(scoreFlushing)return;
  scoreFlushing=true;
  if(scoreWrites.size){state.roundSaveStatus='保存中…';scoreIndicator();}
  while(scoreWrites.size){
    const [id,record]=scoreWrites.entries().next().value;
    scoreWrites.delete(id);
    try{await putRecord('holeScores',record);}
    catch(err){if(!scoreWrites.has(id))scoreWrites.set(id,record);state.roundSaveStatus='未保存';state.roundError=`スコアを保存できませんでした。再試行してください。 ${err?.message||''}`;scoreFlushing=false;render();return;}
  }
  scoreFlushing=false;state.roundSaveStatus='保存済み';scoreIndicator();
}
function updateScore(playerId,holeNumber,field,value){
  if(!roundCurrent()||!state.roundPlayers.some(p=>p.id===playerId&&p.roundId===state.roundSelectedId))return;
  try{
    const cleaned=cleanScore(value,{optional:field==='putts'});
    const id=scoreId(state.roundSelectedId,playerId,holeNumber);
    const current=state.holeScores.find(s=>s.id===id);
    if(!current)throw new Error('スコアが見つかりません。');
    if(current[field]===cleaned)return;
    const updated={...current,[field]:cleaned,updatedAt:new Date().toISOString()};
    state.holeScores=state.holeScores.map(s=>s.id===id?updated:s);
    scoreWrites.set(id,updated);state.roundSaveStatus='保存中…';state.roundError='';
    const y=window.scrollY;render();window.scrollTo(0,y);void flushScoreWrites();
  }catch(err){state.roundError=err?.message||'打数を確認してください。';render();}
}
async function removeRound(){
  if(state.roundBusy||!roundCurrent())return;
  const r=roundCurrent();if(scoreWrites.size){state.roundError='スコア保存中です。保存完了後に削除してください。';render();return;}
  if(!window.confirm(`「${r.courseSnapshot.name}」の${r.playedOn}の記録を削除しますか？同伴者、スコア、写真もすべて削除されます。`))return;
  state.roundBusy=true;render();
  try{await deleteRoundAtomic(r.id);await refreshRoundData();await reloadRoundPhotos();resetRoundMediaDraft(null);state.roundView='list';state.roundSelectedId=null;state.roundToast='ラウンドを削除しました。';state.roundError='';}
  catch(err){state.roundError=err?.message||'削除に失敗しました。';}
  finally{state.roundBusy=false;render();window.scrollTo(0,0);}
}
async function savePlayerName(){
  if(state.roundBusy)return;
  const player=state.roundPlayers.find(p=>p.id===state.roundEditingPlayerId&&p.roundId===state.roundSelectedId&&!p.isSelf);
  const name=state.roundPlayerDraft.trim();if(!player||!name||name.length>40){state.roundPlayerError='同伴者名は1〜40文字で指定してください。';render();return;}
  state.roundBusy=true;
  try{await putRecord('roundPlayers',{...player,name,updatedAt:new Date().toISOString()});await refreshRoundData();state.roundEditingPlayerId=null;state.roundPlayerDraft='';state.roundPlayerError='';state.roundToast='同伴者名を変更しました。';}
  catch(err){state.roundPlayerError=err?.message||'名前を保存できませんでした。';}
  finally{state.roundBusy=false;render();}
}
async function addLatePlayer(){
  if(state.roundBusy)return;
  const round=roundCurrent(),name=state.roundPlayerDraft.trim();
  if(!round||!name||name.length>40){state.roundPlayerError='同伴者名は1〜40文字で指定してください。';render();return;}
  const people=state.roundPlayers.filter(p=>p.roundId===round.id);
  if(people.length>=4){state.roundPlayerError='4名まで登録できます。';render();return;}
  state.roundBusy=true;
  try{
    const now=new Date().toISOString(),id=newRoundPlayerId();
    const player={id,roundId:round.id,name,isSelf:false,order:Math.max(...people.map(p=>p.order))+1,createdAt:now,updatedAt:now};
    const scores=round.courseSnapshot.holes.map(h=>({id:scoreId(round.id,id,h.number),roundId:round.id,playerId:id,holeNumber:h.number,strokes:null,putts:null,updatedAt:now}));
    await addRoundPlayerAtomic(round,player,scores);await refreshRoundData();state.roundAddPlayer=false;state.roundPlayerDraft='';state.roundPlayerError='';state.roundToast='同伴者を追加しました。';
  }catch(err){state.roundPlayerError=err?.message||'同伴者を追加できませんでした。';}
  finally{state.roundBusy=false;render();}
}
async function removeLatePlayer(id){
  if(state.roundBusy||scoreWrites.size)return;
  const player=state.roundPlayers.find(p=>p.id===id&&p.roundId===state.roundSelectedId&&!p.isSelf);if(!player)return;
  if(!window.confirm(`「${player.name}」とそのホール別スコアを削除しますか？`))return;
  state.roundBusy=true;
  try{await deleteRoundPlayerAtomic(state.roundSelectedId,id);await refreshRoundData();state.roundPlayerError='';state.roundToast='同伴者とスコアを削除しました。';}
  catch(err){state.roundPlayerError=err?.message||'同伴者を削除できませんでした。';}
  finally{state.roundBusy=false;render();}
}
async function storeRoundPhotos(fileList){
  const round=roundCurrent();if(!round||state.roundPhotoBusy||!fileList?.length)return;
  const files=Array.from(fileList);const existing=roundPhotoView(round.id);
  if(existing.length+files.length>MAX_ROUND_PHOTOS){state.roundMediaError=`写真は${MAX_ROUND_PHOTOS}枚まで登録できます。`;render();return;}
  state.roundPhotoBusy=true;state.roundMediaError='';render();
  try{
    const prepared=[];
    for(const file of files){
      const output=await prepareRoundPhoto(file);const now=new Date().toISOString();
      prepared.push({id:roundPhotoId(),ownerType:'round',ownerId:round.id,
        blob:output.blob,thumbnailBlob:output.thumbnailBlob,width:output.width,height:output.height,
        createdAt:now,updatedAt:now});
    }
    await addRoundPhotosAtomic(round.id,prepared);
    await reloadRoundPhotos();await refreshRoundData();
    state.roundToast=`${prepared.length}枚の写真を保存しました。`;state.roundMediaError='';
  }catch(err){state.roundMediaError=`写真を保存できませんでした。${err?.message||''}`;}
  finally{state.roundPhotoBusy=false;render();}
}
async function removeRoundPhoto(id){
  const round=roundCurrent();if(!round||state.roundPhotoBusy||!roundPhotoView(round.id).some(p=>p.id===id))return;
  if(!window.confirm('この写真をラウンドから削除しますか？この操作は取り消せません。'))return;
  state.roundPhotoBusy=true;state.roundMediaError='';render();
  try{await deleteRoundPhotoAtomic(round.id,id);await reloadRoundPhotos();await refreshRoundData();state.roundToast='写真を削除しました。';}
  catch(err){state.roundMediaError=err?.message||'写真を削除できませんでした。';}
  finally{state.roundPhotoBusy=false;render();}
}
async function reorderRoundPhoto(id,direction){
  const round=roundCurrent();if(!round||state.roundPhotoBusy)return;
  const order=roundPhotoView(round.id);const next=moveRoundPhoto(order,id,direction);
  if(next.join('|')===order.map(p=>p.id).join('|'))return;
  state.roundPhotoBusy=true;state.roundMediaError='';
  try{await reorderRoundPhotosAtomic(round.id,next);await reloadRoundPhotos();await refreshRoundData();}
  catch(err){state.roundMediaError=err?.message||'写真の順序を保存できませんでした。';}
  finally{state.roundPhotoBusy=false;render();}
}
async function saveRoundNotes(){
  const round=roundCurrent();if(!round||state.roundNotesBusy||!state.roundNotesDirty)return;
  let value;
  try{value=validateRoundNotes(state.roundNotesDraft);}catch(err){state.roundNotesError=err.message;render();return;}
  state.roundNotesBusy=true;state.roundNotesError='';render();
  try{
    const saved=await saveRoundNotesAtomic(round.id,value);
    state.rounds=state.rounds.map(r=>r.id===round.id?saved:r);
    state.roundNotesDraft=value;state.roundNotesDirty=false;state.roundToast='ラウンドメモを保存しました。';
  }catch(err){state.roundNotesError=err?.message||'メモの保存に失敗しました。未保存の内容は残っています。';}
  finally{state.roundNotesBusy=false;render();}
}
function handleRoundAction(button){
  if(state.roundBusy)return;
  const action=button.dataset.roundAction;
  if(state.roundPhotoBusy&&['new','back','delete','detail','resume','prev-hole','next-hole','goto-hole','edit-hole'].includes(action))return;
  if(action==='album')return openAlbum();
  if(action==='save-notes'){void saveRoundNotes();return;}
  if(action==='photo-delete'){void removeRoundPhoto(button.dataset.photoId);return;}
  if(action==='photo-up'||action==='photo-down'){void reorderRoundPhoto(button.dataset.photoId,action==='photo-up'?-1:1);return;}
  if(action==='new')return openRoundForm();
  if(action==='cancel-form')return closeRoundForm();
  if(action==='add-companion'){if(state.roundDraft.companions.length<3){state.roundDraft.companions.push('');state.roundDirty=true;render();}return;}
  if(action==='remove-companion'){state.roundDraft.companions.splice(Number(button.dataset.index),1);state.roundDirty=true;render();return;}
  if(action==='detail')return openRoundDetail(button.dataset.roundId||state.roundSelectedId);
  if(action==='back'){if(!discardNotesWarning())return;resetRoundMediaDraft(null);state.roundView='list';state.roundSelectedId=null;state.roundToast='';state.roundError='';render();window.scrollTo(0,0);return;}
  if(action==='resume'){if(!discardNotesWarning())return;const r=roundCurrent(),me=state.roundPlayers.find(p=>p.roundId===r?.id&&p.isSelf);const ix=r?.courseSnapshot.holes.findIndex(h=>roundScoreFor(state.holeScores,me?.id,h.number)?.strokes===null);return openRoundHole(ix>=0?ix:0);}
  if(action==='prev-hole')return openRoundHole(state.roundHoleIndex-1);
  if(action==='next-hole'){if(state.roundHoleIndex>=roundCurrent().holeCount-1){state.roundView='detail';render();window.scrollTo(0,0);}else openRoundHole(state.roundHoleIndex+1);return;}
  if(action==='goto-hole')return openRoundHole(Number(button.dataset.holeIndex));
  if(action==='edit-hole'){if(!discardNotesWarning())return;const ix=roundCurrent().courseSnapshot.holes.findIndex(h=>h.number===Number(button.dataset.holeNumber));return openRoundHole(ix);}
  if(action==='adjust-score'){
    const round=roundCurrent();if(!round)return;
    const p=button.dataset.playerId,h=round.courseSnapshot.holes[state.roundHoleIndex].number;
    const existing=roundScoreFor(state.holeScores,p,h)?.strokes??null;
    const next=existing===null?(Number(button.dataset.change)>0?1:null):Math.max(1,Math.min(30,existing+Number(button.dataset.change)));
    if(next!==null)updateScore(p,h,'strokes',next);return;
  }
  if(action==='delete'){void removeRound();return;}
  if(action==='retry'){state.roundError='';void flushScoreWrites();render();return;}
  if(action==='add-player'){state.roundAddPlayer=true;state.roundEditingPlayerId=null;state.roundPlayerDraft='';state.roundPlayerError='';render();return;}
  if(action==='rename-player'){state.roundEditingPlayerId=button.dataset.playerId;state.roundAddPlayer=false;state.roundPlayerDraft=state.roundPlayers.find(p=>p.id===button.dataset.playerId)?.name??'';state.roundPlayerError='';render();return;}
  if(action==='cancel-player'){state.roundEditingPlayerId=null;state.roundAddPlayer=false;state.roundPlayerDraft='';state.roundPlayerError='';render();return;}
  if(action==='remove-player'){void removeLatePlayer(button.dataset.playerId);return;}
}
function handleRoute() {
  const next = normalizeRoute(location.hash);
  if(state.route==='courses' && state.courseView==='form' && next!=='courses' && state.courseDirty){
    if(!window.confirm('未保存のコース情報を破棄して移動しますか？')){location.hash='#courses';return;}
  }
  if(state.route==='courses'&&next!=='courses'&&state.courseView==='form'){clearCourseForm();state.courseView='list';}
  if (state.route==='profile' && state.dirty && next!=='profile' && isProfileComplete(state.profile)) {
    if (!window.confirm('保存していない変更があります。破棄して移動しますか？')) {
      location.hash = '#profile';
      return;
    }
    resetDraft();
  }
  if (state.route==='clubs' && state.clubView==='form' && next!=='clubs' && state.clubDirty) {
    if (!window.confirm('保存していないクラブ情報があります。破棄して移動しますか？')) {
      location.hash = '#clubs';
      return;
    }
  }
  if (state.route==='clubs' && next!=='clubs' && state.clubView==='form') {
    state.clubView='list';state.clubDirty=false;state.clubEditingId=null;state.clubDraft=null;
  }
  if (state.route==='sets' && next!=='sets' && state.setView==='form' && state.setDirty) {
    if (!window.confirm('保存していないセット情報があります。破棄して移動しますか？')) {location.hash='#sets';return;}
  }
  if(state.route==='sets' && next!=='sets' && state.setView==='form') {
    state.setView='list';state.setDirty=false;state.setEditingId=null;state.setDraft=null;
  }
  if(state.route==='shots'&&next!=='shots'&&state.shotView==='form'&&state.shotDirty){
    if(!window.confirm('保存していないショット情報があります。破棄して移動しますか？')){location.hash='#shots';return;}
  }
  if(state.route==='shots'&&next!=='shots'&&state.shotView==='form'){state.shotView='list';state.shotDirty=false;state.shotEditingId=null;state.shotDraft=null;}
  if(state.route==='records'&&next!=='records'&&state.roundView==='form'&&state.roundDirty){
    if(!window.confirm('保存していないラウンド情報を破棄して移動しますか？')){location.hash='#records';return;}
  }
  if(state.route==='records'&&next!=='records'&&state.roundPhotoBusy){location.hash='#records';return;}
  if(state.route==='records'&&next!=='records'&&state.roundNotesDirty){
    if(!discardNotesWarning()){location.hash='#records';return;}resetRoundMediaDraft(null);
  }
  if(state.route==='backup'&&next!=='backup'){state.backupPreview=null;state.backupError='';state.backupStatus='';}
  if(state.route==='records'&&next!=='records'&&state.roundView==='album'){state.albumPreviewVersion++;albumReleasePreviews();state.albumShareWarning=false;state.roundView='detail';}
  if(state.route==='records'&&next!=='records'&&state.roundView==='form'){state.roundView='list';state.roundDraft=null;state.roundDirty=false;}
  if(next!=='tips'){state.tipTocOpen=false;state.tipZoom=null;}
  state.route = next;
  if(next==='backup')void refreshBackupCounts().then(()=>{if(state.route==='backup')render();}).catch(error=>{state.backupError=error?.message||'データを読み込めません。';if(state.route==='backup')render();});
  state.toast = '';
  state.errors = {};
  if (next === 'profile') resetDraft();
  render();
  window.scrollTo(0,0);
}
async function submitProfile() {
  if (state.busy) return;
  const clean = cleanProfile(state.draft);
  const errors = validateProfile(clean);
  state.errors = errors;
  state.toast = '';
  if (Object.keys(errors).length) { render(); return; }
  state.busy = true;
  render();
  try {
    const wasOnboarding = !isProfileComplete(state.profile);
    const saved = await saveProfile(clean);
    state.profile = saved;
    state.dirty = false;
    resetDraft();
    if (wasOnboarding) {
      state.route = 'home';
      location.hash = '#home';
      state.toast = '';
    } else {
      state.toast = 'プロフィールを保存しました。';
    }
  } catch (error) {
    state.errors = {general: `保存に失敗しました。入力内容は残っています。再度お試しください。 (${error?.message||'不明なエラー'})`};
  } finally {
    state.busy = false;
    render();
  }
}


function tipHandedness(){return state.tipHand ?? (state.profile?.handedness==='left'?'left':'right');}
function focusTipDialog(){document.querySelector('.tips-layer .tip-toc-close')?.focus({preventScroll:true});}
function closeTipLayer(){
  state.tipZoom=null;state.tipTocOpen=false;
  document.querySelector('.tips-layer')?.remove();document.documentElement.classList.remove('tip-modal-open');
  document.querySelector('.tip-floating-toc, .tip-toc-index')?.focus({preventScroll:true});
}
function openTipArticle(id){
  if(!tipArticle(id))return;
  state.tipArticleId=id;state.tipTocOpen=false;state.tipZoom=null;
  render();window.scrollTo(0,0);
  document.querySelector('.tip-article-cover h1')?.setAttribute('tabindex','-1');
  document.querySelector('.tip-article-cover h1')?.focus({preventScroll:true});
}
function jumpTipSection(id){
  const el=document.getElementById('tip-head-'+id);
  if(!el)return;
  closeTipLayer();
  const section=document.getElementById('tip-sec-'+id);
  section?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  el.focus({preventScroll:true});
}
function handleTipAction(button){
  const action=button.dataset.tipAction;
  if(action==='open'){openTipArticle(button.dataset.tipId);return;}
  if(action==='back'){state.tipArticleId=null;state.tipTocOpen=false;state.tipZoom=null;render();window.scrollTo(0,0);return;}
  if(action==='category'){state.tipCategory=state.tipCategory===button.dataset.tipCategory?'all':button.dataset.tipCategory;render();return;}
  if(action==='reset'){state.tipCategory='all';state.tipQuery='';render();return;}
  if(action==='toc'){state.tipTocOpen=true;state.tipZoom=null;state.tipTocTab=state.tipArticleId?'article':'all';state.tipTocQuery='';render();focusTipDialog();return;}
  if(action==='close-toc'||action==='close-zoom'){closeTipLayer();return;}
  if(action==='tab'){state.tipTocTab=button.dataset.tipTab;render();focusTipDialog();return;}
  if(action==='expand'){
    state.tipTocExpanded=state.tipTocExpanded===button.dataset.tipCategory?'':button.dataset.tipCategory;
    const scrollTop=document.getElementById('tip-toc-tree')?.scrollTop??0;
    render();const tree=document.getElementById('tip-toc-tree');if(tree)tree.scrollTop=scrollTop;return;
  }
  if(action==='jump'){jumpTipSection(button.dataset.tipSection);return;}
  if(action==='zoom'){state.tipZoom=button.dataset.tipDiagram;state.tipTocOpen=false;render();focusTipDialog();return;}
  if(action==='hand'){
    const scrollY=window.scrollY;
    state.tipHand=button.dataset.tipHand;render();
    if(!state.tipZoom)window.scrollTo(0,scrollY);else focusTipDialog();
  }
}

// Stage 9: non-destructive, queued scenario auto-save. Uses the pre-existing strategies store.
let strategyWriteQueue=Promise.resolve();
function strategyStatusDom(){
 const box=document.querySelector('[data-strategy-save-status]');
 if(box){const span=box.querySelector('span');if(span)span.textContent=state.strategyStatus;box.classList.toggle('has-error',state.strategyStatus.includes('失敗')||state.strategyStatus.includes('確認'));}
}
function ensureStrategyDraft(){
 if(!state.strategyDraft){state.strategyDraft=newStrategyDraft(state.sets.some(s=>s.id===state.settings?.activeSetId)?state.settings.activeSetId:null);state.strategyId=newStrategyId();state.strategyCreatedAt=new Date().toISOString();}
}
function requestStrategySave(){
 ensureStrategyDraft();
 const validation=validateStrategy(state.strategyDraft,state.sets);
 if(Object.keys(validation).length){state.strategyErrors=validation;state.strategyStatus='入力値を確認';strategyStatusDom();return Promise.resolve(false);}
 const record=strategyRecord(state.strategyDraft,{id:state.strategyId,createdAt:state.strategyCreatedAt});
 const revision=state.strategyRevision;
 state.strategyStatus='保存中…';strategyStatusDom();
 const saving=strategyWriteQueue.catch(()=>{}).then(async()=>{
   await putRecord('strategies',record);
   const index=state.strategyRecords.findIndex(r=>r.id===record.id);
   if(index<0)state.strategyRecords.push(record);else state.strategyRecords[index]=record;
   if(state.strategyId===record.id&&revision===state.strategyRevision){state.strategyStatus='保存済み';state.strategyError='';state.strategyDirty=false;strategyStatusDom();}
   return true;
 }).catch(err=>{
   if(state.strategyId===record.id){state.strategyStatus='保存失敗';state.strategyError=`保存できませんでした。入力は保持しています。再試行してください。 ${err?.message||''}`;strategyStatusDom();}
   return false;
 });
 strategyWriteQueue=saving;
 return saving;
}
function strategyModified(repaint=true){
 state.strategyDirty=true;state.strategyRevision++;state.strategyErrors={};state.strategyError='';
 void requestStrategySave();
 if(repaint){const scroll=window.scrollY;render();window.scrollTo(0,scroll);}
}
function strategyFirstError(errors){
 if(errors.setId)return 0;
 if(errors.targetYards||errors.requiredCarryYards)return 1;
 if(errors['bunker.lipCm'])return 2;
 if(errors.elevationYards)return 5;
 return 1;
}
function strategyValidationGate(fromReview=false){
 const errors=validateStrategy(state.strategyDraft,state.sets);
 state.strategyErrors=errors;
 if(Object.keys(errors).length){
   state.strategyStatus='入力値を確認';state.strategyError='赤字の入力項目を修正してください。';
   if(!fromReview)state.strategyStep=strategyFirstError(errors);
   render();return false;
 }
 return true;
}
function strategyStartNew(){
 if(state.strategyDirty&&!window.confirm('未保存の入力を破棄して新しい条件を作りますか？'))return;
 const active=state.sets.some(s=>s.id===state.settings?.activeSetId)?state.settings.activeSetId:null;
 state.strategyDraft=newStrategyDraft(active);state.strategyId=newStrategyId();state.strategyCreatedAt=new Date().toISOString();
 state.strategyView='wizard';state.strategyExpandedAlt=null;state.strategyAddressView='front';state.strategyStep=0;state.strategyErrors={};state.strategyError='';state.strategyStatus='未保存';state.strategyDirty=false;state.strategyRevision=0;
 render();window.scrollTo(0,0);
}
async function strategyDelete(id){
 const record=state.strategyRecords.find(r=>r.id===id);if(!record)return;
 if(!window.confirm('この保存済み攻略条件を削除しますか？'))return;
 await strategyWriteQueue;
 try{await deleteRecord('strategies',id);state.strategyRecords=state.strategyRecords.filter(x=>x.id!==id);
  if(id===state.strategyId){state.strategyDraft=null;strategyStartNew();return;}
  state.strategyError='';render();
 }catch(err){state.strategyError=`削除に失敗しました。 ${err?.message||''}`;render();}
}
async function strategyResult(){
 ensureStrategyDraft();
 if(!strategyValidationGate(true))return;
 const ok=await requestStrategySave();
 if(!ok){render();return;}
 state.strategyView='result';state.strategyExpandedAlt=null;state.strategyAddressView='front';render();window.scrollTo(0,0);
}
function handleStrategyAction(button){
 const action=button.dataset.strategyAction;
 ensureStrategyDraft();
 if(action==='new'){strategyStartNew();return;}
 if(action==='save'){void requestStrategySave().then(()=>render());return;}
 if(action==='load'){
   const record=state.strategyRecords.find(r=>r.id===button.dataset.strategyId);
   if(!record)return;
   if(state.strategyDirty&&!window.confirm('未保存の変更を破棄しますか？'))return;
   state.strategyDraft=cleanStrategy(record);state.strategyId=record.id;state.strategyCreatedAt=record.createdAt;
   state.strategyView='review';state.strategyStep=0;state.strategyErrors={};state.strategyError='';state.strategyStatus='保存済み';state.strategyDirty=false;state.strategyRevision=0;
   render();window.scrollTo(0,0);return;
 }
 if(action==='delete'){void strategyDelete(button.dataset.strategyId);return;}
 if(action==='prev'){state.strategyStep=Math.max(0,state.strategyStep-1);render();window.scrollTo(0,0);return;}
 if(action==='next'){
   if(!strategyValidationGate(false))return;
   state.strategyStep++;
   if(state.strategyStep>=STRATEGY_STEPS.length){state.strategyView='review';state.strategyStep=STRATEGY_STEPS.length-1;}
   void requestStrategySave();render();window.scrollTo(0,0);return;
 }
 if(action==='review'){state.strategyView='review';render();window.scrollTo(0,0);return;}
 if(action==='wizard'){state.strategyView='wizard';render();window.scrollTo(0,0);return;}
 if(action==='result'){void strategyResult();return;}
}
function handleStrategyResultAction(button){
 const action=button.dataset.strategyResultAction;
 if(action==='expand'){const i=Number(button.dataset.index);if(i!==1&&i!==2)return;state.strategyExpandedAlt=state.strategyExpandedAlt===i?null:i;const y=window.scrollY;render();window.scrollTo(0,y);}
 if(action==='view'){state.strategyAddressView=button.dataset.view==='top'?'top':'front';const y=window.scrollY;render();window.scrollTo(0,y);}
}
function handleStrategySlope(button){
 ensureStrategyDraft();
 try{state.strategyDraft=toggleStrategySlope(state.strategyDraft,button.dataset.strategySlope,button.dataset.axis,button.dataset.value);strategyModified();}
 catch(err){state.strategyError=err.message;render();}
}
function handleStrategyChoice(button){
 ensureStrategyDraft();
 state.strategyDraft=updateStrategyField(state.strategyDraft,button.dataset.strategyFieldChoice,button.dataset.value);
 strategyModified();
}
function handleStrategySet(button){
 ensureStrategyDraft();
 const id=button.dataset.strategySet||null;
 if(id&&!state.sets.some(s=>s.id===id))return;
 state.strategyDraft=updateStrategyField(state.strategyDraft,'setId',id);
 strategyModified();
}
function handleStrategyInput(element){
 ensureStrategyDraft();
 const key=element.dataset.strategyField;
 state.strategyDraft=updateStrategyField(state.strategyDraft,key,element.value);
 strategyModified(false);
 if(key==='targetYards'){
   const other=document.querySelector(element.matches('[type="range"]')?'input[type="number"][data-strategy-field="targetYards"]':'input[type="range"][data-strategy-field="targetYards"]');
   if(other && element.value!=='')other.value=element.value;
   const readout=document.querySelector('[data-strategy-distance-readout]');if(readout)readout.innerHTML=`${escapeHtml(element.value||'—')}<small> yd</small>`;
 }
 if(element.tagName==='SELECT'){
   // Re-render conditional rough/bunker fields and reset no-longer-relevant wind details.
   const y=window.scrollY;render();window.scrollTo(0,y);
 }
}


async function updateStorageStatus(){
  if(navigator.storage){
    try{
      if(typeof navigator.storage.persisted==='function')state.storagePersisted=await navigator.storage.persisted();
      if(typeof navigator.storage.estimate==='function'){
        const e=await navigator.storage.estimate();
        if(e.usage!=null&&e.quota)state.storageQuota=`${(e.usage/1048576).toFixed(1)} / ${(e.quota/1048576).toFixed(0)} MB（概算）`;
      }
    }catch{}
  }
  if(state.route==='backup')render();
}
async function refreshBackupCounts(){
  const records=await snapshotAllStores();
  state.backupCounts=countRecords(records,STORE_NAMES);
  return records;
}
function downloadBackup(blob,filename){
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.style.display='none';
  document.body.append(anchor);anchor.click();anchor.remove();
  // Delay revocation, especially important for Safari download handling.
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function handleBackupAction(button){
  if(state.backupBusy)return;
  const action=button.dataset.backupAction;
  if(action==='export'){
    state.backupBusy=true;state.backupError='';state.backupStatus='';render();
    try{
      const stores=await refreshBackupCounts();
      const payload=await createBackup(stores,STORE_NAMES);
      const blob=new Blob([JSON.stringify(payload)],{type:'application/json;charset=utf-8'});
      if(blob.size>MAX_FILE_BYTES)throw Error('バックアップが300MBを超えました。現バージョンでは一括保存できません。');
      downloadBackup(blob,backupFilename());
      state.backupStatus='バックアップファイルを生成しました。端末の「ファイル」などで保存先を確認してください。';
    }catch(error){state.backupError=`バックアップできませんでした。${error?.message||''}`;}
    finally{state.backupBusy=false;render();}
  }
  if(action==='restore'){
    if(!state.backupPreview){state.backupError='先にファイルを選択してください。';render();return;}
    if(document.getElementById('backup-confirm')?.value.trim()!=='復元'){
      state.backupError='確認欄に「復元」と入力してください。';render();return;
    }
    if(!window.confirm('現在のプロフィール・クラブ・ラウンド・写真をすべて消去し、選んだバックアップの内容に置き換えます。本当に復元しますか？'))return;
    state.backupBusy=true;state.backupError='';render();
    try{
      await restoreAllStoresAtomic(state.backupPreview.stores);
      state.backupPreview=null;state.backupBusy=false;
      // Release stale image URLs / app data in memory; reload from committed DB.
      location.hash='#home';location.reload();
    }catch(error){state.backupError=`復元に失敗しました。${error?.message||''}`;state.backupBusy=false;render();}
  }
}
async function importBackupFile(file){
  state.backupPreview=null;state.backupError='';state.backupStatus='';
  if(!file){render();return;}
  if(file.size>MAX_FILE_BYTES){state.backupError='ファイルが大きすぎます（上限300MB）。';render();return;}
  state.backupBusy=true;render();
  try{
    const content=JSON.parse(await file.text());
    state.backupPreview=parseBackup(content,STORE_NAMES);
    state.backupStatus='内容を検証しました。復元操作をするまで現在のデータは変わりません。';
  }catch(error){state.backupPreview=null;state.backupError=`検証に失敗しました。${error?.message||'JSONを読み込めません。'}`;}
  finally{state.backupBusy=false;render();}
}
window.addEventListener('online',()=>{state.offline=false;if(state.route==='backup')render();});
window.addEventListener('offline',()=>{state.offline=true;if(state.route==='backup')render();});

app.addEventListener('click', event => {
  const backupButton=event.target.closest('[data-backup-action]');if(backupButton){event.preventDefault();void handleBackupAction(backupButton);return;}
  const albumButton=event.target.closest('[data-album-action]');if(albumButton){event.preventDefault();handleAlbumAction(albumButton);return;}
  const resultAction=event.target.closest('[data-strategy-result-action]');
  if(resultAction){event.preventDefault();handleStrategyResultAction(resultAction);return;}
  const strategyTip=event.target.closest('[data-strategy-tip]');
  if(strategyTip){event.preventDefault();if(tipArticle(strategyTip.dataset.strategyTip)){state.route='tips';location.hash='#tips';openTipArticle(strategyTip.dataset.strategyTip);}return;}
  const strategyAction=event.target.closest('[data-strategy-action]');
  if(strategyAction){event.preventDefault();handleStrategyAction(strategyAction);return;}
  const strategySlope=event.target.closest('[data-strategy-slope]');
  if(strategySlope){event.preventDefault();handleStrategySlope(strategySlope);return;}
  const strategyChoice=event.target.closest('[data-strategy-field-choice]');
  if(strategyChoice){event.preventDefault();handleStrategyChoice(strategyChoice);return;}
  const strategySet=event.target.closest('[data-strategy-set]');
  if(strategySet){event.preventDefault();handleStrategySet(strategySet);return;}
  const tipButton=event.target.closest('[data-tip-action]');
  if(tipButton){event.preventDefault();handleTipAction(tipButton);return;}
  const roundButton=event.target.closest('[data-round-action]');
  if(roundButton){handleRoundAction(roundButton);return;}
  const courseButton=event.target.closest('[data-course-action]');
  if(courseButton){handleCourseAction(courseButton);return;}
  const shotButton=event.target.closest('[data-shot-action]');
  if(shotButton){handleShotAction(shotButton);return;}
  const setButton = event.target.closest('[data-set-action]');
  if(setButton){handleSetAction(setButton);return;}
  const clubButton = event.target.closest('[data-club-action]');
  if (clubButton) {handleClubAction(clubButton);return;}
  const button = event.target.closest('[data-select], [data-action]');
  if (!button) return;
  if (button.dataset.select) {
    const field = button.dataset.select;
    state.draft ??= {};
    state.draft[field] = button.dataset.value;
    state.dirty = true;
    delete state.errors[field];
    state.toast = '';
    render();
  } else if (button.dataset.action === 'cancel-profile') {
    resetDraft();
    state.toast = '';
    render();
  } else if (button.dataset.action === 'reload') {
    location.reload();
  }
});
app.addEventListener('input', event => {
  const element = event.target;
  if(element.dataset.strategyField){handleStrategyInput(element);return;}
  if(element.id==='tip-search'){
    state.tipQuery=element.value;
    const list=document.getElementById('tip-results');
    if(list)list.innerHTML=tipCards(searchTipArticles(state.tipQuery,state.tipCategory));
    const counter=document.getElementById('tip-count');
    if(counter)counter.textContent=`${searchTipArticles(state.tipQuery,state.tipCategory).length} / ${TIP_ARTICLES.length} 記事`;
    return;
  }
  if(element.id==='tip-toc-search'){
    state.tipTocQuery=element.value;
    const tree=document.getElementById('tip-toc-tree');
    if(tree)tree.innerHTML=tipTocTree({article:tipArticle(state.tipArticleId),expanded:state.tipTocExpanded,query:state.tipTocQuery});
    return;
  }
  if(element.id==='round-notes-text'){
    state.roundNotesDraft=element.value;state.roundNotesDirty=state.roundNotesDraft!==(roundCurrent()?.notes??'');state.roundNotesError='';
    const counter=document.getElementById('round-notes-count');if(counter)counter.textContent=`${element.value.length} / 5000文字 ${state.roundNotesDirty?'· 未保存':'· 保存済み'}`;
    const button=document.querySelector('[data-round-action="save-notes"]');if(button)button.disabled=!state.roundNotesDirty;return;
  }
  if(element.dataset.roundField){
    if(!state.roundDraft)return;const f=element.dataset.roundField;state.roundDraft[f]=element.value;state.roundDirty=true;delete state.roundErrors[f];
    if(f==='courseId'){const course=state.courses.find(c=>c.id===element.value);state.roundDraft.teeId=course?.tees[0]?.id??'';render();}return;
  }
  if(element.dataset.roundCompanion!==undefined){state.roundDraft.companions[Number(element.dataset.roundCompanion)]=element.value;state.roundDirty=true;delete state.roundErrors.companions;return;}
  if(element.id==='round-new-player-name'||element.id==='round-player-name'){state.roundPlayerDraft=element.value;return;}
  if(element.id==='course-search'){
    state.courseQuery=element.value;
    const results=document.getElementById('course-results');
    if(results)results.innerHTML=courseResults(searchCourses(state.courses,state.courseQuery,state.coursePrefecture),state.coursePhotos,!!state.courseQuery||state.coursePrefecture!=='all');
    const count=document.getElementById('course-results-count');
    if(count)count.textContent=`${searchCourses(state.courses,state.courseQuery,state.coursePrefecture).length} / ${state.courses.length} 件`;
    return;
  }
  if(element.id==='course-prefecture-filter'){state.coursePrefecture=element.value;render();return;}
  if(element.id==='course-detail-tee'){state.courseTeeId=element.value;render();return;}
  if(element.dataset.courseStructure){
    if(!state.courseDraft)return;
    const field=element.dataset.courseStructure;
    if(field==='holeCount')state.courseDraft=reshapeHoles(state.courseDraft,Number(element.value),1);
    else if(field==='startHole')state.courseDraft=reshapeHoles(state.courseDraft,9,Number(element.value));
    state.courseDirty=true;state.courseErrors={};render();return;
  }
  if(element.dataset.courseField){state.courseDraft[element.dataset.courseField]=element.value;state.courseDirty=true;delete state.courseErrors[element.dataset.courseField];return;}
  if(element.dataset.courseTeeName){const tee=state.courseDraft.tees.find(t=>t.id===element.dataset.courseTeeName);if(tee){tee.name=element.value;state.courseDirty=true;delete state.courseErrors[`tee.${tee.id}`];}return;}
  if(element.dataset.coursePar){const hole=state.courseDraft.holes.find(h=>String(h.number)===element.dataset.coursePar);if(hole){hole.par=element.value;state.courseDirty=true;delete state.courseErrors[`par.${hole.number}`];}return;}
  if(element.dataset.courseYard){const tee=state.courseDraft.tees.find(t=>t.id===element.dataset.teeId);if(tee){tee.distances[element.dataset.courseYard]=element.value;state.courseDirty=true;delete state.courseErrors[`yard.${tee.id}.${element.dataset.courseYard}`];}return;}

  if(element.dataset.shotFilter){state.shotFilter=element.value;render();return;}
  if(element.dataset.shotField){
    const field=element.dataset.shotField;state.shotDraft[field]=element.value;state.shotDirty=true;delete state.shotErrors[field];
    if(field==='type'||field==='backswing')render();
    return;
  }
  if (element.dataset.setField) {
    state.setDraft[element.dataset.setField]=element.value;state.setDirty=true;
    delete state.setErrors[element.dataset.setField];return;
  }
  if (element.matches('[data-set-club-id]')) {
    const id=element.dataset.setClubId;
    state.setDraft.clubIds=element.checked?[...new Set([...state.setDraft.clubIds,id])]:state.setDraft.clubIds.filter(x=>x!==id);
    state.setDirty=true;state.setErrors={};render();return;
  }
  if (element.id==='club-search') {
    state.clubQuery=element.value;
    const list=document.querySelector('#club-inventory');
    if (list) list.innerHTML=clubInventory(state.clubs,state.clubQuery,state.clubCategory);
    return;
  }
  if (element.dataset.clubField) {
    state.clubDraft[element.dataset.clubField]=element.value;
    state.clubDirty=true;
    delete state.clubErrors[element.dataset.clubField];
    return;
  }
  if (element.dataset.clubLoft) {
    state.clubLofts[element.dataset.clubLoft]=element.value;
    state.clubDirty=true;
    delete state.clubErrors[`loft.${element.dataset.clubLoft}`];
    return;
  }
  const elementTag=element.tagName;
  if (elementTag==='INPUT' && element.hasAttribute('data-club-number')) {
    const n=element.dataset.clubNumber;
    state.clubSelected=element.checked?[...new Set([...state.clubSelected,n])]:state.clubSelected.filter(x=>x!==n);
    state.clubDirty=true;delete state.clubErrors.selected;render();return;
  }
  if (element.dataset.field) {
    state.draft ??= {};
    state.draft[element.dataset.field] = element.value;
    state.dirty = true;
    state.toast = '';
    delete state.errors[element.dataset.field];
  }
});
app.addEventListener('toggle',event=>{if(event.target.matches?.('.album-crop-controls'))state.albumCropOpen=event.target.open;},true);
app.addEventListener('change', event=>{
  if(event.target.id==='backup-file'){void importBackupFile(event.target.files?.[0]);return;}
  if(handleAlbumChange(event.target))return;
  if(event.target.hasAttribute('data-course-photo')){void selectCoursePhoto(event.target.files?.[0]);}
  if(event.target.id==='round-photos-input'){void storeRoundPhotos(event.target.files);}
  if(event.target.id==='round-show-putts'){state.roundShowPutts=event.target.checked;const y=window.scrollY;render();window.scrollTo(0,y);}
  if(event.target.dataset.scoreField){const el=event.target;updateScore(el.dataset.playerId,Number(el.dataset.hole),el.dataset.scoreField,el.value);}
});
app.addEventListener('submit', event => {
  if(event.target.id==='course-form'){event.preventDefault();void saveCourseForm();}
  if(event.target.id==='round-form'){event.preventDefault();void submitRound();}
  if(event.target.id==='round-player-form'){event.preventDefault();void savePlayerName();}
  if(event.target.id==='round-add-player'){event.preventDefault();void addLatePlayer();}

  if (event.target.id === 'profile-form') {event.preventDefault(); void submitProfile();}
  if (event.target.id === 'set-form') {event.preventDefault();void saveSetForm();}
  if (event.target.id === 'club-form') {event.preventDefault(); void submitClub();}
  if (event.target.id === 'shot-form') {event.preventDefault();void submitShot();}
});
window.addEventListener('hashchange', handleRoute);
window.addEventListener('keydown', event=>{
  if(state.route!=='tips'||!(state.tipTocOpen||state.tipZoom))return;
  if(event.key==='Escape'){event.preventDefault();closeTipLayer();return;}
  if(event.key==='Tab'){
    const layer=document.querySelector('.tips-layer');
    const tabbables=[...layer.querySelectorAll('button:not([disabled]), input, a[href]')].filter(el=>el.getClientRects().length);
    if(!tabbables.length)return;
    const first=tabbables[0],last=tabbables[tabbables.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
window.addEventListener('beforeunload', event => {
  if ((state.dirty && isProfileComplete(state.profile)) || (state.clubView==='form' && state.clubDirty) || (state.setView==='form' && state.setDirty) || (state.shotView==='form'&&state.shotDirty) || (state.courseView==='form'&&state.courseDirty) || (state.roundView==='form'&&state.roundDirty) || scoreWrites.size>0 || state.roundNotesDirty || state.roundPhotoBusy || state.strategyDirty || state.albumBusy || state.backupBusy) {event.preventDefault(); event.returnValue='';}
});
async function boot() {
  try {
    const [profile, settings, clubs, sets, shots, courses, photos, rounds, roundPlayers, holeScores, strategies, albumPresets] = await Promise.all([getProfile(), ensureSettings(), getAllRecords('clubs'), getAllRecords('clubSets'), getAllRecords('shots'),getAllRecords('courses'),getAllRecords('photos'),getAllRecords('rounds'),getAllRecords('roundPlayers'),getAllRecords('holeScores'),getAllRecords('strategies'),getAllRecords('albumPresets')]);
    state.profile = profile;
    state.settings = settings;
    state.clubs = clubs;
    state.sets = sets;
    state.shots = shots;
    state.courses = courses;
    state.rounds=rounds;state.roundPlayers=roundPlayers;state.holeScores=holeScores;
    state.strategyRecords=strategies;state.albumPresets=albumPresets;
    if(strategies.length){
      const latest=[...strategies].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
      state.strategyDraft=cleanStrategy(latest);state.strategyId=latest.id;state.strategyCreatedAt=latest.createdAt;
      state.strategyView='review';state.strategyStatus='保存済み';
    }else{
      state.strategyDraft=newStrategyDraft(sets.some(x=>x.id===settings?.activeSetId)?settings.activeSetId:null);
      state.strategyId=newStrategyId();state.strategyCreatedAt=new Date().toISOString();
    }
    state.backupCounts=countRecords({profiles:profile?[profile]:[],settings:settings?[settings]:[],clubs,clubSets:sets,shots,courses,photos,rounds,roundPlayers,holeScores,strategies,albumPresets},STORE_NAMES);
    refreshCoursePhotos(photos);
    refreshRoundPhotos(photos);
    resetDraft();
    render();
  } catch(error) {
    state.bootError = error?.message || '未知のエラー';
    render();
  }
  void updateStorageStatus();
  if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
    // File scheme can't register SW. Service worker errors should not prevent app use.
    navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(error=>console.warn('Service Worker registration failed:',error));
  }
}
void boot();
