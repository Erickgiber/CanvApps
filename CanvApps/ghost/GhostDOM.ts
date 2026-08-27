import { UIElement } from '../core/UIElement';

/**
 * Interface representing a Canvas element that participates in the Ghost DOM layer.
 */
export interface GhostTarget extends UIElement {
  getGhostType(): 'input' | 'textarea' | 'select' | 'button' | 'text' | 'accessible' | 'anchor' | 'link';
  getId?(): string;
  getName?(): string;
  getValue?(): string;
  setValue?(val: string): void;
  getText?(): string;
  isSelectable?(): boolean;
  getPlaceholder?(): string;
  getInputType?(): string;
  getHref?(): string;
  getTarget?(): string;
  getRel?(): string;
  getDownload?(): string | boolean;
  navigate?(): void;
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

    // Inject global styles for GhostDOM text and input nodes
    if (typeof document !== 'undefined' && !document.getElementById('canvapps-ghost-dom-styles')) {
      const style = document.createElement('style');
      style.id = 'canvapps-ghost-dom-styles';
      style.textContent = `
        #canvapps-ghost-dom-overlay,
        #canvapps-ghost-dom-overlay * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
        }
        #canvapps-ghost-dom-overlay input,
        #canvapps-ghost-dom-overlay textarea,
        #canvapps-ghost-dom-overlay select {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          caret-color: transparent !important;
          background: transparent !important;
        }
        #canvapps-ghost-dom-overlay input::placeholder,
        #canvapps-ghost-dom-overlay textarea::placeholder {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          opacity: 0 !important;
        }
        #canvapps-ghost-dom-overlay input::selection,
        #canvapps-ghost-dom-overlay textarea::selection {
          background-color: transparent !important;
          color: transparent !important;
        }
        #canvapps-ghost-dom-overlay input::-moz-selection,
        #canvapps-ghost-dom-overlay textarea::-moz-selection {
          background-color: transparent !important;
          color: transparent !important;
        }
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
        #canvapps-ghost-dom-overlay.canvapps-overlay-shield,
        #canvapps-ghost-dom-overlay.canvapps-overlay-shield * {
          pointer-events: none !important;
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
   * Focuses the native ghost input associated with a target element.
   */
  public focusGhost(targetId: string): void {
    const el = this.ghostElements.get(targetId);
    if (el && typeof el.focus === 'function' && typeof document !== 'undefined' && document.activeElement !== el) {
      try {
        el.focus();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Resolves the effective background color of a ghost target by walking up
   * the UI tree. Used to match the ghost input text color with the canvas background,
   * rendering the HTML input fully opaque/visible to anti-phishing bots while
   * seamlessly camouflaging with the Canvas render layer for human users.
   */
  public resolveEffectiveBackgroundColor(target: GhostTarget): string {
    let current: UIElement | null = target;
    while (current) {
      const bg = (current.styles as any)?.backgroundColor;
      if (bg && bg !== 'transparent') {
        return bg;
      }
      current = current.parent;
    }
    return '#ffffff';
  }

  /**
   * Registers or updates a ghost target node in the overlay.
   */
  public register(target: GhostTarget): HTMLElement | null {
    const type = target.getGhostType();
    const selectable = target.isSelectable ? target.isSelectable() : false;

    // If text is not selectable, do NOT create or keep any DOM elements!
    if (type === 'text' && !selectable) {
      if (this.ghostElements.has(target.id)) {
        this.unregister(target.id);
      }
      return null;
    }

    let ghost = this.ghostElements.get(target.id);

    if (!ghost) {
      const elId = target.getId ? target.getId() : target.id;
      const elName = target.getName ? target.getName() : (target.styles as any)?.name || target.id;

      if (type === 'textarea') {
        const textarea = document.createElement('textarea');
        textarea.id = elId;
        textarea.name = elName;
        ghost = textarea;
      } else if (type === 'input') {
        const input = document.createElement('input');
        input.id = elId;
        input.name = elName;
        input.type = target.getInputType ? target.getInputType() : 'text';
        ghost = input;
      } else if (type === 'select') {
        const select = document.createElement('select');
        select.id = elId;
        select.name = elName;
        ghost = select;
      } else if (type === 'text') {
        const span = document.createElement('span');
        span.id = elId;
        span.className = 'canvapps-ghost-text';
        span.textContent = target.getText ? target.getText() : '';

        Object.assign(span.style, {
          position: 'absolute',
          opacity: '1',
          pointerEvents: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          cursor: 'text',
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
      } else if (type === 'anchor' || type === 'link') {
        const a = document.createElement('a');
        a.id = elId;
        a.className = 'canvapps-ghost-anchor';
        const href = target.getHref ? target.getHref() : (target.styles as any)?.href || '';
        const aTarget = target.getTarget ? target.getTarget() : (target.styles as any)?.target || '_self';
        const rel = target.getRel ? target.getRel() : (target.styles as any)?.rel || (aTarget === '_blank' ? 'noopener noreferrer' : '');
        const download = target.getDownload ? target.getDownload() : (target.styles as any)?.download;
        const textContent = target.getText ? target.getText() : (target.styles as any)?.text || (target.styles as any)?.label || '';
        const disabled = Boolean((target.styles as any)?.disabled);

        if (href) a.href = href;
        if (aTarget) a.target = aTarget;
        if (rel) a.rel = rel;
        if (download) {
          a.download = typeof download === 'string' ? download : '';
        }
        if (textContent) {
          a.textContent = textContent;
          a.setAttribute('aria-label', textContent);
        }

        Object.assign(a.style, {
          position: 'absolute',
          opacity: '0',
          pointerEvents: 'auto',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          padding: '0',
          margin: '0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          zIndex: '1',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        });
        ghost = a;
      } else {
        ghost = document.createElement('div');
        ghost.id = elId;
        ghost.tabIndex = 0;
      }

      ghost.id = elId;
      ghost.setAttribute('name', elName);
      ghost.setAttribute('data-canvapps-id', elId);

      if (type === 'input' || type === 'textarea') {
        // Single Source of Truth: Canvas renders the visible text at 120 FPS.
        // Ghost DOM input has opacity 1 and transparent text fill to capture native IME/keyboard
        // events without double-rendering text or triggering anti-phishing transparent overlay heuristics.
        Object.assign(ghost.style, {
          position: 'absolute',
          opacity: '1',
          pointerEvents: 'auto',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          caretColor: 'transparent',
          padding: '0',
          margin: '0',
          resize: 'none',
          cursor: 'text',
          boxSizing: 'border-box',
          zIndex: '1',
        });
      } else if (type === 'text') {
        Object.assign(ghost.style, {
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
      } else if (type === 'anchor' || type === 'link') {
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
          cursor: (target.styles as any)?.disabled ? 'not-allowed' : 'pointer',
          zIndex: '1',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        });
      } else {
        Object.assign(ghost.style, {
          position: 'absolute',
          opacity: '0',
          pointerEvents: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          padding: '0',
          margin: '0',
          zIndex: '1',
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

    const type = target.getGhostType();
    const selectable = target.isSelectable ? target.isSelectable() : false;
    if (type === 'text' && !selectable) {
      this.unregister(target.id);
      return;
    }

    const { x, y, width, height } = target.worldRect;
    const isVisible = target.visible && target.styles.display !== 'none';

    const isInputOrTextarea =
      type === 'input' ||
      type === 'textarea' ||
      (typeof HTMLInputElement !== 'undefined' && ghost instanceof HTMLInputElement) ||
      (typeof HTMLTextAreaElement !== 'undefined' && ghost instanceof HTMLTextAreaElement);

    const isAnchor =
      type === 'anchor' ||
      type === 'link' ||
      (typeof HTMLAnchorElement !== 'undefined' && ghost instanceof HTMLAnchorElement);

    const isText =
      type === 'text' ||
      (typeof HTMLSpanElement !== 'undefined' && ghost instanceof HTMLSpanElement);

    if (isInputOrTextarea) {
      const padding = target.getComputedPadding ? target.getComputedPadding() : { top: 0, right: 0, bottom: 0, left: 0 };
      const styles = (target.styles ?? {}) as Record<string, any>;
      const fontSize = styles.fontSize ?? 14;
      const fontFamily = styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
      const fontWeight = String(styles.fontWeight ?? 'normal');
      const textAlign = styles.textAlign ?? 'left';

      Object.assign(ghost.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${Math.max(1, width)}px`,
        height: `${Math.max(1, height)}px`,
        padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
        fontSize: `${fontSize}px`,
        fontFamily,
        fontWeight,
        textAlign,
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        caretColor: 'transparent',
        opacity: '1',
        boxSizing: 'border-box',
        cursor: 'text',
        display: isVisible ? 'block' : 'none',
      });

      const currentTargetVal = target.getValue ? target.getValue() ?? '' : '';
      if ((ghost as any).value !== currentTargetVal) {
        const prevStart = (ghost as any).selectionStart;
        const prevEnd = (ghost as any).selectionEnd;
        (ghost as any).value = currentTargetVal;
        if (prevStart !== null && prevEnd !== null && typeof document !== 'undefined' && document.activeElement === ghost) {
          try {
            (ghost as any).setSelectionRange(prevStart, prevEnd);
          } catch {
            // ignore non-text inputs
          }
        }
      }
      const placeholder = target.getPlaceholder ? target.getPlaceholder() : (target.styles as any)?.placeholder;
      if (placeholder !== undefined) {
        (ghost as any).placeholder = placeholder ?? '';
      }
    } else if (isAnchor) {
      const href = target.getHref ? target.getHref() : (target.styles as any)?.href || '';
      const aTarget = target.getTarget ? target.getTarget() : (target.styles as any)?.target || '_self';
      const rel = target.getRel ? target.getRel() : (target.styles as any)?.rel || (aTarget === '_blank' ? 'noopener noreferrer' : '');
      const download = target.getDownload ? target.getDownload() : (target.styles as any)?.download;
      const textContent = target.getText ? target.getText() : (target.styles as any)?.text || (target.styles as any)?.label || '';
      const disabled = Boolean((target.styles as any)?.disabled);

      if (href) {
        (ghost as any).href = href;
      } else if (typeof (ghost as any).removeAttribute === 'function') {
        (ghost as any).removeAttribute('href');
      }
      if (aTarget) (ghost as any).target = aTarget;
      if (rel) (ghost as any).rel = rel;
      if (download) {
        (ghost as any).download = typeof download === 'string' ? download : '';
      }
      if (ghost.textContent !== textContent) {
        ghost.textContent = textContent;
        if (typeof (ghost as any).setAttribute === 'function') {
          (ghost as any).setAttribute('aria-label', textContent);
        }
      }

      Object.assign(ghost.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${Math.max(1, width)}px`,
        height: `${Math.max(1, height)}px`,
        display: isVisible ? 'block' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      });
    } else if (isText) {
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
      const selectable = target.isSelectable ? target.isSelectable() : false;
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
        pointerEvents: 'none',
      });
    }
  }

  /**
   * Binds bidirectional native events between ghost HTML element and Canvas target.
   */
  private bindEvents(ghost: HTMLElement, target: GhostTarget): void {
    const type = target.getGhostType();
    const isAnchor =
      type === 'anchor' ||
      type === 'link' ||
      (typeof HTMLAnchorElement !== 'undefined' && ghost instanceof HTMLAnchorElement);

    const isInputOrTextarea =
      type === 'input' ||
      type === 'textarea' ||
      (typeof HTMLInputElement !== 'undefined' && ghost instanceof HTMLInputElement) ||
      (typeof HTMLTextAreaElement !== 'undefined' && ghost instanceof HTMLTextAreaElement);

    if (isAnchor) {
      ghost.addEventListener('click', ((e: MouseEvent) => {
        if ((target.styles as any)?.disabled) {
          e.preventDefault();
          return;
        }

        const isModified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
        const href =
          (typeof (ghost as any).getAttribute === 'function' ? (ghost as any).getAttribute('href') : null) ||
          (ghost as any).href ||
          (target.getHref ? target.getHref() : (target.styles as any)?.href || '');
        const aTarget =
          (ghost as any).target ||
          (target.getTarget ? target.getTarget() : (target.styles as any)?.target || '_self');

        const isExternal =
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('//');
        const isBlank = aTarget === '_blank';

        if (!isModified && !isExternal && !isBlank && href) {
          e.preventDefault();
          if (typeof target.navigate === 'function') {
            target.navigate();
          } else {
            target.emit('click', e as any);
          }
        } else {
          target.emit('click', e as any);
        }
      }) as EventListener);

      ghost.addEventListener('focus', () => {
        if (!target.isFocused) {
          target.focus();
        }
        if (target.onNativeFocus) {
          target.onNativeFocus();
        }
      });

      ghost.addEventListener('blur', () => {
        if (target.isFocused) {
          target.blur();
        }
        if (target.onNativeBlur) {
          target.onNativeBlur();
        }
      });
    } else if (isInputOrTextarea) {
      const inputEl = ghost as HTMLInputElement | HTMLTextAreaElement;

      inputEl.addEventListener('input', () => {
        const val = inputEl.value;
        const cursor = inputEl.selectionStart ?? val.length;
        if (target.onNativeInput) {
          target.onNativeInput(val, cursor);
        }
      });

      inputEl.addEventListener('keydown', ((e: KeyboardEvent) => {
        if (target.onNativeKeyDown) {
          target.onNativeKeyDown(e);
        }
      }) as EventListener);

      inputEl.addEventListener('blur', () => {
        if (target.isFocused) {
          target.blur();
        }
        if (target.onNativeBlur) {
          target.onNativeBlur();
        }
      });

      inputEl.addEventListener('focus', () => {
        if (!target.isFocused) {
          target.focus();
        }
        if (target.onNativeFocus) {
          target.onNativeFocus();
        }
      });

      const syncSelection = () => {
        if (target.onSelectionChange && inputEl.selectionStart !== null && inputEl.selectionEnd !== null) {
          target.onSelectionChange(inputEl.selectionStart, inputEl.selectionEnd);
        }
      };

      inputEl.addEventListener('select', syncSelection);
      inputEl.addEventListener('keyup', syncSelection);
      inputEl.addEventListener('mouseup', syncSelection);
      inputEl.addEventListener('pointerup', syncSelection);
    }

  }

  /**
   * Sets or clears the overlay shield. When shielded, all ghost overlay children
   * ignore pointer events (pointer-events: none !important) so that top-layer dropdowns
   * or modals have exclusive access to canvas pointer events.
   */
  public setShield(enabled: boolean): void {
    if (enabled) {
      this.container.classList.add('canvapps-overlay-shield');
    } else {
      this.container.classList.remove('canvapps-overlay-shield');
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
