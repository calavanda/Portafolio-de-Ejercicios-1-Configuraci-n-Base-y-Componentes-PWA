/**
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN (PWA OFFLINE STUDIO)
 * =========================================================================
 * - Registro y ciclo de vida de Service Worker.
 * - Detección y manejo de eventos online/offline.
 * - Persistencia e interacción con IndexedDB.
 * - Demostración interactiva de estrategias de caché y sincronización.
 * =========================================================================
 */

import * as db from './db.js';

// Estado de la aplicación
const state = {
  swRegistration: null,
  isOnline: navigator.onLine,
  simulatedOffline: false,
  activeFilter: 'all',
  activeTab: 'items' // 'items' | 'cache' | 'terminal'
};

// Referencias del DOM
const elements = {
  connectionBadge: document.getElementById('connection-badge'),
  swBadge: document.getElementById('sw-badge'),
  networkBanner: document.getElementById('network-banner'),
  networkBannerText: document.getElementById('network-banner-text'),
  btnToggleSimulateOffline: document.getElementById('btn-toggle-offline'),
  btnManualSync: document.getElementById('btn-manual-sync'),
  itemsContainer: document.getElementById('items-container'),
  emptyState: document.getElementById('empty-state'),
  formNewItem: document.getElementById('form-new-item'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  statTotal: document.getElementById('stat-total'),
  statSynced: document.getElementById('stat-synced'),
  statPending: document.getElementById('stat-pending'),
  statStorage: document.getElementById('stat-storage'),
  btnSeedData: document.getElementById('btn-seed-data'),
  btnClearData: document.getElementById('btn-clear-data'),
  cacheInspectorList: document.getElementById('cache-inspector-list'),
  btnRefreshCaches: document.getElementById('btn-refresh-caches'),
  btnClearCaches: document.getElementById('btn-clear-caches'),
  btnTestStaticCache: document.getElementById('btn-test-static'),
  btnTestDynamicApi: document.getElementById('btn-test-dynamic'),
  apiTestResult: document.getElementById('api-test-result'),
  terminalLog: document.getElementById('terminal-log'),
  btnClearLog: document.getElementById('btn-clear-log'),
  tabButtons: document.querySelectorAll('.tab-nav-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  swUpdateBanner: document.getElementById('sw-update-banner'),
  btnSwUpdateNow: document.getElementById('btn-sw-update-now')
};

// =========================================================================
// 1. REGISTRO Y GESTIÓN LIMPIA DEL SERVICE WORKER
// =========================================================================
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logToTerminal('WARN', 'Service Workers no están soportados en este navegador.');
    updateSwBadge('No Soportado', 'badge-danger');
    return;
  }

  try {
    logToTerminal('SW', 'Iniciando registro de Service Worker (sw.js)...');

    const registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './'
    });
    state.swRegistration = registration;

    logToTerminal('SW', `Service Worker registrado con scope: ${registration.scope}`);

    // Si ya está activo
    if (registration.active) {
      updateSwBadge('Activo', 'badge-success');
    }

    // Escuchar si hay una nueva versión instalándose
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      logToTerminal('SW', 'Nueva versión de Service Worker detectada (instalando...)');
      updateSwBadge('Instalando...', 'badge-warning');

      newWorker.addEventListener('statechange', () => {
        logToTerminal('SW', `Estado del nuevo Worker: ${newWorker.state}`);
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Nueva versión lista para tomar control
          showSwUpdateBanner();
        } else if (newWorker.state === 'activated') {
          updateSwBadge('Activo', 'badge-success');
        }
      });
    });

    // Detectar cuando el controlador cambia (nueva versión tomó control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logToTerminal('SW', '¡El controlador de la aplicación cambió! Nueva versión activa.');
      updateSwBadge('Actualizado', 'badge-success');
      refreshCachesList();
    });

    // Escuchar mensajes provenientes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { action } = event.data;
      if (action === 'CACHE_CLEARED') {
        logToTerminal('SW', 'El Service Worker confirmó la limpieza de caché.');
        refreshCachesList();
      }
    });

  } catch (error) {
    console.error('Error registrando el Service Worker:', error);
    logToTerminal('ERROR', `Fallo al registrar Service Worker: ${error.message}`);
    updateSwBadge('Error', 'badge-danger');
  }
}

function updateSwBadge(text, className) {
  if (elements.swBadge) {
    elements.swBadge.textContent = `SW: ${text}`;
    elements.swBadge.className = `status-pill ${className}`;
  }
}

