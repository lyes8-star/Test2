/**
 * Recherche live — popup type command-palette + filtrage du contenu de la page.
 */
window.ProceptSearch = (function () {
  const MAX_RESULTS = 12;
  const LIVE_SELECTORS = [
    '.service-card',
    '.gallery__item',
    '.faq__item',
    '.zones__item',
    '.news-card',
  ];

  let index = [];
  let debounceTimer = null;
  let activeQuery = '';
  let linkBase = '';
  let modalEl = null;
  let inputEl = null;
  let resultsEl = null;
  let clearBtn = null;
  let activeIndex = -1;
  let lastFocused = null;
  let isOpen = false;
  let scrollTimer = null;

  function normalize(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return safe;

    let result = safe;
    terms.forEach((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${escaped})`, 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    });
    return result;
  }

  function resolveTarget(target) {
    if (!target) return '#';
    if (/^https?:\/\//i.test(target)) return target;
    if (target.startsWith('#')) {
      return linkBase ? `${linkBase}${target}` : target;
    }
    return linkBase ? `${linkBase}${target}` : target;
  }

  function pushEntry(entry) {
    index.push({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      excerpt: entry.excerpt,
      keywords: entry.keywords || [],
      target: resolveTarget(entry.target),
      matchIds: entry.matchIds || [],
    });
  }

  function buildIndex(content) {
    index = [];
    const site = content.site || {};
    const siteKeywords = site.keywords || [];

    pushEntry({
      id: 'site',
      type: 'Contact',
      title: site.name || 'Procept',
      excerpt: [site.tagline, site.description, site.address].filter(Boolean).join(' — '),
      keywords: [
        ...siteKeywords,
        site.name,
        site.tagline,
        site.description,
        site.address,
        site.phone,
        site.email,
        'contact',
        'devis',
      ],
      target: '#contact',
    });

    const social = site.social || {};
    Object.entries(social).forEach(([network, url]) => {
      if (!url) return;
      pushEntry({
        id: `social-${network}`,
        type: 'Réseau',
        title: network.charAt(0).toUpperCase() + network.slice(1),
        excerpt: `Suivez Procept sur ${network}`,
        keywords: [network, 'réseaux sociaux', 'social'],
        target: url,
      });
    });

    (content.hero?.slides || []).forEach((slide, i) => {
      pushEntry({
        id: slide.id || `slide-${i}`,
        type: 'Diaporama',
        title: slide.title,
        excerpt: slide.description,
        keywords: [slide.title, slide.description, ...siteKeywords],
        target: '#accueil',
      });
    });

    (content.services || []).forEach((service) => {
      const target = service.link && !service.link.startsWith('#')
        ? service.link
        : `#${service.id}`;
      pushEntry({
        id: service.id,
        type: 'Service',
        title: service.title,
        excerpt: service.description,
        keywords: [
          service.title,
          service.description,
          service.id,
          ...(service.keywords || []),
          ...siteKeywords,
        ],
        target,
        matchIds: [service.id],
      });
    });

    Object.entries(content.pages || {}).forEach(([key, page]) => {
      const slug = page.slug || key;
      pushEntry({
        id: `page-${key}`,
        type: 'Page',
        title: page.hero?.title || page.label || key,
        excerpt: page.seo?.description || (page.intro || []).join(' ').slice(0, 160),
        keywords: [
          page.label,
          page.hero?.title,
          page.hero?.desc,
          page.seo?.title,
          page.seo?.description,
          ...(page.intro || []),
          ...(page.highlights || []).flatMap((h) => [h.title, h.text]),
          page.secondary?.title,
          page.secondary?.text,
          ...siteKeywords,
        ],
        target: `${slug}/`,
      });
    });

    if (content.about) {
      pushEntry({
        id: 'about',
        type: 'À propos',
        title: content.about.title,
        excerpt: content.about.text,
        keywords: [
          content.about.title,
          content.about.text,
          content.about.zone,
          ...siteKeywords,
        ],
        target: '#apropos',
      });
    }

    (content.faq || []).forEach((item, i) => {
      pushEntry({
        id: `faq-${i}`,
        type: 'FAQ',
        title: item.question,
        excerpt: item.answer,
        keywords: [item.question, item.answer, ...siteKeywords],
        target: '#faq',
        matchIds: [`faq-${i}`],
      });
    });

    (content.zones?.cities || []).forEach((city) => {
      const id = `zone-${normalize(city)}`;
      pushEntry({
        id,
        type: 'Zone',
        title: city,
        excerpt: `Intervention Procept à ${city}`,
        keywords: [city, `constructeur ${city}`, `rénovation ${city}`, ...siteKeywords],
        target: '#zones',
        matchIds: [id, city],
      });
    });

    (content.gallery || []).forEach((item, i) => {
      const status = item.status || 'termine';
      const statusLabel = status === 'en-cours' ? 'en cours' : 'terminé livré';
      pushEntry({
        id: item.id || `gal-${i}`,
        type: status === 'en-cours' ? 'Projet en cours' : 'Réalisation',
        title: item.caption || 'Réalisation',
        excerpt: [item.caption, item.category, statusLabel].filter(Boolean).join(' — '),
        keywords: [
          item.caption,
          item.category,
          status,
          statusLabel,
          'projet',
          'chantier',
          ...siteKeywords,
        ],
        target: '#realisations',
        matchIds: [item.id || `gal-${i}`],
      });
    });

    pushEntry({
      id: 'projets-en-cours',
      type: 'Projet',
      title: 'Projets en cours',
      excerpt: 'Voir les chantiers et projets Procept en cours',
      keywords: ['en cours', 'chantier', 'projet en cours', 'travaux'],
      target: '#realisations',
    });

    pushEntry({
      id: 'projets-termines',
      type: 'Projet',
      title: 'Projets terminés',
      excerpt: 'Voir les réalisations livrées Procept',
      keywords: ['terminé', 'terminés', 'livré', 'livraison', 'réalisations'],
      target: '#realisations',
    });

    (content.news || [])
      .filter((n) => n.published !== false)
      .forEach((item) => {
        pushEntry({
          id: item.id || `news-${item.slug}`,
          type: 'Actualité',
          title: item.title,
          excerpt: item.excerpt || '',
          keywords: [
            item.title,
            item.excerpt,
            ...(item.body || []),
            'actualité',
            'actualités',
            'news',
            ...siteKeywords,
          ],
          target: `actualites/${encodeURIComponent(item.slug || item.id)}/`,
          matchIds: [item.id || item.slug],
        });
      });

    pushEntry({
      id: 'page-actualites',
      type: 'Page',
      title: 'Actualités Procept',
      excerpt: 'Toutes les actualités du constructeur Procept',
      keywords: ['actualité', 'actualités', 'news', 'blog'],
      target: 'actualites/',
    });

    pushEntry({
      id: 'assistant-devis',
      type: 'Devis',
      title: 'Assistant devis Procept',
      excerpt: 'Posez vos questions et préparez une demande de devis par email',
      keywords: ['devis', 'assistant', 'chat', 'robot', 'demande de devis', 'contact'],
      target: '#devis',
    });

    siteKeywords.forEach((kw) => {
      pushEntry({
        id: `kw-${normalize(kw)}`,
        type: 'Mot-clé',
        title: kw,
        excerpt: `Rechercher « ${kw} » sur le site`,
        keywords: [kw],
        target: '#services',
      });
    });
  }

  function scoreEntry(entry, terms) {
    const haystack = normalize([entry.title, entry.excerpt, ...entry.keywords].join(' '));
    let score = 0;
    for (const term of terms) {
      if (!haystack.includes(term)) return 0;
      if (normalize(entry.title).includes(term)) score += 10;
      if (entry.keywords.some((k) => normalize(k).includes(term))) score += 5;
      score += 1;
    }
    return score;
  }

  function search(query) {
    const terms = normalize(query).split(/\s+/).filter((t) => t.length >= 2);
    if (!terms.length) return [];

    return index
      .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((r) => r.entry);
  }

  function groupResults(results) {
    const order = [
      'Service',
      'Zone',
      'FAQ',
      'Actualité',
      'Réalisation',
      'Projet en cours',
      'Projet',
      'Page',
      'Devis',
      'À propos',
      'Contact',
      'Diaporama',
      'Réseau',
      'Mot-clé',
    ];
    const groups = new Map();
    results.forEach((r) => {
      const key = r.type || 'Autre';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    return [...groups.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  function renderResults(container, results, query) {
    activeIndex = -1;
    if (!container) return;

    if (!query.trim()) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }

    container.hidden = false;

    if (!results.length) {
      container.innerHTML = `<div class="search__empty">Aucun résultat pour « ${escapeHtml(query)} ». Essayez « rénovation », « en cours », « Versailles » ou « actualité ».</div>`;
      return;
    }

    let flatIndex = 0;
    const groups = groupResults(results);
    container.innerHTML = groups
      .map(([type, items]) => {
        const buttons = items
          .map((r) => {
            const i = flatIndex++;
            return `
      <button type="button" class="search__result" role="option" id="search-opt-${i}" data-target="${escapeHtml(r.target)}" data-index="${i}" aria-selected="false">
        <span class="search__result-title">${highlight(r.title, query)}</span>
        <span class="search__result-excerpt">${highlight((r.excerpt || '').slice(0, 120), query)}</span>
      </button>`;
          })
          .join('');
        return `<div class="search__group" role="group" aria-label="${escapeHtml(type)}">
          <span class="search__group-title">${escapeHtml(type)}</span>
          ${buttons}
        </div>`;
      })
      .join('');
  }

  function getResultButtons() {
    return resultsEl ? [...resultsEl.querySelectorAll('.search__result')] : [];
  }

  function setActiveResult(next) {
    const buttons = getResultButtons();
    if (!buttons.length) {
      activeIndex = -1;
      return;
    }
    activeIndex = ((next % buttons.length) + buttons.length) % buttons.length;
    buttons.forEach((btn, i) => {
      const on = i === activeIndex;
      btn.classList.toggle('search__result--active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    buttons[activeIndex].scrollIntoView({ block: 'nearest' });
    if (inputEl) inputEl.setAttribute('aria-activedescendant', buttons[activeIndex].id);
  }

  function elementMatches(el, terms, matchedIds) {
    if (matchedIds.size) {
      const id = el.id || el.dataset.id || el.dataset.searchId || el.dataset.city || '';
      if (id && matchedIds.has(id)) return true;
      if (el.dataset.city && matchedIds.has(el.dataset.city)) return true;
      if (matchedIds.has(`zone-${normalize(el.dataset.city || '')}`)) return true;
    }
    const text = normalize(el.textContent || '');
    return terms.every((t) => text.includes(t));
  }

  function applyPageHighlight(results, query) {
    activeQuery = query;
    const terms = normalize(query).split(/\s+/).filter((t) => t.length >= 2);
    const searching = terms.length > 0;
    const main = document.querySelector('main');
    main?.classList.toggle('search-active', searching);

    const matchedIds = new Set();
    results.forEach((r) => {
      matchedIds.add(r.id);
      (r.matchIds || []).forEach((id) => matchedIds.add(id));
    });

    let firstMatch = null;
    LIVE_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!searching) {
          el.classList.remove('search-dimmed', 'search-match');
          return;
        }
        const match = elementMatches(el, terms, matchedIds);
        el.classList.toggle('search-match', match);
        el.classList.toggle('search-dimmed', !match);
        if (match && !firstMatch) firstMatch = el;
      });
    });

    // FAQ items: attach stable ids if missing
    document.querySelectorAll('.faq__item').forEach((el, i) => {
      if (!el.dataset.searchId) el.dataset.searchId = `faq-${i}`;
      if (!searching) return;
      if (matchedIds.has(`faq-${i}`) || matchedIds.has(el.dataset.searchId)) {
        el.classList.add('search-match');
        el.classList.remove('search-dimmed');
        if (!firstMatch) firstMatch = el;
      }
    });

    if (scrollTimer) clearTimeout(scrollTimer);
    if (searching && firstMatch && isOpen) {
      scrollTimer = setTimeout(() => {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 280);
    }
  }

  function clearPageHighlight() {
    activeQuery = '';
    document.querySelector('main')?.classList.remove('search-active');
    document.querySelectorAll('.search-dimmed, .search-match').forEach((el) => {
      el.classList.remove('search-dimmed', 'search-match');
    });
  }

  function goToResult(target) {
    if (!target) return;

    const hashIdx = target.indexOf('#');
    const pathPart = hashIdx === -1 ? target : target.slice(0, hashIdx);
    const hashPart = hashIdx === -1 ? '' : target.slice(hashIdx);

    if (hashPart === '#devis' || target.endsWith('#devis')) {
      closeSearch({ keepHighlight: false });
      if (window.ProceptChat) {
        window.ProceptChat.open();
        return;
      }
    }

    if (!pathPart && hashPart) {
      const el = document.querySelector(hashPart);
      closeSearch({ keepHighlight: true });
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('search-flash');
        setTimeout(() => el.classList.remove('search-flash'), 1500);
        return;
      }
    }

    if (pathPart) {
      if (hashPart) {
        const el = document.querySelector(hashPart);
        if (el && (pathPart === './' || pathPart === '' || pathPart === window.location.pathname)) {
          closeSearch({ keepHighlight: true });
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      window.location.href = target;
      return;
    }

    window.location.href = target;
  }

  function ensureModal() {
    modalEl = document.getElementById('searchModal');
    if (modalEl) {
      inputEl = modalEl.querySelector('#searchInput');
      resultsEl = modalEl.querySelector('#searchResults');
      clearBtn = modalEl.querySelector('#searchClear');
      return;
    }

    // Remove legacy header panel first to free IDs
    document.getElementById('searchPanel')?.remove();
    document.querySelector('#searchDesktop .search__panel')?.remove();

    modalEl = document.createElement('div');
    modalEl.id = 'searchModal';
    modalEl.className = 'search-modal';
    modalEl.setAttribute('hidden', '');
    modalEl.innerHTML = `
      <div class="search-modal__backdrop" data-close-search tabindex="-1"></div>
      <div class="search-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="searchModalTitle">
        <h2 id="searchModalTitle" class="sr-only">Rechercher sur le site</h2>
        <div class="search-modal__field">
          <svg class="search-modal__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <label class="sr-only" for="searchInput">Rechercher</label>
          <input type="search" id="searchInput" class="search__input" placeholder="Rechercher un service, une ville, une actualité…" autocomplete="off" enterkeyhint="search" aria-autocomplete="list" aria-controls="searchResults" role="combobox" aria-expanded="false">
          <button type="button" class="search__clear" id="searchClear" hidden aria-label="Effacer la recherche">×</button>
          <kbd class="search-modal__kbd" aria-hidden="true">ESC</kbd>
        </div>
        <div class="search__results search-modal__results" id="searchResults" role="listbox" hidden></div>
        <p class="search-modal__hint">↑↓ naviguer · Entrée ouvrir · Échap fermer · filtrage live sur la page</p>
      </div>
    `;
    document.body.appendChild(modalEl);

    inputEl = modalEl.querySelector('#searchInput');
    resultsEl = modalEl.querySelector('#searchResults');
    clearBtn = modalEl.querySelector('#searchClear');

    modalEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-search]')) closeSearch();
    });
  }

  function runSearch() {
    if (!inputEl || !resultsEl) return;
    const query = inputEl.value;
    const results = search(query);
    renderResults(resultsEl, results, query);
    applyPageHighlight(results, query);
    if (clearBtn) clearBtn.hidden = !query;
    inputEl.setAttribute('aria-expanded', query.trim().length >= 2 ? 'true' : 'false');
    if (results.length) setActiveResult(0);
  }

  function openSearch() {
    ensureModal();
    if (isOpen) {
      inputEl?.focus();
      return;
    }
    isOpen = true;
    lastFocused = document.activeElement;
    modalEl.hidden = false;
    requestAnimationFrame(() => modalEl.classList.add('is-open'));
    document.body.classList.add('search-modal-open');
    document.getElementById('searchFab')?.setAttribute('aria-expanded', 'true');
    document.getElementById('searchFab')?.setAttribute('hidden', '');
    document.getElementById('searchToggle')?.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      inputEl?.focus();
      inputEl?.select?.();
    }, 40);
  }

  function closeSearch(options = {}) {
    const { keepHighlight = false, clearQuery = true } = options;
    if (!modalEl) return;
    isOpen = false;
    modalEl.classList.remove('is-open');
    document.body.classList.remove('search-modal-open');
    document.getElementById('searchFab')?.setAttribute('aria-expanded', 'false');
    document.getElementById('searchFab')?.removeAttribute('hidden');
    document.getElementById('searchToggle')?.setAttribute('aria-expanded', 'false');

    const finish = () => {
      modalEl.hidden = true;
      if (clearQuery && inputEl) {
        inputEl.value = '';
        if (resultsEl) {
          resultsEl.hidden = true;
          resultsEl.innerHTML = '';
        }
        if (clearBtn) clearBtn.hidden = true;
      }
      if (!keepHighlight) clearPageHighlight();
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try {
          lastFocused.focus();
        } catch (_) {
          /* ignore */
        }
      }
    };

    setTimeout(finish, 220);
  }

  let eventsBound = false;

  function bindModalEvents() {
    ensureModal();
    if (eventsBound) return;
    eventsBound = true;

    inputEl.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 120);
    });

    inputEl.addEventListener('keydown', (e) => {
      const buttons = getResultButtons();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveResult(activeIndex < 0 ? 0 : activeIndex + 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveResult(activeIndex < 0 ? buttons.length - 1 : activeIndex - 1);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = buttons[activeIndex] || buttons[0];
        if (btn) goToResult(btn.dataset.target);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSearch();
      }
    });

    resultsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.search__result');
      if (!btn) return;
      goToResult(btn.dataset.target);
    });

    resultsEl.addEventListener('mousemove', (e) => {
      const btn = e.target.closest('.search__result');
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      if (!Number.isNaN(idx) && idx !== activeIndex) setActiveResult(idx);
    });

    clearBtn?.addEventListener('click', () => {
      inputEl.value = '';
      runSearch();
      clearPageHighlight();
      inputEl.focus();
    });

    document.addEventListener('keydown', (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) closeSearch();
        else openSearch();
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeSearch();
      }
    });

    modalEl.addEventListener('keydown', (e) => {
      if (!isOpen || e.key !== 'Tab') return;
      const focusables = modalEl.querySelectorAll(
        'input, button:not([hidden]), [href], [tabindex]:not([tabindex="-1"])'
      );
      const list = [...focusables].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  let triggersBound = false;

  function ensureSearchFab() {
    let fab = document.getElementById('searchFab');
    if (fab) return fab;
    fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'searchFab';
    fab.className = 'fab-search';
    fab.setAttribute('aria-label', 'Rechercher sur le site');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'searchModal');
    fab.innerHTML = `
      <span class="fab-search__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </span>
      <span class="fab-search__label">
        <span class="fab-search__label-full">Rechercher</span>
        <span class="fab-search__label-short">Chercher</span>
      </span>
    `;
    document.body.appendChild(fab);
    return fab;
  }

  function wireTriggers() {
    if (triggersBound) return;
    triggersBound = true;

    const fab = ensureSearchFab();
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) closeSearch();
      else openSearch();
    });

    // Legacy header loupe if still present
    document.getElementById('searchToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) closeSearch();
      else openSearch();
    });

    const mobileWrap = document.querySelector('.nav__mobile-search');
    const mobileInput = document.getElementById('searchMobile');
    if (mobileWrap) {
      let trigger = document.getElementById('searchMobileTrigger');
      if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = 'searchMobileTrigger';
        trigger.className = 'search-modal__trigger-mobile';
        trigger.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Rechercher sur le site…</span>`;
        if (mobileInput) {
          mobileInput.replaceWith(trigger);
        } else {
          mobileWrap.appendChild(trigger);
        }
      }
      trigger.addEventListener('click', () => {
        document.getElementById('nav')?.classList.remove('open');
        document.body.classList.remove('nav-open');
        document.getElementById('navToggle')?.setAttribute('aria-expanded', 'false');
        openSearch();
      });
    }

    document.getElementById('searchResultsMobile')?.remove();
    document.getElementById('searchDesktop')?.remove();
  }

  function init(content, options = {}) {
    linkBase = options.basePath || '';
    buildIndex(content);
    ensureModal();
    bindModalEvents();
    wireTriggers();

    const track = document.getElementById('marqueeTrack');
    if (track && siteKeywords(content).length) {
      const words = siteKeywords(content);
      const sequence = [...words, ...words]
        .map((w) => `<span class="marquee__item">${escapeHtml(w)}</span>`)
        .join('<span class="marquee__sep">·</span>');
      track.innerHTML = sequence + sequence;
    }
  }

  function siteKeywords(content) {
    return content?.site?.keywords || [
      'Construction',
      'Rénovation',
      'Extension',
      'Promotion immobilière',
      'Versailles',
      'Saint-Germain-en-Laye',
      'RE2020',
      'Clé en main',
    ];
  }

  async function loadLexicon(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const keywords = data.keywords || [];
      const sample = keywords.filter((k) => k.split(' ').length <= 5).slice(0, 800);
      sample.forEach((kw) => {
        pushEntry({
          id: `seo-${normalize(kw)}`,
          type: 'Mot-clé',
          title: kw,
          excerpt: `Recherche liée à ${kw}`,
          keywords: [kw],
          target: /rénov/i.test(kw)
            ? 'renovation/'
            : /promo|promoteur|permis|cl[eé]\s*en\s*main/i.test(kw)
              ? 'promotion-immobiliere/'
              : /actualit|news|livraison/i.test(kw)
                ? 'actualites/'
                : /extension|construct|maison|RE2020|bois|piscine|devis/i.test(kw)
                  ? 'constructeur/'
                  : '#zones',
        });
      });
    } catch (_) {
      /* lexique optionnel */
    }
  }

  return {
    init,
    search,
    clearPageHighlight,
    goToResult,
    loadLexicon,
    open: openSearch,
    close: closeSearch,
    isOpen: () => isOpen,
  };
})();
