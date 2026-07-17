/**
 * Dissuasion anti-copie / anti-vol de photos (pas une protection absolue).
 * N’altère pas la sélection de texte ni les raccourcis clavier (accessibilité).
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

  function isProtectedTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('.a11y-panel, .fab-a11y, #a11yPanel, [data-a11y]')) return false;
    return !!el.closest(MEDIA_SEL);
  }

  document.addEventListener(
    'contextmenu',
    (e) => {
      if (isProtectedTarget(e.target)) e.preventDefault();
    },
    true
  );

  document.addEventListener(
    'dragstart',
    (e) => {
      if (isProtectedTarget(e.target)) e.preventDefault();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureLightboxWatermark);
  } else {
    ensureLightboxWatermark();
  }
})();
