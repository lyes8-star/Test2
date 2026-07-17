let content = null;
let currentSlide = 0;
let slideInterval = null;
let lastScrollY = 0;
let galleryFilter = 'all';
let galleryStatus = 'all';
let galleryExpanded = false;
const GALLERY_VISIBLE = 9;

function siteBasePath() {
  // Support GitHub Pages project sites: /Test2/
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] && !['constructeur', 'renovation', 'promotion-immobiliere', 'actualites', 'admin'].includes(parts[0]) && !parts[0].includes('.')) {
    // Heuristic: first segment is repo name on github.io
    if (location.hostname.endsWith('github.io')) {
      return `/${parts[0]}/`;
    }
  }
  return '/';
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const RELOAD_KEY = 'procept-sw-reloaded-v13';

  const swUrl = new URL('sw.js', document.baseURI || window.location.href);
  navigator.serviceWorker
    .register(swUrl.href)
    .then((registration) => {
      registration.update().catch(() => {});

      const askWaitingToActivate = () => {
        if (!registration.waiting) return;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      if (registration.waiting) askWaitingToActivate();

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            askWaitingToActivate();
          }
        });
      });
    })
    .catch(() => {});

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    refreshing = true;
    sessionStorage.setItem(RELOAD_KEY, '1');
    window.location.reload();
  });
}

async function loadContent() {
  const base = siteBasePath();
  const basePath = base === '/' ? '' : base;

  try {
    if (window.ProceptContent?.load) {
      content = await window.ProceptContent.load({ basePath });
      afterLoad();
      return;
    }
  } catch (err) {
    console.warn('ProceptContent.load a échoué', err);
  }

  const candidates = ['data/content.json', './data/content.json'];
  if (basePath) candidates.push(`${basePath}data/content.json`.replace(/\/+/g, '/'));

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        content = await res.json();
        afterLoad();
        return;
      }
    } catch (_) { /* try next */ }
  }

  try {
    const apiRes = await fetch('/api/content');
    if (apiRes.ok) {
      content = await apiRes.json();
      afterLoad();
      return;
    }
  } catch (_) { /* no API */ }

  console.error('Impossible de charger le contenu');
}

function afterLoad() {
  applySeo(content);
  renderSite();
  if (window.ProceptAnalytics) {
    window.ProceptAnalytics.init({
      adsId: content.site?.adsId || '',
      gaId: content.site?.gaId || '',
    });
  }
  if (window.ProceptSearch) {
    window.ProceptSearch.init(content);
    window.ProceptSearch.loadLexicon?.('data/seo-keywords.json');
  }
  if (window.ProceptChat) {
    window.ProceptChat.init({
      cities: content.zones?.cities || [],
      email: content.site?.email,
      phone: content.site?.phone,
    });
  }
  registerServiceWorker();
  initReveal();
  initScrollSpy();
  initGalleryFilters();
  initFaqAccordion();
}

function absoluteUrl(path) {
  const base = (content.site.url || 'https://www.procept.fr/').replace(/\/?$/, '/');
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return base + path.replace(/^\//, '');
}

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (!el || value == null) return;
  if (el.getAttribute(attr) !== String(value)) el.setAttribute(attr, value);
}

function applySeo(data) {
  const { site } = data;
  const title = `${site.name} — ${site.tagline}`;
  const desc = site.description;
  const url = site.url || 'https://www.procept.fr/';
  const image = absoluteUrl(site.ogImage || 'contenu/photos/hero/slide-1.jpg');

  if (document.title !== title) document.title = title;
  setMeta('meta[name="description"]', 'content', desc);
  setMeta('#canonicalLink', 'href', url);
  setMeta('#ogUrl', 'content', url);
  setMeta('#ogTitle', 'content', title);
  setMeta('#ogDescription', 'content', desc);
  setMeta('#ogImage', 'content', image);
  setMeta('meta[property="og:image:alt"]', 'content', title);
  setMeta('#twTitle', 'content', title);
  setMeta('#twDescription', 'content', desc);
  setMeta('#twImage', 'content', image);
  // JSON-LD is injected statically by generate-seo.js (SEO:JSONLD blocks).
}

