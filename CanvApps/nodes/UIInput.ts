import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';
import { GhostTarget } from '../ghost/GhostDOM';

/**
 * Styling options specific to UIInput elements.
 */
export interface InputStyles extends VisualStyles {
  value?: string;
  placeholder?: string;
  placeholderColor?: string;
  cursorColor?: string;
  focusBorderColor?: string;
  selectionColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  inputType?: 'text' | 'password' | 'email' | 'number';
}

/**
 * High-performance Canvas text input component integrated with Ghost DOM.
 *
 * Supports real-time text editing, selection (mouse drag, double click, Cmd/Ctrl+A),
 * keyboard navigation (arrows, home/end, word jumping), native mobile keyboard sync,
 * and adaptive theme colors.
 */
export class UIInput extends UIElement implements GhostTarget {
  public declare styles: InputStyles;

  private value = '';
  private placeholder = '';
  private cursorIndex = 0;
  private selectionStart = 0;
  private selectionEnd = 0;
  private isSelecting = false;
  private isCaretVisible = true;
  private blinkTimer: number | null = null;
  private static measureContext: CanvasRenderingContext2D | null = null;

  constructor(styles: InputStyles = {}) {
    super({
      width: 240,
      height: 42,
      padding: [8, 14],
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 8,
      cursor: 'text',
      color: '#0f172a',
      placeholderColor: '#94a3b8',
      cursorColor: '#2563eb',
      focusBorderColor: '#2563eb',
      selectionColor: 'rgba(37, 99, 235, 0.22)',
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...styles,
    });

    this.value = styles.value ?? '';
    this.placeholder = styles.placeholder ?? '';
    this.cursorIndex = this.value.length;
    this.selectionStart = this.cursorIndex;
    this.selectionEnd = this.cursorIndex;

    this.setupPointerListeners();
  }

  // ---------------------------------------------------------------------------
  // Pointer & Selection Listeners
  // ---------------------------------------------------------------------------

  private setupPointerListeners(): void {
    const onGlobalPointerUp = () => {
      this.isSelecting = false;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', onGlobalPointerUp);
      window.addEventListener('mouseup', onGlobalPointerUp);
    }

    this.on('pointerdown', (e: any) => {
      this.focus();
      const localX = e.x - this.worldRect.x;
      const index = this.getCharIndexFromX(localX);
      this.cursorIndex = index;
      this.selectionStart = index;
      this.selectionEnd = index;
      this.isSelecting = true;
      this.resetCursorBlink();
      this.markRenderDirty();
    });

    this.on('pointermove', (e: any) => {
      if (this.isSelecting) {
        const localX = e.x - this.worldRect.x;
        const index = this.getCharIndexFromX(localX);
        this.selectionEnd = index;
        this.cursorIndex = index;
        this.markRenderDirty();
      }
    });

    this.on('pointerup', () => {
      this.isSelecting = false;
    });

    this.on('dblclick', () => {
      this.selectAll();
    });
  }

  /**
   * Selects all text inside the input.
   */
  public selectAll(): void {
    this.selectionStart = 0;
    this.selectionEnd = this.value.length;
    this.cursorIndex = this.value.length;
    this.resetCursorBlink();
    this.markRenderDirty();
  }

  public clearSelection(): void {
    this.selectionStart = this.cursorIndex;
    this.selectionEnd = this.cursorIndex;
  }

  public hasSelection(): boolean {
    return this.selectionStart !== this.selectionEnd;
  }

  public getSelectionRange(): { start: number; end: number } {
    return {
      start: Math.min(this.selectionStart, this.selectionEnd),
      end: Math.max(this.selectionStart, this.selectionEnd),
    };
  }

  // ---------------------------------------------------------------------------
  // GhostTarget Implementation
  // ---------------------------------------------------------------------------

  public getGhostType(): 'input' {
    return 'input';
  }

  public getValue(): string {
    return this.value;
  }

  public setValue(val: string): void {
    if (this.value !== val) {
      this.value = val;
      this.cursorIndex = Math.min(this.cursorIndex, this.value.length);
      this.clearSelection();
      this.markRenderDirty();
    }
  }

  public getPlaceholder(): string {
    return this.placeholder;
  }

  public setPlaceholder(text: string): this {
    this.placeholder = text;
    this.markRenderDirty();
    return this;
  }

