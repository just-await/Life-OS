// Модуль синхронизации (Яндекс Диск: точная проверка прав app:/)
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

  // ТОЧНЫЙ СКАНЕР ДИАГНОСТИКИ С ПРОВЕРКОЙ ПАПКИ app:/
  async runDiagnostic() {
    const report = [];
    report.push(`📌 Версия кода: v1.3-gh`);
    report.push(`📌 Домен: ${window.location.origin}`);
    report.push(`📌 Токен: ${this.yandexToken ? `Есть (${this.yandexToken.slice(0, 8)}...)` : '❌ Отсутствует'}`);

    if (!this.yandexToken) {
      report.push(`\n❌ Ошибка: Токен не найден в памяти. Сначала войдите в Яндекс ID.`);
      return report.join('\n');
    }

    // Тест 1: Проверка доступа к изолированной папке приложения app:/
    report.push(`\n[Тест 1] Проверка доступа к папке приложения app:/...`);
    try {
      const appRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (appRes.status === 401 || appRes.status === 403) {
        const errJson = await appRes.json().catch(() => ({}));
        const reason = errJson.message || errJson.description || `HTTP ${appRes.status}`;
        report.push(`❌ Ошибка доступа (${reason}).`);
        report.push(`💡 Проверьте в кабинете oauth.yandex.ru: включена ли галочка «Доступ к папке приложения на Диске» (cloud-api:disk.app_folder).`);
        return report.join('\n');
      }

      if (!appRes.ok) {
        report.push(`❌ Ответ Яндекса: HTTP ${appRes.status}`);
        return report.join('\n');
      }

      report.push(`✓ Папка app:/ доступна! Токен полностью рабочий (HTTP 200 OK)`);
    } catch (e) {
      report.push(`❌ Ошибка связи с API: ${e.message}`);
      return report.join('\n');
    }

    // Тест 2: Запрос ссылки на файл planner_data.json
    report.push(`\n[Тест 2] Поиск файла planner_data.json...`);
    let downloadHref = null;
    try {
      const downMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/download?path=app:/planner_data.json', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (downMetaRes.status === 404) {
        report.push(`ℹ️ Файл planner_data.json пока не создан (он появится при первой синхронизации).`);
      } else if (!downMetaRes.ok) {
        report.push(`❌ Ошибка получения ссылки (HTTP ${downMetaRes.status})`);
      } else {
        const meta = await downMetaRes.json();
        downloadHref = meta.href;
        report.push(`✓ Ссылка на чтение получена`);
      }
    } catch (e) {
      report.push(`❌ Сбой запроса: ${e.message}`);
    }

    // Тест 3: Скачивание данных из хранилища (если файл есть)
    if (downloadHref) {
      report.push(`\n[Тест 3] Скачивание данных...`);
      try {
        const fileRes = await fetch(downloadHref);
        if (!fileRes.ok) {
          report.push(`❌ Ошибка скачивания (HTTP ${fileRes.status})`);
        } else {
          const json = await fileRes.json();
          report.push(`✓ Данные прочитаны! Задач в облаке: ${(json.tasks || []).length}`);
        }
      } catch (e) {
        report.push(`❌ Ошибка чтения файла: ${e.message}`);
      }
    }

    // Тест 4: Ссылка на запись
    report.push(`\n[Тест 4] Проверка прав на запись в облако...`);
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
      report.push(`❌ Сбой запроса: ${e.message}`);
    }

    report.push(`\n🏁 Диагностика завершена успешно!`);
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
      if (!isDeleted(s.id, s.updatedAt || s.createdAt)) return;
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
      if (!isDeleted(p.id, p.updatedAt || p.createdAt)) return;
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
      if (!isDeleted(t.id, t.updatedAt || t.createdAt)) return;
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
      if (!isDeleted(i.id, i.createdAt) && !inboxMap.has(i.id)) inboxMap.set(i.id, i);
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
        
        // 2. Скачивание файла по чистой ссылке
        const fileRes = await fetch(downMeta.href);
        if (!fileRes.ok) {
          throw new Error(`Ошибка чтения файла (HTTP ${fileRes.status})`);
        }
        remoteData = await fileRes.json();
      }

      // 3. Слияние данных
      const localData = window.LifeState.data || window.LifeStorage.load();
      const mergedData = this.mergeData(localData, remoteData);

      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      // 4. Ссылка на загрузку
      const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (upMetaRes.status === 401 || upMetaRes.status === 403) {
        this.setStatus('AUTH_ERROR');
        throw new Error('Токен Яндекса недействителен или нет прав на запись');
      }

      if (!upMetaRes.ok) {
        throw new Error(`Ошибка адреса загрузки (HTTP ${upMetaRes.status})`);
      }

      const upMeta = await upMetaRes.json();

      // 5. Запись на Диск
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