/**
 * LÓGICA DE INTERACCIÓN DEL APP SHELL & PWA SPLASH SCREEN
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos del DOM
  const navToggleBtn = document.getElementById('nav-toggle-btn');
  const appNav = document.getElementById('app-nav');
  const navBackdrop = document.getElementById('nav-backdrop');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const btnInstallPwa = document.getElementById('btn-install-pwa');
  const btnDevtoolsInstallTrigger = document.getElementById('btn-devtools-install-trigger');
  const pwaStatusPill = document.getElementById('pwa-status-pill');
  const statusText = document.getElementById('status-text');
  const swStateLabel = document.getElementById('sw-state-label');
  const swRegDetails = document.getElementById('sw-reg-details');
  const btnUpdateSw = document.getElementById('btn-update-sw');

  const navLinks = document.querySelectorAll('.nav-link');
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  const contentSections = document.querySelectorAll('.content-section');

  const btnTriggerFullscreenSplash = document.getElementById('btn-trigger-fullscreen-splash');
  const btnRestartMockup = document.getElementById('btn-restart-mockup');
  const fullscreenSplashOverlay = document.getElementById('fullscreen-splash-overlay');
  const mockupSplashContent = document.getElementById('mockup-splash-content');

  let deferredInstallPrompt = null;

  // -------------------------------------------------------------
  // 2. Control de Navegación del App Shell (Sidebar & Bottom Nav)
  // -------------------------------------------------------------
  function switchView(targetSectionId) {
    // Actualizar secciones
    contentSections.forEach((section) => {
      if (section.id === targetSectionId) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Actualizar links del Sidebar
    navLinks.forEach((link) => {
      if (link.dataset.target === targetSectionId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Actualizar items de la barra inferior móvil
    bottomNavItems.forEach((btn) => {
      if (btn.dataset.target === targetSectionId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // En pantallas móviles, cerrar el drawer lateral al navegar
    closeMobileNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.dataset.target;
      if (target) switchView(target);
    });
  });

  bottomNavItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.target;
      if (target) switchView(target);
    });
  });

  // Drawer Móvil
  function openMobileNav() {
    appNav.classList.add('open');
    navBackdrop.classList.add('active');
    navToggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMobileNav() {
    appNav.classList.remove('open');
    navBackdrop.classList.remove('active');
    navToggleBtn.setAttribute('aria-expanded', 'false');
  }

  if (navToggleBtn) {
    navToggleBtn.addEventListener('click', () => {
      const isOpen = appNav.classList.contains('open');
      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMobileNav);
  }

  // Cerrar drawer con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appNav.classList.contains('open')) {
      closeMobileNav();
    }
  });

  // -------------------------------------------------------------
  // 3. Tema Claro / Oscuro (Persistencia en localStorage)
  // -------------------------------------------------------------
  const savedTheme = localStorage.getItem('app-shell-theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('app-shell-theme', newTheme);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
      if (theme === 'light') {
        // Icono de luna
        themeIcon.innerHTML = `
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
      } else {
        // Icono de sol
        themeIcon.innerHTML = `
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Service Worker y Detección de Estado Offline
  // -------------------------------------------------------------
  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusText.textContent = 'En Línea';
      pwaStatusPill.style.background = 'var(--badge-success-bg)';
      pwaStatusPill.style.color = 'var(--badge-success-text)';
    } else {
      statusText.textContent = 'Modo Offline (App Shell)';
      pwaStatusPill.style.background = 'var(--badge-warning-bg)';
      pwaStatusPill.style.color = 'var(--badge-warning-text)';
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('[App Shell] Service Worker registrado exitosamente con scope:', registration.scope);
        if (swStateLabel) swStateLabel.textContent = 'Activo';
        if (swRegDetails) {
          swRegDetails.innerHTML = `
            <strong>Scope:</strong> <code>${registration.scope}</code><br>
            <strong>Estado:</strong> ${registration.active ? 'Activo y controlando el App Shell' : 'Instalándose'}.
          `;
        }
        updateOnlineStatus();
      })
      .catch((error) => {
        console.warn('[App Shell] Error al registrar Service Worker:', error);
        if (swStateLabel) {
          swStateLabel.textContent = 'No registrado';
          swRegDetails.textContent = 'Asegúrate de ejecutar la app a través de un servidor web local (http://localhost) o HTTPS.';
        }
      });
  } else {
    if (swStateLabel) swStateLabel.textContent = 'No soportado';
  }

  if (btnUpdateSw) {
    btnUpdateSw.addEventListener('click', () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.update().then(() => {
              alert('Service Worker actualizado con éxito.');
            });
          }
        });
      }
    });
  }

  // -------------------------------------------------------------
  // 5. Manejo del Prompt de Instalación PWA (beforeinstallprompt)
  // -------------------------------------------------------------
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir el banner automático del navegador para controlarlo manualmente
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado.');

    if (btnInstallPwa) {
      btnInstallPwa.style.display = 'inline-flex';
    }
  });

  function triggerInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] El usuario aceptó la instalación.');
        } else {
          console.log('[PWA] El usuario rechazó la instalación.');
        }
        deferredInstallPrompt = null;
      });
    } else {
      // Instrucción si el prompt aún no se dispara o la app ya está instalada
      alert(
        'Simulación de Instalación:\n\n' +
        '1. En Chrome DevTools (F12) -> pestaña "Application" -> subpestaña "Manifest".\n' +
        '2. Haz clic en "Install app" o "Simulate install event".\n' +
        '3. También puedes hacer clic en el menú de tres puntos de Chrome -> "Instalar AppShell PWA...".'
      );
    }
  }

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', triggerInstall);
  }
  if (btnDevtoolsInstallTrigger) {
    btnDevtoolsInstallTrigger.addEventListener('click', triggerInstall);
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplicación instalada con éxito.');
    if (btnInstallPwa) btnInstallPwa.style.display = 'none';
  });

  // -------------------------------------------------------------
  // 6. Simulación Interactiva de Splash Screen Nativa
  // -------------------------------------------------------------
  // Simulación a Pantalla Completa
  if (btnTriggerFullscreenSplash) {
    btnTriggerFullscreenSplash.addEventListener('click', () => {
      fullscreenSplashOverlay.classList.add('active');
      fullscreenSplashOverlay.setAttribute('aria-hidden', 'false');

      // Simula el tiempo que tarda el SO en levantar la ventana nativa y servir el App Shell (1.6s)
      setTimeout(() => {
        fullscreenSplashOverlay.classList.remove('active');
        fullscreenSplashOverlay.setAttribute('aria-hidden', 'true');
      }, 1600);
    });
  }

  // Reiniciar animación del Mockup del Teléfono
  if (btnRestartMockup && mockupSplashContent) {
    btnRestartMockup.addEventListener('click', () => {
      mockupSplashContent.style.opacity = '0';
      setTimeout(() => {
        mockupSplashContent.style.opacity = '1';
      }, 200);
    });
  }
});
