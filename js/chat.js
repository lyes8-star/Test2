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
    details: 'details',
    coords: 'coords',
    summary: 'summary',
  };

  let state = {
    type: '',
    context: '',
    city: '',
    surface: '',
    budget: '',
    timing: '',
    name: '',
    phone: '',
    email: '',
  };
  let cities = [];
  let siteEmail = 'procept@procept.fr';
  let sitePhone = '01 39 58 28 23';
  let open = false;
  let currentStep = STEPS.welcome;
  let bound = false;
  let nudgeTimer = null;
  let nudgeKickTimer = null;
  let blinkTimer = null;
  let nudgeIndex = 0;
  let currentFace = 'smile';

  const NUDGE_LINES = [
    { text: 'Besoin d’un devis ? Discutez avec moi', face: 'smile' },
    { text: 'Quelques questions et j’envoie votre demande', face: 'talk' },
    { text: 'Cliquez, je m’occupe de la suite', face: 'wink' },
    { text: 'Étude gratuite — je prépare votre demande', face: 'surprise' },
    { text: 'Maison, rénovation, extension… je vous guide', face: 'think' },
    { text: 'Réponse rapide — ouvrez le chat', face: 'talk' },
  ];

  const TYPE_LABELS = {
    construction: 'Maison neuve (construction)',
    renovation: 'Rénovation',
    extension: 'Extension / agrandissement',
    promotion: 'Promotion / terrain',
  };

  const CONTEXT_BY_TYPE = {
    construction: [
      { value: 'terrain_ok', label: 'Terrain déjà acquis' },
      { value: 'terrain_search', label: 'Je cherche un terrain' },
      { value: 'etude', label: 'Étude / plans en cours' },
    ],
    renovation: [
      { value: 'habite', label: 'Logement habité à moderniser' },
      { value: 'entier', label: 'Rénovation complète' },
      { value: 'urgent_reno', label: 'Besoin de devis rapide' },
    ],
    extension: [
      { value: 'surface', label: 'Agrandir la surface habitable' },
      { value: 'etage', label: 'Surélévation / étage' },
      { value: 'annexe', label: 'Annexe, véranda ou garage' },
    ],
    promotion: [
      { value: 'vendre', label: 'Valoriser / vendre un terrain' },
      { value: 'permis', label: 'Projet avec permis à monter' },
      { value: 'investisseur', label: 'Projet investisseur' },
    ],
  };

  const CONTEXT_LABELS = {
    terrain_ok: 'Terrain déjà acquis',
    terrain_search: 'Recherche de terrain',
    etude: 'Étude / plans en cours',
    habite: 'Logement habité à moderniser',
    entier: 'Rénovation complète',
    urgent_reno: 'Devis rapide',
    surface: 'Agrandissement surface',
    etage: 'Surélévation / étage',
    annexe: 'Annexe, véranda ou garage',
    vendre: 'Valorisation / vente de terrain',
    permis: 'Permis à monter',
    investisseur: 'Projet investisseur',
    // legacy
    terrain: 'Terrain acquis',
    projet: 'Projet à définir',
    urgent: 'Devis urgent',
  };

  const SURFACE_OPTIONS = [
    { value: 'lt80', label: 'Moins de 80 m²' },
    { value: '80-120', label: '80 – 120 m²' },
    { value: '120-180', label: '120 – 180 m²' },
    { value: '180-250', label: '180 – 250 m²' },
    { value: 'gt250', label: 'Plus de 250 m²' },
    { value: 'unknown', label: 'Je ne sais pas encore' },
  ];

  const SURFACE_LABELS = {
    lt80: 'Moins de 80 m²',
    '80-120': '80 – 120 m²',
    '120-180': '120 – 180 m²',
    '180-250': '180 – 250 m²',
    gt250: 'Plus de 250 m²',
    unknown: 'À préciser',
  };

  const BUDGET_OPTIONS = [
    { value: 'lt150', label: 'Moins de 150 k€' },
    { value: '150-300', label: '150 – 300 k€' },
    { value: '300-500', label: '300 – 500 k€' },
    { value: '500-800', label: '500 – 800 k€' },
    { value: 'gt800', label: 'Plus de 800 k€' },
    { value: 'unknown', label: 'À définir' },
  ];

  const BUDGET_LABELS = {
    lt150: 'Moins de 150 k€',
    '150-300': '150 – 300 k€',
    '300-500': '300 – 500 k€',
    '500-800': '500 – 800 k€',
    gt800: 'Plus de 800 k€',
    unknown: 'À définir',
  };

  const TIMING_OPTIONS = [
    { value: 'asap', label: 'Dès que possible' },
    { value: '6m', label: 'Sous 6 mois' },
    { value: '6-12m', label: '6 – 12 mois' },
    { value: '12m+', label: 'Dans plus de 12 mois' },
    { value: 'thinking', label: 'En réflexion' },
  ];

  const TIMING_LABELS = {
    asap: 'Dès que possible',
    '6m': 'Sous 6 mois',
    '6-12m': '6 – 12 mois',
    '12m+': 'Dans plus de 12 mois',
    thinking: 'En réflexion',
  };

  function contextQuestion() {
    switch (state.type) {
      case 'construction':
        return 'Où en est votre projet de maison neuve ?';
      case 'renovation':
        return 'Quel est l’état du bien à rénover ?';
      case 'extension':
        return 'Quel type d’agrandissement envisagez-vous ?';
      case 'promotion':
        return 'Quel est votre objectif promotion / terrain ?';
      default:
        return 'Précisez le contexte de votre projet :';
    }
  }

  function surfaceQuestion() {
    switch (state.type) {
      case 'extension':
        return 'Quelle surface souhaitez-vous ajouter approximativement ?';
      case 'promotion':
        return 'Quelle est la surface approximative du terrain ?';
      case 'renovation':
        return 'Quelle est la surface approximative du bien à rénover ?';
      default:
        return 'Quelle surface habitable visez-vous approximativement ?';
    }
  }

  function emptyProjectState() {
    return {
      type: '',
      context: '',
      city: '',
      surface: '',
      budget: '',
      timing: '',
      name: '',
      phone: '',
      email: '',
    };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function basePath() {
    const path = window.location.pathname || '';
    if (/\/(constructeur|renovation|promotion-immobiliere|actualites)(\/|$)/.test(path)) {
      // Nested article: /actualites/slug/
      if (/\/actualites\/[^/]+\/?$/.test(path) && !/\/actualites\/?$/.test(path)) {
        return '../../';
      }
      return '../';
    }
    return '';
  }

  function track(eventName, params) {
    if (window.ProceptAnalytics?.track) {
      window.ProceptAnalytics.track(eventName, params || {});
    }
  }

  function buildMessage() {
    const typeLabel = TYPE_LABELS[state.type] || state.type || 'Projet';
    const ctxLabel = CONTEXT_LABELS[state.context] || state.context || '';
    const surfaceLabel = SURFACE_LABELS[state.surface] || state.surface || '';
    const budgetLabel = BUDGET_LABELS[state.budget] || state.budget || '';
    const timingLabel = TIMING_LABELS[state.timing] || state.timing || '';
    const lines = [
      `Bonjour Procept,`,
      ``,
      `Je souhaite obtenir un devis pour : ${typeLabel}.`,
      ctxLabel ? `Contexte : ${ctxLabel}.` : '',
      state.city ? `Ville / secteur : ${state.city}.` : '',
      surfaceLabel ? `Surface approximative : ${surfaceLabel}.` : '',
      budgetLabel ? `Budget indicatif : ${budgetLabel}.` : '',
      timingLabel ? `Délai souhaité : ${timingLabel}.` : '',
      ``,
      `Pouvez-vous me recontacter pour une étude gratuite ?`,
      `Je pourrai joindre plans ou photos si besoin.`,
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
    track('generate_lead', { method: 'form_redirect', project_type: state.type });
    const el = document.getElementById('contact') || document.getElementById('contactForm');
    if (el && document.getElementById('contactForm')) {
      setOpen(false);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.location.href = `${basePath()}#contact`;
  }

  function robotSvg(expression = 'smile') {
    const faces = {
      smile: {
        brows: '',
        leftEye: '<ellipse class="robot-eye" cx="22" cy="30" rx="5.5" ry="6" fill="#c4a35a"/>',
        rightEye: '<ellipse class="robot-eye" cx="42" cy="30" rx="5.5" ry="6" fill="#c4a35a"/>',
        mouth: '<path class="robot-mouth" d="M22 42 Q32 52 42 42" fill="none" stroke="#e8efe9" stroke-width="3" stroke-linecap="round"/>',
      },
      wink: {
        brows: '',
        leftEye: '<path class="robot-eye" d="M16 30 Q22 26 28 30" fill="none" stroke="#c4a35a" stroke-width="3.5" stroke-linecap="round"/>',
        rightEye: '<ellipse class="robot-eye" cx="42" cy="30" rx="5.5" ry="6" fill="#c4a35a"/>',
        mouth: '<path class="robot-mouth" d="M23 43 Q32 50 41 43" fill="none" stroke="#e8efe9" stroke-width="3" stroke-linecap="round"/>',
      },
      surprise: {
        brows: '<path d="M16 20 Q22 16 28 20" fill="none" stroke="#8fad9a" stroke-width="2" stroke-linecap="round"/><path d="M36 20 Q42 16 48 20" fill="none" stroke="#8fad9a" stroke-width="2" stroke-linecap="round"/>',
        leftEye: '<circle class="robot-eye" cx="22" cy="30" r="7" fill="#c4a35a"/><circle cx="22" cy="30" r="2.5" fill="#1e3329"/>',
        rightEye: '<circle class="robot-eye" cx="42" cy="30" r="7" fill="#c4a35a"/><circle cx="42" cy="30" r="2.5" fill="#1e3329"/>',
        mouth: '<ellipse class="robot-mouth" cx="32" cy="45" rx="6" ry="7" fill="#e8efe9"/>',
      },
      talk: {
        brows: '',
        leftEye: '<ellipse class="robot-eye" cx="22" cy="29" rx="5" ry="5.5" fill="#c4a35a"/>',
        rightEye: '<ellipse class="robot-eye" cx="42" cy="29" rx="5" ry="5.5" fill="#c4a35a"/>',
        mouth: '<ellipse class="robot-mouth" cx="32" cy="45" rx="8" ry="6" fill="#e8efe9"/>',
      },
      think: {
        brows: '<path d="M15 22 Q22 18 29 23" fill="none" stroke="#8fad9a" stroke-width="2.5" stroke-linecap="round"/>',
        leftEye: '<ellipse class="robot-eye" cx="22" cy="31" rx="5.5" ry="3.5" fill="#c4a35a"/>',
        rightEye: '<ellipse class="robot-eye" cx="42" cy="31" rx="5.5" ry="3.5" fill="#c4a35a"/>',
        mouth: '<path class="robot-mouth" d="M24 44 Q32 41 40 45" fill="none" stroke="#e8efe9" stroke-width="2.5" stroke-linecap="round"/>',
      },
      blink: {
        brows: '',
        leftEye: '<rect class="robot-eye" x="17" y="29" width="10" height="2.5" rx="1.2" fill="#c4a35a"/>',
        rightEye: '<rect class="robot-eye" x="37" y="29" width="10" height="2.5" rx="1.2" fill="#c4a35a"/>',
        mouth: '<path class="robot-mouth" d="M24 43 Q32 48 40 43" fill="none" stroke="#e8efe9" stroke-width="2.5" stroke-linecap="round"/>',
      },
    };
    const face = faces[expression] || faces.smile;
    return `<svg class="chat__avatar-svg" data-face="${escapeHtml(expression)}" viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
      <rect x="12" y="18" width="40" height="32" rx="8" fill="#2c4a3e"/>
      ${face.brows || ''}
      ${face.leftEye}
      ${face.rightEye}
      ${face.mouth}
      <rect x="26" y="8" width="12" height="10" rx="2" fill="#c4a35a"/>
      <circle cx="32" cy="6" r="3" fill="#8fad9a"/>
      <rect x="6" y="28" width="6" height="14" rx="2" fill="#8fad9a"/>
      <rect x="52" y="28" width="6" height="14" rx="2" fill="#8fad9a"/>
    </svg>`;
  }

  /** Anims décoratives (fade, face-pop, blink) : OS ou checkbox a11y. */
  function prefersReducedMotion() {
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('a11y-motion')
    );
  }

  /** Cycle des phrases : uniquement la préférence OS live (comme hero/FAQ). */
  function shouldPauseNudgeCycle() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function applyFabFace(expression, { pop = false } = {}) {
    const fab = document.getElementById('chatFab');
    const icon = document.querySelector('#chatFab .fab-contact__icon');
    if (icon) icon.innerHTML = robotSvg(expression);
    if (fab) fab.setAttribute('data-face', expression);
    currentFace = expression;
    const avatar = document.querySelector('#chatPanel .chat__avatar');
    if (avatar && open) avatar.innerHTML = robotSvg(expression);
    if (pop && fab && !prefersReducedMotion()) {
      fab.classList.remove('fab-contact--face-pop');
      void fab.offsetWidth;
      fab.classList.add('fab-contact--face-pop');
      window.setTimeout(() => fab.classList.remove('fab-contact--face-pop'), 420);
    }
  }

  function setNudgeVisible(show) {
    const nudge = document.getElementById('chatFabNudge');
    if (!nudge) return;
    nudge.hidden = !show;
    nudge.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function renderNudge(index, { animate = false } = {}) {
    const nudge = document.getElementById('chatFabNudge');
    const line = NUDGE_LINES[index % NUDGE_LINES.length];
    if (!nudge || !line) return;
    const applyText = () => {
      nudge.textContent = line.text;
      applyFabFace(line.face, { pop: animate });
    };
    if (!animate || prefersReducedMotion()) {
      applyText();
      return;
    }
    nudge.classList.add('fab-nudge--fade');
    window.setTimeout(() => {
      applyText();
      nudge.classList.remove('fab-nudge--fade');
      nudge.classList.remove('fab-nudge--tick');
      void nudge.offsetWidth;
      nudge.classList.add('fab-nudge--tick');
    }, 180);
  }

  function stopBlinkIdle() {
    if (blinkTimer) {
      clearInterval(blinkTimer);
      blinkTimer = null;
    }
  }

  function startBlinkIdle() {
    stopBlinkIdle();
    if (open || prefersReducedMotion()) return;
    blinkTimer = setInterval(() => {
      if (open || document.hidden || prefersReducedMotion()) return;
      const restore = currentFace === 'blink' ? 'smile' : currentFace;
      applyFabFace('blink');
      window.setTimeout(() => {
        if (!open) applyFabFace(restore);
      }, 140);
    }, 3000);
  }

  function advanceNudge() {
    if (open || document.hidden || shouldPauseNudgeCycle()) return;
    nudgeIndex = (nudgeIndex + 1) % NUDGE_LINES.length;
    renderNudge(nudgeIndex, { animate: true });
  }

  function stopNudgeCycle() {
    if (nudgeKickTimer) {
      clearTimeout(nudgeKickTimer);
      nudgeKickTimer = null;
    }
    if (nudgeTimer) {
      clearInterval(nudgeTimer);
      nudgeTimer = null;
    }
    stopBlinkIdle();
  }

  function startNudgeCycle() {
    stopNudgeCycle();
    if (open) return;
    ensureDom();
    setNudgeVisible(true);
    renderNudge(nudgeIndex);
    startBlinkIdle();
    if (shouldPauseNudgeCycle() || document.hidden) return;
    // Premier changement plus tôt, puis rythme ~3,8 s
    nudgeKickTimer = setTimeout(() => {
      nudgeKickTimer = null;
      advanceNudge();
    }, 2000);
    nudgeTimer = setInterval(advanceNudge, 3800);
  }

  function ensureDom() {
    const existing = document.getElementById('proceptChat');
    if (existing) {
      if (!document.getElementById('chatBackdrop')) {
        const panel = document.getElementById('chatPanel');
        const backdrop = document.createElement('div');
        backdrop.className = 'chat__backdrop';
        backdrop.id = 'chatBackdrop';
        backdrop.hidden = true;
        backdrop.setAttribute('data-close-chat', '');
        backdrop.tabIndex = -1;
        if (panel) existing.insertBefore(backdrop, panel);
        else existing.appendChild(backdrop);
      }
      if (!document.getElementById('chatFabNudge')) {
        const fab = document.getElementById('chatFab');
        if (fab) {
          const nudge = document.createElement('button');
          nudge.type = 'button';
          nudge.className = 'fab-nudge';
          nudge.id = 'chatFabNudge';
          nudge.setAttribute('aria-controls', 'chatPanel');
          nudge.setAttribute('aria-label', 'Ouvrir l’assistant chantier');
          fab.insertAdjacentElement('beforebegin', nudge);
        }
      }
      return;
    }

    const wrap = document.createElement('div');
    wrap.id = 'proceptChat';
    wrap.className = 'chat';
    wrap.innerHTML = `
      <button type="button" class="fab-nudge" id="chatFabNudge" aria-controls="chatPanel" aria-label="Ouvrir l’assistant chantier"></button>
      <button type="button" class="fab-contact fab-contact--pulse" id="chatFab" aria-label="Ouvrir l’assistant chantier" aria-expanded="false" aria-controls="chatPanel">
        <span class="fab-contact__icon" aria-hidden="true">${robotSvg('smile')}</span>
      </button>
      <div class="chat__backdrop" id="chatBackdrop" hidden data-close-chat tabindex="-1"></div>
      <div class="chat__panel" id="chatPanel" role="dialog" aria-modal="true" aria-labelledby="chatTitle" hidden>
        <header class="chat__header">
          <div class="chat__header-brand">
            <span class="chat__avatar" aria-hidden="true">${robotSvg('smile')}</span>
            <div class="chat__header-text">
              <p class="chat__title" id="chatTitle">Assistant chantier</p>
              <p class="chat__subtitle">Procept — demande de devis</p>
            </div>
          </div>
          <button type="button" class="chat__close" id="chatClose" aria-label="Fermer le chat">×</button>
        </header>
        <div class="chat__body" id="chatBody"></div>
        <div class="chat__footer" id="chatFooter"></div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function stopFabPulse() {
    document.getElementById('chatFab')?.classList.remove('fab-contact--pulse');
  }

  function setOpen(value, opts = {}) {
    ensureDom();
    const wasOpen = open;
    open = !!value;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    const backdrop = document.getElementById('chatBackdrop');
    if (!panel || !fab) return;

    if (open) {
      stopFabPulse();
      stopNudgeCycle();
      setNudgeVisible(false);
      if (!wasOpen) {
        track('generate_lead', { method: opts.source || 'chat_open' });
      }
      if (backdrop) {
        backdrop.hidden = false;
        requestAnimationFrame(() => backdrop.classList.add('is-open'));
      }
      panel.hidden = false;
      panel.classList.add('is-open');
      fab.hidden = true;
      fab.setAttribute('aria-expanded', 'true');
      fab.classList.add('is-open');
      document.body.classList.add('chat-open');
      // Reset only on fresh open from closed, unless forceRestart
      if (!wasOpen || opts.forceRestart || currentStep === STEPS.welcome) {
        if (opts.forceRestart || !state.type) {
          renderStep(STEPS.welcome);
        } else {
          renderStep(currentStep);
        }
      }
      document.getElementById('chatClose')?.focus({ preventScroll: true });
    } else {
      if (backdrop) {
        backdrop.classList.remove('is-open');
        const hideBackdrop = () => {
          if (!open) backdrop.hidden = true;
        };
        backdrop.addEventListener('transitionend', hideBackdrop, { once: true });
        setTimeout(hideBackdrop, 280);
      }
      panel.hidden = true;
      panel.classList.remove('is-open');
      fab.hidden = false;
      fab.setAttribute('aria-expanded', 'false');
      fab.classList.remove('is-open');
      document.body.classList.remove('chat-open');
      startNudgeCycle();
    }
  }

  function setBody(html) {
    const body = document.getElementById('chatBody');
    if (body) {
      body.innerHTML = html;
      body.scrollTop = 0;
    }
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
    document.querySelectorAll('#chatBody .chat__choice').forEach((btn) => {
      btn.addEventListener('click', () => cb(btn.dataset.value));
    });
  }

  function choiceGroup(title, field, items, selected) {
    return `<div class="chat__detail-group" data-field="${escapeHtml(field)}">
      <p class="chat__detail-title">${escapeHtml(title)}</p>
      <div class="chat__choices chat__choices--wrap">
        ${items
          .map(
            (it) =>
              `<button type="button" class="chat__choice chat__choice--sm${selected === it.value ? ' is-selected' : ''}" data-field="${escapeHtml(field)}" data-value="${escapeHtml(it.value)}">${escapeHtml(it.label)}</button>`
          )
          .join('')}
      </div>
    </div>`;
  }

  function bindDetailChoices() {
    document.querySelectorAll('#chatBody .chat__choice[data-field]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        const value = btn.dataset.value;
        if (!field || !value) return;
        state[field] = value;
        document.querySelectorAll(`#chatBody .chat__choice[data-field="${field}"]`).forEach((el) => {
          el.classList.toggle('is-selected', el.dataset.value === value);
        });
        const err = document.getElementById('chatDetailsError');
        if (err) err.hidden = true;
      });
    });
  }

  function bindBack(step) {
    document.querySelector('#chatFooter [data-back]')?.addEventListener('click', () => renderStep(step));
  }

  function renderStep(step) {
    currentStep = step;

    if (step === STEPS.welcome) {
      setBody(
        bubble('Bonjour, je suis l’assistant chantier Procept.', 'bot') +
          bubble('Je prépare votre demande de devis en quelques questions (ouest parisien) : type, surface, budget et délai.', 'bot') +
          choices([{ value: 'start', label: 'Commencer →' }])
      );
      setFooter('');
      bindChoices(() => renderStep(STEPS.type));
      return;
    }

    if (step === STEPS.type) {
      setBody(
        bubble('Quel type de chantier souhaitez-vous chiffrer ?', 'bot') +
          choices([
            { value: 'construction', label: 'Maison neuve (construction)' },
            { value: 'renovation', label: 'Rénovation' },
            { value: 'extension', label: 'Extension / agrandissement' },
            { value: 'promotion', label: 'Promotion / terrain' },
          ])
      );
      setFooter(`<button type="button" class="chat__link" data-back>← Retour</button>`);
      bindChoices((v) => {
        state.type = v;
        state.context = '';
        state.surface = '';
        state.budget = '';
        state.timing = '';
        renderStep(STEPS.context);
      });
      bindBack(STEPS.welcome);
      return;
    }

    if (step === STEPS.context) {
      const opts = CONTEXT_BY_TYPE[state.type] || CONTEXT_BY_TYPE.construction;
      setBody(
        bubble(
          `${escapeHtml(TYPE_LABELS[state.type] || 'Votre projet')} — ${escapeHtml(contextQuestion())}`,
          'bot'
        ) + choices(opts)
      );
      setFooter(`<button type="button" class="chat__link" data-back>← Retour</button>`);
      bindChoices((v) => {
        state.context = v;
        renderStep(STEPS.city);
      });
      bindBack(STEPS.type);
      return;
    }

    if (step === STEPS.city) {
      const suggestions = (cities || []).slice(0, 8);
      setBody(
        bubble('Dans quelle commune se situe le projet ?', 'bot') +
          `<div class="chat__field">
            <label class="sr-only" for="chatCity">Commune</label>
            <input type="text" id="chatCity" class="chat__input" placeholder="Ex. Versailles, Croissy-sur-Seine…" list="chatCityList" autocomplete="address-level2" value="${escapeHtml(state.city)}">
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
      setFooter(`<button type="button" class="chat__link" data-back>← Retour</button>`);
      bindChoices((v) => {
        state.city = v;
        const input = document.getElementById('chatCity');
        if (input) input.value = v;
      });
      document.getElementById('chatCityNext')?.addEventListener('click', () => {
        const input = document.getElementById('chatCity');
        state.city = (input?.value || '').trim() || 'Ouest parisien';
        renderStep(STEPS.details);
      });
      bindBack(STEPS.context);
      document.getElementById('chatCity')?.focus({ preventScroll: true });
      return;
    }

    if (step === STEPS.details) {
      setBody(
        bubble('Pour un devis plus précis, indiquez surface, budget et délai (approximatifs).', 'bot') +
          choiceGroup(surfaceQuestion(), 'surface', SURFACE_OPTIONS, state.surface) +
          choiceGroup('Quel est votre budget indicatif ?', 'budget', BUDGET_OPTIONS, state.budget) +
          choiceGroup('Quel délai souhaitez-vous ?', 'timing', TIMING_OPTIONS, state.timing) +
          `<p class="chat__error" id="chatDetailsError" hidden></p>` +
          `<button type="button" class="btn btn--primary btn--sm chat__next" id="chatDetailsNext">Continuer</button>`
      );
      setFooter(`<button type="button" class="chat__link" data-back>← Retour</button>`);
      bindDetailChoices();
      document.getElementById('chatDetailsNext')?.addEventListener('click', () => {
        const err = document.getElementById('chatDetailsError');
        if (!state.surface || !state.budget || !state.timing) {
          if (err) {
            err.hidden = false;
            err.textContent = 'Choisissez une option pour la surface, le budget et le délai (y compris « Je ne sais pas » / « À définir »).';
          }
          return;
        }
        if (err) err.hidden = true;
        renderStep(STEPS.coords);
      });
      bindBack(STEPS.city);
      return;
    }

    if (step === STEPS.coords) {
      setBody(
        bubble('Vos coordonnées pour recevoir le devis (téléphone ou email obligatoire).', 'bot') +
          `<div class="chat__fields">
            <label class="chat__label">Nom
              <input type="text" id="chatName" class="chat__input" autocomplete="name" placeholder="Votre nom" value="${escapeHtml(state.name)}">
            </label>
            <label class="chat__label">Téléphone
              <input type="tel" id="chatPhone" class="chat__input" autocomplete="tel" placeholder="${escapeHtml(sitePhone)}" value="${escapeHtml(state.phone)}">
            </label>
            <label class="chat__label">Email
              <input type="email" id="chatEmail" class="chat__input" autocomplete="email" placeholder="vous@email.fr" value="${escapeHtml(state.email)}">
            </label>
          </div>
          <p class="chat__error" id="chatCoordsError" hidden></p>
          <button type="button" class="btn btn--primary btn--sm chat__next" id="chatCoordsNext">Voir ma demande →</button>`
      );
      setFooter(`<button type="button" class="chat__link" data-back>← Retour</button>`);
      document.getElementById('chatCoordsNext')?.addEventListener('click', () => {
        state.name = (document.getElementById('chatName')?.value || '').trim();
        state.phone = (document.getElementById('chatPhone')?.value || '').trim();
        state.email = (document.getElementById('chatEmail')?.value || '').trim();
        const err = document.getElementById('chatCoordsError');
        if (!state.phone && !state.email) {
          if (err) {
            err.hidden = false;
            err.textContent = 'Indiquez un téléphone ou un email pour être recontacté.';
          }
          return;
        }
        if (err) err.hidden = true;
        renderStep(STEPS.summary);
      });
      bindBack(STEPS.details);
      return;
    }

    if (step === STEPS.summary) {
      const preview = escapeHtml(buildMessage()).replace(/\n/g, '<br>');
      const typeLabel = TYPE_LABELS[state.type] || state.type;
      const ctxLabel = CONTEXT_LABELS[state.context] || state.context;
      const surfaceLabel = SURFACE_LABELS[state.surface] || state.surface;
      const budgetLabel = BUDGET_LABELS[state.budget] || state.budget;
      const timingLabel = TIMING_LABELS[state.timing] || state.timing;
      setBody(
        bubble('Votre demande de devis est prête. Choisissez comment l’envoyer :', 'bot') +
          `<div class="chat__recap" role="status">
            <p><strong>Projet</strong> ${escapeHtml(typeLabel)}</p>
            <p><strong>Contexte</strong> ${escapeHtml(ctxLabel || '—')}</p>
            <p><strong>Ville</strong> ${escapeHtml(state.city || '—')}</p>
            <p><strong>Surface</strong> ${escapeHtml(surfaceLabel || '—')}</p>
            <p><strong>Budget</strong> ${escapeHtml(budgetLabel || '—')}</p>
            <p><strong>Délai</strong> ${escapeHtml(timingLabel || '—')}</p>
            <p><strong>Contact</strong> ${escapeHtml([state.name, state.phone, state.email].filter(Boolean).join(' · ') || 'Non renseigné')}</p>
          </div>` +
          `<div class="chat__preview" id="chatPreview">${preview}</div>` +
          `<div class="chat__actions">
            <a class="chat__action-btn chat__action-btn--primary" id="chatMailto" href="${mailtoHref()}">Envoyer par email</a>
            <button type="button" class="chat__action-btn chat__action-btn--secondary" id="chatCopy">Copier le texte</button>
            <button type="button" class="chat__action-btn chat__action-btn--secondary" id="chatToForm">Formulaire contact</button>
          </div>` +
          `<p class="chat__confirm" id="chatConfirm" hidden></p>` +
          bubble(`Ou appelez-nous au <a href="tel:${sitePhone.replace(/\s/g, '')}">${escapeHtml(sitePhone)}</a>.`, 'bot')
      );
      setFooter(
        `<button type="button" class="chat__link" data-back>← Modifier</button>
         <button type="button" class="chat__link" id="chatRestart">Recommencer</button>`
      );
      saveDraft();
      applyDraftToForm();

      const confirm = document.getElementById('chatConfirm');
      document.getElementById('chatMailto')?.addEventListener('click', () => {
        track('generate_lead', { method: 'mailto', project_type: state.type });
        if (confirm) {
          confirm.hidden = false;
          confirm.textContent = 'Messagerie ouverte — envoyez l’email pour finaliser votre demande.';
        }
      });
      document.getElementById('chatCopy')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(buildMessage());
          if (confirm) {
            confirm.hidden = false;
            confirm.textContent = 'Texte copié. Collez-le dans un email à ' + siteEmail;
          }
          track('generate_lead', { method: 'copy', project_type: state.type });
        } catch {
          if (confirm) {
            confirm.hidden = false;
            confirm.textContent = 'Sélectionnez le texte ci-dessus et copiez-le (Ctrl+C).';
          }
        }
      });
      document.getElementById('chatToForm')?.addEventListener('click', goToContactForm);
      bindBack(STEPS.coords);
      document.getElementById('chatRestart')?.addEventListener('click', () => {
        state = emptyProjectState();
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
      track('generate_lead', { method: 'contact_form' });
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

  function wireGlobalEvents() {
    if (bound) return;
    bound = true;

    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('#chatClose');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      }

      const backdrop = e.target.closest('#chatBackdrop, [data-close-chat]');
      if (backdrop && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }

      const fab = e.target.closest('#chatFab, #chatFabNudge');
      if (fab) {
        e.preventDefault();
        stopFabPulse();
        setOpen(!open, { source: fab.id === 'chatFabNudge' ? 'nudge' : 'fab' });
        return;
      }

      const openTrigger = e.target.closest('[data-open-chat], a[href="#devis"], a[href$="#devis"]');
      if (openTrigger) {
        e.preventDefault();
        stopFabPulse();
        setOpen(true, { source: 'cta' });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    });

    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      a.addEventListener('click', () => track('contact', { method: 'phone' }));
    });
  }

  function init(options = {}) {
    ensureDom();
    if (options.cities) cities = options.cities;
    if (options.email) siteEmail = options.email;
    if (options.phone) sitePhone = options.phone;
    hydrateFormFromStorage();
    wireContactForm();
    wireGlobalEvents();
    startNudgeCycle();

    window.addEventListener('procept:a11y-motion', () => {
      if (open) return;
      startNudgeCycle();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopNudgeCycle();
      else if (!open) startNudgeCycle();
    });

    if (window.location.hash === '#devis' || /[?&]devis=1/.test(window.location.search)) {
      setTimeout(() => setOpen(true), 300);
    }
  }

  return {
    init,
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
})();
