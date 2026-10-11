// Модуль синхронизации (Яндекс Диск со 100% обходом CORS-ограничения скачивания)
window.LifeSync = {
  yandexToken: null,
  isSyncing: false,
  autoSyncTimer: null,
  status: 'NOT_CONNECTED',

  DEFAULT_CLIENT_ID: 'b8ac870907144a7ebdbcda02f5422fd7',

  init() {
    this.yandexToken = localStorage.getItem('LIFE_OS_YANDEX_TOKEN') || null;
    this.status = localStorage.getItem('LIFE_OS_SYNC_STATUS') || (this.yandexToken ? 'SYNCED' : 'NOT_CONNECTED');
    this.setupLifecycleListeners();
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
    window.addEventListener('online', () => this.silentPull());
    window.addEventListener('offline', () => {
      if (this.yandexToken) this.setStatus('OFFLINE');
    });
  },

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
    const savedClientId = localStorage.getItem('LIFE_OS_YANDEX_CLIENT_ID');
    const clientId = savedClientId || this.DEFAULT_CLIENT_ID;
    
    let cleanPath = window.location.pathname.replace(/\/index\.html$/, '');
    if (!cleanPath.endsWith('/')) cleanPath += '/';
    const redirectUri = window.location.origin + cleanPath;

    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  },

  // УМНОЕ СКАЧИВАНИЕ: Обходит блокировку CORS сервера downloader.disk.yandex.ru
  async downloadFileWithFallback(downloadHref) {
    // Попытка 1: Прямое скачивание
    try {
      const res = await fetch(downloadHref);
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {
      // Игнорируем блокировку браузера и переходим к запасному шлюзу
    }

    // Попытка 2: Шлюз AllOrigins
    try {
      const proxyUrl1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(downloadHref)}`;
      const res1 = await fetch(proxyUrl1);
      if (res1.ok) {
        return await res1.json();
      }
    } catch (_) {}

    // Попытка 3: Шлюз CorsProxy
    try {
      const proxyUrl2 = `https://corsproxy.io/?url=${encodeURIComponent(downloadHref)}`;
      const res2 = await fetch(proxyUrl2);
      if (res2.ok) {
        return await res2.json();
      }
    } catch (_) {}

    throw new Error('CORS блокировка сервера скачивания Яндекса');
  },

  async runDiagnostic() {
    const report = [];
    report.push(`📌 Версия: v1.3-gh`);
    report.push(`📌 Домен: ${window.location.origin}`);
    report.push(`📌 Токен: ${this.yandexToken ? `Есть (${this.yandexToken.slice(0, 8)}...)` : '❌ Нет'}`);

    if (!this.yandexToken) {
      report.push(`\n❌ Сначала выполните вход.`);
      return report.join('\n');
    }

    // Тест 1
    report.push(`\n[Тест 1] Проверка доступа к app:/...`);
    try {
      const appRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (!appRes.ok) throw new Error(`HTTP ${appRes.status}`);
      report.push(`✓ Папка app:/ доступна (HTTP 200 OK)`);
    } catch (e) {
      report.push(`❌ Ошибка: ${e.message}`);
      return report.join('\n');
    }

    // Тест 2
    report.push(`\n[Тест 2] Поиск planner_data.json...`);
    let downloadHref = null;
    try {
      const downMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/download?path=app:/planner_data.json', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (downMetaRes.status === 404) {
        report.push(`ℹ️ Файл еще не создан в облаке.`);
      } else if (!downMetaRes.ok) {
        report.push(`❌ Ошибка получения ссылки (HTTP ${downMetaRes.status})`);
      } else {
        const meta = await downMetaRes.json();
        downloadHref = meta.href;
        report.push(`✓ Ссылка на скачивание получена`);
      }
    } catch (e) {
      report.push(`❌ Сбой: ${e.message}`);
    }

    // Тест 3 (с обходом CORS)
    if (downloadHref) {
      report.push(`\n[Тест 3] Скачивание данных...`);
      try {
        const json = await this.downloadFileWithFallback(downloadHref);
        report.push(`✓ Данные прочитаны успешно! Задач в облаке: ${(json.tasks || []).length}`);
      } catch (e) {
        report.push(`❌ Ошибка чтения: ${e.message}`);
      }
    }

    // Тест 4
    report.push(`\n[Тест 4] Проверка прав на запись...`);
    try {
      const upMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/upload?path=app:/planner_data.json&overwrite=true', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (upMetaRes.ok) {
        report.push(`✓ Права на запись подтверждены!`);
      } else {
        report.push(`❌ Сервер записи вернул HTTP ${upMetaRes.status}`);
      }
    } catch (e) {
      report.push(`❌ Сбой: ${e.message}`);
    }

    report.push(`\n🏁 Диагностика завершена!`);
    return report.join('\n');
  },

  cleanOldTombstones(tombstones) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const cleaned = {};
    for (const [id, time] of Object.entries(tombstones || {})) {
      if (time > thirtyDaysAgo) cleaned[id] = time;
    }
    return cleaned;
  },

  mergeData(local, remote) {
    if (!remote) return local;
    if (!local) return remote;

    const localReset = local.resetAt || 0;
    const remoteReset = remote.resetAt || 0;

    if (localReset > (remote.updatedAt || 0) && localReset > remoteReset) return local;
    if (remoteReset > (local.updatedAt || 0) && remoteReset > localReset) return remote;

    const rawTombstones = { ...(local.tombstones || {}), ...(remote.tombstones || {}) };
    const tombstones = this.cleanOldTombstones(rawTombstones);

    const merged = {
      schemaVersion: 1,
      spheres: [],
      projects: [],
      tasks: [],
      inbox: [],
      tombstones: tombstones,
      resetAt: Math.max(localReset, remoteReset)
    };

    const isDeleted = (id, updatedAt) => {
      const tTime = tombstones[id];
      return tTime && tTime >= (updatedAt || 0);
    };

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
        sphereMap.set(s.id, (s.updatedAt || s.createdAt || 0) >= (localS.updatedAt || localS.createdAt || 0) ? s : localS);
      }
    });
    merged.spheres = Array.from(sphereMap.values());

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
        projectMap.set(p.id, (p.updatedAt || p.createdAt || 0) >= (localP.updatedAt || localP.createdAt || 0) ? p : localP);
      }
    });
    merged.projects = Array.from(projectMap.values());

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
        const remoteTime = t.updatedAt || t.createdAt || 0;
        const localTime = localT.updatedAt || localT.createdAt || 0;
        taskMap.set(t.id, (remoteTime >= localTime) ? t : localT);
      }
    });
    merged.tasks = Array.from(taskMap.values());

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

  setYandexToken(token) {
    this.yandexToken = token.trim();
    localStorage.setItem('LIFE_OS_YANDEX_TOKEN', this.yandexToken);
    this.setStatus('SYNCING');
  },

  unlinkYandex() {
    this.yandexToken = null;
    localStorage.removeItem('LIFE_OS_YANDEX_TOKEN');
    localStorage.removeItem('LIFE_OS_LAST_SYNC_TS');
    this.setStatus('NOT_CONNECTED');
  },

  async syncWithYandexDisk(callback, silent = false) {
    if (!this.yandexToken) {
      this.setStatus('NOT_CONNECTED');
      if (callback) callback({ success: false, error: 'Токен не указан' });
      return;
    }

    this.isSyncing = true;
    this.setStatus('SYNCING');
    const filePath = 'app:/planner_data.json';
    const cacheBuster = Date.now();

    try {
      let remoteData = null;

      // 1. Метаданные скачивания
      const downMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(filePath)}&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (downMetaRes.status === 401 || downMetaRes.status === 403) {
        this.setStatus('AUTH_ERROR');
        throw new Error('Токен Яндекса недействителен или нет прав на папку app:/');
      }

      if (downMetaRes.status === 404) {
        remoteData = null;
      } else if (!downMetaRes.ok) {
        throw new Error(`Ошибка сервиса Яндекса (HTTP ${downMetaRes.status})`);
      } else {
        const downMeta = await downMetaRes.json();
        // Скачиваем файл через каскадный шлюз с обходом CORS
        remoteData = await this.downloadFileWithFallback(downMeta.href);
      }

      // 2. Объединяем данные
      const localData = window.LifeState.data || window.LifeStorage.load();
      const mergedData = this.mergeData(localData, remoteData);

      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      // 3. Получаем ссылку на загрузку
      const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (upMetaRes.status === 401 || upMetaRes.status === 403) {
        this.setStatus('AUTH_ERROR');
        throw new Error('Токен недействителен или нет прав на запись');
      }

      if (!upMetaRes.ok) {
        throw new Error(`Ошибка адреса загрузки (HTTP ${upMetaRes.status})`);
      }

      const upMeta = await upMetaRes.json();

      // 4. Отправляем обновленный файл на Диск
      const uploadRes = await fetch(upMeta.href, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedData)
      });

      if (!uploadRes.ok && uploadRes.status !== 201 && uploadRes.status !== 200 && uploadRes.status !== 202) {
        throw new Error(`Сбой записи на Диск (HTTP ${uploadRes.status})`);
      }

      this.isSyncing = false;
      localStorage.setItem('LIFE_OS_LAST_SYNC_TS', Date.now().toString());
      this.setStatus('SYNCED');

      if (callback) callback({ success: true, timestamp: Date.now(), silent });
    } catch (err) {
      this.isSyncing = false;
      const isAuthErr = err.message.includes('недействителен') || err.message.includes('нет прав');
      if (isAuthErr) {
        this.setStatus('AUTH_ERROR');
      } else {
        this.setStatus('OFFLINE');
      }
      if (callback) callback({ success: false, error: err.message, isAuthErr, silent });
    }
  },

  silentPull() {
    if (this.isSyncing || !this.yandexToken) return;

    this.syncWithYandexDisk((res) => {
      if (res.success && window.LifeUI) {
        window.LifeUI.onSilentSyncCompleted();
      } else if (res.isAuthErr && window.LifeUI) {
        window.LifeUI.showToast('⚠️ Яндекс Диск: требуется повторный вход', 'error');
      }
    }, true);
  },

  triggerAutoSync() {
    if (!this.yandexToken) return;

    clearTimeout(this.autoSyncTimer);
    this.autoSyncTimer = setTimeout(() => {
      this.silentPull();
    }, 2500);
  }
};