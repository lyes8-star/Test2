#!/usr/bin/env node
/**
 * Génère sitemap, JSON-LD inline, noscript et pages actualités/<slug>/.
 * Usage: node scripts/generate-seo.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'content.json'), 'utf8'));
const site = content.site || {};
const baseUrl = (site.url || 'https://www.procept.fr/').replace(/\/?$/, '/');

function abs(p) {
  if (!p) return baseUrl;
  if (/^https?:\/\//i.test(p)) return p;
  return baseUrl + String(p).replace(/^\//, '');
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function validSameAs(urls) {
  const placeholders = new Set([
    'https://www.facebook.com',
    'https://facebook.com',
    'https://www.instagram.com',
    'https://instagram.com',
    'https://www.linkedin.com',
    'https://linkedin.com',
    'https://www.youtube.com',
    'https://youtube.com',
  ]);
  return (urls || []).filter((u) => {
    if (!u || !/^https?:\/\//i.test(u)) return false;
    const cleaned = u.replace(/\/$/, '');
    return !placeholders.has(cleaned) && cleaned.split('/').filter(Boolean).length > 3;
  });
}

function publishedNews() {
  return (content.news || [])
    .filter((n) => n.published !== false)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

function replaceBlock(html, name, inner) {
  const begin = `<!-- SEO:${name}:BEGIN -->`;
  const end = `<!-- SEO:${name}:END -->`;
  const block = `${begin}\n${inner}\n${end}`;
  if (html.includes(begin) && html.includes(end)) {
    return html.replace(new RegExp(`${begin}[\\s\\S]*?${end}`), block);
  }
  // Inject before </head> for JSONLD, before </main> for NOSCRIPT
  if (name === 'JSONLD') {
    return html.replace('</head>', `  ${block}\n</head>`);
  }
  if (name === 'NOSCRIPT') {
    if (html.includes('</main>')) {
      return html.replace('</main>', `  ${block}\n  </main>`);
    }
  }
  return html + `\n${block}\n`;
}

function buildBusinessLd() {
  const phone = `+33${(site.phone || '').replace(/\s/g, '').replace(/^0/, '')}`;
  const logoUrl = abs(site.ogImage || 'contenu/photos/hero/slide-1.jpg');
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${baseUrl}#business`,
    name: site.name,
    description: site.description,
    url: baseUrl,
    telephone: phone,
    email: site.email,
    image: logoUrl,
    logo: { '@type': 'ImageObject', url: logoUrl, width: 1200, height: 630 },
    address: {
      '@type': 'PostalAddress',
      streetAddress: (site.address || '').split(',')[0]?.trim() || site.address,
      addressLocality: site.city || 'Mareil-Marly',
      postalCode: site.postalCode || '78750',
      addressRegion: site.region || 'Île-de-France',
      addressCountry: site.country || 'FR',
    },
    geo: site.geo
      ? { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng }
      : undefined,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    areaServed: (content.zones?.cities || []).map((city) => ({ '@type': 'City', name: city })),
    priceRange: '€€€',
    sameAs: validSameAs(Object.values(site.social || {})),
  };
}

function buildFaqLd() {
  if (!content.faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

function buildWebsiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}#website`,
    name: site.name,
    url: baseUrl,
    description: site.description,
    publisher: { '@id': `${baseUrl}#business` },
  };
}

function buildServiceLd(pageKey) {
  const page = content.pages?.[pageKey];
  if (!page) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.hero?.title || page.label,
    description: page.seo?.description || site.description,
    provider: { '@id': `${baseUrl}#business` },
    areaServed: { '@type': 'AdministrativeArea', name: 'Île-de-France' },
    url: abs(`${page.slug}/`),
  };
}

function buildBreadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

function jsonLdScripts(objects) {
  return objects
    .filter(Boolean)
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n  ');
}

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: baseUrl, lastmod: today, priority: '1.0' },
    { loc: abs('constructeur/'), lastmod: today, priority: '0.95' },
    { loc: abs('renovation/'), lastmod: today, priority: '0.95' },
    { loc: abs('promotion-immobiliere/'), lastmod: today, priority: '0.95' },
    { loc: abs('actualites/'), lastmod: today, priority: '0.85' },
    { loc: abs('mentions-legales/'), lastmod: today, priority: '0.4' },
    { loc: abs('confidentialite/'), lastmod: today, priority: '0.4' },
    { loc: abs('cookies/'), lastmod: today, priority: '0.4' },
  ];
  publishedNews().forEach((n) => {
    urls.push({
      loc: abs(`actualites/${n.slug}/`),
      lastmod: n.date || today,
      priority: '0.75',
    });
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log('sitemap.xml:', urls.length, 'urls');
}

function updateIndexHtml() {
  const file = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const ld = jsonLdScripts([buildBusinessLd(), buildWebsiteLd(), buildFaqLd()]);
  html = replaceBlock(html, 'JSONLD', `  ${ld}`);

  const servicesNs = (content.services || [])
    .map((s) => `<li><a href="${esc(s.link || '#')}">${esc(s.title)}</a> — ${esc(s.description)}</li>`)
    .join('');
  const faqNs = (content.faq || [])
    .map((f) => `<dt>${esc(f.question)}</dt><dd>${esc(f.answer)}</dd>`)
    .join('');
  const noscript = `<noscript>
    <div class="seo-noscript container">
      <h2>Nos services</h2>
      <ul>${servicesNs}</ul>
      <h2>FAQ</h2>
      <dl>${faqNs}</dl>
    </div>
  </noscript>`;
  html = replaceBlock(html, 'NOSCRIPT', noscript);

  // Ensure manifest link
  if (!html.includes('manifest.webmanifest')) {
    html = html.replace(
      '<link rel="apple-touch-icon"',
      '<link rel="manifest" href="manifest.webmanifest">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <link rel="apple-touch-icon"'
    );
  }

  fs.writeFileSync(file, html);
  console.log('updated index.html');
}

function updateServicePage(pageKey, dir) {
  const file = path.join(ROOT, dir, 'index.html');
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  const page = content.pages?.[pageKey];
  const ld = jsonLdScripts([
    buildServiceLd(pageKey),
    buildBreadcrumbLd([
      { name: 'Accueil', item: baseUrl },
      { name: page?.label || pageKey, item: abs(`${page?.slug || dir}/`) },
    ]),
  ]);
  html = replaceBlock(html, 'JSONLD', `  ${ld}`);

  const intro = (page?.intro || []).map((p) => `<p>${esc(p)}</p>`).join('');
  const noscript = `<noscript>
    <div class="seo-noscript container">
      <h1>${esc(page?.hero?.title || page?.label || '')}</h1>
      ${intro}
    </div>
  </noscript>`;
  html = replaceBlock(html, 'NOSCRIPT', noscript);

  if (!html.includes('manifest.webmanifest')) {
    html = html.replace(
      '<link rel="apple-touch-icon"',
      '<link rel="manifest" href="../manifest.webmanifest">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <link rel="apple-touch-icon"'
    );
  }

  fs.writeFileSync(file, html);
  console.log('updated', dir);
}

function updateActualitesIndex() {
  const file = path.join(ROOT, 'actualites', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const list = publishedNews()
    .map(
      (n) =>
        `<li><a href="${esc(n.slug)}/">${esc(n.title)}</a> — <time datetime="${esc(n.date)}">${esc(n.date)}</time>: ${esc(n.excerpt)}</li>`
    )
    .join('');
  const ld = jsonLdScripts([
    buildBreadcrumbLd([
      { name: 'Accueil', item: baseUrl },
      { name: 'Actualités', item: abs('actualites/') },
    ]),
  ]);
  html = replaceBlock(html, 'JSONLD', `  ${ld}`);
  const noscript = `<noscript>
    <div class="seo-noscript container">
      <h1>Actualités Procept</h1>
      <ul>${list}</ul>
    </div>
  </noscript>`;
  html = replaceBlock(html, 'NOSCRIPT', noscript);
  if (!html.includes('manifest.webmanifest')) {
    html = html.replace(
      '<link rel="apple-touch-icon"',
      '<link rel="manifest" href="../manifest.webmanifest">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <link rel="apple-touch-icon"'
    );
  }
  fs.writeFileSync(file, html);
  console.log('updated actualites/index.html');
}

function articlePageHtml(item) {
  const url = abs(`actualites/${item.slug}/`);
  const image = abs(item.image || site.ogImage || 'contenu/photos/hero/slide-1.jpg');
  const title = `${item.title} — ${site.name || 'Procept'}`;
  const desc = item.excerpt || site.description || '';
  const bodyHtml = (item.body || []).map((p) => `<p>${esc(p)}</p>`).join('\n          ');
  const phoneTel = String(site.phone || '01 39 58 28 23').replace(/\s/g, '');
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
        url: abs(site.ogImage || 'contenu/photos/hero/slide-1.jpg'),
        width: 1200,
        height: 630,
      },
    },
    mainEntityOfPage: url,
  };
  const breadcrumbLd = buildBreadcrumbLd([
    { name: 'Accueil', item: baseUrl },
    { name: 'Actualités', item: abs('actualites/') },
    { name: item.title, item: url },
  ]);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#2c4a3e">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(url)}">
  <link rel="manifest" href="../../manifest.webmanifest">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../../favicon.svg">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:site_name" content="Procept">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(image)}">
  <script type="application/ld+json">${JSON.stringify(articleLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <link rel="stylesheet" href="../../fonts/fonts.css?v=21">
  <link rel="stylesheet" href="../../css/style.css?v=21">
</head>
<!--a11y-->
<body class="page-service" data-news-slug="${esc(item.slug)}">
  <a class="skip-link" href="#main">Aller au contenu</a>
  <header class="header" id="header">
    <div class="container header__inner">
      <a href="../../" class="logo"><span class="logo__mark">P</span><span class="logo__text">PROCEPT</span></a>
      <button class="nav-toggle" id="navToggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav" id="nav" aria-label="Navigation principale">
        <p class="nav__mobile-banner">Menu Procept</p>
        <a href="../" class="nav__link">Actualités</a>
        <a href="../../#contact" class="nav__link">Contact</a>
        <div class="nav__mobile-cta">
          <a href="../../#devis" class="btn btn--primary" data-open-chat>Demander un devis</a>
          <a href="tel:${esc(phoneTel)}" class="btn btn--outline">Appeler Procept</a>
        </div>
      </nav>
      <a href="../../#devis" class="btn btn--primary btn--sm header__cta" data-open-chat>Demander un devis</a>
    </div>
  </header>
  <main id="main">
    <section class="section news-page">
      <div class="container">
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
          <a href="../../">Accueil</a>
          <span aria-hidden="true">/</span>
          <a href="../">Actualités</a>
          <span aria-hidden="true">/</span>
          <span>${esc(item.title)}</span>
        </nav>
        <article class="news-detail">
          <time class="news-detail__date" datetime="${esc(item.date || '')}">${esc(item.date || '')}</time>
          <h1 class="news-detail__title">${esc(item.title)}</h1>
          ${item.image ? `<img class="news-detail__image" src="../../${esc(item.image)}" alt="" width="1200" height="675" fetchpriority="high">` : ''}
          <div class="news-detail__body">
          ${bodyHtml}
          </div>
          <div class="news-detail__cta">
            <a href="../../#devis" class="btn btn--primary" data-open-chat>Demander un devis</a>
            <a href="../" class="btn btn--outline">← Toutes les actualités</a>
          </div>
        </article>
      </div>
    </section>
  </main>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand"><span class="logo__text">PROCEPT</span><p>${esc(site.address || '')}</p></div>
      <div class="footer__links">
        <a href="../../constructeur/">Construction</a>
        <a href="../../renovation/">Rénovation</a>
        <a href="../../promotion-immobiliere/">Promotion</a>
        <a href="../">Actualités</a>
        <a href="../../#contact">Contact</a>
        <a href="../../mentions-legales/">Mentions légales</a>
        <a href="../../confidentialite/">Confidentialité</a>
        <a href="../../accessibilite/">Accessibilité</a>
        <a href="../../cookies/">Cookies</a>
        <a href="#" data-manage-cookies>Gérer les cookies</a>
      </div>
      <p class="footer__copy">&copy; 2026 Procept — Constructeur de maisons en Île-de-France</p>
    </div>
  </footer>
  <script src="../../js/consent.js?v=4" defer></script>
  <script src="../../js/social.js?v=4" defer></script>
  <script src="../../js/analytics.js?v=4" defer></script>
  <script src="../../js/a11y.js?v=14" defer></script>
  <script src="../../js/protect.js?v=19" defer></script>
  <script src="../../js/chat.js?v=14" defer></script>
  <script src="../../js/search.js?v=14" defer></script>
  <script src="../../js/pwa-install.js?v=4" defer></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.ProceptAnalytics) {
        window.ProceptAnalytics.init({
          adsId: ${JSON.stringify(site.adsId || '')},
          gaId: ${JSON.stringify(site.gaId || '')},
        });
      }
      if (window.ProceptChat) {
        window.ProceptChat.init({ email: ${JSON.stringify(site.email || '')}, phone: ${JSON.stringify(site.phone || '')} });
      }
      var toggle = document.getElementById('navToggle');
      var nav = document.getElementById('nav');
      var header = document.getElementById('header');
      function closeNav() {
        if (!nav || !toggle) return;
        nav.classList.remove('open');
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
      if (toggle && nav) {
        toggle.addEventListener('click', function () {
          var open = nav.classList.toggle('open');
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          document.body.classList.toggle('nav-open', open);
        });
        nav.querySelectorAll('a').forEach(function (link) {
          link.addEventListener('click', closeNav);
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') closeNav();
        });
      }
      window.addEventListener('scroll', function () {
        if (header) header.classList.toggle('header--scrolled', window.scrollY > 24);
      }, { passive: true });
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(new URL('../../sw.js', document.baseURI).href).catch(function () {});
      }
    });
  </script>
</body>
</html>
`;
}

function generateNewsPages() {
  const newsRoot = path.join(ROOT, 'actualites');
  publishedNews().forEach((item) => {
    const dir = path.join(newsRoot, item.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), articlePageHtml(item));
    console.log('generated actualites/' + item.slug + '/');
  });
}

writeSitemap();
updateIndexHtml();
updateServicePage('construction', 'constructeur');
updateServicePage('renovation', 'renovation');
updateServicePage('promotion', 'promotion-immobiliere');
updateActualitesIndex();
generateNewsPages();
console.log('SEO generation done.');
