import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, extname, sep} from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const decoded = decodeURIComponent(url.pathname);
    if (decoded.includes('\0')) throw new Error('Invalid path');
    const target = resolve(root, '.' + (decoded.endsWith('/') ? decoded+'index.html' : decoded));
    if (!(target === root || target.startsWith(root+sep))) {
      res.writeHead(403);res.end('Forbidden');return;
    }
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(target));
  } catch(e) {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});res.end('Not Found');
  }
}).listen(port,host,()=>console.log(`GOLF JOURNAL -> http://${host}:${port}/`));
