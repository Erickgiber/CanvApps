import { UIElement } from '../core/UIElement';
import { Engine } from '../core/Engine';
import { FlexLayout } from '../layout/FlexLayout';

export interface LayoutSnapshot {
  layoutId: string;
  worldRect: { x: number; y: number; width: number; height: number };
  timestamp: number;
}

interface ActiveSharedAnimation {
  element: UIElement;
  layoutId: string;
  startX: number;
  startY: number;
  startScaleX: number;
  startScaleY: number;
  startTime: number;
  duration: number;
}

export class SmartAnimate {
  private static snapshots: Map<string, LayoutSnapshot> = new Map();
  private static activeAnimations: ActiveSharedAnimation[] = [];
  private static isRunning = false;

  public static snapshot(root: UIElement | null): void {
    if (!root) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const traverse = (el: UIElement) => {
      if (el.styles.layoutId) {
        this.snapshots.set(el.styles.layoutId, {
          layoutId: el.styles.layoutId,
          worldRect: {
            x: el.worldRect.x,
            y: el.worldRect.y,
            width: el.worldRect.width,
            height: el.worldRect.height,
          },
          timestamp: now,
        });
      }
      for (const child of el.children) {
        traverse(child);
      }
    };

    traverse(root);
  }

  public static prepare(root: UIElement | null, duration = 320): void {
    if (!root || this.snapshots.size === 0) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const engine = Engine.getActive();
    if (root.isLayoutDirty && engine) {
      FlexLayout.calculateLayout(
        root,
        (engine as any).width || engine.canvas.clientWidth || 800,
        (engine as any).height || engine.canvas.clientHeight || 600
      );
    }

    const newActive: ActiveSharedAnimation[] = [];

    const traverse = (el: UIElement) => {
      const lid = el.styles.layoutId;
      if (lid && this.snapshots.has(lid)) {
        const snap = this.snapshots.get(lid)!;
        // Accept snapshots captured within the last 1.5 seconds
        if (now - snap.timestamp < 1500) {
          const dx = snap.worldRect.x - el.worldRect.x;
          const dy = snap.worldRect.y - el.worldRect.y;
          const sX = el.worldRect.width > 0 && snap.worldRect.width > 0 ? snap.worldRect.width / el.worldRect.width : 1;
          const sY = el.worldRect.height > 0 && snap.worldRect.height > 0 ? snap.worldRect.height / el.worldRect.height : 1;

          if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(sX - 1) > 0.02 || Math.abs(sY - 1) > 0.02) {
            el.smartOffsetX = dx;
            el.smartOffsetY = dy;
            el.smartScaleX = sX;
            el.smartScaleY = sY;

            newActive.push({
              element: el,
              layoutId: lid,
              startX: dx,
              startY: dy,
              startScaleX: sX,
              startScaleY: sY,
              startTime: now,
              duration,
            });
          }
        }
      }
      for (const child of el.children) {
        traverse(child);
      }
    };

    traverse(root);

    if (newActive.length > 0) {
      this.activeAnimations = newActive;
      this.snapshots.clear();
      this.startLoop();
    }
  }

  private static startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      let hasRunning = false;

      // Easing: Smooth Apple/Figma cubic ease out deceleration curve
      const easeOut = (t: number) => {
        return 1 - Math.pow(1 - t, 3);
      };

      for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
        const anim = this.activeAnimations[i];
        const elapsed = now - anim.startTime;
        const rawProgress = Math.min(1, Math.max(0, elapsed / anim.duration));
        const eased = easeOut(rawProgress);

        anim.element.smartOffsetX = anim.startX * (1 - eased);
        anim.element.smartOffsetY = anim.startY * (1 - eased);
        anim.element.smartScaleX = 1 + (anim.startScaleX - 1) * (1 - eased);
        anim.element.smartScaleY = 1 + (anim.startScaleY - 1) * (1 - eased);
        anim.element.markRenderDirty();

        if (rawProgress < 1) {
          hasRunning = true;
        } else {
          anim.element.smartOffsetX = 0;
          anim.element.smartOffsetY = 0;
          anim.element.smartScaleX = 1;
          anim.element.smartScaleY = 1;
          anim.element.markRenderDirty();
          this.activeAnimations.splice(i, 1);
        }
      }

      Engine.invalidateActive();

      if (hasRunning && this.activeAnimations.length > 0) {
        requestAnimationFrame(tick);
      } else {
        this.isRunning = false;
        this.activeAnimations = [];
      }
    };

    requestAnimationFrame(tick);
  }

  public static hasActiveAnimations(): boolean {
    return this.isRunning || this.activeAnimations.length > 0;
  }
}
