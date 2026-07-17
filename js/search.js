/**
 * Recherche live côté client — indexe le contenu et affiche des résultats en temps réel.
 */
window.ProceptSearch = (function () {
  const MAX_RESULTS = 8;
  let index = [];
  let debounceTimer = null;
  let activeQuery = '';
  let linkBase = '';

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
      });
    });

    (content.zones?.cities || []).forEach((city) => {
      pushEntry({
        id: `zone-${normalize(city)}`,
        type: 'Zone',
        title: city,
        excerpt: `Intervention Procept à ${city}`,
        keywords: [city, `constructeur ${city}`, `rénovation ${city}`, ...siteKeywords],
        target: '#zones',
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

    // Entrées dédiées aux mots-clés site (suggestions rapides)
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

  function renderResults(container, results, query) {
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

    // Grouper légèrement par type pour la lecture
    container.innerHTML = results
      .map(
        (r, i) => `
      <button type="button" class="search__result" role="option" data-target="${escapeHtml(r.target)}" data-index="${i}">
        <span class="search__result-type">${escapeHtml(r.type)}</span>
        <span class="search__result-title">${highlight(r.title, query)}</span>
        <span class="search__result-excerpt">${highlight((r.excerpt || '').slice(0, 120), query)}</span>
      </button>`
      )
      .join('');
  }

  function applyPageHighlight(results, query) {
    activeQuery = query;
    const matchedServiceIds = new Set();
    const matchedGalleryIds = new Set();

    results.forEach((r) => {
      (r.matchIds || []).forEach((id) => {
        if (id.startsWith('gal-') || document.querySelector(`.gallery__item[data-id="${id}"]`)) {
          matchedGalleryIds.add(id);
        } else {
          matchedServiceIds.add(id);
        }
      });
      if (r.type === 'Service') matchedServiceIds.add(r.id);
      if (r.type === 'Réalisation') matchedGalleryIds.add(r.id);
    });

    const searching = query.trim().length >= 2;

    document.querySelectorAll('.service-card').forEach((card) => {
      if (!searching) {
        card.classList.remove('search-dimmed', 'search-match');
        return;
      }
      const match = matchedServiceIds.has(card.id);
      card.classList.toggle('search-match', match);
      card.classList.toggle('search-dimmed', !match);
    });

    document.querySelectorAll('.gallery__item').forEach((item) => {
      if (!searching) {
        item.classList.remove('search-dimmed', 'search-match');
        return;
      }
      const id = item.dataset.id;
      const match = matchedGalleryIds.has(id);
      item.classList.toggle('search-match', match);
      item.classList.toggle('search-dimmed', !match);
    });
  }

  function clearPageHighlight() {
    activeQuery = '';
    document.querySelectorAll('.search-dimmed, .search-match').forEach((el) => {
      el.classList.remove('search-dimmed', 'search-match');
    });
  }

  function goToResult(target) {
    if (!target) return;

    const hashIdx = target.indexOf('#');
    const pathPart = hashIdx === -1 ? target : target.slice(0, hashIdx);
    const hashPart = hashIdx === -1 ? '' : target.slice(hashIdx);

    // Assistant devis
    if (hashPart === '#devis' || target.endsWith('#devis')) {
      if (window.ProceptChat) {
        window.ProceptChat.open();
        return;
      }
    }

    // Cible purement locale (#section)
    if (!pathPart && hashPart) {
      const el = document.querySelector(hashPart);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('search-flash');
        setTimeout(() => el.classList.remove('search-flash'), 1500);
        return;
      }
    }

    // Autre page ou chemin relatif (constructeur/, ../#contact, etc.)
    if (pathPart) {
      // Hash sur la page courante si le path pointe ici
      if (hashPart) {
        const el = document.querySelector(hashPart);
        if (el && (pathPart === './' || pathPart === '' || pathPart === window.location.pathname)) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      window.location.href = target;
      return;
    }

    window.location.href = target;
  }

  function bindInput(input, resultsEl, options = {}) {
    const { onOpen, onClose, clearBtn } = options;

    function runSearch() {
      const query = input.value;
      const results = search(query);
      renderResults(resultsEl, results, query);
      applyPageHighlight(results, query);
      if (clearBtn) clearBtn.hidden = !query;
      if (query && onOpen) onOpen();
      if (!query && onClose) onClose();
    }

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 150);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        runSearch();
        clearPageHighlight();
        resultsEl.hidden = true;
        input.blur();
        if (onClose) onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = resultsEl.querySelector('.search__result');
        if (first) {
          goToResult(first.dataset.target);
          resultsEl.hidden = true;
          if (onClose) onClose();
        }
      }
    });

    resultsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.search__result');
      if (!btn) return;
      goToResult(btn.dataset.target);
      resultsEl.hidden = true;
      if (onClose) onClose();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        runSearch();
        clearPageHighlight();
        input.focus();
      });
    }
  }

  function init(content, options = {}) {
    linkBase = options.basePath || '';
    buildIndex(content);

    const desktopInput = document.getElementById('searchInput');
    const desktopResults = document.getElementById('searchResults');
    const clearBtn = document.getElementById('searchClear');
    const mobileInput = document.getElementById('searchMobile');

    if (desktopInput && desktopResults) {
      // Mirror mobile results into same dropdown when using desktop
      bindInput(desktopInput, desktopResults, {
        clearBtn,
        onOpen: () => {
          document.getElementById('searchPanel')?.classList.add('search__panel--open');
          document.getElementById('searchToggle')?.setAttribute('aria-expanded', 'true');
        },
      });
    }

    if (mobileInput) {
      // Mobile uses its own results container injected below input
      let mobileResults = document.getElementById('searchResultsMobile');
      if (!mobileResults) {
        mobileResults = document.createElement('div');
        mobileResults.id = 'searchResultsMobile';
        mobileResults.className = 'search__results search__results--mobile';
        mobileResults.hidden = true;
        mobileResults.setAttribute('role', 'listbox');
        mobileInput.parentElement.appendChild(mobileResults);
      }

      bindInput(mobileInput, mobileResults, {
        onClose: () => {
          mobileResults.hidden = true;
        },
      });

      // Sync desktop ↔ mobile query lightly
      mobileInput.addEventListener('input', () => {
        if (desktopInput) desktopInput.value = mobileInput.value;
      });
    }

    // Sync marquee keywords if present
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
      // Index a sample of high-value keywords for live search (cap to keep UI snappy)
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

  return { init, search, clearPageHighlight, goToResult, loadLexicon };
})();