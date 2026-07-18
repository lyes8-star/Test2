#!/usr/bin/env node
/**
 * Génère sitemap, meta SEO, JSON-LD inline, noscript, contenu visible pages métier,
 * et pages actualités/<slug>/.
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

function webpPair(relPath) {
  const clean = String(relPath || '').replace(/^\.\.\//, '');
  if (!/\.jpe?g$/i.test(clean)) return null;
  const base = clean.replace(/\.jpe?g$/i, '');
  return { w800: `${base}-800w.webp`, w1200: `${base}-1200w.webp` };
}

function pictureHtml(relPath, alt, attrs) {
  const a = attrs || {};
  const prefix = a.prefix || '';
  const src = prefix + relPath;
  const webp = webpPair(relPath);
  const sizes = a.sizes || '(max-width: 900px) 100vw, 60vw';
  const width = a.width || 1200;
  const height = a.height || 750;
  const loading = a.loading || 'eager';
  const fetchpriority = a.fetchpriority ? ` fetchpriority="${a.fetchpriority}"` : '';
  const decoding = a.decoding || 'async';
  const cls = a.className ? ` class="${a.className}"` : '';
  const id = a.id ? ` id="${a.id}"` : '';
  const img = `<img${cls}${id} src="${esc(src)}" alt="${esc(alt)}" width="${width}" height="${height}" loading="${loading}" decoding="${decoding}"${fetchpriority}>`;
  if (!webp) return img;
  return `<picture>
  <source type="image/webp" srcset="${esc(prefix + webp.w800)} 800w, ${esc(prefix + webp.w1200)} 1200w" sizes="${esc(sizes)}">
  ${img}
</picture>`;
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

function stripEmptyJsonLd(html) {
  return html.replace(
    /\s*<script type="application\/ld\+json" id="jsonld(?:Business|Faq|Website|Service|Breadcrumb|Article)"><\/script>/g,
    ''
  );
}

function setAttrContent(html, selectorHint, value) {
  // Update meta/link by id or name pattern already present
  if (selectorHint.startsWith('#')) {
    const id = selectorHint.slice(1);
    const re = new RegExp(`(id="${id}"[^>]*?(?:content|href)=")([^"]*)(")`);
    if (re.test(html)) return html.replace(re, `$1${esc(value)}$3`);
    const re2 = new RegExp(`((?:content|href)=")([^"]*)("[^>]*id="${id}")`);
    if (re2.test(html)) return html.replace(re2, `$1${esc(value)}$3`);
  }
  if (selectorHint.startsWith('meta[name=')) {
    const name = selectorHint.match(/meta\[name="([^"]+)"\]/)?.[1];
    if (!name) return html;
    const re = new RegExp(`(<meta name="${name}" content=")([^"]*)(")`);
    if (re.test(html)) return html.replace(re, `$1${esc(value)}$3`);
  }
  if (selectorHint === 'title') {
    return html.replace(/<title>[^<]*<\/title>/, `<title>${esc(value)}</title>`);
  }
  return html;
}

function ensureOgImageMeta(html, imageUrl, alt) {
  const tags = [
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(alt)}">`,
  ];
  let out = html;
  if (!/property="og:image:width"/.test(out)) {
    out = out.replace(
      /(<meta property="og:image"[^>]*>)/,
      `$1\n  ${tags.join('\n  ')}`
    );
  } else {
    out = out.replace(
      /(<meta property="og:image:alt" content=")([^"]*)(")/,
      `$1${esc(alt)}$3`
    );
  }
  return out;
}

function setElementText(html, id, text) {
  const re = new RegExp(`(<[^>]+\\bid="${id}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`);
  if (!re.test(html)) return html;
  return html.replace(re, `$1${esc(text)}$3`);
}

function setElementHtml(html, id, inner) {
  const re = new RegExp(`(<[^>]+\\bid="${id}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`);
  if (!re.test(html)) return html;
  return html.replace(re, `$1${inner}$3`);
}

function applyMeta(html, { title, description, url, image, imageAlt }) {
  let out = html;
  out = setAttrContent(out, 'title', title);
  out = setAttrContent(out, 'meta[name="description"]', description);
  out = setAttrContent(out, '#canonicalLink', url);
  out = setAttrContent(out, '#ogUrl', url);
  out = setAttrContent(out, '#ogTitle', title);
  out = setAttrContent(out, '#ogDescription', description);
  out = setAttrContent(out, '#ogImage', image);
  out = setAttrContent(out, '#twTitle', title);
  out = setAttrContent(out, '#twDescription', description);
  out = setAttrContent(out, '#twImage', image);
  out = ensureOgImageMeta(out, image, imageAlt || title);
  out = out.replace(
    /href="[^"]*favicon\.svg"[^>]*rel="apple-touch-icon"/,
    'href="icons/icon-192.png" rel="apple-touch-icon"'
  );
  out = out.replace(
    /(rel="apple-touch-icon" href=")[^"]*favicon\.svg(")/,
    `$1${url.includes('/constructeur') || url.includes('/renovation') || url.includes('/promotion') || url.includes('/actualites') ? '../icons/icon-192.png' : 'icons/icon-192.png'}$2`
  );
  // Fix apple-touch-icon paths more carefully after
  return out;
}

function fixAppleTouch(html, depth) {
  const icon = `${'../'.repeat(depth)}icons/icon-192.png`;
  return html.replace(
    /(<link rel="apple-touch-icon" href=")[^"]*(")/,
    `$1${icon}$2`
  );
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
    { loc: abs('accessibilite/'), lastmod: today, priority: '0.4' },
  ];
  publishedNews().forEach((n) => {
    urls.push({
      loc: abs(`actualites/${n.slug}/`),
      lastmod: n.date || today,
      priority: '0.75',
    });
  });
  const xml = `<?xml version="1.0" encoding="XML"?>
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
  // Fix XML declaration typo - should be 1.0 encoding UTF-8
  const xmlFixed = xml.replace('encoding="XML"', 'encoding="UTF-8"');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xmlFixed);
  console.log('sitemap.xml:', urls.length, 'urls');
}

function updateIndexHtml() {
  const file = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = stripEmptyJsonLd(html);

  const title = `${site.name} — ${site.tagline}`;
  const description = site.description;
  const image = abs(site.ogImage || 'contenu/photos/hero/slide-1.jpg');
  const firstSlide = content.hero?.slides?.[0];
  const imageAlt = firstSlide?.title || title;

  html = applyMeta(html, {
    title,
    description,
    url: baseUrl,
    image,
    imageAlt,
  });
  html = fixAppleTouch(html, 0);

  const ld = jsonLdScripts([buildBusinessLd(), buildWebsiteLd(), buildFaqLd()]);
  html = replaceBlock(html, 'JSONLD', `  ${ld}`);

  if (firstSlide) {
    html = setElementText(html, 'heroDesc', firstSlide.description || '');
  }

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
  html = stripEmptyJsonLd(html);

  const page = content.pages?.[pageKey];
  const title = page?.seo?.title || `${page?.label} — ${site.name}`;
  const description = page?.seo?.description || site.description;
  const pageUrl = abs(`${page?.slug || dir}/`);
  const imageRel = page?.hero?.image || site.ogImage || 'contenu/photos/hero/slide-1.jpg';
  const image = abs(imageRel);
  const imageAlt = `${page?.hero?.title || page?.label || title} — Procept`;

  html = applyMeta(html, { title, description, url: pageUrl, image, imageAlt });
  html = fixAppleTouch(html, 1);

  // Fill visible hero + intro for crawlers
  html = setElementText(html, 'pageEyebrow', page?.hero?.eyebrow || '');
  html = setElementText(html, 'pageTitle', page?.hero?.title || page?.label || '');
  html = setElementText(html, 'pageDesc', page?.hero?.desc || '');
  html = setElementText(html, 'pageBrand', site.name || 'PROCEPT');

  const introHtml = (page?.intro || [])
    .map((p) => `<p class="page-intro__p">${esc(p)}</p>`)
    .join('');
  html = setElementHtml(html, 'pageIntro', introHtml);

  // Hero image alt + picture if JPG (idempotent: replace existing picture or bare img)
  const pic = pictureHtml(imageRel, imageAlt, {
    prefix: '../',
    className: 'page-hero__image',
    id: 'pageHeroImage',
    width: 1920,
    height: 1080,
    fetchpriority: 'high',
    sizes: '100vw',
  }).replace(/\n/g, ' ');
  if (/<picture>\s*<source[^>]*type="image\/webp"[\s\S]*?id="pageHeroImage"[\s\S]*?<\/picture>/.test(html)) {
    html = html.replace(
      /<picture>\s*<source[^>]*type="image\/webp"[\s\S]*?id="pageHeroImage"[\s\S]*?<\/picture>/,
      pic
    );
  } else if (/<img class="page-hero__image"[^>]*>/.test(html)) {
    html = html.replace(/<img class="page-hero__image"[^>]*>/, pic);
  }

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
  html = stripEmptyJsonLd(html);
  html = fixAppleTouch(html, 1);

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
  // Noscript list without duplicate H1 (page already has H1)
  const noscript = `<noscript>
    <div class="seo-noscript container">
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
  const imageRel = item.image || site.ogImage || 'contenu/photos/hero/slide-1.jpg';
  const image = abs(imageRel);
  const title = `${item.title} — ${site.name || 'Procept'}`;
  const desc = item.excerpt || site.description || '';
  const bodyHtml = (item.body || []).map((p) => `<p>${esc(p)}</p>`).join('\n          ');
  const phoneTel = String(site.phone || '01 39 58 28 23').replace(/\s/g, '');
  const imgAlt = `${item.title} — Procept`;
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

  const heroPicture = item.image
    ? pictureHtml(item.image, imgAlt, {
        prefix: '../../',
        className: 'news-detail__image',
        width: 1200,
        height: 675,
        fetchpriority: 'high',
        sizes: '(max-width: 900px) 100vw, 720px',
      })
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#2c4a3e">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(url)}">
  <link rel="manifest" href="../../manifest.webmanifest">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Procept">
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../../icons/icon-192.png">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:site_name" content="Procept">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(imgAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(image)}">
  <script type="application/ld+json">${JSON.stringify(articleLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <link rel="preload" href="../../fonts/font-2.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="../../fonts/font-5.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../fonts/fonts.css?v=24">
  <link rel="stylesheet" href="../../css/style.css?v=36">
</head>
<body class="page-service" data-news-slug="${esc(item.slug)}">
  <a class="skip-link" href="#main">Aller au contenu</a>
  <header class="header" id="header">
    <div class="container header__inner">
      <a href="../../" class="logo"><span class="logo__mark">P</span><span class="logo__text">PROCEPT</span></a>
      <button class="nav-toggle" id="navToggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav" id="nav" aria-label="Navigation principale">
        <a href="../" class="nav__link">Actualités</a>
        <a href="../../#contact" class="nav__link">Contact</a>
        <div class="nav__mobile-cta">
          <a href="tel:${esc(phoneTel)}" class="btn btn--outline">Appeler Procept</a>
        </div>
      </nav>
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
          ${heroPicture}
          <div class="news-detail__body">
          ${bodyHtml}
          </div>
          <div class="news-detail__cta">
            <a href="../../#devis" class="btn btn--primary" data-open-chat>Parler à l'assistant</a>
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
  <script src="../../js/social.js?v=5" defer></script>
  <script src="../../js/analytics.js?v=4" defer></script>
  <script src="../../js/a11y.js?v=16" defer></script>
  <script src="../../js/protect.js?v=19" defer></script>
  <script src="../../js/chat.js?v=20" defer></script>
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
