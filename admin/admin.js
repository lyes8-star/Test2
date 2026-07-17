let content = null;
const TAB_TITLES = {
  site: 'Informations du site',
  hero: 'Diaporama d\'accueil',
  services: 'Services',
  pages: 'Pages Construction, Rénovation & Promotion',
  gallery: 'Galerie photos',
  about: 'À propos',
  faq: 'FAQ & SEO',
};

async function checkAuth() {
  const res = await fetch('/api/admin/me');
  const data = await res.json();
  if (data.authenticated) {
    showAdmin();
  }
}

function showAdmin() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('adminPanel').hidden = false;
  loadContent();
}

function showLogin() {
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('adminPanel').hidden = true;
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    document.getElementById('loginError').hidden = true;
    showAdmin();
  } else {
    document.getElementById('loginError').hidden = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

async function loadContent() {
  // API locale si serveur Node, sinon fichier statique (GitHub Pages)
  try {
    const apiRes = await fetch('/api/content');
    if (apiRes.ok) {
      content = await apiRes.json();
      populateForms();
      return;
    }
  } catch (_) { /* ignore */ }

  const res = await fetch('../data/content.json');
  content = await res.json();
  populateForms();
}

function populateForms() {
  const { site, about, zones, faq } = content;

  document.getElementById('siteName').value = site.name;
  document.getElementById('siteTagline').value = site.tagline;
  document.getElementById('siteDescription').value = site.description;
  document.getElementById('sitePhone').value = site.phone;
  document.getElementById('siteFax').value = site.fax;
  document.getElementById('siteEmail').value = site.email;
  document.getElementById('siteHours').value = site.hours;
  document.getElementById('siteAddress').value = site.address;
  document.getElementById('siteUrl').value = site.url || 'https://www.procept.fr/';
  document.getElementById('siteKeywords').value = (site.keywords || []).join(', ');

  document.getElementById('aboutTitle').value = about.title;
  document.getElementById('aboutText').value = about.text;
  document.getElementById('aboutZone').value = about.zone;

  document.getElementById('zonesTitle').value = zones?.title || '';
  document.getElementById('zonesIntro').value = zones?.intro || '';
  document.getElementById('zonesCities').value = (zones?.cities || []).join('\n');

  renderHeroEditor();
  renderServicesEditor();
  renderPagesEditor();
  renderGalleryEditor();
  renderFaqEditor();
}

function collectContent() {
  content.site = {
    ...content.site,
    name: document.getElementById('siteName').value,
    tagline: document.getElementById('siteTagline').value,
    description: document.getElementById('siteDescription').value,
    phone: document.getElementById('sitePhone').value,
    fax: document.getElementById('siteFax').value,
    email: document.getElementById('siteEmail').value,
    hours: document.getElementById('siteHours').value,
    address: document.getElementById('siteAddress').value,
    url: document.getElementById('siteUrl').value || 'https://www.procept.fr/',
    keywords: document.getElementById('siteKeywords').value
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  };

  content.about = {
    ...content.about,
    title: document.getElementById('aboutTitle').value,
    text: document.getElementById('aboutText').value,
    zone: document.getElementById('aboutZone').value,
  };

  content.zones = {
    title: document.getElementById('zonesTitle').value,
    intro: document.getElementById('zonesIntro').value,
    cities: document.getElementById('zonesCities').value
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean),
  };

  return content;
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  const btnText = document.getElementById('saveBtnText');
  btn.disabled = true;
  btnText.textContent = 'Enregistrement...';

  const data = collectContent();
  const res = await fetch('/api/admin/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  btn.disabled = false;
  btnText.textContent = 'Enregistrer';

  if (res.ok) {
    showToast('Contenu enregistré avec succès !');
  } else {
    showToast('Erreur lors de l\'enregistrement', true);
  }
});

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3000);
}

// Tabs
document.querySelectorAll('.admin__nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin__nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    document.getElementById('panelTitle').textContent = TAB_TITLES[btn.dataset.tab];
  });
});

