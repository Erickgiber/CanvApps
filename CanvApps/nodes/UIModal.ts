import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

export type ModalAnimationType = 'pixels' | 'scale-in' | 'fade' | 'zoom-in' | 'slide-up' | 'none';

/**
 * Styling and animation options specific to UIModal dialogs.
 */
export interface ModalStyles extends VisualStyles {
  open?: boolean;

  // Animation configuration
  animated?: boolean;
  animation?: ModalAnimationType;
  duration?: number;

  // Backdrop & Overlay styling
  backdropColor?: string;
  backdropColors?: [string, string];
  gradient?: boolean;
  backdropGradient?: boolean;
  blur?: boolean;
  blurBackdrop?: boolean;
  blurRadius?: number;
  closeOnBackdropClick?: boolean;
}

interface DigitalPixel {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  alpha: number;
}

/**
 * Animated Modal dialog overlay component with customizable entrance animations,
 * flexible backdrop colors, radial gradients, and frosted glass blur on pure Canvas.
 */
export class UIModal extends UIElement {
  public declare styles: ModalStyles;
  private isOpen = true;
  private animProgress = 1;
  private isAnimating = false;
  private animStartTime = 0;
  private pixels: DigitalPixel[] = [];

  constructor(styles: ModalStyles = {}) {
    super({
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      ...styles,
    });

    this.isOpen = styles.open !== false;
    this.visible = this.isOpen;
    this.styles.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      if (this.isAnimationEnabled()) {
        this.startEntranceAnimation();
      } else {
        this.animProgress = 1;
        this.isAnimating = false;
      }
    }

