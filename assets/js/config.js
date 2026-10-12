// Глобальные настройки Life OS
window.LifeConfig = {
  version: '1.5.0',

  // Ссылка на донат (вставь сюда свою ссылку CloudTips, Boosty, чаевые Тинькофф и т.д.)
  donationUrl: 'https://pay.cloudtips.ru/p/eafc4110',

  // Настройки Яндекс Диска
  yandex: {
    clientId: 'b8ac870907144a7ebdbcda02f5422fd7',
  },

  // Настройки сети
  network: {
    proxyUrl: 'https://lifeos-proxy.jeanmanasaryan.workers.dev',
  },

  // Системный виброотклик
  vibrate(ms = 30) {
    try {
      if (typeof window.navigator.vibrate === 'function') {
        window.navigator.vibrate(ms);
      }
    } catch (e) {}
  }
};