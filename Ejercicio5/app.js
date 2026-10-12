/* ==========================================================================
   Client Application Logic - Ejercicio 5: Interceptor y Respuestas Offline
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initNetworkListeners();
  initEventListeners();
  refreshCacheInspector();
  logToConsole('success', 'Aplicación inicializada. Service Worker listo para pruebas.');
});

// Service Worker Registration
async function initServiceWorker() {
  const swStatusElement = document.getElementById('swStatus');

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      
      if (registration.installing) {
        swStatusElement.innerHTML = '⚙️ SW Instalando...';
        logToConsole('cache', 'Service Worker instalando y precargando offline.html');
      } else if (registration.waiting) {
        swStatusElement.innerHTML = '⏸️ SW Esperando activación';
      } else if (registration.active) {
        swStatusElement.innerHTML = '⚡ SW Activo y Controlando';
        logToConsole('success', 'Service Worker activo. Evento fetch interceptado.');
      }

      registration.addEventListener('updatefound', () => {
        logToConsole('cache', 'Nueva versión del Service Worker detectada.');
      });

      // Listen to SW messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, message, url, timestamp } = event.data;
        logToConsole(type, `${message} ${url ? '(' + url + ')' : ''}`, timestamp);
        refreshCacheInspector();
      });

    } catch (error) {
      console.error('Error al registrar Service Worker:', error);
      swStatusElement.innerHTML = '❌ Error en SW';
      logToConsole('error', `Falló el registro del SW: ${error.message}`);
    }
  } else {
    swStatusElement.innerHTML = '⚠️ SW No Soportado';
    logToConsole('error', 'El navegador no soporta Service Workers.');
  }
}

// Network Status Monitoring
function initNetworkListeners() {
  updateNetworkBadge();

  window.addEventListener('online', () => {
    updateNetworkBadge();
    showToast('success', '🌐 Conexión a Internet restablecida');
    logToConsole('network', 'Estado de Red: EN LÍNEA (Online)');
  });

  window.addEventListener('offline', () => {
    updateNetworkBadge();
    showToast('error', '⚡ Pérdida de Conexión a Internet (Modo Sin Conexión)');
    logToConsole('fallback', 'Estado de Red: SIN CONEXIÓN (Offline)');
  });
}

function updateNetworkBadge() {
  const badge = document.getElementById('networkBadge');
  const simIndicator = document.getElementById('simNetworkStatus');

  if (navigator.onLine) {
    badge.className = 'status-badge online';
    badge.innerHTML = '<span class="dot"></span> En línea';
    if (simIndicator) simIndicator.textContent = 'Internet Conectado';
  } else {
    badge.className = 'status-badge offline';
    badge.innerHTML = '<span class="dot"></span> Sin Conexión';
    if (simIndicator) simIndicator.textContent = 'Sin Conexión (Offline)';
  }
}

// GUI Event Listeners
function initEventListeners() {
  document.getElementById('btnFetchCached').addEventListener('click', testFetchCached);
  document.getElementById('btnFetchNavFallback').addEventListener('click', testUncachedNavigation);
  document.getElementById('btnFetchImageFallback').addEventListener('click', testUncachedImage);
  document.getElementById('btnFetchApiFallback').addEventListener('click', testUncachedApi);
  document.getElementById('btnClearCache').addEventListener('click', clearAppCache);
  document.getElementById('btnPrecache').addEventListener('click', precacheAssets);
  document.getElementById('btnClearConsole').addEventListener('click', clearConsole);
  document.getElementById('btnReloadFrame').addEventListener('click', reloadSandboxFrame);
}

// Test Runner 1: Fetch Pre-cached Asset
async function testFetchCached() {
  logToConsole('network', 'Iniciando petición a recurso en caché (styles.css)...');
  try {
    const res = await fetch('./styles.css?t=' + Date.now());
    if (res.ok) {
      showToast('success', 'Recurso obtenido con éxito (Caché / Red)');
      logToConsole('success', `Respuesta recibida: Status ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    logToConsole('error', `Error al pedir recurso: ${err.message}`);
  }
}

// Test Runner 2: Request Uncached HTML Page (Triggers Offline Fallback Page)
function testUncachedNavigation() {
  const frame = document.getElementById('sandboxFrame');
  const targetUrl = './pagina-no-existente-' + Math.floor(Math.random() * 1000) + '.html';
  
  logToConsole('network', `Navegando a ruta no guardada en caché: ${targetUrl}`);
  frame.src = targetUrl;

  showToast('warning', 'Cargando iframe. Si estás Offline, verás la vista "Modo Sin Conexión"');
}

// Test Runner 3: Request Uncached Image (Triggers Offline SVG Fallback)
async function testUncachedImage() {
  const randomId = Math.floor(Math.random() * 10000);
  const imageUrl = `./non-cached-image-${randomId}.png`;
  
  logToConsole('network', `Solicitando imagen no en caché: ${imageUrl}`);
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    // Display in frame or toast
    showToast('info', 'Petición de imagen interceptada por SW');
    logToConsole('success', `Tipo de imagen retornado: ${res.headers.get('content-type') || blob.type}`);
    
    // Create preview modal or iframe view
    const frame = document.getElementById('sandboxFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(`
      <body style="background:#0f172a; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:90vh; font-family:sans-serif;">
        <h3 style="margin-bottom:1rem; color:#a5b4fc;">Resultado de Petición de Imagen:</h3>
        <img src="${objectUrl}" style="max-width:80%; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.5); border:1px solid #334155;"/>
        <p style="margin-top:1rem; color:#94a3b8; font-size:0.85rem;">Si estás offline y no estaba en caché, el SW entregó la imagen de reemplazo (SVG Fallback).</p>
      </body>
    `);
    doc.close();

  } catch (err) {
    logToConsole('error', `Error al solicitar imagen: ${err.message}`);
  }
}

// Test Runner 4: Request Uncached API Endpoint (Triggers Offline JSON Fallback)
async function testUncachedApi() {
  const apiUrl = `./api/datos-en-vivo?query=${Date.now()}`;
  logToConsole('network', `Solicitando API dinámica: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    logToConsole('fallback', `Respuesta API recibida: ${JSON.stringify(data)}`);

    const frame = document.getElementById('sandboxFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(`
      <body style="background:#0f172a; color:#fff; padding:2rem; font-family:monospace;">
        <h3 style="color:#67e8f9; margin-bottom:1rem;">API JSON Interceptada por Service Worker:</h3>
        <pre style="background:#020617; padding:1.5rem; border-radius:12px; border:1px solid #1e293b; color:#a7f3d0; overflow:auto;">${JSON.stringify(data, null, 2)}</pre>
        <p style="margin-top:1rem; color:#94a3b8; font-size:0.85rem;">Estado HTTP: ${res.status} ${res.statusText}</p>
      </body>
    `);
    doc.close();

    showToast('info', 'Respuesta API procesada.');
  } catch (err) {
    logToConsole('error', `Error en petición API: ${err.message}`);
  }
}

// Cache Inspector Logic
async function refreshCacheInspector() {
  const tableBody = document.getElementById('cacheTableBody');
  if (!tableBody) return;

  if (!('caches' in window)) {
    tableBody.innerHTML = '<tr><td colspan="3">Caché API no disponible.</td></tr>';
    return;
  }

  try {
    const cacheNames = await caches.keys();
    let rowsHtml = '';
    let totalItems = 0;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      totalItems += requests.length;

      requests.forEach((req) => {
        const url = new URL(req.url);
        rowsHtml += `
          <tr>
            <td><span style="color:#6366f1; font-weight:600;">${name}</span></td>
            <td>${url.pathname}</td>
            <td><span class="log-type success">ALMACENADO</span></td>
          </tr>
        `;
      });
    }

    if (totalItems === 0) {
      tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#6b7280;">La memoria caché está vacía.</td></tr>';
    } else {
      tableBody.innerHTML = rowsHtml;
    }

    document.getElementById('cacheItemCount').textContent = `${totalItems} recursos`;

  } catch (err) {
    console.error('Error al inspeccionar caché:', err);
  }
}

// Precache Shell Assets
async function precacheAssets() {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('ejercicio5-offline-v1');
    await cache.addAll(['./', './index.html', './offline.html', './styles.css', './app.js']);
    showToast('success', 'Recursos estáticos precargados en caché con éxito');
    logToConsole('cache', 'Precarga manual ejecutada para shell de app y offline.html');
    refreshCacheInspector();
  } catch (err) {
    showToast('error', 'Error durante precarga');
    logToConsole('error', `Falló precarga: ${err.message}`);
  }
}

// Clear Cache
async function clearAppCache() {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    showToast('warning', 'Memoria Caché purgada por completo');
    logToConsole('cache', 'Se han eliminado todas las entradas de la Cache API.');
    refreshCacheInspector();
  } catch (err) {
    logToConsole('error', `Error al vaciar caché: ${err.message}`);
  }
}

// Logging Terminal Helper
function logToConsole(type, message, timestamp = null) {
  const terminal = document.getElementById('terminalBox');
  if (!terminal) return;

  const timeStr = timestamp || new Date().toLocaleTimeString();
  const logItem = document.createElement('div');
  logItem.className = 'log-entry';
  logItem.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-type ${type}">${type}</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;

  terminal.appendChild(logItem);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearConsole() {
  const terminal = document.getElementById('terminalBox');
  if (terminal) terminal.innerHTML = '';
}

function reloadSandboxFrame() {
  const frame = document.getElementById('sandboxFrame');
  if (frame) frame.contentWindow.location.reload();
}

// Toast Notifications
function showToast(type, text) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
    <span>${escapeHtml(text)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
