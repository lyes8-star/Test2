let content = null;
let currentSlide = 0;
let slideInterval = null;
const GALLERY_VISIBLE = 6;

async function loadContent() {
  const res = await fetch('/api/content');
  content = await res.json();
  renderSite();
}

function renderSite() {
  const { site, hero, about, services, gallery } = content;

  document.title = `${site.name} — ${site.tagline}`;
  document.querySelector('meta[name="description"]').content = site.description;

  document.getElementById('headerPhone').textContent = site.phone;
  document.getElementById('headerPhone').href = `tel:${site.phone.replace(/\s/g, '')}`;
  document.getElementById('heroEyebrow').textContent = site.tagline;
  document.getElementById('heroTitle').textContent = site.name;

  renderHero(hero.slides);
  renderServices(services);
  renderGallery(gallery);

  document.getElementById('aboutTitle').textContent = about.title;
  document.getElementById('aboutText').textContent = about.text;
  document.getElementById('aboutZone').textContent = about.zone;

  document.getElementById('contactAddress').textContent = site.address;
  document.getElementById('contactPhone').textContent = site.phone;
  document.getElementById('contactPhone').href = `tel:${site.phone.replace(/\s/g, '')}`;
  document.getElementById('contactFax').textContent = site.fax;
  document.getElementById('contactEmail').textContent = site.email;
  document.getElementById('contactEmail').href = `mailto:${site.email}`;
  document.getElementById('contactHours').textContent = site.hours;
  document.getElementById('footerAddress').textContent = site.address;
}

function renderHero(slides) {
  const container = document.getElementById('heroSlides');
  const dots = document.getElementById('heroDots');

  container.innerHTML = slides.map((slide, i) =>
    `<div class="hero__slide${i === 0 ? ' active' : ''}" style="background-image:url('${slide.image}')" data-index="${i}"></div>`
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
  slideInterval = setInterval(() => goToSlide(currentSlide + 1, total), 6000);
}

function resetSlideshow(total) {
  clearInterval(slideInterval);
  startSlideshow(total);
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = services.map((s) => `
    <article class="service-card" id="${s.id}">
      <div class="service-card__image">
        <img src="${s.image}" alt="${s.title}" loading="lazy">
      </div>
      <div class="service-card__body">
        <h3 class="service-card__title">${s.title}</h3>
        <p class="service-card__desc">${s.description}</p>
      </div>
    </article>
  `).join('');
}

function renderGallery(items) {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = items.map((item, i) => `
    <div class="gallery__item${i >= GALLERY_VISIBLE ? ' hidden' : ''}" data-index="${i}">
      <img src="${item.image}" alt="${item.caption}" loading="lazy">
      <span class="gallery__caption">${item.caption}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.gallery__item').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = +el.dataset.index;
      openLightbox(items[idx]);
    });
  });

  const moreBtn = document.getElementById('galleryMore');
  if (items.length <= GALLERY_VISIBLE) {
    moreBtn.style.display = 'none';
  } else {
    moreBtn.style.display = '';
    moreBtn.onclick = () => {
      grid.querySelectorAll('.gallery__item.hidden').forEach((el) => el.classList.remove('hidden'));
      moreBtn.style.display = 'none';
    };
  }
}

function openLightbox(item) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightboxImg').src = item.image;
  document.getElementById('lightboxCaption').textContent = item.caption;
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.body.style.overflow = '';
}

// Header scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('header--scrolled', window.scrollY > 50);
});

// Mobile nav
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('nav').classList.toggle('open');
});

document.querySelectorAll('.nav a').forEach((link) => {
  link.addEventListener('click', () => document.getElementById('nav').classList.remove('open'));
});

// Hero arrows
document.getElementById('heroPrev').addEventListener('click', () => {
  if (content) goToSlide(currentSlide - 1, content.hero.slides.length);
});
document.getElementById('heroNext').addEventListener('click', () => {
  if (content) goToSlide(currentSlide + 1, content.hero.slides.length);
});

// Lightbox
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// Contact form
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('formSuccess').hidden = false;
  e.target.reset();
  setTimeout(() => { document.getElementById('formSuccess').hidden = true; }, 5000);
});

loadContent();