  public getInputType(): string {
    return this.styles.inputType ?? 'text';
  }

  public override measure(availableWidth: number, availableHeight: number): { width: number; height: number } {
    const padding = this.getComputedPadding();
    const fontSize = this.styles.fontSize ?? 14;
    const defaultHeight = fontSize * 1.5 + padding.top + padding.bottom;

    const width =
      typeof this.styles.width === 'number'
        ? this.styles.width
        : typeof this.styles.width === 'string' && this.styles.width.endsWith('%')
        ? (parseFloat(this.styles.width) / 100) * availableWidth
        : Math.min(260, availableWidth);

    const height =
      typeof this.styles.height === 'number'
        ? this.styles.height
        : typeof this.styles.height === 'string' && this.styles.height.endsWith('%')
        ? (parseFloat(this.styles.height) / 100) * availableHeight
        : defaultHeight;

    return { width, height };
  }

  public onNativeInput(val: string, cursorIndex?: number): void {
    this.value = val;
    if (cursorIndex !== undefined) {
      this.cursorIndex = cursorIndex;
      this.selectionStart = cursorIndex;
      this.selectionEnd = cursorIndex;
    } else {
      this.cursorIndex = Math.min(this.cursorIndex, this.value.length);
    }
    this.clearSelection();
    this.resetCursorBlink();
    this.markRenderDirty();
    this.emit('input' as any, { target: this, currentTarget: this, value: val } as any);
  }

  public onNativeKeyDown(e: KeyboardEvent): void {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    // 1. Select All: Cmd+A / Ctrl+A
    if (isCmdOrCtrl && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      this.selectAll();
      return;
    }

    // 2. Backspace / Delete with selection
    if (e.key === 'Backspace' && this.hasSelection()) {
      e.preventDefault();
      const { start, end } = this.getSelectionRange();
      this.value = this.value.slice(0, start) + this.value.slice(end);
      this.cursorIndex = start;
      this.clearSelection();
      this.markRenderDirty();
      this.emit('input' as any, { target: this, currentTarget: this, value: this.value } as any);
      return;
    }

    if (e.key === 'Enter') {
      this.emit('submit' as any, { target: this, currentTarget: this, value: this.value } as any);
      this.emit('keydown' as any, e as any);
    }
  }

  public onSelectionChange(start: number, end = start): void {
    if (this.isSelecting) {
      return;
    }
    this.selectionStart = start;
    this.selectionEnd = end;
    this.cursorIndex = end;
    this.resetCursorBlink();
    this.markRenderDirty();
  }

  public override focus(): void {
    super.focus();
    this.startCursorBlink();
    this.markRenderDirty();
  }

  public override blur(): void {
    super.blur();
    this.stopCursorBlink();
    this.isSelecting = false;
    this.clearSelection();
    this.markRenderDirty();
  }

  private resetCursorBlink(): void {
    this.isCaretVisible = true;
    this.startCursorBlink();
  }

  private startCursorBlink(): void {
    this.stopCursorBlink();
    this.isCaretVisible = true;
    if (typeof window !== 'undefined') {
      this.blinkTimer = window.setInterval(() => {
        this.isCaretVisible = !this.isCaretVisible;
        this.markRenderDirty();
      }, 530);
    }
  }

  private stopCursorBlink(): void {
    if (this.blinkTimer !== null) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
    this.isCaretVisible = false;
  }

  private getCharIndexFromX(localX: number): number {
    const padding = this.getComputedPadding();
    const targetX = localX - padding.left;
    if (targetX <= 0) {
      return 0;
    }

    const ctx = UIInput.getMeasureContext();
    ctx.font = this.getFontString();

    const text = this.value;
    let prevWidth = 0;

    for (let i = 1; i <= text.length; i++) {
      const currentWidth = ctx.measureText(text.slice(0, i)).width;
      const midpoint = prevWidth + (currentWidth - prevWidth) / 2;

      if (targetX < midpoint) {
        return i - 1;
      }
      prevWidth = currentWidth;
    }

    return text.length;
  }

  private static getMeasureContext(): CanvasRenderingContext2D {
    if (!this.measureContext) {
      const canvas = document.createElement('canvas');
      this.measureContext = canvas.getContext('2d')!;
    }
    return this.measureContext;
  }

