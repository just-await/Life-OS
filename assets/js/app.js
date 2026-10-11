// Life OS — Главная точка запуска
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация хранилища, состояния и интерфейса
  window.LifeState.init();
  window.LifeUI.init();

  // 2. Регистрация Service Worker (PWA)
  registerServiceWorker();

  // 3. Подключение кнопки установки PWA
  initPwaInstall();

  // Отлов скрытых ошибок (чтобы сайт не зависал молча)
  window.addEventListener('error', () => {
    if (window.LifeUI && window.LifeUI.showToast) {
      window.LifeUI.showToast('Что-то пошло не так. Пожалуйста, перезагрузите страницу.', 'error');
    }
  });

  // 4. ПРОВЕРКА ВОЗВРАТА ИЗ ЯНДЕКС ID (ВХОД В 1 КЛИК)
  if (window.LifeSync) {
    const isTokenCaptured = window.LifeSync.checkUrlToken();
    if (isTokenCaptured) {
      setTimeout(() => {
        window.LifeUI.showToast('🎉 Яндекс Диск успешно подключен!');
        window.LifeUI.updateCloudStatusUI();
        window.LifeSync.silentPull();
      }, 350);
    } else {
      // Тихая синхронизация при обычном входе
      setTimeout(() => {
        window.LifeSync.silentPull();
      }, 800);
    }
  }

  console.log('⚡ Life OS: Система готова к работе.');
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('⚡ Life OS: PWA кэш активен.'))
      .catch((err) => console.warn('PWA:', err));
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