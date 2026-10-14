// assets/js/sync.js
// Бронебойный модуль синхронизации Life OS: Яндекс Диск + Google Диск
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
    this.provider = localStorage.getItem('LIFE_OS_CLOUD_PROVIDER') || 'yandex';
    this.yandexToken = localStorage.getItem('LIFE_OS_YANDEX_TOKEN') || null;
    this.googleToken = localStorage.getItem('LIFE_OS_GOOGLE_TOKEN') || null;
    this.googleTokenExpiresAt = Number(localStorage.getItem('LIFE_OS_GOOGLE_EXPIRES')) || 0;
    this.googleFileId = localStorage.getItem('LIFE_OS_GOOGLE_FILE_ID') || null;

    const currentToken = this.getCurrentToken();
    this.status = localStorage.getItem('LIFE_OS_SYNC_STATUS') || (currentToken ? 'SYNCED' : 'NOT_CONNECTED');

    this.initGoogleClient();
    this.setupLifecycleListeners();
  },

  getCurrentToken() {
    return this.provider === 'google' ? this.googleToken : this.yandexToken;
  },

  setProvider(newProvider) {
    this.provider = newProvider;
    localStorage.setItem('LIFE_OS_CLOUD_PROVIDER', newProvider);
    const token = this.getCurrentToken();
    this.setStatus(token ? 'SYNCED' : 'NOT_CONNECTED');
    if (window.LifeUI && window.LifeUI.updateCloudStatusUI) {
      window.LifeUI.updateCloudStatusUI();
    }
  },

  setStatus(newStatus) {
    this.status = newStatus;
    localStorage.setItem('LIFE_OS_SYNC_STATUS', newStatus);
    if (window.LifeUI && window.LifeUI.updateCloudStatusUI) {
      window.LifeUI.updateCloudStatusUI();
    }
  },

  setupLifecycleListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.silentPull();
    });
    window.addEventListener('online', () => {
      if (localStorage.getItem('LIFE_OS_SYNC_PENDING') === 'true') {
        this.silentPull();
      }
    });
    window.addEventListener('offline', () => {
      if (this.getCurrentToken()) this.setStatus('OFFLINE');
    });
  },

  // 1. АВТОРИЗАЦИЯ ЯНДЕКС ID
  checkUrlToken() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');
      if (token && token.startsWith('y0_')) {
        this.setYandexToken(token);
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
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
    window.location.href = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  },

  setYandexToken(token) {
    this.yandexToken = token.trim();
    localStorage.setItem('LIFE_OS_YANDEX_TOKEN', this.yandexToken);
    this.setStatus('SYNCING');
  },

  unlinkYandex() {
    this.yandexToken = null;
    localStorage.removeItem('LIFE_OS_YANDEX_TOKEN');
    localStorage.removeItem('LIFE_OS_LAST_SYNC_TS_YANDEX');
    this.setStatus('NOT_CONNECTED');
  },

  // 2. АВТОРИЗАЦИЯ GOOGLE ДИСК
  initGoogleClient() {
    if (typeof window.google !== 'undefined' && window.google.accounts && window.LifeConfig.google && window.LifeConfig.google.clientId && !window.LifeConfig.google.clientId.includes('YOUR_GOOGLE')) {
      try {
        this.googleTokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: window.LifeConfig.google.clientId,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: (res) => {
            if (res.access_token) {
              this.setGoogleToken(res.access_token, res.expires_in);
              window.LifeUI.showToast('🎉 Google Диск подключен!');
              this.syncWithCurrentCloud();
            }
          }
        });
      } catch (e) {
        console.warn('Google Identity Client init:', e);
      }
    }
  },

  startGoogleLogin() {
    if (!window.LifeConfig.google || !window.LifeConfig.google.clientId || window.LifeConfig.google.clientId.includes('YOUR_GOOGLE')) {
      window.LifeUI.customAlert(
        `Чтобы включить Google Диск, укажите ваш <strong>Client ID</strong> в файле <code>assets/js/config.js</code>.`,
        'Настройка Google Диска'
      );
      return;
    }

    if (this.googleTokenClient) {
      this.googleTokenClient.requestAccessToken();
    } else {
      this.initGoogleClient();
      if (this.googleTokenClient) this.googleTokenClient.requestAccessToken();
    }
  },

  setGoogleToken(token, expiresIn = 3600) {
    this.googleToken = token.trim();
    this.googleTokenExpiresAt = Date.now() + (Number(expiresIn) * 1000);
    localStorage.setItem('LIFE_OS_GOOGLE_TOKEN', this.googleToken);
    localStorage.setItem('LIFE_OS_GOOGLE_EXPIRES', this.googleTokenExpiresAt.toString());
    this.setStatus('SYNCING');
  },

  unlinkGoogle() {
    this.googleToken = null;
    this.googleTokenExpiresAt = 0;
    this.googleFileId = null;
    localStorage.removeItem('LIFE_OS_GOOGLE_TOKEN');
    localStorage.removeItem('LIFE_OS_GOOGLE_EXPIRES');
    localStorage.removeItem('LIFE_OS_GOOGLE_FILE_ID');
    localStorage.removeItem('LIFE_OS_LAST_SYNC_TS_GOOGLE');
    this.setStatus('NOT_CONNECTED');
  },

  // 3. СЕТЕВЫЕ ЗАПРОСЫ
  async fetchWithTimeout(url, options = {}, timeoutMs = 8500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('TIMEOUT');
      throw err;
    }
  },

  async downloadYandexFile(downloadHref) {
    try {
      const directRes = await this.fetchWithTimeout(downloadHref, {}, 3000);
      if (directRes.ok) return await directRes.json();
    } catch (_) {}

    const proxyUrl = window.LifeConfig.network.proxyUrl;
    if (proxyUrl) {
      try {
        const proxyRes = await this.fetchWithTimeout(`${proxyUrl}?url=${encodeURIComponent(downloadHref)}`, {}, 8500);
        if (proxyRes.ok) return await proxyRes.json();
        throw new Error(`HTTP ${proxyRes.status}`);
      } catch (err) {
        if (err.message === 'TIMEOUT' || err.name === 'AbortError') {
          throw new Error('TIMEOUT: Шлюз не ответил вовремя');
        }
        throw new Error(`Ошибка шлюза (${err.message})`);
      }
    }
    throw new Error('Шлюз недоступен');
  },

  // 4. ПЕРЕВОДЧИК ОШИБОК
  translateError(err, provider = 'yandex') {
    const msg = String(err.message || err);
    const cloudName = provider === 'yandex' ? 'Яндекс Диска' : 'Google Диска';

    if (msg.includes('AUTH_ERROR') || msg.includes('401') || msg.includes('403')) {
      return {
        title: 'Срок действия входа истёк',
        text: `Ключ авторизации для ${cloudName} устарел. Ваши данные сохранены на устройстве. Нажмите «Войти снова».`,
        type: 'auth'
      };
    }

    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('IO failure') || msg.includes('нет хостов')) {
      return {
        title: `Серверы ${cloudName} перегружены`,
        text: `Облако вернуло временный сбой файлового сектора. Все задачи сохранены на вашем телефоне. Нажмите «Пересоздать», чтобы записать свежий файл.`,
        type: 'recreate'
      };
    }

    if (msg.includes('TIMEOUT') || msg.includes('Failed to fetch') || !navigator.onLine) {
      return {
        title: 'Офлайн-режим (нет связи)',
        text: `Нет устойчивого соединения с ${cloudName}. Вы можете спокойно продолжать писать задачи — планер синхронизирует их автоматически при появлении сети.`,
        type: 'offline'
      };
    }

    return {
      title: 'Сбой синхронизации',
      text: `Облако ответило: ${msg.slice(0, 120)}. Ваши данные на устройстве в полной безопасности.`,
      type: 'retry'
    };
  },

  cleanOldTombstones(tombstones) {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const cleaned = {};
    for (const [id, time] of Object.entries(tombstones || {})) {
      if (time > ninetyDaysAgo) cleaned[id] = time;
    }
    return cleaned;
  },

  // 5. ИСПРАВЛЕННОЕ СЛИЯНИЕ ДАННЫХ
  mergeData(local, remote) {
    if (!remote) return local;
    if (!local) return remote;

    const localHasData = (local.tasks && local.tasks.length > 0) || (local.spheres && local.spheres.length > 0);
    const remoteHasData = (remote.tasks && remote.tasks.length > 0) || (remote.spheres && remote.spheres.length > 0);

    // Если на устройстве 0 задач, а в облаке они есть — безоговорочно берем облако
    if (!localHasData && remoteHasData) {
      return remote;
    }

    const rawTombstones = { ...(local.tombstones || {}), ...(remote.tombstones || {}) };
    const tombstones = this.cleanOldTombstones(rawTombstones);

    const merged = {
      schemaVersion: 1,
      isOnboarding: false,
      spheres: [],
      projects: [],
      tasks: [],
      inbox: [],
      tombstones: tombstones,
      resetAt: 0
    };

    const isDeleted = (id, updatedAt) => {
      const tTime = tombstones[id];
      return tTime && tTime >= (updatedAt || 0);
    };

    // Сферы
    const sphereMap = new Map();
    (local.spheres || []).forEach(s => {
      if (!isDeleted(s.id, s.updatedAt || s.createdAt)) sphereMap.set(s.id, s);
    });
    (remote.spheres || []).forEach(s => {
      if (isDeleted(s.id, s.updatedAt || s.createdAt)) return;
      if (!sphereMap.has(s.id)) {
        sphereMap.set(s.id, s);
      } else {
        const localS = sphereMap.get(s.id);
        const remoteRev = s.rev || 0;
        const localRev = localS.rev || 0;
        if (remoteRev > localRev) sphereMap.set(s.id, s);
        else if (remoteRev === localRev) {
          sphereMap.set(s.id, (s.updatedAt || s.createdAt || 0) >= (localS.updatedAt || localS.createdAt || 0) ? s : localS);
        }
      }
    });
    merged.spheres = Array.from(sphereMap.values());

    // Проекты
    const projectMap = new Map();
    (local.projects || []).forEach(p => {
      if (!isDeleted(p.id, p.updatedAt || p.createdAt)) projectMap.set(p.id, p);
    });
    (remote.projects || []).forEach(p => {
      if (isDeleted(p.id, p.updatedAt || p.createdAt)) return;
      if (!projectMap.has(p.id)) {
        projectMap.set(p.id, p);
      } else {
        const localP = projectMap.get(p.id);
        const remoteRev = p.rev || 0;
        const localRev = localP.rev || 0;
        if (remoteRev > localRev) projectMap.set(p.id, p);
        else if (remoteRev === localRev) {
          projectMap.set(p.id, (p.updatedAt || p.createdAt || 0) >= (localP.updatedAt || localP.createdAt || 0) ? p : localP);
        }
      }
    });
    merged.projects = Array.from(projectMap.values());

    // Задачи
    const taskMap = new Map();
    (local.tasks || []).forEach(t => {
      if (!isDeleted(t.id, t.updatedAt || t.createdAt)) taskMap.set(t.id, t);
    });
    (remote.tasks || []).forEach(t => {
      if (isDeleted(t.id, t.updatedAt || t.createdAt)) return;
      if (!taskMap.has(t.id)) {
        taskMap.set(t.id, t);
      } else {
        const localT = taskMap.get(t.id);
        const remoteRev = t.rev || 0;
        const localRev = localT.rev || 0;
        if (remoteRev > localRev) taskMap.set(t.id, t);
        else if (remoteRev === localRev) {
          const remoteTime = t.updatedAt || t.createdAt || 0;
          const localTime = localT.updatedAt || localT.createdAt || 0;
          taskMap.set(t.id, (remoteTime >= localTime) ? t : localT);
        }
      }
    });
    merged.tasks = Array.from(taskMap.values());

    // Инбокс
    const inboxMap = new Map();
    (local.inbox || []).forEach(i => {
      if (!isDeleted(i.id, i.createdAt)) inboxMap.set(i.id, i);
    });
    (remote.inbox || []).forEach(i => {
      if (!isDeleted(i.id, i.createdAt) && !inboxMap.has(i.id)) {
        inboxMap.set(i.id, i);
      }
    });
    merged.inbox = Array.from(inboxMap.values());

    return merged;
  },

  // 6. БРОНЕБОЙНАЯ ЗАПИСЬ В GOOGLE ДИСК (БЕЗ MULTIPART И БЕЗ СБОЕВ 400)
  async uploadRawGoogleData(data) {
    let fileId = this.googleFileId;

    // 1. Если ID файла не сохранен локально — ищем в appDataFolder
    if (!fileId) {
      const listRes = await this.fetchWithTimeout(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='planner_data.json' and trashed=false&orderBy=modifiedTime desc&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${this.googleToken}` } }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.files && listData.files.length > 0) {
          fileId = listData.files[0].id;
          this.googleFileId = fileId;
          localStorage.setItem('LIFE_OS_GOOGLE_FILE_ID', fileId);
        }
      }
    }

    // 2. Если файла нет в Google Диске — создаем его через чистый JSON (Шаг 1 создания)
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

      if (!createMetaRes.ok) {
        throw new Error(`Google API Create error: HTTP ${createMetaRes.status}`);
      }

      const createdMeta = await createMetaRes.json();
      fileId = createdMeta.id;
      this.googleFileId = fileId;
      localStorage.setItem('LIFE_OS_GOOGLE_FILE_ID', fileId);
    }

    // 3. Заливаем содержимое базы через прямой PATCH uploadType=media (Шаг 2 записи контента)
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
      // Если файл был удален на сервере Google вручную — сбрасываем ID для авто-пересоздания
      if (patchRes.status === 404) {
        this.googleFileId = null;
        localStorage.removeItem('LIFE_OS_GOOGLE_FILE_ID');
      }
      throw new Error(`Google API Patch error: HTTP ${patchRes.status}`);
    }

    return true;
  },

  // ПРИНУДИТЕЛЬНАЯ ВЫГРУЗКА БЭКАПА В ОБЛАКО (ПОСЛЕ ИМПОРТА)
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
        await this.uploadRawGoogleData(localData);
        localStorage.setItem('LIFE_OS_LAST_SYNC_TS_GOOGLE', Date.now().toString());
      }

      this.isSyncing = false;
      localStorage.removeItem('LIFE_OS_SYNC_PENDING');
      this.setStatus('SYNCED');
    } catch (e) {
      console.warn('Ошибка выгрузки бэкапа в облако:', e);
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

  // ЯНДЕКС ДИСК
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
      let remoteData = null;

      const downMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(filePath)}&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (downMetaRes.status === 401 || downMetaRes.status === 403) {
        throw new Error('AUTH_ERROR: Токен Яндекса недействителен');
      }

      if (downMetaRes.status === 404) {
        remoteData = null;
      } else if (!downMetaRes.ok) {
        throw new Error(`HTTP ${downMetaRes.status}`);
      } else {
        const downMeta = await downMetaRes.json();
        let rawDownload = await this.downloadYandexFile(downMeta.href);
        if (rawDownload && rawDownload.data) rawDownload = rawDownload.data;
        if (rawDownload && typeof rawDownload === 'object') {
          remoteData = rawDownload;
        }
      }

      const localData = window.LifeState.data || window.LifeStorage.load();
      window.LifeStorage.savePreSyncSnapshot(localData);

      const mergedData = this.mergeData(localData, remoteData);
      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (upMetaRes.status === 401 || upMetaRes.status === 403) {
        throw new Error('AUTH_ERROR: Нет прав на запись');
      }

      if (!upMetaRes.ok) throw new Error(`HTTP ${upMetaRes.status}`);
      const upMeta = await upMetaRes.json();

      const uploadRes = await fetch(upMeta.href, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedData)
      });

      if (!uploadRes.ok && ![200, 201, 202].includes(uploadRes.status)) {
        throw new Error(`HTTP ${uploadRes.status}`);
      }

      this.isSyncing = false;
      localStorage.setItem('LIFE_OS_LAST_SYNC_TS_YANDEX', Date.now().toString());
      localStorage.removeItem('LIFE_OS_SYNC_PENDING');
      this.setStatus('SYNCED');

      if (callback) callback({ success: true, timestamp: Date.now(), silent });

    } catch (err) {
      this.isSyncing = false;
      const isAuth = String(err.message).includes('AUTH_ERROR');
      this.setStatus(isAuth ? 'AUTH_ERROR' : 'OFFLINE');
      if (callback) callback({ success: false, error: err.message, isAuthErr: isAuth, silent });
    }
  },

  // GOOGLE ДИСК
  async syncWithGoogleDrive(callback, silent = false) {
    if (!this.googleToken) {
      this.setStatus('NOT_CONNECTED');
      if (callback) callback({ success: false, error: 'Токен Google не указан' });
      return;
    }

    if (Date.now() > this.googleTokenExpiresAt) {
      this.setStatus('AUTH_ERROR');
      if (callback) callback({ success: false, error: 'AUTH_ERROR: Срок действия токена Google истек', isAuthErr: true });
      return;
    }

    this.isSyncing = true;
    this.setStatus('SYNCING');
    localStorage.setItem('LIFE_OS_SYNC_PENDING', 'true');

    try {
      let fileId = this.googleFileId;

      // 1. Поиск файла
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
        }
      }

      let remoteData = null;

      // 2. Скачивание существующего файла
      if (fileId) {
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

      // 3. Слияние с локальной базой
      const localData = window.LifeState.data || window.LifeStorage.load();
      window.LifeStorage.savePreSyncSnapshot(localData);

      const mergedData = this.mergeData(localData, remoteData);
      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      // 4. Безотказная выгрузка обратно в Google Диск
      await this.uploadRawGoogleData(mergedData);

      this.isSyncing = false;
      localStorage.setItem('LIFE_OS_LAST_SYNC_TS_GOOGLE', Date.now().toString());
      localStorage.removeItem('LIFE_OS_SYNC_PENDING');
      this.setStatus('SYNCED');

      if (callback) callback({ success: true, timestamp: Date.now(), silent });

    } catch (err) {
      this.isSyncing = false;
      const isAuth = String(err.message).includes('AUTH_ERROR');
      this.setStatus(isAuth ? 'AUTH_ERROR' : 'OFFLINE');
      if (callback) callback({ success: false, error: err.message, isAuthErr: isAuth, silent });
    }
  },

  // 7. ЭКСТРЕННОЕ ПЕРЕСОЗДАНИЕ БИТОГО ФАЙЛА В ОБЛАКЕ
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
      this.silentPull();
    }, 2200);
  },

  // 8. 100% РЕАЛЬНАЯ ЖИВАЯ ДИАГНОСТИКА С ЛОГАМИ
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

      if (Date.now() > this.googleTokenExpiresAt) {
        steps[1].status = 'error';
        steps[1].desc = 'Срок ключа истёк. Нажмите «Войти через Google».';
        steps[2].desc = 'Отменено'; steps[3].desc = 'Отменено';
        render(`<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1.5px solid #FFA39E;">Срок токена истёк</div>`);
        if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
        return;
      }
      steps[1].status = 'ok';
      steps[1].desc = 'Токен активен (осталось ' + Math.round((this.googleTokenExpiresAt - Date.now()) / 60000) + ' мин).';
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