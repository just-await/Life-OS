// assets/js/sync.js
// Бронебойный модуль синхронизации: Абсолютные Tombstones + Тотальное логирование
window.LifeSync = {
  provider: 'yandex', // 'yandex' | 'google'
  yandexToken: null,
  googleToken: null,
  googleTokenExpiresAt: 0,
  googleFileId: null,
  googleTokenClient: null,

  isSyncing: false,
  autoSyncTimer: null,
  status: 'NOT_CONNECTED',

  init() {
    window.LifeLog.info('LifeSync', 'Инициализация шлюза облачной синхронизации...');
    this.provider = localStorage.getItem('LIFE_OS_CLOUD_PROVIDER') || 'yandex';
    this.yandexToken = localStorage.getItem('LIFE_OS_YANDEX_TOKEN') || null;
    this.googleToken = localStorage.getItem('LIFE_OS_GOOGLE_TOKEN') || null;
    this.googleTokenExpiresAt = Number(localStorage.getItem('LIFE_OS_GOOGLE_EXPIRES')) || 0;
    this.googleFileId = localStorage.getItem('LIFE_OS_GOOGLE_FILE_ID') || null;

    const currentToken = this.getCurrentToken();
    this.status = localStorage.getItem('LIFE_OS_SYNC_STATUS') || (currentToken ? 'SYNCED' : 'NOT_CONNECTED');

    window.LifeLog.info('LifeSync', `Конфигурация загружена. Провайдер: [${this.provider.toUpperCase()}]. Ключ авторизации: ${currentToken ? 'Присутствует' : 'Отсутствует'}`);

    this.initGoogleClient();
    this.setupLifecycleListeners();
  },

  getCurrentToken() {
    return this.provider === 'google' ? this.googleToken : this.yandexToken;
  },

  setProvider(newProvider) {
    window.LifeLog.info('LifeSync', `Смена облачного провайдера: ${this.provider} -> ${newProvider}`);
    this.provider = newProvider;
    localStorage.setItem('LIFE_OS_CLOUD_PROVIDER', newProvider);
    const token = this.getCurrentToken();
    this.setStatus(token ? 'SYNCED' : 'NOT_CONNECTED');
    if (window.LifeUI && window.LifeUI.updateCloudStatusUI) {
      window.LifeUI.updateCloudStatusUI();
    }
  },

  setStatus(newStatus) {
    window.LifeLog.info('LifeSync', `Смена статуса синхронизации: [${this.status}] -> [${newStatus}]`);
    this.status = newStatus;
    localStorage.setItem('LIFE_OS_SYNC_STATUS', newStatus);
    if (window.LifeUI && window.LifeUI.updateCloudStatusUI) {
      window.LifeUI.updateCloudStatusUI();
    }
  },

  setupLifecycleListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        window.LifeLog.info('LifeSync', '👁️ Вкладка стала активной. Проверяем изменения на сервере...');
        this.silentPull();
      }
    });
    window.addEventListener('online', () => {
      window.LifeLog.info('LifeSync', '🌐 Соединение с интернетом восстановлено. Запуск выгрузки накопившихся изменений.');
      this.silentPull();
    });
    window.addEventListener('offline', () => {
      window.LifeLog.warn('LifeSync', '🔌 Устройство потеряло связь с сетью. Переход в автономный режим.');
      if (this.getCurrentToken()) this.setStatus('OFFLINE');
    });
  },

  // 1. АВТОРИЗАЦИЯ ЯНДЕКС
  checkUrlToken() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      window.LifeLog.info('LifeSync', 'Обнаружен access_token в URL-хэше. Выполняем захват...');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');
      if (token && token.startsWith('y0_')) {
        this.setYandexToken(token);
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
        window.LifeLog.info('LifeSync', 'Токен Яндекс ID успешно сохранен в системе.');
        return true;
      }
    }
    return false;
  },

  startOAuthLogin() {
    const clientId = window.LifeConfig.yandex.clientId;
    let cleanPath = window.location.pathname.replace(/\/index\.html$/, '');
    if (!cleanPath.endsWith('/')) cleanPath += '/';
    const redirectUri = window.location.origin + cleanPath;
    window.LifeLog.info('LifeSync', `Редирект на авторизацию Яндекс OAuth. Redirect URI: ${redirectUri}`);
    window.location.href = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  },

  setYandexToken(token) {
    this.yandexToken = String(token || '').trim();
    localStorage.setItem('LIFE_OS_YANDEX_TOKEN', this.yandexToken);
    this.setStatus('SYNCING');
  },

  unlinkYandex() {
    window.LifeLog.warn('LifeSync', 'Отключение аккаунта Яндекс Диска.');
    this.yandexToken = null;
    localStorage.removeItem('LIFE_OS_YANDEX_TOKEN');
    localStorage.removeItem('LIFE_OS_LAST_SYNC_TS_YANDEX');
    this.setStatus('NOT_CONNECTED');
  },

  // 2. АВТОРИЗАЦИЯ GOOGLE
  initGoogleClient() {
    if (typeof window.google !== 'undefined' && window.google.accounts && window.LifeConfig.google && window.LifeConfig.google.clientId && !window.LifeConfig.google.clientId.includes('YOUR_GOOGLE')) {
      try {
        this.googleTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: window.LifeConfig.google.clientId,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: (res) => {
            if (res.access_token) {
              window.LifeLog.info('LifeSync', 'Токен Google Drive API успешно получен/обновлен.');
              this.setGoogleToken(res.access_token, res.expires_in);
              if (window.LifeUI) window.LifeUI.showToast('🎉 Google Диск подключен!');
              this.syncWithCurrentCloud();
            }
          }
        });
        window.LifeLog.info('LifeSync', 'Google Identity Services Client инициализирован.');
      } catch (e) {
        window.LifeLog.warn('LifeSync', 'Ошибка инициализации Google Identity Client', e);
      }
    }
  },

  async ensureFreshGoogleToken() {
    if (this.googleToken && Date.now() < (this.googleTokenExpiresAt - 120000)) {
      return true;
    }

    window.LifeLog.info('LifeSync', 'Токен Google Drive истекает. Запуск тихого фонового обновления токена...');
    if (!this.googleTokenClient) this.initGoogleClient();
    if (!this.googleTokenClient) throw new Error('AUTH_ERROR: Google Client не настроен');

    return new Promise((resolve) => {
      const prevCallback = this.googleTokenClient.callback;
      this.googleTokenClient.callback = (res) => {
        if (res.access_token) {
          this.setGoogleToken(res.access_token, res.expires_in);
          window.LifeLog.info('LifeSync', 'Тихое продление сессии Google прошло успешно.');
          resolve(true);
        } else {
          window.LifeLog.warn('LifeSync', 'Фоновое продление Google отклонено.');
          resolve(false);
        }
        this.googleTokenClient.callback = prevCallback;
      };
      this.googleTokenClient.requestAccessToken({ prompt: '' });
    });
  },

  startGoogleLogin() {
    if (!window.LifeConfig.google || !window.LifeConfig.google.clientId || window.LifeConfig.google.clientId.includes('YOUR_GOOGLE')) {
      window.LifeUI.customAlert(
        `Чтобы включить Google Диск, укажите ваш <strong>Client ID</strong> в файле <code>assets/js/config.js</code>.`,
        'Настройка Google Диска'
      );
      return;
    }
    if (!this.googleTokenClient) this.initGoogleClient();
    if (this.googleTokenClient) {
      window.LifeLog.info('LifeSync', 'Запрос авторизации Google через всплывающее окно...');
      this.googleTokenClient.requestAccessToken();
    }
  },

  setGoogleToken(token, expiresIn = 3600) {
    this.googleToken = String(token || '').trim();
    this.googleTokenExpiresAt = Date.now() + (Number(expiresIn) * 1000);
    localStorage.setItem('LIFE_OS_GOOGLE_TOKEN', this.googleToken);
    localStorage.setItem('LIFE_OS_GOOGLE_EXPIRES', this.googleTokenExpiresAt.toString());
    this.setStatus('SYNCING');
  },

  unlinkGoogle() {
    window.LifeLog.warn('LifeSync', 'Отключение аккаунта Google Диска.');
    this.googleToken = null;
    this.googleTokenExpiresAt = 0;
    this.googleFileId = null;
    localStorage.removeItem('LIFE_OS_GOOGLE_TOKEN');
    localStorage.removeItem('LIFE_OS_GOOGLE_EXPIRES');
    localStorage.removeItem('LIFE_OS_GOOGLE_FILE_ID');
    localStorage.removeItem('LIFE_OS_LAST_SYNC_TS_GOOGLE');
    this.setStatus('NOT_CONNECTED');
  },

  // 3. СЕТЬ
  async fetchWithTimeout(url, options = {}, timeoutMs = 8500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      window.LifeLog.info('LifeSync', `[HTTP REQUEST] -> ${options.method || 'GET'} ${url}`);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      window.LifeLog.info('LifeSync', `[HTTP RESPONSE] <- Status: ${res.status} ${res.statusText}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        window.LifeLog.error('LifeSync', `[HTTP TIMEOUT] Превышен лимит ожидания ${timeoutMs} мс`);
        throw new Error('TIMEOUT');
      }
      window.LifeLog.error('LifeSync', `[HTTP NETWORK ERROR] ${err.message}`);
      throw err;
    }
  },

  async downloadYandexFile(downloadHref) {
    window.LifeLog.info('LifeSync', 'Попытка прямого скачивания файла с Яндекс Диска...');
    try {
      const directRes = await this.fetchWithTimeout(downloadHref, {}, 3000);
      if (directRes.ok) {
        window.LifeLog.info('LifeSync', 'Файл успешно скачан напрямую (CORS разрешен).');
        return await directRes.json();
      }
    } catch (_) {
      window.LifeLog.warn('LifeSync', 'Прямое скачивание заблокировано политикой браузера. Переключаемся на защищенный шлюз Cloudflare...');
    }

    const proxyUrl = window.LifeConfig.network.proxyUrl;
    if (proxyUrl) {
      try {
        const proxyRes = await this.fetchWithTimeout(`${proxyUrl}?url=${encodeURIComponent(downloadHref)}`, {}, 8500);
        if (proxyRes.ok) {
          window.LifeLog.info('LifeSync', 'Файл успешно скачан через защищенный шлюз Cloudflare.');
          return await proxyRes.json();
        }
        throw new Error(`HTTP ${proxyRes.status}`);
      } catch (err) {
        window.LifeLog.error('LifeSync', 'Сбой скачивания через шлюз Cloudflare', err);
        throw err;
      }
    }
    throw new Error('Шлюз недоступен');
  },

  // 4. АРХИТЕКТУРА ЭПОХ (EPOCH SYNC ENGINE)
  mergeData(local, remote) {
    window.LifeLog.info('LifeSync', '════════════════ НАЧАЛО СЛИЯНИЯ ДАННЫХ ════════════════');
    if (!remote) return local;
    if (!local) return remote;

    const localEpoch = Number(local.resetEpoch) || 0;
    const remoteEpoch = Number(remote.resetEpoch) || 0;

    // СЦЕНАРИЙ А: В облаке произошел сброс или импорт бэкапа более новой эпохи!
    if (remoteEpoch > localEpoch) {
      window.LifeLog.warn('LifeSync', `⚡ Обнаружена новая Эпоха в облаке (remote: ${remoteEpoch} > local: ${localEpoch}). Локальная база полностью обновляется под облако!`);
      if (window.LifeUI && window.LifeUI.showToast) {
        window.LifeUI.showToast('🔄 Данные синхронизированы с новой версией из облака');
      }
      return remote;
    }

    // СЦЕНАРИЙ Б: На этом устройстве сбросили базу или восстановили бэкап (наша эпоха новее)!
    if (localEpoch > remoteEpoch) {
      window.LifeLog.warn('LifeSync', `⚡ Локальная Эпоха новее облачной (local: ${localEpoch} > remote: ${remoteEpoch}). Облако будет перезаписано текущими данными!`);
      return local;
    }

    // СЦЕНАРИЙ В: Мы находимся в одной эпохе — производим классическое слияние задач
    window.LifeLog.info('LifeSync', `Устройства в одной эпохе (Epoch: ${localEpoch}). Выполняем точечное слияние изменений.`);

    const tombstones = { ...(remote.tombstones || {}), ...(local.tombstones || {}) };
    const isDead = (id) => Boolean(tombstones[id]);

    const merged = {
      schemaVersion: 1,
      isOnboarding: false,
      spheres: [],
      projects: [],
      tasks: [],
      inbox: [],
      tombstones: tombstones,
      resetEpoch: localEpoch,
      resetAt: Math.max(Number(local.resetAt) || 0, Number(remote.resetAt) || 0)
    };

    // ФУНКЦИЯ ВЫБОРА ПОБЕДИТЕЛЯ (СТРОГИЙ ПРИОРИТЕТ REV)
    const pickWinner = (locItem, remItem) => {
      const lRev = locItem.rev || 0;
      const rRev = remItem.rev || 0;
      if (rRev > lRev) return remItem;
      if (lRev > rRev) return locItem;

      // При равенстве ревизий побеждает более свежее время
      const lTime = locItem.updatedAt || locItem.createdAt || 0;
      const rTime = remItem.updatedAt || remItem.createdAt || 0;
      return (rTime >= lTime) ? remItem : locItem;
    };

    // 1. СФЕРЫ (С жесткой фильтрацией удаленных)
    const sphereMap = new Map();
    (local.spheres || []).forEach(s => {
      if (isDead(s.id)) {
        window.LifeLog.info('LifeSync', `🚫 Локальная сфера [${s.title}] (${s.id}) исключена — находится в Tombstone.`);
        return;
      }
      sphereMap.set(s.id, s);
    });

    (remote.spheres || []).forEach(s => {
      if (isDead(s.id)) {
        window.LifeLog.info('LifeSync', `🚫 Облачная сфера [${s.title}] (${s.id}) УНИЧТОЖЕНА — находится в Tombstone и не будет воскрешена!`);
        return;
      }
      if (!sphereMap.has(s.id)) {
        sphereMap.set(s.id, s);
      } else {
        sphereMap.set(s.id, pickWinner(sphereMap.get(s.id), s));
      }
    });
    merged.spheres = Array.from(sphereMap.values());
    const validSphereIds = new Set(merged.spheres.map(s => s.id));

    // 2. ПРОЕКТЫ (Каскадная защита: проект умирает, если умерла сфера)
    const projectMap = new Map();
    (local.projects || []).forEach(p => {
      if (isDead(p.id) || !validSphereIds.has(p.sphereId)) {
        window.LifeLog.info('LifeSync', `🚫 Локальный проект [${p.title}] (${p.id}) исключен (удален или сфера уничтожена).`);
        tombstones[p.id] = Date.now(); // Авто-пометка на удаление
        return;
      }
      projectMap.set(p.id, p);
    });

    (remote.projects || []).forEach(p => {
      if (isDead(p.id) || !validSphereIds.has(p.sphereId)) {
        window.LifeLog.info('LifeSync', `🚫 Облачный проект [${p.title}] (${p.id}) УНИЧТОЖЕН (удален или сфера уничтожена).`);
        tombstones[p.id] = Date.now();
        return;
      }
      if (!projectMap.has(p.id)) {
        projectMap.set(p.id, p);
      } else {
        projectMap.set(p.id, pickWinner(projectMap.get(p.id), p));
      }
    });
    merged.projects = Array.from(projectMap.values());
    const validProjectIds = new Set(merged.projects.map(p => p.id));

    // 3. ЗАДАЧИ (Каскадная защита: задача умирает, если умер проект)
    const taskMap = new Map();
    (local.tasks || []).forEach(t => {
      if (isDead(t.id) || !validProjectIds.has(t.projectId)) {
        window.LifeLog.info('LifeSync', `🚫 Локальная задача [${t.title}] (${t.id}) исключена.`);
        tombstones[t.id] = Date.now();
        return;
      }
      taskMap.set(t.id, t);
    });

    (remote.tasks || []).forEach(t => {
      if (isDead(t.id) || !validProjectIds.has(t.projectId)) {
        window.LifeLog.info('LifeSync', `🚫 Облачная задача [${t.title}] (${t.id}) УНИЧТОЖЕНА.`);
        tombstones[t.id] = Date.now();
        return;
      }
      if (!taskMap.has(t.id)) {
        taskMap.set(t.id, t);
      } else {
        taskMap.set(t.id, pickWinner(taskMap.get(t.id), t));
      }
    });
    merged.tasks = Array.from(taskMap.values());

    // 4. ИНБОКС
    const inboxMap = new Map();
    (local.inbox || []).forEach(i => {
      if (!isDead(i.id)) inboxMap.set(i.id, i);
    });
    (remote.inbox || []).forEach(i => {
      if (!isDead(i.id) && !inboxMap.has(i.id)) {
        inboxMap.set(i.id, i);
      }
    });
    merged.inbox = Array.from(inboxMap.values());

    window.LifeLog.info('LifeSync', `✅ СЛИЯНИЕ ЗАВЕРШЕНО: Сфер: ${merged.spheres.length}, Проектов: ${merged.projects.length}, Задач: ${merged.tasks.length}, Инбокс: ${merged.inbox.length}`);
    window.LifeLog.info('LifeSync', '═══════════════════════════════════════════════════════');
    return merged;
  },

  // 5. СИНХРОНИЗАЦИЯ ЯНДЕКС ДИСК
  async syncWithYandexDisk(callback, silent = false) {
    if (!this.yandexToken) {
      this.setStatus('NOT_CONNECTED');
      if (callback) callback({ success: false, error: 'Токен не указан' });
      return;
    }

    this.isSyncing = true;
    this.setStatus('SYNCING');
    localStorage.setItem('LIFE_OS_SYNC_PENDING', 'true');
    const filePath = 'app:/planner_data.json';
    const cacheBuster = Date.now();

    try {
      window.LifeLog.info('LifeSync', `[ЯНДЕКС] 1/4 Запрос метаданных для скачивания файла ${filePath}...`);
      let remoteData = null;

      const downMetaRes = await this.fetchWithTimeout(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(filePath)}&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (downMetaRes.status === 401 || downMetaRes.status === 403) {
        throw new Error('AUTH_ERROR: Токен Яндекс ID недействителен');
      }

      if (downMetaRes.status === 404) {
        window.LifeLog.info('LifeSync', '[ЯНДЕКС] Файл на диске пока не существует (первая синхронизация). Создаем новый.');
        remoteData = null;
      } else if (!downMetaRes.ok) {
        throw new Error(`Ошибка метаданных Яндекса: HTTP ${downMetaRes.status}`);
      } else {
        const downMeta = await downMetaRes.json();
        let rawDownload = await this.downloadYandexFile(downMeta.href);
        if (rawDownload && rawDownload.data) rawDownload = rawDownload.data;
        if (rawDownload && typeof rawDownload === 'object') {
          remoteData = rawDownload;
        }
      }

      // Подготовка локальных данных и контрольного слепка
      const localData = window.LifeState.data || window.LifeStorage.load();
      window.LifeStorage.savePreSyncSnapshot(localData);

      // Слияние баз
      const mergedData = this.mergeData(localData, remoteData);
      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      // Выгрузка обратно в Яндекс Диск
      window.LifeLog.info('LifeSync', '[ЯНДЕКС] 3/4 Запрос ссылки на загрузку файла (upload link)...');
      const upMetaRes = await this.fetchWithTimeout(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (!upMetaRes.ok) throw new Error(`Ошибка прав на запись Яндекса: HTTP ${upMetaRes.status}`);
      const upMeta = await upMetaRes.json();

      window.LifeLog.info('LifeSync', '[ЯНДЕКС] 4/4 Отправка бинарного JSON пакета на серверы Яндекса...');
      const uploadRes = await fetch(upMeta.href, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedData)
      });

      if (!uploadRes.ok && ![200, 201, 202].includes(uploadRes.status)) {
        throw new Error(`Ошибка записи в Яндекс: HTTP ${uploadRes.status}`);
      }

      this.isSyncing = false;
      localStorage.setItem('LIFE_OS_LAST_SYNC_TS_YANDEX', Date.now().toString());
      localStorage.removeItem('LIFE_OS_SYNC_PENDING');
      this.setStatus('SYNCED');
      window.LifeLog.info('LifeSync', '🎉 [ЯНДЕКС] Синхронизация успешно завершена на 100%!');

      if (callback) callback({ success: true, timestamp: Date.now(), silent });

    } catch (err) {
      this.isSyncing = false;
      window.LifeLog.error('LifeSync', '💥 [ЯНДЕКС] Критический сбой цепочки синхронизации:', err);
      const isAuth = String(err.message).includes('AUTH_ERROR');
      this.setStatus(isAuth ? 'AUTH_ERROR' : 'OFFLINE');
      if (callback) callback({ success: false, error: err.message, isAuthErr: isAuth, silent });
    }
  },

  // 6. СИНХРОНИЗАЦИЯ GOOGLE DRIVE
  async syncWithGoogleDrive(callback, silent = false) {
    if (!this.googleToken) {
      this.setStatus('NOT_CONNECTED');
      if (callback) callback({ success: false, error: 'Токен Google не указан' });
      return;
    }

    this.isSyncing = true;
    this.setStatus('SYNCING');
    localStorage.setItem('LIFE_OS_SYNC_PENDING', 'true');

    try {
      await this.ensureFreshGoogleToken();
      let fileId = this.googleFileId;

      window.LifeLog.info('LifeSync', '[GOOGLE] 1/4 Поиск файла planner_data.json в appDataFolder...');
      if (!fileId) {
        const listRes = await this.fetchWithTimeout(
          `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='planner_data.json' and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`,
          { headers: { Authorization: `Bearer ${this.googleToken}` } }
        );

        if (listRes.status === 401 || listRes.status === 403) throw new Error('AUTH_ERROR');
        if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

        const listData = await listRes.json();
        if (listData.files && listData.files.length > 0) {
          fileId = listData.files[0].id;
          this.googleFileId = fileId;
          localStorage.setItem('LIFE_OS_GOOGLE_FILE_ID', fileId);
          window.LifeLog.info('LifeSync', `[GOOGLE] Файл найден. ID: ${fileId}`);
        }
      }

      let remoteData = null;
      if (fileId) {
        window.LifeLog.info('LifeSync', `[GOOGLE] 2/4 Скачивание содержимого файла ${fileId}...`);
        const getRes = await this.fetchWithTimeout(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${this.googleToken}` } }
        );

        if (getRes.status === 401 || getRes.status === 403) throw new Error('AUTH_ERROR');
        if (getRes.ok) {
          remoteData = await getRes.json();
          if (remoteData && remoteData.data) remoteData = remoteData.data;
        }
      }

      const localData = window.LifeState.data || window.LifeStorage.load();
      window.LifeStorage.savePreSyncSnapshot(localData);

      const mergedData = this.mergeData(localData, remoteData);
      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      window.LifeLog.info('LifeSync', '[GOOGLE] 3/4 Выгрузка объединенной базы обратно в Google Drive...');
      await this.uploadRawGoogleData(mergedData);

      this.isSyncing = false;
      localStorage.setItem('LIFE_OS_LAST_SYNC_TS_GOOGLE', Date.now().toString());
      localStorage.removeItem('LIFE_OS_SYNC_PENDING');
      this.setStatus('SYNCED');
      window.LifeLog.info('LifeSync', '🎉 [GOOGLE] Синхронизация с Google Drive выполнена успешно!');

      if (callback) callback({ success: true, timestamp: Date.now(), silent });

    } catch (err) {
      this.isSyncing = false;
      window.LifeLog.error('LifeSync', '💥 [GOOGLE] Сбой синхронизации Google:', err);
      const isAuth = String(err.message).includes('AUTH_ERROR');
      this.setStatus(isAuth ? 'AUTH_ERROR' : 'OFFLINE');
      if (callback) callback({ success: false, error: err.message, isAuthErr: isAuth, silent });
    }
  },

  async uploadRawGoogleData(data) {
    let fileId = this.googleFileId;

    if (!fileId) {
      const createMetaRes = await this.fetchWithTimeout(
        `https://www.googleapis.com/drive/v3/files`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.googleToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'planner_data.json',
            parents: ['appDataFolder']
          })
        }
      );
      if (!createMetaRes.ok) throw new Error(`Google API Create error: HTTP ${createMetaRes.status}`);
      const createdMeta = await createMetaRes.json();
      fileId = createdMeta.id;
      this.googleFileId = fileId;
      localStorage.setItem('LIFE_OS_GOOGLE_FILE_ID', fileId);
    }

    const patchRes = await this.fetchWithTimeout(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    if (!patchRes.ok) {
      if (patchRes.status === 404) {
        this.googleFileId = null;
        localStorage.removeItem('LIFE_OS_GOOGLE_FILE_ID');
      }
      throw new Error(`Google API Patch error: HTTP ${patchRes.status}`);
    }
    return true;
  },

  async pushLocalToCloud() {
    if (!this.getCurrentToken()) return;
    this.isSyncing = true;
    this.setStatus('SYNCING');
    const localData = window.LifeState.data || window.LifeStorage.load();

    try {
      if (this.provider === 'yandex') {
        const filePath = 'app:/planner_data.json';
        const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${Date.now()}`, {
          headers: { Authorization: `OAuth ${this.yandexToken}` }
        });
        const upMeta = await upMetaRes.json();
        await fetch(upMeta.href, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localData)
        });
        localStorage.setItem('LIFE_OS_LAST_SYNC_TS_YANDEX', Date.now().toString());
      } else {
        await this.ensureFreshGoogleToken();
        await this.uploadRawGoogleData(localData);
        localStorage.setItem('LIFE_OS_LAST_SYNC_TS_GOOGLE', Date.now().toString());
      }

      this.isSyncing = false;
      localStorage.removeItem('LIFE_OS_SYNC_PENDING');
      this.setStatus('SYNCED');
      window.LifeLog.info('LifeSync', 'Данные успешно выгружены в облако.');
    } catch (e) {
      window.LifeLog.warn('LifeSync', 'Ошибка выгрузки бэкапа в облако:', e);
      this.isSyncing = false;
      this.setStatus('OFFLINE');
    }
  },

  async syncWithCurrentCloud(callback, silent = false) {
    if (this.provider === 'google') {
      return this.syncWithGoogleDrive(callback, silent);
    }
    return this.syncWithYandexDisk(callback, silent);
  },

  async recreateCloudFile() {
    const localData = window.LifeState.data || window.LifeStorage.load();
    const isYandex = this.provider === 'yandex';

    if (isYandex && !this.yandexToken) return false;
    if (!isYandex && !this.googleToken) return false;

    window.LifeUI.showToast('Пересоздаем файл в облаке...');

    if (isYandex) {
      try {
        const filePath = 'app:/planner_data.json';
        const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${Date.now()}`, {
          headers: { Authorization: `OAuth ${this.yandexToken}` }
        });
        const upMeta = await upMetaRes.json();
        const uploadRes = await fetch(upMeta.href, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localData)
        });
        if (uploadRes.ok) {
          window.LifeUI.customAlert('Файл в Яндекс Диске успешно перезаписан вашей локальной базой!', 'Успех');
          this.setStatus('SYNCED');
          return true;
        }
      } catch (_) {}
    } else {
      try {
        await this.uploadRawGoogleData(localData);
        window.LifeUI.customAlert('Файл в Google Диске успешно пересоздан!', 'Успех');
        this.setStatus('SYNCED');
        return true;
      } catch (_) {}
    }

    window.LifeUI.showToast('Не удалось пересоздать файл. Проверьте сеть.', 'error');
    return false;
  },

  silentPull() {
    if (this.isSyncing || !this.getCurrentToken()) return;

    this.syncWithCurrentCloud((res) => {
      if (res.success && window.LifeUI) {
        window.LifeUI.onSilentSyncCompleted();
      } else if (res.isAuthErr && window.LifeUI) {
        window.LifeUI.showToast('⚠️ Требуется повторный вход в облако', 'error');
      }
    }, true);
  },

  triggerAutoSync() {
    if (!this.getCurrentToken()) return;
    clearTimeout(this.autoSyncTimer);
    this.autoSyncTimer = setTimeout(() => {
      window.LifeLog.info('LifeSync', '⏳ Таймер 2.2с истек. Запуск фоновой отправки изменений...');
      this.silentPull();
    }, 2200);
  },

  translateError(err, provider = 'yandex') {
    const msg = String(err.message || err);
    const cloudName = provider === 'yandex' ? 'Яндекс Диска' : 'Google Диска';

    if (msg.includes('AUTH_ERROR') || msg.includes('401') || msg.includes('403')) {
      return {
        title: 'Срок действия входа истёк',
        text: `Ключ авторизации для ${cloudName} устарел. Ваши данные в безопасности на телефоне. Нажмите «Войти снова» в меню настроек.`,
        action: 'Требуется вход'
      };
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('IO failure')) {
      return {
        title: `Серверы ${cloudName} временно заняты`,
        text: `Облако вернуло временный сбой файловой системы. Ваши задачи сохранены на устройстве. В меню есть кнопка «Пересоздать», если сбой повторится.`,
        action: 'Повторить позже'
      };
    }
    if (msg.includes('TIMEOUT') || msg.includes('Failed to fetch') || !navigator.onLine) {
      return {
        title: 'Офлайн-режим (нет связи)',
        text: `Нет устойчивого соединения с ${cloudName}. Вы можете спокойно продолжать писать задачи — планер синхронизирует их автоматически при появлении сети.`,
        action: 'Работаем офлайн'
      };
    }
    return {
      title: 'Сбой синхронизации',
      text: `Облако ответило: ${msg.slice(0, 120)}. Ваши данные на устройстве в полной безопасности.`,
      action: 'Понятно'
    };
  },

  async runDiagnostic() {
    const modal = document.getElementById('customDialogModal');
    const titleEl = document.getElementById('customDialogTitle');
    const msgEl = document.getElementById('customDialogMessage');
    const confirmBtn = document.getElementById('customDialogConfirmBtn');
    const cancelBtn = document.getElementById('customDialogCancelBtn');
    const promptBox = document.getElementById('customDialogPromptBox');

    const isGoogle = this.provider === 'google';

    const yandexSteps = [
      { id: 'token', name: 'Ключ авторизации Яндекс ID', status: 'pending', desc: 'Ожидание...' },
      { id: 'net', name: 'Связь с серверами Яндекса', status: 'pending', desc: 'Ожидание...' },
      { id: 'proxy', name: 'Шлюз Cloudflare (Обход CORS)', status: 'pending', desc: 'Ожидание...' },
      { id: 'write', name: 'Права на запись (app:/)', status: 'pending', desc: 'Ожидание...' }
    ];

    const googleSteps = [
      { id: 'clientId', name: 'Google Client ID в config.js', status: 'pending', desc: 'Ожидание...' },
      { id: 'token', name: 'Ключ авторизации Google Token', status: 'pending', desc: 'Ожидание...' },
      { id: 'net', name: 'Связь с серверами Google API', status: 'pending', desc: 'Ожидание...' },
      { id: 'appData', name: 'Сектор хранения appDataFolder', status: 'pending', desc: 'Ожидание...' }
    ];

    const steps = isGoogle ? googleSteps : yandexSteps;

    const render = (finalVerdict = null) => {
      let content = `<div style="display: flex; flex-direction: column; gap: 8px; text-align: left;">`;
      steps.forEach(s => {
        let icon = '⏳';
        let color = 'var(--ink-muted)';
        if (s.status === 'running') { icon = '⚡'; color = 'var(--folder-amber)'; }
        if (s.status === 'ok') { icon = '✅'; color = 'var(--accent-done)'; }
        if (s.status === 'error') { icon = '❌'; color = '#CF1322'; }

        content += `
          <div style="display: flex; gap: 10px; align-items: flex-start; background: var(--bg-card); padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--border-color);">
            <span style="font-size: 1.15rem; line-height: 1.2;">${icon}</span>
            <div style="display: flex; flex-direction: column; gap: 1px;">
              <strong style="font-size: 0.88rem; color: ${s.status === 'error' ? '#CF1322' : 'var(--ink-black)'};">${s.name}</strong>
              <span style="font-size: 0.76rem; color: ${color}; line-height: 1.25;">${s.desc}</span>
            </div>
          </div>
        `;
      });
      if (finalVerdict) content += finalVerdict;
      content += `</div>`;
      if (msgEl) msgEl.innerHTML = content;
    };

    if (modal && titleEl && msgEl) {
      titleEl.textContent = isGoogle ? '🔍 Диагностика Google Диска' : '🔍 Диагностика Яндекс Диска';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (promptBox) promptBox.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = 'none';
      render();
      modal.classList.add('active');
    }

    if (isGoogle) {
      steps[0].status = 'running';
      steps[0].desc = 'Проверка настроек config.js...';
      render();
      await new Promise(r => setTimeout(r, 150));

      const gClientId = window.LifeConfig.google && window.LifeConfig.google.clientId;
      if (!gClientId || gClientId.includes('YOUR_GOOGLE')) {
        steps[0].status = 'error';
        steps[0].desc = 'Не указан Client ID в assets/js/config.js';
        steps[1].desc = 'Отменено'; steps[2].desc = 'Отменено'; steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1.5px solid #FFA39E;">Создайте OAuth Client ID в Google Cloud Console</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }
      steps[0].status = 'ok';
      steps[0].desc = 'Client ID найден.';
      render();

      steps[1].status = 'running';
      steps[1].desc = 'Проверка токена...';
      render();
      await new Promise(r => setTimeout(r, 150));

      if (!this.googleToken) {
        steps[1].status = 'error';
        steps[1].desc = 'Вход не выполнен. Нажмите «Войти через Google».';
        steps[2].desc = 'Отменено'; steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1.5px solid #FFA39E;">Требуется авторизация</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }

      steps[1].status = 'ok';
      steps[1].desc = 'Токен активен (авто-продление включено).';
      render();

      steps[2].status = 'running';
      steps[2].desc = 'Сетевой запрос к Google API...';
      render();

      try {
        const pingRes = await this.fetchWithTimeout(
          'https://www.googleapis.com/drive/v3/about?fields=user',
          { headers: { Authorization: `Bearer ${this.googleToken}` } },
          5000
        );

        if (pingRes.status === 401 || pingRes.status === 403) {
          const errData = await pingRes.json().catch(() => ({}));
          const reason = errData.error && errData.error.message ? errData.error.message : 'Доступ отклонен';
          throw new Error('403: ' + reason);
        }
        if (!pingRes.ok) throw new Error('HTTP ' + pingRes.status);

        const uData = await pingRes.json();
        const email = uData.user && uData.user.emailAddress ? uData.user.emailAddress : 'OK';
        steps[2].status = 'ok';
        steps[2].desc = `Связь стабильна. Аккаунт: ${email}`;
      } catch (err) {
        steps[2].status = 'error';
        steps[2].desc = err.message.includes('403') 
          ? 'Google заблокировал доступ (добавьте почту в Test Users в консоли Google).'
          : 'Таймаут соединения с Google (включите VPN).';
        steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1.5px solid #FFA39E;">${steps[2].desc}</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }
      render();

      steps[3].status = 'running';
      steps[3].desc = 'Проверка папки appDataFolder...';
      render();

      try {
        const folderRes = await this.fetchWithTimeout(
          `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1&fields=files(id)`,
          { headers: { Authorization: `Bearer ${this.googleToken}` } },
          5000
        );
        if (!folderRes.ok) throw new Error('HTTP ' + folderRes.status);
        steps[3].status = 'ok';
        steps[3].desc = 'Сектор appDataFolder доступен, запись разрешена.';
      } catch (err) {
        steps[3].status = 'error';
        steps[3].desc = 'Сбой доступа к папке (' + err.message + ')';
      }

    } else {
      steps[0].status = 'running';
      steps[0].desc = 'Проверка токена Яндекс ID...';
      render();
      await new Promise(r => setTimeout(r, 120));

      if (!this.yandexToken) {
        steps[0].status = 'error';
        steps[0].desc = 'Токен не найден. Нажмите «Войти через Яндекс ID».';
        steps[1].desc = 'Отменено'; steps[2].desc = 'Отменено'; steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.82rem; border: 1.5px solid #FFA39E;">Требуется авторизация</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }
      steps[0].status = 'ok';
      steps[0].desc = 'Токен найден и загружен.';
      render();

      steps[1].status = 'running';
      steps[1].desc = 'Запрос к cloud-api.yandex.net...';
      render();

      let downloadHref = null;
      try {
        const appRes = await this.fetchWithTimeout('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
          headers: { Authorization: `OAuth ${this.yandexToken}` }
        }, 4000);
        if (!appRes.ok) throw new Error(`HTTP ${appRes.status}`);
        steps[1].status = 'ok';
        steps[1].desc = 'Связь стабильна. Папка app:/ доступна.';
      } catch (e) {
        steps[1].status = 'error';
        steps[1].desc = e.message === 'TIMEOUT' ? 'Таймаут соединения с Яндексом.' : 'Отклонено Яндексом (токен недействителен).';
        steps[2].desc = 'Отменено'; steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.82rem; border: 1.5px solid #FFA39E;">Сбой связи с серверами Яндекса</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }
      render();

      steps[2].status = 'running';
      steps[2].desc = 'Тестирование шлюза Cloudflare...';
      render();

      try {
        const downMetaRes = await this.fetchWithTimeout('https://cloud-api.yandex.net/v1/disk/resources/download?path=app:/planner_data.json', {
          headers: { Authorization: `OAuth ${this.yandexToken}` }
        }, 4000);
        if (downMetaRes.ok) {
          const meta = await downMetaRes.json();
          downloadHref = meta.href;
        }
      } catch (_) {}

      try {
        if (downloadHref) {
          await this.downloadYandexFile(downloadHref);
          steps[2].status = 'ok';
          steps[2].desc = 'Шлюз ответил успешно, данные базы прочитаны.';
        } else {
          const proxyUrl = window.LifeConfig.network.proxyUrl;
          const pingRes = await this.fetchWithTimeout(`${proxyUrl}?url=${encodeURIComponent('https://downloader.disk.yandex.ru')}`, {}, 4500);
          if (!pingRes.ok && pingRes.status !== 403) throw new Error();
          steps[2].status = 'ok';
          steps[2].desc = 'Шлюз Cloudflare на связи и готов к работе.';
        }
      } catch (e) {
        steps[2].status = 'error';
        steps[2].desc = 'Шлюз заблокирован оператором (нужен VPN).';
        steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1.5px solid #FFA39E;">Домен workers.dev заблокирован. Включите VPN.</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }
      render();

      steps[3].status = 'running';
      steps[3].desc = 'Проверка разрешений на запись в хранилище...';
      render();

      try {
        const upMetaRes = await this.fetchWithTimeout('https://cloud-api.yandex.net/v1/disk/resources/upload?path=app:/planner_data.json&overwrite=true', {
          headers: { Authorization: `OAuth ${this.yandexToken}` }
        }, 4000);
        if (!upMetaRes.ok) throw new Error();
        steps[3].status = 'ok';
        steps[3].desc = 'Хранилище свободно, запись разрешена.';
      } catch (e) {
        steps[3].status = 'error';
        steps[3].desc = 'Яндекс отклонил запись (возможно, нет места).';
      }
    }

    const allOk = steps.every(s => s.status === 'ok');
    const finalBanner = allOk
      ? `<div style="margin-top: 6px; padding: 10px; background: var(--bg-subcard); border: 1.5px solid var(--accent-done); color: var(--accent-done); border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.84rem;">🎉 Все системы ${isGoogle ? 'Google Диска' : 'Яндекс Диска'} работают идеально</div>`
      : `<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; border: 1.5px solid #FFA39E; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.82rem;">Обнаружены проблемы в цепочке синхронизации</div>`;

    render(finalBanner);
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-flex';
      confirmBtn.textContent = 'Понятно';
    }
  }
};