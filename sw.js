// assets/sw.js — Service Worker Life OS v2.0
const CACHE_NAME = 'life-os-v2.0-' + '2026-10-14';

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
  './assets/icons/icon.png'
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

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Игнорируем сетевые запросы к Яндекс Диску
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Навигация (переход на страницы): сеть с откатом на кэш
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('./index.html', response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./index.html')) || (await cache.match('index.html'));
        })
    );
    return;
  }

  // Локальные ресурсы: быстрый кэш с обновлением в фоне
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {});
      return cachedResponse || fetchPromise;
    })
  );
});