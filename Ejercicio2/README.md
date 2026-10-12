# Ejercicio 2: Arquitectura App Shell y Splash Screen PWA

## 📋 Descripción
Este ejercicio demuestra la implementación del patrón de arquitectura **App Shell** en una Progressive Web App. El App Shell es la interfaz de usuario mínima requerida para que la aplicación se renderice de forma instantánea y confiable en cualquier visita posterior, incluso sin conexión a la red.

Además, se incluye una **Splash Screen** integrada y un Service Worker que precachea y sirve los componentes estructurales de la aplicación.

---

## 🎯 Objetivos de Aprendizaje
- Separar de manera conceptual y técnica el **App Shell** (cabecera, navegación, estructura) del **contenido dinámico**.
- Implementar un Service Worker básico con ciclo de vida completo:
  - `install`: Pre-caché de recursos estáticos críticos.
  - `activate`: Limpieza y purga de versiones antiguas de caché (`caches.delete`).
  - `fetch`: Estrategia **Cache-First con Network Fallback** para archivos estructurales.
- Configurar la pantalla de bienvenida nativa (**Splash Screen**) a través del `manifest.json` mediante las propiedades `background_color`, `theme_color` e iconos optimizados.
- Desplegar la app mediante un servidor local en Node.js / Express con cabeceras correctas.

---

## 📂 Estructura de Archivos
```text
Ejercicio2/
├── icons/
│   ├── icon-192.png       # Icono 192x192 px
│   ├── icon-512.png       # Icono 512x512 px
│   └── icon-maskable.png  # Icono con área segura para máscaras
├── app.js                 # Registro del SW, simulación de carga dinámica y métricas
├── generate_icons.js      # Script utilitario para generar assets de iconos
├── index.html             # Maqueta del App Shell (navbar, drawer, placeholder dinámico)
├── manifest.json          # Configuración de Splash Screen y display standalone
├── package.json           # Dependencias del servidor Node.js
├── server.js              # Servidor Express local con soporte HTTPS/HTTP
├── style.css              # Estilos del App Shell, esqueletos de carga (skeleton loaders)
├── sw.js                  # Service Worker con precaché del App Shell y limpieza de caché
└── README.md              # Documentación técnica del ejercicio
```

---

## ⚙️ Tecnologías y Conceptos Clave
- **App Shell Architecture**: Garantiza First Contentful Paint (FCP) ultra-rápido.
- **Cache API**: Manejo de caché persistente en el navegador con `caches.open` y `cache.addAll`.
- **Skeleton Screen**: Indicadores visuales de carga que mejoran la percepción de velocidad mientras los datos asíncronos se obtienen.
- **Service Worker Lifecycle**: Gestión controlada de `skipWaiting()` y `clients.claim()`.

---

## 🚀 Cómo Ejecutar
1. Navega a la carpeta `Ejercicio2`:
   ```bash
   cd Ejercicio2
   ```
2. Instala dependencias y corre el servidor Node.js:
   ```bash
   npm install
   npm start
   ```
3. Abre el navegador en `http://localhost:3000` (o el puerto configurado).
4. Verifica en las DevTools (**Application > Service Workers** y **Application > Cache Storage**) que el shell esté precacheado (`app-shell-cache-v1`).