function renderSite() {
  const { site, hero, about, services, process, contactImage, zones, faq, news } = content;

  const phoneHref = `tel:${site.phone.replace(/\s/g, '')}`;

  const topbarPhone = document.getElementById('topbarPhone');
  topbarPhone.querySelector('span').textContent = site.phone;
  topbarPhone.href = phoneHref;

  const topbarEmail = document.getElementById('topbarEmail');
  topbarEmail.querySelector('span').textContent = site.email;
  topbarEmail.href = `mailto:${site.email}`;

  document.getElementById('topbarHours').querySelector('span').textContent = site.hours;
  if (window.ProceptMapGoogle?.bindTopbarAddress) {
    window.ProceptMapGoogle.bindTopbarAddress(document.getElementById('topbarAddress'), {
      address: site.address,
      geo: site.geo,
      hqLabel: site.city || 'Mareil-Marly',
    });
  } else {
    const topbarAddress = document.getElementById('topbarAddress');
    if (topbarAddress) {
      const span = topbarAddress.querySelector('.topbar__address-text') || topbarAddress.querySelector('span');
      if (span) span.textContent = site.address;
    }
  }

  const fab = document.getElementById('fabPhone');
  fab.href = phoneHref;
  fab.setAttribute('aria-label', `Appeler ${site.phone}`);

  document.getElementById('heroEyebrow').textContent = site.tagline;
  document.getElementById('heroTitle').textContent = site.name;
  const subtitle = document.getElementById('heroSubtitle');
  if (subtitle) subtitle.textContent = site.tagline;

  renderHero(hero.slides);
  renderServices(services);
  renderProcess(process || []);
  renderGallery();
  renderFaqTicker(faq || []);
  renderNewsHome(news || []);
  renderZones(zones);
  renderFaq(faq || []);
  if (window.ProceptSocial) window.ProceptSocial.render(site.social || {});

  document.getElementById('aboutTitle').textContent = about.title;
  document.getElementById('aboutText').textContent = about.text;
  document.getElementById('aboutZone').textContent = about.zone;
  if (about.image) {
    const aboutImg = document.getElementById('aboutImage');
    const src = String(about.image).replace(/-full\.(jpe?g)$/i, '.$1');
    const alt = `Siège social Procept — ${site.address}`;
    if (window.ProceptContent?.pictureHtml && aboutImg?.parentElement) {
      const wrap = aboutImg.closest('.about__visual') || aboutImg.parentElement;
      const pic = window.ProceptContent.pictureHtml(src, alt, {
        width: 800,
        height: 600,
        loading: 'lazy',
        className: aboutImg.className || '',
        sizes: '(max-width: 900px) 100vw, 480px',
      });
      const tmp = document.createElement('div');
      tmp.innerHTML = pic;
      const next = tmp.firstElementChild;
      if (next) {
        if (aboutImg.id) {
          const img = next.tagName === 'PICTURE' ? next.querySelector('img') : next;
          if (img) img.id = 'aboutImage';
        }
        aboutImg.replaceWith(next);
      }
    } else if (aboutImg) {
      aboutImg.src = src;
      aboutImg.alt = alt;
    }
  }

  if (contactImage) {
    document.getElementById('contactAmbiance').style.backgroundImage = `url('${contactImage}')`;
  }

  document.getElementById('contactAddress').textContent = site.address;
  document.getElementById('contactPhone').textContent = site.phone;
  document.getElementById('contactPhone').href = phoneHref;
  document.getElementById('contactFax').textContent = site.fax;
  document.getElementById('contactEmail').textContent = site.email;
  document.getElementById('contactEmail').href = `mailto:${site.email}`;
  document.getElementById('contactHours').textContent = site.hours;
  document.getElementById('footerAddress').textContent = site.address;
}

function renderZones(zones) {
  if (!zones) return;
  const title = document.getElementById('zonesTitle');
  const intro = document.getElementById('zonesIntro');
  const list = document.getElementById('zonesList');
  if (title) title.textContent = zones.title;
  if (intro) intro.textContent = zones.intro;
  if (window.ProceptMapGoogle) {
    window.ProceptMapGoogle.render(document.getElementById('zonesMap'), zones.cities || [], {
      geo: content?.site?.geo,
      hqLabel: content?.site?.city || 'Mareil-Marly',
      listEl: list,
    });
  } else if (list) {
    list.innerHTML = (zones.cities || [])
      .map((city) => `<li class="zones__item"><a href="#contact">${escapeHtml(city)}</a></li>`)
      .join('');
  }
}

