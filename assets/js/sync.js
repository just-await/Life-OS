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
  // Вспомогательный метод сетевых запросов с оптимальным таймаутом (8.5 сек)
  async fetchWithTimeout(url, options = {}, timeoutMs = 8500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw err;
    }
  },

  // ЧИСТОЕ СКАЧИВАНИЕ ЧЕРЕЗ ШЛЮЗ
  async downloadFile(downloadHref) {
    // 1. Сначала пробуем прямое скачивание
    try {
      const directRes = await this.fetchWithTimeout(downloadHref, {}, 3000);
      if (directRes.ok) return await directRes.json();
    } catch (_) {}

    // 2. Если прямой доступ заблокирован — идем через защищенный Worker
    const proxyUrl = window.LifeConfig.network.proxyUrl;
    if (proxyUrl && !proxyUrl.includes('ваше-имя')) {
      try {
        // Даем перегруженному Яндексу до 8.5 секунд на ответ
        const proxyRes = await this.fetchWithTimeout(`${proxyUrl}?url=${encodeURIComponent(downloadHref)}`, {}, 8500);
        if (proxyRes.ok) return await proxyRes.json();
        throw new Error(`HTTP ${proxyRes.status}`);
      } catch (err) {
        if (err.message === 'TIMEOUT' || err.name === 'AbortError') {
          throw new Error('Шлюз заблокирован провайдером или Яндекс не ответил вовремя');
        }
        throw new Error(`Ошибка шлюза (${err.message})`);
      }
    }

    throw new Error('Укажите адрес вашего личного Worker в config.js');
  },

  // ЭКСПРЕСС-ДИАГНОСТИКА В РЕАЛЬНОМ ВРЕМЕНИ (ЖИВОЙ РЕЖИМ)
  async runDiagnostic() {
    const modal = document.getElementById('customDialogModal');
    const titleEl = document.getElementById('customDialogTitle');
    const msgEl = document.getElementById('customDialogMessage');
    const confirmBtn = document.getElementById('customDialogConfirmBtn');
    const cancelBtn = document.getElementById('customDialogCancelBtn');
    const promptBox = document.getElementById('customDialogPromptBox');

    // Шаги диагностики
    const steps = [
      { id: 'token', name: 'Ключ авторизации Яндекс ID', status: 'pending', desc: 'Ожидание проверки...' },
      { id: 'yandex', name: 'Связь с серверами Яндекса', status: 'pending', desc: 'Ожидание проверки...' },
      { id: 'proxy', name: 'Шлюз Cloudflare (Обход CORS)', status: 'pending', desc: 'Ожидание проверки...' },
      { id: 'write', name: 'Права на запись в хранилище', status: 'pending', desc: 'Ожидание проверки...' }
    ];

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

      if (finalVerdict) {
        content += finalVerdict;
      }
      content += `</div>`;

      if (msgEl) msgEl.innerHTML = content;
    };

    // МГНОВЕННО открываем окно перед началом проверок
    if (modal && titleEl && msgEl) {
      titleEl.textContent = '🔍 Экспресс-диагностика';
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (promptBox) promptBox.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = 'none'; // Скрываем кнопку, пока идет проверка
      render();
      modal.classList.add('active');
    }

    // ТЕСТ 1: Токен
    steps[0].status = 'running';
    steps[0].desc = 'Проверка наличия токена на устройстве...';
    render();
    await new Promise(r => setTimeout(r, 120)); // Легкая пауза для плавности глаза

    if (!this.yandexToken) {
      steps[0].status = 'error';
      steps[0].desc = 'Токен не найден. Нажмите «Войти через Яндекс ID».';
      steps[1].desc = 'Отменено';
      steps[2].desc = 'Отменено';
      steps[3].desc = 'Отменено';
      const verdict = `<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.82rem; border: 1.5px solid #FFA39E;">Требуется авторизация</div>`;
      render(verdict);
      if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
      return msgEl.innerHTML;
    }
    steps[0].status = 'ok';
    steps[0].desc = 'Токен найден и загружен в память.';
    render();

    // ТЕСТ 2: Серверы Яндекса в РФ
    steps[1].status = 'running';
    steps[1].desc = 'Запрос к API Яндекса (cloud-api.yandex.net)...';
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
      steps[2].desc = 'Отменено';
      steps[3].desc = 'Отменено';
      const verdict = `<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.82rem; border: 1.5px solid #FFA39E;">Сбой связи с серверами Яндекса</div>`;
      render(verdict);
      if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
      return msgEl.innerHTML;
    }
    render();

    // ТЕСТ 3: Прокси-шлюз Cloudflare (С реальным таймаутом против блокировок ТСПУ)
    steps[2].status = 'running';
    steps[2].desc = 'Тестирование скачивания через шлюз Cloudflare...';
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
        // Проверяем реальное скачивание файла через шлюз
        await this.downloadFile(downloadHref);
        steps[2].status = 'ok';
        steps[2].desc = 'Шлюз ответил успешно, данные базы прочитаны.';
      } else {
        // Если файла еще нет — проверяем шлюз быстрым тестовым пингом
        const proxyUrl = window.LifeConfig.network.proxyUrl;
        const pingRes = await this.fetchWithTimeout(`${proxyUrl}?url=${encodeURIComponent('https://ya.ru')}`, {}, 4500);
        if (!pingRes.ok) throw new Error();
        steps[2].status = 'ok';
        steps[2].desc = 'Шлюз Cloudflare на связи и готов к работе.';
      }
    } catch (e) {
      steps[2].status = 'error';
      steps[2].desc = 'Шлюз заблокирован оператором (нужен VPN).';
      steps[3].desc = 'Отменено';
      const verdict = `<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.8rem; border: 1.5px solid #FFA39E;">Домен workers.dev заблокирован мобильным оператором. Включите VPN или привяжите свой домен.</div>`;
      render(verdict);
      if (confirmBtn) { confirmBtn.style.display = 'inline-flex'; confirmBtn.textContent = 'Понятно'; }
      return msgEl.innerHTML;
    }
    render();

    // ТЕСТ 4: Права на запись
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

    const allOk = steps.every(s => s.status === 'ok');
    const finalBanner = allOk
      ? `<div style="margin-top: 6px; padding: 10px; background: var(--bg-subcard); border: 1.5px solid var(--accent-done); color: var(--accent-done); border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.84rem;">🎉 Все системы работают идеально</div>`
      : `<div style="margin-top: 6px; padding: 10px; background: #FFF1F0; border: 1.5px solid #FFA39E; color: #CF1322; border-radius: 10px; font-weight: 700; text-align: center; font-size: 0.82rem;">Обнаружены проблемы в цепочке синхронизации</div>`;

    render(finalBanner);
    if (confirmBtn) {
      confirmBtn.style.display = 'inline-flex';
      confirmBtn.textContent = 'Понятно';
    }

    return msgEl.innerHTML;
  },

 cleanOldTombstones(tombstones) {
    // Храним метки удаления 90 дней (защита от воскрешения задач)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const cleaned = {};
    for (const [id, time] of Object.entries(tombstones || {})) {
      if (time > ninetyDaysAgo) cleaned[id] = time;
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
      
      // Создаем страховку: снимок локальной базы перед обновлением из облака
      if (window.LifeStorage && window.LifeStorage.savePreSyncSnapshot) {
        window.LifeStorage.savePreSyncSnapshot(localData);
      }

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