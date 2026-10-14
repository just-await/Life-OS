// assets/js/viral.js
// Модуль вирального маркетинга: Динамический Чек Дня (Canvas) и Шаблоны сфер
window.LifeViral = {
  currentDayTicketBlob: null,
  pendingTemplateData: null,

  init() {
    this.bindEvents();
    this.checkUrlForTemplate();
    window.addEventListener('hashchange', () => this.checkUrlForTemplate());
  },

  bindEvents() {
    const shareDayBtn = document.getElementById('shareDayTicketBtn');
    if (shareDayBtn) {
      shareDayBtn.addEventListener('click', () => this.openDayTicketModal());
    }

    const closeShareBtn = document.getElementById('closeShareDayBtn');
    if (closeShareBtn) {
      closeShareBtn.addEventListener('click', () => {
        document.getElementById('shareDayModal').classList.remove('active');
      });
    }

    const downloadTicketBtn = document.getElementById('downloadDayTicketBtn');
    if (downloadTicketBtn) {
      downloadTicketBtn.addEventListener('click', () => this.downloadDayTicket());
    }

    const shareNativeBtn = document.getElementById('shareNativeDayBtn');
    if (shareNativeBtn) {
      shareNativeBtn.addEventListener('click', () => this.shareNativeDayTicket());
    }

    const shareSphereBtn = document.getElementById('shareSphereTemplateBtn');
    if (shareSphereBtn) {
      shareSphereBtn.addEventListener('click', () => {
        const sId = window.LifeState.activeSphereId;
        if (sId) this.exportSphereTemplate(sId);
      });
    }

    const confirmImportBtn = document.getElementById('confirmImportTemplateBtn');
    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', () => this.applyPendingTemplate());
    }

    const cancelImportBtn = document.getElementById('cancelImportTemplateBtn');
    const closeImportBtn = document.getElementById('closeImportTemplateBtn');
    const hideImportModal = () => {
      document.getElementById('importTemplateModal').classList.remove('active');
      this.pendingTemplateData = null;
    };
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', hideImportModal);
    if (closeImportBtn) closeImportBtn.addEventListener('click', hideImportModal);
  },

  // 1. ИДЕАЛЬНЫЙ ДИНАМИЧЕСКИЙ ЧЕК ПРОДУКТИВНОСТИ
  async generateDayTicketCanvas() {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tasks = window.LifeState.getFocusTasks();
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // 1. Предварительный расчет точной высоты всех задач
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    testCtx.font = '700 26px "Golos Text", system-ui, sans-serif';

    const maxTextW = 860;
    let computedTasksH = 0;

    if (tasks.length === 0) {
      computedTasksH = 80;
    } else {
      tasks.forEach(t => {
        let itemH = 44; // Базовая высота строки
        // Проверяем, переносится ли текст на 2 строки
        if (testCtx.measureText(t.title).width > maxTextW) {
          itemH += 34;
        }
        if (t.projectName) {
          itemH += 28;
        }
        computedTasksH += itemH + 26; // Отступ между задачами
      });
    }

    const pad = 44;
    const headerH = 270;
    const footerH = 160;

    // Точная высота холста: никаких пустых километров снизу!
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = Math.round(pad * 2 + headerH + computedTasksH + footerH);

    const ctx = canvas.getContext('2d');

    const bgPaper = isDark ? '#221714' : '#F6F3EB';
    const cardBg = isDark ? '#2F211C' : '#FFFFFF';
    const ink = isDark ? '#FAF4ED' : '#141414';
    const inkMuted = isDark ? '#BFA997' : '#6B6059';
    const accent = isDark ? '#4EBA97' : '#52C41A';
    const border = isDark ? '#120B09' : '#141414';

    // 1. Полотно стола
    ctx.fillStyle = bgPaper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Бумажный чек с тенью
    const cardW = canvas.width - pad * 2;
    const cardH = canvas.height - pad * 2;

    ctx.fillStyle = border;
    ctx.fillRect(pad + 12, pad + 12, cardW, cardH);

    ctx.fillStyle = cardBg;
    ctx.fillRect(pad, pad, cardW, cardH);
    ctx.strokeStyle = border;
    ctx.lineWidth = 7;
    ctx.strokeRect(pad, pad, cardW, cardH);

    // 3. Шапка чека
    ctx.fillStyle = ink;
    ctx.font = '800 44px "Unbounded", system-ui, sans-serif';
    ctx.fillText('⚡ LIFE OS', pad + 40, pad + 80);

    ctx.font = '700 20px "Golos Text", system-ui, sans-serif';
    ctx.fillStyle = inkMuted;
    ctx.fillText('ДНЕВНОЙ ЧЕК ПРОДУКТИВНОСТИ', pad + 40, pad + 120);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.font = '700 24px "Golos Text", system-ui, sans-serif';
    ctx.fillText(dateFormatted, canvas.width - pad - 40, pad + 80);

    // Перфорация
    ctx.textAlign = 'left';
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(pad + 30, pad + 155);
    ctx.lineTo(canvas.width - pad - 30, pad + 155);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Плашка прогресса с АВТО-ПОДГОНОМ ШИРИНЫ (текст никогда не вылезет)
    const badgeX = pad + 40;
    const badgeY = pad + 185;
    const badgeText = percent === 100 ? '✓ 100% ВЫПОЛНЕНО' : `ИТОГ: ${completedCount}/${totalCount} (${percent}%)`;
    
    ctx.font = '800 22px "Unbounded", system-ui, sans-serif';
    const badgeTextW = ctx.measureText(badgeText).width;
    const badgeW = badgeTextW + 48; // Всегда идеальные поля вокруг текста
    const badgeH = 54;

    ctx.fillStyle = percent === 100 ? accent : (isDark ? '#3D2B24' : '#F6F3EB');
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = border;
    ctx.lineWidth = 5;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = percent === 100 ? '#FFFFFF' : ink;
    ctx.fillText(badgeText, badgeX + 24, badgeY + 35);

    // Винтажный штамп в правом углу
    ctx.save();
    ctx.translate(canvas.width - pad - 160, badgeY + 27);
    ctx.rotate((-7 * Math.PI) / 180);
    ctx.strokeStyle = percent === 100 ? accent : '#FAAD14';
    ctx.lineWidth = 4;
    ctx.strokeRect(-100, -24, 200, 48);
    ctx.fillStyle = percent === 100 ? accent : '#FAAD14';
    ctx.font = '800 18px "Unbounded", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(percent === 100 ? '★ ЗАКРЫТО ★' : 'В ПРОЦЕССЕ', 0, 7);
    ctx.restore();

    // 5. Задачи с аккуратным переносом
    let curY = pad + 320;
    ctx.textAlign = 'left';

    if (tasks.length === 0) {
      ctx.fillStyle = inkMuted;
      ctx.font = '600 28px "Golos Text", system-ui, sans-serif';
      ctx.fillText('☕ На сегодня дел нет. Время перезагрузиться!', pad + 40, curY + 20);
    } else {
      tasks.forEach((t) => {
        // Чекбокс
        ctx.strokeStyle = border;
        ctx.lineWidth = 5;
        ctx.strokeRect(pad + 40, curY - 26, 36, 36);

        if (t.completed) {
          ctx.fillStyle = accent;
          ctx.fillRect(pad + 44, curY - 22, 28, 28);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 22px sans-serif';
          ctx.fillText('✓', pad + 48, curY - 1);
        }

        // Текст задачи (умный перенос до 2 строк)
        ctx.fillStyle = t.completed ? inkMuted : ink;
        ctx.font = '700 26px "Golos Text", system-ui, sans-serif';

        const maxTextW = canvas.width - pad * 2 - 160;
        const words = t.title.split(' ');
        let line1 = '';
        let line2 = '';

        for (let i = 0; i < words.length; i++) {
          const testLine = line1 + words[i] + ' ';
          if (ctx.measureText(testLine).width < maxTextW) {
            line1 = testLine;
          } else {
            line2 = words.slice(i).join(' ');
            break;
          }
        }

        ctx.fillText(line1.trim(), pad + 95, curY);

        if (t.completed) {
          const w1 = ctx.measureText(line1.trim()).width;
          ctx.strokeStyle = inkMuted;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(pad + 95, curY - 7);
          ctx.lineTo(pad + 95 + w1, curY - 7);
          ctx.stroke();
        }

        let subLineY = curY;
        if (line2) {
          subLineY += 34;
          const displayLine2 = line2.length > 55 ? line2.slice(0, 55) + '…' : line2;
          ctx.fillText(displayLine2, pad + 95, subLineY);
          if (t.completed) {
            const w2 = ctx.measureText(displayLine2).width;
            ctx.strokeStyle = inkMuted;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pad + 95, subLineY - 7);
            ctx.lineTo(pad + 95 + w2, subLineY - 7);
            ctx.stroke();
          }
        }

        // Бейдж проекта под задачей
        if (t.projectName) {
          subLineY += 30;
          ctx.font = '600 18px "Golos Text", system-ui, sans-serif';
          ctx.fillStyle = inkMuted;
          ctx.fillText(`• ${t.projectName}`, pad + 95, subLineY);
        }

        curY = subLineY + 54;
      });
    }

    // 6. Подвал встает ровно под задачами (ноль лишней пустоты)
    const footerY = curY + 20;
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(pad + 30, footerY);
    ctx.lineTo(canvas.width - pad - 30, footerY);
    ctx.stroke();
    ctx.setLineDash([]);

    const barcodeY = footerY + 25;
    const bars = [8, 4, 12, 6, 4, 14, 6, 8, 4, 18, 4, 8, 12, 4, 6, 14, 8, 4, 10];
    let curBx = pad + 40;
    ctx.fillStyle = ink;
    bars.forEach(b => {
      ctx.fillRect(curBx, barcodeY, b, 44);
      curBx += b + 7;
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = ink;
    ctx.font = '800 24px "Unbounded", system-ui, sans-serif';
    ctx.fillText('LIFE OS', canvas.width - pad - 40, barcodeY + 24);

    ctx.font = '600 18px "Golos Text", system-ui, sans-serif';
    ctx.fillStyle = inkMuted;
    ctx.fillText('Тактильный личный планер', canvas.width - pad - 40, barcodeY + 50);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  },

  async openDayTicketModal() {
    window.LifeUI.showToast('Генерируем чек дня...');
    const blob = await this.generateDayTicketCanvas();
    this.currentDayTicketBlob = blob;

    const imgPreview = document.getElementById('dayTicketImgPreview');
    if (imgPreview) {
      imgPreview.src = URL.createObjectURL(blob);
    }

    const modal = document.getElementById('shareDayModal');
    if (modal) modal.classList.add('active');
  },

  downloadDayTicket() {
    if (!this.currentDayTicketBlob) return;
    const url = URL.createObjectURL(this.currentDayTicketBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life_os_check_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.LifeUI.showToast('Чек сохранен в фото!');
  },

  async shareNativeDayTicket() {
    if (!this.currentDayTicketBlob) return;
    const file = new File([this.currentDayTicketBlob], `life_os_check_${Date.now()}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Мой чек дня в Life OS',
          text: 'Мой фокус задач в тактильном планере Life OS ⚡'
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    this.downloadDayTicket();
  },

  // 2. ПУЛЕНЕПРОБИВАЕМЫЙ ДЕКОДЕР ШАБЛОНОВ СФЕР
  exportSphereTemplate(sphereId) {
    const sphere = window.LifeState.getSphere(sphereId);
    if (!sphere) return;

    const projects = window.LifeState.getProjectsBySphere(sphereId);
    const projectIds = projects.map(p => p.id);
    const tasks = (window.LifeState.data.tasks || []).filter(t => projectIds.includes(t.projectId));

    const templateData = {
      type: 'LIFE_OS_SPHERE_TEMPLATE',
      version: 1,
      sphere: {
        title: sphere.title,
        icon: sphere.icon,
        color: sphere.color
      },
      projects: projects.map(p => ({
        tempId: p.id,
        title: p.title,
        icon: p.icon,
        color: p.color
      })),
      tasks: tasks.map(t => ({
        tempProjectId: t.projectId,
        title: t.title,
        deadline: t.deadline,
        inWeek: t.inWeek,
        note: t.note,
        checklist: t.checklist || []
      }))
    };

    const jsonStr = JSON.stringify(templateData);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const cleanUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${cleanUrl}#template=${encodeURIComponent(base64)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl);
      window.LifeUI.customAlert(
        `Ссылка на шаблон сферы «${sphere.title}» скопирована в буфер обмена!<br><br>Отправьте ее в Telegram, чат или соцсети: любой, кто перейдет по ней, сможет распаковать эту готовую сферу в свой планер.`,
        'Ссылка-шаблон готова 📋'
      );
    } else {
      window.LifeUI.customPrompt('Скопируйте ссылку на шаблон:', shareUrl, '', 'Шаблон сферы');
    }
  },

  checkUrlForTemplate() {
    const rawHash = window.location.hash || '';
    if (!rawHash.includes('template=')) return;

    try {
      const match = rawHash.match(/template=([^&]+)/);
      if (!match) return;

      const rawBase64 = decodeURIComponent(match[1]).replace(/ /g, '+');
      const jsonStr = decodeURIComponent(escape(atob(rawBase64)));
      const data = JSON.parse(jsonStr);

      if (data && data.type === 'LIFE_OS_SPHERE_TEMPLATE' && data.sphere) {
        this.pendingTemplateData = data;
        // Очищаем хэш из адресной строки без перезагрузки
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
        setTimeout(() => this.showTemplateImportModal(data), 350);
      }
    } catch (err) {
      console.warn('Ошибка распознавания шаблона сферы:', err);
    }
  },

  showTemplateImportModal(data) {
    const modal = document.getElementById('importTemplateModal');
    const details = document.getElementById('importTemplateDetails');
    if (!modal || !details) return;

    const iconSvg = window.LifeIcons.get(data.sphere.icon || 'folder');
    const color = data.sphere.color || '#FFD027';

    details.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; background: var(--bg-paper); padding: 14px; border-radius: 12px; border: var(--border-width) solid var(--border-color);">
        <div style="width: 44px; height: 44px; border-radius: 10px; background-color: ${color}; border: var(--border-width) solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #141414;">
          ${iconSvg}
        </div>
        <div>
          <strong style="font-family: var(--font-heading); font-size: 1.05rem; color: var(--ink-black);">${window.LifeUI.escapeHtml(data.sphere.title)}</strong>
          <div style="font-size: 0.8rem; color: var(--ink-muted); margin-top: 2px;">
            Содержит: ${data.projects.length} ${window.LifeUI.declensionProjects(data.projects.length)} • ${data.tasks.length} ${window.LifeUI.declensionTasks(data.tasks.length)}
          </div>
        </div>
      </div>
      <p style="font-size: 0.86rem; color: var(--ink-muted); line-height: 1.4;">
        Хотите добавить эту готовую сферу со всеми входящими проектами и чек-листами в свой планер?
      </p>
    `;

    modal.classList.add('active');
  },

  applyPendingTemplate() {
    if (!this.pendingTemplateData) return;
    const data = this.pendingTemplateData;

    const newSphere = window.LifeState.addSphere({
      title: data.sphere.title,
      icon: data.sphere.icon,
      color: data.sphere.color
    });

    if (!newSphere) return;

    const idMap = new Map();
    (data.projects || []).forEach(p => {
      const newProj = window.LifeState.addProject({
        sphereId: newSphere.id,
        title: p.title,
        icon: p.icon,
        color: p.color
      });
      if (newProj) {
        idMap.set(p.tempId, newProj.id);
      }
    });

    (data.tasks || []).forEach(t => {
      const realProjId = idMap.get(t.tempProjectId);
      if (realProjId) {
        const newTask = window.LifeState.addTask({
          projectId: realProjId,
          title: t.title,
          deadline: t.deadline,
          inWeek: t.inWeek
        });

        if (newTask) {
          window.LifeState.updateTask(newTask.id, {
            note: t.note || '',
            checklist: (t.checklist || []).map(c => ({ text: c.text, completed: false }))
          });
        }
      }
    });

    document.getElementById('importTemplateModal').classList.remove('active');
    this.pendingTemplateData = null;

    window.LifeUI.renderSpheres();
    window.LifeUI.showToast(`🎉 Сфера «${newSphere.title}» добавлена в картотеку!`);
    window.LifeUI.showSphere(newSphere.id);

    if (window.LifeSync) window.LifeSync.triggerAutoSync();
  }
};