import { UIElement } from '../core/UIElement';

/**
 * KineticFX: Hardware-accelerated Canvas Particle, Shockwave, and Floating Kinetic Token engine.
 */

export interface FlyTokenOptions {
  from: { x: number; y: number } | any;
  to: { x: number; y: number } | string | any;
  text: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  duration?: number;
  arcHeight?: number;
  onHit?: () => void;
}

interface ActiveFlyingToken {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  text: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  startTime: number;
  duration: number;
  scale: number;
  alpha: number;
  onHit?: () => void;
  hasHit: boolean;
}

interface StardustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface ShockwaveFX {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export class KineticFX {
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;
  private static flyingTokens: ActiveFlyingToken[] = [];
  private static particles: StardustParticle[] = [];
  private static shockwaves: ShockwaveFX[] = [];
  private static isLoopRunning = false;

  /**
   * Initializes the overlay canvas for kinetic animations.
   */
  public static init(): void {
    if (typeof document === 'undefined' || this.canvas) {
      return;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'canvapps-kinetic-fx';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '9999',
    });

    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      if (!this.canvas) return;
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(window.innerWidth * dpr);
      this.canvas.height = Math.round(window.innerHeight * dpr);
      if (this.ctx) {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    window.addEventListener('resize', resize);
    resize();
  }

  /**
   * Resolves screen coordinates from an event, UIElement, DOM element, or coordinate pair.
   */
  private static resolveCoords(target: any): { x: number; y: number } {
    if (!target) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    if (typeof target.x === 'number' && typeof target.y === 'number') {
      return { x: target.x, y: target.y };
    }

    if (typeof target.clientX === 'number' && typeof target.clientY === 'number') {
      return { x: target.clientX, y: target.clientY };
    }

    // 1. Resolve UIElement by String ID selector (e.g. '#counter-badge' or 'counter-badge')
    if (typeof target === 'string') {
      const uiEl = UIElement.getElementById(target);
      if (uiEl && uiEl.worldRect && uiEl.worldRect.width > 0) {
        return {
          x: uiEl.worldRect.x + uiEl.worldRect.width / 2,
          y: uiEl.worldRect.y + uiEl.worldRect.height / 2,
        };
      }

      // 2. Resolve HTML DOM element selector
      if (typeof document !== 'undefined') {
        const el = document.querySelector(target);
        if (el) {
          const rect = el.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
    }

    // 3. Resolve direct UIElement instance
    if (target instanceof UIElement || (target && target.worldRect)) {
      const wRect = target.worldRect;
      if (wRect && wRect.width > 0) {
        return {
          x: wRect.x + wRect.width / 2,
          y: wRect.y + wRect.height / 2,
        };
      }
    }

    // 4. Resolve direct HTMLElement instance
    if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  /**
   * Launches an animated kinetic token that glides along a curved bezier trajectory
   * towards a target element or coordinate, impacting upon arrival.
   */
  public static flyToken(options: FlyTokenOptions): void {
    this.init();

    const start = this.resolveCoords(options.from);
    const end = this.resolveCoords(options.to);
    const arcHeight = options.arcHeight ?? Math.max(40, Math.abs(end.x - start.x) * 0.25);

    // Parabolic Bezier control point
    const controlX = (start.x + end.x) / 2;
    const controlY = Math.min(start.y, end.y) - arcHeight;

    const token: ActiveFlyingToken = {
      startX: start.x,
      startY: start.y,
      controlX,
      controlY,
      targetX: end.x,
      targetY: end.y,
      currentX: start.x,
      currentY: start.y,
      text: options.text,
      color: options.color ?? '#2563eb',
      backgroundColor: options.backgroundColor ?? '#dbeafe',
      borderColor: options.borderColor ?? '#93c5fd',
      startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      duration: options.duration ?? 480,
      scale: 1.25,
      alpha: 1,
      onHit: options.onHit,
      hasHit: false,
    };

    this.flyingTokens.push(token);

    // Initial launch burst
    this.burst({
      x: start.x,
      y: start.y,
      colors: [token.color, token.backgroundColor, '#38bdf8'],
      count: 8,
      radius: 20,
    });

    this.startLoop();
  }

  /**
   * Spawns a radial burst of glowing particles and a shockwave.
   */
  public static burst(options: {
    x: number;
    y: number;
    colors?: string[];
    count?: number;
    radius?: number;
  }): void {
    this.init();

    const { x, y, colors = ['#38bdf8', '#34d399', '#818cf8'], count = 14, radius = 45 } = options;

    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius: radius,
      color: colors[0],
      alpha: 0.85,
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 4.2 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: Math.random() * 2.5 + 2,
        color,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.02,
      });
    }

    this.startLoop();
  }

