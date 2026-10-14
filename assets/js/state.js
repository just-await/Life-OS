// assets/js/state.js
// Модуль состояния данных (Local-First + Счетчики ревизий + Авто-сброс Фокуса)
window.LifeState = {
  data: null,
  activeSphereId: null,
  activeProjectId: null,

  init() {
    this.data = window.LifeStorage.load();
    this.setupCrossTabSync();
  },

  setupCrossTabSync() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'LIFE_OS_DATA_V1') {
        this.data = window.LifeStorage.load();
        if (window.LifeUI && !window.LifeUI.isDragging) {
          window.LifeUI.onSilentSyncCompleted();
        }
      }
    });
  },

  generateId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  },

  recordTombstone(id) {
    if (!this.data.tombstones) this.data.tombstones = {};
    this.data.tombstones[id] = Date.now();
  },

  // ===== СФЕРЫ =====
  getSpheres() {
    return this.data.spheres || [];
  },

  getSphere(id) {
    return (this.data.spheres || []).find(s => s.id === id);
  },

  getSphereStats(sphereId) {
    const projects = (this.data.projects || []).filter(p => p.sphereId === sphereId);
    const projectIds = projects.map(p => p.id);
    const tasks = (this.data.tasks || []).filter(t => projectIds.includes(t.projectId));
    
    return {
      projectsCount: projects.length,
      tasksCount: tasks.length
    };
  },

  addSphere({ title, icon, color }) {
    if (!title || !title.trim()) return null;

    const newSphere = {
      id: this.generateId('sph'),
      title: title.trim(),
      icon: icon || 'folder',
      color: color || '#FFD027',
      rev: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.data.spheres.unshift(newSphere);
    window.LifeStorage.save(this.data);
    return newSphere;
  },

  updateSphere(sphereId, updates) {
    const sphere = this.getSphere(sphereId);
    if (!sphere) return null;

    Object.assign(sphere, updates, { 
      rev: (sphere.rev || 0) + 1,
      updatedAt: Date.now() 
    });
    window.LifeStorage.save(this.data);
    return sphere;
  },

  deleteSphere(sphereId) {
    const projects = this.getProjectsBySphere(sphereId);
    const projectIds = projects.map(p => p.id);

    this.recordTombstone(sphereId);
    projectIds.forEach(pId => this.recordTombstone(pId));

    const tasksToDelete = (this.data.tasks || []).filter(t => projectIds.includes(t.projectId));
    tasksToDelete.forEach(t => this.recordTombstone(t.id));

    this.data.spheres = (this.data.spheres || []).filter(s => s.id !== sphereId);
    this.data.projects = (this.data.projects || []).filter(p => p.sphereId !== sphereId);
    this.data.tasks = (this.data.tasks || []).filter(t => !projectIds.includes(t.projectId));
    
    window.LifeStorage.save(this.data);
  },

  // ===== ПРОЕКТЫ =====
  getProjectsBySphere(sphereId) {
    return (this.data.projects || []).filter(p => p.sphereId === sphereId);
  },

  getProject(id) {
    return (this.data.projects || []).find(p => p.id === id);
  },

  getProjectStats(projectId) {
    const tasks = this.getTasksByProject(projectId);
    const completed = tasks.filter(t => t.completed).length;
    const percent = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    
    return {
      total: tasks.length,
      completed: completed,
      percent: percent
    };
  },

  addProject({ sphereId, title, icon, color }) {
    if (!title || !title.trim()) return null;

    const newProject = {
      id: this.generateId('prj'),
      sphereId: sphereId,
      title: title.trim(),
      icon: icon || 'target',
      color: color || '#FFD027',
      rev: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.data.projects.unshift(newProject);
    window.LifeStorage.save(this.data);
    return newProject;
  },

  updateProject(projectId, updates) {
    const project = this.getProject(projectId);
    if (!project) return null;

    Object.assign(project, updates, { 
      rev: (project.rev || 0) + 1,
      updatedAt: Date.now() 
    });
    window.LifeStorage.save(this.data);
    return project;
  },

  deleteProject(projectId) {
    this.recordTombstone(projectId);
    const tasks = this.getTasksByProject(projectId);
    tasks.forEach(t => this.recordTombstone(t.id));

    this.data.projects = (this.data.projects || []).filter(p => p.id !== projectId);
    this.data.tasks = (this.data.tasks || []).filter(t => t.projectId !== projectId);
    window.LifeStorage.save(this.data);
  },

  // ===== ЗАДАЧИ =====
  getTasksByProject(projectId) {
    return (this.data.tasks || []).filter(t => t.projectId === projectId);
  },

  getTask(taskId) {
    return (this.data.tasks || []).find(t => t.id === taskId);
  },

  addTask({ projectId, title, deadline = null, inWeek = false }) {
    if (!title || !title.trim()) return null;

    const newTask = {
      id: this.generateId('tsk'),
      projectId: projectId,
      title: title.trim(),
      completed: false,
      completedAt: null,
      inFocus: false,
      focusedAt: null,
      inWeek: Boolean(inWeek),
      deadline: deadline,
      checklist: [],
      note: '',
      unfocusedDate: null,
      rev: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.data.tasks.unshift(newTask);
    window.LifeStorage.save(this.data);
    return newTask;
  },

  updateTask(taskId, updates) {
    const task = this.getTask(taskId);
    if (!task) return null;

    Object.assign(task, updates, { 
      rev: (task.rev || 0) + 1,
      updatedAt: Date.now() 
    });
    window.LifeStorage.save(this.data);
    return task;
  },

  deleteTask(taskId) {
    this.recordTombstone(taskId);
    this.data.tasks = (this.data.tasks || []).filter(t => t.id !== taskId);
    window.LifeStorage.save(this.data);
  },

  toggleTaskCompleted(taskId) {
    const task = this.getTask(taskId);
    if (!task) return null;
    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    task.rev = (task.rev || 0) + 1;
    task.updatedAt = Date.now();
    window.LifeStorage.save(this.data);
    return task;
  },

  toggleTaskFocus(taskId) {
    const task = this.getTask(taskId);
    if (!task) return null;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (task.inFocus || task.deadline === todayStr) {
      task.inFocus = false;
      task.focusedAt = null;
      if (task.deadline === todayStr) {
        task.unfocusedDate = todayStr;
      }
    } else {
      task.inFocus = true;
      task.focusedAt = Date.now();
      task.unfocusedDate = null;
    }

    task.rev = (task.rev || 0) + 1;
    task.updatedAt = Date.now();
    window.LifeStorage.save(this.data);
    return task;
  },

  // ===== ФОКУС ДНЯ С АВТО-СБРОСОМ =====
  getFocusTasks() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let modified = false;
    (this.data.tasks || []).forEach(t => {
      // 1. Очистка вчерашних выполненных
      if (t.inFocus && t.completed && t.completedAt) {
        const compDate = new Date(t.completedAt);
        const compDateStr = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(compDate.getDate()).padStart(2, '0')}`;
        if (compDateStr < todayStr) {
          t.inFocus = false;
          t.focusedAt = null;
          t.rev = (t.rev || 0) + 1;
          t.updatedAt = Date.now();
          modified = true;
        }
      }

      // 2. Мягкий возврат в проект на 4-й день
      if (t.inFocus && !t.completed) {
        const focusedTime = t.focusedAt || t.createdAt || Date.now();
        const fDate = new Date(focusedTime);
        const focusedMidnight = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate()).getTime();
        const daysDiff = Math.round((todayMidnight - focusedMidnight) / (24 * 60 * 60 * 1000));

        if (daysDiff >= 4) {
          t.inFocus = false;
          t.focusedAt = null;
          t.rev = (t.rev || 0) + 1;
          t.updatedAt = Date.now();
          modified = true;
        }
      }
    });

    if (modified) {
      window.LifeStorage.save(this.data);
    }

    const tasks = (this.data.tasks || []).filter(t => {
      const isDueToday = t.deadline === todayStr && t.unfocusedDate !== todayStr;
      return t.inFocus || isDueToday;
    });

    return tasks.map(t => {
      const project = (this.data.projects || []).find(p => p.id === t.projectId);
      const sphere = project ? (this.data.spheres || []).find(s => s.id === project.sphereId) : null;
      const isDueToday = t.deadline === todayStr;

      let rolloverText = null;
      if (!t.completed) {
        const focusedTime = t.focusedAt || t.createdAt || Date.now();
        const fDate = new Date(focusedTime);
        const focusedMidnight = new Date(fDate.getFullYear(), fDate.getMonth(), fDate.getDate()).getTime();
        const daysDiff = Math.round((todayMidnight - focusedMidnight) / (24 * 60 * 60 * 1000));
        if (daysDiff === 1) rolloverText = 'Вчера';
        else if (daysDiff === 2) rolloverText = '2 дня';
        else if (daysDiff === 3) rolloverText = '3 дня';
      }

      return {
        ...t,
        isDueToday: isDueToday,
        rolloverText: rolloverText,
        projectName: project ? project.title : 'Общее',
        sphereTitle: sphere ? sphere.title : '',
        sphereColor: sphere ? sphere.color : '#FFD027'
      };
    });
  },

  getWeekTasks() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const horizonDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
    const horizonStr = `${horizonDate.getFullYear()}-${String(horizonDate.getMonth() + 1).padStart(2, '0')}-${String(horizonDate.getDate()).padStart(2, '0')}`;

    const tasks = (this.data.tasks || []).filter(t => {
      if (t.completed) return false;

      const hasDeadlineInHorizon = t.deadline && t.deadline >= todayStr && t.deadline <= horizonStr;
      const isOverdue = t.deadline && t.deadline < todayStr;
      const isManualWeek = Boolean(t.inWeek);
      const isInFocus = Boolean(t.inFocus);

      return hasDeadlineInHorizon || isOverdue || isManualWeek || isInFocus;
    });

    tasks.sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return tasks.map(t => {
      const project = (this.data.projects || []).find(p => p.id === t.projectId);
      const sphere = project ? (this.data.spheres || []).find(s => s.id === project.sphereId) : null;

      return {
        ...t,
        isDueToday: t.deadline === todayStr,
        isOverdue: t.deadline && t.deadline < todayStr,
        projectName: project ? project.title : 'Общее',
        sphereTitle: sphere ? sphere.title : '',
        sphereColor: sphere ? sphere.color : '#FFD027'
      };
    });
  },

  clearCompletedFocusTasks() {
    let changed = false;
    (this.data.tasks || []).forEach(t => {
      if (t.inFocus && t.completed) {
        t.inFocus = false;
        t.rev = (t.rev || 0) + 1;
        t.updatedAt = Date.now();
        changed = true;
      }
    });
    if (changed) {
      window.LifeStorage.save(this.data);
    }
  },

  // ===== ИНБОКС =====
  getInbox() {
    return this.data.inbox || [];
  },

  addInboxThought(text) {
    if (!text || !text.trim()) return null;
    const item = {
      id: this.generateId('inb'),
      text: text.trim(),
      createdAt: Date.now()
    };
    this.data.inbox.unshift(item);
    window.LifeStorage.save(this.data);
    return item;
  },

  deleteInboxThought(id) {
    this.recordTombstone(id);
    this.data.inbox = (this.data.inbox || []).filter(item => item.id !== id);
    window.LifeStorage.save(this.data);
  },

  moveInboxThoughtToProject(inboxId, projectId) {
    const item = (this.data.inbox || []).find(i => i.id === inboxId);
    if (!item) return null;

    const task = this.addTask({ projectId, title: item.text });
    this.deleteInboxThought(inboxId);
    return task;
  },

  // ===== БЕЗОПАСНАЯ СОРТИРОВКА И ПЕРЕТАСКИВАНИЕ =====
  _applyOrder(list, ids, belongs) {
    const own = list.filter(belongs);
    const map = new Map(own.map(x => [x.id, x]));
    const seen = new Set();
    const ordered = [];

    for (const id of ids) {
      if (map.has(id) && !seen.has(id)) {
        seen.add(id);
        const item = map.get(id);
        item.updatedAt = Date.now();
        ordered.push(item);
      }
    }

    const rest = own.filter(x => !seen.has(x.id));
    return [...list.filter(x => !belongs(x)), ...ordered, ...rest];
  },

  reorderSpheres(newOrderIds) {
    this.data.spheres = this._applyOrder(this.data.spheres || [], newOrderIds, () => true);
    window.LifeStorage.save(this.data);
  },

  reorderProjects(sphereId, newOrderIds) {
    this.data.projects = this._applyOrder(this.data.projects || [], newOrderIds, p => p.sphereId === sphereId);
    window.LifeStorage.save(this.data);
  },

  // ИСПРАВЛЕННЫЙ БАГ: функция перетаскивания задач внутри проекта
  reorderTasks(projectId, newOrderIds) {
    this.data.tasks = this._applyOrder(this.data.tasks || [], newOrderIds, t => t.projectId === projectId);
    window.LifeStorage.save(this.data);
  },

  reorderGlobalTasks(newOrderIds) {
    const map = new Map((this.data.tasks || []).map(t => [t.id, t]));
    const seen = new Set();
    const ordered = [];

    for (const id of newOrderIds) {
      if (map.has(id) && !seen.has(id)) {
        seen.add(id);
        const item = map.get(id);
        item.updatedAt = Date.now();
        ordered.push(item);
      }
    }

    const rest = (this.data.tasks || []).filter(t => !seen.has(t.id));
    this.data.tasks = [...ordered, ...rest];
    window.LifeStorage.save(this.data);
  },

  resetAll() {
    this.data = {
      schemaVersion: 1,
      isOnboarding: false,
      spheres: [],
      projects: [],
      tasks: [],
      inbox: [],
      tombstones: {},
      resetAt: Date.now()
    };
    window.LifeStorage.save(this.data);
  }
};