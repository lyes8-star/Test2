let content = null;
const TAB_TITLES = {
  site: 'Informations du site',
  hero: 'Diaporama d\'accueil',
  services: 'Services',
  gallery: 'Galerie photos',
  about: 'À propos',
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
  const { site, about } = content;

  document.getElementById('siteName').value = site.name;
  document.getElementById('siteTagline').value = site.tagline;
  document.getElementById('siteDescription').value = site.description;
  document.getElementById('sitePhone').value = site.phone;
  document.getElementById('siteFax').value = site.fax;
  document.getElementById('siteEmail').value = site.email;
  document.getElementById('siteHours').value = site.hours;
  document.getElementById('siteAddress').value = site.address;
  document.getElementById('siteKeywords').value = (site.keywords || []).join(', ');

  document.getElementById('aboutTitle').value = about.title;
  document.getElementById('aboutText').value = about.text;
  document.getElementById('aboutZone').value = about.zone;

  renderHeroEditor();
  renderServicesEditor();
  renderGalleryEditor();
}

function collectContent() {
  content.site = {
    name: document.getElementById('siteName').value,
    tagline: document.getElementById('siteTagline').value,
    description: document.getElementById('siteDescription').value,
    phone: document.getElementById('sitePhone').value,
    fax: document.getElementById('siteFax').value,
    email: document.getElementById('siteEmail').value,
    hours: document.getElementById('siteHours').value,
    address: document.getElementById('siteAddress').value,
    keywords: document.getElementById('siteKeywords').value
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  };

  content.about = {
    title: document.getElementById('aboutTitle').value,
    text: document.getElementById('aboutText').value,
    zone: document.getElementById('aboutZone').value,
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
        <div class="gallery-item__actions">
          <button class="btn btn--danger btn--sm" data-action="delete">Supprimer</button>
        </div>
      </div>
    `;

    el.querySelector('.gallery-caption').addEventListener('input', (e) => {
      content.gallery[index].caption = e.target.value;
    });

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
  });
  renderGalleryEditor();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

checkAuth();
