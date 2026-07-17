/**
 * Dissuasion anti-copie / anti-vol (pas une protection absolue).
 * Locks raccourcis + sélection : désactivés en mode accessibilité / formulaires / admin.
 */
(function () {
  const MEDIA_SEL = [
    'img',
    'picture',
    '.hero__frame',
    '.hero__slide',
    '.gallery__item',
    '.service-card__image',
    '.service-card__thumb',
    '.lightbox',
    '.lightbox img',
    '.page-hero__image',
    '.about__visual',
    '.news-detail__image',
  ].join(',');

  const EDITABLE_SEL = 'input, textarea, select, [contenteditable="true"], .a11y-panel, .chat-panel, .chat-widget, .search-modal, .fab-a11y';

  function isAdminPage() {
    return /\/admin(\/|$)/.test(window.location.pathname);
  }

  function hasA11yMode() {
    const root = document.documentElement;
    return Array.from(root.classList).some((c) => c.startsWith('a11y-'));
  }

  function isEditableTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    return !!el.closest(EDITABLE_SEL);
  }

  function locksEnabled() {
    if (isAdminPage()) return false;
    if (hasA11yMode()) return false;
    return true;
  }

  function syncLockClass() {
    document.documentElement.classList.toggle('protect-lock', locksEnabled());
  }

  function isProtectedMedia(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('.a11y-panel, .fab-a11y, #a11yPanel, [data-a11y]')) return false;
    return !!el.closest(MEDIA_SEL);
  }

  document.addEventListener(
    'contextmenu',
    (e) => {
      if (isProtectedMedia(e.target)) e.preventDefault();
      else if (locksEnabled() && !isEditableTarget(e.target)) e.preventDefault();
    },
    true
  );

  document.addEventListener(
    'dragstart',
    (e) => {
      if (isProtectedMedia(e.target) || (locksEnabled() && !isEditableTarget(e.target))) {
        e.preventDefault();
      }
    },
    true
  );

  document.addEventListener(
    'selectstart',
    (e) => {
      if (!locksEnabled()) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (!locksEnabled()) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key || '';
      const lower = key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (key === 'F12') {
        e.preventDefault();
        return;
      }

      if (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(lower)) {
        e.preventDefault();
        return;
      }

      if (mod && ['s', 'u', 'a', 'p'].includes(lower)) {
        e.preventDefault();
      }
    },
    true
  );

  function ensureLightboxWatermark() {
    const lb = document.getElementById('lightbox');
    if (!lb || lb.querySelector('.lightbox__watermark')) return;
    const mark = document.createElement('span');
    mark.className = 'lightbox__watermark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '© Procept';
    lb.appendChild(mark);
  }

  const mo = new MutationObserver(syncLockClass);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function boot() {
    syncLockClass();
    ensureLightboxWatermark();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('procept:a11y-motion', syncLockClass);
})();
