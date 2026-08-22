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
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  inputType?: 'text' | 'password' | 'email' | 'number';
}

/**
 * High-performance Canvas text input component integrated with Ghost DOM.
 *
 * Supports real-time text editing, native mobile keyboard activation, cursor caret
 * rendering with smooth blinking animation, and focus state styling.
 */
export class UIInput extends UIElement implements GhostTarget {
  public declare styles: InputStyles;

  private value = '';
  private placeholder = '';
  private cursorIndex = 0;
  private isCaretVisible = true;
  private blinkTimer: number | null = null;
  private static measureContext: CanvasRenderingContext2D | null = null;

  constructor(styles: InputStyles = {}) {
    super({
      width: 240,
      height: 42,
      padding: [8, 14],
      backgroundColor: '#1e293b',
      borderWidth: 1,
      borderColor: '#334155',
      borderRadius: 8,
      cursor: 'text',
      color: '#f8fafc',
      placeholderColor: '#64748b',
      cursorColor: '#38bdf8',
      focusBorderColor: '#38bdf8',
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...styles,
    });

    this.value = styles.value ?? '';
    this.placeholder = styles.placeholder ?? '';
    this.cursorIndex = this.value.length;

    // Attach click listener to focus
    this.on('click', () => {
      this.focus();
    });
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

  public onNativeInput(val: string): void {
    this.value = val;
    this.cursorIndex = this.value.length;
    this.markRenderDirty();
  }

  public onNativeKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      this.emit('keydown' as any, e as any);
    }
  }

  public onSelectionChange(start: number): void {
    this.cursorIndex = start;
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
    this.markRenderDirty();
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

    const {
      backgroundColor,
      borderRadius,
      borderWidth = 1,
      borderColor = '#334155',
      focusBorderColor = '#38bdf8',
      color = '#f8fafc',
      placeholderColor = '#64748b',
      cursorColor = '#38bdf8',
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

    // 3. Text / Placeholder rendering
    ctx.font = this.getFontString();
    ctx.textBaseline = 'middle';

    const textY = height / 2;
    const textX = padding.left;
    const displayText =
      this.styles.inputType === 'password' ? '•'.repeat(this.value.length) : this.value;

    if (!displayText && this.placeholder) {
      ctx.fillStyle = placeholderColor;
      ctx.fillText(this.placeholder, textX, textY);
    } else if (displayText) {
      ctx.fillStyle = color;
      ctx.fillText(displayText, textX, textY);
    }

    // 4. Cursor Caret rendering when focused
    if (this.isFocused && this.isCaretVisible) {
      const textBeforeCursor = displayText.slice(0, this.cursorIndex);
      const mCtx = UIInput.getMeasureContext();
      mCtx.font = ctx.font;
      const caretX = textX + mCtx.measureText(textBeforeCursor).width;

      const caretHeight = fontSize * 1.2;
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
}