function formatNewsDate(iso) {
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

function renderNewsHome(items) {
  const grid = document.getElementById('newsHomeGrid');
  if (!grid) return;
  const published = (items || [])
    .filter((n) => n.published !== false)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 3);

  if (!published.length) {
    grid.innerHTML = '<p class="news-empty">Aucune actualité pour le moment.</p>';
    return;
  }

  grid.innerHTML = published.map((n) => `
    <article class="news-card reveal" data-id="${escapeHtml(n.id || n.slug || '')}">
      <a href="actualites/${encodeURIComponent(n.slug || n.id)}/" class="news-card__media">
        ${window.ProceptContent?.pictureHtml
          ? window.ProceptContent.pictureHtml(n.image, escapeHtml(n.title || ''), { width: 640, height: 400, sizes: '(max-width: 900px) 100vw, 360px' })
          : `<img src="${n.image}" alt="${escapeHtml(n.title || '')}" width="640" height="400" loading="lazy" decoding="async">`}
      </a>
      <div class="news-card__body">
        <time class="news-card__date" datetime="${escapeHtml(n.date || '')}">${escapeHtml(formatNewsDate(n.date))}</time>
        <h3 class="news-card__title">
          <a href="actualites/${encodeURIComponent(n.slug || n.id)}/">${escapeHtml(n.title)}</a>
        </h3>
        <p class="news-card__excerpt">${escapeHtml(n.excerpt || '')}</p>
      </div>
    </article>
  `).join('');
  initReveal();
}

function renderFaq(items) {
  const list = document.getElementById('faqList');
  if (!list) return;
  list.innerHTML = items.map((item, i) => `
    <details class="faq__item" data-search-id="faq-${i}"${i === 0 ? ' open' : ''}>
      <summary class="faq__question">${escapeHtml(item.question)}</summary>
      <div class="faq__answer"><p>${escapeHtml(item.answer)}</p></div>
    </details>
  `).join('');
}

function initFaqAccordion() {
  // Native <details> is enough; ensure only one open on click for cleaner UX
  const list = document.getElementById('faqList');
  if (!list) return;
  list.addEventListener('toggle', (e) => {
    if (!e.target.open) return;
    list.querySelectorAll('details.faq__item').forEach((d) => {
      if (d !== e.target) d.open = false;
    });
  }, true);
}

let faqTickerTimer = null;
let faqTickerIndex = 0;

function renderFaqTicker(items) {
  const root = document.getElementById('faqTicker');
  const qEl = document.getElementById('faqTickerQuestion');
  const aEl = document.getElementById('faqTickerAnswer');
  const panel = document.querySelector('.faq-ticker__content');
  if (!root || !qEl || !aEl) return;

  const list = (items || []).filter((item) => item && item.question && item.answer);
  if (!list.length) {
    root.hidden = true;
    return;
  }
  root.hidden = false;

  const show = (index) => {
    const item = list[((index % list.length) + list.length) % list.length];
    qEl.textContent = item.question;
    aEl.textContent = item.answer;
  };

  const goNext = () => {
    if (panel) panel.classList.add('is-swap');
    window.setTimeout(() => {
      faqTickerIndex = (faqTickerIndex + 1) % list.length;
      show(faqTickerIndex);
      if (panel) panel.classList.remove('is-swap');
    }, 420);
  };

  if (faqTickerTimer) {
    clearInterval(faqTickerTimer);
    faqTickerTimer = null;
  }

  faqTickerIndex = 0;
  show(0);

  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('a11y-motion');
  if (reduceMotion) return;

  faqTickerTimer = setInterval(goNext, 7000);
}

