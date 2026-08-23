import { UIElement } from '../core/UIElement';

/**
 * Interface representing a Canvas element that participates in the Ghost DOM layer.
 */
export interface GhostTarget extends UIElement {
  getGhostType(): 'input' | 'textarea' | 'button' | 'text' | 'accessible';
  getValue?(): string;
  setValue?(val: string): void;
  getText?(): string;
  isSelectable?(): boolean;
  getPlaceholder?(): string;
  getInputType?(): string;
  getSelectionRange?(): { start: number; end: number };
  onNativeInput?(val: string, cursorIndex?: number): void;
  onNativeKeyDown?(e: KeyboardEvent): void;
  onNativeBlur?(): void;
  onNativeFocus?(): void;
  onSelectionChange?(start: number, end: number): void;
}

/**
 * GhostDOM Manager: Mounts semantically accurate HTML elements matching
 * interactive and selectable Canvas nodes in real-time.
 *
 * Provides:
 * 1. Native mobile keyboard (iOS/Android) invocation and auto-correction.
 * 2. Full text selection with visible highlight & native OS context menu ("Copy", "Select All", "Share").
 * 3. Full accessibility (screen readers, VoiceOver, TalkBack, ARIA).
 * 4. Native clipboard copy/paste/cut integration.
 */
export class GhostDOM {
  private container: HTMLElement;
  private ghostElements: Map<string, HTMLElement> = new Map();

