# Ejercicio 1: Configuración de Web App Manifest y Metadatos PWA

## 📋 Descripción
Este ejercicio implementa los fundamentos de configuración requeridos para transformar una aplicación web estándar en una **Progressive Web App (PWA)** instalable en navegadores de escritorio y dispositivos móviles (Android/iOS).

Se centra en la correcta vinculación y sintaxis del archivo `manifest.json`, la inclusión de meta-etiquetas esenciales en HTML5 para soporte multiplataforma y una interfaz interactiva de auditoría de instalación.

---

## 🎯 Objetivos de Aprendizaje
- Configurar un archivo `manifest.json` completo con propiedades estándar (`name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, `icons`).
- Proveer iconos responsivos con resoluciones mínimas requeridas (192x192 px y 512x512 px) con soporte `maskable`.
- Incorporar metadatos compatibles con iOS (`apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`).
- Manejar el evento nativo del navegador `beforeinstallprompt` para habilitar un botón de instalación personalizado.

---

## 📂 Estructura de Archivos
```text
Ejercicio1/
├── icons/
│   ├── icon-192x192.png   # Icono para pantallas estándar y launcher
│   └── icon-512x512.png   # Icono de alta resolución y splash nativo
├── app.js                 # Lógica interactiva, inspector y gestión de beforeinstallprompt
├── index.html             # Estructura semántica con metaetiquetas PWA
├── manifest.json          # Web App Manifest configurado
├── style.css              # Estilos visuales con soporte dark mode y tokens CSS
└── README.md              # Documentación técnica del ejercicio
```

---

## ⚙️ Tecnologías y Conceptos Clave
- **Web App Manifest Specification**: Declaración de la identidad visual de la aplicación.
- **Display Modes**: Uso del modo `standalone` para ejecutar la app sin la barra de direcciones del navegador.
- **Maskable Icons**: Iconos adaptativos que respetan las máscaras y bordes redondeados del sistema operativo (Android Adaptive Icons).
- **Prompt API**: Captura del evento `beforeinstallprompt` y almacenamiento del disparador para invocación programática.

---

## 🚀 Cómo Ejecutar
1. Abre una terminal en la carpeta `Ejercicio1`.
2. Inicia un servidor HTTP local (por ejemplo usando Python, Node.js o Live Server de VS Code):
   ```bash
   # Opción con npx (Node.js)
   npx serve .

   # Opción con Python 3
   python -m http.server 8080
   ```
3. Abre el navegador en `http://localhost:8080` (o el puerto indicado) y abre las DevTools en la pestaña **Application > Manifest** para auditar la instalación.
