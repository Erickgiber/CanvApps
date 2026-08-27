import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

/**
 * Styling and configuration options for UISlider elements.
 */
export interface SliderStyles extends VisualStyles {
  min?: number;
  max?: number;
  value?: number;
  step?: number;
  trackHeight?: number;
  trackColor?: string;
  progressColor?: string;
  thumbColor?: string;
  thumbBorderColor?: string;
  thumbBorderWidth?: number;
  thumbRadius?: number;
  thumbHoverRadius?: number;
  showThumb?: boolean | 'hover' | 'always';
  disabled?: boolean;
}

/**
 * High-performance Canvas 2D interactive Range Slider & Progress Bar component.
 *
 * Supports touch & mouse dragging, click-to-seek, continuous/discrete stepping,
 * customizable track/progress gradients, and reactive event emissions (@input, @change, @seek).
 */
export class UISlider extends UIElement {
  public declare styles: SliderStyles;

  private isDragging = false;
  private min = 0;
  private max = 100;
  private value = 0;
  private step = 0; // 0 = continuous

  constructor(styles: SliderStyles = {}) {
    super({
      width: 200,
      height: 28,
      cursor: 'pointer',
      trackHeight: 5,
      trackColor: '#334155',
      progressColor: '#1db954',
      thumbColor: '#ffffff',
      thumbBorderColor: '#1db954',
      thumbBorderWidth: 2,
      thumbRadius: 7,
      thumbHoverRadius: 9,
      showThumb: 'always',
      min: 0,
      max: 100,
      value: 0,
      ...styles,
    });

    this.min = styles.min ?? 0;
    this.max = styles.max ?? 100;
    this.value = Math.max(this.min, Math.min(this.max, styles.value ?? 0));
    this.step = styles.step ?? 0;

    this.setupPointerListeners();
  }

  public getValue(): number {
    return this.value;
  }

  public setValue(val: number): this {
    const clamped = Math.max(this.min, Math.min(this.max, Number(val) || 0));
    const finalVal = this.step > 0 ? Math.round(clamped / this.step) * this.step : clamped;

    if (this.value !== finalVal) {
      this.value = finalVal;
      this.styles.value = finalVal;
      this.markRenderDirty();
    }
    return this;
  }

  public getMin(): number {
    return this.min;
  }

  public setMin(min: number): this {
    this.min = Number(min) || 0;
    this.styles.min = this.min;
    this.setValue(this.value);
    return this;
  }

  public getMax(): number {
    return this.max;
  }

  public setMax(max: number): this {
    this.max = Number(max) || 100;
    this.styles.max = this.max;
    this.setValue(this.value);
    return this;
  }

  public setProgressColor(color: string): this {
    this.styles.progressColor = color;
    this.markRenderDirty();
    return this;
  }

  public setTrackColor(color: string): this {
    this.styles.trackColor = color;
    this.markRenderDirty();
    return this;
  }

  public setThumbColor(color: string): this {
    this.styles.thumbColor = color;
    this.markRenderDirty();
    return this;
  }

  public setDisabled(disabled: boolean): this {
    this.styles.disabled = Boolean(disabled);
    this.markRenderDirty();
    return this;
  }

  public override setStyle(styles: Partial<SliderStyles>): this {
    super.setStyle(styles);
    if (styles.min !== undefined) this.min = styles.min;
    if (styles.max !== undefined) this.max = styles.max;
    if (styles.step !== undefined) this.step = styles.step;
    if (styles.value !== undefined && !this.isDragging) {
      this.setValue(styles.value);
    }
    return this;
  }

