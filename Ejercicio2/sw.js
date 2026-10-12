const CACHE_NAME = 'app-shell-cache-v1';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// Instalación del Service Worker: Pre-cacheo del App Shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando App Shell...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cacheando archivos estructurales del App Shell');
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activación del Service Worker: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activado. Reclamando clientes...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones (Estrategia Cache First con Network Fallback para el App Shell)
self.addEventListener('fetch', (event) => {
  // Evitar interceptar extensiones de navegador u orígenes externos
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna recurso del App Shell desde caché
        return cachedResponse;
      }
      // Si no está en caché, buscar en red
      return fetch(event.request).then((networkResponse) => {
        // Almacenar en caché dinámicamente si es válido
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback a index.html para navegación si está offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
