import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const requestPath = rawPath === '/' ? '/index.html' : rawPath;
  const resolved = path.resolve(root, `.${requestPath}`);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Forbidden'); return;
  }
  fs.stat(resolved, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    fs.createReadStream(resolved).pipe(res);
  });
}).listen(port, '0.0.0.0', () => console.log(`BriefGuard is running at http://localhost:${port}`));
