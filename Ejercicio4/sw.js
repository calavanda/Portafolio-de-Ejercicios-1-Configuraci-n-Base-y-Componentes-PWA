/* ==========================================================================
   EJERCICIO 4: CACHE API Y ESTRATEGIA DE CACHÉ ESTÁTICA (CACHE-FIRST)
   Service Worker que implementa precaché del App Shell y estrategia Cache-First.
   ========================================================================== */

// 1. Nombre de la memoria caché y versión del App Shell
const CACHE_NAME = 'app-shell-v1';

// 2. Lista de recursos estáticos esenciales que forman el "App Shell"
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './images/app_shell_banner.jpg',
  './images/icon-192.svg',
  './images/icon-512.svg',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

/**
 * Evento INSTALL
 * Se dispara cuando el Service Worker es instalado por el navegador.
 * Aquí creamos la caché mediante la Cache API y almacenamos todos los recursos estáticos del App Shell.
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Evento Install: Precachando el App Shell...');
  
  // Forzar a que el SW en proceso de instalación se active inmediatamente
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[Service Worker] Abriendo la caché "${CACHE_NAME}" y agregando recursos:`, APP_SHELL_ASSETS);
        // Cache API: cache.addAll descarga y guarda todos los recursos en la caché en una sola transacción
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Precaché completado exitosamente.');
      })
      .catch((error) => {
        console.error('[Service Worker] Error durante el precaché del App Shell:', error);
      })
  );
});

/**
 * Evento ACTIVATE
 * Se dispara una vez que el SW se activa.
 * Limpia cachés antiguas y toma el control de los clientes abiertos.
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Evento Activate: Limpiando cachés antiguas y tomando control...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(`[Service Worker] Eliminando caché obsoleta: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Evento FETCH
 * Intercepta todas las peticiones de red realizadas por la aplicación.
 * Implementa la ESTRATEGIA CACHE-FIRST (Caché Primero, Red como Respaldo).
 * 
 * Flujo de Cache-First:
 * 1. Buscar el recurso en la Cache API mediante `caches.match(event.request)`.
 * 2. Si el recurso EXISTE en la caché -> Se sirve inmediatamente desde la memoria caché (⚡ Instantáneo).
 * 3. Si NO existe en la caché -> Se realiza la petición HTTP a la red (`fetch(event.request)`).
 */
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET (como POST/PUT o extensiones de navegador)
  if (event.request.method !== 'GET') return;
  
  // Ignorar peticiones de esquemas no soportados (ej. chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // CACHE HIT: El recurso fue encontrado en el App Shell
          console.log(`[Service Worker] ⚡ CACHE HIT (Cache-First): ${event.request.url}`);
          notifyClients({ type: 'SW_CACHE_HIT', url: event.request.url, timestamp: new Date().toISOString() });
          return cachedResponse;
        }

        // CACHE MISS: El recurso no está en caché, se consulta a la red
        console.log(`[Service Worker] 🌐 CACHE MISS -> Consultando Red: ${event.request.url}`);
        notifyClients({ type: 'SW_NETWORK_MISS', url: event.request.url, timestamp: new Date().toISOString() });

        return fetch(event.request).then((networkResponse) => {
          // Opcional: Para recursos dinámicos, podrías guardarlos en caché.
          // Para este ejercicio se mantiene estricto con el App Shell precachado.
          return networkResponse;
        }).catch((err) => {
          console.error(`[Service Worker] Error al consultar la red para ${event.request.url}:`, err);
          // Opcional: Retornar fallback sin conexión si fuera HTML
          throw err;
        });
      })
  );
});

/**
 * Función auxiliar para enviar mensajes a la interfaz gráfica (app.js)
 * para que el usuario pueda visualizar los eventos en tiempo real en la consola de demostración.
 */
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}
