/* Service worker Procept — cache app shell (chemins relatifs pour GitHub Pages) */
const CACHE = 'procept-shell-v20';

function shellUrls() {
  const base = self.registration.scope;
  return [
    './',
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
    'js/map-google.js',
    'js/pwa-install.js',
    'fonts/fonts.css',
    'manifest.webmanifest',
    'favicon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
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

  // CSS/JS : network-first pour éviter les vieux assets après un déploiement
  const isAsset =
    /\.(?:css|js)$/i.test(url.pathname) ||
    url.pathname.includes('/css/') ||
    url.pathname.includes('/js/');

  if (isHtml || isAsset) {
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
            if (isHtml) return caches.match(new URL('./', self.registration.scope).href);
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
