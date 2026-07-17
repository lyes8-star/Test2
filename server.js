const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');
const CONTENU_DIR = path.join(__dirname, 'contenu');
const CONTENU_FILES = {
  'site.json': (data) => ({ site: data.site }),
  'diaporama.json': (data) => ({ hero: data.hero }),
  'a-propos.json': (data) => ({ about: data.about, contactImage: data.contactImage }),
  'services.json': (data) => ({ services: data.services }),
  'galerie.json': (data) => ({ gallery: data.gallery }),
  'actualites.json': (data) => ({ news: data.news }),
  'faq.json': (data) => ({ faq: data.faq }),
  'zones.json': (data) => ({ zones: data.zones }),
  'pages.json': (data) => ({ pages: data.pages }),
  'process.json': (data) => ({ process: data.process }),
};
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ROOT_DIR = __dirname;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PASSWORD_FILE = path.join(__dirname, 'data', '.admin-hash');

const sessions = new Map();
const loginAttempts = new Map();

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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
};

const CSP =
  "default-src 'self'; " +
  "base-uri 'self'; " +
  "object-src 'none'; " +
  "frame-ancestors 'none'; " +
  "form-action 'self' mailto:; " +
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https: blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com; " +
  "frame-src 'self' https://maps.google.com https://www.google.com https://maps.googleapis.com; " +
  "upgrade-insecure-requests";

