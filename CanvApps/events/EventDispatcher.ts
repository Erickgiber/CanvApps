import { UIElement } from '../core/UIElement';
import { CanvasPointerEvent } from './types';

/**
 * Options for configuring the centralized EventDispatcher.
 */
export interface EventDispatcherOptions {
  canvas: HTMLCanvasElement;
  getRoot: () => UIElement | null;
  invalidate: () => void;
}

/**
 * Centralized Event Dispatcher that intercepts native browser DOM pointer, mouse, touch,
 * and keyboard events, performs spatial Hitboxing on the Canvas UI tree, and dispatches
 * synthetic CanvasPointerEvents with bubbling and hover/press state management.
 */
export class EventDispatcher {
  private canvas: HTMLCanvasElement;
  private getRoot: () => UIElement | null;
  private invalidate: () => void;

  private hoveredElement: UIElement | null = null;
  private pressedElement: UIElement | null = null;
  private focusedElement: UIElement | null = null;

  // Bound event listeners for cleanup
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnPointerCancel: (e: PointerEvent) => void;
  private boundOnDblClick: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;

  constructor(options: EventDispatcherOptions) {
    this.canvas = options.canvas;
    this.getRoot = options.getRoot;
    this.invalidate = options.invalidate;

    this.boundOnPointerDown = this.handlePointerDown.bind(this);
    this.boundOnPointerMove = this.handlePointerMove.bind(this);
    this.boundOnPointerUp = this.handlePointerUp.bind(this);
    this.boundOnPointerCancel = this.handlePointerCancel.bind(this);
    this.boundOnDblClick = this.handleDblClick.bind(this);
    this.boundOnWheel = this.handleWheel.bind(this);
    this.boundOnKeyDown = this.handleKeyDown.bind(this);
    this.boundOnKeyUp = this.handleKeyUp.bind(this);

    this.attach();
  }

  /**
   * Attaches native DOM listeners to canvas and window.
   */
  public attach(): void {
    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.addEventListener('pointercancel', this.boundOnPointerCancel);
    this.canvas.addEventListener('dblclick', this.boundOnDblClick);
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
  }

  /**
   * Detaches all native DOM listeners.
   */
  public detach(): void {
    this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.removeEventListener('pointercancel', this.boundOnPointerCancel);
    this.canvas.removeEventListener('dblclick', this.boundOnDblClick);
    this.canvas.removeEventListener('wheel', this.boundOnWheel);
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
  }

