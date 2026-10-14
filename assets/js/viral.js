// assets/js/viral.js
// Модуль вирального маркетинга: Динамический Чек Дня с защитой от вылета текста + Валидация шаблонов
window.LifeViral = {
  currentDayTicketBlob: null,
  pendingTemplateData: null,

  init() {
    window.LifeLog.info('LifeViral', 'Инициализация модуля виральности...');
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

  // УМНЫЙ АЛГОРИТМ ПЕРЕНОСА ТЕКСТА (РАЗБИВАЕТ ДАЖЕ СВЕРХДЛИННЫЕ СЛОВА БЕЗ ПРОБЕЛОВ)
  wrapCanvasText(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || '').split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      let word = words[i];

      // Если само слово длиннее доступной ширины строки — делим его посимвольно
      if (ctx.measureText(word).width > maxWidth) {
        for (let j = 0; j < word.length; j++) {
          const char = word[j];
          if (ctx.measureText(currentLine + char).width > maxWidth) {
            lines.push(currentLine.trim());
            currentLine = char;
            if (lines.length >= maxLines - 1) break;
          } else {
            currentLine += char;
          }
        }
      } else {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth) {
          lines.push(currentLine.trim());
          currentLine = word;
          if (lines.length >= maxLines - 1) {
            // Оставшиеся слова укладываем в последнюю строку с многоточием
            const remainder = words.slice(i).join(' ');
            let lastLine = remainder;
            while (lastLine.length > 0 && ctx.measureText(lastLine + '…').width > maxWidth) {
              lastLine = lastLine.slice(0, -1);
            }
            currentLine = lastLine + '…';
            break;
          }
        } else {
          currentLine = testLine;
        }
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine.trim());
    }

    return lines;
  },

  // 1. ДИНАМИЧЕСКИЙ ЧЕК ПРОДУКТИВНОСТИ БЕЗ ВЫЛЕТОВ ТЕКСТА
  async generateDayTicketCanvas() {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tasks = window.LifeState.getFocusTasks();
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    testCtx.font = '700 26px "Golos Text", system-ui, sans-serif';

    const maxTextW = 860;
    let computedTasksH = 0;

    if (tasks.length === 0) {
      computedTasksH = 80;
    } else {
      tasks.forEach(t => {
        const lines = this.wrapCanvasText(testCtx, t.title, maxTextW, 2);
        let itemH = lines.length * 34;
        if (t.projectName) itemH += 28;
        computedTasksH += itemH + 26;
      });
    }

    const pad = 44;
    const headerH = 270;
    const footerH = 160;

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

    ctx.fillStyle = bgPaper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardW = canvas.width - pad * 2;
    const cardH = canvas.height - pad * 2;

    ctx.fillStyle = border;
    ctx.fillRect(pad + 12, pad + 12, cardW, cardH);

    ctx.fillStyle = cardBg;
    ctx.fillRect(pad, pad, cardW, cardH);
    ctx.strokeStyle = border;
    ctx.lineWidth = 7;
    ctx.strokeRect(pad, pad, cardW, cardH);

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

    ctx.textAlign = 'left';
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(pad + 30, pad + 155);
    ctx.lineTo(canvas.width - pad - 30, pad + 155);
    ctx.stroke();
    ctx.setLineDash([]);

    const badgeX = pad + 40;
    const badgeY = pad + 185;
    const badgeText = percent === 100 ? '✓ 100% ВЫПОЛНЕНО' : `ИТОГ: ${completedCount}/${totalCount} (${percent}%)`;
    
    ctx.font = '800 22px "Unbounded", system-ui, sans-serif';
    const badgeTextW = ctx.measureText(badgeText).width;
    const badgeW = badgeTextW + 48;
    const badgeH = 54;

    ctx.fillStyle = percent === 100 ? accent : (isDark ? '#3D2B24' : '#F6F3EB');
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = border;
    ctx.lineWidth = 5;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = percent === 100 ? '#FFFFFF' : ink;
    ctx.fillText(badgeText, badgeX + 24, badgeY + 35);

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

    let curY = pad + 320;
    ctx.textAlign = 'left';

    if (tasks.length === 0) {
      ctx.fillStyle = inkMuted;
      ctx.font = '600 28px "Golos Text", system-ui, sans-serif';
      ctx.fillText('☕ На сегодня дел нет. Время перезагрузиться!', pad + 40, curY + 20);
    } else {
      tasks.forEach((t) => {
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

        ctx.fillStyle = t.completed ? inkMuted : ink;
        ctx.font = '700 26px "Golos Text", system-ui, sans-serif';

        const lines = this.wrapCanvasText(ctx, t.title, maxTextW, 2);
        let subY = curY;

        lines.forEach((line) => {
          ctx.fillText(line, pad + 95, subY);
          if (t.completed) {
            const w = ctx.measureText(line).width;
            ctx.strokeStyle = inkMuted;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pad + 95, subY - 7);
            ctx.lineTo(pad + 95 + w, subY - 7);
            ctx.stroke();
          }
          subY += 34;
        });

        if (t.projectName) {
          ctx.font = '600 18px "Golos Text", system-ui, sans-serif';
          ctx.fillStyle = inkMuted;
          ctx.fillText(`• ${t.projectName}`, pad + 95, subY - 6);
          subY += 28;
        }

        curY = subY + 26;
      });
    }

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

  // 2. БЕЗОПАСНЫЙ ЭКСПОРТ И ИМПОРТ ШАБЛОНОВ С ВАЛИДАЦИЕЙ
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
        title: sphere.title.slice(0, 50),
        icon: sphere.icon,
        color: sphere.color
      },
      projects: projects.slice(0, 25).map(p => ({
        tempId: p.id,
        title: p.title.slice(0, 60),
        icon: p.icon,
        color: p.color
      })),
      tasks: tasks.slice(0, 150).map(t => ({
        tempProjectId: t.projectId,
        title: t.title.slice(0, 150),
        deadline: t.deadline,
        inWeek: t.inWeek,
        note: (t.note || '').slice(0, 500),
        checklist: (t.checklist || []).slice(0, 20).map(c => ({ text: String(c.text || '').slice(0, 80), completed: false }))
      }))
    };

    const jsonStr = JSON.stringify(templateData);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const cleanUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${cleanUrl}#template=${encodeURIComponent(base64)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl);
      window.LifeUI.customAlert(
        `Ссылка на шаблон сферы «${window.LifeUI.escapeHtml(sphere.title)}» скопирована в буфер обмена!<br><br>Отправьте ее в Telegram, чат или соцсети: любой, кто перейдет по ней, сможет распаковать эту сферу в свой планер.`,
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
      
      // Защита: отклоняем аномально большие хэши (> 35 000 символов)
      if (rawBase64.length > 35000) {
        throw new Error('Размер шаблона превышает допустимый лимит безопасности.');
      }

      const jsonStr = decodeURIComponent(escape(atob(rawBase64)));
      const data = JSON.parse(jsonStr);

      // Строгая валидация структуры
      if (!data || data.type !== 'LIFE_OS_SPHERE_TEMPLATE' || !data.sphere || typeof data.sphere.title !== 'string') {
        throw new Error('Некорректная структура файла шаблона.');
      }

      if (!Array.isArray(data.projects) || data.projects.length > 30) {
        throw new Error('Шаблон содержит недопустимое количество проектов.');
      }

      if (!Array.isArray(data.tasks) || data.tasks.length > 200) {
        throw new Error('Шаблон содержит недопустимое количество задач.');
      }

      this.pendingTemplateData = data;
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
      setTimeout(() => this.showTemplateImportModal(data), 350);
      window.LifeLog.info('LifeViral', 'Шаблон успешно проверен и готов к распаковке.');

    } catch (err) {
      window.LifeLog.error('LifeViral', 'Ошибка разбора ссылки-шаблона', err);
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
      if (window.LifeUI) {
        window.LifeUI.customAlert(`Не удалось открыть шаблон сферы: ${err.message}`, 'Ошибка импорта');
      }
    }
  },

  showTemplateImportModal(data) {
    const modal = document.getElementById('importTemplateModal');
    const details = document.getElementById('importTemplateDetails');
    if (!modal || !details) return;

    const iconSvg = window.LifeIcons.get(data.sphere.icon || 'folder');
    const color = window.LifeUI.safeColor(data.sphere.color || '#FFD027');
    const safeTitle = window.LifeUI.escapeHtml(data.sphere.title);

    details.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; background: var(--bg-paper); padding: 14px; border-radius: 12px; border: var(--border-width) solid var(--border-color);">
        <div style="width: 44px; height: 44px; border-radius: 10px; background-color: ${color}; border: var(--border-width) solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #141414;">
          ${iconSvg}
        </div>
        <div>
          <strong style="font-family: var(--font-heading); font-size: 1.05rem; color: var(--ink-black);">${safeTitle}</strong>
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