function securityHeaders() {
  return {
    'Content-Security-Policy': CSP,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=()',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

function applySecurityHeaders(res) {
  const headers = securityHeaders();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
}

function readContentFromContenu() {
  const merged = {};
  for (const file of Object.keys(CONTENU_FILES)) {
    const full = path.join(CONTENU_DIR, file);
    if (!fs.existsSync(full)) throw new Error(`Missing ${file}`);
    Object.assign(merged, JSON.parse(fs.readFileSync(full, 'utf8')));
  }
  return merged;
}

function readContent() {
  try {
    if (fs.existsSync(CONTENU_DIR)) {
      return readContentFromContenu();
    }
  } catch (err) {
    console.warn('Lecture contenu/ échouée, repli data/content.json', err.message);
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeContenuParts(data) {
  if (!fs.existsSync(CONTENU_DIR)) {
    fs.mkdirSync(CONTENU_DIR, { recursive: true });
  }
  for (const [file, pick] of Object.entries(CONTENU_FILES)) {
    const payload = pick(data);
    fs.writeFileSync(
      path.join(CONTENU_DIR, file),
      JSON.stringify(payload, null, 2) + '\n',
      'utf8'
    );
  }
}

function writeContent(data) {
  writeContenuParts(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  try {
    require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'scripts', 'generate-seo.js')], {
      cwd: __dirname,
      stdio: 'pipe',
    });
  } catch (err) {
    console.warn('generate-seo failed:', err.message);
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}

function getStoredPasswordHash() {
  if (fs.existsSync(PASSWORD_FILE)) {
    return fs.readFileSync(PASSWORD_FILE, 'utf8').trim();
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.error(
      'Sécurité : définissez ADMIN_PASSWORD (min. 12 caractères) ou placez data/.admin-hash. Aucun mot de passe par défaut.'
    );
    process.exit(1);
  }
  const hash = hashPassword(ADMIN_PASSWORD);
  fs.writeFileSync(PASSWORD_FILE, hash, { mode: 0o600 });
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

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function isHttpsRequest(req) {
  if (process.env.FORCE_SECURE_COOKIES === '1') return true;
  if (req.headers['x-forwarded-proto'] === 'https') return true;
  return false;
}

function sessionCookie(token, req, maxAge = 86400) {
  const parts = [`session=${token}`, 'HttpOnly', 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Strict'];
  if (isHttpsRequest(req) || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function checkLoginRateLimit(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || entry.reset < now) {
    entry = { count: 0, reset: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, entry);
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return false;
  }
  return true;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || entry.reset < now) {
    entry = { count: 0, reset: now + LOGIN_WINDOW_MS };
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
}

function clearLoginFailures(ip) {
  loginAttempts.delete(ip);
}

/* —— Anti-bot (Node only ; inactive on GitHub Pages static) —— */
const scrapeHits = new Map();
const bannedIps = new Map();
const SCRAPE_WINDOW_MS = 60 * 1000;
const SCRAPE_MAX_PHOTOS = 90;
const SCRAPE_MAX_JSON = 40;
const SCRAPE_MAX_GLOBAL = 180;
const BAN_MS = 15 * 60 * 1000;

const BAD_UA_RE =
  /(?:wget|curl|python-requests|scrapy|httpclient|libwww|httrack|nikto|sqlmap|masscan|bytespider|petalsearch|semrushbot|ahrefsbot|dotbot|mj12bot|dataforseobot)/i;
const GOOD_BOT_RE =
  /(?:googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|facebookexternalhit|twitterbot|linkedinbot)/i;

function isBanned(ip) {
  const until = bannedIps.get(ip);
  if (!until) return false;
  if (Date.now() > until) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
}

function banIp(ip, ms = BAN_MS) {
  bannedIps.set(ip, Date.now() + ms);
}

function recordScrape(ip, bucket) {
  const now = Date.now();
  let entry = scrapeHits.get(ip);
  if (!entry || entry.reset < now) {
    entry = { photos: 0, json: 0, global: 0, reset: now + SCRAPE_WINDOW_MS };
  }
  entry[bucket] = (entry[bucket] || 0) + 1;
  entry.global += 1;
  scrapeHits.set(ip, entry);
  return entry;
}

function scrapeLimited(ip, pathname) {
  let bucket = 'global';
  if (
    pathname.startsWith('/contenu/photos/') ||
    pathname.startsWith('/uploads/') ||
    /\.(?:jpg|jpeg|png|webp|gif)$/i.test(pathname)
  ) {
    bucket = 'photos';
  } else if (pathname.endsWith('.json') || pathname === '/api/content') {
    bucket = 'json';
  } else {
    return false;
  }
  const entry = recordScrape(ip, bucket);
  if (entry.photos > SCRAPE_MAX_PHOTOS || entry.json > SCRAPE_MAX_JSON || entry.global > SCRAPE_MAX_GLOBAL) {
    banIp(ip);
    return true;
  }
  return false;
}

function isBadUserAgent(ua) {
  if (!ua || !String(ua).trim()) return true;
  if (GOOD_BOT_RE.test(ua)) return false;
  return BAD_UA_RE.test(ua);
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

function detectImageExt(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return '.webp';
  }
  return null;
}

function sendJson(res, status, data) {
  applySecurityHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, extraHeaders = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      applySecurityHeaders(res);
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    let cache = 'public, max-age=86400';
    if (ext === '.html' || ext === '.json' || ext === '.webmanifest' || ext === '.txt' || ext === '.xml') {
      cache = 'no-cache';
    } else if (ext === '.css' || ext === '.js') {
      cache = 'public, max-age=3600';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2'].includes(ext)) {
      cache = 'public, max-age=604800';
    }
    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': cache,
      ...extraHeaders,
    });
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
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload trop volumineux'), { code: 'PAYLOAD_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Ensure password hash is available at boot (exits if misconfigured)
getStoredPasswordHash();

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const ip = clientIp(req);
  const ua = req.headers['user-agent'] || '';

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Honeypot — bait for scrapers
  if (
    pathname === '/admin-backup.zip' ||
    pathname === '/contenu/.trap' ||
    pathname === '/.env' ||
    pathname === '/wp-login.php'
  ) {
    banIp(ip, BAN_MS * 4);
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (isBanned(ip)) {
    res.writeHead(429, { 'Retry-After': '900' });
    res.end('Too many requests');
    return;
  }

  // Allow good bots; block obvious scrapers (except admin API auth flows still need browsers)
  if (isBadUserAgent(ua) && !pathname.startsWith('/api/admin/')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (scrapeLimited(ip, pathname)) {
    res.writeHead(429, { 'Retry-After': '60' });
    res.end('Too many requests');
    return;
  }

  // API: public content
  if (pathname === '/api/content' && req.method === 'GET') {
    sendJson(res, 200, readContent());
    return;
  }

  // API: login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const ip = clientIp(req);
    if (!checkLoginRateLimit(ip)) {
      sendJson(res, 429, { error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      return;
    }
    let body;
    try {
      body = await collectBody(req);
    } catch (err) {
      sendJson(res, err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { error: 'Requête invalide' });
      return;
    }
    try {
      const { username, password } = JSON.parse(body.toString());
      const storedHash = getStoredPasswordHash();
      if (username === ADMIN_USER && typeof password === 'string' && verifyPassword(password, storedHash)) {
        clearLoginFailures(ip);
        const token = createSession();
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': sessionCookie(token, req),
        });
        res.end(JSON.stringify({ success: true }));
        return;
      }
      recordLoginFailure(ip);
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
      'Set-Cookie': sessionCookie('', req, 0),
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
    let body;
    try {
      body = await collectBody(req);
    } catch (err) {
      sendJson(res, err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { error: 'Requête invalide' });
      return;
    }
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
    let buffer;
    try {
      buffer = await collectBody(req);
    } catch (err) {
      sendJson(res, err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400, { error: 'Fichier trop volumineux (max 5 Mo)' });
      return;
    }
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find((p) => p.filename);

    if (!filePart) {
      sendJson(res, 400, { error: 'Aucun fichier' });
      return;
    }

    const magicExt = detectImageExt(filePart.data);
    if (!magicExt) {
      sendJson(res, 400, { error: 'Type de fichier non autorisé (image requise)' });
      return;
    }

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${magicExt}`;
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

  // Block sensitive files / dirs
  const blockedExact = [
    '/server.js',
    '/package.json',
    '/package-lock.json',
    '/.gitignore',
    '/README.md',
    '/data/.admin-hash',
  ];
  if (
    blockedExact.includes(pathname) ||
    pathname.startsWith('/.git') ||
    pathname.startsWith('/scripts/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.includes('..')
  ) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Static files from repo root (GitHub Pages layout)
  let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const headers = pathname.startsWith('/admin') ? { 'X-Robots-Tag': 'noindex, nofollow' } : {};
      sendFile(res, indexPath, headers);
      return;
    }
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const headers = pathname.startsWith('/admin') ? { 'X-Robots-Tag': 'noindex, nofollow' } : {};
    sendFile(res, filePath, headers);
    return;
  }
  if (!pathname.endsWith('/')) {
    const dirIndex = path.join(ROOT_DIR, pathname, 'index.html');
    if (dirIndex.startsWith(ROOT_DIR) && fs.existsSync(dirIndex)) {
      sendFile(res, dirIndex);
      return;
    }
  }

  if (pathname.startsWith('/admin')) {
    const adminPath = path.join(ROOT_DIR, 'admin', 'index.html');
    if (fs.existsSync(adminPath)) {
      sendFile(res, adminPath, { 'X-Robots-Tag': 'noindex, nofollow' });
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Procept website running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log('Auth: utilisez ADMIN_USER / ADMIN_PASSWORD (ou data/.admin-hash existant).');
});
