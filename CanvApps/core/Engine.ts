import { UIElement } from './UIElement';
import { FlexLayout } from '../layout/FlexLayout';
import { EventDispatcher } from '../events/EventDispatcher';
import { GhostDOM, GhostTarget } from '../ghost/GhostDOM';

/**
 * Options for configuring the CanvApps rendering engine.
 */
export interface EngineOptions {
  /**
   * Target canvas element or selector string. If omitted, a canvas is created.
   */
  canvas?: HTMLCanvasElement | string;

  /**
   * Parent container element or selector to auto-mount and fit the canvas.
   */
  container?: HTMLElement | string;

  /**
   * Background clear color for each frame (e.g. '#ffffff' or 'transparent').
   */
  backgroundColor?: string;

  /**
   * Manually override device pixel ratio. Defaults to `window.devicePixelRatio`.
   */
  dpr?: number;

  /**
   * Whether to automatically listen for window/container resize events.
   */
  autoResize?: boolean;

  /**
   * Global text selection strategy. If false (default), non-selectable texts do not generate Ghost DOM nodes.
   */
  selectable?: boolean;
}

/**
 * Central orchestrator managing the Canvas rendering loop, HiDPI / Retina resolution scaling,
 * dirty-tree layout passes, event dispatching, Ghost DOM accessibility/inputs, and frame repaints.
 */
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

  /**
   * Invalidates the currently active engine for an immediate vsync repaint.
   */
  public static invalidateActive(): void {
    if (this.activeEngine) {
      this.activeEngine.invalidate();
    }
  }

  constructor(options: EngineOptions = {}) {
    Engine.activeEngine = this;
    if (options.selectable !== undefined) {
      UIElement.defaultSelectable = options.selectable;
    }

    // 1. Resolve canvas instance
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

    // Configure touch-safe styles on canvas to eliminate mobile browser blue tap highlights, context menus, and image copying
    this.canvas.style.display = 'block';
    (this.canvas.style as any).webkitTapHighlightColor = 'transparent';
    (this.canvas.style as any).tapHighlightColor = 'transparent';
    this.canvas.style.touchAction = 'none';
    (this.canvas.style as any).webkitTouchCallout = 'none';
    this.canvas.style.userSelect = 'none';
    (this.canvas.style as any).webkitUserSelect = 'none';
    (this.canvas.style as any).webkitUserDrag = 'none';
    this.canvas.style.outline = 'none';

    // Prevent default context menu (copy image, inspect, save image) and dragging
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());

    // Inject global mobile tap-highlight reset stylesheet
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

    // 2. Initialize 2D rendering context with alpha channel enabled
    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Engine: Failed to acquire 2D Canvas rendering context.');
    }
    this.ctx = ctx;

    this.dpr = options.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    this.backgroundColor = options.backgroundColor ?? 'transparent';

    // 3. Mount to container if specified
    let mountParent: HTMLElement | undefined;
    if (options.container) {
      const parent =
        typeof options.container === 'string'
          ? document.querySelector(options.container)
          : options.container;
      if (parent instanceof HTMLElement) {
        mountParent = parent;
        parent.style.position = 'relative'; // Ensure absolute GhostDOM overlays properly
        (parent.style as any).webkitTapHighlightColor = 'transparent';
        (parent.style as any).tapHighlightColor = 'transparent';
        parent.style.touchAction = 'none';
        (parent.style as any).webkitTouchCallout = 'none';
        parent.appendChild(this.canvas);
      }
    }

    // 4. Initialize EventDispatcher & GhostDOM
    this.events = new EventDispatcher({
      canvas: this.canvas,
      getRoot: () => this.root,
      invalidate: () => this.invalidate(),
    });

    this.ghost = new GhostDOM(mountParent);

    // 5. Setup auto-resizing
    if (options.autoResize !== false && typeof window !== 'undefined') {
      this.setupAutoResize(options.container);
    } else {
      this.resize(this.canvas.clientWidth || 800, this.canvas.clientHeight || 600);
    }
  }

  /**
   * Sets or replaces the root element hierarchy.
   *
   * @param root The root UIElement.
   * @returns This engine instance for chaining.
   */
  public setRoot(root: UIElement): this {
    this.root = root;
    this.root.markLayoutDirty();
    this.invalidate();
    return this;
  }

  /**
   * Returns the current root element.
   */
  public getRoot(): UIElement | null {
    return this.root;
  }

  /**
   * Configures automatic dimension tracking using ResizeObserver and window events.
   */
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

  /**
   * Resizes the canvas backing store accounting for HiDPI/Retina display scale factor.
   *
   * @param cssWidth Width in CSS logical pixels.
   * @param cssHeight Height in CSS logical pixels.
   */
  public resize(cssWidth: number, cssHeight: number): void {
    if (this.width === cssWidth && this.height === cssHeight) {
      return;
    }

    this.width = cssWidth;
    this.height = cssHeight;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Scale physical backing store buffer
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);

    // Set CSS display dimensions
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    // Invalidate layout and trigger redraw
    if (this.root) {
      this.root.markLayoutDirty();
    }
    this.invalidate();
  }

  /**
   * Marks the engine dirty, ensuring a redraw pass is executed on next animation frame.
   */
  public invalidate(): void {
    this.isDirty = true;
  }

  /**
   * Starts the continuous rendering loop.
   */
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

  /**
   * Pauses the rendering loop.
   */
  public stop(): this {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    return this;
  }

  /**
   * Executes a single layout calculation, ghost DOM synchronization, and canvas render pass if dirty.
   */
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

    // 1. Layout pass (strictly executed when layout is marked dirty)
    if (needsLayout) {
      FlexLayout.calculateLayout(this.root, this.width, this.height);
      this.syncGhostDOM(this.root);
    } else {
      this.root.updateWorldTransform(0, 0);
    }

    // 2. Clear canvas with retina scaling
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.backgroundColor && this.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    // 3. Render tree
    this.root.render(this.ctx);

    // 4. Render top-layer modal overlay portals
    const activeModals = this.findActiveModals(this.root);
    for (const modal of activeModals) {
      modal.render(this.ctx);
    }

    this.ctx.restore();
  }

  /**
   * Discovers all active modals across the UI hierarchy.
   */
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

  /**
   * Recursively discovers, updates, and prunes GhostDOM targets across the element hierarchy.
   */
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

  /**
   * Cleans up observers, stops rendering, and detaches listeners.
   */
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
