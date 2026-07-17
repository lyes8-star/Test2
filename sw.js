/* Service worker Procept — cache app shell, network-first pour HTML */
const CACHE = 'procept-shell-v1';
const SHELL = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/js/search.js',
  '/js/chat.js',
  '/js/social.js',
  '/js/map-idf.js',
  '/manifest.webmanifest',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  const isHtml = req.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
