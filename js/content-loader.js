/**
 * Charge le contenu : monolithe data/content.json d’abord (1 requête),
 * puis contenu/*.json, puis /api/content.
 */
(function (global) {
  const PART_FILES = [
    'site.json',
    'diaporama.json',
    'a-propos.json',
    'services.json',
    'galerie.json',
    'actualites.json',
    'faq.json',
    'zones.json',
    'pages.json',
    'process.json',
  ];

  function joinBase(basePath, relative) {
    const base = basePath || '';
    if (!base) return relative;
    return `${base.replace(/\/?$/, '/')}${relative.replace(/^\//, '')}`;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function loadFromContenu(basePath) {
    const parts = await Promise.all(
      PART_FILES.map((file) => fetchJson(joinBase(basePath, `contenu/${file}`)))
    );
    return Object.assign({}, ...parts);
  }

  async function loadFromMonolith(basePath) {
    return fetchJson(joinBase(basePath, 'data/content.json'));
  }

  async function loadFromApi() {
    return fetchJson('/api/content');
  }

  /**
   * @param {{ basePath?: string }} [options]
   * @returns {Promise<object>}
   */
  async function load(options) {
    const basePath = (options && options.basePath) || '';

    try {
      return await loadFromMonolith(basePath);
    } catch (err) {
      console.warn('content.json indisponible, repli contenu/*.json', err);
    }

    try {
      return await loadFromContenu(basePath);
    } catch (_) { /* try API */ }

    try {
      return await loadFromApi();
    } catch (_) { /* fail */ }

    throw new Error('Impossible de charger le contenu du site');
  }

  /** WebP srcset helpers for JPG assets */
  function webpSrcset(path) {
    if (!path || !/\.jpe?g$/i.test(path)) return '';
    const base = path.replace(/\.jpe?g$/i, '');
    return `${base}-800w.webp 800w, ${base}-1200w.webp 1200w`;
  }

  function pictureHtml(path, alt, opts) {
    const o = opts || {};
    const width = o.width || 640;
    const height = o.height || 480;
    const loading = o.loading || 'lazy';
    const decoding = o.decoding || 'async';
    const fetchpriority = o.fetchpriority ? ` fetchpriority="${o.fetchpriority}"` : '';
    const cls = o.className ? ` class="${o.className}"` : '';
    const sizes = o.sizes || '(max-width: 900px) 100vw, 640px';
    const srcset = webpSrcset(path);
    const img = `<img${cls} src="${path}" alt="${alt}" width="${width}" height="${height}" loading="${loading}" decoding="${decoding}"${fetchpriority}>`;
    if (!srcset) return img;
    return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}">${img}</picture>`;
  }

  global.ProceptContent = { load, PART_FILES, webpSrcset, pictureHtml };
})(typeof window !== 'undefined' ? window : globalThis);
