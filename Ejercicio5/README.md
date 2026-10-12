# Ejercicio 5: Interceptor de Peticiones y Respuestas Alternativas Offline (Fallbacks)

## 📋 Descripción
Este ejercicio aborda la intercepción avanzada de tráfico HTTP en una PWA mediante el evento `fetch` del Service Worker. Provee **respuestas alternativas (fallbacks)** inteligentes para diferentes tipos de contenido cuando el usuario pierde la conexión o el servidor remoto deja de responder.

Incluye una plantilla de rescate offline (`offline.html`), fallbacks de imágenes en SVG generadas al vuelo y respuestas JSON estructuradas de contingencia para APIs.

---

## 🎯 Objetivos de Aprendizaje
- Configurar un interceptor robusto de eventos `fetch` en el Service Worker.
- Implementar discriminación por tipo de petición (`request.mode === 'navigate'`, cabeceras `Accept` para imágenes, `Accept: application/json` para llamadas AJAX/fetch).
- Servir una página completa de contingencia (`offline.html`) ante intentos fallidos de navegación.
- Proveer imágenes y datos simulados en formato JSON en caso de desconexión sin bloquear la aplicación.
- Establecer comunicación en tiempo real entre el Service Worker y el cliente UI mediante `postMessage`.

---

## 📂 Estructura de Archivos
```text
Ejercicio5/
├── icons/
│   ├── icon-192x192.png   # Icono 192 px
│   └── icon-512x512.png   # Icono 512 px
├── app.js                 # Lógica cliente: disparador de peticiones de prueba y monitor de logs
├── generate_icons.js      # Generador de iconos
├── index.html             # Panel de pruebas interactivas (navegación, imágenes y APIs)
├── manifest.json          # Web App Manifest
├── offline.html           # Página de rescate visual entregada en modo offline
├── styles.css             # Estilos modernos para la UI del laboratorio y monitor
├── sw.js                  # Service Worker interceptor con lógica de fallback por tipo de recurso
└── README.md              # Documentación técnica del ejercicio
```

---

## ⚙️ Tecnologías y Conceptos Clave
- **Fetch Event Interception**: Intercepción granular de solicitudes salientes.
- **Offline Fallback Routing**: Devolución de plantillas estáticas precacheadas cuando la red falla.
- **Synthetic SVG Fallbacks**: Creación de respuestas de imagen al vuelo (`new Response(...)`) con encabezados `image/svg+xml`.
- **Client Messaging**: Notificación en vivo de eventos de red y caché a la interfaz mediante `navigator.serviceWorker.controller.postMessage`.

---

## 🚀 Cómo Ejecutar
1. Abre una terminal en la carpeta `Ejercicio5`.
2. Inicia un servidor local:
   ```bash
   npx serve .
   ```
3. Abre el navegador en `http://localhost:3000` (o el puerto provisto).
4. Realiza pruebas de petición con red activa y con red desconectada usando el panel interactivo y observa los fallbacks en acción.
