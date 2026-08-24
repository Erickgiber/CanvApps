import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

/**
 * Visual styling specific to UIButton.
 */
export interface ButtonStyles extends VisualStyles {
  label?: string;
  labelColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  hoverBackgroundColor?: string;
  activeBackgroundColor?: string;
  disabled?: boolean;
}

/**
 * Interactive button component supporting hover, active/pressed, and disabled states.
 */
export class UIButton extends UIElement {
  public declare styles: ButtonStyles;

  constructor(label = '', styles: ButtonStyles = {}) {
    const isIconOrFixed = typeof styles.width === 'number' && typeof styles.height === 'number';
    const defaultPadding: [number, number] = isIconOrFixed ? [0, 0] : [10, 20];

    super({
      padding: defaultPadding,
      backgroundColor: '#0284c7',
      hoverBackgroundColor: '#0369a1',
      activeBackgroundColor: '#075985',
      borderRadius: 8,
      cursor: 'pointer',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '600',
      ...styles,
    });

    this.styles.label = label || styles.label || '';
  }

  /**
   * Updates button label text.
   */
  public setLabel(text: string): this {
    if (this.styles.label !== text) {
      this.styles.label = text;
      if (typeof this.styles.width === 'number' && typeof this.styles.height === 'number') {
        this.markRenderDirty();
      } else {
        this.markLayoutDirty();
      }
    }
    return this;
  }

  public override measure(availableWidth: number, availableHeight: number): { width: number; height: number } {
    const padding = this.getComputedPadding();
    const fontSize = this.styles.fontSize ?? 14;
    const label = this.styles.label ?? '';

    // Measure text width using an offscreen canvas
    let textWidth = 0;
    if (label && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const weight = this.styles.fontWeight ?? '600';
      const family = this.styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
      ctx.font = `${weight} ${fontSize}px ${family}`;
      textWidth = ctx.measureText(label).width;
    }

    const contentHeight = fontSize * 1.3;

    const width =
      typeof this.styles.width === 'number'
        ? this.styles.width
        : typeof this.styles.width === 'string' && this.styles.width.endsWith('%')
        ? (parseFloat(this.styles.width) / 100) * availableWidth
        : textWidth + padding.left + padding.right;

    const height =
      typeof this.styles.height === 'number'
        ? this.styles.height
        : typeof this.styles.height === 'string' && this.styles.height.endsWith('%')
        ? (parseFloat(this.styles.height) / 100) * availableHeight
        : contentHeight + padding.top + padding.bottom;

    return { width, height };
  }

  /**
   * Draws the button background, border, and centered label.
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) {
      return;
    }

    const {
      backgroundColor = '#0284c7',
      hoverBackgroundColor = '#0369a1',
      activeBackgroundColor = '#075985',
      borderRadius,
      boxShadow,
      borderWidth,
      borderColor,
      disabled,
      label = '',
      labelColor,
      color,
      fontSize = 14,
      fontWeight = '600',
      fontFamily = 'system-ui, -apple-system, sans-serif',
    } = this.styles;

    let currentBg = backgroundColor;
    if (disabled) {
      currentBg = '#475569';
    } else if (this.isPressed && activeBackgroundColor) {
      currentBg = activeBackgroundColor;
    } else if (this.isHovered && hoverBackgroundColor) {
      currentBg = hoverBackgroundColor;
    }

    ctx.save();

    // 1. Box shadow
    if (boxShadow && !this.isPressed && !disabled) {
      ctx.save();
      ctx.shadowColor = boxShadow.color;
      ctx.shadowBlur = boxShadow.blur;
      ctx.shadowOffsetX = boxShadow.offsetX;
      ctx.shadowOffsetY = boxShadow.offsetY;

      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = currentBg;
      ctx.fill();
      ctx.restore();
    }

    // 2. Background
    if (currentBg && currentBg !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = currentBg;
      ctx.fill();
    }

    // 3. Border
    if (borderWidth && borderWidth > 0 && borderColor) {
      ctx.beginPath();
      const half = borderWidth / 2;
      this.applyPath(
        ctx,
        half,
        half,
        Math.max(0, width - borderWidth),
        Math.max(0, height - borderWidth),
        borderRadius
      );
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }

    // 4. Center Label Text / Icon
    if (label) {
      const textColor = labelColor ?? color ?? '#ffffff';
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, height / 2);
    }

    ctx.restore();
  }
}
