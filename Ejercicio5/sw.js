/* ==========================================================================
   Service Worker - Ejercicio 5: Interceptor de Peticiones y Respuestas Offline
   ========================================================================== */

const CACHE_NAME = 'ejercicio5-offline-v1';

// Static resources to pre-cache during installation
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 1. SW Installation: Pre-cache mandatory resources and offline template
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precargando archivos estáticos y plantilla de Offline...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      console.log('[SW] Precarga completada exitosamente.');
      return self.skipWaiting();
    })
  );
});

// 2. SW Activation: Clean up older cache versions
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Controlando clientes inmediatamente.');
      return self.clients.claim();
    })
  );
});

// Helper function to broadcast SW logs to UI windows
function notifyClients(type, message, url = '') {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        source: 'SW',
        type: type, // 'network', 'cache', 'fallback', 'error'
        message: message,
        url: url,
        timestamp: new Date().toLocaleTimeString()
      });
    });
  });
}

// 3. SW Fetch Interceptor: Intercept requests, try network/cache, return fallback when offline & uncached
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Handle request with network-first or cache-first with custom offline fallback
  event.respondWith(
    (async () => {
      // Step A: Check if the resource already exists in Cache
      const cachedResponse = await caches.match(request);

      try {
        // Step B: Attempt Network fetch
        notifyClients('network', `Solicitando a la red: ${url.pathname}`, request.url);
        const networkResponse = await fetch(request);

        // If network fetch succeeds and is valid, clone & store in cache for future offline use
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          notifyClients('cache', `Actualizada la memoria caché para: ${url.pathname}`, request.url);
        }

        return networkResponse;

      } catch (error) {
        // Step C: Network request failed (Offline / Disconnected)
        console.warn('[SW] Petición fallida por falta de red:', request.url);
        notifyClients('error', `Red no disponible para: ${url.pathname}`, request.url);

        // Scenario C1: The resource WAS pre-cached or saved in cache previously
        if (cachedResponse) {
          notifyClients('cache', `Sirviendo desde Caché: ${url.pathname}`, request.url);
          return cachedResponse;
        }

        // Scenario C2: The resource was NOT in cache and network failed -> Trigger Fallback!
        notifyClients('fallback', `Activando Fallback (Sin conexión): ${url.pathname}`, request.url);

        // Sub-case C2.1: Navigation / HTML requests -> Return offline.html template
        if (request.mode === 'navigate' || 
            (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) ||
            url.pathname.endsWith('.html') ||
            url.pathname.endsWith('/')) {
          
          const offlinePage = await caches.match('./offline.html') || await caches.match('offline.html');
          if (offlinePage) {
            return offlinePage;
          }

          // Fallback dynamically synthesized HTML if offline.html somehow is missing
          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><title>Sin Conexión</title></head>
            <body style="font-family:sans-serif; background:#0b0f19; color:#fff; text-align:center; padding:3rem;">
              <h1>⚠️ Modo Sin Conexión</h1>
              <p>No tienes acceso a la red y el recurso no fue encontrado en la caché local.</p>
            </body>
            </html>`,
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
            }
          );
        }

        // Sub-case C2.2: Image requests fallback SVG
        if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i)) {
          const svgOfflineImage = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
              <rect width="100%" height="100%" fill="#1e293b"/>
              <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#f43f5e" font-family="sans-serif" font-size="16" font-weight="bold">Imagen No Disponible</text>
              <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">Dispositivo Offline</text>
            </svg>
          `;
          return new Response(svgOfflineImage, {
            headers: { 'Content-Type': 'image/svg+xml' }
          });
        }

        // Sub-case C2.3: API / JSON requests fallback JSON
        return new Response(
          JSON.stringify({
            status: 'offline',
            message: 'Respuesta alternativa del Service Worker: Red no disponible.',
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    })()
  );
});
