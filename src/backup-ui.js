import {escapeHtml} from './domain.js';
export function backupPage({counts={},preview=null,busy=false,status='',error='',offline=false,persisted=null,quota=null}){
  const labels={profiles:'プロフィール',settings:'設定',clubs:'マイクラブ',clubSets:'マイセット',shots:'マイショット',courses:'ゴルフ場',rounds:'ラウンド',roundPlayers:'プレイヤー',holeScores:'ホール別スコア',photos:'写真',albumPresets:'アルバム設定',tipArticles:'辞典データ',strategies:'攻略条件',sourceRecords:'出典データ'};
  const summary=Object.entries(labels).map(([k,v])=>`<div class="backup-stat"><span>${v}</span><strong>${Number(counts[k]??0)} 件</strong></div>`).join('');
  const previewText=preview?`<div class="backup-import-preview" role="status"><strong>ファイルを検証しました</strong><p>作成日: ${escapeHtml(new Date(preview.exportedAt).toLocaleString('ja-JP'))}<br>ラウンド ${preview.counts.rounds}件 · クラブ ${preview.counts.clubs}本 · 写真 ${preview.counts.photos}枚</p><p><strong>現在の端末内データと完全に入れ替えます。</strong> 重複IDを無断で上書き・結合することはありません。</p><label class="backup-confirm-label" for="backup-confirm">復元する場合、下の欄に「復元」と入力してください</label><input id="backup-confirm" type="text" autocomplete="off" placeholder="復元" maxlength="2" ${busy?'disabled':''}/><button type="button" class="backup-destructive" data-backup-action="restore" ${busy?'disabled':''}>データを完全に入れ替えて復元</button></div>`:'';
  return `<div class="page-top"><div class="eyebrow"><span class="eyebrow-rule"></span>YOUR DATA</div><h1>バックアップ・復元</h1><p>大切なラウンドや写真を、端末の外にも保管。</p></div>
  <div class="backup-banner">${offline?'オフラインでもバックアップを作成できます。':'バックアップは端末上で生成され、外部サーバーへ送信されません。'}</div>
  ${error?`<div class="alert alert-error" role="alert">${escapeHtml(error)}</div>`:''}
  ${status?`<div class="alert alert-success" role="status">${escapeHtml(status)}</div>`:''}
  <section class="backup-panel"><span class="backup-step">01 / EXPORT</span><h2>すべての記録を保存</h2><p>登録した写真の本体・サムネイルを含め、全14領域を1つのJSONバックアップにまとめます。</p>
    <div class="backup-stats">${summary}</div>
    <button type="button" class="backup-primary" data-backup-action="export" ${busy?'disabled':''}>${busy?'処理中…':'写真を含むバックアップを作成'}</button>
    <small>個人名・写真・スコアを含むファイルです。公開クラウドやSNSでは共有しないでください。大容量の場合は生成に時間がかかります。</small>
  </section>
  <section class="backup-panel"><span class="backup-step">02 / RESTORE</span><h2>バックアップから復元</h2><p>GOLF JOURNALのJSONファイルを選び、形式・全領域・ID重複・写真データ・参照関係を検証します。</p>
    <label class="backup-file-label" for="backup-file">バックアップファイルを選択</label><input id="backup-file" type="file" accept=".json,application/json" ${busy?'disabled':''}/>
    ${previewText}
    <small>復元は現在の全データを置き換えます。必ず現在のデータを先にバックアップしてください。ファイルが不正な場合や保存に失敗した場合は復元を中止します。</small>
  </section>
  <section class="backup-panel backup-info"><span class="backup-step">03 / DEVICE STATUS</span><h2>端末の保存状態</h2>
    <p>ネットワーク: ${offline?'オフライン':'オンライン'}<br>ストレージ永続化: ${persisted===null?'判定できません':persisted?'有効（端末報告）':'保証なし'}<br>ストレージ使用量: ${quota===null?'取得できません':quota}</p>
    <p>iOSは端末容量やSafariのデータ消去などでローカル保存を削除する場合があります。更新・端末交換前にもバックアップを作成してください。</p>
    <a class="backup-home" href="#home">ホームに戻る →</a>
  </section>`;
}
