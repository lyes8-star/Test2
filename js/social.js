/**
 * Rendu des icônes réseaux sociaux (footer / toolbar).
 * Affiche toujours les 4 réseaux ; sans URL → icône muted non cliquable.
 */
window.ProceptSocial = (function () {
  const ICONS = {
    facebook: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon fill="#fff" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
  };

  const LABELS = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
  };

  function render(social) {
    const links = social || {};
    const html = Object.keys(ICONS)
      .map((key) => {
        const url = links[key] && String(links[key]).trim();
        if (url) {
          return `<a class="social__link social__link--${key}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${LABELS[key]}">${ICONS[key]}</a>`;
        }
        return `<span class="social__link social__link--${key} social__link--muted" role="img" aria-label="${LABELS[key]} (bientôt)">${ICONS[key]}</span>`;
      })
      .join('');

    document.querySelectorAll('[data-social]').forEach((el) => {
      el.innerHTML = html;
      el.hidden = false;
      el.removeAttribute('hidden');
    });
  }

  return { render };
})();

/**
 * Copie email / téléphone au clic (topbar + bloc contact).
 */
window.ProceptCopy = (function () {
  let toastTimer = null;

  function toast(message) {
    let el = document.getElementById('copyToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'copyToast';
      el.className = 'copy-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  async function writeClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fallback */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  function valueFromLink(el, kind) {
    if (kind === 'email') {
      const href = el.getAttribute('href') || '';
      const fromHref = href.replace(/^mailto:/i, '').split('?')[0].trim();
      const text = (el.textContent || '').trim();
      return fromHref || text;
    }
    const href = el.getAttribute('href') || '';
    const fromHref = href.replace(/^tel:/i, '').trim();
    const text = (el.textContent || '').replace(/\s/g, '');
    return fromHref || text;
  }

  function bindOne(selector, kind) {
    const el = document.querySelector(selector);
    if (!el || el.dataset.copyBound === '1') return;
    el.dataset.copyBound = '1';
    el.classList.add('copy-contact');
    el.setAttribute('title', kind === 'email' ? 'Cliquer pour copier l’email' : 'Cliquer pour copier le numéro');
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = valueFromLink(el, kind);
      if (!value) return;
      const ok = await writeClipboard(value);
      toast(ok ? (kind === 'email' ? 'Email copié' : 'Numéro copié') : 'Impossible de copier');
    });
  }

  function bind() {
    bindOne('#topbarPhone', 'phone');
    bindOne('#topbarEmail', 'email');
    bindOne('#contactPhone', 'phone');
    bindOne('#contactEmail', 'email');
  }

  return { bind, toast };
})();
