/**
 * Page Actualités — liste et détail (?slug= ou #slug).
 */
(function () {
  const ASSET_PREFIX = '../';
  let content = null;

  function asset(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('/uploads/')) {
      return path.startsWith('/uploads/') ? `..${path}` : path;
    }
    return ASSET_PREFIX + path.replace(/^\//, '');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  function publishedNews() {
    return (content.news || [])
      .filter((n) => n.published !== false)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slug')) return params.get('slug');
    if (params.get('id')) return params.get('id');
    const hash = window.location.hash.replace(/^#/, '');
    return hash || null;
  }

  async function loadContent() {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        content = await res.json();
        afterLoad();
        return;
      }
    } catch (_) { /* static */ }
    const res = await fetch('../data/content.json');
    content = await res.json();
    afterLoad();
  }

  function afterLoad() {
    renderChrome();
    const slug = getSlug();
    if (slug) renderDetail(slug);
    else renderList();
    if (window.ProceptSearch) {
      window.ProceptSearch.init(content, { basePath: '../' });
      window.ProceptSearch.loadLexicon?.('../data/seo-keywords.json');
    }
    initNav();
    initScrollUI();
  }

  function renderChrome() {
    const site = content.site || {};
    const phoneHref = `tel:${(site.phone || '').replace(/\s/g, '')}`;
    const set = (id, fn) => {
      const el = document.getElementById(id);
      if (el) fn(el);
    };
    set('topbarPhone', (el) => {
      el.href = phoneHref;
      const span = el.querySelector('span');
      if (span) span.textContent = site.phone || '';
    });
    set('topbarEmail', (el) => {
      el.href = `mailto:${site.email || ''}`;
      const span = el.querySelector('span');
      if (span) span.textContent = site.email || '';
    });
    set('topbarHours', (el) => {
      const span = el.querySelector('span');
      if (span) span.textContent = site.hours || '';
    });
    set('topbarAddress', (el) => {
      const span = el.querySelector('span');
      if (span) span.textContent = site.address || '';
    });
    set('footerAddress', (el) => {
      el.textContent = site.address || '';
    });
    set('fabPhone', (el) => {
      el.href = phoneHref;
    });
    if (window.ProceptSocial) window.ProceptSocial.render(site.social || {}, '../');
  }

  function renderList() {
    const list = document.getElementById('newsList');
    const detail = document.getElementById('newsDetail');
    if (detail) detail.hidden = true;
    if (list) list.hidden = false;

    const items = publishedNews();
    document.title = `Actualités — ${content.site?.name || 'Procept'}`;

    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<p class="news-empty">Aucune actualité pour le moment.</p>';
      return;
    }

    list.innerHTML = items
      .map(
        (n) => `
      <article class="news-card reveal">
        <a href="?slug=${encodeURIComponent(n.slug || n.id)}" class="news-card__media">
          <img src="${asset(n.image)}" alt="" width="640" height="400" loading="lazy" decoding="async">
        </a>
        <div class="news-card__body">
          <time class="news-card__date" datetime="${escapeHtml(n.date || '')}">${escapeHtml(formatDate(n.date))}</time>
          <h2 class="news-card__title">
            <a href="?slug=${encodeURIComponent(n.slug || n.id)}">${escapeHtml(n.title)}</a>
          </h2>
          <p class="news-card__excerpt">${escapeHtml(n.excerpt || '')}</p>
          <a class="news-card__more" href="?slug=${encodeURIComponent(n.slug || n.id)}">Lire la suite →</a>
        </div>
      </article>`
      )
      .join('');
  }

  function renderDetail(slug) {
    const list = document.getElementById('newsList');
    const detail = document.getElementById('newsDetail');
    if (list) list.hidden = true;
    if (!detail) return;
    detail.hidden = false;

    const item = publishedNews().find((n) => n.slug === slug || n.id === slug);
    if (!item) {
      detail.innerHTML = `
        <p class="news-empty">Article introuvable.</p>
        <a href="./" class="btn btn--outline">← Toutes les actualités</a>`;
      return;
    }

    document.title = `${item.title} — ${content.site?.name || 'Procept'}`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && item.excerpt) desc.setAttribute('content', item.excerpt);

    detail.innerHTML = `
      <a href="./" class="news-detail__back">← Toutes les actualités</a>
      <article class="news-detail">
        <time class="news-detail__date" datetime="${escapeHtml(item.date || '')}">${escapeHtml(formatDate(item.date))}</time>
        <h1 class="news-detail__title">${escapeHtml(item.title)}</h1>
        ${item.image ? `<img class="news-detail__image" src="${asset(item.image)}" alt="" width="1200" height="675" fetchpriority="high">` : ''}
        <div class="news-detail__body">
          ${(item.body || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
        </div>
        <div class="news-detail__cta">
          <a href="../#contact" class="btn btn--primary">Demander un devis</a>
        </div>
      </article>`;
  }

  function initNav() {
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('nav--open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    const servicesToggle = document.getElementById('servicesToggle');
    const dropdown = document.getElementById('servicesDropdown');
    if (servicesToggle && dropdown) {
      servicesToggle.addEventListener('click', () => {
        const open = dropdown.classList.toggle('nav__dropdown--open');
        servicesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  function initScrollUI() {
    const header = document.getElementById('header');
    const progress = document.getElementById('scrollProgress');
    const backTop = document.getElementById('backTop');
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.width = `${docHeight > 0 ? (y / docHeight) * 100 : 0}%`;
        if (header) header.classList.toggle('header--scrolled', y > 50);
        if (backTop) backTop.hidden = y < 400;
      },
      { passive: true }
    );
    if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  loadContent();
})();
