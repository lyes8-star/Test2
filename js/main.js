let content = null;
let currentSlide = 0;
let slideInterval = null;
let lastScrollY = 0;
let galleryFilter = 'all';
let galleryExpanded = false;
const GALLERY_VISIBLE = 9;

async function loadContent() {
  try {
    const res = await fetch('/api/content');
    if (res.ok) {
      content = await res.json();
      afterLoad();
      return;
    }
  } catch (_) { /* pas de serveur API */ }

  const res = await fetch('data/content.json');
  content = await res.json();
  afterLoad();
}

function afterLoad() {
  renderSite();
  if (window.ProceptSearch) window.ProceptSearch.init(content);
  initReveal();
  initScrollSpy();
  initGalleryFilters();
}

function renderSite() {
  const { site, hero, about, services, gallery, process, contactImage } = content;

  document.title = `${site.name} — ${site.tagline}`;
  document.querySelector('meta[name="description"]').content = site.description;

  const phoneHref = `tel:${site.phone.replace(/\s/g, '')}`;

  const topbarPhone = document.getElementById('topbarPhone');
  topbarPhone.querySelector('span').textContent = site.phone;
  topbarPhone.href = phoneHref;

  const topbarEmail = document.getElementById('topbarEmail');
  topbarEmail.querySelector('span').textContent = site.email;
  topbarEmail.href = `mailto:${site.email}`;

  document.getElementById('topbarHours').querySelector('span').textContent = site.hours;
  document.getElementById('topbarAddress').querySelector('span').textContent = site.address;

  const fab = document.getElementById('fabPhone');
  fab.href = phoneHref;
  fab.setAttribute('aria-label', `Appeler ${site.phone}`);

  document.getElementById('heroEyebrow').textContent = site.tagline;
  document.getElementById('heroTitle').textContent = site.name;

  renderHero(hero.slides);
  renderServices(services);
  renderProcess(process || []);
  renderGallery();
  renderMarquee(site.keywords || []);

  document.getElementById('aboutTitle').textContent = about.title;
  document.getElementById('aboutText').textContent = about.text;
  document.getElementById('aboutZone').textContent = about.zone;
  if (about.image) {
    const aboutImg = document.getElementById('aboutImage');
    aboutImg.src = about.image;
    aboutImg.alt = 'Notre siège social — Procept';
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

function renderMarquee(keywords) {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const words = keywords.length
    ? keywords
    : ['Construction', 'Rénovation', 'Extension', 'Promotion immobilière', 'Versailles', 'Saint-Germain-en-Laye', 'RE2020', 'Clé en main'];

  const items = words.map((w) => `<span class="marquee__item">${escapeHtml(w)}</span>`).join('<span class="marquee__sep">·</span>');
  track.innerHTML = `${items}<span class="marquee__sep">·</span>${items}<span class="marquee__sep">·</span>${items}<span class="marquee__sep">·</span>${items}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderHero(slides) {
  const container = document.getElementById('heroSlides');
  const dots = document.getElementById('heroDots');

  container.innerHTML = slides.map((slide, i) =>
    `<div class="hero__slide${i === 0 ? ' active' : ''}" style="background-image:url('${slide.image}')" data-index="${i}" role="img" aria-label="${escapeHtml(slide.title)}"></div>`
  ).join('');

  dots.innerHTML = slides.map((_, i) =>
    `<button class="hero__dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
  ).join('');

  updateHeroText(slides[0]);
  startSlideshow(slides.length);

  dots.querySelectorAll('.hero__dot').forEach((dot) => {
    dot.addEventListener('click', () => goToSlide(+dot.dataset.index, slides.length));
  });
}

function updateHeroText(slide) {
  document.getElementById('heroDesc').textContent = slide.description;
  document.getElementById('heroTitle').textContent = slide.title;
}

function goToSlide(index, total) {
  currentSlide = ((index % total) + total) % total;
  document.querySelectorAll('.hero__slide').forEach((s, i) => s.classList.toggle('active', i === currentSlide));
  document.querySelectorAll('.hero__dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
  updateHeroText(content.hero.slides[currentSlide]);
  resetSlideshow(total);
}

function startSlideshow(total) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  slideInterval = setInterval(() => goToSlide(currentSlide + 1, total), 6000);
}

function resetSlideshow(total) {
  clearInterval(slideInterval);
  startSlideshow(total);
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = services.map((s) => `
    <article class="service-card reveal" id="${s.id}" data-keywords="${(s.keywords || []).join(',')}">
      <div class="service-card__image">
        <img src="${s.image}" alt="${escapeHtml(s.title)}" width="800" height="600" loading="lazy" decoding="async">
      </div>
      <div class="service-card__body">
        <h3 class="service-card__title">${escapeHtml(s.title)}</h3>
        <p class="service-card__desc">${escapeHtml(s.description)}</p>
        ${(s.related || []).length ? `
          <div class="service-card__thumbs">
            ${s.related.map((src, i) => `
              <button type="button" class="service-card__thumb" data-service="${s.id}" data-img="${src}" aria-label="Voir photo ${i + 1}">
                <img src="${src}" alt="" width="120" height="90" loading="lazy" decoding="async">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </article>
  `).join('');

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
        <img src="${step.image}" alt="${escapeHtml(step.title)}" width="640" height="480" loading="lazy" decoding="async">
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
  if (galleryFilter === 'all') return items;
  return items.filter((item) => item.category === galleryFilter);
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
    return `
    <div class="gallery__item reveal${hide ? ' hidden' : ''}" data-index="${i}" data-id="${item.id}" data-category="${item.category || 'autre'}">
      <img src="${item.image}" alt="${escapeHtml(item.caption)}" width="640" height="480" loading="lazy" decoding="async">
      <span class="gallery__caption">${escapeHtml(item.caption)}</span>
    </div>`;
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
  document.querySelectorAll('.gallery__filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gallery__filter').forEach((b) => {
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
  header.classList.toggle('header--scrolled', y > 50);
  backTop.hidden = y < 400;

  if (y > 80) {
    if (y > lastScrollY + 4) header.classList.add('header--topbar-hidden');
    else if (y < lastScrollY - 4) header.classList.remove('header--topbar-hidden');
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
  const sections = ['accueil', 'services', 'apropos', 'realisations', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = document.querySelectorAll('.nav__link[data-section]');

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle('active', link.dataset.section === id);
        });
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
}

document.querySelectorAll('.nav__link:not(.nav__link--parent), .nav__mega-item, .nav__mega-all').forEach((link) => {
  link.addEventListener('click', () => closeMobileNav());
});

servicesToggle.addEventListener('click', (e) => {
  if (window.matchMedia('(max-width: 900px)').matches) {
    e.preventDefault();
    const open = servicesDropdown.classList.toggle('open');
    servicesToggle.setAttribute('aria-expanded', open);
  } else {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }
});

/* —— Search toggle —— */
const searchToggle = document.getElementById('searchToggle');
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');

searchToggle.addEventListener('click', () => {
  const open = searchPanel.classList.toggle('search__panel--open');
  searchToggle.setAttribute('aria-expanded', open);
  if (open) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    document.getElementById('searchResults').hidden = true;
    document.getElementById('searchClear').hidden = true;
    window.ProceptSearch?.clearPageHighlight();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search') && !e.target.closest('.nav__mobile-search')) {
    searchPanel.classList.remove('search__panel--open');
    searchToggle.setAttribute('aria-expanded', 'false');
    const results = document.getElementById('searchResults');
    if (results) results.hidden = true;
  }
});

document.getElementById('heroPrev').addEventListener('click', () => {
  if (content) goToSlide(currentSlide - 1, content.hero.slides.length);
});
document.getElementById('heroNext').addEventListener('click', () => {
  if (content) goToSlide(currentSlide + 1, content.hero.slides.length);
});

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeMobileNav();
  }
});

document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('formSuccess').hidden = false;
  e.target.reset();
  setTimeout(() => { document.getElementById('formSuccess').hidden = true; }, 5000);
});

loadContent();
