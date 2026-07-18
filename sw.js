/* Service worker Procept — cache app shell (chemins relatifs pour GitHub Pages) */
const CACHE = 'procept-shell-v24';

function shellUrls() {
  const base = self.registration.scope;
  return [
    './',
    'offline.html',
    'css/style.css',
    'js/main.js',
    'js/page.js',
    'js/news.js',
    'js/search.js',
    'js/a11y.js',
    'js/chat.js',
    'js/social.js',
    'js/analytics.js',
    'js/consent.js',
    'js/content-loader.js',
    'js/map-google.js',
    'js/pwa-install.js',
    'js/protect.js',
    'fonts/fonts.css',
    'fonts/font-2.woff2',
    'fonts/font-5.woff2',
    'manifest.webmanifest',
    'favicon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'contenu/photos/hero/slide-1.jpg',
    'contenu/photos/hero/slide-1-800w.webp',
    'contenu/photos/hero/slide-1-1200w.webp',
  ].map((path) => new URL(path, base).href);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          shellUrls().map((url) =>
            cache.add(url).catch(() => {
              /* ignore missing optional assets */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/admin')) return;

  const isHtml =
    req.headers.get('accept')?.includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');

  // CSS/JS + content JSON : network-first pour éviter contenu / assets périmés
  const isAsset =
    /\.(?:css|js)$/i.test(url.pathname) ||
    url.pathname.includes('/css/') ||
    url.pathname.includes('/js/');
  const isContentJson =
    url.pathname.endsWith('/data/content.json') ||
    url.pathname.endsWith('data/content.json') ||
    /\/contenu\/[^/]+\.json$/i.test(url.pathname);

  if (isHtml || isAsset || isContentJson) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => {
            if (r) return r;
            if (isHtml) {
              return caches
                .match(new URL('offline.html', self.registration.scope).href)
                .then((offline) => offline || caches.match(new URL('./', self.registration.scope).href));
            }
            return undefined;
          })
        )
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
