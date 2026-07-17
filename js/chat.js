/**
 * Assistant chantier Procept — arbre de questions → devis prérempli + mailto.
 */
window.ProceptChat = (function () {
  const STORAGE_KEY = 'procept-devis-draft';
  const STEPS = {
    welcome: 'welcome',
    type: 'type',
    context: 'context',
    city: 'city',
    coords: 'coords',
    summary: 'summary',
  };

  let state = {
    type: '',
    context: '',
    city: '',
    name: '',
    phone: '',
    email: '',
  };
  let cities = [];
  let siteEmail = 'procept@procept.fr';
  let sitePhone = '01 39 58 28 23';
  let open = false;
  let root = null;

  const TYPE_LABELS = {
    construction: 'Construction de maison',
    renovation: 'Rénovation',
    extension: 'Extension / agrandissement',
    promotion: 'Promotion immobilière',
  };

  const CONTEXT_LABELS = {
    terrain: 'J’ai un terrain',
    projet: 'Projet à définir',
    urgent: 'Devis urgent',
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function basePath() {
    // Pages in subfolders need ../ for #contact on home
    const path = window.location.pathname || '';
    if (/\/(constructeur|renovation|promotion-immobiliere|actualites)\/?/.test(path)) {
      return '../';
    }
    return '';
  }

  function buildMessage() {
    const typeLabel = TYPE_LABELS[state.type] || state.type || 'Projet';
    const ctxLabel = CONTEXT_LABELS[state.context] || state.context || '';
    const lines = [
      `Bonjour Procept,`,
      ``,
      `Je souhaite obtenir un devis pour : ${typeLabel}.`,
      ctxLabel ? `Contexte : ${ctxLabel}.` : '',
      state.city ? `Ville / secteur : ${state.city}.` : '',
      ``,
      `Pouvez-vous me recontacter pour une étude gratuite ?`,
      ``,
      state.name ? `Nom : ${state.name}` : '',
      state.phone ? `Téléphone : ${state.phone}` : '',
      state.email ? `Email : ${state.email}` : '',
      ``,
      `Merci,`,
      state.name || 'Un prospect Procept',
    ].filter((l) => l !== '');
    return lines.join('\n');
  }

  function buildSubject() {
    const typeLabel = TYPE_LABELS[state.type] || 'Devis';
    const city = state.city ? ` — ${state.city}` : '';
    return `Demande de devis — ${typeLabel}${city}`;
  }

  function mailtoHref() {
    const subject = encodeURIComponent(buildSubject());
    const body = encodeURIComponent(buildMessage());
    return `mailto:${siteEmail}?subject=${subject}&body=${body}`;
  }

  function saveDraft() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: state.name,
          email: state.email,
          phone: state.phone,
          message: buildMessage(),
          type: state.type,
          city: state.city,
        })
      );
    } catch (_) { /* ignore */ }
  }

  function applyDraftToForm() {
    const form = document.getElementById('contactForm');
    if (!form) return false;
    const name = form.querySelector('#name, [name="name"]');
    const email = form.querySelector('#email, [name="email"]');
    const phone = form.querySelector('#phone, [name="phone"]');
    const message = form.querySelector('#message, [name="message"]');
    if (name && state.name) name.value = state.name;
    if (email && state.email) email.value = state.email;
    if (phone && state.phone) phone.value = state.phone;
    if (message) message.value = buildMessage();
    return true;
  }

  function goToContactForm() {
    saveDraft();
    applyDraftToForm();
    const homeContact = `${basePath()}#contact`;
    const el = document.getElementById('contact') || document.getElementById('contactForm');
    if (el && document.getElementById('contactForm')) {
      setOpen(false);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.location.href = homeContact;
  }

  function robotSvg() {
    return `<svg class="chat__avatar-svg" viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
      <rect x="12" y="18" width="40" height="32" rx="8" fill="#2c4a3e"/>
      <rect x="18" y="26" width="10" height="8" rx="2" fill="#c4a35a"/>
      <rect x="36" y="26" width="10" height="8" rx="2" fill="#c4a35a"/>
      <rect x="24" y="40" width="16" height="4" rx="2" fill="#e8efe9"/>
      <rect x="26" y="8" width="12" height="10" rx="2" fill="#c4a35a"/>
      <circle cx="32" cy="6" r="3" fill="#8fad9a"/>
      <rect x="6" y="28" width="6" height="14" rx="2" fill="#8fad9a"/>
      <rect x="52" y="28" width="6" height="14" rx="2" fill="#8fad9a"/>
    </svg>`;
  }

  function ensureDom() {
    if (document.getElementById('proceptChat')) return;

    const wrap = document.createElement('div');
    wrap.id = 'proceptChat';
    wrap.className = 'chat';
    wrap.innerHTML = `
      <button type="button" class="fab-contact" id="chatFab" aria-label="Demander un devis avec l’assistant Procept" aria-expanded="false" aria-controls="chatPanel">
        <span class="fab-contact__icon" aria-hidden="true">${robotSvg()}</span>
        <span class="fab-contact__label">Devis</span>
      </button>
      <div class="chat__panel" id="chatPanel" role="dialog" aria-modal="true" aria-labelledby="chatTitle" hidden>
        <header class="chat__header">
          <div class="chat__header-brand">
            ${robotSvg()}
            <div>
              <p class="chat__title" id="chatTitle">Assistant chantier</p>
              <p class="chat__subtitle">Procept — devis gratuit</p>
            </div>
          </div>
          <button type="button" class="chat__close" id="chatClose" aria-label="Fermer">×</button>
        </header>
        <div class="chat__body" id="chatBody"></div>
        <div class="chat__footer" id="chatFooter"></div>
      </div>
    `;
    document.body.appendChild(wrap);
    root = wrap;

    document.getElementById('chatFab').addEventListener('click', () => setOpen(!open));
    document.getElementById('chatClose').addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    });
  }

  function setOpen(value) {
    open = value;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    if (!panel || !fab) return;
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    fab.classList.toggle('is-open', open);
    document.body.classList.toggle('chat-open', open);
    if (open) {
      renderStep(STEPS.welcome);
      const closeBtn = document.getElementById('chatClose');
      closeBtn?.focus();
    }
  }

  function setBody(html) {
    const body = document.getElementById('chatBody');
    if (body) body.innerHTML = html;
  }

  function setFooter(html) {
    const footer = document.getElementById('chatFooter');
    if (footer) footer.innerHTML = html || '';
  }

  function bubble(text, who) {
    return `<div class="chat__bubble chat__bubble--${who}">${text}</div>`;
  }

  function choices(items) {
    return `<div class="chat__choices">${items
      .map(
        (it) =>
          `<button type="button" class="chat__choice" data-value="${escapeHtml(it.value)}">${escapeHtml(it.label)}</button>`
      )
      .join('')}</div>`;
  }

  function bindChoices(cb) {
    document.querySelectorAll('.chat__choice').forEach((btn) => {
      btn.addEventListener('click', () => cb(btn.dataset.value));
    });
  }

  function renderStep(step) {
    if (step === STEPS.welcome) {
      setBody(
        bubble('Bonjour ! Je suis l’assistant chantier Procept.', 'bot') +
          bubble('En quelques questions, je prépare votre demande de devis.', 'bot') +
          choices([{ value: 'start', label: 'Commencer →' }])
      );
      setFooter('');
      bindChoices(() => renderStep(STEPS.type));
      return;
    }

    if (step === STEPS.type) {
      setBody(
        bubble('Quel est votre projet ?', 'bot') +
          choices([
            { value: 'construction', label: 'Construction' },
            { value: 'renovation', label: 'Rénovation' },
            { value: 'extension', label: 'Extension' },
            { value: 'promotion', label: 'Promotion immobilière' },
          ])
      );
      setFooter(`<button type="button" class="chat__link" data-back="welcome">← Retour</button>`);
      bindChoices((v) => {
        state.type = v;
        renderStep(STEPS.context);
      });
      document.querySelector('[data-back]')?.addEventListener('click', () => renderStep(STEPS.welcome));
      return;
    }

    if (step === STEPS.context) {
      setBody(
        bubble(`Parfait — ${escapeHtml(TYPE_LABELS[state.type] || '')}. Où en êtes-vous ?`, 'bot') +
          choices([
            { value: 'terrain', label: 'J’ai un terrain' },
            { value: 'projet', label: 'Projet à définir' },
            { value: 'urgent', label: 'Devis urgent' },
          ])
      );
      setFooter(`<button type="button" class="chat__link" data-back="type">← Retour</button>`);
      bindChoices((v) => {
        state.context = v;
        renderStep(STEPS.city);
      });
      document.querySelector('[data-back]')?.addEventListener('click', () => renderStep(STEPS.type));
      return;
    }

    if (step === STEPS.city) {
      const suggestions = (cities || []).slice(0, 8);
      setBody(
        bubble('Dans quelle commune / secteur intervenons-nous pour vous ?', 'bot') +
          `<div class="chat__field">
            <label class="sr-only" for="chatCity">Ville</label>
            <input type="text" id="chatCity" class="chat__input" placeholder="Ex. Versailles, Rueil-Malmaison…" list="chatCityList" autocomplete="address-level2">
            <datalist id="chatCityList">${suggestions.map((c) => `<option value="${escapeHtml(c)}"></option>`).join('')}</datalist>
          </div>` +
          (suggestions.length
            ? `<div class="chat__choices chat__choices--wrap">${suggestions
                .slice(0, 6)
                .map((c) => `<button type="button" class="chat__choice chat__choice--sm" data-value="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
                .join('')}</div>`
            : '') +
          `<button type="button" class="btn btn--primary btn--sm chat__next" id="chatCityNext">Continuer</button>`
      );
      setFooter(`<button type="button" class="chat__link" data-back="context">← Retour</button>`);
      bindChoices((v) => {
        state.city = v;
        const input = document.getElementById('chatCity');
        if (input) input.value = v;
      });
      document.getElementById('chatCityNext')?.addEventListener('click', () => {
        const input = document.getElementById('chatCity');
        state.city = (input?.value || '').trim() || 'Ouest parisien';
        renderStep(STEPS.coords);
      });
      document.querySelector('[data-back]')?.addEventListener('click', () => renderStep(STEPS.context));
      document.getElementById('chatCity')?.focus();
      return;
    }

    if (step === STEPS.coords) {
      setBody(
        bubble('Pour finaliser, laissez vos coordonnées (l’email facilite l’envoi du devis).', 'bot') +
          `<div class="chat__fields">
            <label class="chat__label">Nom
              <input type="text" id="chatName" class="chat__input" autocomplete="name" placeholder="Votre nom">
            </label>
            <label class="chat__label">Téléphone
              <input type="tel" id="chatPhone" class="chat__input" autocomplete="tel" placeholder="${escapeHtml(sitePhone)}">
            </label>
            <label class="chat__label">Email
              <input type="email" id="chatEmail" class="chat__input" autocomplete="email" placeholder="vous@email.fr">
            </label>
          </div>
          <button type="button" class="btn btn--primary btn--sm chat__next" id="chatCoordsNext">Voir mon devis →</button>`
      );
      setFooter(`<button type="button" class="chat__link" data-back="city">← Retour</button>`);
      document.getElementById('chatCoordsNext')?.addEventListener('click', () => {
        state.name = (document.getElementById('chatName')?.value || '').trim();
        state.phone = (document.getElementById('chatPhone')?.value || '').trim();
        state.email = (document.getElementById('chatEmail')?.value || '').trim();
        renderStep(STEPS.summary);
      });
      document.querySelector('[data-back]')?.addEventListener('click', () => renderStep(STEPS.city));
      return;
    }

    if (step === STEPS.summary) {
      const preview = escapeHtml(buildMessage()).replace(/\n/g, '<br>');
      setBody(
        bubble('Voici le message préparé pour Procept :', 'bot') +
          `<div class="chat__preview">${preview}</div>` +
          `<div class="chat__actions">
            <a class="btn btn--primary" id="chatMailto" href="${mailtoHref()}">Envoyer par email</a>
            <button type="button" class="btn btn--outline" id="chatToForm">Continuer sur le formulaire</button>
          </div>` +
          bubble(`Ou appelez-nous au <a href="tel:${sitePhone.replace(/\s/g, '')}">${escapeHtml(sitePhone)}</a>.`, 'bot')
      );
      setFooter(
        `<button type="button" class="chat__link" data-back="coords">← Modifier</button>
         <button type="button" class="chat__link" id="chatRestart">Recommencer</button>`
      );
      saveDraft();
      applyDraftToForm();
      document.getElementById('chatToForm')?.addEventListener('click', goToContactForm);
      document.querySelector('[data-back]')?.addEventListener('click', () => renderStep(STEPS.coords));
      document.getElementById('chatRestart')?.addEventListener('click', () => {
        state = { type: '', context: '', city: '', name: '', phone: '', email: '' };
        renderStep(STEPS.welcome);
      });
    }
  }

  function hydrateFormFromStorage() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const form = document.getElementById('contactForm');
      if (!form || !draft) return;
      const name = form.querySelector('#name, [name="name"]');
      const email = form.querySelector('#email, [name="email"]');
      const phone = form.querySelector('#phone, [name="phone"]');
      const message = form.querySelector('#message, [name="message"]');
      if (name && draft.name) name.value = draft.name;
      if (email && draft.email) email.value = draft.email;
      if (phone && draft.phone) phone.value = draft.phone;
      if (message && draft.message) message.value = draft.message;
    } catch (_) { /* ignore */ }
  }

  function buildMailtoFromForm(form) {
    const name = form.querySelector('#name, [name="name"]')?.value?.trim() || '';
    const email = form.querySelector('#email, [name="email"]')?.value?.trim() || '';
    const phone = form.querySelector('#phone, [name="phone"]')?.value?.trim() || '';
    const message = form.querySelector('#message, [name="message"]')?.value?.trim() || '';
    const subject = encodeURIComponent(`Demande de devis — ${name || 'Procept'}`);
    const body = encodeURIComponent(
      [
        message || 'Bonjour, je souhaite un devis.',
        '',
        name ? `Nom : ${name}` : '',
        phone ? `Tél : ${phone}` : '',
        email ? `Email : ${email}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
    return `mailto:${siteEmail}?subject=${subject}&body=${body}`;
  }

  function wireContactForm() {
    const form = document.getElementById('contactForm');
    if (!form || form.dataset.proceptMailto === '1') return;
    form.dataset.proceptMailto = '1';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const href = buildMailtoFromForm(form);
      const success = document.getElementById('formSuccess');
      if (success) {
        success.hidden = false;
        success.textContent =
          'Ouverture de votre messagerie… Si rien ne s’affiche, utilisez l’assistant devis en bas à droite.';
      }
      window.location.href = href;
      setTimeout(() => {
        if (success) success.hidden = true;
      }, 8000);
    });
  }

  function init(options = {}) {
    ensureDom();
    if (options.cities) cities = options.cities;
    if (options.email) siteEmail = options.email;
    if (options.phone) sitePhone = options.phone;
    hydrateFormFromStorage();
    wireContactForm();

    document.querySelectorAll('[data-open-chat], a[href="#devis"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(true);
      });
    });

    // Deep-link ?devis=1 or #devis opens chat
    if (window.location.hash === '#devis' || /[?&]devis=1/.test(window.location.search)) {
      setTimeout(() => setOpen(true), 400);
    }
  }

  return { init, open: () => setOpen(true), close: () => setOpen(false) };
})();
