/**
 * Rendu partagé des pages service (Construction / Rénovation / Promotion).
 * Attendu : <body data-page="construction|renovation|promotion">
 */
(function () {
  const PAGE_KEY = document.body.dataset.page;
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

  function absoluteUrl(path) {
    const base = (content.site.url || 'https://www.procept.fr/').replace(/\/?$/, '/');
    if (!path) return base;
    if (/^https?:\/\//i.test(path)) return path;
    return base + path.replace(/^\//, '');
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && value != null) el.setAttribute(attr, value);
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
      const apiRes = await fetch('/api/content');
      if (apiRes.ok) {
        content = await apiRes.json();
        afterLoad();
        return;
      }
    } catch (_) { /* static hosting */ }

    console.error('Impossible de charger content.json');
  }

  function afterLoad() {
    const page = content.pages?.[PAGE_KEY];
    if (!page) {
      console.error('Page introuvable:', PAGE_KEY);
      return;
    }
    applySeo(page);
    renderChrome();
    renderPage(page);
    if (window.ProceptAnalytics) {
      window.ProceptAnalytics.init({
        adsId: content.site?.adsId || '',
        gaId: content.site?.gaId || '',
      });
    }
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
    if ('serviceWorker' in navigator) {
      const RELOAD_KEY = 'procept-sw-reloaded-v9';
      const swUrl = new URL('../sw.js', document.baseURI).href;
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          registration.update().catch(() => {});
          const ask = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          if (registration.waiting) ask();
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) ask();
            });
          });
        })
        .catch(() => {});
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing || sessionStorage.getItem(RELOAD_KEY)) return;
        refreshing = true;
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
      });
    }
    initReveal();
    initNav();
    initScrollUI();
    initLightbox();
  }

  function applySeo(page) {
    const { site } = content;
    const title = page.seo?.title || `${page.label} — ${site.name}`;
    const desc = page.seo?.description || site.description;
    const pageUrl = absoluteUrl(`${page.slug}/`);
    const image = absoluteUrl(page.hero?.image || site.ogImage || 'images/hero/slide-1.jpg');

    document.title = title;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('#canonicalLink', 'href', pageUrl);
    setMeta('#ogUrl', 'content', pageUrl);
    setMeta('#ogTitle', 'content', title);
    setMeta('#ogDescription', 'content', desc);
    setMeta('#ogImage', 'content', image);
    setMeta('#twTitle', 'content', title);
    setMeta('#twDescription', 'content', desc);
    setMeta('#twImage', 'content', image);

    const phone = `+33${site.phone.replace(/\s/g, '').replace(/^0/, '')}`;
    const serviceLd = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: page.label || page.hero?.title,
      description: desc,
      url: pageUrl,
      image,
      provider: {
        '@type': 'HomeAndConstructionBusiness',
        name: site.name,
        telephone: phone,
        email: site.email,
        url: site.url,
        address: {
          '@type': 'PostalAddress',
          streetAddress: site.address.split(',')[0]?.trim() || site.address,
          addressLocality: site.city || 'Mareil-Marly',
          postalCode: site.postalCode || '78750',
          addressRegion: site.region || 'Île-de-France',
          addressCountry: site.country || 'FR',
        },
      },
      areaServed: (content.zones?.cities || []).slice(0, 20).map((city) => ({
        '@type': 'City',
        name: city,
      })),
    };

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: absoluteUrl('') },
        { '@type': 'ListItem', position: 2, name: page.label || 'Service', item: pageUrl },
      ],
    };

    const elService = document.getElementById('jsonldService');
    const elBreadcrumb = document.getElementById('jsonldBreadcrumb');
    if (elService) elService.textContent = JSON.stringify(serviceLd);
    if (elBreadcrumb) elBreadcrumb.textContent = JSON.stringify(breadcrumbLd);
  }

  function renderChrome() {
    const { site } = content;
    const phoneHref = `tel:${site.phone.replace(/\s/g, '')}`;

    const topbarPhone = document.getElementById('topbarPhone');
    if (topbarPhone) {
      topbarPhone.querySelector('span').textContent = site.phone;
      topbarPhone.href = phoneHref;
    }

    const topbarEmail = document.getElementById('topbarEmail');
    if (topbarEmail) {
      topbarEmail.querySelector('span').textContent = site.email;
      topbarEmail.href = `mailto:${site.email}`;
    }

    const hours = document.getElementById('topbarHours');
    if (hours) hours.querySelector('span').textContent = site.hours;

    const address = document.getElementById('topbarAddress');
    if (address) address.querySelector('span').textContent = site.address;

    const fab = document.getElementById('fabPhone');
    if (fab) {
      fab.href = phoneHref;
      fab.setAttribute('aria-label', `Appeler ${site.phone}`);
    }

    const footerAddress = document.getElementById('footerAddress');
    if (footerAddress) footerAddress.textContent = site.address;

    if (window.ProceptSocial) window.ProceptSocial.render(site.social || {}, '../');

    const contactAddress = document.getElementById('contactAddress');
    if (contactAddress) contactAddress.textContent = site.address;
    const contactPhone = document.getElementById('contactPhone');
    if (contactPhone) {
      contactPhone.textContent = site.phone;
      contactPhone.href = phoneHref;
    }
    const contactEmail = document.getElementById('contactEmail');
    if (contactEmail) {
      contactEmail.textContent = site.email;
      contactEmail.href = `mailto:${site.email}`;
    }
    const contactHours = document.getElementById('contactHours');
    if (contactHours) contactHours.textContent = site.hours;
  }

  function renderPage(page) {
    const heroImg = document.getElementById('pageHeroImage');
    if (heroImg && page.hero?.image) {
      heroImg.src = asset(page.hero.image);
      heroImg.alt = `${page.hero.title || page.label} — Procept`;
    }

    const eyebrow = document.getElementById('pageEyebrow');
    if (eyebrow) eyebrow.textContent = page.hero?.eyebrow || '';

    const brand = document.getElementById('pageBrand');
    if (brand) brand.textContent = content.site.name;

    const title = document.getElementById('pageTitle');
    if (title) title.textContent = page.hero?.title || page.label;

    const desc = document.getElementById('pageDesc');
    if (desc) desc.textContent = page.hero?.desc || '';

    const intro = document.getElementById('pageIntro');
    if (intro) {
      intro.innerHTML = (page.intro || [])
        .map((p) => `<p class="page-intro__p">${escapeHtml(p)}</p>`)
        .join('');
    }

    const highlights = document.getElementById('pageHighlights');
    if (highlights) {
      highlights.innerHTML = (page.highlights || [])
        .map(
          (h) => `
        <li class="page-highlights__item reveal">
          <strong class="page-highlights__title">${escapeHtml(h.title)}</strong>
          <span class="page-highlights__text">${escapeHtml(h.text)}</span>
        </li>`
        )
        .join('');
    }

    const secTitle = document.getElementById('pageSecondaryTitle');
    const secText = document.getElementById('pageSecondaryText');
    if (secTitle) secTitle.textContent = page.secondary?.title || '';
    if (secText) secText.textContent = page.secondary?.text || '';

    const steps = document.getElementById('pageSteps');
    if (steps) {
      steps.innerHTML = (page.steps || [])
        .map(
          (s, i) => `
        <li class="page-steps__item reveal">
          <span class="page-steps__num">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h3 class="page-steps__title">${escapeHtml(s.title)}</h3>
            <p class="page-steps__desc">${escapeHtml(s.description)}</p>
          </div>
        </li>`
        )
        .join('');
    }

    const ctaTitle = document.getElementById('pageCtaTitle');
    const ctaText = document.getElementById('pageCtaText');
    if (ctaTitle) ctaTitle.textContent = page.cta?.title || 'Contactez-nous';
    if (ctaText) ctaText.textContent = page.cta?.text || '';

    renderGallery(page.galleryFilter || PAGE_KEY);
  }

  function renderGallery(filter) {
    const grid = document.getElementById('pageGallery');
    const countEl = document.getElementById('pageGalleryCount');
    if (!grid) return;

    let items = (content.gallery || []).filter((item) => item.category === filter);
    // Inclure extensions pour rénovation si peu de photos
    if (filter === 'renovation' && items.length < 6) {
      const extra = (content.gallery || []).filter((item) => item.category === 'extension');
      items = items.concat(extra);
    }

    if (countEl) {
      countEl.textContent = `${items.length} photo${items.length > 1 ? 's' : ''}`;
    }

    const visible = items.slice(0, 9);
    grid.innerHTML = visible
      .map(
        (item, i) => `
      <button type="button" class="gallery__item reveal" data-index="${i}">
        <img src="${asset(item.image)}" alt="${escapeHtml(item.caption)} — Procept" width="640" height="480" loading="lazy" decoding="async">
        <span class="gallery__caption">${escapeHtml(item.caption)}</span>
      </button>`
      )
      .join('');

    grid.querySelectorAll('.gallery__item').forEach((el) => {
      el.addEventListener('click', () => {
        const item = visible[+el.dataset.index];
        openLightbox(item);
      });
    });
  }

  function openLightbox(item) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    const cap = document.getElementById('lightboxCaption');
    if (!lb || !img) return;
    img.src = asset(item.imageFull || item.image);
    img.alt = item.caption || '';
    if (cap) cap.textContent = item.caption || '';
    lb.hidden = false;
  }

  function initLightbox() {
    const lb = document.getElementById('lightbox');
    const close = document.getElementById('lightboxClose');
    close?.addEventListener('click', () => { lb.hidden = true; });
    lb?.addEventListener('click', (e) => {
      if (e.target === lb) lb.hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb && !lb.hidden) lb.hidden = true;
    });
  }

  function initReveal() {
    const els = document.querySelectorAll('.reveal:not(.revealed)');
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  function initNav() {
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('nav');
    const header = document.getElementById('header');
    const servicesToggle = document.getElementById('servicesToggle');
    const servicesDropdown = document.getElementById('servicesDropdown');
    const exploreToggle = document.getElementById('exploreToggle');
    const exploreDropdown = document.getElementById('exploreDropdown');

    function closeNav() {
      nav?.classList.remove('open');
      document.body.classList.remove('nav-open');
      toggle?.setAttribute('aria-expanded', 'false');
      servicesDropdown?.classList.remove('open');
      servicesToggle?.setAttribute('aria-expanded', 'false');
      exploreDropdown?.classList.remove('open');
      exploreToggle?.setAttribute('aria-expanded', 'false');
    }

    toggle?.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      document.body.classList.toggle('nav-open', open);
    });

    function bindAccordion(btn, dropdown, otherBtn, otherDropdown) {
      btn?.addEventListener('click', (e) => {
        e.preventDefault();
        const open = dropdown.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
        otherDropdown?.classList.remove('open');
        otherBtn?.setAttribute('aria-expanded', 'false');
      });
    }

    bindAccordion(servicesToggle, servicesDropdown, exploreToggle, exploreDropdown);
    bindAccordion(exploreToggle, exploreDropdown, servicesToggle, servicesDropdown);

    nav?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeNav());
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (window.ProceptSearch?.isOpen?.()) return;
        closeNav();
      }
    });

    document.addEventListener('click', (e) => {
      if (servicesDropdown && !servicesDropdown.contains(e.target)) {
        servicesDropdown.classList.remove('open');
        servicesToggle?.setAttribute('aria-expanded', 'false');
      }
      if (exploreDropdown && !exploreDropdown.contains(e.target)) {
        exploreDropdown.classList.remove('open');
        exploreToggle?.setAttribute('aria-expanded', 'false');
      }
    });

    let lastY = 0;
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        header?.classList.toggle('header--scrolled', y > 24);
        if (y > 40) {
          if (y > lastY + 2) header?.classList.add('header--topbar-hidden');
          else if (y < lastY - 2) header?.classList.remove('header--topbar-hidden');
        } else {
          header?.classList.remove('header--topbar-hidden');
        }
        lastY = y;
      },
      { passive: true }
    );
  }

  function initScrollUI() {
    const progress = document.getElementById('scrollProgress');
    const backTop = document.getElementById('backTop');
    window.addEventListener(
      'scroll',
      () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progress && max > 0) {
          progress.style.width = `${(window.scrollY / max) * 100}%`;
        }
        if (backTop) backTop.hidden = window.scrollY < 400;
      },
      { passive: true }
    );
    backTop?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  loadContent();
})();
