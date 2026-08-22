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
 * 2. Full text selection & native OS context menu ("Copy", "Select All", "Share").
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

    // Make overlay absolute, overlaying the canvas without blocking pointer events
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

    const parent = mountContainer ?? document.body;
    parent.appendChild(this.container);
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
        span.textContent = target.getText ? target.getText() : '';
        ghost = span;
      } else {
        ghost = document.createElement('div');
        ghost.tabIndex = 0;
      }

      if (type === 'text') {
        // Text node ghost: visually transparent but fully selectable by browser cursor/touch & native context menu
        Object.assign(ghost.style, {
          position: 'absolute',
          opacity: '0.0001',
          pointerEvents: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          cursor: 'text',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: '#000000',
          padding: '0',
          margin: '0',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          zIndex: '1',
        });
      } else {
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
    Object.assign(ghost.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${Math.max(1, width)}px`,
      height: `${Math.max(1, height)}px`,
      display: target.visible && target.styles.display !== 'none' ? 'block' : 'none',
    });

    if (ghost instanceof HTMLInputElement || ghost instanceof HTMLTextAreaElement) {
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
      const currentText = target.getText ? target.getText() ?? '' : '';
      if (ghost.textContent !== currentText) {
        ghost.textContent = currentText;
      }
      const styles = (target.styles ?? {}) as Record<string, any>;
      const fontSize = styles.fontSize ?? 14;
      const fontWeight = styles.fontWeight ?? 'normal';
      const fontFamily = styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
      ghost.style.fontSize = `${fontSize}px`;
      ghost.style.fontWeight = String(fontWeight);
      ghost.style.fontFamily = fontFamily;
      if (styles.lineHeight) {
        ghost.style.lineHeight = `${styles.lineHeight}px`;
      }
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
   * Focuses the native ghost element.
   */
  public focus(target: GhostTarget): void {
    const ghost = this.ghostElements.get(target.id);
    if (ghost && typeof ghost.focus === 'function') {
      ghost.focus();
    }
  }

  /**
   * Blurs the native ghost element.
   */
  public blur(target: GhostTarget): void {
    const ghost = this.ghostElements.get(target.id);
    if (ghost && typeof ghost.blur === 'function') {
      ghost.blur();
    }
  }

  /**
   * Removes a ghost target from the overlay.
   */
  public unregister(target: GhostTarget): void {
    const ghost = this.ghostElements.get(target.id);
    if (ghost && ghost.parentElement) {
      ghost.parentElement.removeChild(ghost);
      this.ghostElements.delete(target.id);
    }
  }

  /**
   * Cleans up all ghost elements and removes the overlay.
   */
  public destroy(): void {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.ghostElements.clear();
  }
}
