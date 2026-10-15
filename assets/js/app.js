// assets/js/app.js
// Точка запуска Life OS: Асинхронный старт с гарантированным опросом IndexedDB
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', async () => {
  window.LifeLog.info('LifeApp', '🚀 Старт приложения. Ожидание проверки хранилищ...');

  // 1. СТРОГО ДОЖИДАЕМСЯ инициализации IndexedDB и аварийного восстановления!
  if (window.LifeStorage && window.LifeStorage.init) {
    await window.LifeStorage.init();
  }

  // 2. Только когда хранилище на 100% готово — запускаем состояние и интерфейс
  window.LifeState.init();
  window.LifeUI.init();
  if (window.LifeViral) window.LifeViral.init();

  // 3. Регистрация Service Worker (PWA)
  registerServiceWorker();

  // 4. Подключение кнопки установки PWA
  initPwaInstall();

  // 5. Проверка возврата из Яндекс ID или Google OAuth
  if (window.LifeSync) {
    const isYandexCaptured = window.LifeSync.checkUrlToken();
    const isGoogleCaptured = await window.LifeSync.checkUrlCode();

    if (isYandexCaptured) {
      setTimeout(() => {
        window.LifeUI.showToast('🎉 Яндекс Диск успешно подключен!');
        window.LifeUI.updateCloudStatusUI();
        window.LifeSync.silentPull();
      }, 350);
    } else if (!isGoogleCaptured) {
      setTimeout(() => {
        window.LifeSync.silentPull();
      }, 800);
    }
  }

  window.LifeLog.info('LifeApp', '⚡ Life OS: Система полностью готова к работе.');
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        window.LifeLog.info('LifeApp', 'PWA Service Worker зарегистрирован.');
        // Проверяем обновления файла sw.js на сервере при каждом входе
        reg.update().catch(() => {});
      })
      .catch((err) => window.LifeLog.warn('LifeApp', 'Ошибка регистрации PWA Service Worker', err));
  }
}

function initPwaInstall() {
  const installBtn = document.getElementById('installPwaBtn');
  if (!installBtn) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    installBtn.style.display = 'none';
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
  });

  installBtn.addEventListener('click', async () => {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos) {
      const iosModal = document.getElementById('iosInstallModal');
      if (iosModal) iosModal.classList.add('active');
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    } else {
      window.LifeUI.customAlert('Используйте меню браузера: «Установить Life OS» или «Добавить на главный экран».', 'Установка приложения');
    }
  });

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIos && !isStandalone) {
    installBtn.style.display = 'inline-flex';
  }
}