  /**
   * Converts client (viewport) coordinates to canvas logical CSS coordinates.
   */
  public clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }

    const cssWidth = parseFloat(this.canvas.style.width) || this.canvas.clientWidth || rect.width;
    const cssHeight = parseFloat(this.canvas.style.height) || this.canvas.clientHeight || rect.height;

    const scaleX = cssWidth / rect.width;
    const scaleY = cssHeight / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  /**
   * Finds the deepest UIElement at the specified logical canvas coordinates.
   */
  public hitTest(canvasX: number, canvasY: number): UIElement | null {
    const root = this.getRoot();
    if (!root) {
      return null;
    }
    return root.hitTest(canvasX, canvasY);
  }

  // ---------------------------------------------------------------------------
  private isPointerDown = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private isDraggingScroll = false;

  // ---------------------------------------------------------------------------
  // Native Event Handlers
  // ---------------------------------------------------------------------------

  private handlePointerDown(e: PointerEvent): void {
    // Clear any active text selection when clicking on the canvas or UI elements
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        selection.removeAllRanges();
      }
    }

    this.isPointerDown = true;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.isDraggingScroll = false;

    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);
    const target = this.hitTest(x, y);

    // Focus management
    if (target !== this.focusedElement) {
      if (this.focusedElement) {
        this.focusedElement.blur();
        this.focusedElement.emit('blur', new CanvasPointerEvent('blur', this.focusedElement, e, x, y));
      }
      this.focusedElement = target;
      if (target) {
        target.focus();
        target.emit('focus', new CanvasPointerEvent('focus', target, e, x, y));
      }
    }

    if (target) {
      this.pressedElement = target;
      target.isPressed = true;
      target.markRenderDirty();

      const event = new CanvasPointerEvent('pointerdown', target, e, x, y);
      target.emit('pointerdown', event);
    } else {
      this.pressedElement = null;
    }

    this.invalidate();
  }

  private hasOpenModal(): boolean {
    const root = this.getRoot();
    if (!root) return false;
    let openModal = false;
    const check = (el: UIElement) => {
      if (openModal) return;
      if (
        (el.constructor.name === 'UIModal' || (el as any).isModal === true) &&
        el.visible &&
        el.styles.display !== 'none' &&
        (el as any).isOpen !== false
      ) {
        openModal = true;
        return;
      }
      for (const child of el.children) {
        check(child);
      }
    };
    check(root);
    return openModal;
  }

  private handlePointerMove(e: PointerEvent): void {
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);
    const target = this.hitTest(x, y);

    // Handle touch & pointer drag scrolling
    if (this.isPointerDown) {
      if (this.hasOpenModal()) {
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      } else {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        const totalDist = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);

        if (totalDist > 6) {
          this.isDraggingScroll = true;
        }

        if (this.isDraggingScroll && (dx !== 0 || dy !== 0)) {
          let curr: UIElement | null = target || this.getRoot();
          let didScroll = false;

          while (curr) {
            if (curr.styles.display !== 'contents') {
              const isScrollContainer = !curr.parent || curr.styles.overflow === 'scroll' || curr.styles.overflow === 'auto';
              // Horizontal scroll
              if (dx !== 0 && isScrollContainer && curr.maxScrollLeft > 0) {
                const prev = curr.scrollLeft;
                curr.scrollLeft = Math.max(0, Math.min(curr.maxScrollLeft, curr.scrollLeft - dx));
                if (curr.scrollLeft !== prev) {
                  curr.markRenderDirty();
                  didScroll = true;
                }
              }
              // Vertical scroll
              if (dy !== 0 && isScrollContainer && curr.maxScrollTop > 0) {
                const prev = curr.scrollTop;
                curr.scrollTop = Math.max(0, Math.min(curr.maxScrollTop, curr.scrollTop - dy));
                if (curr.scrollTop !== prev) {
                  curr.markRenderDirty();
                  didScroll = true;
                }
              }
              if (didScroll) {
                break;
              }
            }
            curr = curr.parent;
          }
        }

        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    }

    // Handle hover transitions
    if (target !== this.hoveredElement) {
      if (this.hoveredElement) {
        this.hoveredElement.isHovered = false;
        this.hoveredElement.markRenderDirty();
        const leaveEvent = new CanvasPointerEvent('pointerleave', this.hoveredElement, e, x, y);
        this.hoveredElement.emit('pointerleave', leaveEvent);
      }

      this.hoveredElement = target;

      if (target) {
        target.isHovered = true;
        target.markRenderDirty();
        const enterEvent = new CanvasPointerEvent('pointerenter', target, e, x, y);
        target.emit('pointerenter', enterEvent);

        // Update cursor
        this.canvas.style.cursor = target.styles.cursor || 'default';
      } else {
        this.canvas.style.cursor = 'default';
      }
    }

    if (target) {
      const moveEvent = new CanvasPointerEvent('pointermove', target, e, x, y);
      target.emit('pointermove', moveEvent);
    }

    this.invalidate();
  }

  private handlePointerUp(e: PointerEvent): void {
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);
    const target = this.hitTest(x, y);
    const wasDragging = this.isDraggingScroll;

    this.isPointerDown = false;
    this.isDraggingScroll = false;

    if (this.pressedElement) {
      this.pressedElement.isPressed = false;
      this.pressedElement.markRenderDirty();

      const upEvent = new CanvasPointerEvent('pointerup', this.pressedElement, e, x, y);
      this.pressedElement.emit('pointerup', upEvent);

      // If released on the same element and user was NOT swiping to scroll, trigger click
      if (!wasDragging && target === this.pressedElement) {
        const clickEvent = new CanvasPointerEvent('click', target, e, x, y);
        target.emit('click', clickEvent);
      }

      this.pressedElement = null;
    } else if (target) {
      const upEvent = new CanvasPointerEvent('pointerup', target, e, x, y);
      target.emit('pointerup', upEvent);
    }

    this.invalidate();
  }

  private handlePointerCancel(e: PointerEvent): void {
    this.isPointerDown = false;
    this.isDraggingScroll = false;
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);
    if (this.pressedElement) {
      this.pressedElement.isPressed = false;
      this.pressedElement.markRenderDirty();
      const cancelEvent = new CanvasPointerEvent('pointercancel', this.pressedElement, e, x, y);
      this.pressedElement.emit('pointercancel', cancelEvent);
      this.pressedElement = null;
    }
    this.invalidate();
  }

  private handleDblClick(e: MouseEvent): void {
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);
    const target = this.hitTest(x, y);
    if (target) {
      const dblEvent = new CanvasPointerEvent('dblclick', target, e, x, y);
      target.emit('dblclick', dblEvent);
      this.invalidate();
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (this.hasOpenModal()) {
      e.preventDefault();
      return;
    }
    const { x, y } = this.clientToCanvas(e.clientX, e.clientY);
    const target = this.hitTest(x, y) || this.getRoot();
    if (target) {
      const wheelEvent = new CanvasPointerEvent('wheel', target, e, x, y);
      target.emit('wheel', wheelEvent);

      // Bubble up to find nearest scrollable ancestor or root
      let curr: UIElement | null = target;
      let scrolled = false;
      while (curr) {
        if (curr.styles.display !== 'contents') {
          const isScrollContainer = !curr.parent || curr.styles.overflow === 'scroll' || curr.styles.overflow === 'auto';
          let didScroll = false;
          if (e.deltaX !== 0 && isScrollContainer && curr.maxScrollLeft > 0) {
            const prev = curr.scrollLeft;
            curr.scrollLeft = Math.max(0, Math.min(curr.maxScrollLeft, curr.scrollLeft + e.deltaX));
            if (curr.scrollLeft !== prev) {
              didScroll = true;
            }
          }
          if (e.deltaY !== 0 && isScrollContainer && curr.maxScrollTop > 0) {
            const prev = curr.scrollTop;
            curr.scrollTop = Math.max(0, Math.min(curr.maxScrollTop, curr.scrollTop + e.deltaY));
            if (curr.scrollTop !== prev) {
              didScroll = true;
            }
          }
          if (didScroll) {
            curr.markRenderDirty();
            scrolled = true;
            break;
          }
        }
        curr = curr.parent;
      }

      if (scrolled) {
        e.preventDefault();
      }
      this.invalidate();
    }
  }

  private handleKeyDown(_e: KeyboardEvent): void {
    if (this.focusedElement) {
      // In future phases, keyboard events can bubble along tree
      this.invalidate();
    }
  }

  private handleKeyUp(_e: KeyboardEvent): void {
    if (this.focusedElement) {
      this.invalidate();
    }
  }

  public getFocusedElement(): UIElement | null {
    return this.focusedElement;
  }

  public setFocusedElement(el: UIElement | null): void {
    if (this.focusedElement !== el) {
      if (this.focusedElement) {
        this.focusedElement.blur();
      }
      this.focusedElement = el;
      if (el) {
        el.focus();
      }
      this.invalidate();
    }
  }

  public destroy(): void {
    this.detach();
    this.hoveredElement = null;
    this.pressedElement = null;
    this.focusedElement = null;
  }
}