  constructor(mountContainer?: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'canvapps-ghost-dom-overlay';
    this.container.setAttribute('aria-hidden', 'false');

    // Make overlay absolute, overlaying the canvas without blocking unselected pointer events
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: '1',
    });

    // Inject global selection highlighting styles for GhostDOM text nodes
    if (typeof document !== 'undefined' && !document.getElementById('canvapps-ghost-dom-styles')) {
      const style = document.createElement('style');
      style.id = 'canvapps-ghost-dom-styles';
      style.textContent = `
        #canvapps-ghost-dom-overlay .canvapps-ghost-text {
          color: transparent !important;
          caret-color: transparent !important;
          -webkit-text-fill-color: transparent !important;
        }
        #canvapps-ghost-dom-overlay .canvapps-ghost-text::selection {
          background-color: rgba(37, 99, 235, 0.28) !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
        }
        #canvapps-ghost-dom-overlay .canvapps-ghost-text::-moz-selection {
          background-color: rgba(37, 99, 235, 0.28) !important;
          color: transparent !important;
        }
      `;
      document.head.appendChild(style);
    }

    const parent = mountContainer ?? document.body;
    parent.appendChild(this.container);

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.handleGlobalPointerDown.bind(this), true);
    }
  }

  /**
   * Deselects active text selection when clicking outside text nodes.
   */
  private handleGlobalPointerDown(e: PointerEvent): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const isTextGhost = target && target.classList && target.classList.contains('canvapps-ghost-text');
    if (!isTextGhost) {
      selection.removeAllRanges();
    }
  }

  /**
   * Prunes orphan ghost elements that are no longer part of the active UIElement tree.
   * Prevents accumulating multiple overlapping/duplicate text layers when items update.
   */
  public prune(activeIds: Set<string>): void {
    for (const [id, el] of this.ghostElements.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        this.ghostElements.delete(id);
      }
    }
  }

  /**
   * Registers or updates a ghost target node in the overlay.
   */
  public register(target: GhostTarget): HTMLElement {
    let ghost = this.ghostElements.get(target.id);

    if (!ghost) {
      const type = target.getGhostType();
      if (type === 'textarea') {
        ghost = document.createElement('textarea');
      } else if (type === 'input') {
        const input = document.createElement('input');
        input.type = target.getInputType ? target.getInputType() : 'text';
        ghost = input;
      } else if (type === 'text') {
        const span = document.createElement('span');
        span.className = 'canvapps-ghost-text';
        span.textContent = target.getText ? target.getText() : '';
        const selectable = target.isSelectable ? target.isSelectable() : true;

        Object.assign(span.style, {
          position: 'absolute',
          opacity: '1',
          pointerEvents: selectable ? 'auto' : 'none',
          userSelect: selectable ? 'text' : 'none',
          WebkitUserSelect: selectable ? 'text' : 'none',
          cursor: selectable ? 'text' : 'default',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          padding: '0',
          margin: '0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
          zIndex: '1',
        });
        ghost = span;
      } else {
        ghost = document.createElement('div');
        ghost.tabIndex = 0;
      }

      if (type !== 'text') {
        // Invisible input/interactive
        Object.assign(ghost.style, {
          position: 'absolute',
          opacity: '0',
          pointerEvents: 'auto',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          padding: '0',
          margin: '0',
          resize: 'none',
          zIndex: '-1',
        });
      }

      this.bindEvents(ghost, target);
      this.container.appendChild(ghost);
      this.ghostElements.set(target.id, ghost);
    }

    this.updatePosition(target);
    return ghost;
  }

  /**
   * Synchronizes ghost DOM bounding rect with the Canvas node's worldRect.
   */
  public updatePosition(target: GhostTarget): void {
    const ghost = this.ghostElements.get(target.id);
    if (!ghost) {
      return;
    }

    const { x, y, width, height } = target.worldRect;
    const isVisible = target.visible && target.styles.display !== 'none';

    if (ghost instanceof HTMLInputElement || ghost instanceof HTMLTextAreaElement) {
      Object.assign(ghost.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${Math.max(1, width)}px`,
        height: `${Math.max(1, height)}px`,
        display: isVisible ? 'block' : 'none',
      });

      const currentTargetVal = target.getValue ? target.getValue() ?? '' : '';
      if (ghost.value !== currentTargetVal) {
        const prevStart = ghost.selectionStart;
        const prevEnd = ghost.selectionEnd;
        ghost.value = currentTargetVal;
        if (prevStart !== null && prevEnd !== null && typeof document !== 'undefined' && document.activeElement === ghost) {
          try {
            ghost.setSelectionRange(prevStart, prevEnd);
          } catch {
            // ignore non-text inputs
          }
        }
      }
      if (target.getPlaceholder) {
        ghost.placeholder = target.getPlaceholder() ?? '';
      }
    } else if (ghost instanceof HTMLSpanElement || target.getGhostType() === 'text') {
      const padding = target.getComputedPadding ? target.getComputedPadding() : { top: 0, right: 0, bottom: 0, left: 0 };
      const innerX = x + padding.left;
      const innerY = y + padding.top;
      const innerWidth = Math.max(1, width - padding.left - padding.right);
      const innerHeight = Math.max(1, height - padding.top - padding.bottom);

      const styles = (target.styles ?? {}) as Record<string, any>;
      const fontSize = styles.fontSize ?? 14;
      const fontWeight = styles.fontWeight ?? 'normal';
      const fontFamily = styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
      const textAlign = styles.textAlign ?? 'left';
      const selectable = target.isSelectable ? target.isSelectable() : true;
      const currentText = target.getText ? target.getText() ?? '' : '';
      const lineHeightMultiplier = styles.lineHeight ?? 1.2;
      const computedLineHeight = fontSize * lineHeightMultiplier;

      Object.assign(ghost.style, {
        left: `${innerX}px`,
        top: `${innerY}px`,
        width: `${innerWidth}px`,
        height: `${innerHeight}px`,
        display: isVisible && selectable ? 'block' : 'none',
        fontSize: `${fontSize}px`,
        fontWeight: String(fontWeight),
        fontFamily,
        textAlign,
        lineHeight: `${computedLineHeight}px`,
        userSelect: selectable ? 'text' : 'none',
        WebkitUserSelect: selectable ? 'text' : 'none',
        pointerEvents: selectable ? 'auto' : 'none',
        cursor: selectable ? 'text' : 'default',
      });

      if (ghost.textContent !== currentText) {
        ghost.textContent = currentText;
      }
    } else {
      Object.assign(ghost.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${Math.max(1, width)}px`,
        height: `${Math.max(1, height)}px`,
        display: isVisible ? 'block' : 'none',
      });
    }
  }

  /**
   * Binds bidirectional native events between ghost HTML element and Canvas target.
   */
  private bindEvents(ghost: HTMLElement, target: GhostTarget): void {
    if (ghost instanceof HTMLInputElement || ghost instanceof HTMLTextAreaElement) {
      ghost.addEventListener('input', () => {
        const val = ghost.value;
        const cursor = ghost.selectionStart ?? val.length;
        if (target.onNativeInput) {
          target.onNativeInput(val, cursor);
        }
      });

      ghost.addEventListener('keydown', ((e: KeyboardEvent) => {
        if (target.onNativeKeyDown) {
          target.onNativeKeyDown(e);
        }
      }) as EventListener);

      ghost.addEventListener('blur', () => {
        if (target.onNativeBlur) {
          target.onNativeBlur();
        }
      });

      ghost.addEventListener('focus', () => {
        if (target.onNativeFocus) {
          target.onNativeFocus();
        }
      });

      ghost.addEventListener('select', () => {
        if (target.onSelectionChange && ghost.selectionStart !== null && ghost.selectionEnd !== null) {
          target.onSelectionChange(ghost.selectionStart, ghost.selectionEnd);
        }
      });
    }
  }

  /**
   * Removes a specific ghost target by its element ID.
   */
  public unregister(targetId: string): void {
    const el = this.ghostElements.get(targetId);
    if (el) {
      el.remove();
      this.ghostElements.delete(targetId);
    }
  }

  /**
   * Destroys the GhostDOM container and removes all overlays from the document.
   */
  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.handleGlobalPointerDown.bind(this), true);
    }
    this.ghostElements.clear();
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