  private static startLoop(): void {
    if (this.isLoopRunning) {
      return;
    }
    this.isLoopRunning = true;

    const render = () => {
      if (!this.ctx || !this.canvas) {
        this.isLoopRunning = false;
        return;
      }

      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      // 1. Update and Render Flying Tokens
      for (let i = this.flyingTokens.length - 1; i >= 0; i--) {
        const t = this.flyingTokens[i];
        const elapsed = now - t.startTime;
        const progress = Math.min(1, elapsed / t.duration);

        // Quadratic Bezier Interpolation
        const inv = 1 - progress;
        t.currentX = inv * inv * t.startX + 2 * inv * progress * t.controlX + progress * progress * t.targetX;
        t.currentY = inv * inv * t.startY + 2 * inv * progress * t.controlY + progress * progress * t.targetY;

        // Scale & Opacity dynamics
        t.scale = 1.3 - progress * 0.35;
        t.alpha = progress > 0.85 ? (1 - progress) / 0.15 : 1;

        // Spawn glowing stardust trailing particles
        if (Math.random() < 0.75) {
          this.particles.push({
            x: t.currentX + (Math.random() - 0.5) * 6,
            y: t.currentY + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: Math.random() * 2 + 1.5,
            color: t.color,
            alpha: 0.85,
            decay: 0.04,
          });
        }

        // Draw Token Pill Badge
        this.ctx.save();
        this.ctx.translate(t.currentX, t.currentY);
        this.ctx.scale(t.scale, t.scale);
        this.ctx.globalAlpha = Math.max(0, Math.min(1, t.alpha));

        const badgeText = t.text;
        this.ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        const textWidth = this.ctx.measureText(badgeText).width;
        const pillW = textWidth + 18;
        const pillH = 24;
        const pillX = -pillW / 2;
        const pillY = -pillH / 2;
        const radius = 12;

        // Pill shadow
        this.ctx.shadowColor = t.color;
        this.ctx.shadowBlur = 10;

        // Pill background
        this.ctx.beginPath();
        this.ctx.roundRect(pillX, pillY, pillW, pillH, radius);
        this.ctx.fillStyle = t.backgroundColor;
        this.ctx.fill();

        // Pill border
        this.ctx.strokeStyle = t.borderColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Pill text
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = t.color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(badgeText, 0, 0);

        this.ctx.restore();

        // Hit callback upon completion
        if (progress >= 1 && !t.hasHit) {
          t.hasHit = true;
          t.onHit?.();

          // Impact burst at target
          this.burst({
            x: t.targetX,
            y: t.targetY,
            colors: [t.color, '#38bdf8', '#ffffff'],
            count: 16,
            radius: 35,
          });

          this.flyingTokens.splice(i, 1);
        }
      }

      // 2. Update and Render Shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.16 + 1.2;
        sw.alpha *= 0.91;

        if (sw.alpha < 0.02 || sw.radius >= sw.maxRadius) {
          this.shockwaves.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = sw.color;
        this.ctx.lineWidth = 2 * sw.alpha;
        this.ctx.globalAlpha = sw.alpha;
        this.ctx.stroke();
        this.ctx.restore();
      }

      // 3. Update and Render Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.96;
        p.alpha -= p.decay;

        if (p.alpha <= 0.01) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
        this.ctx.restore();
      }

      if (this.flyingTokens.length > 0 || this.particles.length > 0 || this.shockwaves.length > 0) {
        requestAnimationFrame(render);
      } else {
        this.isLoopRunning = false;
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    requestAnimationFrame(render);
  }
}
