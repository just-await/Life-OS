// assets/js/storage.js
// Двухуровневое Local-First хранилище (Мгновенный кэш + Асинхронный IndexedDB сейф)
const STORAGE_KEY = 'LIFE_OS_DATA_V1';
const SNAPSHOT_KEY = 'LIFE_OS_SNAPSHOT_PRE_SYNC';
const IDB_NAME = 'LifeOS_Database';
const IDB_STORE = 'app_data';

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

  async init() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
    await this.initIndexedDB();
  },

  initIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(false);
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(true);
      };
      req.onerror = () => {
        resolve(false);
      };
    });
  },

  load() {
    let serialized = null;
    try {
      serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
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
      console.error('Ошибка чтения хранилища. Создаем аварийную копию:', e);
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

    // 1. Мгновенное сохранение в синхронный кэш
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage переполнен или недоступен, запись перенаправлена в IndexedDB', e);
    }

    // 2. Долговечная асинхронная фиксация в IndexedDB
    if (this.db) {
      try {
        const tx = this.db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(data, STORAGE_KEY);
      } catch (err) {
        console.error('Ошибка записи в IndexedDB:', err);
      }
    }

    return true;
  },

  // Создание снимка безопасности перед синхронизацией
  savePreSyncSnapshot(data) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
        savedAt: Date.now(),
        data: data
      }));
    } catch (_) {}
  },

  // Откат к снимку безопасности в случае сбоя
  restorePreSyncSnapshot() {
    try {
      const snap = localStorage.getItem(SNAPSHOT_KEY);
      if (snap) {
        const parsed = JSON.parse(snap);
        if (parsed && parsed.data) {
          this.save(parsed.data);
          return parsed.data;
        }
      }
    } catch (_) {}
    return null;
  }
};

window.LifeStorage.init();