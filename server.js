const http = require('http');
const path = require('path');
const fs = require('fs');

const { handleReportRequest, sendJson } = require('./reportService');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(publicDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(publicDir, 'index.html');
    }
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === '.html'
          ? 'text/html'
          : ext === '.css'
          ? 'text/css'
          : ext === '.js'
          ? 'application/javascript'
          : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/api/report')) {
    handleReportRequest(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Values app listening on http://localhost:${port}`);
});