// Image upload helper
async function uploadImage(file) {
  const boundary = '----FormBoundary' + Date.now();
  const body = await buildMultipartBody(file, boundary);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

function buildMultipartBody(file, boundary) {
  const parts = [];
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`;
  parts.push(new TextEncoder().encode(header));
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      parts.push(new Uint8Array(reader.result));
      parts.push(new TextEncoder().encode(`\r\n--${boundary}--\r\n`));
      const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      parts.forEach((p) => { result.set(p, offset); offset += p.length; });
      resolve(result);
    };
    reader.readAsArrayBuffer(file);
  });
}

function createImageUpload(imageUrl, onUpload) {
  const wrapper = document.createElement('div');
  wrapper.className = 'image-upload';
  wrapper.innerHTML = `
    <img class="image-upload__preview" src="${imageUrl}" alt="Aperçu">
    <input type="file" class="image-upload__input" accept="image/jpeg,image/png,image/webp,image/gif">
    <span class="image-upload__label">Cliquez pour changer l'image</span>
  `;

  const input = wrapper.querySelector('input');
  const preview = wrapper.querySelector('.image-upload__preview');

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    const loading = document.createElement('div');
    loading.className = 'image-upload__loading';
    loading.textContent = 'Upload...';
    wrapper.appendChild(loading);

    try {
      const url = await uploadImage(file);
      preview.src = url;
      onUpload(url);
      showToast('Image mise à jour');
    } catch {
      showToast('Erreur upload', true);
    } finally {
      loading.remove();
      input.value = '';
    }
  });

  return wrapper;
}

// Hero editor
function renderHeroEditor() {
  const container = document.getElementById('heroEditor');
  container.innerHTML = '';

  content.hero.slides.forEach((slide, index) => {
    const el = document.createElement('div');
    el.className = 'item-editor';
    el.innerHTML = `
      <div class="item-editor__header">
        <h4>Slide ${index + 1}</h4>
        <button class="btn btn--danger btn--sm" data-action="delete">Supprimer</button>
      </div>
      <div class="item-editor__grid">
        <div class="image-container"></div>
        <div>
          <div class="form-group">
            <label>Titre</label>
            <input type="text" class="slide-title" value="${escapeHtml(slide.title)}">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea class="slide-desc" rows="3">${escapeHtml(slide.description)}</textarea>
          </div>
        </div>
      </div>
    `;

    const imgContainer = el.querySelector('.image-container');
    imgContainer.appendChild(createImageUpload(slide.image, (url) => {
      content.hero.slides[index].image = url;
    }));

    el.querySelector('.slide-title').addEventListener('input', (e) => {
      content.hero.slides[index].title = e.target.value;
    });
    el.querySelector('.slide-desc').addEventListener('input', (e) => {
      content.hero.slides[index].description = e.target.value;
    });
    el.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (content.hero.slides.length > 1) {
        content.hero.slides.splice(index, 1);
        renderHeroEditor();
      }
    });

    container.appendChild(el);
  });
}

document.getElementById('addSlide').addEventListener('click', () => {
  content.hero.slides.push({
    id: `slide-${Date.now()}`,
    image: '/uploads/placeholder.jpg',
    title: 'Nouveau slide',
    description: 'Description du slide',
  });
  renderHeroEditor();
});

// Services editor
function renderServicesEditor() {
  const container = document.getElementById('servicesEditor');
  container.innerHTML = '';

  content.services.forEach((service, index) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <h3>${escapeHtml(service.title)}</h3>
      <div class="item-editor__grid">
        <div class="image-container"></div>
        <div>
          <div class="form-group">
            <label>Titre</label>
            <input type="text" class="service-title" value="${escapeHtml(service.title)}">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea class="service-desc" rows="4">${escapeHtml(service.description)}</textarea>
          </div>
          <div class="form-group">
            <label>Mots-clés (virgules)</label>
            <input type="text" class="service-keywords" value="${escapeHtml((service.keywords || []).join(', '))}">
          </div>
        </div>
      </div>
    `;

    const imgContainer = el.querySelector('.image-container');
    imgContainer.appendChild(createImageUpload(service.image, (url) => {
      content.services[index].image = url;
    }));

    el.querySelector('.service-title').addEventListener('input', (e) => {
      content.services[index].title = e.target.value;
    });
    el.querySelector('.service-desc').addEventListener('input', (e) => {
      content.services[index].description = e.target.value;
    });
    el.querySelector('.service-keywords').addEventListener('input', (e) => {
      content.services[index].keywords = e.target.value
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
    });

    container.appendChild(el);
  });
}

