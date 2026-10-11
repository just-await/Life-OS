// Модуль синхронизации (Яндекс Диск с честной системой статусов)
window.LifeSync = {
  yandexToken: null,
  isSyncing: false,
  autoSyncTimer: null,

  // Статусы: 'NOT_CONNECTED' | 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'AUTH_ERROR'
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
      if (document.visibilityState === 'visible') {
        this.silentPull();
      }
    });

    window.addEventListener('online', () => {
      this.silentPull();
    });

    window.addEventListener('offline', () => {
      if (this.yandexToken) {
        this.setStatus('OFFLINE');
      }
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

  cleanOldTombstones(tombstones) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const cleaned = {};
    for (const [id, time] of Object.entries(tombstones || {})) {
      if (time > thirtyDaysAgo) {
        cleaned[id] = time;
      }
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
        sphereMap.set(s.id, (s.updatedAt || s.createdAt || 0) >= (localS.updatedAt || localS.createdAt || 0) ? s : localS);
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
        projectMap.set(p.id, (p.updatedAt || p.createdAt || 0) >= (localP.updatedAt || localP.createdAt || 0) ? p : localP);
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
        const remoteTime = t.updatedAt || t.createdAt || 0;
        const localTime = localT.updatedAt || localT.createdAt || 0;
        taskMap.set(t.id, (remoteTime >= localTime) ? t : localT);
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
      const downMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(filePath)}&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` },
        cache: 'no-store'
      });

      // 401/403: Токен фальшивый или отозван
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
        const fileRes = await fetch(downMeta.href + (downMeta.href.includes('?') ? '&' : '?') + `_ts=${cacheBuster}`, {
          cache: 'no-store'
        });

        if (!fileRes.ok) {
          throw new Error(`Ошибка загрузки данных (HTTP ${fileRes.status})`);
        }
        remoteData = await fileRes.json();
      }

      const localData = window.LifeState.data || window.LifeStorage.load();
      const mergedData = this.mergeData(localData, remoteData);

      window.LifeStorage.save(mergedData);
      window.LifeState.data = mergedData;

      const upMetaRes = await fetch(`https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true&_ts=${cacheBuster}`, {
        headers: { Authorization: `OAuth ${this.yandexToken}` },
        cache: 'no-store'
      });

      if (upMetaRes.status === 401 || upMetaRes.status === 403) {
        this.setStatus('AUTH_ERROR');
        throw new Error('Токен Яндекса недействителен или отозван');
      }

      if (!upMetaRes.ok) {
        throw new Error(`Ошибка адреса загрузки (HTTP ${upMetaRes.status})`);
      }

      const upMeta = await upMetaRes.json();
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