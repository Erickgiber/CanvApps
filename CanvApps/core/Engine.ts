import { UIElement } from './UIElement';
import { FlexLayout } from '../layout/FlexLayout';
import { EventDispatcher } from '../events/EventDispatcher';
import { GhostDOM, GhostTarget } from '../ghost/GhostDOM';
import { initSafeAreaProbe } from './safeArea';
import { setThemeColor } from './theme';
import { CanvAppsErrorOverlay } from '../debug/ErrorOverlay';

export interface EngineOptions {
  canvas?: HTMLCanvasElement | string;
  container?: HTMLElement | string;
  backgroundColor?: string;
  dpr?: number;
  autoResize?: boolean;
  selectable?: boolean;
  safeArea?: boolean;
  themeColor?: boolean | string | { light: string; dark: string };
}

export class Engine {
  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly events: EventDispatcher;
  public readonly ghost: GhostDOM;

  private root: UIElement | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private backgroundColor: string;

  private rafId: number | null = null;
  private isRunning = false;
  private resizeObserver: ResizeObserver | null = null;
  private isDirty = true;

  private static activeEngine: Engine | null = null;

  public static getActive(): Engine | null {
    return this.activeEngine;
  }

  public static getActiveRoot(): UIElement | null {
    return this.activeEngine ? this.activeEngine.root : null;
  }

  public static invalidateActive(): void {
    if (this.activeEngine) {
      this.activeEngine.invalidate();
    }
  }

  constructor(options: EngineOptions = {}) {
    Engine.activeEngine = this;
    CanvAppsErrorOverlay.initGlobalErrorHandling();

    if (options.selectable !== undefined) {
      UIElement.defaultSelectable = options.selectable;
    }
    if (options.safeArea !== undefined) {
      UIElement.enableSafeArea = options.safeArea;
    }
    if (options.safeArea !== false) {
      initSafeAreaProbe();
    }

    if (typeof options.canvas === 'string') {
      const el = document.querySelector(options.canvas);
      if (!(el instanceof HTMLCanvasElement)) {
        throw new Error(`Engine: canvas selector "${options.canvas}" did not match an HTMLCanvasElement.`);
      }
      this.canvas = el;
    } else if (options.canvas instanceof HTMLCanvasElement) {
      this.canvas = options.canvas;
    } else {
      this.canvas = document.createElement('canvas');
    }

    // Disable default mobile callouts and highlights on the canvas
    this.canvas.style.display = 'block';
    (this.canvas.style as any).webkitTapHighlightColor = 'transparent';
    (this.canvas.style as any).tapHighlightColor = 'transparent';
    this.canvas.style.touchAction = 'none';
    (this.canvas.style as any).webkitTouchCallout = 'none';
    this.canvas.style.userSelect = 'none';
    (this.canvas.style as any).webkitUserSelect = 'none';
    (this.canvas.style as any).webkitUserDrag = 'none';
    this.canvas.style.outline = 'none';

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());

