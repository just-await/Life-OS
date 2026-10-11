// Service Worker Life OS — Надежный оффлайн-движок v8
const CACHE_NAME = 'life-os-offline-v8';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/variables.css',
  './assets/css/neobrutalism.css',
  './assets/css/layout.css',
  './assets/css/modal.css',
  './assets/js/icons.js',
  './assets/js/confetti.js',
  './assets/js/storage.js',
  './assets/js/state.js',
  './assets/js/backup.js',
  './assets/js/sync.js',
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
          } catch (err) {
            console.warn('[SW] Ошибка кэширования ресурса:', url);
          }
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

  // 1. КЭШИРОВАНИЕ ВЕБ-ШРИФТОВ (Google Fonts: Unbounded и Golos Text для 100% оффлайна)
  if (requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // Запросы к облаку Яндекс Диска требуют реального интернета — их не перехватываем
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 2. НАВИГАЦИЯ (открытие приложения с таймаутом на плохой сети)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      new Promise((resolve) => {
        let isTimedOut = false;
        const timer = setTimeout(async () => {
          isTimedOut = true;
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match(event.request)) || (await cache.match('./index.html')) || (await cache.match('index.html'));
          if (cached) resolve(cached);
        }, 1200);

        fetch(event.request)
          .then(async (response) => {
            clearTimeout(timer);
            if (response && response.ok) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, response.clone());
              cache.put('./index.html', response.clone());
            }
            if (!isTimedOut) resolve(response);
          })
          .catch(async () => {
            clearTimeout(timer);
            const cache = await caches.open(CACHE_NAME);
            const cached = (await cache.match(event.request)) || (await cache.match('./index.html')) || (await cache.match('index.html'));
            resolve(cached || new Response('Offline', { status: 503 }));
          });
      })
    );
    return;
  }

  // 3. СТАТИЧЕСКИЕ ФАЙЛЫ ПРИЛОЖЕНИЯ
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});