import { UIElement } from '../core/UIElement';
import { Engine } from '../core/Engine';
import { FlexLayout } from '../layout/FlexLayout';
import { VisualStyles } from '../types/style';

export type ModalAnimationType = 'hero' | 'zoom-center' | 'scale-in' | 'slide-up' | 'fade' | 'zoom-in' | 'none';

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Styling and animation options specific to UIModal dialogs.
 */
export interface ModalStyles extends VisualStyles {
  open?: boolean;
  animated?: boolean;
  animation?: ModalAnimationType;
  duration?: number;
  originRect?: RectBounds | null;
  backdropColor?: string;
  backdropColors?: [string, string];
  gradient?: boolean;
  backdropGradient?: boolean;
  blur?: boolean;
  blurBackdrop?: boolean;
  blurRadius?: number;
  closeOnBackdropClick?: boolean;
}

// Silky smooth quartic-out fluid deceleration curve
function fluidEase(t: number): number {
  return 1 - Math.pow(1 - t, 3.5);
}

/**
 * High-performance animated Modal dialog overlay component with hardware-accelerated
 * Hero Shared-Element expansion animations, bidirectional closing transitions,
 * deep backdrop dimming, and touch dismissal.
 */
export class UIModal extends UIElement {
  public readonly isModal = true;
  public declare styles: ModalStyles;
  private isOpen = true;
  private animProgress = 1;
  private isAnimating = false;
  private animStartTime = 0;
  private animPhase: 'opening' | 'closing' | 'idle' = 'idle';
  private originRect: RectBounds | null = null;

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
      animation: 'hero',
      duration: 300,
      ...styles,
    });

    this.isOpen = styles.open !== false;
    this.originRect = styles.originRect ? { ...styles.originRect } : null;
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
   * Returns whether an entrance or exit animation is actively running.
   */
  public isAnimationRunning(): boolean {
    return this.isAnimating;
  }

  /**
   * Retrieves the active animation type (defaults to 'hero').
   */
  private getAnimationType(): ModalAnimationType {
    if (!this.isAnimationEnabled()) return 'none';
    return this.styles.animation ?? 'hero';
  }

  public startEntranceAnimation(onComplete?: () => void): void {
    const animType = this.getAnimationType();

    if (animType === 'none') {
      this.animProgress = 1;
      this.isAnimating = false;
      this.animPhase = 'idle';
      this.markRenderDirty();
      Engine.invalidateActive();
      if (onComplete) onComplete();
      return;
    }

    this.animProgress = 0;
    this.isAnimating = true;
    this.animPhase = 'opening';
    this.animStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.markRenderDirty();
    Engine.invalidateActive();
    if (onComplete) {
      setTimeout(onComplete, (this.styles.duration ?? 300) + 20);
    }
  }

  public startExitAnimation(onComplete?: () => void): void {
    const animType = this.getAnimationType();

    if (animType === 'none') {
      this.animProgress = 0;
      this.isAnimating = false;
      this.animPhase = 'idle';
      this.isOpen = false;
      this.visible = false;
      this.styles.display = 'none';
      this.markRenderDirty();
      this.markLayoutDirty();
      Engine.invalidateActive();
      if (onComplete) onComplete();
      return;
    }

    this.animProgress = 1;
    this.isAnimating = true;
    this.animPhase = 'closing';
    this.animStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.markRenderDirty();
    Engine.invalidateActive();
    if (onComplete) {
      setTimeout(onComplete, (this.styles.duration ?? 250) + 20);
    }
  }

  /**
   * Toggles modal visibility and layout participation with bidirectional transition.
   */
  public setOpen(open: boolean): this {
    if (open) {
      this.isOpen = true;
      this.styles.open = true;
      this.visible = true;
      this.styles.display = 'flex';
      this.isLayoutDirty = true;
      if (this.styles.originRect) {
        this.originRect = { ...this.styles.originRect };
      }
      if (this.isAnimationEnabled()) {
        this.startEntranceAnimation();
      } else {
        this.animProgress = 1;
        this.isAnimating = false;
        this.markRenderDirty();
      }
      this.markLayoutDirty();
    } else {
      if (this.isAnimationEnabled() && this.isOpen && this.visible) {
        this.startExitAnimation(() => {
          this.styles.open = false;
        });
      } else {
        this.isOpen = false;
        this.styles.open = false;
        this.visible = false;
        this.styles.display = 'none';
        this.animProgress = 0;
        this.isAnimating = false;
        this.markLayoutDirty();
      }
    }
    return this;
  }

  public override setStyle(styles: Partial<ModalStyles>): this {
    super.setStyle(styles);
    if (styles.originRect !== undefined) {
      this.originRect = styles.originRect ? { ...styles.originRect } : null;
    }
    if (styles.open !== undefined && styles.open !== this.isOpen) {
      this.setOpen(styles.open);
    }
    return this;
  }

  /**
   * Always pins UIModal overlay to the active root viewport (0, 0, rootWidth, rootHeight).
   */
  public override updateWorldTransform(_parentWorldX = 0, _parentWorldY = 0): void {
    if (!this.visible || this.styles.display === 'none' || !this.isOpen) {
      return;
    }

    const root = this.getRootElement();
    const viewportW = root ? root.layoutRect.width : (typeof window !== 'undefined' ? window.innerWidth : this.layoutRect.width);
    const viewportH = root ? root.layoutRect.height : (typeof window !== 'undefined' ? window.innerHeight : this.layoutRect.height);

    this.worldRect.x = 0;
    this.worldRect.y = 0;
    this.worldRect.width = viewportW;
    this.worldRect.height = viewportH;
    this.layoutRect.x = 0;
    this.layoutRect.y = 0;
    this.layoutRect.width = viewportW;
    this.layoutRect.height = viewportH;

    const card = this.getModalCard();
    if (card) {
      const cardW = Math.min(viewportW * 0.94, (typeof card.styles.width === 'number' ? card.styles.width : (card.layoutRect.width > 0 ? card.layoutRect.width : 780)));
      const cardH = Math.min(viewportH * 0.94, (typeof card.styles.height === 'number' ? card.styles.height : (card.layoutRect.height > 0 ? card.layoutRect.height : 480)));
      const cardX = Math.round((viewportW - cardW) / 2);
      const cardY = Math.round((viewportH - cardH) / 2);

      FlexLayout.calculateLayout(card, cardW, cardH);
      card.setLayout(cardX, cardY, cardW, cardH);
      card.updateWorldTransform(0, 0);
    }
  }

  private getRootElement(): UIElement {
    let curr: UIElement = this;
    while (curr.parent) {
      curr = curr.parent;
    }
    return curr;
  }

  /**
   * Discovers the actual visible modal dialog card element inside this modal,
   * unwrapping any conditional or fragment containers (e.g. display: 'contents').
   */
  private getModalCard(): UIElement | null {
    const findCard = (element: UIElement): UIElement | null => {
      for (const child of element.children) {
        if (!child.visible || child.styles.display === 'none') continue;
        if (child.styles.display === 'contents') {
          const found = findCard(child);
          if (found) return found;
        } else {
          return child;
        }
      }
      return null;
    };
    return findCard(this);
  }

  /**
   * Spatial hit-testing covering 100% of the active viewport when open.
   */
  public override hitTest(worldX: number, worldY: number): UIElement | null {
    if (!this.visible || this.styles.display === 'none' || !this.isOpen) {
      return null;
    }

    const card = this.getModalCard();
    if (card) {
      const hit = card.hitTest(worldX, worldY);
      if (hit) {
        return hit;
      }
    }

    // If click is within viewport bounds, hit the modal backdrop overlay (this)
    if (worldX >= 0 && worldX <= this.worldRect.width && worldY >= 0 && worldY <= this.worldRect.height) {
      return this;
    }

    return null;
  }

  /**
   * Hardware-accelerated rendering: Hero Shared-Element expansion, dimmed glass overlay, and dialog card.
   */
  public override render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.styles.display === 'none' || !this.isOpen) {
      return;
    }

    // Advance animation frame synchronized with the Engine render loop
    if (this.isAnimating) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - this.animStartTime;
      const duration = this.animPhase === 'closing' ? Math.min(250, this.styles.duration ?? 250) : (this.styles.duration ?? 300);
      const t = Math.min(1, elapsed / duration);

      if (this.animPhase === 'closing') {
        this.animProgress = 1 - t;
      } else {
        this.animProgress = t;
      }

      if (t < 1) {
        this.markRenderDirty();
        Engine.invalidateActive();
      } else {
        this.isAnimating = false;
        if (this.animPhase === 'closing') {
          this.animProgress = 0;
          this.isOpen = false;
          this.visible = false;
          this.styles.display = 'none';
          this.styles.open = false;
          this.markLayoutDirty();
        } else {
          this.animProgress = 1;
        }
        this.animPhase = 'idle';
        this.markRenderDirty();
        Engine.invalidateActive();
      }
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const fullCanvasWidth = ctx.canvas ? ctx.canvas.width / dpr : (this.worldRect.width || (typeof window !== 'undefined' ? window.innerWidth : 800));
    const fullCanvasHeight = ctx.canvas ? ctx.canvas.height / dpr : (this.worldRect.height || (typeof window !== 'undefined' ? window.innerHeight : 600));

    ctx.save();
    // Fixed viewport-level overlay transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const progress = this.animProgress;
    const eased = fluidEase(progress);

    // 1. Draw Fullscreen Dark Backdrop Overlay
    ctx.save();
    ctx.fillStyle = this.styles.backdropColor ?? 'rgba(0, 0, 0, 0.78)';
    const backdropAlpha = Math.max(0, Math.min(1, progress * 1.4));
    ctx.globalAlpha = backdropAlpha;
    ctx.fillRect(0, 0, fullCanvasWidth, fullCanvasHeight);
    ctx.restore();

    // 2. Render Modal Dialog Card with Hero Morph Transition
    const originRect = this.styles.originRect || this.originRect;
    const card = this.getModalCard();

    if (card && card.visible && card.styles.display !== 'none') {
      ctx.save();

      const targetW = Math.min(fullCanvasWidth * 0.94, (typeof card.styles.width === 'number' ? card.styles.width : (card.layoutRect.width > 0 ? card.layoutRect.width : 780)));
      const targetH = Math.min(fullCanvasHeight * 0.94, (typeof card.styles.height === 'number' ? card.styles.height : (card.layoutRect.height > 0 ? card.layoutRect.height : 480)));

      // Calculate absolute dead center on the visible viewport
      const targetX = Math.round((fullCanvasWidth - targetW) / 2);
      const targetY = Math.round((fullCanvasHeight - targetH) / 2);
      const targetCenterX = fullCanvasWidth / 2;
      const targetCenterY = fullCanvasHeight / 2;

      // Keep layout and world transformation perfectly synchronized with viewport
      FlexLayout.calculateLayout(card, targetW, targetH);
      card.setLayout(targetX, targetY, targetW, targetH);
      card.updateWorldTransform(0, 0);

      if (originRect && typeof originRect.width === 'number' && originRect.width > 0 && targetW > 0 && targetH > 0) {
        // Precise Figma Smart Animation Morph (originRect -> modal dialog card)
        const originX = originRect.x;
        const originY = originRect.y;
        const originW = originRect.width;

        // Compute interpolated bounding box
        const curX = originX + (targetX - originX) * eased;
        const curY = originY + (targetY - originY) * eased;
        const curW = originW + (targetW - originW) * eased;

        // Uniform scale factor
        const scale = curW / targetW;
        const cardAlpha = Math.max(0, Math.min(1, progress * 3.0));

        const curCenterX = curX + curW / 2;
        const curCenterY = curY + (targetH * scale) / 2;

        ctx.translate(curCenterX, curCenterY);
        if (scale !== 1.0) {
          ctx.scale(scale, scale);
        }
        ctx.translate(-targetCenterX, -targetCenterY);
        ctx.globalAlpha = cardAlpha;

        card.render(ctx);
      } else {
        // Natural zoom-center fallback
        const currentCenterX = targetCenterX;
        const currentCenterY = targetCenterY + (1 - eased) * 40;
        const currentScale = 0.7 + 0.3 * eased;
        const cardAlpha = Math.max(0, Math.min(1, progress * 2.2));

        ctx.translate(currentCenterX, currentCenterY);
        if (currentScale !== 1.0) {
          ctx.scale(currentScale, currentScale);
        }
        ctx.translate(-targetCenterX, -targetCenterY);
        ctx.globalAlpha = cardAlpha;

        card.render(ctx);
      }

      ctx.restore();
    }

    ctx.restore();
    this.isRenderDirty = false;
  }

  public isModalOpen(): boolean {
    return this.isOpen && this.visible && this.styles.display !== 'none' && this.animProgress > 0.01;
  }

  public draw(_ctx: CanvasRenderingContext2D): void {
    // Rendered via composite render() pipeline
  }
}
