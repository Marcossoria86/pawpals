// Service worker mínimo para que PawPals se pueda "instalar" como app
// (PWA): cachea el cascarón de la app (HTML/CSS/JS estáticos) para que
// abra al toque incluso con mala señal, y siempre pide los datos reales
// (feed, posts, fotos) a la red — nunca los sirve viejos desde el caché,
// para no mostrar información desactualizada.
const CACHE_NAME = 'pawpals-shell-v1';
const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Los pedidos a la API (feed, login, subir fotos, etc.) siempre van a la
  // red directo: nunca queremos cachear datos que cambian todo el tiempo.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  // Para todo lo demás (el cascarón de la app): probamos la red primero
  // para tener siempre la última versión, y si no hay conexión, usamos lo
  // que quedó guardado en caché.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
