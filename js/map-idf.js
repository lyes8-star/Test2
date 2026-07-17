/**
 * Carte SVG interactive Île-de-France — pastilles sur les communes Procept.
 */
window.ProceptMapIdf = (function () {
  // Emprise approximative IDF
  const BOUNDS = { latMin: 48.12, latMax: 49.25, lngMin: 1.45, lngMax: 3.55 };
  const VB = { w: 420, h: 380, pad: 18 };

  const CITY_COORDS = {
    'Mareil-Marly': [48.881, 2.077],
    'Saint-Germain-en-Laye': [48.898, 2.094],
    'Versailles': [48.805, 2.135],
    'Rueil-Malmaison': [48.876, 2.189],
    'Marly-le-Roi': [48.867, 2.094],
    'Le Vésinet': [48.892, 2.133],
    'Chatou': [48.89, 2.157],
    'Croissy-sur-Seine': [48.878, 2.143],
    'Le Pecq': [48.896, 2.103],
    'Maisons-Laffitte': [48.947, 2.147],
    'Poissy': [48.929, 2.045],
    'La Celle-Saint-Cloud': [48.845, 2.135],
    'Louveciennes': [48.86, 2.114],
    'Bougival': [48.862, 2.14],
    'Le Chesnay-Rocquencourt': [48.821, 2.131],
    'Vélizy-Villacoublay': [48.783, 2.189],
    'Saint-Cloud': [48.845, 2.22],
    'Garches': [48.846, 2.187],
    'Nanterre': [48.892, 2.207],
    'Suresnes': [48.87, 2.229],
    'Boulogne-Billancourt': [48.835, 2.241],
    'Meudon': [48.812, 2.235],
    'Sèvres': [48.824, 2.211],
    'Chaville': [48.808, 2.189],
    'Viroflay': [48.8, 2.173],
    'Plaisir': [48.818, 1.947],
    'Montigny-le-Bretonneux': [48.784, 2.033],
    'Guyancourt': [48.771, 2.074],
    'Orgeval': [48.92, 1.976],
    'Chambourcy': [48.907, 2.041],
  };

  // Polygones schématiques départements (viewBox coords)
  const DEPTS = [
    { id: '95', name: "Val-d'Oise", d: 'M95,40 L200,28 L255,55 L240,110 L160,125 L100,95 Z', focus: false },
    { id: '78', name: 'Yvelines', d: 'M55,95 L160,125 L175,200 L140,280 L70,265 L40,180 Z', focus: true },
    { id: '92', name: 'Hauts-de-Seine', d: 'M160,125 L215,120 L230,165 L200,195 L170,185 Z', focus: true },
    { id: '75', name: 'Paris', d: 'M215,120 L245,115 L255,145 L235,160 L215,150 Z', focus: false },
    { id: '93', name: 'Seine-Saint-Denis', d: 'M245,70 L310,75 L305,130 L255,145 L245,115 Z', focus: false },
    { id: '94', name: 'Val-de-Marne', d: 'M235,160 L285,155 L295,210 L250,220 L220,195 Z', focus: false },
    { id: '91', name: 'Essonne', d: 'M140,280 L200,195 L250,220 L245,310 L160,330 L120,300 Z', focus: false },
    { id: '77', name: 'Seine-et-Marne', d: 'M255,55 L380,80 L370,250 L295,310 L250,220 L285,155 L305,130 L310,75 Z', focus: false },
  ];

  function project(lat, lng) {
    const x =
      VB.pad +
      ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * (VB.w - VB.pad * 2);
    const y =
      VB.pad +
      ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * (VB.h - VB.pad * 2);
    return [x, y];
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function render(container, cities, options = {}) {
    if (!container) return;
    const contactHref = options.contactHref || '#contact';
    const cityList = cities || [];

    const deptPaths = DEPTS.map(
      (d) =>
        `<path class="idf-map__dept${d.focus ? ' idf-map__dept--focus' : ''}" data-dept="${d.id}" data-name="${escapeHtml(d.name)}" d="${d.d}">
          <title>${escapeHtml(d.name)} (${d.id})</title>
        </path>`
    ).join('');

    const markers = cityList
      .map((city) => {
        const coords = CITY_COORDS[city];
        if (!coords) return '';
        const [x, y] = project(coords[0], coords[1]);
        return `<g class="idf-map__marker" data-city="${escapeHtml(city)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
          <circle class="idf-map__pin" r="5" />
          <circle class="idf-map__pin-ring" r="9" />
          <title>${escapeHtml(city)}</title>
        </g>`;
      })
      .join('');

    container.innerHTML = `
      <div class="idf-map" role="img" aria-label="Carte interactive des zones d'intervention Procept en Île-de-France">
        <svg class="idf-map__svg" viewBox="0 0 ${VB.w} ${VB.h}" xmlns="http://www.w3.org/2000/svg">
          <rect class="idf-map__bg" width="${VB.w}" height="${VB.h}" rx="12" />
          <g class="idf-map__depts">${deptPaths}</g>
          <g class="idf-map__markers">${markers}</g>
          <text class="idf-map__label" x="90" y="200">78</text>
          <text class="idf-map__label" x="185" y="155">92</text>
          <text class="idf-map__label" x="225" y="138">75</text>
          <text class="idf-map__label" x="175" y="300">91</text>
          <text class="idf-map__label" x="320" y="180">77</text>
        </svg>
        <p class="idf-map__hint" id="idfMapHint">Survolez un département ou une commune</p>
      </div>
    `;

    const hint = container.querySelector('#idfMapHint');

    container.querySelectorAll('.idf-map__dept').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        el.classList.add('is-hover');
        if (hint) hint.textContent = el.dataset.name || '';
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('is-hover');
        if (hint) hint.textContent = 'Survolez un département ou une commune';
      });
    });

    container.querySelectorAll('.idf-map__marker').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        el.classList.add('is-hover');
        if (hint) hint.textContent = el.dataset.city || '';
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('is-hover');
        if (hint) hint.textContent = 'Survolez un département ou une commune';
      });
      el.addEventListener('click', () => {
        const target = document.querySelector(contactHref);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.href = contactHref;
        }
      });
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Contacter Procept pour ${el.dataset.city}`);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  return { render, CITY_COORDS };
})();
