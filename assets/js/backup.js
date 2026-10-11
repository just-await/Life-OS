// Модуль резервного копирования и портируемости данных (Local-First)
window.LifeBackup = {
  exportData() {
    const rawData = window.LifeState.data || window.LifeStorage.load();
    
    const exportPayload = {
      appName: 'Life OS',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: rawData
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `life_os_backup_${dateStr}_${timeStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filename;
  },

  sanitizeData(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Некорректная структура файла');

    const clean = {
      schemaVersion: 1,
      spheres: [],
      projects: [],
      tasks: [],
      inbox: [],
      tombstones: raw.tombstones && typeof raw.tombstones === 'object' ? raw.tombstones : {},
      resetAt: typeof raw.resetAt === 'number' ? raw.resetAt : 0
    };

    const isValidColor = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c);
    const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
    const isValidIcon = (i) => typeof i === 'string' && Object.prototype.hasOwnProperty.call(window.LifeIcons.list, i);

    if (Array.isArray(raw.spheres)) {
      clean.spheres = raw.spheres.filter(s => s && isValidId(s.id) && typeof s.title === 'string').map(s => ({
        id: s.id,
        title: s.title.slice(0, 50),
        icon: isValidIcon(s.icon) ? s.icon : 'folder',
        color: isValidColor(s.color) ? s.color : '#FFD027',
        createdAt: Number(s.createdAt) || Date.now(),
        updatedAt: Number(s.updatedAt) || Date.now()
      }));
    }

    if (Array.isArray(raw.projects)) {
      clean.projects = raw.projects.filter(p => p && isValidId(p.id) && typeof p.title === 'string').map(p => ({
        id: p.id,
        sphereId: String(p.sphereId || ''),
        title: p.title.slice(0, 60),
        icon: isValidIcon(p.icon) ? p.icon : 'target',
        color: isValidColor(p.color) ? p.color : '#FFD027',
        createdAt: Number(p.createdAt) || Date.now(),
        updatedAt: Number(p.updatedAt) || Date.now()
      }));
    }

    if (Array.isArray(raw.tasks)) {
      clean.tasks = raw.tasks.filter(t => t && isValidId(t.id) && typeof t.title === 'string').map(t => ({
        id: t.id,
        projectId: String(t.projectId || ''),
        title: t.title.slice(0, 150),
        completed: Boolean(t.completed),
        inFocus: Boolean(t.inFocus),
        deadline: typeof t.deadline === 'string' ? t.deadline.slice(0, 20) : null,
        note: typeof t.note === 'string' ? t.note.slice(0, 1000) : '',
        unfocusedDate: typeof t.unfocusedDate === 'string' ? t.unfocusedDate : null,
        checklist: Array.isArray(t.checklist) ? t.checklist.map(c => ({ text: String(c.text || '').slice(0, 100), completed: Boolean(c.completed) })) : [],
        createdAt: Number(t.createdAt) || Date.now(),
        updatedAt: Number(t.updatedAt) || Date.now()
      }));
    }

    if (Array.isArray(raw.inbox)) {
      clean.inbox = raw.inbox.filter(i => i && isValidId(i.id) && typeof i.text === 'string').map(i => ({
        id: i.id,
        text: i.text.slice(0, 100),
        createdAt: Number(i.createdAt) || Date.now()
      }));
    }

    return clean;
  },

  importFromFile(file, mode = 'merge', callback) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const remoteData = parsed.data ? parsed.data : parsed;
        const sanitizedRemote = this.sanitizeData(remoteData);

        let finalData;
        if (mode === 'merge' && window.LifeSync) {
          const currentLocal = window.LifeState.data || window.LifeStorage.load();
          finalData = window.LifeSync.mergeData(currentLocal, sanitizedRemote);
        } else {
          finalData = sanitizedRemote;
        }

        window.LifeStorage.save(finalData);
        window.LifeState.data = finalData;

        callback({ success: true, count: finalData.tasks.length, mode });
      } catch (err) {
        console.error('Ошибка импорта бэкапа:', err);
        callback({ success: false, error: err.message || 'Файл поврежден или имеет неверный формат' });
      }
    };

    reader.onerror = () => {
      callback({ success: false, error: 'Ошибка чтения файла с диска' });
    };

    reader.readAsText(file);
  },

  getStorageStats() {
    const rawData = JSON.stringify(window.LifeState.data || {});
    const bytes = new Blob([rawData]).size;
    const kb = (bytes / 1024).toFixed(1);

    const spheres = (window.LifeState.data.spheres || []).length;
    const projects = (window.LifeState.data.projects || []).length;
    const tasks = (window.LifeState.data.tasks || []).length;
    const inbox = (window.LifeState.data.inbox || []).length;

    return { kb, spheres, projects, tasks, inbox };
  }
};