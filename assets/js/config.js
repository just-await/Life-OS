// assets/js/config.js
// Глобальные настройки Life OS
window.LifeConfig = {
  version: '2.0.0',

  // Ссылка на донат / чаевые
  donationUrl: 'https://pay.cloudtips.ru/p/eafc4110',

  // Настройки Яндекс Диска
  yandex: {
    clientId: 'b8ac870907144a7ebdbcda02f5422fd7',
  },

  // Настройки Google Диска (Google Identity Services)
  // Для боевого использования укажи свой Client ID из Google Cloud Console
  google: {
    clientId: '261915453001-k5ppabdsrq906qc08bp2riqqjthb2ped.apps.googleusercontent.com',
  },

  // Настройки шлюза Cloudflare для Яндекс Диска
  network: {
    proxyUrl: 'https://lifeos-proxy.jeanmanasaryan.workers.dev',
  },

  // Системный виброотклик
  vibrate(ms = 30) {
    try {
      if (typeof window.navigator.vibrate === 'function') {
        window.navigator.vibrate(ms);
      }
    } catch (_) {}
  }
};