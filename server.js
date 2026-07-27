const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle API Endpoint: POST /api/upload
  if (req.method === 'POST' && req.url === '/api/upload') {
    let chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        const payload = JSON.parse(body);
        const { projectId, projectName, files } = payload;

        if (!projectId || !files || !Array.isArray(files)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid payload' }));
          return;
        }

        const projectDir = path.join(UPLOADS_DIR, projectId);
        if (!fs.existsSync(projectDir)) {
          fs.mkdirSync(projectDir, { recursive: true });
        }

        files.forEach(file => {
          const filePath = path.join(projectDir, file.path);
          const dirName = path.dirname(filePath);
          if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
          }

          if (file.isBase64) {
            const buffer = Buffer.from(file.content, 'base64');
            fs.writeFileSync(filePath, buffer);
          } else {
            fs.writeFileSync(filePath, file.content, 'utf-8');
          }
        });

        console.log(`[Upload Success] Saved banner project "${projectName}" (${projectId}) with ${files.length} files.`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          projectId: projectId,
          baseUrl: `http://localhost:${PORT}/uploads/${projectId}/`
        }));

      } catch (err) {
        console.error('Upload Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Handle API Endpoint: DELETE /api/project/:projectId
  if (req.method === 'DELETE' && req.url.startsWith('/api/project/')) {
    const rawId = req.url.replace('/api/project/', '').trim();
    const projectId = decodeURIComponent(rawId);
    if (projectId) {
      const projectDir = path.join(UPLOADS_DIR, projectId);
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
        console.log(`[Delete Success] Removed folder from disk for project "${projectId}"`);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Handle Static File Requests
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Ad Link Server running at http://localhost:${PORT}`);
});
