const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'procept2026';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const sessions = new Map();
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function readContent() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeContent(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

const PASSWORD_FILE = path.join(__dirname, 'data', '.admin-hash');

function getStoredPasswordHash() {
  if (fs.existsSync(PASSWORD_FILE)) {
    return fs.readFileSync(PASSWORD_FILE, 'utf8').trim();
  }
  const hash = hashPassword(ADMIN_PASSWORD);
  fs.writeFileSync(PASSWORD_FILE, hash);
  return hash;
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  sessions.set(token, expires);
  return token;
}

function isValidSession(token) {
  if (!token || !sessions.has(token)) return false;
  if (sessions.get(token) < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((part) => {
    const [key, ...rest] = part.trim().split('=');
    cookies[key] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length + 2;

  while (start < buffer.length) {
    const end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) break;
    const part = buffer.slice(start, end - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const headers = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);

    parts.push({
      name: nameMatch ? nameMatch[1] : null,
      filename: filenameMatch ? filenameMatch[1] : null,
      contentType: contentTypeMatch ? contentTypeMatch[1].trim() : null,
      data: body,
    });

    start = end + boundaryBuffer.length + 2;
  }

  return parts;
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': ext.match(/\.(css|js)$/) ? 'no-cache' : 'public, max-age=86400' });
    res.end(data);
  });
}

function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!isValidSession(cookies.session)) {
    sendJson(res, 401, { error: 'Non autorisé' });
    return false;
  }
  return true;
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: public content
  if (pathname === '/api/content' && req.method === 'GET') {
    sendJson(res, 200, readContent());
    return;
  }

  // API: login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await collectBody(req);
    try {
      const { username, password } = JSON.parse(body.toString());
      const storedHash = getStoredPasswordHash();
      if (username === ADMIN_USER && verifyPassword(password, storedHash)) {
        const token = createSession();
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`,
        });
        res.end(JSON.stringify({ success: true }));
        return;
      }
      sendJson(res, 401, { error: 'Identifiants incorrects' });
    } catch {
      sendJson(res, 400, { error: 'Requête invalide' });
    }
    return;
  }

  // API: logout
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.session) sessions.delete(cookies.session);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0',
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // API: check auth
  if (pathname === '/api/admin/me' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    sendJson(res, 200, { authenticated: isValidSession(cookies.session) });
    return;
  }

  // API: update content
  if (pathname === '/api/admin/content' && req.method === 'PUT') {
    if (!requireAuth(req, res)) return;
    const body = await collectBody(req);
    try {
      const data = JSON.parse(body.toString());
      writeContent(data);
      sendJson(res, 200, { success: true, message: 'Contenu enregistré' });
    } catch {
      sendJson(res, 400, { error: 'Données invalides' });
    }
    return;
  }

  // API: upload image
  if (pathname === '/api/admin/upload' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      sendJson(res, 400, { error: 'Format invalide' });
      return;
    }

    const boundary = contentType.split('boundary=')[1];
    const buffer = await collectBody(req);
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find((p) => p.filename);

    if (!filePart) {
      sendJson(res, 400, { error: 'Aucun fichier' });
      return;
    }

    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(filePart.filename).toLowerCase();
    if (!allowed.includes(ext)) {
      sendJson(res, 400, { error: 'Type de fichier non autorisé' });
      return;
    }

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, filePart.data);

    sendJson(res, 200, { success: true, url: `/uploads/${filename}` });
    return;
  }

  // API: delete uploaded image
  if (pathname.startsWith('/api/admin/upload/') && req.method === 'DELETE') {
    if (!requireAuth(req, res)) return;
    const filename = path.basename(pathname.replace('/api/admin/upload/', ''));
    const filepath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    sendJson(res, 200, { success: true });
    return;
  }

  // Static: uploads
  if (pathname.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, path.basename(pathname));
    if (fs.existsSync(filePath)) {
      sendFile(res, filePath);
      return;
    }
  }

  // Static: public files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  // SPA fallback for admin
  if (pathname.startsWith('/admin')) {
    const adminPath = path.join(PUBLIC_DIR, 'admin', 'index.html');
    if (fs.existsSync(adminPath)) {
      sendFile(res, adminPath);
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Procept website running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Default login: ${ADMIN_USER} / ${ADMIN_PASSWORD}`);
});
