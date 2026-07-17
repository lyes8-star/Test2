/**
 * Charge le contenu éditable depuis contenu/*.json (GitHub-friendly),
 * avec repli sur data/content.json puis /api/content.
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
      return await loadFromContenu(basePath);
    } catch (err) {
      console.warn('Contenu fractionné indisponible, repli content.json', err);
    }

    try {
      return await loadFromMonolith(basePath);
    } catch (_) { /* try API */ }

    try {
      return await loadFromApi();
    } catch (_) { /* fail */ }

    throw new Error('Impossible de charger le contenu du site');
  }

  global.ProceptContent = { load, PART_FILES };
})(typeof window !== 'undefined' ? window : globalThis);
