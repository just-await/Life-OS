// sw.js — Service Worker Life OS (Network-First: мгновенные обновления с GitHub)
const CACHE_NAME = 'life-os-v2.3-network-first';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/variables.css',
  './assets/css/neobrutalism.css',
  './assets/css/layout.css',
  './assets/css/modal.css',
  './assets/js/config.js',
  './assets/js/icons.js',
  './assets/js/confetti.js',
  './assets/js/storage.js',
  './assets/js/state.js',
  './assets/js/backup.js',
  './assets/js/sync.js',
  './assets/js/viral.js',
  './assets/js/ui.js',
  './assets/js/app.js',
  './assets/icons/icon.png',
  './assets/fonts/golos-text-regular.woff2',
  './assets/fonts/golos-text-semibold.woff2',
  './assets/fonts/golos-text-bold.woff2',
  './assets/fonts/unbounded-medium.woff2',
  './assets/fonts/unbounded-bold.woff2'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (_) {}
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// СТРАТЕГИЯ NETWORK-FIRST: Сначала проверяем сеть (GitHub), при сбое или офлайне — берем из кэша
self.addEventListener('fetch', (event) => {
  // Не трогаем сторонние API (Яндекс Диск / Google Drive)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Для навигации и локальных файлов: сначала идем в сеть за свежим кодом
  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(async () => {
        // Офлайн-режим (нет интернета): берем файл из кэша браузера
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        if (event.request.mode === 'navigate') {
          return (await caches.match('./index.html')) || (await caches.match('index.html'));
        }
      })
  );
});