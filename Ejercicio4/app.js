/* ==========================================================================
   APP.JS - LÓGICA DE CLIENTE & CONTROL DE CACHE API Y SERVICE WORKER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const swDot = document.getElementById('swDot');
  const swStatusText = document.getElementById('swStatusText');
  const netDot = document.getElementById('netDot');
  const netStatusText = document.getElementById('netStatusText');
  const cacheCountText = document.getElementById('cacheCountText');
  
  const btnRegisterSW = document.getElementById('btnRegisterSW');
  const btnUnregisterSW = document.getElementById('btnUnregisterSW');
  const btnClearCache = document.getElementById('btnClearCache');
  const btnRefreshCacheTable = document.getElementById('btnRefreshCacheTable');
  const btnClearConsole = document.getElementById('btnClearConsole');
  
  const cacheTableBody = document.getElementById('cacheTableBody');
  const consoleOutput = document.getElementById('consoleOutput');
  const testResultContainer = document.getElementById('testResultContainer');
  const testFetchBtns = document.querySelectorAll('.test-fetch-btn');

  const CACHE_NAME = 'app-shell-v1';

  // 1. MONITOR DE ESTADO DE RED (ONLINE / OFFLINE)
  function updateNetworkStatus() {
    if (navigator.onLine) {
      netDot.className = 'dot active';
      netStatusText.textContent = 'Online (Conectado)';
      logConsole('system', '🌐 Conexión a la red restablecida (Online)');
    } else {
      netDot.className = 'dot warning';
      netStatusText.textContent = 'Offline (Sin Conexión)';
      logConsole('system', '⚠️ Aplicación en modo Sin Conexión (Offline)');
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // 2. VERIFICACIÓN Y REGISTRO DE SERVICE WORKER
  async function checkSWStatus() {
    if (!('serviceWorker' in navigator)) {
      swDot.className = 'dot inactive';
      swStatusText.textContent = 'No Soportado';
      logConsole('error', '❌ Los Service Workers no son soportados por este navegador.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        swDot.className = 'dot active';
        swStatusText.textContent = `Activo (Scope: ${registration.scope})`;
      } else if (registration && registration.installing) {
        swDot.className = 'dot warning';
        swStatusText.textContent = 'Instalando App Shell...';
      } else {
        swDot.className = 'dot inactive';
        swStatusText.textContent = 'No Registrado';
      }
    } catch (err) {
      console.error('Error al verificar SW:', err);
    }
    updateCacheStats();
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      logConsole('info', '⌛ Registrando Service Worker (`sw.js`)...');
      const reg = await navigator.serviceWorker.register('sw.js');
      logConsole('info', `✅ Service Worker registrado con éxito en scope: ${reg.scope}`);
      
      reg.addEventListener('updatefound', () => {
        logConsole('info', '📦 Nuevo Service Worker detectado (Evento Install iniciando)...');
      });

      await checkSWStatus();
      setTimeout(updateCacheStats, 1000);
    } catch (error) {
      logConsole('error', `❌ Error al registrar Service Worker: ${error.message}`);
    }
  }

  async function unregisterServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.unregister();
        logConsole('info', '🗑️ Service Worker desinstalado.');
        await checkSWStatus();
      } else {
        logConsole('info', 'ℹ️ No hay Service Worker registrado para desinstalar.');
      }
    } catch (err) {
      logConsole('error', `❌ Error al desinstalar SW: ${err.message}`);
    }
  }

  // 3. LISTEN MESSAGES FROM SERVICE WORKER
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (data.type === 'SW_CACHE_HIT') {
        logConsole('hit', `⚡ [SW Cache-First HIT] Recurso servido de caché: ${data.url}`);
      } else if (data.type === 'SW_NETWORK_MISS') {
        logConsole('miss', `🌐 [SW Cache-First MISS] Recurso solicitado a red: ${data.url}`);
      }
    });
  }

  // 4. CACHE API MANAGEMENT
  async function updateCacheStats() {
    if (!('caches' in window)) {
      cacheCountText.textContent = 'Cache API no soportada';
      return;
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      cacheCountText.textContent = `${requests.length} archivo(s) estático(s)`;
      renderCacheTable(cache, requests);
    } catch (err) {
      console.error('Error leyendo caché:', err);
      cacheTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-rose);">Error leyendo Cache API: ${err.message}</td></tr>`;
    }
  }

  async function renderCacheTable(cache, requests) {
    if (requests.length === 0) {
      cacheTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
            ⚠️ La caché <code>${CACHE_NAME}</code> está vacía. Registra el Service Worker para ejecutar el precaché del App Shell.
          </td>
        </tr>
      `;
      return;
    }

    cacheTableBody.innerHTML = '';

    for (const req of requests) {
      const res = await cache.match(req);
      const contentType = res ? (res.headers.get('content-type') || 'desconocido') : 'N/A';
      const status = res ? res.status : 'N/A';
      const urlPath = new URL(req.url).pathname;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${urlPath}</strong></td>
        <td><span class="tag-badge tag-hit">${status} OK</span></td>
        <td><code>${contentType}</code></td>
        <td>
          <button class="btn btn-danger btn-sm btn-delete-item" data-url="${req.url}">
            Eliminar
          </button>
        </td>
      `;
      cacheTableBody.appendChild(tr);
    }

    // Bind delete buttons
    document.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetUrl = e.currentTarget.getAttribute('data-url');
        const deleted = await cache.delete(targetUrl);
        if (deleted) {
          logConsole('info', `🗑️ Recurso eliminado de la Cache API: ${targetUrl}`);
          updateCacheStats();
        }
      });
    });
  }

  async function clearAllCaches() {
    if (!('caches' in window)) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      logConsole('info', '🧹 Toda la memoria Cache API ha sido borrada.');
      updateCacheStats();
    } catch (err) {
      logConsole('error', `❌ Error vaciando la caché: ${err.message}`);
    }
  }

  // 5. CACHE-FIRST TESTER LOGIC
  async function testCacheFirstFetch(url, isDynamic = false) {
    const startTime = performance.now();
    logConsole('info', `🔍 Probando petición Cache-First para: ${url}`);
    
    try {
      // 1. Verificamos si ya está guardado en la Cache API antes de la petición
      const cache = await caches.open(CACHE_NAME);
      const preCheckMatch = await cache.match(url);
      
      // 2. Ejecutamos fetch (el SW interceptará el evento fetch)
      const response = await fetch(url);
      const duration = (performance.now() - startTime).toFixed(1);

      // Determinar si provino de caché (si existía preCheckMatch o de acuerdo a latencia e inspec)
      const isFromCache = !!preCheckMatch;

      renderTestResult({
        url: url,
        status: response.status,
        fromCache: isFromCache,
        duration: duration,
        contentType: response.headers.get('content-type') || 'desconocido',
        isDynamic: isDynamic
      });

    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(1);
      logConsole('error', `❌ Error al realizar la petición a ${url}: ${error.message}`);
      renderTestResult({
        url: url,
        error: error.message,
        duration: duration,
        fromCache: false
      });
    }
  }

  function renderTestResult(result) {
    if (result.error) {
      testResultContainer.innerHTML = `
        <div class="result-card">
          <div class="result-header">
            <strong>${result.url}</strong>
            <span class="tag-badge tag-miss">ERROR RED</span>
          </div>
          <p style="color: var(--accent-rose); font-size: 0.85rem;">${result.error}</p>
          <div style="font-size: 0.78rem; color: var(--text-dim);">Tiempo transcurrido: ${result.duration} ms</div>
        </div>
      `;
      return;
    }

    const badgeClass = result.fromCache ? 'tag-hit' : 'tag-miss';
    const badgeText = result.fromCache ? '⚡ CACHE HIT (Cache-First)' : '🌐 NETWORK FETCH (Miss)';
    const icon = result.fromCache ? '⚡' : '🌐';
    const sourceDesc = result.fromCache 
      ? 'Recurso entregado instantáneamente desde la Cache API (Sin consumo de red).' 
      : 'Recurso no encontrado en el App Shell precachado; recuperado mediante petición HTTP.';

    testResultContainer.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <strong style="word-break: break-all; font-family: var(--font-code); font-size: 0.88rem;">${result.url}</strong>
          <span class="tag-badge ${badgeClass}">${badgeText}</span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.3rem;">
          ${icon} ${sourceDesc}
        </p>
        <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--text-dim); margin-top: 0.4rem; font-family: var(--font-code);">
          <span>⏱️ Latencia: <strong>${result.duration} ms</strong></span>
          <span>HTTP Status: <strong>${result.status}</strong></span>
          <span>Tipo: <strong>${result.contentType.split(';')[0]}</strong></span>
        </div>
      </div>
    `;
  }

  // 6. EVENT LOGGER HELPER
  function logConsole(type, message) {
    const timeStr = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = 'log-entry';

    let colorClass = 'log-info';
    if (type === 'hit') colorClass = 'log-hit';
    if (type === 'miss') colorClass = 'log-miss';
    if (type === 'error') colorClass = 'log-error';

    div.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="${colorClass}">${escapeHtml(message)}</span>
    `;

    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // EVENT LISTENERS
  btnRegisterSW.addEventListener('click', registerServiceWorker);
  btnUnregisterSW.addEventListener('click', unregisterServiceWorker);
  btnClearCache.addEventListener('click', clearAllCaches);
  btnRefreshCacheTable.addEventListener('click', updateCacheStats);
  btnClearConsole.addEventListener('click', () => { consoleOutput.innerHTML = ''; });

  testFetchBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.currentTarget.getAttribute('data-url');
      const isDynamic = e.currentTarget.getAttribute('data-dynamic') === 'true';
      testCacheFirstFetch(url, isDynamic);
    });
  });

  // AUTO REGISTRATION ON FIRST LOAD TO DEMO CACHE-FIRST STRATEGY
  checkSWStatus();
  registerServiceWorker();
});
