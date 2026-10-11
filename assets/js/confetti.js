// Профессиональный физический движок конфетти (Canvas 60 FPS)
window.LifeConfetti = {
  canvas: null,
  ctx: null,
  particles: [],
  animationFrame: null,

  // Цветовая палитра картотеки
  colors: ['#FFE58F', '#D3F26A', '#87E8DE', '#FFBB96', '#D3ADF7', '#FFADD2', '#141414'],

  initCanvas() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '999999';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  },

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  },

  // Запуск сочной двойной хлопушки
  shoot(originX, originY) {
    this.initCanvas();

    // Залп 1: Мощный вертикальный сноп
    this.createBlast(originX, originY, 45, 16, 26);

    // Залп 2: Широкий разлет через 80 миллисекунд
    setTimeout(() => {
      this.createBlast(originX, originY, 35, 10, 20);
    }, 80);

    if (!this.animationFrame) {
      this.loop();
    }
  },

  createBlast(x, y, count, minSpeed, maxSpeed) {
    for (let i = 0; i < count; i++) {
      // Угол вылета (преимущественно вверх и в стороны: фонтан)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        // Параметры 3D кувыркания бумаги
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.12 + 0.05,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        // Размер и пропорции
        width: Math.random() * 8 + 8,  // от 8 до 16px (крупные!)
        height: Math.random() * 6 + 6,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        isRound: Math.random() > 0.65, // смесь прямоугольников и кружочков
        opacity: 1,
        life: 0,
        maxLife: Math.random() * 50 + 130 // живут до 3 секунд
      });
    }
  },

  loop() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Физика: гравитация + сопротивление воздуха
      p.vy += 0.42;       // Гравитация (плавное падение)
      p.vx *= 0.94;       // Торможение по горизонтали
      p.vy *= 0.97;       // Торможение по вертикали

      p.x += p.vx;
      p.y += p.vy;

      p.wobble += p.wobbleSpeed;
      p.rotation += p.rotationSpeed;
      p.life++;

      // Плавное исчезновение в конце полета
      if (p.life > p.maxLife - 30) {
        p.opacity = Math.max(0, (p.maxLife - p.life) / 30);
      }

      // Отрисовка кувыркающейся в 3D частицы
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.scale(Math.cos(p.wobble), 1); // Реалистичный 3D-флип бумаги
      this.ctx.globalAlpha = p.opacity;

      this.ctx.fillStyle = p.color;
      this.ctx.strokeStyle = '#141414';
      this.ctx.lineWidth = 1.2;

      this.ctx.beginPath();
      if (p.isRound) {
        this.ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
      } else {
        this.ctx.rect(-p.width / 2, -p.height / 2, p.width, p.height);
      }
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();

      // Удаление упавших или угасших частиц
      if (p.life >= p.maxLife || p.y > window.innerHeight + 50) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animationFrame = requestAnimationFrame(() => this.loop());
    } else {
      this.animationFrame = null;
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }
};