    if (typeof document !== 'undefined' && !document.getElementById('canvapps-global-touch-styles')) {
      const style = document.createElement('style');
      style.id = 'canvapps-global-touch-styles';
      style.textContent = `
        canvas, [data-canvapps-root], #canvapps-ghost-dom-overlay {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-user-drag: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Engine: Failed to acquire 2D Canvas rendering context.');
    }
    this.ctx = ctx;

    this.dpr = options.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    this.backgroundColor = options.backgroundColor ?? 'transparent';

    if (options.themeColor !== false) {
      if (typeof options.themeColor === 'string' || typeof options.themeColor === 'object') {
        setThemeColor(options.themeColor);
      } else if (this.backgroundColor && this.backgroundColor !== 'transparent') {
        setThemeColor(this.backgroundColor);
      }
    }

    let mountParent: HTMLElement | undefined;
    if (options.container) {
      const parent =
        typeof options.container === 'string'
          ? document.querySelector(options.container)
          : options.container;
      if (parent instanceof HTMLElement) {
        mountParent = parent;
        parent.style.position = 'relative';
        (parent.style as any).webkitTapHighlightColor = 'transparent';
        (parent.style as any).tapHighlightColor = 'transparent';
        parent.style.touchAction = 'none';
        (parent.style as any).webkitTouchCallout = 'none';
        parent.appendChild(this.canvas);
      }
    }

    this.events = new EventDispatcher({
      canvas: this.canvas,
      getRoot: () => this.root,
      invalidate: () => this.invalidate(),
    });

    this.ghost = new GhostDOM(mountParent);

    if (options.autoResize !== false && typeof window !== 'undefined') {
      this.setupAutoResize(options.container);
    } else {
      this.resize(this.canvas.clientWidth || 800, this.canvas.clientHeight || 600);
    }
  }

  public setRoot(root: UIElement): this {
    this.root = root;
    this.root.markLayoutDirty();
    this.invalidate();
    return this;
  }

  public getRoot(): UIElement | null {
    return this.root;
  }

  private setupAutoResize(container?: HTMLElement | string): void {
    const target =
      typeof container === 'string'
        ? document.querySelector(container)
        : container ?? this.canvas.parentElement ?? document.body;

    if (typeof ResizeObserver !== 'undefined' && target instanceof HTMLElement) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.resize(width, height);
          }
        }
      });
      this.resizeObserver.observe(target);
    } else if (typeof window !== 'undefined') {
      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.resize(w, h);
      };
      window.addEventListener('resize', onResize);
      onResize();
    }
  }

  public resize(cssWidth: number, cssHeight: number): void {
    if (this.width === cssWidth && this.height === cssHeight) {
      return;
    }

    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    if (this.root) {
      this.root.markLayoutDirty();
    }
    this.invalidate();
  }

  public setBackgroundColor(color: string, syncTheme = true): this {
    this.backgroundColor = color;
    if (syncTheme && color && color !== 'transparent') {
      setThemeColor(color);
    }
    this.invalidate();
    return this;
  }

  public invalidate(): void {
    this.isDirty = true;
  }

  public start(): this {
    if (this.isRunning) {
      return this;
    }
    this.isRunning = true;

    const tick = () => {
      if (!this.isRunning) {
        return;
      }
      this.renderFrame();
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
    return this;
  }

  public stop(): this {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    return this;
  }

  public renderFrame(): void {
    if (!this.root) {
      return;
    }

    const needsLayout = Boolean(this.root.isLayoutDirty);
    const needsRender = Boolean(this.root.isRenderDirty || this.isDirty || needsLayout);

    if (!needsLayout && !needsRender) {
      return;
    }

    this.isDirty = false;

    try {
      if (needsLayout) {
        FlexLayout.calculateLayout(this.root, this.width, this.height);
      } else {
        this.root.updateWorldTransform(0, 0);
      }
      this.syncGhostDOM(this.root);

      // Disable pointer events on underlying ghost text while select dropdown is open
      const hasOpenSelect = Boolean(UIElement.activeOpenSelect && (UIElement.activeOpenSelect as any).isDropdownOpen?.());
      this.ghost.setShield(hasOpenSelect);

      this.ctx.save();
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      if (this.backgroundColor && this.backgroundColor !== 'transparent') {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
      } else {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }

      this.root.render(this.ctx);

      // Draw top-layer select dropdown floating over the scene
      if (UIElement.activeOpenSelect && (UIElement.activeOpenSelect as any).isDropdownOpen?.()) {
        (UIElement.activeOpenSelect as any).drawDropdown?.(this.ctx);
      }

      // Draw top-layer modal portals
      const activeModals = this.findActiveModals(this.root);
      for (const modal of activeModals) {
        modal.render(this.ctx);
      }

      this.ctx.restore();
    } catch (err: any) {
      CanvAppsErrorOverlay.showError({
        title: 'CanvApps Render Error',
        message: err.message || 'Error occurred while rendering canvas tree',
        stack: err.stack,
      });
      console.error('[CanvApps Render Error]:', err);
    }
  }

  private findActiveModals(root: UIElement): UIElement[] {
    const modals: UIElement[] = [];
    const traverse = (element: UIElement) => {
      if (!element.visible || element.styles.display === 'none') {
        return;
      }
      if ((element as any).isModal === true) {
        modals.push(element);
      }
      for (const child of element.children) {
        traverse(child);
      }
    };
    traverse(root);
    return modals;
  }

  private syncGhostDOM(root: UIElement): void {
    const activeIds = new Set<string>();

    const traverse = (element: UIElement) => {
      if (!element.visible || element.styles.display === 'none') {
        return;
      }

      if ('getGhostType' in element) {
        const target = element as unknown as GhostTarget;
        const type = target.getGhostType();
        const isSelectableText = type === 'text' && target.isSelectable && target.isSelectable();
        const isInteractiveControl = type !== 'text';

        if (isSelectableText || isInteractiveControl) {
          activeIds.add(target.id);
          this.ghost.register(target);
        }
      }

      for (const child of element.children) {
        traverse(child);
      }
    };

    traverse(root);
    this.ghost.prune(activeIds);
  }

  public destroy(): void {
    this.stop();
    this.events.destroy();
    this.ghost.destroy();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.root = null;
  }
}
