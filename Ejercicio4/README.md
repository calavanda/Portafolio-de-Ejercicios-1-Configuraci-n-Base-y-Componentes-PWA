# Ejercicio 4: Cache API y Estrategia Cache-First (Precaching del App Shell)

## 📋 Descripción
Este ejercicio profundiza en el uso de la **Cache API** nativa de los navegadores y la estrategia de almacenamiento en caché **Cache-First (Caché Primero)**. Mediante una consola visual e interactiva, el usuario puede inspeccionar en tiempo real cómo los recursos del App Shell se almacenan durante la instalación del Service Worker y cómo se recuperan instantáneamente desde la caché local sin emitir peticiones a la red externa.

---

## 🎯 Objetivos de Aprendizaje
- Dominar el uso de los métodos de la **Cache API**:
  - `caches.open(cacheName)`
  - `cache.addAll(requests[])`
  - `caches.match(request)`
  - `caches.delete(cacheName)`
  - `caches.keys()`
- Implementar la estrategia **Cache-First**:
  - Interceptar eventos `fetch` con el Service Worker.
  - Responder de inmediato si el recurso ya existe en la caché.
  - En caso contrario, solicitar el recurso a la red mediante `fetch(event.request)`.
- Diseñar un panel de control interactivo que audite el contenido de la caché, la versión activa y las métricas de respuesta.

---

## 📂 Estructura de Archivos
```text
Ejercicio4/
├── icons/
│   ├── icon-192x192.png       # Icono estándar
│   └── icon-512x512.png       # Icono alta definición
├── images/
│   ├── app_shell_banner.jpg   # Banner estático ilustrativo del App Shell
│   ├── icon-192.svg           # Icono SVG 192 px
│   └── icon-512.svg           # Icono SVG 512 px
├── app.js                     # Controlador de la UI, inspección de caché y simulaciones
├── generate_icons.js          # Utilidad para regeneración de iconos PNG
├── index.html                 # Interfaz visual interactiva con monitor de caché
├── manifest.json              # Configuración PWA
├── styles.css                 # Diseño CSS con visualización de estado de caché y terminal
├── sw.js                      # Service Worker con precaché e interceptor Cache-First
└── README.md                  # Documentación técnica del ejercicio
```

---

## ⚙️ Tecnologías y Conceptos Clave
- **Cache-First Strategy**: Ideal para recursos inmutables o estáticos del App Shell (HTML, CSS, JS e imágenes clave).
- **Service Worker Lifecycle**: Automatización de precarga en `install` y purga de versiones obsoletas en `activate`.
- **Cache Storage Inspection**: Visualización dinámica de claves y respuestas cacheadas desde el hilo principal (`window`).

---

## 🚀 Cómo Ejecutar
1. Abre una terminal en la carpeta `Ejercicio4`.
2. Inicia un servidor HTTP local:
   ```bash
   npx serve .
   ```
3. Accede a `http://localhost:3000` (o el puerto mostrado).
4. Utiliza los botones de prueba en pantalla para consultar el estado del Service Worker, ver los recursos cacheados y alternar el modo offline.
