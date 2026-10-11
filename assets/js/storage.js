// Модуль Local-First хранилища с защитой данных от повреждения
const STORAGE_KEY = 'LIFE_OS_DATA_V1';

const DEFAULT_INITIAL_DATA = {
  schemaVersion: 1,
  spheres: [],
  projects: [],
  tasks: [],
  inbox: [],
  tombstones: {},
  resetAt: 0
};

window.LifeStorage = {
  init() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
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
      console.error('Ошибка чтения из хранилища. Создаем аварийную копию:', e);
      if (serialized) {
        try {
          localStorage.setItem(`${STORAGE_KEY}_corrupt_${Date.now()}`, serialized);
        } catch (_) {}
      }
      return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
    }
  },

  save(data) {
    try {
      if (!data || typeof data !== 'object') return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Ошибка записи в хранилище (возможно переполнение диска):', e);
      if (window.LifeUI && window.LifeUI.showToast) {
        window.LifeUI.showToast('Ошибка сохранения на диск устройства', 'error');
      }
      return false;
    }
  }
};

window.LifeStorage.init();