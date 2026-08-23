import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

/**
 * Basic container element for layout and visual styling.
 *
 * Supports background colors, rounded borders, shadows, and clipping.
 */
export class UIView extends UIElement {
  constructor(styles: VisualStyles = {}) {
    super(styles);
  }

  /**
   * Draws the container background, shadows, and borders onto the canvas.
   *
   * @param ctx The Canvas 2D rendering context translated to (worldRect.x, worldRect.y).
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) {
      return;
    }

    const { backgroundColor, borderRadius, border, borderColor, borderWidth, boxShadow } =
      this.styles;

    ctx.save();

    // 1. Box shadow pass
    if (boxShadow) {
      ctx.save();
      ctx.shadowColor = boxShadow.color;
      ctx.shadowBlur = boxShadow.blur;
      ctx.shadowOffsetX = boxShadow.offsetX;
      ctx.shadowOffsetY = boxShadow.offsetY;

      // Draw shadow path
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = backgroundColor || '#000000';
      ctx.fill();
      ctx.restore();
    }

    // 2. Background fill pass
    if (backgroundColor && backgroundColor !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
    }

    // 3. Border stroke pass
    const effectiveBorderWidth = borderWidth ?? border?.width ?? 0;
    const effectiveBorderColor = borderColor ?? border?.color;

    if (effectiveBorderWidth > 0 && effectiveBorderColor) {
      ctx.beginPath();
      // Inset border stroke by half width to prevent outer clipping
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

      if (border?.style === 'dashed') {
        ctx.setLineDash([effectiveBorderWidth * 2, effectiveBorderWidth * 2]);
      }

      ctx.stroke();
    }

    ctx.restore();
  }
}
