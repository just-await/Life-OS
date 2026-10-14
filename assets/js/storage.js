// assets/js/storage.js
// Двухуровневое бронебойное хранилище (Мгновенный кэш localStorage + Асинхронный сейф IndexedDB)
const STORAGE_KEY = 'LIFE_OS_DATA_V1';
const SNAPSHOT_KEY = 'LIFE_OS_SNAPSHOT_PRE_SYNC';
const IDB_NAME = 'LifeOS_Database';
const IDB_STORE = 'app_data';

// Единый цветной логгер приложения
window.LifeLog = {
  info(module, msg, data = null) {
    console.log(`%c[${module}]%c ${msg}`, 'background: #FFD027; color: #141414; font-weight: bold; padding: 2px 5px; border-radius: 4px;', 'color: inherit;', data || '');
  },
  warn(module, msg, data = null) {
    console.warn(`%c[${module}]%c ⚠️ ${msg}`, 'background: #FAAD14; color: #141414; font-weight: bold; padding: 2px 5px; border-radius: 4px;', 'color: inherit;', data || '');
  },
  error(module, msg, err = null) {
    console.error(`%c[${module}]%c ❌ ${msg}`, 'background: #CF1322; color: #FFF; font-weight: bold; padding: 2px 5px; border-radius: 4px;', 'color: inherit;', err || '');
  }
};

const DEFAULT_INITIAL_DATA = {
  schemaVersion: 1,
  isOnboarding: true,
  spheres: [
    {
      id: 'sph-work',
      title: 'Работа & Проекты',
      icon: 'briefcase',
      color: '#FFD027',
      rev: 1,
      createdAt: Date.now() - 3000,
      updatedAt: Date.now() - 3000
    },
    {
      id: 'sph-home',
      title: 'Быт и Здоровье',
      icon: 'home',
      color: '#20C968',
      rev: 1,
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000
    },
    {
      id: 'sph-goals',
      title: 'Личные цели',
      icon: 'target',
      color: '#3875FF',
      rev: 1,
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000
    }
  ],
  projects: [
    {
      id: 'prj-welcome',
      sphereId: 'sph-work',
      title: 'Старт в Life OS',
      icon: 'zap',
      color: '#FFD027',
      rev: 1,
      createdAt: Date.now() - 2500,
      updatedAt: Date.now() - 2500
    }
  ],
  tasks: [
    {
      id: 'tsk-foc-demo',
      projectId: 'prj-welcome',
      title: 'Нажать на звёздочку ⭐, чтобы взять дело в Фокус дня',
      completed: false,
      completedAt: null,
      inFocus: true,
      focusedAt: Date.now(),
      inWeek: false,
      deadline: null,
      checklist: [],
      note: 'Фокус дня помогает закрывать 3–5 главных дел без чувства вины.',
      unfocusedDate: null,
      rev: 1,
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000
    },
    {
      id: 'tsk-inb-demo',
      projectId: 'prj-welcome',
      title: 'Заглянуть в Инбокс в шапке и записать любую внезапную мысль',
      completed: false,
      completedAt: null,
      inFocus: false,
      focusedAt: null,
      inWeek: true,
      deadline: null,
      checklist: [],
      note: 'Инбокс мгновенно освобождает оперативную память мозга.',
      unfocusedDate: null,
      rev: 1,
      createdAt: Date.now() - 1500,
      updatedAt: Date.now() - 1500
    }
  ],
  inbox: [
    {
      id: 'inb-demo-1',
      text: 'Идея: разложить дела по сферам и выдохнуть',
      createdAt: Date.now()
    }
  ],
  tombstones: {},
  resetAt: 0
};

