/**
 * Bannière d'installation PWA (beforeinstallprompt).
 * No-op sur navigateurs sans support (ex. iOS Safari).
 */
(function () {
  const KEY = 'procept-pwa-dismiss';
  let deferred = null;

  function track(name, params) {
    if (window.ProceptAnalytics?.track) window.ProceptAnalytics.track(name, params || {});
  }

  function dismiss() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch (_) { /* ignore */ }
    document.getElementById('pwaInstall')?.remove();
  }

  function showBanner() {
    if (document.getElementById('pwaInstall')) return;
    try {
      if (sessionStorage.getItem(KEY) === '1') return;
    } catch (_) { /* ignore */ }

    const el = document.createElement('div');
    el.id = 'pwaInstall';
    el.className = 'pwa-install';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Installer l’application Procept');
    el.innerHTML = `
      <div class="pwa-install__inner">
        <p class="pwa-install__text"><strong>Procept</strong> — Installez l’app pour un accès rapide</p>
        <div class="pwa-install__actions">
          <button type="button" class="btn btn--primary btn--sm" id="pwaInstallBtn">Installer l’app</button>
          <button type="button" class="pwa-install__close" id="pwaInstallClose" aria-label="Fermer">×</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('pwaInstallClose')?.addEventListener('click', dismiss);
    document.getElementById('pwaInstallBtn')?.addEventListener('click', async () => {
      if (!deferred) return;
      track('pwa_install_click');
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      if (choice?.outcome === 'accepted') track('pwa_install_accepted');
      dismiss();
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    showBanner();
  });

  window.addEventListener('appinstalled', () => {
    track('pwa_installed');
    dismiss();
  });
})();
