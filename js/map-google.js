/**
 * Carte Google Maps (embed iframe) — zones d'intervention Procept.
 * Sans clé API : recentrage au clic sur les communes.
 */
window.ProceptMapGoogle = (function () {
  const CITY_COORDS = {
    'Mareil-Marly': [48.881, 2.077],
    'Saint-Germain-en-Laye': [48.898, 2.094],
    Versailles: [48.805, 2.135],
    'Rueil-Malmaison': [48.876, 2.189],
    'Marly-le-Roi': [48.867, 2.094],
    'Le Vésinet': [48.892, 2.133],
    Chatou: [48.89, 2.157],
    'Croissy-sur-Seine': [48.878, 2.143],
    'Le Pecq': [48.896, 2.103],
    'Maisons-Laffitte': [48.947, 2.147],
    Poissy: [48.929, 2.045],
    'La Celle-Saint-Cloud': [48.845, 2.135],
    Louveciennes: [48.86, 2.114],
    Bougival: [48.862, 2.14],
    'Le Chesnay-Rocquencourt': [48.821, 2.131],
    'Vélizy-Villacoublay': [48.783, 2.189],
    'Saint-Cloud': [48.845, 2.22],
    Garches: [48.846, 2.187],
    Nanterre: [48.892, 2.207],
    Suresnes: [48.87, 2.229],
    'Boulogne-Billancourt': [48.835, 2.241],
    Meudon: [48.812, 2.235],
    Sèvres: [48.824, 2.211],
    Chaville: [48.808, 2.189],
    Viroflay: [48.8, 2.173],
    Plaisir: [48.818, 1.947],
    'Montigny-le-Bretonneux': [48.784, 2.033],
    Guyancourt: [48.771, 2.074],
    Orgeval: [48.92, 1.976],
    Chambourcy: [48.907, 2.041],
  };

  const DEFAULT_CENTER = [48.885845, 2.0763435];
  const DEFAULT_ZOOM = 11;
  const CITY_ZOOM = 13;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function track(eventName, params) {
    if (window.ProceptAnalytics?.track) {
      window.ProceptAnalytics.track(eventName, params || {});
    }
  }

  function embedUrl(lat, lng, zoom) {
    const q = encodeURIComponent(`${lat},${lng}`);
    return `https://maps.google.com/maps?q=${q}&z=${zoom}&hl=fr&output=embed`;
  }

  function mapsLink(lat, lng, label) {
    const q = encodeURIComponent(label ? `${label}` : `${lat},${lng}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  function resolveCoords(city, fallback) {
    if (CITY_COORDS[city]) return CITY_COORDS[city];
    return fallback;
  }

  function allowsMaps() {
    return !!window.ProceptConsent?.allowsContent?.();
  }

  function render(container, cities, options = {}) {
    if (!container) return;

    const geo = options.geo || {};
    const center = [
      typeof geo.lat === 'number' ? geo.lat : DEFAULT_CENTER[0],
      typeof geo.lng === 'number' ? geo.lng : DEFAULT_CENTER[1],
    ];
    const hqLabel = options.hqLabel || 'Mareil-Marly';
    const cityList = cities || [];
    const listEl = options.listEl || document.getElementById('zonesList');

    function mountMap() {
      container.innerHTML = `
      <div class="gmap">
        <div class="gmap__frame-wrap">
          <iframe
            class="gmap__iframe"
            id="gmapIframe"
            title="Carte des zones Procept — Île-de-France"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
            src="${embedUrl(center[0], center[1], DEFAULT_ZOOM)}"
          ></iframe>
          <div class="gmap__badge" aria-hidden="true">
            <strong>Siège</strong> ${escapeHtml(hqLabel)} · Ouest parisien
          </div>
        </div>
        <div class="gmap__bar">
          <p class="gmap__hint" id="gmapHint">Sélectionnez une commune pour recentrer la carte</p>
          <a
            class="gmap__external btn btn--outline btn--sm"
            id="gmapExternal"
            href="${mapsLink(center[0], center[1], hqLabel)}"
            target="_blank"
            rel="noopener noreferrer"
          >Ouvrir dans Google Maps</a>
        </div>
      </div>
    `;

      const iframe = container.querySelector('#gmapIframe');
      const hint = container.querySelector('#gmapHint');
      const external = container.querySelector('#gmapExternal');

      function focusCity(city) {
        if (!allowsMaps()) return;
        const coords = resolveCoords(city, center);
        const [lat, lng] = coords;
        if (iframe) iframe.src = embedUrl(lat, lng, CITY_ZOOM);
        if (hint) hint.textContent = city ? `Zone : ${city}` : 'Siège Procept — Mareil-Marly';
        if (external) {
          external.href = mapsLink(lat, lng, city || hqLabel);
        }
        if (listEl) {
          listEl.querySelectorAll('.zones__item').forEach((li) => {
            li.classList.toggle('is-active', li.dataset.city === city);
          });
        }
        track('select_content', { content_type: 'zone_city', item_id: city || 'hq' });
      }

      if (listEl && !listEl.dataset.wired) {
        listEl.dataset.wired = '1';
        listEl.innerHTML = cityList
          .map(
            (city) =>
              `<li class="zones__item" data-city="${escapeHtml(city)}">
              <button type="button" class="zones__city" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>
            </li>`
          )
          .join('');

        listEl.querySelectorAll('.zones__city').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (!allowsMaps()) {
              window.ProceptConsent?.openManager?.();
              return;
            }
            focusCity(btn.dataset.city);
          });
        });
      }

      external?.addEventListener('click', () => {
        track('map_open_external', { method: 'google_maps' });
      });

      if (cityList.includes(hqLabel)) {
        listEl?.querySelector(`[data-city="${hqLabel}"]`)?.classList.add('is-active');
      }
    }

    function mountPlaceholder() {
      container.innerHTML = `
        <div class="gmap gmap--consent">
          <div class="gmap__consent">
            <p><strong>Carte Google Maps</strong></p>
            <p>L’affichage de la carte charge des services Google. Acceptez les cookies « Contenus tiers » pour l’afficher, ou ouvrez Google Maps dans un nouvel onglet.</p>
            <div class="gmap__consent-actions">
              <button type="button" class="btn btn--primary btn--sm" id="gmapConsentBtn">Afficher la carte</button>
              <a class="btn btn--outline btn--sm gmap__consent-ext" href="${mapsLink(center[0], center[1], hqLabel)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps</a>
            </div>
          </div>
        </div>
      `;
      document.getElementById('gmapConsentBtn')?.addEventListener('click', () => {
        const cur = window.ProceptConsent?.get?.() || {};
        window.ProceptConsent?.save?.({
          analytics: !!cur.analytics,
          ads: !!cur.ads,
          content: true,
        });
        mountMap();
      });

      if (listEl && !listEl.dataset.wired) {
        listEl.dataset.wired = '1';
        listEl.innerHTML = cityList
          .map(
            (city) =>
              `<li class="zones__item" data-city="${escapeHtml(city)}">
              <button type="button" class="zones__city" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>
            </li>`
          )
          .join('');
        listEl.querySelectorAll('.zones__city').forEach((btn) => {
          btn.addEventListener('click', () => window.ProceptConsent?.openManager?.());
        });
      }
    }

    if (allowsMaps()) mountMap();
    else mountPlaceholder();

    document.addEventListener('procept:consent', () => {
      if (allowsMaps() && !container.querySelector('#gmapIframe')) mountMap();
    });
  }

  return {
    render,
    CITY_COORDS,
    embedUrl,
    mapsLink,
    allowsMaps,
    bindTopbarAddress,
  };

  function bindTopbarAddress(el, options = {}) {
    if (!el) return;

    const geo = options.geo || {};
    const lat = typeof geo.lat === 'number' ? geo.lat : DEFAULT_CENTER[0];
    const lng = typeof geo.lng === 'number' ? geo.lng : DEFAULT_CENTER[1];
    const label = options.address || options.hqLabel || 'Procept Mareil-Marly';
    const textEl = el.querySelector('.topbar__address-text') || el.querySelector('span');

    if (textEl && options.address) textEl.textContent = options.address;
    el.href = mapsLink(lat, lng, label);
    el.setAttribute('aria-label', `Voir l’agence Procept sur Google Maps — ${label}`);

    if (el.dataset.mapBound) return;
    el.dataset.mapBound = '1';

    let preview = null;
    let hideTimer = null;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function ensurePreview() {
      if (preview) return preview;
      preview = document.createElement('div');
      preview.className = 'topbar__map-preview';
      preview.setAttribute('role', 'dialog');
      preview.setAttribute('aria-label', 'Aperçu de la localisation Procept');
      preview.hidden = true;
      document.body.appendChild(preview);

      preview.addEventListener('mouseenter', () => {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
      });
      preview.addEventListener('mouseleave', scheduleHide);
      return preview;
    }

    function fillPreview() {
      const box = ensurePreview();
      if (allowsMaps()) {
        box.innerHTML = `
          <iframe
            class="topbar__map-iframe"
            title="Localisation Procept — Mareil-Marly"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            src="${embedUrl(lat, lng, 15)}"
          ></iframe>
          <p class="topbar__map-caption">${escapeHtml(label)}</p>
        `;
      } else {
        box.innerHTML = `
          <div class="topbar__map-consent">
            <p>Acceptez les cookies « Contenus tiers » pour voir la carte, ou ouvrez Google Maps.</p>
            <button type="button" class="btn btn--primary btn--sm" data-map-consent>Afficher la carte</button>
          </div>
        `;
        box.querySelector('[data-map-consent]')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const cur = window.ProceptConsent?.get?.() || {};
          window.ProceptConsent?.save?.({
            analytics: !!cur.analytics,
            ads: !!cur.ads,
            content: true,
          });
          fillPreview();
        });
      }
    }

    function positionPreview() {
      const box = ensurePreview();
      const rect = el.getBoundingClientRect();
      const width = 300;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      const top = rect.bottom + 8;
      box.style.width = `${width}px`;
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
    }

    function show() {
      if (!canHover) return;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      fillPreview();
      positionPreview();
      ensurePreview().hidden = false;
    }

    function scheduleHide() {
      hideTimer = setTimeout(() => {
        if (preview) preview.hidden = true;
      }, 180);
    }

    el.addEventListener('mouseenter', show);
    el.addEventListener('focus', show);
    el.addEventListener('mouseleave', scheduleHide);
    el.addEventListener('blur', scheduleHide);
    window.addEventListener(
      'scroll',
      () => {
        if (preview && !preview.hidden) positionPreview();
      },
      { passive: true }
    );
    document.addEventListener('procept:consent', () => {
      if (preview && !preview.hidden) fillPreview();
    });
  }
})();