    // Backdrop click listener to dismiss modal
    this.on('pointerdown', (e: any) => {
      // If clicked directly on the modal backdrop overlay (not on dialog card children)
      if (e.target === this) {
        if (this.styles.closeOnBackdropClick !== false) {
          this.emit('close', { target: this, currentTarget: this } as any);
        }
      }
    });
  }

  /**
   * Determines if entrance animation is enabled based on styles.
   */
  private isAnimationEnabled(): boolean {
    if (this.styles.animated === false) return false;
    if (this.styles.animation === 'none') return false;
    return true;
  }

  /**
   * Retrieves the active animation type (defaults to 'pixels').
   */
  private getAnimationType(): ModalAnimationType {
    if (!this.isAnimationEnabled()) return 'none';
    return this.styles.animation ?? 'pixels';
  }

  private startEntranceAnimation(): void {
    const duration = this.styles.duration ?? 340;
    const animType = this.getAnimationType();

    if (animType === 'none') {
      this.animProgress = 1;
      this.isAnimating = false;
      this.markRenderDirty();
      return;
    }

    this.animProgress = 0;
    this.isAnimating = true;
    this.animStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (animType === 'pixels') {
      this.spawnPixelMatrix();
    } else {
      this.pixels = [];
    }

    const tick = (now: number) => {
      if (!this.isOpen) {
        this.isAnimating = false;
        return;
      }
      const elapsed = now - this.animStartTime;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out
      this.animProgress = 1 - Math.pow(1 - t, 3);
      this.markRenderDirty();

      if (t < 1) {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(tick);
        }
      } else {
        this.animProgress = 1;
        this.isAnimating = false;
        this.pixels = [];
        this.markRenderDirty();
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(tick);
    }
  }

  private spawnPixelMatrix(): void {
    this.pixels = [];
    const colors = ['#38bdf8', '#34d399', '#60a5fa', '#818cf8', '#ffffff'];
    const count = 36;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 180 + 80;
      this.pixels.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        targetX: (Math.random() - 0.5) * 260,
        targetY: (Math.random() - 0.5) * 220,
        size: Math.floor(Math.random() * 6) + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
  }

  /**
   * Toggles modal visibility and layout participation.
   */
  public setOpen(open: boolean): this {
    if (this.isOpen !== open) {
      this.isOpen = open;
      this.styles.open = open;
      this.visible = open;
      this.styles.display = open ? 'flex' : 'none';
      if (open) {
        if (this.isAnimationEnabled()) {
          this.startEntranceAnimation();
        } else {
          this.animProgress = 1;
          this.isAnimating = false;
          this.markRenderDirty();
        }
      }
      this.markLayoutDirty();
    }
    return this;
  }

  public override setStyle(styles: Partial<ModalStyles>): this {
    super.setStyle(styles);
    if (styles.open !== undefined) {
      this.setOpen(styles.open);
    }
    return this;
  }

  /**
   * Custom rendering pipeline: Backdrop overlay (solid or gradient), frosted glass blur,
   * entrance animation (pixels, scale, fade, slide-up), and dialog card children.
   */
  public override render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.styles.display === 'none' || !this.isOpen) {
      return;
    }

    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) {
      return;
    }

    ctx.save();

    const isGradient = this.styles.gradient !== false && this.styles.backdropGradient !== false;
    const isBlur = this.styles.blur === true || this.styles.blurBackdrop === true;
    const blurRadius = this.styles.blurRadius ?? 8;
    const animType = this.getAnimationType();

    // Calculate global full canvas dimensions to cover 100% of viewport edge-to-edge
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const fullCanvasWidth = ctx.canvas ? ctx.canvas.width / dpr : (typeof window !== 'undefined' ? window.innerWidth : width);
    const fullCanvasHeight = ctx.canvas ? ctx.canvas.height / dpr : (typeof window !== 'undefined' ? window.innerHeight : height);

    // 1. Real Frosted Glass Backdrop Blur (if enabled)
    if (isBlur && ctx.canvas && typeof (ctx as any).filter === 'string') {
      try {
        ctx.save();
        ctx.filter = `blur(${blurRadius}px)`;
        ctx.globalAlpha = Math.max(0, Math.min(1, this.animProgress));
        ctx.drawImage(ctx.canvas, 0, 0, fullCanvasWidth, fullCanvasHeight);
        ctx.restore();
      } catch {
        // Fallback gracefully on environments without ctx.filter or security restrictions
      }
    }

    // 2. Draw Fullscreen Backdrop Overlay (covers 100% of viewport edge-to-edge)
    ctx.save();
    if (isGradient) {
      const grad = ctx.createRadialGradient(
        fullCanvasWidth / 2,
        fullCanvasHeight / 2,
        Math.min(fullCanvasWidth, fullCanvasHeight) * 0.1,
        fullCanvasWidth / 2,
        fullCanvasHeight / 2,
        Math.max(fullCanvasWidth, fullCanvasHeight) * 0.8
      );

      const colorStart = this.styles.backdropColors ? this.styles.backdropColors[0] : (this.styles.backdropColor ?? 'rgba(15, 23, 42, 0.65)');
      const colorEnd = this.styles.backdropColors ? this.styles.backdropColors[1] : 'rgba(15, 23, 42, 0.88)';

      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = this.styles.backdropColor ?? 'rgba(15, 23, 42, 0.72)';
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, this.animProgress));
    ctx.fillRect(0, 0, fullCanvasWidth, fullCanvasHeight);
    ctx.restore();

    // 3. Pixel-Forming Matrix Effect (when animation="pixels")
    if (animType === 'pixels' && this.isAnimating && this.pixels.length > 0) {
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      const inv = 1 - this.animProgress;

      for (const p of this.pixels) {
        const curX = cx + p.targetX + (p.x - p.targetX) * inv;
        const curY = cy + p.targetY + (p.y - p.targetY) * inv;
        const curAlpha = p.alpha * (1 - inv * inv);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, curAlpha));
        ctx.fillRect(curX, curY, p.size, p.size);
      }
      ctx.restore();
    }

    // 4. Calculate Child Transform based on animation preset
    let cardScale = 1.0;
    let cardAlpha = 1.0;
    let childSlideY = 0;

    if (animType === 'pixels') {
      cardScale = 0.88 + 0.12 * this.animProgress;
      cardAlpha = Math.max(0, Math.min(1, this.animProgress));
    } else if (animType === 'scale-in') {
      cardScale = 0.92 + 0.08 * this.animProgress;
      cardAlpha = Math.max(0, Math.min(1, this.animProgress));
    } else if (animType === 'zoom-in') {
      cardScale = 0.7 + 0.3 * this.animProgress;
      cardAlpha = Math.max(0, Math.min(1, this.animProgress));
    } else if (animType === 'slide-up') {
      childSlideY = (1 - this.animProgress) * 40;
      cardAlpha = Math.max(0, Math.min(1, this.animProgress));
    } else if (animType === 'fade') {
      cardScale = 1.0;
      cardAlpha = Math.max(0, Math.min(1, this.animProgress));
    } else {
      // None
      cardScale = 1.0;
      cardAlpha = 1.0;
    }

    // 5. Render Modal Dialog Card Children
    for (const child of this.children) {
      if (child.visible && child.styles.display !== 'none') {
        ctx.save();
        const childCenterX = child.worldRect.x + child.worldRect.width / 2;
        const childCenterY = child.worldRect.y + child.worldRect.height / 2 + childSlideY;

        ctx.translate(childCenterX, childCenterY);
        if (cardScale !== 1.0) {
          ctx.scale(cardScale, cardScale);
        }
        ctx.translate(-childCenterX, -childCenterY);
        ctx.globalAlpha *= cardAlpha;

        child.render(ctx);
        ctx.restore();
      }
    }

    ctx.restore();
    this.isRenderDirty = false;
  }

  public draw(_ctx: CanvasRenderingContext2D): void {
    // Rendered via composite render() pipeline
  }
}
