(function () {
  const REPO = 'dallinacv2/mi-negocio-al-dia';
  const RELEASE_API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  const RELEASE_URL = 'https://github.com/' + REPO + '/releases/latest';
  const STORAGE_KEY = 'mnad-release-tag';

  function showBanner(tag, url) {
    let banner = document.querySelector('.nueva-ver');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'nueva-ver';
      banner.innerHTML = `
        <span>Hay una actualización disponible. Toca actualizar para instalar la versión nueva.</span>
        <button class="btn sm pri" data-cc="actualizar">Actualizar</button>
      `;

      banner.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-cc="actualizar"]');
        if (!btn) return;

        localStorage.setItem(STORAGE_KEY, tag);

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg && reg.waiting) {
              reg.waiting.postMessage('skip');
            } else {
              window.open(url || RELEASE_URL, '_blank', 'noopener,noreferrer');
            }
          });
        } else {
          window.open(url || RELEASE_URL, '_blank', 'noopener,noreferrer');
        }
      });

      document.body.appendChild(banner);
    }
  }

  async function checkForUpdate() {
    try {
      const res = await fetch(RELEASE_API, {
        headers: { Accept: 'application/vnd.github+json' }
      });

      if (!res.ok) return;

      const latest = await res.json();
      const tag = latest && latest.tag_name ? String(latest.tag_name).trim() : '';
      const url = latest && latest.html_url ? latest.html_url : RELEASE_URL;

      if (!tag) return;

      const installed = localStorage.getItem(STORAGE_KEY);
      if (installed === tag) return;

      showBanner(tag, url);
    } catch (e) {
      // no rompe la app
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkForUpdate, 1000);
  });
})();
