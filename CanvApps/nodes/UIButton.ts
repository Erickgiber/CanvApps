import { UIElement } from '../core/UIElement';
import { UIText } from './UIText';
import { VisualStyles } from '../types/style';

/**
 * Visual styling specific to UIButton.
 */
export interface ButtonStyles extends VisualStyles {
  label?: string;
  labelColor?: string;
  fontSize?: number;
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
  private labelNode: UIText | null = null;

  constructor(label = '', styles: ButtonStyles = {}) {
    super({
      padding: [10, 20],
      backgroundColor: '#0284c7',
      hoverBackgroundColor: '#0369a1',
      activeBackgroundColor: '#075985',
      borderRadius: 8,
      cursor: 'pointer',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...styles,
    });

    this.styles.label = label;

    if (label) {
      this.labelNode = new UIText(label, {
        fontSize: styles.fontSize ?? 14,
        fontWeight: styles.fontWeight ?? '600',
        color: styles.labelColor ?? '#ffffff',
        textAlign: 'center',
      });
      this.addChild(this.labelNode);
    }
  }

  /**
   * Updates button label text.
   */
  public setLabel(text: string): this {
    this.styles.label = text;
    if (this.labelNode) {
      this.labelNode.setText(text);
    } else {
      this.labelNode = new UIText(text, {
        fontSize: this.styles.fontSize ?? 14,
        fontWeight: this.styles.fontWeight ?? '600',
        color: this.styles.labelColor ?? '#ffffff',
        textAlign: 'center',
      });
      this.addChild(this.labelNode);
    }
    return this;
  }

  /**
   * Draws the button background and border with hover and pressed transitions.
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

    // Box shadow
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

    // Background
    if (currentBg && currentBg !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = currentBg;
      ctx.fill();
    }

    // Border
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

    ctx.restore();
  }
}
