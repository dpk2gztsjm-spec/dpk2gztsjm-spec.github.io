import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('PWA caches complete local app shell and avoids caching private records',async()=>{
 const sw=await readFile(resolve(root,'sw.js'),'utf8');
 const assets=[...sw.matchAll(/'\.\/([^']+)'/g)].map(x=>x[1]);
 for(const asset of assets)await access(resolve(root,asset));
 for(const file of ['src/backup.js','src/backup-ui.js','src/album-render.js','src/main.js','src/tips-data.js'])assert.ok(assets.includes(file),file);
 assert.match(sw,/golf-journal-shell-v12/);
 assert.match(sw,/req\.method\s*!==\s*'GET'/);
 assert.doesNotMatch(sw,/cache\.put\(.*(?:POST|blob|indexedDB)/i);
});
test('manifest allows standalone iPhone homescreen, CSP constrains network connections',async()=>{
 const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));
 const html=await readFile(resolve(root,'index.html'),'utf8');
 assert.equal(manifest.display,'standalone');assert.ok(manifest.icons.length>=2);
 assert.match(html,/connect-src 'self'/);assert.match(html,/script type="module"/);
 for(const i of manifest.icons)await access(resolve(root,i.src.replace(/^\.\//,'')));
});
