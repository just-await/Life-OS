// Модуль интерфейса Life OS (с честными статусами и точкой в шапке)
window.LifeUI = {
  viewDashboard: null,
  viewSphere: null,
  viewProject: null,

  focusList: null,
  focusProgressFill: null,
  focusRatioLabel: null,
  clearCompletedFocusBtn: null,
  headerSyncDot: null,

  spheresGrid: null,
  addSphereBtn: null,
  addSphereModal: null,
  closeModalBtn: null,
  sphereForm: null,
  sphereModalTitle: null,
  sphereSubmitBtn: null,
  editingSphereId: null,

  backToDashboardBtn: null,
  editSphereBtn: null,
  deleteSphereBtn: null,
  sphereBannerIcon: null,
  sphereBannerTitle: null,
  sphereBannerMeta: null,
  projectsGrid: null,
  projectsArchiveWrapper: null,
  addProjectBtn: null,

  addProjectModal: null,
  closeProjectModalBtn: null,
  addProjectForm: null,
  projectModalTitle: null,
  projectSubmitBtn: null,
  editingProjectId: null,

  backToSphereBtn: null,
  editProjectBtn: null,
  deleteProjectBtn: null,
  projectBannerIcon: null,
  projectBannerTitle: null,
  projectBannerMeta: null,
  projectBannerProgressBadge: null,
  projectTasksList: null,
  projectQuickTaskForm: null,
  projectQuickTaskInput: null,

  taskDetailModal: null,
  closeTaskDetailBtn: null,
  taskDetailForm: null,
  detailTaskId: null,
  detailTaskTitle: null,
  detailTaskDeadline: null,
  detailTaskNote: null,
  detailChecklistItems: null,
  newSubtaskInput: null,
  addSubtaskBtn: null,
  deleteTaskBtn: null,

  propBtnDeadline: null,
  propBtnChecklist: null,
  propBtnNote: null,
  propBoxDeadline: null,
  propBoxChecklist: null,
  propBoxNote: null,
  removeDeadlineBtn: null,
  removeChecklistBtn: null,
  removeNoteBtn: null,

  inboxModal: null,
  inboxBtn: null,
  closeInboxBtn: null,
  inboxForm: null,
  inboxInput: null,
  inboxList: null,
  inboxBadge: null,

  inboxTriageModal: null,
  closeInboxTriageBtn: null,
  triageProjectsList: null,
  activeTriageThoughtId: null,

  backupBtn: null,
  backupModal: null,
  closeBackupModalBtn: null,
  downloadBackupBtn: null,
  backupFileInput: null,
  fileDropZone: null,
  backupMemoryKb: null,
  resetAllDataBtn: null,

  yandexSyncLabel: null,
  yandexNotConnectedBlock: null,
  yandexConnectedBlock: null,
  loginYandexBtn: null,
  manualYandexTokenBtn: null,
  syncYandexNowBtn: null,
  unlinkYandexBtn: null,
  cloudStatusBadge: null,
  modeMergeBtn: null,
  modeOverwriteBtn: null,
  currentImportMode: 'merge',

  installPwaBtn: null,
  iosInstallModal: null,
  closeIosInstallBtn: null,
  themeToggleBtnMobile: null,
  themeToggleBtnDesktop: null,

  customDialogModal: null,
  customDialogTitle: null,
  customDialogMessage: null,
  customDialogInput: null,
  customDialogPromptBox: null,
  customDialogConfirmBtn: null,
  customDialogCancelBtn: null,
  customDialogCloseBtn: null,
  activeDialogResolver: null,

  sphereSelectedIcon: 'briefcase',
  sphereSelectedColor: '#FFD027',
  projectSelectedIcon: 'target',
  projectSelectedColor: '#FFD027',

  currentEditingChecklist: [],
  isDragging: false,
  pendingRender: false,

  autoScrollRaf: null,
  autoScrollVelocity: 0,

palette: [
    '#FF3B30', '#FF6B4A', '#FF8A00', '#FFA726', '#FFD027', '#F4D03F',
    '#B4E816', '#20C968', '#00C9B7', '#48C9B0', '#09B5EB', '#3875FF',
    '#635BFF', '#9B51E0', '#EB2F96', '#FF5CA8', '#C8A27A', '#8C9BAE'
  ],

  init() {
    this.cacheDom();
    this.initTheme();
    if (window.LifeSync) window.LifeSync.init();
    this.renderSpheres();
    this.renderFocusTasks();
    this.renderInbox();
    this.bindEvents();
    this.renderModalPickers();
    this.updateCloudStatusUI();
  },

  cacheDom() {
    this.viewDashboard = document.getElementById('viewDashboard');
    this.viewSphere = document.getElementById('viewSphere');
    this.viewProject = document.getElementById('viewProject');

    this.focusList = document.getElementById('focusList');
    this.focusProgressFill = document.getElementById('focusProgressFill');
    this.focusRatioLabel = document.getElementById('focusRatioLabel');
    this.clearCompletedFocusBtn = document.getElementById('clearCompletedFocusBtn');
    this.headerSyncDot = document.getElementById('headerSyncDot');

    this.spheresGrid = document.getElementById('spheresGrid');
    this.addSphereBtn = document.getElementById('addSphereBtn');
    this.addSphereModal = document.getElementById('addSphereModal');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.sphereForm = document.getElementById('addSphereForm');
    this.sphereModalTitle = document.getElementById('sphereModalTitle');
    this.sphereSubmitBtn = document.getElementById('sphereSubmitBtn');

    this.backToDashboardBtn = document.getElementById('backToDashboardBtn');
    this.editSphereBtn = document.getElementById('editSphereBtn');
    this.deleteSphereBtn = document.getElementById('deleteSphereBtn');
    this.sphereBannerIcon = document.getElementById('sphereBannerIcon');
    this.sphereBannerTitle = document.getElementById('sphereBannerTitle');
    this.sphereBannerMeta = document.getElementById('sphereBannerMeta');
    this.projectsGrid = document.getElementById('projectsGrid');
    this.projectsArchiveWrapper = document.getElementById('projectsArchiveWrapper');
    this.addProjectBtn = document.getElementById('addProjectBtn');

    this.addProjectModal = document.getElementById('addProjectModal');
    this.closeProjectModalBtn = document.getElementById('closeProjectModalBtn');
    this.addProjectForm = document.getElementById('addProjectForm');
    this.projectModalTitle = document.getElementById('projectModalTitle');
    this.projectSubmitBtn = document.getElementById('projectSubmitBtn');

    this.backToSphereBtn = document.getElementById('backToSphereBtn');
    this.editProjectBtn = document.getElementById('editProjectBtn');
    this.deleteProjectBtn = document.getElementById('deleteProjectBtn');
    this.projectBannerIcon = document.getElementById('projectBannerIcon');
    this.projectBannerTitle = document.getElementById('projectBannerTitle');
    this.projectBannerMeta = document.getElementById('projectBannerMeta');
    this.projectBannerProgressBadge = document.getElementById('projectBannerProgressBadge');
    this.projectTasksList = document.getElementById('projectTasksList');
    this.projectQuickTaskForm = document.getElementById('projectQuickTaskForm');
    this.projectQuickTaskInput = document.getElementById('projectQuickTaskInput');

    this.taskDetailModal = document.getElementById('taskDetailModal');
    this.closeTaskDetailBtn = document.getElementById('closeTaskDetailBtn');
    this.taskDetailForm = document.getElementById('taskDetailForm');
    this.detailTaskId = document.getElementById('detailTaskId');
    this.detailTaskTitle = document.getElementById('detailTaskTitle');
    this.detailTaskDeadline = document.getElementById('detailTaskDeadline');
    this.detailTaskNote = document.getElementById('detailTaskNote');
    this.detailChecklistItems = document.getElementById('detailChecklistItems');
    this.newSubtaskInput = document.getElementById('newSubtaskInput');
    this.addSubtaskBtn = document.getElementById('addSubtaskBtn');
    this.deleteTaskBtn = document.getElementById('deleteTaskBtn');

    this.propBtnDeadline = document.getElementById('propBtnDeadline');
    this.propBtnChecklist = document.getElementById('propBtnChecklist');
    this.propBtnNote = document.getElementById('propBtnNote');
    this.propBoxDeadline = document.getElementById('propBoxDeadline');
    this.propBoxChecklist = document.getElementById('propBoxChecklist');
    this.propBoxNote = document.getElementById('propBoxNote');
    this.removeDeadlineBtn = document.getElementById('removeDeadlineBtn');
    this.removeChecklistBtn = document.getElementById('removeChecklistBtn');
    this.removeNoteBtn = document.getElementById('removeNoteBtn');

    this.inboxModal = document.getElementById('inboxModal');
    this.inboxBtn = document.getElementById('inboxBtn');
    this.closeInboxBtn = document.getElementById('closeInboxBtn');
    this.inboxForm = document.getElementById('inboxForm');
    this.inboxInput = document.getElementById('inboxInput');
    this.inboxList = document.getElementById('inboxList');
    this.inboxBadge = document.getElementById('inboxBadge');

    this.inboxTriageModal = document.getElementById('inboxTriageModal');
    this.closeInboxTriageBtn = document.getElementById('closeInboxTriageBtn');
    this.triageProjectsList = document.getElementById('triageProjectsList');

    this.backupBtn = document.getElementById('backupBtn');
    this.backupModal = document.getElementById('backupModal');
    this.closeBackupModalBtn = document.getElementById('closeBackupModalBtn');
    this.downloadBackupBtn = document.getElementById('downloadBackupBtn');
    this.backupFileInput = document.getElementById('backupFileInput');
    this.fileDropZone = document.getElementById('fileDropZone');
    this.backupMemoryKb = document.getElementById('backupMemoryKb');
    this.resetAllDataBtn = document.getElementById('resetAllDataBtn');

    this.yandexSyncLabel = document.getElementById('yandexSyncLabel');
    this.yandexNotConnectedBlock = document.getElementById('yandexNotConnectedBlock');
    this.yandexConnectedBlock = document.getElementById('yandexConnectedBlock');
    this.loginYandexBtn = document.getElementById('loginYandexBtn');
    this.manualYandexTokenBtn = document.getElementById('manualYandexTokenBtn');
    this.syncYandexNowBtn = document.getElementById('syncYandexNowBtn');
    this.unlinkYandexBtn = document.getElementById('unlinkYandexBtn');
    this.cloudStatusBadge = document.getElementById('cloudStatusBadge');
    this.modeMergeBtn = document.getElementById('modeMergeBtn');
    this.modeOverwriteBtn = document.getElementById('modeOverwriteBtn');
    this.diagYandexBtn = document.getElementById('diagYandexBtn');
    this.diagYandexConnectedBtn = document.getElementById('diagYandexConnectedBtn');

    this.installPwaBtn = document.getElementById('installPwaBtn');
    this.iosInstallModal = document.getElementById('iosInstallModal');
    this.closeIosInstallBtn = document.getElementById('closeIosInstallBtn');
    this.themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');
    this.themeToggleBtnDesktop = document.getElementById('themeToggleBtnDesktop');

    this.customDialogModal = document.getElementById('customDialogModal');
    this.customDialogTitle = document.getElementById('customDialogTitle');
    this.customDialogMessage = document.getElementById('customDialogMessage');
    this.customDialogInput = document.getElementById('customDialogInput');
    this.customDialogPromptBox = document.getElementById('customDialogPromptBox');
    this.customDialogConfirmBtn = document.getElementById('customDialogConfirmBtn');
    this.customDialogCancelBtn = document.getElementById('customDialogCancelBtn');
    this.customDialogCloseBtn = document.getElementById('customDialogCloseBtn');
  },

  initTheme() {
    const savedTheme = localStorage.getItem('LIFE_OS_THEME') || 'light';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    const icon = theme === 'dark' ? '☕' : '🥛';
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('LIFE_OS_THEME', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('LIFE_OS_THEME', 'light');
    }
    if (this.themeToggleBtnMobile) this.themeToggleBtnMobile.textContent = icon;
    if (this.themeToggleBtnDesktop) this.themeToggleBtnDesktop.textContent = icon;
  },

  toggleTheme() {
    const currentTheme = localStorage.getItem('LIFE_OS_THEME') || 'light';
    this.setTheme(currentTheme === 'light' ? 'dark' : 'light');
  },

  formatLastSyncDate(ts) {
    if (!ts) return 'Ещё не было';
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return 'Ещё не было';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Сегодня, ${timeStr}`;

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Вчера, ${timeStr}`;

    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d.getDate()} ${months[d.getMonth()]}, ${timeStr}`;
  },

  // 8. ЧЕСТНЫЙ СТАТУС ОБЛАКА И ТОЧКА В ШАПКЕ
  updateCloudStatusUI() {
    const status = window.LifeSync ? window.LifeSync.status : 'NOT_CONNECTED';
    const lastSyncTs = localStorage.getItem('LIFE_OS_LAST_SYNC_TS');
    const timeLabel = this.formatLastSyncDate(lastSyncTs);

    if (this.headerSyncDot) {
      this.headerSyncDot.className = 'sync-dot';
    }

    switch (status) {
      case 'SYNCED':
        if (this.headerSyncDot) {
          this.headerSyncDot.classList.add('sync-dot-synced');
          this.headerSyncDot.title = `Синхронизировано (${timeLabel})`;
        }
        this.cloudStatusBadge.textContent = '● Облако (Яндекс Диск)';
        this.cloudStatusBadge.style.color = 'var(--accent-done)';
        this.yandexSyncLabel.textContent = `Синхр: ${timeLabel}`;
        this.yandexNotConnectedBlock.style.display = 'none';
        this.yandexConnectedBlock.style.display = 'flex';
        break;

      case 'SYNCING':
        if (this.headerSyncDot) {
          this.headerSyncDot.classList.add('sync-dot-syncing');
          this.headerSyncDot.title = 'Идет синхронизация...';
        }
        this.cloudStatusBadge.textContent = '⏳ Синхронизация...';
        this.cloudStatusBadge.style.color = 'var(--folder-amber)';
        break;

      case 'OFFLINE':
        if (this.headerSyncDot) {
          this.headerSyncDot.classList.add('sync-dot-offline');
          this.headerSyncDot.title = 'Офлайн: сохранено на устройстве';
        }
        this.cloudStatusBadge.textContent = '● Офлайн (сохранено на устройстве)';
        this.cloudStatusBadge.style.color = 'var(--accent-focus)';
        this.yandexSyncLabel.textContent = `Синхр: ${timeLabel} (Офлайн)`;
        this.yandexNotConnectedBlock.style.display = 'none';
        this.yandexConnectedBlock.style.display = 'flex';
        break;

      case 'AUTH_ERROR':
        if (this.headerSyncDot) {
          this.headerSyncDot.classList.add('sync-dot-error');
          this.headerSyncDot.title = 'Ошибка: неверный токен Яндекса';
        }
        this.cloudStatusBadge.textContent = '● Ошибка: неверный токен';
        this.cloudStatusBadge.style.color = '#CF1322';
        this.yandexSyncLabel.textContent = 'Требуется вход';
        // Возвращаем кнопки входа, чтобы можно было исправить токен
        this.yandexNotConnectedBlock.style.display = 'flex';
        this.yandexConnectedBlock.style.display = 'none';
        break;

      case 'NOT_CONNECTED':
      default:
        if (this.headerSyncDot) {
          this.headerSyncDot.classList.add('sync-dot-none');
        }
        this.cloudStatusBadge.textContent = '● 100% Локально';
        this.cloudStatusBadge.style.color = 'var(--accent-done)';
        this.yandexSyncLabel.textContent = 'Не подключен';
        this.yandexNotConnectedBlock.style.display = 'flex';
        this.yandexConnectedBlock.style.display = 'none';
        break;
    }
  },

  onSilentSyncCompleted() {
    if (this.isDragging) {
      this.pendingRender = true;
      return;
    }
    this.updateCloudStatusUI();
    this.renderSpheres();
    this.renderFocusTasks();
    this.renderInbox();
    if (window.LifeState.activeSphereId) this.renderSphereProjects();
    if (window.LifeState.activeProjectId) this.renderProjectTasks();
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'neo-toast';
    const icon = type === 'error' ? '✕' : (type === 'info' ? '⚡' : '✓');
    toast.innerHTML = `<span style="font-size: 1.1rem; color: ${type === 'error' ? '#CF1322' : 'var(--accent-done)'};">${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  },

  customAlert(message, title = 'Внимание') {
    return new Promise((resolve) => {
      this.customDialogTitle.textContent = title;
      this.customDialogMessage.textContent = message;
      this.customDialogPromptBox.style.display = 'none';
      this.customDialogCancelBtn.style.display = 'none';
      this.customDialogConfirmBtn.textContent = 'Понятно';

      this.activeDialogResolver = () => resolve(true);
      this.customDialogModal.classList.add('active');
    });
  },

  customConfirm(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
      this.customDialogTitle.textContent = title;
      this.customDialogMessage.textContent = message;
      this.customDialogPromptBox.style.display = 'none';
      this.customDialogCancelBtn.style.display = 'inline-flex';
      this.customDialogConfirmBtn.textContent = 'Да, продолжить';

      this.activeDialogResolver = (confirmed) => resolve(confirmed);
      this.customDialogModal.classList.add('active');
    });
  },

  customPrompt(message, defaultValue = '', placeholder = '', title = 'Ввод данных') {
    return new Promise((resolve) => {
      this.customDialogTitle.textContent = title;
      this.customDialogMessage.textContent = message;
      this.customDialogPromptBox.style.display = 'block';
      this.customDialogInput.value = defaultValue;
      this.customDialogInput.placeholder = placeholder;
      this.customDialogCancelBtn.style.display = 'inline-flex';
      this.customDialogConfirmBtn.textContent = 'Сохранить';

      this.customDialogInput.focus();

      this.activeDialogResolver = (confirmed) => {
        resolve(confirmed ? this.customDialogInput.value.trim() : null);
      };
      this.customDialogModal.classList.add('active');
    });
  },

  closeCustomDialog(result) {
    this.customDialogModal.classList.remove('active');
    if (this.activeDialogResolver) {
      this.activeDialogResolver(result);
      this.activeDialogResolver = null;
    }
  },

  // 1. НАВИГАЦИЯ
  showDashboard() {
    window.LifeState.activeSphereId = null;
    window.LifeState.activeProjectId = null;
    this.viewSphere.classList.remove('active');
    this.viewProject.classList.remove('active');
    this.viewDashboard.classList.add('active');
    this.renderSpheres();
    this.renderFocusTasks();
    this.renderInbox();
    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  showSphere(sphereId) {
    const sphere = window.LifeState.getSphere(sphereId);
    if (!sphere) {
      this.showDashboard();
      return;
    }

    window.LifeState.activeSphereId = sphereId;
    window.LifeState.activeProjectId = null;
    this.viewDashboard.classList.remove('active');
    this.viewProject.classList.remove('active');
    this.viewSphere.classList.add('active');

    this.sphereBannerTitle.textContent = sphere.title;
    this.sphereBannerIcon.innerHTML = window.LifeIcons.get(sphere.icon);
    this.sphereBannerIcon.style.backgroundColor = this.safeColor(sphere.color);

    this.renderSphereProjects();
    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  showProject(projectId) {
    const project = window.LifeState.getProject(projectId);
    if (!project) {
      if (window.LifeState.activeSphereId) this.showSphere(window.LifeState.activeSphereId);
      else this.showDashboard();
      return;
    }

    window.LifeState.activeProjectId = projectId;
    this.viewSphere.classList.remove('active');
    this.viewProject.classList.add('active');

    this.projectBannerTitle.textContent = project.title;
    this.projectBannerIcon.innerHTML = window.LifeIcons.get(project.icon || 'target');
    this.projectBannerIcon.style.backgroundColor = this.safeColor(project.color || '#FFD027');

    this.renderProjectTasks();
    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  // 2. СЕТКА ПРОЕКТОВ
  renderSphereProjects() {
    const sphereId = window.LifeState.activeSphereId;
    if (!sphereId) return;

    const stats = window.LifeState.getSphereStats(sphereId);
    this.sphereBannerMeta.textContent = `${stats.projectsCount} ${this.declensionProjects(stats.projectsCount)} • ${stats.tasksCount} ${this.declensionTasks(stats.tasksCount)}`;

    const projects = window.LifeState.getProjectsBySphere(sphereId);

    if (projects.length === 0) {
      this.projectsGrid.innerHTML = `
        <div class="focus-empty-state" style="grid-column: 1 / -1; padding: 36px 20px;">
          🎯 В этой сфере пока нет проектов. Нажмите «+ Новый проект», чтобы наметить цель!
        </div>
      `;
      if (this.projectsArchiveWrapper) this.projectsArchiveWrapper.innerHTML = '';
      return;
    }

    const activeProjects = [];
    const completedProjects = [];

    projects.forEach(project => {
      const pStats = window.LifeState.getProjectStats(project.id);
      if (pStats.total > 0 && pStats.percent === 100) {
        completedProjects.push({ ...project, stats: pStats });
      } else {
        activeProjects.push({ ...project, stats: pStats });
      }
    });

    const createCardHtml = (project, isCompleted) => {
      const safeTitle = this.escapeHtml(project.title);
      const iconSvg = window.LifeIcons.get(project.icon || 'target');
      const pColor = this.safeColor(project.color);
      const pStats = project.stats;
      const safeId = this.safeId(project.id);

      return `
        <div class="project-notebook-card click-open-project ${isCompleted ? 'project-completed' : ''}" draggable="true" tabindex="0" role="button" aria-label="Проект ${safeTitle}" data-project-id="${safeId}">
          <div class="project-card-top">
            <div class="project-icon-badge" style="background-color: ${pColor};">
              ${iconSvg}
            </div>
            <span class="project-ratio-badge">${isCompleted ? '✓ 100%' : `${pStats.completed}/${pStats.total}`}</span>
          </div>

          <div class="project-mini-progress">
            <div class="project-mini-progress-fill" style="width: ${pStats.percent}%;"></div>
          </div>

          <h3 class="project-card-title">${safeTitle}</h3>
        </div>
      `;
    };

    if (activeProjects.length === 0 && completedProjects.length > 0) {
      this.projectsGrid.innerHTML = `
        <div class="focus-empty-state" style="grid-column: 1 / -1; padding: 24px;">
          🎉 Все текущие проекты завершены! Добавьте новый проект сверху.
        </div>
      `;
    } else {
      this.projectsGrid.innerHTML = activeProjects.map(p => createCardHtml(p, false)).join('');
    }

    if (this.projectsArchiveWrapper) {
      if (completedProjects.length > 0) {
        this.projectsArchiveWrapper.innerHTML = `
          <div class="projects-archive-section">
            <div class="projects-archive-divider">
              <span class="archive-divider-line"></span>
              <span class="archive-divider-label">📦 Завершенные цели (${completedProjects.length})</span>
              <span class="archive-divider-line"></span>
            </div>
            <div class="projects-grid" id="projectsArchiveGrid">
              ${completedProjects.map(p => createCardHtml(p, true)).join('')}
            </div>
          </div>
        `;
      } else {
        this.projectsArchiveWrapper.innerHTML = '';
      }
    }

    const bindProjectCardClicks = (container) => {
      if (!container) return;
      container.querySelectorAll('.click-open-project').forEach(card => {
        const openHandler = () => {
          if (card.classList.contains('was-dragged')) {
            card.classList.remove('was-dragged');
            return;
          }
          this.showProject(card.getAttribute('data-project-id'));
        };
        card.addEventListener('click', openHandler);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openHandler();
          }
        });
      });
    };

    bindProjectCardClicks(this.projectsGrid);
    bindProjectCardClicks(document.getElementById('projectsArchiveGrid'));

    this.setupGridDragAndDrop(this.projectsGrid, '.project-notebook-card', 'data-project-id', (order) => {
      window.LifeState.reorderProjects(sphereId, order);
      this.renderSphereProjects();
      if (window.LifeSync) window.LifeSync.triggerAutoSync();
    });

    const archiveGrid = document.getElementById('projectsArchiveGrid');
    if (archiveGrid) {
      this.setupGridDragAndDrop(archiveGrid, '.project-notebook-card', 'data-project-id', (order) => {
        window.LifeState.reorderProjects(sphereId, order);
        this.renderSphereProjects();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    }
  },

  // 3. ЗАДАЧИ ВНУТРИ ПРОЕКТА
  renderProjectTasks() {
    const projectId = window.LifeState.activeProjectId;
    if (!projectId) return;

    const pStats = window.LifeState.getProjectStats(projectId);
    this.projectBannerMeta.textContent = `${pStats.completed} из ${pStats.total} ${this.declensionTasks(pStats.total)} закрыто`;
    this.projectBannerProgressBadge.textContent = `${pStats.percent}%`;

    const tasks = window.LifeState.getTasksByProject(projectId);

    if (tasks.length === 0) {
      this.projectTasksList.innerHTML = `
        <div class="focus-empty-state" style="padding: 24px;">
          📝 Задач пока нет. Добавьте первый конкретный шаг в поле ниже!
        </div>
      `;
      return;
    }

    this.projectTasksList.innerHTML = tasks.map(task => {
      const safeTaskTitle = this.escapeHtml(task.title);
      const safeTaskId = this.safeId(task.id);

      let badgesHtml = '';
      if (task.deadline) {
        badgesHtml += `<span class="task-property-badge">📅 ${this.formatDate(task.deadline)}</span>`;
      }
      if (task.checklist && task.checklist.length > 0) {
        const done = task.checklist.filter(s => s.completed).length;
        badgesHtml += `<span class="task-property-badge">☑️ ${done}/${task.checklist.length}</span>`;
      }
      if (task.note && task.note.trim()) {
        badgesHtml += `<span class="task-property-badge">📝</span>`;
      }

      return `
        <div class="task-item ${task.completed ? 'task-completed' : ''}" draggable="true" data-task-id="${safeTaskId}">
          <div class="task-main-row">
            <input type="checkbox" class="task-checkbox chk-p-task" id="pjchk-${safeTaskId}" aria-label="Отметить выполненной" ${task.completed ? 'checked' : ''}>
            <span class="task-text open-task-modal" data-task-id="${safeTaskId}">${safeTaskTitle}</span>
            <button class="task-star-btn toggle-p-star" aria-label="${task.inFocus ? 'В фокусе дня' : 'Добавить в фокус дня'}" title="${task.inFocus ? 'В фокусе дня' : 'Добавить в фокус дня'}" data-task-id="${safeTaskId}">
              ${task.inFocus ? '⭐' : '☆'}
            </button>
          </div>
          ${badgesHtml ? `
            <div class="task-footer-row" style="margin-top: 2px;">
              <div class="task-badges-left">${badgesHtml}</div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    this.bindProjectTaskEvents();

    this.setupGridDragAndDrop(this.projectTasksList, '.task-item', 'data-task-id', (order) => {
      window.LifeState.reorderTasks(projectId, order);
      this.renderProjectTasks();
      if (window.LifeSync) window.LifeSync.triggerAutoSync();
    });
  },

  bindProjectTaskEvents() {
    const checkboxes = this.projectTasksList.querySelectorAll('.chk-p-task');
    checkboxes.forEach(box => {
      box.addEventListener('change', (e) => {
        const taskId = e.target.id.replace('pjchk-', '');
        const updated = window.LifeState.toggleTaskCompleted(taskId);

        if (updated && updated.completed) {
          if (navigator.vibrate) navigator.vibrate(40);
          if (window.LifeConfetti) {
            const rect = e.target.getBoundingClientRect();
            window.LifeConfetti.shoot(rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        } else if (updated && !updated.completed) {
          if (navigator.vibrate) navigator.vibrate(20);
        }

        this.renderProjectTasks();
        this.renderFocusTasks();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    });

    const stars = this.projectTasksList.querySelectorAll('.toggle-p-star');
    stars.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        window.LifeState.toggleTaskFocus(taskId);
        this.renderProjectTasks();
        this.renderFocusTasks();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    });

    const titles = this.projectTasksList.querySelectorAll('.open-task-modal');
    titles.forEach(el => {
      el.addEventListener('click', () => {
        const taskId = el.getAttribute('data-task-id');
        this.openTaskDetailModal(taskId);
      });
    });
  },

  // 4. ДЕТАЛЬНАЯ МОДАЛКА ЗАДАЧИ
  openTaskDetailModal(taskId) {
    const task = window.LifeState.getTask(taskId);
    if (!task) return;

    this.detailTaskId.value = task.id;
    this.detailTaskTitle.value = task.title;
    this.currentEditingChecklist = JSON.parse(JSON.stringify(task.checklist || []));

    if (task.deadline) {
      this.propBoxDeadline.style.display = 'flex';
      this.detailTaskDeadline.value = task.deadline;
    } else {
      this.propBoxDeadline.style.display = 'none';
      this.detailTaskDeadline.value = '';
    }

    if (task.note) {
      this.propBoxNote.style.display = 'flex';
      this.detailTaskNote.value = task.note;
    } else {
      this.propBoxNote.style.display = 'none';
      this.detailTaskNote.value = '';
    }

    if (this.currentEditingChecklist.length > 0) {
      this.propBoxChecklist.style.display = 'flex';
      this.renderChecklistItems();
    } else {
      this.propBoxChecklist.style.display = 'none';
      this.detailChecklistItems.innerHTML = '';
    }

    this.taskDetailModal.classList.add('active');
  },

  renderChecklistItems() {
    this.detailChecklistItems.innerHTML = this.currentEditingChecklist.map((item, index) => `
      <div class="subtask-row ${item.completed ? 'subtask-completed' : ''}">
        <div class="subtask-left">
          <input type="checkbox" class="task-checkbox" style="width: 18px; height: 18px; min-width: 18px; min-height: 18px;" ${item.completed ? 'checked' : ''} data-checklist-index="${index}">
          <span class="subtask-text">${this.escapeHtml(item.text)}</span>
        </div>
        <button type="button" class="inbox-delete-btn" style="width: 22px; height: 22px;" data-remove-subtask="${index}">✕</button>
      </div>
    `).join('');

    const boxes = this.detailChecklistItems.querySelectorAll('[data-checklist-index]');
    boxes.forEach(box => {
      box.addEventListener('change', (e) => {
        const idx = e.target.getAttribute('data-checklist-index');
        this.currentEditingChecklist[idx].completed = e.target.checked;
        this.renderChecklistItems();
      });
    });

    const removeButtons = this.detailChecklistItems.querySelectorAll('[data-remove-subtask]');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.getAttribute('data-remove-subtask');
        this.currentEditingChecklist.splice(idx, 1);
        this.renderChecklistItems();
      });
    });
  },

  // 5. ФОКУС ДНЯ
  renderFocusTasks() {
    if (!this.focusList) return;
    const tasks = window.LifeState.getFocusTasks();

    if (tasks.length === 0) {
      this.focusList.innerHTML = `
        <div class="focus-empty-state">
          ☕ Все дела на сегодня сделаны или ещё не выбраны. Загляните в проекты или просто отдохните!
        </div>
      `;
      if (this.focusProgressFill) this.focusProgressFill.style.width = '0%';
      if (this.focusRatioLabel) this.focusRatioLabel.textContent = '0/0';
      if (this.clearCompletedFocusBtn) this.clearCompletedFocusBtn.style.display = 'none';
      return;
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const percent = Math.round((completedCount / tasks.length) * 100);

    if (this.focusProgressFill) this.focusProgressFill.style.width = `${percent}%`;
    if (this.focusRatioLabel) this.focusRatioLabel.textContent = `${completedCount}/${tasks.length}`;

    if (this.clearCompletedFocusBtn) {
      this.clearCompletedFocusBtn.style.display = completedCount > 0 ? 'inline-flex' : 'none';
    }

    this.focusList.innerHTML = tasks.map(task => {
      const safeTitle = this.escapeHtml(task.title);
      const safeProject = this.escapeHtml(task.projectName);
      const sphereColor = this.safeColor(task.sphereColor);
      const safeTaskId = this.safeId(task.id);

      let badgesHtml = '';
      if (task.isDueToday) {
        badgesHtml += `<span class="task-property-badge" style="background: var(--folder-amber); color: #141414;">🔥 Сегодня</span>`;
      } else if (task.deadline) {
        badgesHtml += `<span class="task-property-badge">📅 ${this.formatDate(task.deadline)}</span>`;
      }

      if (task.checklist && task.checklist.length > 0) {
        const done = task.checklist.filter(s => s.completed).length;
        badgesHtml += `<span class="task-property-badge">☑️ ${done}/${task.checklist.length}</span>`;
      }
      if (task.note && task.note.trim()) {
        badgesHtml += `<span class="task-property-badge">📝</span>`;
      }

      return `
        <div class="task-item ${task.completed ? 'task-completed' : ''}" data-task-id="${safeTaskId}">
          <div class="task-main-row">
            <input type="checkbox" class="task-checkbox chk-focus-task" id="chk-${safeTaskId}" ${task.completed ? 'checked' : ''} aria-label="Отметить выполненной">
            <label for="chk-${safeTaskId}" class="task-text">${safeTitle}</label>
            <button class="task-star-btn unfocus-focus-btn" title="Убрать из фокуса дня" aria-label="Убрать из фокуса дня" data-unfocus-id="${safeTaskId}">⭐</button>
          </div>
          
          <div class="task-footer-row">
            <div class="task-badges-left">
              ${badgesHtml}
            </div>
            <span class="tag-project">
              <span class="tag-dot" style="background-color: ${sphereColor};"></span>
              ${safeProject}
            </span>
          </div>
        </div>
      `;
    }).join('');

    this.bindFocusEvents();
  },

  bindFocusEvents() {
    const checkboxes = this.focusList.querySelectorAll('.chk-focus-task');
    checkboxes.forEach(box => {
      box.addEventListener('change', (e) => {
        const taskId = e.target.id.replace('chk-', '');
        const updatedTask = window.LifeState.toggleTaskCompleted(taskId);

        if (updatedTask && updatedTask.completed) {
          if (navigator.vibrate) navigator.vibrate(40); // Тактильный щелчок
          if (window.LifeConfetti) {
            const rect = e.target.getBoundingClientRect();
            window.LifeConfetti.shoot(rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        } else if (updatedTask && !updatedTask.completed) {
          if (navigator.vibrate) navigator.vibrate(20); // Легкий отклик при снятии галочки
        }

        this.renderFocusTasks();
        this.renderSpheres();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    });

    const starButtons = this.focusList.querySelectorAll('.unfocus-focus-btn');
    starButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-unfocus-id');
        window.LifeState.toggleTaskFocus(taskId);
        this.renderFocusTasks();
        this.renderSpheres();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    });
  },

  // 6. ИНБОКС
  renderInbox() {
    const items = window.LifeState.getInbox();
    
    if (this.inboxBadge) {
      this.inboxBadge.textContent = items.length;
      this.inboxBadge.style.display = items.length > 0 ? 'inline-block' : 'none';
    }

    if (!this.inboxList) return;

    if (items.length === 0) {
      this.inboxList.innerHTML = `
        <div class="focus-empty-state">
          💡 Входящих мыслей нет. Голова полностью свободна!
        </div>
      `;
      return;
    }

    this.inboxList.innerHTML = items.map(item => {
      const safeId = this.safeId(item.id);
      return `
        <div class="inbox-item" data-inbox-id="${safeId}">
          <span class="inbox-item-text">${this.escapeHtml(item.text)}</span>
          <div class="inbox-actions-group">
            <button type="button" class="inbox-triage-btn" data-triage-id="${safeId}" title="Перенести в проект">↗ В проект</button>
            <button type="button" class="inbox-delete-btn" data-delete-inbox="${safeId}" title="Удалить мысль">✕</button>
          </div>
        </div>
      `;
    }).join('');

    const delButtons = this.inboxList.querySelectorAll('[data-delete-inbox]');
    delButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-inbox');
        window.LifeState.deleteInboxThought(id);
        this.renderInbox();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    });

    const triageButtons = this.inboxList.querySelectorAll('[data-triage-id]');
    triageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-triage-id');
        this.openInboxTriageModal(id);
      });
    });
  },

  openInboxTriageModal(thoughtId) {
    this.activeTriageThoughtId = thoughtId;
    const allProjects = window.LifeState.data.projects || [];

    if (allProjects.length === 0) {
      this.customAlert('Сначала создайте хотя бы один проект внутри любой сферы.', 'Нет проектов');
      return;
    }

    this.triageProjectsList.innerHTML = allProjects.map(p => {
      const sphere = window.LifeState.getSphere(p.sphereId);
      const sphereName = sphere ? sphere.title : 'Общее';
      const icon = window.LifeIcons.get(p.icon || 'target');
      const safeId = this.safeId(p.id);

      return `
        <div class="triage-project-option" data-target-project="${safeId}">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-flex; width: 22px; height: 22px;">${icon}</span>
            <span style="font-weight: 700; font-size: 0.95rem;">${this.escapeHtml(p.title)}</span>
          </div>
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--ink-muted);">${this.escapeHtml(sphereName)}</span>
        </div>
      `;
    }).join('');

    const options = this.triageProjectsList.querySelectorAll('[data-target-project]');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        const pId = opt.getAttribute('data-target-project');
        window.LifeState.moveInboxThoughtToProject(this.activeTriageThoughtId, pId);
        this.inboxTriageModal.classList.remove('active');
        this.renderInbox();
        this.renderSpheres();
        this.showToast('Мысль превращена в задачу проекта!');
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    });

    this.inboxTriageModal.classList.add('active');
  },

  // 7. СФЕРЫ В КАРТОТЕКЕ
  renderSpheres() {
    if (!this.spheresGrid) return;
    const spheres = window.LifeState.getSpheres();

    if (spheres.length === 0) {
      this.spheresGrid.innerHTML = `
        <div class="focus-empty-state" style="grid-column: 1 / -1; padding: 36px 20px;">
          📁 Картотека пуста. Нажмите «+ Добавить сферу», чтобы создать категорию жизни (например, «Работа» или «Личное»)!
        </div>
      `;
      return;
    }

    this.spheresGrid.innerHTML = spheres.map(sphere => {
      const stats = window.LifeState.getSphereStats(sphere.id);
      const safeTitle = this.escapeHtml(sphere.title);
      const iconSvg = window.LifeIcons.get(sphere.icon);
      const safeColor = this.safeColor(sphere.color);
      const safeId = this.safeId(sphere.id);

      return `
        <div class="neo-folder click-open-sphere" draggable="true" tabindex="0" role="button" aria-label="Сфера ${safeTitle}" style="--tab-color: ${safeColor};" data-sphere-id="${safeId}">
          <div class="folder-tab"></div>
          <div class="folder-card">
            <div class="folder-top-row">
              <div class="folder-icon-badge">${iconSvg}</div>
              <div class="folder-meta">
                <span>${stats.projectsCount} ${this.declensionProjects(stats.projectsCount)}</span>
                <span>${stats.tasksCount} ${this.declensionTasks(stats.tasksCount)}</span>
              </div>
            </div>
            <h3 class="folder-title">${safeTitle}</h3>
          </div>
        </div>
      `;
    }).join('');

    const folderCards = this.spheresGrid.querySelectorAll('.click-open-sphere');
    folderCards.forEach(folder => {
      const openHandler = () => {
        if (folder.classList.contains('was-dragged')) {
          folder.classList.remove('was-dragged');
          return;
        }
        this.showSphere(folder.getAttribute('data-sphere-id'));
      };
      folder.addEventListener('click', openHandler);
      folder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openHandler();
        }
      });
    });

    this.setupGridDragAndDrop(this.spheresGrid, '.click-open-sphere', 'data-sphere-id', (order) => {
      window.LifeState.reorderSpheres(order);
      this.renderSpheres();
      if (window.LifeSync) window.LifeSync.triggerAutoSync();
    });
  },

  // АВТОСКРОЛЛ ПРИ ПЕРЕТАСКИВАНИИ
  startAutoScroll() {
    if (this.autoScrollRaf) return;
    const step = () => {
      if (this.autoScrollVelocity !== 0) {
        window.scrollBy(0, this.autoScrollVelocity);
        this.autoScrollRaf = requestAnimationFrame(step);
      } else {
        this.autoScrollRaf = null;
      }
    };
    this.autoScrollRaf = requestAnimationFrame(step);
  },

  updateAutoScroll(clientY) {
    const edgeThreshold = 80;
    const maxSpeed = 15;
    const viewHeight = window.innerHeight;

    if (clientY < edgeThreshold) {
      const factor = (edgeThreshold - clientY) / edgeThreshold;
      this.autoScrollVelocity = -Math.round(factor * maxSpeed);
      this.startAutoScroll();
    } else if (clientY > viewHeight - edgeThreshold) {
      const factor = (clientY - (viewHeight - edgeThreshold)) / edgeThreshold;
      this.autoScrollVelocity = Math.round(factor * maxSpeed);
      this.startAutoScroll();
    } else {
      this.autoScrollVelocity = 0;
    }
  },

  stopAutoScroll() {
    this.autoScrollVelocity = 0;
    if (this.autoScrollRaf) {
      cancelAnimationFrame(this.autoScrollRaf);
      this.autoScrollRaf = null;
    }
  },

  setupGridDragAndDrop(container, itemSelector, idAttr, onReorder) {
    if (!container) return;

    container._dndReorderCallback = onReorder;
    if (container._hasDndListeners) return;
    container._hasDndListeners = true;

    let dragEl = null;
    let touchTimer = null;
    let isTouchDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;

    container.addEventListener('dragstart', (e) => {
      const item = e.target.closest(itemSelector);
      if (!item || item.parentElement !== container) return;

      this.isDragging = true;
      dragEl = item;
      setTimeout(() => item && item.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.getAttribute(idAttr) || '');
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.updateAutoScroll(e.clientY);

      if (!dragEl) return;
      const target = e.target.closest(itemSelector);
      if (!target || target === dragEl || target.parentElement !== container) return;

      const rect = target.getBoundingClientRect();
      const isGrid = container.classList.contains('spheres-grid') || 
                     container.classList.contains('projects-grid') || 
                     container.id === 'projectsArchiveGrid';

      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;

      let isAfter = isGrid ? (Math.abs(e.clientY - midY) > rect.height * 0.2 ? e.clientY > midY : e.clientX > midX) : e.clientY > midY;

      const nextSibling = isAfter ? target.nextElementSibling : target;
      if (nextSibling !== dragEl && nextSibling !== dragEl.nextElementSibling) {
        container.insertBefore(dragEl, nextSibling);
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    container.addEventListener('dragend', () => {
      this.stopAutoScroll();
      this.isDragging = false;
      if (!dragEl) return;
      const item = dragEl;
      item.classList.remove('dragging');
      item.classList.add('was-dragged');
      dragEl = null;

      setTimeout(() => item.classList.remove('was-dragged'), 300);

      const newOrder = Array.from(container.querySelectorAll(itemSelector))
        .map(el => el.getAttribute(idAttr))
        .filter(Boolean);

      if (container._dndReorderCallback) {
        container._dndReorderCallback(newOrder);
      }

      if (this.pendingRender) {
        this.pendingRender = false;
        this.onSilentSyncCompleted();
      }
    });

    container.addEventListener('touchstart', (e) => {
      const item = e.target.closest(itemSelector);
      if (!item || item.parentElement !== container) return;
      if (e.target.closest('button, input, textarea, a, .task-checkbox')) return;

      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        window.LifeUI.isDragging = true;
        dragEl = item;
        isTouchDragging = true;
        item.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(30);
      }, 190);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];

      if (!isTouchDragging) {
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        if (deltaX > 8 || deltaY > 8) {
          clearTimeout(touchTimer);
        }
        return;
      }

      e.preventDefault();
      this.updateAutoScroll(touch.clientY);

      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!elem) return;

      const target = elem.closest(itemSelector);
      if (!target || target === dragEl || target.parentElement !== container) return;

      const rect = target.getBoundingClientRect();
      const isGrid = container.classList.contains('spheres-grid') || 
                     container.classList.contains('projects-grid') || 
                     container.id === 'projectsArchiveGrid';

      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;

      let isAfter = isGrid ? (Math.abs(touch.clientY - midY) > rect.height * 0.2 ? touch.clientY > midY : touch.clientX > midX) : touch.clientY > midY;

      const nextSibling = isAfter ? target.nextElementSibling : target;
      if (nextSibling !== dragEl && nextSibling !== dragEl.nextElementSibling) {
        container.insertBefore(dragEl, nextSibling);
      }
    }, { passive: false });

    const finishTouch = () => {
      clearTimeout(touchTimer);
      this.stopAutoScroll();
      window.LifeUI.isDragging = false;

      if (isTouchDragging && dragEl) {
        const item = dragEl;
        item.classList.remove('dragging');
        item.classList.add('was-dragged');
        setTimeout(() => item.classList.remove('was-dragged'), 300);

        dragEl = null;
        isTouchDragging = false;

        const newOrder = Array.from(container.querySelectorAll(itemSelector))
          .map(el => el.getAttribute(idAttr))
          .filter(Boolean);

        if (container._dndReorderCallback) {
          container._dndReorderCallback(newOrder);
        }
      } else {
        dragEl = null;
        isTouchDragging = false;
      }

      if (window.LifeUI.pendingRender) {
        window.LifeUI.pendingRender = false;
        window.LifeUI.onSilentSyncCompleted();
      }
    };

    container.addEventListener('touchend', finishTouch);
    container.addEventListener('touchcancel', finishTouch);
  },

  // 9. СОБЫТИЯ
  bindEvents() {
    if (this.themeToggleBtnMobile) {
      this.themeToggleBtnMobile.addEventListener('click', () => this.toggleTheme());
    }
    if (this.themeToggleBtnDesktop) {
      this.themeToggleBtnDesktop.addEventListener('click', () => this.toggleTheme());
    }

    this.backToDashboardBtn.addEventListener('click', () => this.showDashboard());
    this.backToSphereBtn.addEventListener('click', () => {
      if (window.LifeState.activeSphereId) {
        this.showSphere(window.LifeState.activeSphereId);
      } else {
        this.showDashboard();
      }
    });

    if (this.clearCompletedFocusBtn) {
      this.clearCompletedFocusBtn.addEventListener('click', () => {
        window.LifeState.clearCompletedFocusTasks();
        this.renderFocusTasks();
        this.showToast('Выполненные дела убраны из фокуса');
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      });
    }

    this.deleteSphereBtn.addEventListener('click', async () => {
      const sId = window.LifeState.activeSphereId;
      if (sId) {
        const confirmed = await this.customConfirm('Удалить эту сферу и все входящие в нее проекты и задачи? Это действие необратимо.', 'Удаление сферы');
        if (confirmed) {
          window.LifeState.deleteSphere(sId);
          this.showToast('Сфера удалена');
          this.showDashboard();
          if (window.LifeSync) window.LifeSync.triggerAutoSync();
        }
      }
    });

    this.editSphereBtn.addEventListener('click', () => {
      const sId = window.LifeState.activeSphereId;
      const sphere = window.LifeState.getSphere(sId);
      if (!sphere) return;

      this.editingSphereId = sphere.id;
      this.sphereModalTitle.textContent = 'Редактировать сферу';
      this.sphereSubmitBtn.textContent = '💾 Сохранить изменения';
      document.getElementById('sphereTitleInput').value = sphere.title;

      this.sphereSelectedIcon = sphere.icon || 'folder';
      this.sphereSelectedColor = sphere.color || '#FFD027';
      this.updateSphereModalPickers();

      this.addSphereModal.classList.add('active');
    });

    this.deleteProjectBtn.addEventListener('click', async () => {
      const pId = window.LifeState.activeProjectId;
      if (pId) {
        const confirmed = await this.customConfirm('Удалить этот проект и все его задачи? Это действие необратимо.', 'Удаление проекта');
        if (confirmed) {
          const sphereId = window.LifeState.activeSphereId;
          window.LifeState.deleteProject(pId);
          this.showToast('Проект удален');
          this.showSphere(sphereId);
          if (window.LifeSync) window.LifeSync.triggerAutoSync();
        }
      }
    });

    this.editProjectBtn.addEventListener('click', () => {
      const pId = window.LifeState.activeProjectId;
      const project = window.LifeState.getProject(pId);
      if (!project) return;

      this.editingProjectId = project.id;
      this.projectModalTitle.textContent = 'Редактировать проект';
      this.projectSubmitBtn.textContent = '💾 Сохранить изменения';
      document.getElementById('projectTitleInput').value = project.title;

      this.projectSelectedIcon = project.icon || 'target';
      this.projectSelectedColor = project.color || '#FFD027';
      this.updateProjectModalPickers();

      this.addProjectModal.classList.add('active');
    });

    this.projectQuickTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = this.projectQuickTaskInput.value.trim();
      const pId = window.LifeState.activeProjectId;

      if (title && pId) {
        window.LifeState.addTask({ projectId: pId, title });
        this.projectQuickTaskInput.value = '';
        this.renderProjectTasks();
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      }
    });

    this.addSphereBtn.addEventListener('click', () => {
      this.editingSphereId = null;
      this.sphereModalTitle.textContent = 'Новая сфера жизни';
      this.sphereSubmitBtn.textContent = '+ Создать сферу';
      document.getElementById('sphereTitleInput').value = '';
      this.updateSphereModalPickers();
      this.addSphereModal.classList.add('active');
      document.getElementById('sphereTitleInput').focus();
    });
    this.closeModalBtn.addEventListener('click', () => this.addSphereModal.classList.remove('active'));

    this.addProjectBtn.addEventListener('click', () => {
      this.editingProjectId = null;
      this.projectModalTitle.textContent = 'Новый проект';
      this.projectSubmitBtn.textContent = '+ Создать блокнот проекта';
      document.getElementById('projectTitleInput').value = '';
      this.updateProjectModalPickers();
      this.addProjectModal.classList.add('active');
      setTimeout(() => document.getElementById('projectTitleInput').focus(), 100);
    });
    this.closeProjectModalBtn.addEventListener('click', () => this.addProjectModal.classList.remove('active'));

    this.addProjectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('projectTitleInput');
      const title = input.value.trim();
      const sphereId = window.LifeState.activeSphereId;

      if (title) {
        if (this.editingProjectId) {
          window.LifeState.updateProject(this.editingProjectId, {
            title: title,
            icon: this.projectSelectedIcon,
            color: this.projectSelectedColor
          });
          this.showToast('Проект обновлен');
          this.showProject(this.editingProjectId);
        } else if (sphereId) {
          window.LifeState.addProject({
            sphereId: sphereId,
            title: title,
            icon: this.projectSelectedIcon,
            color: this.projectSelectedColor
          });
          this.showToast('Проект создан');
          this.renderSphereProjects();
        }

        input.value = '';
        this.addProjectModal.classList.remove('active');
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      }
    });

    this.inboxBtn.addEventListener('click', () => {
      this.renderInbox();
      this.inboxModal.classList.add('active');
    });
    this.closeInboxBtn.addEventListener('click', () => this.inboxModal.classList.remove('active'));

    this.closeInboxTriageBtn.addEventListener('click', () => {
      this.inboxTriageModal.classList.remove('active');
    });

    this.closeTaskDetailBtn.addEventListener('click', () => this.taskDetailModal.classList.remove('active'));
    this.closeIosInstallBtn.addEventListener('click', () => this.iosInstallModal.classList.remove('active'));

    this.backupBtn.addEventListener('click', () => {
      const stats = window.LifeBackup.getStorageStats();
      this.backupMemoryKb.textContent = `${stats.kb} КБ`;
      this.updateCloudStatusUI();
      this.backupModal.classList.add('active');
    });

    this.closeBackupModalBtn.addEventListener('click', () => {
      this.backupModal.classList.remove('active');
    });

    this.loginYandexBtn.addEventListener('click', () => {
      window.LifeSync.startOAuthLogin();
    });

    this.manualYandexTokenBtn.addEventListener('click', async () => {
      const currentToken = localStorage.getItem('LIFE_OS_YANDEX_TOKEN') || '';
      const token = await this.customPrompt(
        'Вставьте ваш OAuth-токен Яндекс Диска (начинается на y0_...):',
        currentToken,
        'y0_AgAAAA...',
        'Яндекс Диск'
      );

      if (token) {
        window.LifeSync.setYandexToken(token);
        this.showToast('Проверяем токен...');
        this.syncYandexNowBtn.textContent = 'Синхронизация...';
        window.LifeSync.syncWithYandexDisk((res) => {
          this.syncYandexNowBtn.textContent = 'Синхронизировать сейчас 🔄';
          if (res.success) {
            this.showToast('Яндекс Диск подключен!');
            this.renderSpheres();
            this.renderFocusTasks();
            this.renderInbox();
          } else {
            this.customAlert(`Ошибка: ${res.error}`, 'Ошибка Яндекс Диска');
          }
        });
      }
    });

    this.syncYandexNowBtn.addEventListener('click', () => {
      this.syncYandexNowBtn.textContent = 'Синхронизация...';
      window.LifeSync.syncWithYandexDisk((res) => {
        this.syncYandexNowBtn.textContent = 'Синхронизировать сейчас 🔄';
        if (res.success) {
          this.showToast('Синхронизировано!');
          this.renderSpheres();
          this.renderFocusTasks();
          this.renderInbox();
        } else {
          this.customAlert(`Ошибка: ${res.error}`, 'Ошибка');
        }
      });
    });

    this.unlinkYandexBtn.addEventListener('click', async () => {
      const confirmed = await this.customConfirm('Отвязать Яндекс Диск от этого устройства?', 'Отключение синхронизации');
      if (confirmed) {
        window.LifeSync.unlinkYandex();
        this.showToast('Яндекс Диск отключен');
      }
    });

    const runDiagHandler = async () => {
      this.showToast('Запуск диагностики...');
      const report = await window.LifeSync.runDiagnostic();
      this.customAlert(report, 'Диагностика Яндекс Диска');
    };

    if (this.diagYandexBtn) this.diagYandexBtn.addEventListener('click', runDiagHandler);
    if (this.diagYandexConnectedBtn) this.diagYandexConnectedBtn.addEventListener('click', runDiagHandler);

    this.downloadBackupBtn.addEventListener('click', () => {
      const fileName = window.LifeBackup.exportData();
      this.showToast(`Резервная копия скачана: ${fileName}`);
    });

    this.modeMergeBtn.addEventListener('click', () => {
      this.currentImportMode = 'merge';
      this.modeMergeBtn.classList.add('active');
      this.modeOverwriteBtn.classList.remove('active');
    });

    this.modeOverwriteBtn.addEventListener('click', () => {
      this.currentImportMode = 'overwrite';
      this.modeOverwriteBtn.classList.add('active');
      this.modeMergeBtn.classList.remove('active');
    });

    this.fileDropZone.addEventListener('click', () => {
      this.backupFileInput.click();
    });

    this.backupFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const modeText = this.currentImportMode === 'merge' ? 'Умное слияние (без потерь)' : 'Полная перезапись';
      const confirmed = await this.customConfirm(`Запустить восстановление файла в режиме «${modeText}»?`, 'Восстановление базы');

      if (confirmed) {
        window.LifeBackup.importFromFile(file, this.currentImportMode, (res) => {
          if (res.success) {
            this.showToast(`Восстановлено! Задач: ${res.count}`);
            this.backupModal.classList.remove('active');
            this.showDashboard();
            this.renderInbox();
            if (window.LifeSync) window.LifeSync.triggerAutoSync();
          } else {
            this.customAlert(`Ошибка: ${res.error}`, 'Сбой восстановления');
          }
          this.backupFileInput.value = '';
        });
      } else {
        this.backupFileInput.value = '';
      }
    });

    this.resetAllDataBtn.addEventListener('click', async () => {
      const confirmed = await this.customConfirm(
        'Вы уверены, что хотите полностью стереть все данные? Все сферы, проекты, задачи и мысли в инбоксе будут удалены навсегда.',
        'Полная очистка'
      );

      if (confirmed) {
        window.LifeState.resetAll();
        this.backupModal.classList.remove('active');
        this.showDashboard();
        this.renderInbox();
        this.showToast('База полностью очищена');
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      }
    });

    this.propBtnDeadline.addEventListener('click', () => {
      this.propBoxDeadline.style.display = 'flex';
      this.detailTaskDeadline.focus();
    });
    this.removeDeadlineBtn.addEventListener('click', () => {
      this.propBoxDeadline.style.display = 'none';
      this.detailTaskDeadline.value = '';
    });

    this.propBtnChecklist.addEventListener('click', () => {
      this.propBoxChecklist.style.display = 'flex';
      this.newSubtaskInput.focus();
    });
    this.removeChecklistBtn.addEventListener('click', () => {
      this.propBoxChecklist.style.display = 'none';
      this.currentEditingChecklist = [];
      this.detailChecklistItems.innerHTML = '';
    });

    this.propBtnNote.addEventListener('click', () => {
      this.propBoxNote.style.display = 'flex';
      this.detailTaskNote.focus();
    });
    this.removeNoteBtn.addEventListener('click', () => {
      this.propBoxNote.style.display = 'none';
      this.detailTaskNote.value = '';
    });

    const addSubtask = () => {
      const text = this.newSubtaskInput.value.trim();
      if (text) {
        this.currentEditingChecklist.push({ text, completed: false });
        this.newSubtaskInput.value = '';
        this.renderChecklistItems();
      }
    };
    this.addSubtaskBtn.addEventListener('click', addSubtask);
    this.newSubtaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSubtask();
      }
    });

    this.taskDetailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const taskId = this.detailTaskId.value;
      const title = this.detailTaskTitle.value.trim();
      const deadline = this.propBoxDeadline.style.display !== 'none' ? this.detailTaskDeadline.value : null;
      const note = this.propBoxNote.style.display !== 'none' ? this.detailTaskNote.value.trim() : '';
      const checklist = this.propBoxChecklist.style.display !== 'none' ? this.currentEditingChecklist : [];

      if (taskId && title) {
        window.LifeState.updateTask(taskId, { title, deadline, note, checklist });
        this.taskDetailModal.classList.remove('active');
        if (window.LifeState.activeProjectId) this.renderProjectTasks();
        this.renderFocusTasks();
        this.showToast('Задача обновлена');
        if (window.LifeSync) window.LifeSync.triggerAutoSync();
      }
    });

    this.deleteTaskBtn.addEventListener('click', async () => {
      const taskId = this.detailTaskId.value;
      if (taskId) {
        const confirmed = await this.customConfirm('Удалить эту задачу навсегда?', 'Удаление задачи');
        if (confirmed) {
          window.LifeState.deleteTask(taskId);
          this.taskDetailModal.classList.remove('active');
          if (window.LifeState.activeProjectId) this.renderProjectTasks();
          this.renderFocusTasks();
          this.showToast('Задача удалена');
          if (window.LifeSync) window.LifeSync.triggerAutoSync();
        }
      }
    });

    this.customDialogConfirmBtn.addEventListener('click', () => this.closeCustomDialog(true));
    this.customDialogCancelBtn.addEventListener('click', () => this.closeCustomDialog(false));
    this.customDialogCloseBtn.addEventListener('click', () => this.closeCustomDialog(false));

    [this.addSphereModal, this.inboxModal, this.addProjectModal, this.taskDetailModal, this.iosInstallModal, this.backupModal, this.inboxTriageModal].forEach(overlay => {
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.classList.remove('active');
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [this.addSphereModal, this.inboxModal, this.addProjectModal, this.taskDetailModal, this.iosInstallModal, this.backupModal, this.customDialogModal, this.inboxTriageModal].forEach(m => {
          if (m) m.classList.remove('active');
        });
      }
    });

    this.sphereForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('sphereTitleInput');
      const title = input.value.trim();
      if (!title) return;

      if (this.editingSphereId) {
        window.LifeState.updateSphere(this.editingSphereId, {
          title,
          icon: this.sphereSelectedIcon,
          color: this.sphereSelectedColor
        });
        this.showToast('Сфера обновлена');
        this.showSphere(this.editingSphereId);
      } else {
        window.LifeState.addSphere({
          title,
          icon: this.sphereSelectedIcon,
          color: this.sphereSelectedColor
        });
        this.showToast('Сфера создана');
        this.renderSpheres();
      }

      this.addSphereModal.classList.remove('active');
      input.value = '';
      if (window.LifeSync) window.LifeSync.triggerAutoSync();
    });

    this.inboxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.inboxInput.value.trim();
      if (!text) return;

      window.LifeState.addInboxThought(text);
      this.inboxInput.value = '';
      this.renderInbox();
      this.showToast('Мысль записана в Инбокс');
      if (window.LifeSync) window.LifeSync.triggerAutoSync();
    });
  },

  updateSphereModalPickers() {
    document.querySelectorAll('#sphereIconPickerGrid .icon-choice-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-s-icon') === this.sphereSelectedIcon);
    });
    document.querySelectorAll('#sphereColorPickerGrid .color-choice-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-s-color') === this.sphereSelectedColor);
    });
  },

  updateProjectModalPickers() {
    document.querySelectorAll('#projectIconPickerGrid .icon-choice-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-p-icon') === this.projectSelectedIcon);
    });
    document.querySelectorAll('#projectColorPickerGrid .color-choice-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-p-color') === this.projectSelectedColor);
    });
  },

  renderModalPickers() {
    const iconKeys = Object.keys(window.LifeIcons.list);

    // Сфера
    const sIconBox = document.getElementById('sphereIconPickerGrid');
    const sColorBox = document.getElementById('sphereColorPickerGrid');

    sIconBox.innerHTML = iconKeys.map(k => `
      <button type="button" class="icon-choice-btn ${k === this.sphereSelectedIcon ? 'selected' : ''}" data-s-icon="${k}">${window.LifeIcons.get(k)}</button>
    `).join('');

    sColorBox.innerHTML = this.palette.map(c => `
      <button type="button" class="color-choice-btn ${c === this.sphereSelectedColor ? 'selected' : ''}" data-s-color="${c}" style="background-color: ${c};"></button>
    `).join('');

    sIconBox.querySelectorAll('[data-s-icon]').forEach(b => {
      b.addEventListener('click', () => {
        sIconBox.querySelectorAll('.icon-choice-btn').forEach(btn => btn.classList.remove('selected'));
        b.classList.add('selected');
        this.sphereSelectedIcon = b.getAttribute('data-s-icon');
      });
    });

    sColorBox.querySelectorAll('[data-s-color]').forEach(b => {
      b.addEventListener('click', () => {
        sColorBox.querySelectorAll('.color-choice-btn').forEach(btn => btn.classList.remove('selected'));
        b.classList.add('selected');
        this.sphereSelectedColor = b.getAttribute('data-s-color');
      });
    });

    // Проект
    const pIconBox = document.getElementById('projectIconPickerGrid');
    const pColorBox = document.getElementById('projectColorPickerGrid');

    pIconBox.innerHTML = iconKeys.map(k => `
      <button type="button" class="icon-choice-btn ${k === this.projectSelectedIcon ? 'selected' : ''}" data-p-icon="${k}">${window.LifeIcons.get(k)}</button>
    `).join('');

    pColorBox.innerHTML = this.palette.map(c => `
      <button type="button" class="color-choice-btn ${c === this.projectSelectedColor ? 'selected' : ''}" data-p-color="${c}" style="background-color: ${c};"></button>
    `).join('');

    pIconBox.querySelectorAll('[data-p-icon]').forEach(b => {
      b.addEventListener('click', () => {
        pIconBox.querySelectorAll('.icon-choice-btn').forEach(btn => btn.classList.remove('selected'));
        b.classList.add('selected');
        this.projectSelectedIcon = b.getAttribute('data-p-icon');
      });
    });

    pColorBox.querySelectorAll('[data-p-color]').forEach(b => {
      b.addEventListener('click', () => {
        pColorBox.querySelectorAll('.color-choice-btn').forEach(btn => btn.classList.remove('selected'));
        b.classList.add('selected');
        this.projectSelectedColor = b.getAttribute('data-p-color');
      });
    });
    
    // Авто-расширение поля заметки при вводе текста
    if (this.detailTaskNote) {
      this.detailTaskNote.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    return `${day} ${month}`;
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  safeColor(c) {
    return (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c)) ? c : '#FFD027';
  },

  safeId(id) {
    return (typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id)) ? id : '';
  },

  declensionProjects(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'проект';
    if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'проекта';
    return 'проектов';
  },

  declensionTasks(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'задача';
    if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'задачи';
    return 'задач';
  }
};