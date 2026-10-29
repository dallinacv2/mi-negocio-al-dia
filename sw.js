/* Guarda la app en el equipo para que abra sin internet. Los datos del negocio no pasan por aquí: viven en el navegador. */
const CACHE = 'mnad-app-v4';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

/* Cuando el usuario toca "Actualizar" en el banner, activa la versión nueva al toque */
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('install', e => {
  /* SIN skipWaiting: la nueva versión espera en páramo hasta que el usuario toque "Actualizar" en el banner */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* La app: primero internet (para recibir mejoras) y, si no hay, la copia guardada */
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  /* Tipografías de Google: se guardan al verlas una vez; sin internet la app usa las del sistema */
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; }).catch(() => new Response('', {status: 504}))));
  }
});