  private setupPointerListeners(): void {
    const onGlobalPointerUp = (e: PointerEvent | MouseEvent) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.markRenderDirty();
        this.emit('change' as any, {
          target: this,
          currentTarget: this,
          value: this.value,
          x: (e as any).clientX,
          y: (e as any).clientY,
        });
      }
    };

    const onGlobalPointerMove = (e: PointerEvent | MouseEvent) => {
      if (this.isDragging && !this.styles.disabled) {
        this.updateValueFromClientX((e as any).clientX ?? (e as any).x);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', onGlobalPointerUp);
      window.addEventListener('mouseup', onGlobalPointerUp);
      window.addEventListener('touchend', onGlobalPointerUp as any);
      window.addEventListener('pointermove', onGlobalPointerMove);
      window.addEventListener('mousemove', onGlobalPointerMove);
      window.addEventListener('touchmove', ((te: TouchEvent) => {
        if (this.isDragging && te.touches.length > 0) {
          this.updateValueFromClientX(te.touches[0].clientX);
        }
      }) as any);
    }

    this.on('pointerdown', (e: any) => {
      if (this.styles.disabled) return;
      this.isDragging = true;
      const clientX = e.clientX ?? e.x;
      this.updateValueFromClientX(clientX);
      this.markRenderDirty();
    });
  }

  private updateValueFromClientX(clientX: number): void {
    if (this.worldRect.width <= 0) return;

    const thumbR = this.styles.thumbRadius ?? 7;
    const padding = this.getComputedPadding();
    const trackStartX = this.worldRect.x + padding.left + thumbR;
    const trackEndX = this.worldRect.x + this.worldRect.width - padding.right - thumbR;
    const trackWidth = Math.max(1, trackEndX - trackStartX);

    const relX = Math.max(0, Math.min(trackWidth, clientX - trackStartX));
    const ratio = relX / trackWidth;
    const rawVal = this.min + ratio * (this.max - this.min);
    const steppedVal = this.step > 0 ? Math.round(rawVal / this.step) * this.step : rawVal;
    const clampedVal = Math.max(this.min, Math.min(this.max, steppedVal));

    if (this.value !== clampedVal) {
      this.value = clampedVal;
      this.styles.value = clampedVal;
      this.markRenderDirty();

      const payload = {
        target: this,
        currentTarget: this,
        value: this.value,
        ratio,
      };

      this.emit('input' as any, payload as any);
      this.emit('seek' as any, payload as any);
    }
  }

  public override measure(availableWidth: number, availableHeight: number): { width: number; height: number } {
    const padding = this.getComputedPadding();
    const defaultH = 28 + padding.top + padding.bottom;

    const width =
      typeof this.styles.width === 'number'
        ? this.styles.width
        : typeof this.styles.width === 'string' && this.styles.width.endsWith('%')
        ? (parseFloat(this.styles.width) / 100) * availableWidth
        : Math.min(220, availableWidth);

    const height =
      typeof this.styles.height === 'number'
        ? this.styles.height
        : typeof this.styles.height === 'string' && this.styles.height.endsWith('%')
        ? (parseFloat(this.styles.height) / 100) * availableHeight
        : defaultH;

    return { width, height };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) return;

    const {
      trackHeight = 5,
      trackColor = '#334155',
      progressColor = '#1db954',
      thumbColor = '#ffffff',
      thumbBorderColor = '#1db954',
      thumbBorderWidth = 2,
      thumbRadius = 7,
      thumbHoverRadius = 9,
      showThumb = 'always',
      disabled = false,
      borderRadius,
      backgroundColor,
    } = this.styles;

    const padding = this.getComputedPadding();

    ctx.save();

    // Background container fill if provided
    if (backgroundColor && backgroundColor !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
    }

    const currentRadius = this.isDragging || this.isHovered ? thumbHoverRadius : thumbRadius;
    const startX = padding.left + thumbHoverRadius;
    const endX = width - padding.right - thumbHoverRadius;
    const trackW = Math.max(1, endX - startX);
    const centerY = height / 2;
    const trackHalfH = trackHeight / 2;

    const range = this.max - this.min;
    const ratio = range > 0 ? Math.max(0, Math.min(1, (this.value - this.min) / range)) : 0;
    const currentProgressX = startX + ratio * trackW;

    ctx.beginPath();
    ctx.roundRect(startX, centerY - trackHalfH, trackW, trackHeight, trackHalfH);
    ctx.fillStyle = disabled ? '#1e293b' : trackColor;
    ctx.fill();

    if (ratio > 0) {
      ctx.beginPath();
      ctx.roundRect(startX, centerY - trackHalfH, Math.max(trackHeight, currentProgressX - startX), trackHeight, trackHalfH);
      ctx.fillStyle = disabled ? '#64748b' : (this.isHovered || this.isDragging ? '#22c55e' : progressColor);
      ctx.fill();
    }

    const shouldDrawThumb =
      showThumb === 'always' ||
      showThumb === true ||
      (showThumb === 'hover' && (this.isHovered || this.isDragging));

    if (shouldDrawThumb && !disabled) {
      ctx.save();

      // Thumb Outer Glow / Shadow when active or hovered
      if (this.isDragging || this.isHovered) {
        ctx.shadowColor = progressColor;
        ctx.shadowBlur = 10;
      }

      ctx.beginPath();
      ctx.arc(currentProgressX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = thumbColor;
      ctx.fill();

      if (thumbBorderWidth > 0 && thumbBorderColor) {
        ctx.strokeStyle = this.isDragging || this.isHovered ? '#ffffff' : thumbBorderColor;
        ctx.lineWidth = thumbBorderWidth;
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