function showSwUpdateBanner() {
  if (elements.swUpdateBanner) {
    elements.swUpdateBanner.classList.remove('hidden');
  }
}

// =========================================================================
// 2. GESTIÓN DE ESTADO ONLINE / OFFLINE Y SINCRONIZACIÓN
// =========================================================================
function initNetworkListeners() {
  window.addEventListener('online', () => handleNetworkChange(true));
  window.addEventListener('offline', () => handleNetworkChange(false));
  updateNetworkUI();
}

function handleNetworkChange(isOnline) {
  state.isOnline = isOnline;
  logToTerminal('NETWORK', `Cambio de conexión detectado: ${isOnline ? 'EN LÍNEA 🟢' : 'DESCONECTADO 🔴'}`);
  updateNetworkUI();

  if (isOnline && !state.simulatedOffline) {
    autoSyncPendingItems();
  }
}

function updateNetworkUI() {
  const effectivelyOnline = state.isOnline && !state.simulatedOffline;

  if (effectivelyOnline) {
    elements.connectionBadge.textContent = 'En Línea';
    elements.connectionBadge.className = 'status-pill badge-success';
    elements.networkBanner.classList.add('banner-online');
    elements.networkBanner.classList.remove('banner-offline');
    elements.networkBannerText.textContent = '🟢 Conexión a Internet activa. Todos los datos están sincronizados.';
  } else {
    elements.connectionBadge.textContent = state.simulatedOffline ? 'Offline (Simulado)' : 'Sin Conexión';
    elements.connectionBadge.className = 'status-pill badge-warning';
    elements.networkBanner.classList.remove('banner-online');
    elements.networkBanner.classList.add('banner-offline');
    elements.networkBannerText.textContent = '⚡ Modo sin conexión activo: los cambios se guardan localmente en IndexedDB de forma persistente.';
  }

  if (elements.btnToggleSimulateOffline) {
    elements.btnToggleSimulateOffline.textContent = state.simulatedOffline
      ? 'Desactivar Modo Offline Simulado'
      : 'Simular Corte de Red (Offline)';
  }
}

/**
 * Sincroniza automáticamente los elementos pendientes cuando vuelve la conexión
 */
async function autoSyncPendingItems() {
  const pending = await db.getPendingSyncItems();
  if (pending.length === 0) return;

  logToTerminal('SYNC', `Sincronizando ${pending.length} registros pendientes en segundo plano...`);

  for (const item of pending) {
    // Simulación de envío a backend REST con delay realista
    await new Promise(r => setTimeout(r, 300));
    await db.markAsSynced(item.id);
    logToTerminal('SYNC', `✓ Registro #${item.id} "${item.title}" sincronizado con el servidor`);
  }

  await refreshAll();
  logToTerminal('SYNC', '¡Todos los registros pendientes han sido sincronizados!');
}

// =========================================================================
// 3. OPERACIONES CRUD CON INDEXEDDB
// =========================================================================
async function handleCreateItem(event) {
  event.preventDefault();

  const titleInput = document.getElementById('item-title');
  const descInput = document.getElementById('item-desc');
  const catInput = document.getElementById('item-category');
  const priorityInput = document.getElementById('item-priority');

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const category = catInput.value;
  const priority = priorityInput.value;

  if (!title) return;

  const isConnected = state.isOnline && !state.simulatedOffline;
  const syncStatus = isConnected ? 'synced' : 'pending_sync';

  const newItem = {
    title,
    description,
    category,
    priority,
    syncStatus,
    createdAt: new Date().toISOString()
  };

  try {
    const saved = await db.addItem(newItem);
    logToTerminal('DB', `Guardado en IndexedDB con ID #${saved.id} (Estado: ${syncStatus})`);

    // Reset form
    titleInput.value = '';
    descInput.value = '';

    await refreshAll();
  } catch (error) {
    logToTerminal('ERROR', `Error al guardar en IndexedDB: ${error.message}`);
  }
}

async function handleDeleteItem(id) {
  try {
    await db.deleteItem(id);
    logToTerminal('DB', `Registro #${id} eliminado de IndexedDB`);
    await refreshAll();
  } catch (error) {
    logToTerminal('ERROR', `Error al eliminar de IndexedDB: ${error.message}`);
  }
}

