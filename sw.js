/* GOLF JOURNAL Stage 12. App shell only: personal records stay in IndexedDB. */
const CACHE_NAME = 'golf-journal-shell-v12';
const CORE = [
  './', './index.html', './src/main.js', './src/db.js', './src/domain.js',
  './src/icons.js','./src/strategy.js','./src/strategy-ui.js','./src/strategy-engine.js','./src/strategy-result-ui.js','./src/tips-data.js','./src/tips-diagrams.js','./src/tips-ui.js', './src/clubs.js', './src/clubs-ui.js', './src/sets.js', './src/sets-ui.js', './src/shots.js', './src/shots-ui.js', './src/courses.js', './src/courses-ui.js', './src/course-images.js', './src/rounds.js', './src/rounds-ui.js', './src/round-media.js', './src/round-media-ui.js', './src/album.js', './src/album-ui.js', './src/album-render.js', './src/album-pdf.js', './src/backup.js', './src/backup-ui.js', './src/styles.css', './manifest.webmanifest',
  './assets/icon-192.png', './assets/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('golf-journal-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(()=>caches.match('./index.html')));
    return;
  }
  // App shell is cache-first offline, refreshed by versioned service worker installation.
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
