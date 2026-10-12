/* ============================================================
   app.js — PWA Ejercicio: manifest, metadatos e instalación
   ============================================================ */

'use strict';

// ——————————————————————————————————————————
// 1. Intersection Observer → animaciones de entrada
// ——————————————————————————————————————————
const animatables = document.querySelectorAll('.prop-card, .icon-card');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

animatables.forEach((el) => observer.observe(el));


// ——————————————————————————————————————————
// 2. Copiar manifest al portapapeles
// ——————————————————————————————————————————
const copyBtn = document.getElementById('btn-copy-manifest');

if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    const manifest = {
      name: 'PWA Ejercicio App',
      short_name: 'PWAApp',
      description: 'Aplicación web progresiva de ejemplo con manifest e iconos de instalación.',
      start_url: './index.html',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#4F46E5',
      background_color: '#0F0E1A',
      lang: 'es',
      scope: './',
      icons: [
        { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        ¡Copiado!
      `;
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copiar
        `;
      }, 2000);
    } catch {
      // Fallback para navegadores sin clipboard API
      const text = JSON.stringify(manifest, null, 2);
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  });
}


// ——————————————————————————————————————————
// 3. PWA Install Prompt (beforeinstallprompt)
// ——————————————————————————————————————————
let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn    = document.getElementById('btn-install');
const dismissBtn    = document.getElementById('btn-dismiss-install');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostrar el banner de instalación
  if (installBanner) {
    installBanner.hidden = false;
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install outcome: ${outcome}`);
    deferredPrompt = null;
    if (installBanner) installBanner.hidden = true;
  });
}

if (dismissBtn) {
  dismissBtn.addEventListener('click', () => {
    if (installBanner) installBanner.hidden = true;
  });
}

// Ocultar banner si ya está instalada
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App instalada correctamente ✓');
  if (installBanner) installBanner.hidden = true;
  deferredPrompt = null;
});


// ——————————————————————————————————————————
// 4. Registrar Service Worker (para PWA completa)
// ——————————————————————————————————————————
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registrado con scope:', registration.scope);
    } catch (err) {
      // sw.js es opcional en este ejercicio; no bloquea la app
      console.info('[SW] Service Worker no disponible en este contexto.');
    }
  });
}


// ——————————————————————————————————————————
// 5. Mostrar modo de display actual
// ——————————————————————————————————————————
const displayModes = ['standalone', 'minimal-ui', 'fullscreen', 'browser'];
let activeMode = 'browser';

for (const mode of displayModes) {
  if (window.matchMedia(`(display-mode: ${mode})`).matches) {
    activeMode = mode;
    break;
  }
}

console.log(`[PWA] Modo de display activo: ${activeMode}`);


// ——————————————————————————————————————————
// 6. Smooth scroll suavizado para nav links
// ——————————————————————————————————————————
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


// ——————————————————————————————————————————
// 7. Header scroll effect
// ——————————————————————————————————————————
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    header?.classList.add('header--scrolled');
  } else {
    header?.classList.remove('header--scrolled');
  }
}, { passive: true });
