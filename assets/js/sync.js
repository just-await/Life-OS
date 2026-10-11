// Модуль синхронизации (Яндекс Диск со встроенным диагностическим сканером)
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

  // ПОШАГОВЫЙ СКАНЕР ДИАГНОСТИКИ (ОПРЕДЕЛЯЕТ ТОЧНУЮ ПРИЧИНУ СБОЯ)
  async runDiagnostic() {
    const report = [];
    report.push(`📌 Версия кода: v1.3-gh`);
    report.push(`📌 Домен сайта: ${window.location.origin}`);
    report.push(`📌 Токен в памяти: ${this.yandexToken ? `Есть (${this.yandexToken.slice(0, 7)}...)` : '❌ Отсутствует'}`);

    if (!this.yandexToken) {
      report.push(`\n❌ Ошибка: Сначала войдите в Яндекс ID или укажите токен.`);
      return report.join('\n');
    }

    // Шаг 1: Доступность шлюза API Яндекса
    report.push(`\n[Тест 1] Проверка доступа к cloud-api.yandex.net...`);
    try {
      const diskInfoRes = await fetch('https://cloud-api.yandex.net/v1/disk', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (diskInfoRes.status === 401 || diskInfoRes.status === 403) {
        report.push(`❌ Токен не принят Яндексом (HTTP ${diskInfoRes.status}). Нужен повторный вход.`);
        return report.join('\n');
      }
      if (!diskInfoRes.ok) {
        report.push(`❌ Шлюз Яндекса вернул ошибку HTTP ${diskInfoRes.status}`);
        return report.join('\n');
      }
      report.push(`✓ Шлюз API доступен, токен действителен (HTTP 200 OK)`);
    } catch (e) {
      report.push(`❌ Блокировка шлюза API: ${e.message} (CORS / AdGuard / Блокировка DNS)`);
      return report.join('\n');
    }

    // Шаг 2: Проверка ссылки на скачивание
    report.push(`\n[Тест 2] Запрос ссылки на скачивание файла...`);
    let downloadHref = null;
    try {
      const downMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/download?path=app:/planner_data.json', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (downMetaRes.status === 404) {
        report.push(`ℹ️ Файл planner_data.json еще не создан в облаке (это норма при первой загрузке).`);
      } else if (!downMetaRes.ok) {
        report.push(`❌ Ошибка получения ссылки (HTTP ${downMetaRes.status})`);
      } else {
        const meta = await downMetaRes.json();
        downloadHref = meta.href;
        report.push(`✓ Ссылка на скачивание получена от Яндекса`);
      }
    } catch (e) {
      report.push(`❌ Сбой запроса ссылки: ${e.message}`);
    }

    // Шаг 3: Тест скачивания (downloader.disk.yandex.ru)
    if (downloadHref) {
      report.push(`\n[Тест 3] Скачивание содержимого файла...`);
      try {
        const fileRes = await fetch(downloadHref);
        if (!fileRes.ok) {
          report.push(`❌ Сервер хранилища вернул HTTP ${fileRes.status}`);
        } else {
          const json = await fileRes.json();
          report.push(`✓ Файл успешно прочитан из облака! Задач в облаке: ${(json.tasks || []).length}`);
        }
      } catch (e) {
        report.push(`❌ Блокировка сервера скачивания: ${e.message}`);
        report.push(`💡 Причина: downloader.disk.yandex.ru заблокирован браузером по политике CORS.`);
      }
    }

    // Шаг 4: Тест ссылки на загрузку
    report.push(`\n[Тест 4] Проверка ссылки на запись файла...`);
    let uploadHref = null;
    try {
      const upMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/upload?path=app:/planner_data.json&overwrite=true', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (!upMetaRes.ok) {
        report.push(`❌ Ошибка ссылки загрузки (HTTP ${upMetaRes.status})`);
      } else {
        const upMeta = await upMetaRes.json();
        uploadHref = upMeta.href;
        report.push(`✓ Ссылка на загрузку получена успешно`);
      }
    } catch (e) {
      report.push(`❌ Сбой запроса загрузки: ${e.message}`);
    }

    report.push(`\n🏁 Диагностика завершена.`);
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
        throw new Error('Токен Яндекса недействителен или отозван');
      }

      if (downMetaRes.status === 404) {
        remoteData = null;
      } else if (!downMetaRes.ok) {
        throw new Error(`Ошибка сервиса Яндекса (HTTP ${downMetaRes.status})`);
      } else {
        const downMeta = await downMetaRes.json();
        
        // 2. Скачивание файла
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
        throw new Error('Токен Яндекса недействителен или отозван');
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
      const isAuthErr = err.message.includes('недействителен') || err.message.includes('отозван');
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
        window.LifeUI.showToast('⚠️ Яндекс Диск: токен недействителен', 'error');
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