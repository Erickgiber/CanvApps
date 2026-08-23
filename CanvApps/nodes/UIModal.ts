import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

/**
 * Styling options specific to UIModal dialogs.
 */
export interface ModalStyles extends VisualStyles {
  open?: boolean;
  backdropColor?: string;
  closeOnBackdropClick?: boolean;
  blurBackdrop?: boolean;
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
 * Animated Modal dialog overlay component with digital pixel-forming entrance
 * and frosted glass backdrop on pure Canvas.
 */
export class UIModal extends UIElement {
  public declare styles: ModalStyles;
  private isOpen = true;
  private animProgress = 1;
  private isAnimating = false;
  private animStartTime = 0;
  private animDuration = 340; // ms
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
      backgroundColor: styles.backdropColor ?? 'rgba(15, 23, 42, 0.72)',
      ...styles,
    });

    this.isOpen = styles.open !== false;
    this.visible = this.isOpen;
    this.styles.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      this.startEntranceAnimation();
    }

    // Backdrop click listener to dismiss modal
    this.on('pointerdown', (e: any) => {
      // If clicked directly on the modal backdrop overlay (not on dialog card children)
      if (e.target === this) {
        if (this.styles.closeOnBackdropClick !== false) {
          this.emit('close' as any, { target: this, currentTarget: this } as any);
        }
      }
    });
  }

  private startEntranceAnimation(): void {
    this.animProgress = 0;
    this.isAnimating = true;
    this.animStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.spawnPixelMatrix();

    const tick = (now: number) => {
      if (!this.isOpen) {
        this.isAnimating = false;
        return;
      }
      const elapsed = now - this.animStartTime;
      const t = Math.min(1, elapsed / this.animDuration);
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
        this.startEntranceAnimation();
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
   * Custom rendering pipeline: Frost glass backdrop, converging pixel matrix, and scaled card.
   */
  public override render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.styles.display === 'none' || !this.isOpen) {
      return;
    }

    ctx.save();

    // 1. Draw Backdrop Dimming with Radial Frosted Gradient
    const { width, height } = this.layoutRect;
    if (width > 0 && height > 0) {
      ctx.save();
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.15,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, `rgba(15, 23, 42, ${0.65 * this.animProgress})`);
      grad.addColorStop(1, `rgba(15, 23, 42, ${0.85 * this.animProgress})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 2. Pixel-Forming Matrix Effect during entrance animation
    if (this.isAnimating && this.pixels.length > 0) {
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

    // 3. Render Modal Dialog Card Children with Elastic Scale-In & Opacity
    const cardScale = 0.88 + 0.12 * this.animProgress;
    const cardAlpha = Math.max(0, Math.min(1, this.animProgress));

    for (const child of this.children) {
      if (child.visible && child.styles.display !== 'none') {
        ctx.save();
        const childCenterX = child.worldRect.x + child.worldRect.width / 2;
        const childCenterY = child.worldRect.y + child.worldRect.height / 2;

        ctx.translate(childCenterX, childCenterY);
        ctx.scale(cardScale, cardScale);
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
    // Composite rendered in render()
  }
}
