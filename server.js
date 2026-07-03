const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Serves the bundled (read-only) app assets from `staticDir`, except for
// `/data/...` requests, which are served from the writable `dataDir` so the
// app can serve user-picked images without touching the packaged app bundle.
function createServer(staticDir, dataDir) {
  return http.createServer((req, res) => {
    const parsed = url.parse(req.url);
    let relativePath = decodeURIComponent(parsed.pathname);
    if (relativePath === '/') relativePath = '/index.html';

    const root = relativePath.startsWith('/data/') ? dataDir : staticDir;
    const relativeToRoot = relativePath.startsWith('/data/')
      ? relativePath.slice('/data/'.length)
      : relativePath.slice(1);

    const filePath = path.normalize(path.join(root, relativeToRoot));

    // Prevent path traversal outside of the intended root.
    if (!filePath.startsWith(path.normalize(root))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

// Starts the server on an OS-assigned free port and resolves with it.
function startServer(staticDir, dataDir) {
  return new Promise((resolve, reject) => {
    const server = createServer(staticDir, dataDir);
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

module.exports = { startServer, createServer };
