/**
 * Couche SEA / analytics Procept — no-op sans ID Google Ads / GA4.
 * Config : window.PROCEPT_ADS_ID = 'AW-XXXX' ou meta[name="procept-ads-id"]
 *          window.PROCEPT_GA_ID = 'G-XXXX' ou meta[name="procept-ga-id"]
 *          content.site.adsId / content.site.gaId
 */
window.ProceptAnalytics = (function () {
  let ready = false;
  let adsId = '';
  let gaId = '';

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

  function loadGtag(id) {
    if (!id || document.getElementById('procept-gtag')) return;
    const s = document.createElement('script');
    s.id = 'procept-gtag';
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    ensureDataLayer();
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  function init(options = {}) {
    adsId = options.adsId || window.PROCEPT_ADS_ID || readMeta('procept-ads-id') || '';
    gaId = options.gaId || window.PROCEPT_GA_ID || readMeta('procept-ga-id') || '';
    const primary = gaId || adsId;
    if (primary) {
      loadGtag(primary);
      if (adsId && gaId && adsId !== gaId) {
        ensureDataLayer();
        window.gtag('config', adsId);
      }
      ready = true;
    } else {
      ensureDataLayer();
      ready = false;
    }
  }

  function track(eventName, params) {
    ensureDataLayer();
    const payload = Object.assign({ event: eventName }, params || {});
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function' && (ready || gaId || adsId)) {
      window.gtag('event', eventName, params || {});
    }
  }

  return { init, track };
})();
