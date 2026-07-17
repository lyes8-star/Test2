/**
 * Recherche live côté client — indexe le contenu et affiche des résultats en temps réel.
 */
window.ProceptSearch = (function () {
  const MAX_RESULTS = 8;
  let index = [];
  let debounceTimer = null;
  let activeQuery = '';

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

  function pushEntry(entry) {
    index.push({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      excerpt: entry.excerpt,
      keywords: entry.keywords || [],
      target: entry.target,
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
      ],
      target: '#contact',
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
        target: `#${service.id}`,
        matchIds: [service.id],
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

    (content.gallery || []).forEach((item, i) => {
      pushEntry({
        id: item.id || `gal-${i}`,
        type: 'Réalisation',
        title: item.caption || 'Réalisation',
        excerpt: [item.caption, item.category].filter(Boolean).join(' — '),
        keywords: [item.caption, item.category, ...siteKeywords],
        target: '#realisations',
        matchIds: [item.id || `gal-${i}`],
      });
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
      container.innerHTML = `<div class="search__empty">Aucun résultat pour « ${escapeHtml(query)} »</div>`;
      return;
    }

    container.innerHTML = results
      .map(
        (r, i) => `
      <button type="button" class="search__result" role="option" data-target="${escapeHtml(r.target)}" data-index="${i}">
        <span class="search__result-type">${escapeHtml(r.type)}</span>
        <span class="search__result-title">${highlight(r.title, query)}</span>
        <span class="search__result-excerpt">${highlight(r.excerpt.slice(0, 120), query)}</span>
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
    const el = document.querySelector(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('search-flash');
      setTimeout(() => el.classList.remove('search-flash'), 1500);
    }
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

  function init(content) {
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

  return { init, search, clearPageHighlight, goToResult };
})();
