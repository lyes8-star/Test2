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
    // /actualites/<slug>/ (si on est sur une page générée, news.js n'est pas chargé)
    const parts = window.location.pathname.split('/').filter(Boolean);
    const ai = parts.indexOf('actualites');
    if (ai >= 0 && parts[ai + 1] && parts[ai + 1] !== 'index.html') {
      return parts[ai + 1];
    }
    const params = new URLSearchParams(window.location.search);
    const q = params.get('slug') || params.get('id');
    if (q) {
      // Redirection vers URL propre
      const target = `./${encodeURIComponent(q)}/`;
      window.location.replace(target);
      return q;
    }
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      window.location.replace(`./${encodeURIComponent(hash)}/`);
      return hash;
    }
    return null;
  }

  async function loadContent() {
    try {
      const res = await fetch('../data/content.json');
      if (res.ok) {
        content = await res.json();
        afterLoad();
        return;
      }
    } catch (_) { /* try API */ }

    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        content = await res.json();
        afterLoad();
        return;
      }
    } catch (_) { /* static */ }

    console.error('Impossible de charger content.json');
  }

  function afterLoad() {
    renderChrome();
    const slug = getSlug();
    if (slug) renderDetail(slug);
    else renderList();
    applyNewsSeo(slug);
    if (window.ProceptSearch) {
      window.ProceptSearch.init(content, { basePath: '../' });
      window.ProceptSearch.loadLexicon?.('../data/seo-keywords.json');
    }
    if (window.ProceptChat) {
      window.ProceptChat.init({
        cities: content.zones?.cities || [],
        email: content.site?.email,
        phone: content.site?.phone,
      });
    }
    if (window.ProceptSocial) window.ProceptSocial.render(content.site?.social || {}, '../');
    if (window.ProceptAnalytics) {
      window.ProceptAnalytics.init({
        adsId: content.site?.adsId || '',
        gaId: content.site?.gaId || '',
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(new URL('../sw.js', document.baseURI).href).catch(() => {});
    }
    initNav();
    initScrollUI();
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && value != null) el.setAttribute(attr, value);
  }

  function absoluteUrl(path) {
    const base = (content.site?.url || 'https://www.procept.fr/').replace(/\/?$/, '/');
    if (!path) return base;
    if (/^https?:\/\//i.test(path)) return path;
    return base + path.replace(/^\//, '');
  }

  function applyNewsSeo(slug) {
    const site = content.site || {};
    const baseUrl = absoluteUrl('actualites/');
    const items = publishedNews();
    const item = slug ? items.find((n) => n.slug === slug || n.id === slug) : null;

    if (item) {
        const url = absoluteUrl(`actualites/${item.slug || item.id}/`);
      const title = `${item.title} — ${site.name || 'Procept'}`;
      const desc = item.excerpt || site.description || '';
      const image = absoluteUrl(item.image || site.ogImage || 'images/hero/slide-1.jpg');
      document.title = title;
      setMeta('meta[name="description"]', 'content', desc);
      setMeta('#canonicalLink', 'href', url);
      setMeta('#ogUrl', 'content', url);
      setMeta('#ogTitle', 'content', title);
      setMeta('#ogDescription', 'content', desc);
      setMeta('#ogImage', 'content', image);
      setMeta('#ogType', 'content', 'article');
      setMeta('#twTitle', 'content', title);
      setMeta('#twDescription', 'content', desc);
      setMeta('#twImage', 'content', image);

      const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: item.title,
        description: desc,
        image: [image],
        datePublished: item.date,
        dateModified: item.date,
        author: { '@type': 'Organization', name: site.name || 'Procept' },
        publisher: {
          '@type': 'Organization',
          name: site.name || 'Procept',
          logo: {
            '@type': 'ImageObject',
            url: absoluteUrl(site.ogImage || 'images/hero/slide-1.jpg'),
            width: 1200,
            height: 630,
          },
        },
        mainEntityOfPage: url,
      };
      const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: absoluteUrl('') },
          { '@type': 'ListItem', position: 2, name: 'Actualités', item: baseUrl },
          { '@type': 'ListItem', position: 3, name: item.title, item: url },
        ],
      };
      const elA = document.getElementById('jsonldArticle');
      const elB = document.getElementById('jsonldBreadcrumb');
      if (elA) elA.textContent = JSON.stringify(articleLd);
      if (elB) elB.textContent = JSON.stringify(breadcrumbLd);
    } else {
      const title = `Actualités — ${site.name || 'Procept'}`;
      const desc =
        'Actualités Procept : livraisons, chantiers en cours et programmes immobiliers dans l\'ouest parisien.';
      document.title = title;
      setMeta('meta[name="description"]', 'content', desc);
      setMeta('#canonicalLink', 'href', baseUrl);
      setMeta('#ogUrl', 'content', baseUrl);
      setMeta('#ogTitle', 'content', title);
      setMeta('#ogDescription', 'content', desc);
      setMeta('#ogType', 'content', 'website');
      const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: absoluteUrl('') },
          { '@type': 'ListItem', position: 2, name: 'Actualités', item: baseUrl },
        ],
      };
      const elB = document.getElementById('jsonldBreadcrumb');
      if (elB) elB.textContent = JSON.stringify(breadcrumbLd);
      const elA = document.getElementById('jsonldArticle');
      if (elA) elA.textContent = '';
    }
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
        <a href="${encodeURIComponent(n.slug || n.id)}/" class="news-card__media">
          <img src="${asset(n.image)}" alt="" width="640" height="400" loading="lazy" decoding="async">
        </a>
        <div class="news-card__body">
          <time class="news-card__date" datetime="${escapeHtml(n.date || '')}">${escapeHtml(formatDate(n.date))}</time>
          <h2 class="news-card__title">
            <a href="${encodeURIComponent(n.slug || n.id)}/">${escapeHtml(n.title)}</a>
          </h2>
          <p class="news-card__excerpt">${escapeHtml(n.excerpt || '')}</p>
          <a class="news-card__more" href="${encodeURIComponent(n.slug || n.id)}/">Lire la suite →</a>
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
    const servicesToggle = document.getElementById('servicesToggle');
    const dropdown = document.getElementById('servicesDropdown');

    function closeNav() {
      nav?.classList.remove('open');
      document.body.classList.remove('nav-open');
      toggle?.setAttribute('aria-expanded', 'false');
      dropdown?.classList.remove('open');
      servicesToggle?.setAttribute('aria-expanded', 'false');
    }

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('nav-open', open);
      });
      nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => closeNav());
      });
    }
    if (servicesToggle && dropdown) {
      servicesToggle.addEventListener('click', () => {
        const open = dropdown.classList.toggle('open');
        servicesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
  }

  function initScrollUI() {
    const header = document.getElementById('header');
    const progress = document.getElementById('scrollProgress');
    const backTop = document.getElementById('backTop');
    let lastY = 0;
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.width = `${docHeight > 0 ? (y / docHeight) * 100 : 0}%`;
        if (header) {
          header.classList.toggle('header--scrolled', y > 24);
          if (y > 40) {
            if (y > lastY + 2) header.classList.add('header--topbar-hidden');
            else if (y < lastY - 2) header.classList.remove('header--topbar-hidden');
          } else {
            header.classList.remove('header--topbar-hidden');
          }
        }
        if (backTop) backTop.hidden = y < 400;
        lastY = y;
      },
      { passive: true }
    );
    if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  loadContent();
})();
