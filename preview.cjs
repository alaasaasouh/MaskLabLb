/* Optional local server. The storefront itself needs no Node or build step. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
function handler(req, res) {
  let requested;
  try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
  if (!file.startsWith(root + path.sep) || (!['/index.html','/style.css'].includes(requested) && requested !== '/' && !requested.startsWith('/assets/') && !requested.startsWith('/js/'))) { res.writeHead(404).end('Not found'); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
  });
}
if (require.main === module) http.createServer(handler).listen(4173, '127.0.0.1', () => console.log('MASKLAB local preview: http://127.0.0.1:4173'));
module.exports = handler;
