// assets/js/backup.js
// Модуль резервного копирования и портируемости данных (Local-First)
window.LifeBackup = {
  async exportData() {
    const rawData = window.LifeState.data || window.LifeStorage.load();
    
    const exportPayload = {
      appName: 'Life OS',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: rawData
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `life_os_backup_${dateStr}_${timeStr}.json`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Файл резервной копии JSON',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return filename;
      } catch (err) {
        if (err.name === 'AbortError') return null;
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json' });

    if (navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Резервная копия Life OS'
          });
          return filename;
        } catch (err) {
          if (err.name === 'AbortError') return null;
        }
      }
    }

    const url = URL.createObjectURL(blob);
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
      resetAt: 0
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
        rev: typeof s.rev === 'number' ? s.rev : 1,
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
        rev: typeof p.rev === 'number' ? p.rev : 1,
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
        completedAt: Number(t.completedAt) || null,
        inFocus: Boolean(t.inFocus),
        focusedAt: Number(t.focusedAt) || null,
        inWeek: Boolean(t.inWeek),
        deadline: typeof t.deadline === 'string' ? t.deadline.slice(0, 20) : null,
        note: typeof t.note === 'string' ? t.note.slice(0, 1000) : '',
        unfocusedDate: typeof t.unfocusedDate === 'string' ? t.unfocusedDate : null,
        checklist: Array.isArray(t.checklist) ? t.checklist.map(c => ({ text: String(c.text || '').slice(0, 100), completed: Boolean(c.completed) })) : [],
        rev: typeof t.rev === 'number' ? t.rev : 1,
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

        const now = Date.now();
        let finalData;

        if (mode === 'overwrite') {
          // РЕЖИМ ПЕРЕЗАПИСИ: бэкап становится абсолютной истиной
          sanitizedRemote.spheres.forEach(s => { s.updatedAt = now; s.rev = (s.rev || 0) + 10; });
          sanitizedRemote.projects.forEach(p => { p.updatedAt = now; p.rev = (p.rev || 0) + 10; });
          sanitizedRemote.tasks.forEach(t => { t.updatedAt = now; t.rev = (t.rev || 0) + 10; });

          finalData = {
            schemaVersion: 1,
            isOnboarding: false,
            spheres: sanitizedRemote.spheres,
            projects: sanitizedRemote.projects,
            tasks: sanitizedRemote.tasks,
            inbox: sanitizedRemote.inbox,
            tombstones: {},
            resetAt: 0
          };
        } else {
          // РЕЖИМ УМНОГО СЛИЯНИЯ: объединяем карты данных напрямую без блокировки tombstones
          const currentLocal = window.LifeState.data || window.LifeStorage.load();

          const sphereMap = new Map((currentLocal.spheres || []).map(s => [s.id, s]));
          const projectMap = new Map((currentLocal.projects || []).map(p => [p.id, p]));
          const taskMap = new Map((currentLocal.tasks || []).map(t => [t.id, t]));
          const inboxMap = new Map((currentLocal.inbox || []).map(i => [i.id, i]));

          // Вливаем сферы из бэкапа
          (sanitizedRemote.spheres || []).forEach(s => {
            s.updatedAt = now;
            s.rev = (s.rev || 0) + 10;
            sphereMap.set(s.id, s);
          });

          // Вливаем проекты из бэкапа
          (sanitizedRemote.projects || []).forEach(p => {
            p.updatedAt = now;
            p.rev = (p.rev || 0) + 10;
            projectMap.set(p.id, p);
          });

          // Вливаем задачи из бэкапа
          (sanitizedRemote.tasks || []).forEach(t => {
            t.updatedAt = now;
            t.rev = (t.rev || 0) + 10;
            taskMap.set(t.id, t);
          });

          // Вливаем инбокс
          (sanitizedRemote.inbox || []).forEach(i => {
            inboxMap.set(i.id, i);
          });

          // Снимаем метки смерти для всех импортированных элементов
          const cleanTombstones = { ...(currentLocal.tombstones || {}) };
          sphereMap.forEach((_, id) => delete cleanTombstones[id]);
          projectMap.forEach((_, id) => delete cleanTombstones[id]);
          taskMap.forEach((_, id) => delete cleanTombstones[id]);
          inboxMap.forEach((_, id) => delete cleanTombstones[id]);

          finalData = {
            schemaVersion: 1,
            isOnboarding: false,
            spheres: Array.from(sphereMap.values()),
            projects: Array.from(projectMap.values()),
            tasks: Array.from(taskMap.values()),
            inbox: Array.from(inboxMap.values()),
            tombstones: cleanTombstones,
            resetAt: 0
          };
        }

        window.LifeStorage.save(finalData);
        window.LifeState.data = finalData;

        callback({ success: true, count: finalData.tasks.length, mode });
      } catch (err) {
        console.error('Ошибка импорта бэкапа:', err);
        callback({ success: false, error: err.message || 'Файл поврежден' });
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