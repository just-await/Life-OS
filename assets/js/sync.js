// Модуль синхронизации (Яндекс Диск: чистый Local-First)
window.LifeSync = {
  yandexToken: null,
  isSyncing: false,
  autoSyncTimer: null,
  status: 'NOT_CONNECTED',

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
    const clientId = window.LifeConfig.yandex.clientId;
    
    let cleanPath = window.location.pathname.replace(/\/index\.html$/, '');
    if (!cleanPath.endsWith('/')) cleanPath += '/';
    const redirectUri = window.location.origin + cleanPath;

    const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = authUrl;
  },

  // ЧИСТОЕ СКАЧИВАНИЕ ЧЕРЕЗ ВАШ ПЕРСОНАЛЬНЫЙ ШЛЮЗ
  async downloadFile(downloadHref) {
    try {
      const directRes = await fetch(downloadHref);
      if (directRes.ok) return await directRes.json();
    } catch (_) {}

    const proxyUrl = window.LifeConfig.network.proxyUrl;
    if (proxyUrl && !proxyUrl.includes('ваше-имя')) {
      const proxyRes = await fetch(`${proxyUrl}?url=${encodeURIComponent(downloadHref)}`);
      if (proxyRes.ok) return await proxyRes.json();
      throw new Error(`Ошибка ответа шлюза (HTTP ${proxyRes.status})`);
    }

    throw new Error('Укажите адрес вашего личного Worker в config.js');
  },

  async runDiagnostic() {
    let html = `<div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem; text-align: left;">`;
    
    const addStep = (status, title, desc = '') => {
      const icon = status === 'ok' ? '✅' : (status === 'error' ? '❌' : 'ℹ️');
      const titleColor = status === 'error' ? '#CF1322' : 'var(--ink-black)';
      html += `
        <div style="display: flex; gap: 10px; align-items: flex-start; background: var(--bg-card); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color);">
          <span style="font-size: 1.1rem; line-height: 1.2;">${icon}</span>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <strong style="color: ${titleColor};">${title}</strong>
            ${desc ? `<span style="font-size: 0.78rem; color: var(--ink-muted); line-height: 1.3;">${desc}</span>` : ''}
          </div>
        </div>`;
    };

    // 1. Проверка токена
    if (!this.yandexToken) {
      addStep('error', 'Токен авторизации не найден', 'Сначала выполните вход через Яндекс ID.');
      return html + '</div>';
    }
    addStep('ok', 'Токен Яндекс ID найден', 'Ключ авторизации сохранен на устройстве.');

    // 2. Проверка доступа к Яндекс Диску (сервера Яндекса)
    let downloadHref = null;
    try {
      const appRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources?path=app:/', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (!appRes.ok) throw new Error(`HTTP ${appRes.status}`);
      addStep('ok', 'Связь с серверами Яндекса есть', 'Папка приложения app:/ доступна.');
    } catch (e) {
      addStep('error', 'Сбой доступа к Яндекс Диску', 'Возможно, токен устарел. Попробуйте войти заново.');
      return html + '</div>';
    }

    // 3. Получение метаданных файла
    try {
      const downMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/download?path=app:/planner_data.json', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (downMetaRes.status === 404) {
        addStep('info', 'Файл базы в облаке еще не создан', 'Это нормально, если синхронизация запускается впервые.');
      } else if (downMetaRes.ok) {
        const meta = await downMetaRes.json();
        downloadHref = meta.href;
        addStep('ok', 'Файл базы найден на Диске', 'Ссылка на чтение данных успешно получена.');
      }
    } catch (e) {
      addStep('error', 'Ошибка получения ссылки на файл', e.message);
    }

    // 4. НАСТОЯЩИЙ ТЕСТ ПРОКСИ-ШЛЮЗА CLOUDFLARE (Проверка блокировки РКН / VPN)
    if (downloadHref) {
      try {
        const json = await this.downloadFile(downloadHref);
        addStep('ok', 'Прокси-шлюз Cloudflare работает', `Данные успешно прочитаны через шлюз. Задач в облаке: ${(json.tasks || []).length}`);
      } catch (e) {
        addStep('error', 'Шлюз Cloudflare заблокирован (Нужен VPN)', 'Домен workers.dev заблокирован провайдерами РФ. Включите VPN или привяжите свой домен к Worker.');
        html += `<div style="margin-top: 6px; padding: 8px; background: #FFF1F0; color: #CF1322; border-radius: 8px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1px solid #FFA39E;">Синхронизация невозможна без VPN из-за блокировки шлюза</div></div>`;
        return html;
      }
    } else {
      // Если файла еще нет, тестируем сам шлюз тестовым запросом
      try {
        const proxyUrl = window.LifeConfig.network.proxyUrl;
        const testRes = await fetch(`${proxyUrl}?url=${encodeURIComponent('https://yandex.ru')}`);
        if (!testRes.ok && testRes.status !== 200) throw new Error();
        addStep('ok', 'Прокси-шлюз Cloudflare доступен', 'Соединение со шлюзом прошло проверку.');
      } catch (e) {
        addStep('error', 'Шлюз Cloudflare недоступен (Нужен VPN)', 'Домен workers.dev заблокирован в РФ. Включите VPN.');
        html += `<div style="margin-top: 6px; padding: 8px; background: #FFF1F0; color: #CF1322; border-radius: 8px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1px solid #FFA39E;">Синхронизация невозможна без VPN из-за блокировки шлюза</div></div>`;
        return html;
      }
    }

    // 5. Проверка прав на запись
    try {
      const upMetaRes = await fetch('https://cloud-api.yandex.net/v1/disk/resources/upload?path=app:/planner_data.json&overwrite=true', {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });
      if (upMetaRes.ok) {
        addStep('ok', 'Права на запись в облако подтверждены', 'Яндекс готов сохранять изменения.');
      } else {
        throw new Error();
      }
    } catch (e) {
      addStep('error', 'Яндекс отклонил запрос на запись', 'Проверьте свободное место на Диске.');
    }

    html += `<div style="margin-top: 6px; padding: 8px; background: var(--bg-subcard); border-radius: 8px; font-weight: 700; text-align: center; font-size: 0.82rem;">Все системы работают штатно</div></div>`;
    return html;
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

      // 1. Получаем ссылку на скачивание файла из облака
      const downMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(filePath)}&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (downMetaRes.status === 401 || downMetaRes.status === 403) {
        throw new Error('AUTH_ERROR: Токен Яндекса недействителен или нет прав');
      }

      if (downMetaRes.status === 404) {
        remoteData = null; // Файла еще нет в облаке (например, при первом запуске)
      } else if (!downMetaRes.ok) {
        throw new Error(`Ошибка сервиса Яндекса (HTTP ${downMetaRes.status})`);
      } else {
        const downMeta = await downMetaRes.json();
        let rawDownload = await this.downloadFile(downMeta.href);
        
        // Разворачиваем файл, если он был загружен в облако вручную как бэкап
        if (rawDownload && rawDownload.data) {
          rawDownload = rawDownload.data;
        }
        
        // МЯГКАЯ НОРМАЛИЗАЦИЯ: защищаем от крашей, но не удаляем пользовательские данные
        if (rawDownload && typeof rawDownload === 'object') {
          remoteData = {
            ...rawDownload,
            spheres: Array.isArray(rawDownload.spheres) ? rawDownload.spheres : [],
            projects: Array.isArray(rawDownload.projects) ? rawDownload.projects : [],
            tasks: Array.isArray(rawDownload.tasks) ? rawDownload.tasks : [],
            inbox: Array.isArray(rawDownload.inbox) ? rawDownload.inbox : [],
            tombstones: (rawDownload.tombstones && typeof rawDownload.tombstones === 'object') ? rawDownload.tombstones : {}
          };
        }
      }

      // 2. Умное слияние локальных и облачных данных
      const localData = window.LifeState.data || window.LifeStorage.load();
      const mergedData = this.mergeData(localData, remoteData);

      // Сохраняем объединенные данные локально
      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      // 3. Запрашиваем у Яндекса ссылку для записи обновленных данных
      const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` }
      });

      if (upMetaRes.status === 401 || upMetaRes.status === 403) {
        throw new Error('AUTH_ERROR: Нет прав на запись');
      }

      if (!upMetaRes.ok) {
        throw new Error(`Ошибка адреса загрузки (HTTP ${upMetaRes.status})`);
      }

      const upMeta = await upMetaRes.json();
      
      // 4. Отправляем обновленный файл в облако
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
      console.error('[Life OS Sync Error]:', err); // Точное логирование ошибки для разработчика
      this.isSyncing = false;
      
      const isAuthErr = err.message.includes('AUTH_ERROR');
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