// Gallery editor
function renderGalleryEditor() {
  const container = document.getElementById('galleryEditor');
  container.innerHTML = '';

  content.gallery.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'gallery-item';
    el.innerHTML = `
      <div class="gallery-item__image">
        <img src="${item.image}" alt="">
        <input type="file" class="gallery-upload" accept="image/jpeg,image/png,image/webp,image/gif" style="position:absolute;inset:0;opacity:0;cursor:pointer">
      </div>
      <div class="gallery-item__body">
        <input type="text" class="gallery-caption" value="${escapeHtml(item.caption)}" placeholder="Légende">
        <select class="gallery-category" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;border:1px solid var(--color-border);border-radius:4px;font-size:0.85rem">
          ${['construction','renovation','extension','chantier','autre'].map(c =>
            `<option value="${c}"${(item.category||'autre')===c?' selected':''}>${c}</option>`
          ).join('')}
        </select>
        <div class="gallery-item__actions">
          <button class="btn btn--danger btn--sm" data-action="delete">Supprimer</button>
        </div>
      </div>
    `;

    el.querySelector('.gallery-caption').addEventListener('input', (e) => {
      content.gallery[index].caption = e.target.value;
    });

    // category select if present
    const catSelect = el.querySelector('.gallery-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        content.gallery[index].category = e.target.value;
      });
    }

    el.querySelector('.gallery-upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const url = await uploadImage(file);
        content.gallery[index].image = url;
        el.querySelector('img').src = url;
        showToast('Image mise à jour');
      } catch {
        showToast('Erreur upload', true);
      }
    });

    el.querySelector('[data-action="delete"]').addEventListener('click', () => {
      content.gallery.splice(index, 1);
      renderGalleryEditor();
    });

    container.appendChild(el);
  });
}

document.getElementById('addGallery').addEventListener('click', () => {
  content.gallery.push({
    id: `gal-${Date.now()}`,
    image: 'https://via.placeholder.com/640x480?text=Nouvelle+photo',
    caption: 'Nouvelle réalisation',
    category: 'autre',
  });
  renderGalleryEditor();
});

function ensurePages() {
  if (!content.pages) content.pages = {};
  const defaults = {
    construction: { slug: 'constructeur', label: 'Construction', galleryFilter: 'construction' },
    renovation: { slug: 'renovation', label: 'Rénovation', galleryFilter: 'renovation' },
    promotion: { slug: 'promotion-immobiliere', label: 'Promotion immobilière', galleryFilter: 'construction' },
  };
  Object.entries(defaults).forEach(([key, meta]) => {
    if (!content.pages[key]) {
      content.pages[key] = {
        slug: meta.slug,
        label: meta.label,
        seo: { title: '', description: '' },
        hero: { image: '', eyebrow: '', title: '', desc: '' },
        intro: [''],
        highlights: [],
        secondary: { title: '', text: '' },
        steps: [],
        cta: { title: '', text: '' },
        galleryFilter: meta.galleryFilter,
      };
    }
  });
}

