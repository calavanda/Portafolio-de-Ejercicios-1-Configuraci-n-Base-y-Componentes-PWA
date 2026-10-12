/**
 * SERVICE WORKER - PWA OFFLINE STUDIO
 * =========================================================================
 * Implementación completa de ciclo de vida, estrategias de almacenamiento en
 * caché (Estáticas y Dinámicas) y gestión de modo sin conexión.
 * =========================================================================
 */

const CACHE_VERSION = 'v1.0.2';
const STATIC_CACHE = `pwa-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `pwa-dynamic-${CACHE_VERSION}`;
const API_CACHE = `pwa-api-${CACHE_VERSION}`;

// Lista blanca de cachés autorizadas (para limpieza en activación)
const CACHE_ALLOWLIST = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];

// Recursos estáticos que componen el App Shell
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/app.js',
  './js/db.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// =========================================================================
// 1. INSTALACIÓN (INSTALL)
// =========================================================================
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker] 📦 Instalando versión: ${CACHE_VERSION}`);

  // Forzar que el SW entrante active la fase de activación inmediatamente sin esperar
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] ⚡ Pre-cacheando el App Shell...');
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Advertencia al pre-cachear algunos recursos estáticos:', err);
      });
    })
  );
});

// =========================================================================
// 2. ACTIVACIÓN Y LIMPIEZA LIMPIA (ACTIVATE)
// =========================================================================
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker] 🚀 Activando versión: ${CACHE_VERSION}`);

  event.waitUntil(
    // Limpieza de versiones obsoletas de caché
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!CACHE_ALLOWLIST.includes(cacheName)) {
            console.log(`[ServiceWorker] 🧹 Eliminando caché obsoleta: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control inmediato de todas las pestañas/clientes abiertos
      console.log('[ServiceWorker] 🛡️ Reclamando clientes activos con clients.claim()');
      return self.clients.claim();
    })
  );
});

// =========================================================================
// 3. ESTRATEGIAS DE CACHÉ EN PETICIONES (FETCH)
// =========================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Omitir esquemas no soportados (ej. extensiones chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // A. Peticiones de Navegación (HTML Pages) -> Cache First con Fallback a index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).catch(() => {
          return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // B. APIs Dinámicas (JSON / Datos remotos / /api/ o dominios de API externa)
  // Estrategia: Network-First (con fallback a Cache)
  if (url.pathname.includes('/api/') || url.hostname.includes('jsonplaceholder.typicode.com') || url.hostname.includes('dummyjson.com')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // C. Recursos Estáticos (Scripts, Estilos, Fuentes, Imágenes)
  // Estrategia: Cache-First (con fallback a Network y almacenamiento dinámico)
  event.respondWith(cacheFirstStrategy(request, STATIC_CACHE, DYNAMIC_CACHE));
});

/**
 * Estrategia Cache-First:
 * Busca primero en caché. Si existe, responde de inmediato.
 * Si no está, va a la red, guarda una copia en caché dinámica y devuelve la respuesta.
 */
async function cacheFirstStrategy(request, staticCacheName, dynamicCacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const targetCache = await caches.open(dynamicCacheName);
      targetCache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    // Si falla la red y es una imagen, se podría retornar un placeholder local
    console.warn(`[ServiceWorker] ⚠️ Fallo en red para: ${request.url}`, error);
    throw error;
  }
}

/**
 * Estrategia Network-First:
 * Intenta obtener la versión más fresca de la red. Si tiene éxito, actualiza la caché.
 * Si no hay conexión o la red falla, recurre a la versión almacenada en caché.
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(cacheName);
      cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    console.log(`[ServiceWorker] 🌐 Red no disponible. Recuperando de caché API: ${request.url}`);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback JSON si ni la red ni la caché tienen respuesta
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'No hay conexión a internet y el recurso no está disponible en caché.',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// =========================================================================
// 4. MENSAJERÍA ENTRE CLIENTES Y SERVICE WORKER
// =========================================================================
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.action === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Mensaje recibido: SKIP_WAITING');
    self.skipWaiting();
  }

  if (event.data.action === 'CLEAR_CACHE') {
    console.log('[ServiceWorker] Limpiando todas las cachés solicitadas...');
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).then(() => {
        if (event.source) {
          event.source.postMessage({ action: 'CACHE_CLEARED' });
        }
      })
    );
  }

  if (event.data.action === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({
        action: 'VERSION_INFO',
        version: CACHE_VERSION,
        caches: CACHE_ALLOWLIST
      });
    }
  }
});
