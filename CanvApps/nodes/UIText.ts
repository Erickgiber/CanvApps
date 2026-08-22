import { UIElement } from '../core/UIElement';
import { Size } from '../types/geometry';
import { VisualStyles } from '../types/style';
import { GhostTarget } from '../ghost/GhostDOM';

/**
 * Text node typography and formatting styles.
 */
export interface TextStyles extends VisualStyles {
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  wordWrap?: boolean;
  maxLines?: number;
  textOverflow?: 'clip' | 'ellipsis';
  selectable?: boolean;
}

/**
 * UI element for rendering multiline, wrapped, and aligned typography on Canvas 2D.
 *
 * Implements GhostTarget for full browser text selection, copy/paste, and screen reader access.
 */
export class UIText extends UIElement implements GhostTarget {
  public declare styles: TextStyles;

  private static measureContext: CanvasRenderingContext2D | null = null;
  private cachedLines: string[] = [];
  private cachedAvailableWidth = -1;
  private cachedText = '';

  constructor(text = '', styles: TextStyles = {}) {
    super(styles);
    this.styles.text = text;
  }

  public getGhostType(): 'text' {
    return 'text';
  }

  public getText(): string {
    return this.styles.text ?? '';
  }

  public isSelectable(): boolean {
    return this.styles.selectable !== false;
  }

  /**
   * Updates text content and triggers layout recalculation.
   *
   * @param text New text content.
   */
  public setText(text: string): this {
    if (this.styles.text !== text) {
      this.styles.text = text;
      this.markLayoutDirty();
    }
    return this;
  }

  /**
   * Retrieves or initializes a singleton 2D context for offscreen typography measurement.
   */
  private static getMeasureContext(): CanvasRenderingContext2D {
    if (!this.measureContext) {
      const canvas = document.createElement('canvas');
      this.measureContext = canvas.getContext('2d')!;
    }
    return this.measureContext;
  }

  /**
   * Constructs the CSS font descriptor string.
   */
  private getFontString(): string {
    const style = this.styles.fontStyle ?? 'normal';
    const weight = this.styles.fontWeight ?? 'normal';
    const size = this.styles.fontSize ?? 16;
    const family = this.styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
    return `${style} ${weight} ${size}px ${family}`;
  }

  /**
   * Breaks text into lines fitting within the available width constraint.
   */
  private computeLines(availableWidth: number): string[] {
    const text = this.styles.text ?? '';
    if (!text) {
      return [];
    }

    if (
      this.cachedLines.length > 0 &&
      this.cachedAvailableWidth === availableWidth &&
      this.cachedText === text
    ) {
      return this.cachedLines;
    }

    const wordWrap = this.styles.wordWrap ?? true;
    const ctx = UIText.getMeasureContext();
    ctx.font = this.getFontString();

    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!wordWrap || availableWidth <= 0) {
        lines.push(paragraph);
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > availableWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    // Apply maxLines and ellipsis if needed
    const maxLines = this.styles.maxLines;
    if (maxLines && maxLines > 0 && lines.length > maxLines) {
      const trimmed = lines.slice(0, maxLines);
      if (this.styles.textOverflow === 'ellipsis') {
        const lastIndex = maxLines - 1;
        let lastLine = trimmed[lastIndex];
        while (lastLine.length > 0 && ctx.measureText(`${lastLine}...`).width > availableWidth) {
          lastLine = lastLine.slice(0, -1);
        }
        trimmed[lastIndex] = `${lastLine}...`;
      }
      this.cachedLines = trimmed;
    } else {
      this.cachedLines = lines;
    }

    this.cachedAvailableWidth = availableWidth;
    this.cachedText = text;
    return this.cachedLines;
  }

  /**
   * Measures intrinsic text dimensions given maximum constraints.
   */
  public override measure(availableWidth: number, _availableHeight = 0): Size {
    const text = this.styles.text ?? '';
    if (!text) {
      return { width: 0, height: 0 };
    }

    const padding = this.getComputedPadding();
    const innerAvailableWidth = Math.max(0, availableWidth - padding.left - padding.right);

    const ctx = UIText.getMeasureContext();
    ctx.font = this.getFontString();

    const lines = this.computeLines(innerAvailableWidth);
    const fontSize = this.styles.fontSize ?? 16;
    const lineSpacing = (this.styles.lineHeight ?? 1.2) * fontSize;

    let maxLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) {
        maxLineWidth = w;
      }
    }

    const totalHeight = Math.max(fontSize, lines.length * lineSpacing);

    return {
      width: maxLineWidth + padding.left + padding.right,
      height: totalHeight + padding.top + padding.bottom,
    };
  }

  /**
   * Draws formatted text lines onto the canvas context.
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    const text = this.styles.text ?? '';
    if (!text) {
      return;
    }

    const padding = this.getComputedPadding();
    const innerWidth = Math.max(0, this.layoutRect.width - padding.left - padding.right);
    const lines = this.computeLines(innerWidth);

    if (lines.length === 0) {
      return;
    }

    const fontSize = this.styles.fontSize ?? 16;
    const lineHeight = (this.styles.lineHeight ?? 1.2) * fontSize;
    const textAlign = this.styles.textAlign ?? 'left';

    ctx.save();
    ctx.font = this.getFontString();
    ctx.fillStyle = this.styles.color ?? '#000000';
    ctx.textBaseline = 'middle';

    let x = padding.left;
    if (textAlign === 'center') {
      x = padding.left + innerWidth / 2;
      ctx.textAlign = 'center';
    } else if (textAlign === 'right') {
      x = padding.left + innerWidth;
      ctx.textAlign = 'right';
    } else {
      ctx.textAlign = 'left';
    }

    const totalLinesHeight = lines.length * lineHeight;
    const innerHeight = Math.max(0, this.layoutRect.height - padding.top - padding.bottom);
    const verticalStart = padding.top + Math.max(0, (innerHeight - totalLinesHeight) / 2);
    const halfLine = lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      const y = verticalStart + i * lineHeight + halfLine;
      ctx.fillText(lines[i], x, y);
    }

    ctx.restore();
  }
}