function renderPagesEditor() {
  const container = document.getElementById('pagesEditor');
  if (!container) return;
  ensurePages();
  container.innerHTML = '';

  Object.entries(content.pages).forEach(([key, page]) => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.marginBottom = '1.5rem';
    el.innerHTML = `
      <h3>Page ${escapeHtml(page.label || key)} <small style="font-weight:400;color:var(--color-text-light)">/${escapeHtml(page.slug || key)}/</small></h3>
      <div class="form-grid">
        <div class="form-group form-group--full">
          <label>Titre SEO</label>
          <input type="text" class="page-seo-title" value="${escapeHtml(page.seo?.title || '')}">
        </div>
        <div class="form-group form-group--full">
          <label>Description SEO</label>
          <textarea class="page-seo-desc" rows="2">${escapeHtml(page.seo?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Eyebrow hero</label>
          <input type="text" class="page-eyebrow" value="${escapeHtml(page.hero?.eyebrow || '')}">
        </div>
        <div class="form-group">
          <label>Filtre galerie</label>
          <input type="text" class="page-gallery-filter" value="${escapeHtml(page.galleryFilter || key)}">
        </div>
        <div class="form-group form-group--full">
          <label>Titre H1 (hero)</label>
          <input type="text" class="page-hero-title" value="${escapeHtml(page.hero?.title || '')}">
        </div>
        <div class="form-group form-group--full">
          <label>Sous-texte hero</label>
          <textarea class="page-hero-desc" rows="2">${escapeHtml(page.hero?.desc || '')}</textarea>
        </div>
        <div class="form-group form-group--full">
          <label>Image hero</label>
          <div class="page-hero-image"></div>
        </div>
        <div class="form-group form-group--full">
          <label>Introduction (un paragraphe par ligne)</label>
          <textarea class="page-intro" rows="6">${escapeHtml((page.intro || []).join('\n\n'))}</textarea>
        </div>
        <div class="form-group form-group--full">
          <label>Points forts (format : Titre | Texte — une ligne par point)</label>
          <textarea class="page-highlights" rows="8">${escapeHtml((page.highlights || []).map((h) => `${h.title} | ${h.text}`).join('\n'))}</textarea>
        </div>
        <div class="form-group form-group--full">
          <label>Bloc secondaire — titre</label>
          <input type="text" class="page-sec-title" value="${escapeHtml(page.secondary?.title || '')}">
        </div>
        <div class="form-group form-group--full">
          <label>Bloc secondaire — texte</label>
          <textarea class="page-sec-text" rows="4">${escapeHtml(page.secondary?.text || '')}</textarea>
        </div>
        <div class="form-group form-group--full">
          <label>Étapes / engagements (format : Titre | Description)</label>
          <textarea class="page-steps" rows="6">${escapeHtml((page.steps || []).map((s) => `${s.title} | ${s.description}`).join('\n'))}</textarea>
        </div>
        <div class="form-group">
          <label>CTA — titre</label>
          <input type="text" class="page-cta-title" value="${escapeHtml(page.cta?.title || '')}">
        </div>
        <div class="form-group form-group--full">
          <label>CTA — texte</label>
          <textarea class="page-cta-text" rows="2">${escapeHtml(page.cta?.text || '')}</textarea>
        </div>
      </div>
    `;

    const imgWrap = el.querySelector('.page-hero-image');
    imgWrap.appendChild(createImageUpload(page.hero?.image || '', (url) => {
      if (!content.pages[key].hero) content.pages[key].hero = {};
      content.pages[key].hero.image = url;
    }));

    const bind = (sel, fn) => el.querySelector(sel).addEventListener('input', (e) => fn(e.target.value));

    bind('.page-seo-title', (v) => {
      if (!content.pages[key].seo) content.pages[key].seo = {};
      content.pages[key].seo.title = v;
    });
    bind('.page-seo-desc', (v) => {
      if (!content.pages[key].seo) content.pages[key].seo = {};
      content.pages[key].seo.description = v;
    });
    bind('.page-eyebrow', (v) => {
      if (!content.pages[key].hero) content.pages[key].hero = {};
      content.pages[key].hero.eyebrow = v;
    });
    bind('.page-hero-title', (v) => {
      if (!content.pages[key].hero) content.pages[key].hero = {};
      content.pages[key].hero.title = v;
    });
    bind('.page-hero-desc', (v) => {
      if (!content.pages[key].hero) content.pages[key].hero = {};
      content.pages[key].hero.desc = v;
    });
    bind('.page-gallery-filter', (v) => {
      content.pages[key].galleryFilter = v.trim() || key;
    });
    bind('.page-intro', (v) => {
      content.pages[key].intro = v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    });
    bind('.page-highlights', (v) => {
      content.pages[key].highlights = v.split('\n').map((line) => {
        const [title, ...rest] = line.split('|');
        return { title: (title || '').trim(), text: rest.join('|').trim() };
      }).filter((h) => h.title);
    });
    bind('.page-sec-title', (v) => {
      if (!content.pages[key].secondary) content.pages[key].secondary = {};
      content.pages[key].secondary.title = v;
    });
    bind('.page-sec-text', (v) => {
      if (!content.pages[key].secondary) content.pages[key].secondary = {};
      content.pages[key].secondary.text = v;
    });
    bind('.page-steps', (v) => {
      content.pages[key].steps = v.split('\n').map((line) => {
        const [title, ...rest] = line.split('|');
        return { title: (title || '').trim(), description: rest.join('|').trim() };
      }).filter((s) => s.title);
    });
    bind('.page-cta-title', (v) => {
      if (!content.pages[key].cta) content.pages[key].cta = {};
      content.pages[key].cta.title = v;
    });
    bind('.page-cta-text', (v) => {
      if (!content.pages[key].cta) content.pages[key].cta = {};
      content.pages[key].cta.text = v;
    });

    container.appendChild(el);
  });
}

function renderFaqEditor() {
  const container = document.getElementById('faqEditor');
  if (!container) return;
  if (!content.faq) content.faq = [];
  container.innerHTML = '';

  content.faq.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'item-editor';
    el.innerHTML = `
      <div class="item-editor__header">
        <h4>Question ${index + 1}</h4>
        <button class="btn btn--danger btn--sm" data-action="delete">Supprimer</button>
      </div>
      <div class="form-group">
        <label>Question</label>
        <input type="text" class="faq-q" value="${escapeHtml(item.question)}">
      </div>
      <div class="form-group">
        <label>Réponse</label>
        <textarea class="faq-a" rows="3">${escapeHtml(item.answer)}</textarea>
      </div>
    `;
    el.querySelector('.faq-q').addEventListener('input', (e) => {
      content.faq[index].question = e.target.value;
    });
    el.querySelector('.faq-a').addEventListener('input', (e) => {
      content.faq[index].answer = e.target.value;
    });
    el.querySelector('[data-action="delete"]').addEventListener('click', () => {
      content.faq.splice(index, 1);
      renderFaqEditor();
    });
    container.appendChild(el);
  });
}

document.getElementById('addFaq').addEventListener('click', () => {
  if (!content.faq) content.faq = [];
  content.faq.push({
    question: 'Nouvelle question ?',
    answer: 'Réponse…',
  });
  renderFaqEditor();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

checkAuth();