async function handleToggleSyncStatus(id) {
  const item = await db.getItemById(id);
  if (!item) return;

  item.syncStatus = item.syncStatus === 'synced' ? 'pending_sync' : 'synced';
  await db.updateItem(item);
  logToTerminal('DB', `Estado de sincronización alternado a "${item.syncStatus}" para item #${id}`);
  await refreshAll();
}

// =========================================================================
// 4. RENDERIZADO Y ACTUALIZACIÓN DE LA UI
// =========================================================================
async function refreshAll() {
  await Promise.all([
    renderItemsList(),
    updateStats(),
    refreshCachesList()
  ]);
}

async function renderItemsList() {
  const allItems = await db.getAllItems();
  let filtered = allItems;

  if (state.activeFilter === 'synced') {
    filtered = allItems.filter(i => i.syncStatus === 'synced');
  } else if (state.activeFilter === 'pending') {
    filtered = allItems.filter(i => i.syncStatus === 'pending_sync');
  }

  // Ordenar más recientes primero
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  elements.itemsContainer.innerHTML = '';

  if (filtered.length === 0) {
    elements.emptyState.style.display = 'block';
    return;
  }

  elements.emptyState.style.display = 'none';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card card-priority-${item.priority || 'medium'}`;

    const isPending = item.syncStatus === 'pending_sync';
    const statusBadge = isPending
      ? `<span class="pill-sync pill-pending" title="Creado/modificado offline. Esperando sincronización">⏳ Pendiente Offline</span>`
      : `<span class="pill-sync pill-synced" title="Sincronizado con base de datos remota">✓ Sincronizado</span>`;

    const priorityBadge = `<span class="pill-priority ${item.priority}">${capitalize(item.priority || 'media')}</span>`;
    const categoryBadge = `<span class="pill-category">${item.category || 'General'}</span>`;

    const timeFormatted = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateFormatted = new Date(item.createdAt).toLocaleDateString();

    card.innerHTML = `
      <div class="item-header">
        <div class="item-badges">
          ${statusBadge}
          ${categoryBadge}
          ${priorityBadge}
        </div>
        <div class="item-actions">
          <button class="btn-icon" data-action="toggle-sync" data-id="${item.id}" title="Alternar estado de sincronización">
            🔄
          </button>
          <button class="btn-icon btn-danger-icon" data-action="delete" data-id="${item.id}" title="Eliminar registro">
            🗑️
          </button>
        </div>
      </div>
      <h3 class="item-title">${escapeHTML(item.title)}</h3>
      ${item.description ? `<p class="item-desc">${escapeHTML(item.description)}</p>` : ''}
      <div class="item-footer">
        <span class="item-date">📅 ${dateFormatted} a las ${timeFormatted}</span>
        <span class="item-id">ID: #${item.id}</span>
      </div>
    `;

    elements.itemsContainer.appendChild(card);
  });

  // Delegación de eventos para botones dentro de las tarjetas
  elements.itemsContainer.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      if (action === 'delete') {
        handleDeleteItem(id);
      } else if (action === 'toggle-sync') {
        handleToggleSyncStatus(id);
      }
    });
  });
}

async function updateStats() {
  const stats = await db.getStorageStats();
  if (elements.statTotal) elements.statTotal.textContent = stats.totalItems;
  if (elements.statSynced) elements.statSynced.textContent = stats.syncedItems;
  if (elements.statPending) elements.statPending.textContent = stats.pendingSync;

  if (elements.statStorage) {
    const kb = (stats.storageUsageBytes / 1024).toFixed(1);
    elements.statStorage.textContent = `${kb} KB`;
  }
}

// =========================================================================
// 5. INSPECTOR DE CACHE STORAGE & ESTRATEGIAS
// =========================================================================
async function refreshCachesList() {
  if (!('caches' in window)) return;

  try {
    const cacheKeys = await caches.keys();
    elements.cacheInspectorList.innerHTML = '';

    if (cacheKeys.length === 0) {
      elements.cacheInspectorList.innerHTML = `<div class="cache-empty">No hay cachés registradas actualmente.</div>`;
      return;
    }

    for (const key of cacheKeys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();

      const card = document.createElement('div');
      card.className = 'cache-card';

      let strategyLabel = 'Personalizada';
      if (key.includes('static')) strategyLabel = 'Cache-First (App Shell)';
      else if (key.includes('dynamic')) strategyLabel = 'Cache-First (Dinámica)';
      else if (key.includes('api')) strategyLabel = 'Network-First (APIs)';

      card.innerHTML = `
        <div class="cache-card-header">
          <div>
            <h4 class="cache-name">${escapeHTML(key)}</h4>
            <span class="cache-strategy">${strategyLabel}</span>
          </div>
          <span class="cache-count">${requests.length} recursos</span>
        </div>
        <div class="cache-urls">
          ${requests.slice(0, 5).map(req => `<div class="cache-url-item">${escapeHTML(req.url.replace(window.location.origin, ''))}</div>`).join('')}
          ${requests.length > 5 ? `<div class="cache-url-more">+ ${requests.length - 5} recursos más...</div>` : ''}
        </div>
      `;

      elements.cacheInspectorList.appendChild(card);
    }
  } catch (err) {
    console.error('Error inspeccionando cachés:', err);
  }
}

async function testStaticCacheStrategy() {
  logToTerminal('TEST', 'Probando Estrategia: CACHE-FIRST para recurso estático (styles.css)...');
  const startTime = performance.now();

  try {
    const response = await fetch('./styles.css');
    const elapsed = (performance.now() - startTime).toFixed(2);
    const text = await response.text();

    const fromCache = response.headers.get('x-from-cache') || elapsed < 20;
    logToTerminal('CACHE', `✓ Recurso obtenido en ${elapsed}ms (${fromCache ? 'Servido desde Cache Storage' : 'Servido desde Red/Local'}) - ${text.length} bytes`);
  } catch (err) {
    logToTerminal('ERROR', `Error en petición estática: ${err.message}`);
  }
}

async function testDynamicApiStrategy() {
  logToTerminal('TEST', 'Probando Estrategia: NETWORK-FIRST para API dinámica...');
  const startTime = performance.now();
  elements.apiTestResult.innerHTML = `<span class="loading-spinner"></span> Solicitando datos...`;

  try {
    // Usamos una URL que el Service Worker intercepta con Network-First
    const targetUrl = 'https://jsonplaceholder.typicode.com/posts/1';
    const response = await fetch(targetUrl);
    const elapsed = (performance.now() - startTime).toFixed(2);
    const data = await response.json();

    const isOfflineData = data.error === 'offline';

    if (isOfflineData) {
      elements.apiTestResult.className = 'api-result api-result-offline';
      elements.apiTestResult.innerHTML = `
        <strong>⚠️ Modo Offline - Respuesta Fallback:</strong>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
      logToTerminal('WARN', `Estrategia Network-First recurrió a Offline Fallback (${elapsed}ms)`);
    } else {
      elements.apiTestResult.className = 'api-result api-result-online';
      elements.apiTestResult.innerHTML = `
        <div class="result-meta">
          <span>Tiempo: <strong>${elapsed}ms</strong></span>
          <span>Estatus: <strong>${response.status} ${response.statusText || 'OK'}</strong></span>
        </div>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
      logToTerminal('FETCH', `Estrategia Network-First completada con éxito en ${elapsed}ms`);
    }

    refreshCachesList();
  } catch (err) {
    elements.apiTestResult.className = 'api-result api-result-offline';
    elements.apiTestResult.textContent = `Error: ${err.message}`;
    logToTerminal('ERROR', `Error en prueba Network-First: ${err.message}`);
  }
}

// =========================================================================
// 6. CONSOLA DE REGISTRO EN TIEMPO REAL (TERMINAL)
// =========================================================================
function logToTerminal(tag, message) {
  if (!elements.terminalLog) return;

  const now = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = `log-line log-tag-${tag.toLowerCase()}`;

  line.innerHTML = `
    <span class="log-time">[${now}]</span>
    <span class="log-badge">[${tag}]</span>
    <span class="log-content">${escapeHTML(message)}</span>
  `;

  elements.terminalLog.appendChild(line);
  elements.terminalLog.scrollTop = elements.terminalLog.scrollHeight;
}

// =========================================================================
// 7. SEMBRADO DE DATOS DE EJEMPLO
// =========================================================================
async function seedSampleData() {
  logToTerminal('DB', 'Sembrando registros de demostración en IndexedDB...');

  const sampleItems = [
    {
      title: 'Auditoría de Service Worker y App Shell',
      description: 'Verificar la precaché de recursos estáticos y validación de offline readiness.',
      category: 'Desarrollo',
      priority: 'high',
      syncStatus: 'synced',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      title: 'Implementación de Estrategia Cache-First',
      description: 'Asegurar que CSS, JS y fuentes carguen inmediatamente en menos de 20ms.',
      category: 'Optimización',
      priority: 'medium',
      syncStatus: 'synced',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      title: 'Registro de pedido en modo sin conexión',
      description: 'Creado por el usuario cuando la señal de red se interrumpió temporalmente.',
      category: 'Ventas',
      priority: 'urgent',
      syncStatus: 'pending_sync',
      createdAt: new Date().toISOString()
    }
  ];

  for (const item of sampleItems) {
    await db.addItem(item);
  }

  await refreshAll();
  logToTerminal('DB', '✓ Datos de muestra agregados satisfactoriamente.');
}

// =========================================================================
// 8. UTILIDADES Y MANEJADORES DE EVENTOS
// =========================================================================
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function setupUIEventListeners() {
  // Envío del formulario
  if (elements.formNewItem) {
    elements.formNewItem.addEventListener('submit', handleCreateItem);
  }

  // Alternar offline simulado
  if (elements.btnToggleSimulateOffline) {
    elements.btnToggleSimulateOffline.addEventListener('click', () => {
      state.simulatedOffline = !state.simulatedOffline;
      logToTerminal('SIMULATION', `Modo offline simulado: ${state.simulatedOffline ? 'ACTIVADO' : 'DESACTIVADO'}`);
      updateNetworkUI();

      if (!state.simulatedOffline && state.isOnline) {
        autoSyncPendingItems();
      }
    });
  }

  // Botón sincronizar manualmente
  if (elements.btnManualSync) {
    elements.btnManualSync.addEventListener('click', async () => {
      if (!state.isOnline || state.simulatedOffline) {
        alert('No se puede sincronizar: la aplicación está actualmente sin conexión.');
        return;
      }
      await autoSyncPendingItems();
    });
  }

  // Filtros
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.getAttribute('data-filter');
      renderItemsList();
    });
  });

  // Pestañas principales
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabButtons.forEach(b => b.classList.remove('active'));
      elements.tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(`panel-${tabTarget}`);
      if (targetPanel) targetPanel.classList.add('active');

      if (tabTarget === 'cache') {
        refreshCachesList();
      }
    });
  });

  // Acciones de demostración
  if (elements.btnSeedData) elements.btnSeedData.addEventListener('click', seedSampleData);
  if (elements.btnClearData) {
    elements.btnClearData.addEventListener('click', async () => {
      if (confirm('¿Eliminar todos los registros de IndexedDB?')) {
        await db.clearAllItems();
        await refreshAll();
        logToTerminal('DB', 'IndexedDB ha sido vaciado.');
      }
    });
  }

  if (elements.btnRefreshCaches) elements.btnRefreshCaches.addEventListener('click', refreshCachesList);
  if (elements.btnClearCaches) {
    elements.btnClearCaches.addEventListener('click', () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'CLEAR_CACHE' });
      } else {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(refreshCachesList);
      }
    });
  }

  if (elements.btnTestStaticCache) elements.btnTestStaticCache.addEventListener('click', testStaticCacheStrategy);
  if (elements.btnTestDynamicApi) elements.btnTestDynamicApi.addEventListener('click', testDynamicApiStrategy);

  if (elements.btnClearLog) {
    elements.btnClearLog.addEventListener('click', () => {
      elements.terminalLog.innerHTML = '';
      logToTerminal('SYSTEM', 'Consola reiniciada.');
    });
  }

  // Botón para actualizar Service Worker al instante
  if (elements.btnSwUpdateNow) {
    elements.btnSwUpdateNow.addEventListener('click', () => {
      if (state.swRegistration && state.swRegistration.waiting) {
        state.swRegistration.waiting.postMessage({ action: 'SKIP_WAITING' });
      }
      window.location.reload();
    });
  }
}

// =========================================================================
// INICIALIZACIÓN
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  logToTerminal('SYSTEM', '⚡ Inicializando PWA Offline Studio...');
  initNetworkListeners();
  setupUIEventListeners();

  try {
    // Abrir o verificar IndexedDB
    await db.openDB ? db.openDB() : null;
    logToTerminal('DB', 'IndexedDB inicializado correctamente');

    // Registrar Service Worker
    await registerServiceWorker();

    // Cargar datos iniciales
    await refreshAll();
  } catch (err) {
    logToTerminal('ERROR', `Error en inicialización: ${err.message}`);
  }
});
