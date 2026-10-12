/**
 * PERSISTENCIA ASÍNCRONA CON INDEXEDDB
 * =========================================================================
 * Módulo nativo basado en Promises para el almacenamiento estructurado y
 * manipulación de datos en modo offline.
 * =========================================================================
 */

const DB_CONFIG = {
  name: 'OfflineStudioDB',
  version: 1,
  stores: {
    items: 'items',
    logs: 'logs'
  }
};

let dbInstance = null;

/**
 * Inicializa y abre la base de datos IndexedDB
 * Gestiona el evento onupgradeneeded para crear object stores e índices.
 */
function openDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = (event) => {
      console.error('[IndexedDB] Error al abrir la base de datos:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      console.log(`[IndexedDB] Base de datos "${DB_CONFIG.name}" abierta con éxito.`);

      // Manejar cambios de versión inesperados o cierres
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        console.warn('[IndexedDB] La base de datos requiere actualización o fue cerrada.');
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log(`[IndexedDB] Actualizando esquema a versión ${DB_CONFIG.version}...`);

      // 1. Almacén de elementos principales (Tareas/Registros)
      if (!db.objectStoreNames.contains(DB_CONFIG.stores.items)) {
        const itemStore = db.createObjectStore(DB_CONFIG.stores.items, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Creación de índices para búsquedas optimizadas
        itemStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        itemStore.createIndex('category', 'category', { unique: false });
        itemStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log(`[IndexedDB] Almacén "${DB_CONFIG.stores.items}" creado.`);
      }

      // 2. Almacén de logs/auditoría de eventos offline
      if (!db.objectStoreNames.contains(DB_CONFIG.stores.logs)) {
        const logStore = db.createObjectStore(DB_CONFIG.stores.logs, {
          keyPath: 'id',
          autoIncrement: true
        });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log(`[IndexedDB] Almacén "${DB_CONFIG.stores.logs}" creado.`);
      }
    };
  });
}

/**
 * Operación genérica para ejecutar transacciones con Promises
 */
async function performTransaction(storeName, mode, operationCallback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let result;
    try {
      result = operationCallback(store);
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => resolve(result?.result !== undefined ? result.result : result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });
}

// =========================================================================
// OPERACIONES CRUD PARA ELEMENTOS (ITEMS)
// =========================================================================

/**
 * Inserta un nuevo registro en IndexedDB
 */
export async function addItem(item) {
  const record = {
    ...item,
    syncStatus: item.syncStatus || 'pending_sync',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const id = await performTransaction(DB_CONFIG.stores.items, 'readwrite', (store) => {
    return store.add(record);
  });

  await addLog('CREATE', `Registro creado localmente: "${record.title}"`, { id, record });
  return { ...record, id };
}

/**
 * Obtiene todos los registros almacenados
 */
export async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.stores.items, 'readonly');
    const store = tx.objectStore(DB_CONFIG.stores.items);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene un registro por su ID
 */
export async function getItemById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.stores.items, 'readonly');
    const store = tx.objectStore(DB_CONFIG.stores.items);
    const request = store.get(Number(id));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Actualiza un registro existente
 */
export async function updateItem(item) {
  const record = {
    ...item,
    id: Number(item.id),
    updatedAt: new Date().toISOString()
  };

  await performTransaction(DB_CONFIG.stores.items, 'readwrite', (store) => {
    return store.put(record);
  });

  await addLog('UPDATE', `Registro actualizado: "${record.title}"`, { id: record.id });
  return record;
}

/**
 * Elimina un registro por ID
 */
export async function deleteItem(id) {
  const numId = Number(id);
  await performTransaction(DB_CONFIG.stores.items, 'readwrite', (store) => {
    return store.delete(numId);
  });

  await addLog('DELETE', `Registro eliminado con ID #${numId}`, { id: numId });
  return numId;
}

/**
 * Obtiene los elementos que están pendientes de sincronización
 */
export async function getPendingSyncItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.stores.items, 'readonly');
    const store = tx.objectStore(DB_CONFIG.stores.items);
    const index = store.index('syncStatus');
    const request = index.getAll('pending_sync');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Marca un registro como sincronizado ('synced')
 */
export async function markAsSynced(id) {
  const item = await getItemById(id);
  if (item) {
    item.syncStatus = 'synced';
    item.syncedAt = new Date().toISOString();
    return updateItem(item);
  }
}

/**
 * Limpia todos los registros
 */
export async function clearAllItems() {
  await performTransaction(DB_CONFIG.stores.items, 'readwrite', (store) => {
    return store.clear();
  });
  await addLog('CLEAR', 'Se eliminaron todos los registros de IndexedDB');
}

// =========================================================================
// GESTIÓN DE LOGS Y AUDITORÍA ASÍNCRONA
// =========================================================================

export async function addLog(action, description, details = {}) {
  try {
    const entry = {
      action,
      description,
      details,
      timestamp: new Date().toISOString(),
      onlineStatus: navigator.onLine ? 'online' : 'offline'
    };

    const db = await openDB();
    const tx = db.transaction(DB_CONFIG.stores.logs, 'readwrite');
    tx.objectStore(DB_CONFIG.stores.logs).add(entry);
  } catch (err) {
    console.warn('[IndexedDB Log Error]', err);
  }
}

export async function getRecentLogs(limit = 15) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(DB_CONFIG.stores.logs, 'readonly');
    const store = tx.objectStore(DB_CONFIG.stores.logs);
    const request = store.openCursor(null, 'prev');
    const logs = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && logs.length < limit) {
        logs.push(cursor.value);
        cursor.continue();
      } else {
        resolve(logs);
      }
    };

    request.onerror = () => resolve([]);
  });
}

/**
 * Obtiene métricas generales de IndexedDB y Storage API
 */
export async function getStorageStats() {
  const allItems = await getAllItems();
  const pending = allItems.filter(i => i.syncStatus === 'pending_sync');

  let quotaInfo = { usage: 0, quota: 0 };
  if (navigator.storage && navigator.storage.estimate) {
    quotaInfo = await navigator.storage.estimate();
  }

  return {
    totalItems: allItems.length,
    pendingSync: pending.length,
    syncedItems: allItems.length - pending.length,
    storageUsageBytes: quotaInfo.usage || 0,
    storageQuotaBytes: quotaInfo.quota || 0
  };
}
