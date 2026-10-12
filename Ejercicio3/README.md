# Ejercicio 3: Service Worker Avanzado y Persistencia con IndexedDB (PWA Offline Studio)

## 📋 Descripción
Este ejercicio presenta una solución integral para el soporte **Offline-First**, combinando el control de red mediante un Service Worker avanzado y el almacenamiento local estructurado y transaccional a través de la API nativa de **IndexedDB**.

Permite a los usuarios realizar operaciones completas de lectura, escritura, actualización y eliminación de datos sin depender de una conexión activa a internet, manteniendo sincronización automática al restablecerse la conectividad.

---

## 🎯 Objetivos de Aprendizaje
- Diseñar e implementar una capa de abstracción basada en `Promises` para interactuar con **IndexedDB**.
- Gestionar versionado de esquema, creación de `ObjectStores` e índices de búsqueda eficiente.
- Combinar el almacenamiento de activos estáticos en la **Cache API** con datos dinámicos en **IndexedDB**.
- Detectar eventos de conectividad (`window.addEventListener('online')` / `'offline'`) con retroalimentación visual inmediata.
- Registrar un historial o bitácora de transacciones realizadas en modo offline.

---

## 📂 Estructura de Archivos
```text
Ejercicio3/
├── icons/
│   ├── icon-192.png       # Icono 192x192 px
│   ├── icon-512.png       # Icono 512x512 px
│   └── icon.svg           # Gráfico vectorial base
├── js/
│   ├── app.js             # Lógica de interfaz, controladores UI y estado de red
│   └── db.js              # Módulo IndexedDB nativo (CRUD, transacciones, stores)
├── generate_icons.js      # Generador automatizado de iconos
├── index.html             # Interfaz de gestión de datos y panel de control offline
├── manifest.json          # Web App Manifest
├── package.json           # Configuración del proyecto Node.js
├── server.js              # Servidor local Express
├── styles.css             # Estilos de interfaz moderna (Glassmorphism / Dark Mode)
├── sw.js                  # Service Worker avanzado con gestión de cachés
└── README.md              # Documentación técnica del ejercicio
```

---

## ⚙️ Tecnologías y Conceptos Clave
- **IndexedDB API**: Almacenamiento NoSQL estructurado del lado del cliente, transaccional y asíncrono.
- **Object Stores e Índices**: Creación de tablas (`items`, `logs`) con auto-incremento y consultas indexadas.
- **Service Worker Caching**: Entrega garantizada de la interfaz mientras IndexedDB administra la información del usuario.
- **Network Status Synchronization**: Detección del estado del navegador y cola de sincronización.

---

## 🚀 Cómo Ejecutar
1. Navega a la carpeta `Ejercicio3`:
   ```bash
   cd Ejercicio3
   ```
2. Instala dependencias y corre el servidor Node.js:
   ```bash
   npm install
   npm start
   ```
3. Abre el navegador en `http://localhost:3000`.
4. Prueba desconectar tu red o activar el modo offline en DevTools (**Network > Offline**): la app seguirá permitiendo agregar, editar y eliminar registros gracias a IndexedDB.
