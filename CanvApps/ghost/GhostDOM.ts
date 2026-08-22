import { UIElement } from '../core/UIElement';

/**
 * Interface representing a Canvas element that participates in the Ghost DOM layer.
 */
export interface GhostTarget extends UIElement {
  getGhostType(): 'input' | 'textarea' | 'button' | 'accessible';
  getValue?(): string;
  setValue?(val: string): void;
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
 * GhostDOM Manager: Mounts invisible, semantically accurate HTML elements matching
 * interactive Canvas nodes in real-time.
 *
 * Provides:
 * 1. Native mobile keyboard (iOS/Android) invocation and auto-correction.
 * 2. Full accessibility (screen readers, VoiceOver, TalkBack, ARIA).
 * 3. Native clipboard copy/paste/cut integration.
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
      } else {
        ghost = document.createElement('div');
        ghost.tabIndex = 0;
      }

      // Invisible styling but physically positioned for mobile keyboard auto-zoom/focus
      Object.assign(ghost.style, {
        position: 'absolute',
        opacity: '0',
        pointerEvents: 'auto', // Allows direct browser touch focus when clicked
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: 'transparent',
        padding: '0',
        margin: '0',
        resize: 'none',
        zIndex: '-1',
      });

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
        if (target.setValue) {
          target.setValue(val);
        }
        if (target.onNativeInput) {
          target.onNativeInput(val, cursor);
        }
        target.markRenderDirty();
      });

      ghost.addEventListener('keydown', (e) => {
        if (target.onNativeKeyDown) {
          target.onNativeKeyDown(e as KeyboardEvent);
        }
        target.markRenderDirty();
      });

      ghost.addEventListener('focus', () => {
        target.focus();
        if (target.onNativeFocus) {
          target.onNativeFocus();
        }
      });

      ghost.addEventListener('blur', () => {
        target.blur();
        if (target.onNativeBlur) {
          target.onNativeBlur();
        }
      });

      const syncSelection = () => {
        if (target.onSelectionChange && ghost.selectionStart !== null && ghost.selectionEnd !== null) {
          target.onSelectionChange(ghost.selectionStart, ghost.selectionEnd);
        }
      };
      ghost.addEventListener('select', syncSelection);
      ghost.addEventListener('keyup', syncSelection);
      ghost.addEventListener('mouseup', syncSelection);
    }
  }

  /**
   * Focuses the native ghost element.
   */
  public focusTarget(target: GhostTarget): void {
    const ghost = this.ghostElements.get(target.id) || this.register(target);
    ghost.focus();
    if (ghost instanceof HTMLInputElement || ghost instanceof HTMLTextAreaElement) {
      if (target.getSelectionRange) {
        const { start, end } = target.getSelectionRange();
        try {
          ghost.setSelectionRange(start, end);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Blurs the native ghost element.
   */
  public blurTarget(target: GhostTarget): void {
    const ghost = this.ghostElements.get(target.id);
    if (ghost) {
      ghost.blur();
    }
  }

  /**
   * Unregisters a target when unmounted.
   */
  public unregister(targetId: string): void {
    const ghost = this.ghostElements.get(targetId);
    if (ghost) {
      ghost.remove();
      this.ghostElements.delete(targetId);
    }
  }

  /**
   * Cleans up entire overlay.
   */
  public destroy(): void {
    this.container.remove();
    this.ghostElements.clear();
  }
}