window.LifeStorage = {
  db: null,
  isInitialized: false,

  async init() {
    window.LifeLog.info('LifeStorage', 'Инициализация двухуровневого хранилища...');
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        window.LifeLog.info('LifeStorage', `Статус постоянного хранилища браузера: ${isPersisted ? 'Защищено (Persisted)' : 'Стандартное'}`);
      } catch (e) {
        window.LifeLog.warn('LifeStorage', 'Не удалось запросить постоянное хранилище', e);
      }
    }
    
    await this.initIndexedDB();
    // СНАЧАЛА проверяем и восстанавливаем IndexedDB, если localStorage был очищен!
    await this.verifyAndRestoreFromIDB();
    this.isInitialized = true;
  },

  initIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        window.LifeLog.warn('LifeStorage', 'IndexedDB недоступен в этом браузере. Работаем только через localStorage.');
        resolve(false);
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
          window.LifeLog.info('LifeStorage', 'Таблица app_data в IndexedDB успешно создана.');
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        window.LifeLog.info('LifeStorage', 'Подключение к базе IndexedDB установлено.');
        resolve(true);
      };
      req.onerror = (err) => {
        window.LifeLog.error('LifeStorage', 'Ошибка подключения к IndexedDB', err);
        resolve(false);
      };
    });
  },

  // АВАРИЙНЫЙ МОСТ: Гарантированное восстановление из IndexedDB
  async verifyAndRestoreFromIDB() {
    let localRaw = null;
    try {
      localRaw = localStorage.getItem(STORAGE_KEY);
    } catch (_) {}

    // Если в localStorage УЖЕ есть реальные данные пользователя — не трогаем
    if (localRaw) {
      try {
        const parsed = JSON.parse(localRaw);
        if (parsed && Array.isArray(parsed.spheres) && parsed.spheres.length > 0 && !parsed.isOnboarding) {
          window.LifeLog.info('LifeStorage', 'Оперативные данные найдены в кэше localStorage.');
          return;
        }
      } catch (_) {}
    }

    window.LifeLog.warn('LifeStorage', 'localStorage чист! Проверяем постоянный сейф IndexedDB...');
    if (!this.db) return;

    try {
      const dataFromIDB = await this.readFromIDB(STORAGE_KEY);
      if (dataFromIDB && typeof dataFromIDB === 'object' && Array.isArray(dataFromIDB.spheres) && dataFromIDB.spheres.length > 0) {
        // ВОССТАНАВЛИВАЕМ ДАННЫЕ В LOCALSTORAGE!
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataFromIDB));
        window.LifeLog.info('LifeStorage', '🎉 УСПЕХ: База полностью восстановлена из сейфа IndexedDB!', {
          spheres: dataFromIDB.spheres.length,
          tasks: dataFromIDB.tasks?.length
        });
      } else {
        window.LifeLog.info('LifeStorage', 'В IndexedDB также пусто. Это первый чистый запуск.');
      }
    } catch (err) {
      window.LifeLog.error('LifeStorage', 'Сбой аварийного чтения из IndexedDB', err);
    }
  },

  readFromIDB(key) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      try {
        const tx = this.db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  },

  load() {
    let serialized = null;
    try {
      serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        window.LifeLog.info('LifeStorage', 'Загрузка дефолтных демо-данных (первый старт).');
        this.save(DEFAULT_INITIAL_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
      }
      
      const parsed = JSON.parse(serialized);

      if (!parsed.spheres || !Array.isArray(parsed.spheres)) parsed.spheres = [];
      if (!parsed.projects || !Array.isArray(parsed.projects)) parsed.projects = [];
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) parsed.tasks = [];
      if (!parsed.inbox || !Array.isArray(parsed.inbox)) parsed.inbox = [];
      if (!parsed.tombstones || typeof parsed.tombstones !== 'object') parsed.tombstones = {};
      if (typeof parsed.resetAt !== 'number') parsed.resetAt = 0;
      parsed.schemaVersion = 1;

      return parsed;
    } catch (e) {
      window.LifeLog.error('LifeStorage', 'Ошибка чтения кэша! Создаем резервную аварийную копию поврежденного файла', e);
      if (serialized) {
        try {
          localStorage.setItem(`${STORAGE_KEY}_corrupt_${Date.now()}`, serialized);
        } catch (_) {}
      }
      return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
    }
  },

  save(data) {
    if (!data || typeof data !== 'object') return false;

    // 1. Мгновенная синхронная фиксация в оперативной памяти браузера
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      window.LifeLog.warn('LifeStorage', 'Лимит localStorage исчерпан, запись направлена напрямую в IndexedDB', e);
    }

    // 2. Долговечная асинхронная запись в IndexedDB
    if (this.db) {
      try {
        const tx = this.db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(data, STORAGE_KEY);
        tx.oncomplete = () => {
          // Запись прошла успешно
        };
        tx.onerror = (err) => {
          window.LifeLog.error('LifeStorage', 'Ошибка записи в транзакцию IndexedDB', err);
        };
      } catch (err) {
        window.LifeLog.error('LifeStorage', 'Критический сбой сохранения в IndexedDB', err);
      }
    }

    return true;
  },

  savePreSyncSnapshot(data) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
        savedAt: Date.now(),
        data: data
      }));
      window.LifeLog.info('LifeStorage', 'Создан контрольный слепок безопасности перед синхронизацией.');
    } catch (e) {
      window.LifeLog.warn('LifeStorage', 'Не удалось сохранить снимок pre-sync', e);
    }
  },

  restorePreSyncSnapshot() {
    try {
      const snap = localStorage.getItem(SNAPSHOT_KEY);
      if (snap) {
        const parsed = JSON.parse(snap);
        if (parsed && parsed.data) {
          this.save(parsed.data);
          window.LifeLog.info('LifeStorage', 'Откат к контрольному снимку безопасности выполнен.');
          return parsed.data;
        }
      }
    } catch (e) {
      window.LifeLog.error('LifeStorage', 'Ошибка отката снимка', e);
    }
    return null;
  }
};

window.LifeStorage.init();