window.addEventListener('procept:a11y-motion', () => {
  if (document.documentElement.classList.contains('a11y-motion') && faqTickerTimer) {
    clearInterval(faqTickerTimer);
    faqTickerTimer = null;
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderHero(slides) {
  const container = document.getElementById('heroSlides');
  const dots = document.getElementById('heroDots');
  const frame = document.getElementById('heroFrame');
  const lcp = document.getElementById('heroLcp');

  container.innerHTML = slides.map((slide, i) => {
    const webp = window.ProceptContent?.webpSrcset?.(slide.image) || '';
    const bg = webp
      ? ''
      : `style="background-image:url('${slide.image}')"`;
    const picture = webp
      ? `<picture><source type="image/webp" srcset="${webp}" sizes="(max-width: 900px) 100vw, 60vw"><img src="${slide.image}" alt="" width="1200" height="750" decoding="async"></picture>`
      : '';
    return `<div class="hero__slide${i === 0 ? ' active' : ''}" ${bg} data-index="${i}" role="img" aria-label="${escapeHtml(slide.title)}">${picture}</div>`;
  }).join('');

  if (lcp) lcp.hidden = true;
  if (frame) frame.classList.add('hero__frame--ready');

  dots.innerHTML = slides.map((_, i) =>
    `<button type="button" class="hero__dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
  ).join('');

  updateHeroText(slides[0]);
  startSlideshow(slides.length);

  dots.querySelectorAll('.hero__dot').forEach((dot) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(+dot.dataset.index, slides.length);
    });
  });

  if (frame && !frame.dataset.zoomBound) {
    frame.dataset.zoomBound = '1';
    frame.addEventListener('click', () => {
      const slide = content?.hero?.slides?.[currentSlide];
      if (!slide) return;
      openLightbox({
        image: slide.image,
        imageFull: slide.image,
        caption: slide.title || '',
      });
    });
  }

  if (frame && !frame.dataset.swipeBound) {
    frame.dataset.swipeBound = '1';
    let touchX = 0;
    let touchY = 0;
    frame.addEventListener(
      'touchstart',
      (e) => {
        const t = e.changedTouches[0];
        touchX = t.clientX;
        touchY = t.clientY;
      },
      { passive: true }
    );
    frame.addEventListener(
      'touchend',
      (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - touchX;
        const dy = t.clientY - touchY;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) goToSlide(currentSlide + 1, slides.length);
        else goToSlide(currentSlide - 1, slides.length);
      },
      { passive: true }
    );
  }
}

function updateHeroText(slide) {
  document.getElementById('heroDesc').textContent = slide.description;
  const subtitle = document.getElementById('heroSubtitle');
  if (subtitle) subtitle.textContent = slide.title;
  // H1 (#heroTitle) reste la marque Procept — ne pas l'écraser
}

function goToSlide(index, total) {
  currentSlide = ((index % total) + total) % total;
  document.querySelectorAll('.hero__slide').forEach((s, i) => {
    const on = i === currentSlide;
    if (on) {
      s.classList.remove('active');
      void s.offsetWidth;
    }
    s.classList.toggle('active', on);
  });
  document.querySelectorAll('.hero__dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
  updateHeroText(content.hero.slides[currentSlide]);
  resetSlideshow(total);
}

function startSlideshow(total) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.classList.contains('a11y-motion')) return;
  slideInterval = setInterval(() => {
    if (document.documentElement.classList.contains('a11y-motion')) return;
    goToSlide(currentSlide + 1, total);
  }, 3500);
}

window.addEventListener('procept:a11y-motion', () => {
  if (document.documentElement.classList.contains('a11y-motion') && slideInterval) {
    clearInterval(slideInterval);
    slideInterval = null;
  }
});

function resetSlideshow(total) {
  clearInterval(slideInterval);
  startSlideshow(total);
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = services.map((s) => {
    const href = s.link || `#${s.id}`;
    const isPage = href && !href.startsWith('#');
    const mainImg = window.ProceptContent?.pictureHtml
      ? window.ProceptContent.pictureHtml(s.image, `${escapeHtml(s.title)} — Procept constructeur Mareil-Marly`, {
          width: 800,
          height: 600,
          loading: 'lazy',
          sizes: '(max-width: 900px) 100vw, 400px',
        })
      : `<img src="${s.image}" alt="${escapeHtml(s.title)} — Procept constructeur Mareil-Marly" width="800" height="600" loading="lazy" decoding="async">`;
    return `
    <article class="service-card reveal" id="${s.id}" data-keywords="${(s.keywords || []).join(',')}">
      <a class="service-card__image" href="${escapeHtml(href)}" ${isPage ? '' : ''}>
        ${mainImg}
        <span class="service-card__media-label">
          <span class="service-card__media-kicker">Métier</span>
          <span class="service-card__media-title">${escapeHtml(s.title)}</span>
        </span>
      </a>
      <div class="service-card__body">
        <h3 class="service-card__title">
          <a href="${escapeHtml(href)}">${escapeHtml(s.title)}</a>
        </h3>
        <p class="service-card__desc">${escapeHtml(s.description)}</p>
        ${isPage ? `<a class="service-card__more" href="${escapeHtml(href)}">En savoir plus →</a>` : ''}
        ${(s.related || []).length ? `
          <div class="service-card__thumbs">
            ${s.related.map((src, i) => `
              <button type="button" class="service-card__thumb" data-service="${s.id}" data-img="${src}" aria-label="${escapeHtml(s.title)} photo ${i + 1}">
                ${window.ProceptContent?.pictureHtml
                  ? window.ProceptContent.pictureHtml(src, `${escapeHtml(s.title)} — réalisation Procept ${i + 1}`, { width: 120, height: 90, sizes: '120px' })
                  : `<img src="${src}" alt="${escapeHtml(s.title)} — réalisation Procept ${i + 1}" width="120" height="90" loading="lazy" decoding="async">`}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.service-card__thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      openLightbox({ image: btn.dataset.img, imageFull: btn.dataset.img, caption: btn.closest('.service-card').querySelector('.service-card__title').textContent });
    });
  });
  initReveal();
}

function renderProcess(steps) {
  const grid = document.getElementById('processGrid');
  if (!grid || !steps.length) return;
  grid.innerHTML = steps.map((step, i) => `
    <article class="process__step reveal">
      <div class="process__image">
        ${window.ProceptContent?.pictureHtml
          ? window.ProceptContent.pictureHtml(step.image, escapeHtml(step.title), { width: 640, height: 480, sizes: '(max-width: 900px) 100vw, 320px' })
          : `<img src="${step.image}" alt="${escapeHtml(step.title)}" width="640" height="480" loading="lazy" decoding="async">`}
        <span class="process__num">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <h3 class="process__title">${escapeHtml(step.title)}</h3>
      <p class="process__desc">${escapeHtml(step.description)}</p>
    </article>
  `).join('');
  initReveal();
}

function filteredGallery() {
  const items = content.gallery || [];
  return items.filter((item) => {
    const catOk = galleryFilter === 'all' || item.category === galleryFilter;
    const status = item.status || 'termine';
    const statusOk = galleryStatus === 'all' || status === galleryStatus;
    return catOk && statusOk;
  });
}

function statusLabel(status) {
  return status === 'en-cours' ? 'En cours' : 'Livré';
}

function categoryLabel(category) {
  const labels = {
    construction: 'Construction',
    renovation: 'Rénovation',
    extension: 'Extension',
    chantier: 'Chantier',
    promotion: 'Promotion',
    autre: 'Réalisation',
  };
  return labels[category] || 'Réalisation';
}

function renderGallery() {
  const items = filteredGallery();
  const grid = document.getElementById('galleryGrid');
  const countEl = document.getElementById('galleryCount');
  const moreBtn = document.getElementById('galleryMore');

  if (countEl) {
    countEl.textContent = `${items.length} photo${items.length > 1 ? 's' : ''}`;
  }

  grid.innerHTML = items.map((item, i) => {
    const hide = !galleryExpanded && i >= GALLERY_VISIBLE;
    const status = item.status || 'termine';
    const category = item.category || 'autre';
    return `
    <button type="button" class="gallery__item reveal${hide ? ' hidden' : ''}" data-index="${i}" data-id="${item.id}" data-category="${category}" data-status="${status}" aria-label="${escapeHtml(item.caption)}">
      ${window.ProceptContent?.pictureHtml
        ? window.ProceptContent.pictureHtml(item.image, `${escapeHtml(item.caption)} — ${escapeHtml(categoryLabel(category))} Procept`, { width: 640, height: 480, sizes: '(max-width: 900px) 50vw, 320px' })
        : `<img src="${item.image}" alt="${escapeHtml(item.caption)} — ${escapeHtml(categoryLabel(category))} Procept" width="640" height="480" loading="lazy" decoding="async">`}
      <span class="gallery__caption">
        <span class="gallery__meta">
          <span class="gallery__cat">${escapeHtml(categoryLabel(category))}</span>
          <span class="gallery__status">${statusLabel(status)}</span>
        </span>
        <span class="gallery__title">${escapeHtml(item.caption)}</span>
      </span>
    </button>`;
  }).join('');

  grid.querySelectorAll('.gallery__item').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = +el.dataset.index;
      openLightbox(items[idx]);
    });
  });

  if (items.length <= GALLERY_VISIBLE) {
    moreBtn.style.display = 'none';
  } else {
    moreBtn.style.display = galleryExpanded ? 'none' : '';
    moreBtn.onclick = () => {
      galleryExpanded = true;
      renderGallery();
    };
  }
  initReveal();
}

function initGalleryFilters() {
  document.querySelectorAll('#galleryFilters .gallery__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#galleryFilters .gallery__filter').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      galleryFilter = btn.dataset.filter;
      galleryExpanded = false;
      renderGallery();
    });
  });

  document.querySelectorAll('#galleryStatusFilters .gallery__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#galleryStatusFilters .gallery__filter').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      galleryStatus = btn.dataset.status;
      galleryExpanded = false;
      renderGallery();
    });
  });
}

function openLightbox(item) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightboxImg').src = item.imageFull || item.image;
  document.getElementById('lightboxImg').alt = item.caption || '';
  document.getElementById('lightboxCaption').textContent = item.caption || '';
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.body.style.overflow = '';
}

/* —— Scroll UX —— */
const header = document.getElementById('header');
const progress = document.getElementById('scrollProgress');
const backTop = document.getElementById('backTop');

function updateScrollUI() {
  const y = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (y / docHeight) * 100 : 0;

  progress.style.width = `${pct}%`;
  header.classList.toggle('header--scrolled', y > 24);
  backTop.hidden = y < 400;

  if (y > 40) {
    if (y > lastScrollY + 2) header.classList.add('header--topbar-hidden');
    else if (y < lastScrollY - 2) header.classList.remove('header--topbar-hidden');
  } else {
    header.classList.remove('header--topbar-hidden');
  }

  lastScrollY = y;
}

window.addEventListener('scroll', updateScrollUI, { passive: true });
updateScrollUI();

backTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* —— Reveal —— */
let revealObserver = null;

function initReveal() {
  document.documentElement.classList.add('reveals-on');
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }
  document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => {
    revealObserver.observe(el);
  });
}

/* —— Scroll spy —— */
function initScrollSpy() {
  const sections = ['accueil', 'services', 'apropos', 'realisations', 'actualites', 'zones', 'faq', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = document.querySelectorAll('.nav__link[data-section], .nav__mega-item[data-section]');

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle('active', link.dataset.section === id);
        });
        const exploreOpen = ['realisations', 'actualites', 'apropos', 'zones', 'faq'].includes(id);
        document.getElementById('exploreToggle')?.classList.toggle('active', exploreOpen);
        document.getElementById('servicesToggle')?.classList.toggle('active', id === 'services');
      });
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((s) => spy.observe(s));
}

/* —— Mobile nav —— */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const servicesToggle = document.getElementById('servicesToggle');
const servicesDropdown = document.getElementById('servicesDropdown');
const exploreToggle = document.getElementById('exploreToggle');
const exploreDropdown = document.getElementById('exploreDropdown');

navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  document.body.classList.toggle('nav-open', open);
});

function closeMobileNav() {
  nav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
  servicesDropdown?.classList.remove('open');
  servicesToggle?.setAttribute('aria-expanded', 'false');
  exploreDropdown?.classList.remove('open');
  exploreToggle?.setAttribute('aria-expanded', 'false');
}

document.querySelectorAll('.nav__link:not(.nav__link--parent), .nav__mega-item, .nav__mega-all').forEach((link) => {
  link.addEventListener('click', () => closeMobileNav());
});

function bindMobileDropdown(toggle, dropdown, desktopScrollId) {
  if (!toggle || !dropdown) return;
  toggle.addEventListener('click', (e) => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      e.preventDefault();
      const open = dropdown.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      // close the other accordion
      if (dropdown !== servicesDropdown) {
        servicesDropdown?.classList.remove('open');
        servicesToggle?.setAttribute('aria-expanded', 'false');
      }
      if (dropdown !== exploreDropdown) {
        exploreDropdown?.classList.remove('open');
        exploreToggle?.setAttribute('aria-expanded', 'false');
      }
    } else if (desktopScrollId) {
      document.getElementById(desktopScrollId)?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

bindMobileDropdown(servicesToggle, servicesDropdown, 'services');
bindMobileDropdown(exploreToggle, exploreDropdown, null);

/* —— Search : FAB page via ProceptSearch + Ctrl/Cmd+K —— */

document.getElementById('heroPrev').addEventListener('click', (e) => {
  e.stopPropagation();
  if (content) goToSlide(currentSlide - 1, content.hero.slides.length);
});
document.getElementById('heroNext').addEventListener('click', (e) => {
  e.stopPropagation();
  if (content) goToSlide(currentSlide + 1, content.hero.slides.length);
});

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (window.ProceptSearch?.isOpen?.()) return;
    closeLightbox();
    closeMobileNav();
  }
});

loadContent();