  private getFontString(): string {
    const size = this.styles.fontSize ?? 14;
    const family = this.styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
    const weight = this.styles.fontWeight ?? 'normal';
    return `${weight} ${size}px ${family}`;
  }

  // ---------------------------------------------------------------------------
  // Canvas Rendering
  // ---------------------------------------------------------------------------

  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) {
      return;
    }

    const isDarkBg = this.isDarkBackground(this.styles.backgroundColor);

    const {
      backgroundColor,
      borderRadius,
      borderWidth = 1,
      borderColor = isDarkBg ? '#334155' : '#cbd5e1',
      focusBorderColor = isDarkBg ? '#38bdf8' : '#2563eb',
      color = isDarkBg ? '#f8fafc' : '#0f172a',
      placeholderColor = isDarkBg ? '#64748b' : '#94a3b8',
      cursorColor = isDarkBg ? '#38bdf8' : '#2563eb',
      selectionColor = isDarkBg ? 'rgba(56, 189, 248, 0.25)' : 'rgba(37, 99, 235, 0.22)',
      fontSize = 14,
    } = this.styles;

    const padding = this.getComputedPadding();

    ctx.save();

    // 1. Background
    if (backgroundColor && backgroundColor !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
    }

    // 2. Border (active/focus ring)
    const effectiveBorderColor = this.isFocused ? focusBorderColor : borderColor;
    const effectiveBorderWidth = this.isFocused ? Math.max(1.5, borderWidth) : borderWidth;

    if (effectiveBorderWidth > 0 && effectiveBorderColor) {
      ctx.beginPath();
      const halfW = effectiveBorderWidth / 2;
      this.applyPath(
        ctx,
        halfW,
        halfW,
        Math.max(0, width - effectiveBorderWidth),
        Math.max(0, height - effectiveBorderWidth),
        borderRadius
      );
      ctx.strokeStyle = effectiveBorderColor;
      ctx.lineWidth = effectiveBorderWidth;
      ctx.stroke();
    }

    // 3. Typography & Selection
    ctx.font = this.getFontString();
    ctx.textBaseline = 'middle';

    const textY = height / 2;
    const textX = padding.left;
    const displayText =
      this.styles.inputType === 'password' ? '•'.repeat(this.value.length) : this.value;

    const mCtx = UIInput.getMeasureContext();
    mCtx.font = ctx.font;

    // Draw Selection Highlight Rectangle
    if (this.isFocused && this.hasSelection() && displayText) {
      const { start, end } = this.getSelectionRange();
      const selStartX = textX + mCtx.measureText(displayText.slice(0, start)).width;
      const selEndX = textX + mCtx.measureText(displayText.slice(0, end)).width;
      const selW = selEndX - selStartX;
      const selH = fontSize * 1.5;

      ctx.fillStyle = selectionColor;
      ctx.fillRect(selStartX, textY - selH / 2, selW, selH);
    }

    // Draw Placeholder or Text
    if (!displayText && this.placeholder) {
      ctx.fillStyle = placeholderColor;
      ctx.fillText(this.placeholder, textX, textY);
    } else if (displayText) {
      ctx.fillStyle = color;
      ctx.fillText(displayText, textX, textY);
    }

    // 4. Cursor Caret rendering when focused
    if (this.isFocused && this.isCaretVisible && !this.hasSelection()) {
      const textBeforeCursor = displayText.slice(0, this.cursorIndex);
      const caretX = textX + mCtx.measureText(textBeforeCursor).width;

      const caretHeight = fontSize * 1.25;
      const caretTop = textY - caretHeight / 2;

      ctx.beginPath();
      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = 1.5;
      ctx.moveTo(caretX, caretTop);
      ctx.lineTo(caretX, caretTop + caretHeight);
      ctx.stroke();
    }

    ctx.restore();
  }

  private isDarkBackground(colorStr?: string): boolean {
    if (!colorStr || colorStr === 'transparent') {
      return false;
    }
    if (colorStr.startsWith('#')) {
      const hex = colorStr.replace('#', '');
      let r = 255;
      let g = 255;
      let b = 255;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
      return (r * 299 + g * 587 + b * 114) / 1000 < 140;
    }
    return false;
  }
}
