/**
 * Couche SEA / analytics Procept — charge gtag uniquement après consentement CMP.
 */
window.ProceptAnalytics = (function () {
  let ready = false;
  let adsId = '';
  let gaId = '';
  let pendingInit = null;

  function readMeta(name) {
    return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || '';
  }

  function ensureDataLayer() {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
  }

  function canLoad() {
    const c = window.ProceptConsent?.get?.();
    if (!c) return false;
    return !!(c.analytics || c.ads);
  }

  function loadGtag(id) {
    if (!id || document.getElementById('procept-gtag')) return;
    if (!canLoad()) return;
    const s = document.createElement('script');
    s.id = 'procept-gtag';
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    ensureDataLayer();
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
  }

  function start() {
    const primary = gaId || adsId;
    if (!primary || !canLoad()) {
      ready = false;
      ensureDataLayer();
      return;
    }
    loadGtag(primary);
    if (adsId && gaId && adsId !== gaId && canLoad()) {
      ensureDataLayer();
      window.gtag('config', adsId);
    }
    ready = true;
  }

  function init(options = {}) {
    adsId = options.adsId || window.PROCEPT_ADS_ID || readMeta('procept-ads-id') || '';
    gaId = options.gaId || window.PROCEPT_GA_ID || readMeta('procept-ga-id') || '';
    pendingInit = options;
    ensureDataLayer();
    start();
    if (window.ProceptConsent?.onChange) {
      window.ProceptConsent.onChange(() => start());
    }
    document.addEventListener('procept:consent', () => start());
  }

  function track(eventName, params) {
    ensureDataLayer();
    const payload = Object.assign({ event: eventName }, params || {});
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function' && ready && canLoad()) {
      window.gtag('event', eventName, params || {});
    }
  }

  return { init, track };
})();
