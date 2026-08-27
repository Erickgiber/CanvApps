import { UIElement } from '../core/UIElement';
import { Size } from '../types/geometry';
import { VisualStyles } from '../types/style';
import { GhostTarget } from '../ghost/GhostDOM';
import { useRouter } from '../router/Router';

/**
 * Supported underline display modes for UIAnchor.
 */
export type AnchorUnderline = 'always' | 'hover' | 'never' | boolean;

/**
 * Target browsing context for hyperlink navigation.
 */
export type AnchorTarget = '_self' | '_blank' | '_parent' | '_top' | string;

/**
 * Styling and configuration options specific to UIAnchor elements.
 */
export interface AnchorStyles extends VisualStyles {
  href?: string;
  target?: AnchorTarget;
  rel?: string;
  download?: string | boolean;
  text?: string;
  label?: string;
  color?: string;
  hoverColor?: string;
  activeColor?: string;
  visitedColor?: string;
  hoverBackgroundColor?: string;
  activeBackgroundColor?: string;
  underline?: AnchorUnderline;
  underlineOffset?: number;
  underlineThickness?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  disabled?: boolean;
  replace?: boolean;
  trackVisited?: boolean;
  keepColor?: boolean | string;
  disableHoverColor?: boolean | string;
}

/**
 * Declarative, high-performance Canvas Hyperlink / Anchor node.
 *
 * Implements GhostTarget for full browser integration:
 * - Native right-click context menu ("Open link in new tab", "Copy link address")
 * - Native browser bottom-left URL preview bar on hover
 * - Built-in reactive SPA Router navigation for internal routes
 * - Visual state transitions: hover, active/pressed, visited, and underline modes
 * - Assistive accessibility (screen readers identifying navigation landmarks)
 */
export class UIAnchor extends UIElement implements GhostTarget {
  public declare styles: AnchorStyles;
  public isVisited = false;

  private static measureContext: CanvasRenderingContext2D | null = null;

  constructor(
    textOrStyles: string | AnchorStyles = '',
    stylesOrHref: AnchorStyles | string = {},
    extraStyles: AnchorStyles = {}
  ) {
    let resolvedText = '';
    let resolvedHref = '';
    let mergedStyles: AnchorStyles = {};

    if (typeof textOrStyles === 'string') {
      resolvedText = textOrStyles;
      if (typeof stylesOrHref === 'string') {
        resolvedHref = stylesOrHref;
        mergedStyles = { ...extraStyles };
      } else {
        mergedStyles = { ...stylesOrHref };
      }
    } else {
      mergedStyles = { ...textOrStyles };
    }

    super({
      cursor: 'pointer',
      color: '#1a73e8',
      underline: 'hover',
      underlineOffset: 2,
      underlineThickness: 1,
      fontSize: 14,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 'normal',
      target: '_self',
      padding: [0, 0],
      ...mergedStyles,
    });

    if (resolvedText) {
      this.styles.text = resolvedText;
    }
    if (resolvedHref) {
      this.styles.href = resolvedHref;
    }

    if (this.styles.disabled) {
      this.styles.cursor = 'not-allowed';
    }

    this.setupClickListener();
  }

  /**
   * Sets up automatic click navigation listener.
   */
  private setupClickListener(): void {
    this.on('click', (e: any) => {
      if (this.styles.disabled) {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        return;
      }

      if (e && e.defaultPrevented) {
        return;
      }

      this.navigate();
    });
  }

  // Getters & Setters

  public getGhostType(): 'anchor' {
    return 'anchor';
  }

  public getHref(): string {
    return this.styles.href ?? '';
  }

  public setHref(href: string): this {
    if (this.styles.href !== href) {
      this.styles.href = href;
      this.markRenderDirty();
    }
    return this;
  }

  public getText(): string {
    return this.styles.text ?? this.styles.label ?? '';
  }

  public setText(text: string): this {
    if (this.styles.text !== text) {
      this.styles.text = text;
      this.styles.label = text;
      this.markLayoutDirty();
    }
    return this;
  }

  public getLabel(): string {
    return this.getText();
  }

  public setLabel(label: string): this {
    return this.setText(label);
  }

  public getTarget(): AnchorTarget {
    return this.styles.target ?? '_self';
  }

  public setTarget(target: AnchorTarget): this {
    if (this.styles.target !== target) {
      this.styles.target = target;
      this.markRenderDirty();
    }
    return this;
  }

  public getRel(): string {
    return this.styles.rel ?? (this.getTarget() === '_blank' ? 'noopener noreferrer' : '');
  }

  public setRel(rel: string): this {
    this.styles.rel = rel;
    this.markRenderDirty();
    return this;
  }

  public getUnderline(): AnchorUnderline {
    return this.styles.underline ?? 'hover';
  }

  public setUnderline(underline: AnchorUnderline): this {
    if (this.styles.underline !== underline) {
      this.styles.underline = underline;
      this.markRenderDirty();
    }
    return this;
  }

  public isDisabled(): boolean {
    return Boolean(this.styles.disabled);
  }

  public setDisabled(disabled: boolean): this {
    this.styles.disabled = disabled;
    this.styles.cursor = disabled ? 'not-allowed' : 'pointer';
    this.markRenderDirty();
    return this;
  }

  public isSelectable(): boolean {
    return false;
  }

  // Navigation Execution

  /**
   * Executes navigation according to href target, router configuration, or external URL.
   */
  public navigate(): void {
    if (this.styles.disabled) {
      return;
    }

    const href = this.getHref();
    if (!href) {
      return;
    }

    this.isVisited = true;
    this.markRenderDirty();

    const target = this.getTarget();
    const rel = this.getRel();
    const isBlank = target === '_blank';
    const isExternal =
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('//');

    if (isBlank) {
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(href, '_blank', rel || 'noopener noreferrer');
      }
      return;
    }

    if (isExternal) {
      if (typeof window !== 'undefined') {
        if (target && target !== '_self' && typeof window.open === 'function') {
          window.open(href, target, rel || undefined);
        } else if (window.location) {
          window.location.href = href;
        }
      }
      return;
    }

    // Dispatch global SPA navigation event handled centrally by session router
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvapps:navigate', {
        detail: { href, replace: Boolean(this.styles.replace) },
      }));
    }

    // Also notify activeRouter if routes are registered
    try {
      const router = useRouter();
      if (router && (router as any).routes?.length > 0 && typeof router.navigate === 'function') {
        router.navigate(href, { replace: Boolean(this.styles.replace) });
      }
    } catch {}
  }

  // Layout & Measurement

  private static getMeasureContext(): CanvasRenderingContext2D {
    if (!this.measureContext) {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        this.measureContext = canvas.getContext('2d')!;
      } else {
        // Dummy fallback for headless testing without DOM canvas
        this.measureContext = {
          font: '',
          measureText: (str: string) => ({ width: str.length * 8 }),
        } as any;
      }
    }
    return this.measureContext!;
  }

  private getFontString(): string {
    const style = this.styles.fontStyle ?? 'normal';
    const weight = this.styles.fontWeight ?? 'normal';
    const size = this.styles.fontSize ?? 14;
    const family = this.styles.fontFamily ?? 'system-ui, -apple-system, sans-serif';
    return `${style} ${weight} ${size}px ${family}`;
  }

  public override measure(availableWidth: number, availableHeight: number): Size {
    const padding = this.getComputedPadding();
    const text = this.getText();
    const fontSize = this.styles.fontSize ?? 14;
    const rawLineHeight = this.styles.lineHeight ?? 1.3;
    const lineHeight = rawLineHeight > 3 ? rawLineHeight : rawLineHeight * fontSize;

    let textWidth = 0;
    if (text) {
      const ctx = UIAnchor.getMeasureContext();
      ctx.font = this.getFontString();
      textWidth = ctx.measureText(text).width;
    }

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
        : Math.max(fontSize, lineHeight) + padding.top + padding.bottom;

    return { width, height };
  }

  // Canvas 2D Rendering

  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) {
      return;
    }

    const {
      backgroundColor,
      hoverBackgroundColor,
      activeBackgroundColor,
      borderRadius,
      borderWidth,
      borderColor,
      boxShadow,
      disabled,
      color = '#1a73e8',
      hoverColor = this.styles.hoverColor,
      activeColor = this.styles.activeColor,
      visitedColor = this.styles.visitedColor,
      fontSize = 14,
      textAlign = 'left',
      underline = 'hover',
      underlineOffset = 2,
      underlineThickness = 1,
    } = this.styles;

    const text = this.getText();
    const padding = this.getComputedPadding();

    let activeBgColor = backgroundColor;
    if (!disabled) {
      if (this.isPressed && activeBackgroundColor) {
        activeBgColor = activeBackgroundColor;
      } else if (this.isHovered && hoverBackgroundColor) {
        activeBgColor = hoverBackgroundColor;
      }
    }

    ctx.save();

    if (boxShadow && !this.isPressed && !disabled) {
      ctx.save();
      ctx.shadowColor = boxShadow.color;
      ctx.shadowBlur = boxShadow.blur;
      ctx.shadowOffsetX = boxShadow.offsetX;
      ctx.shadowOffsetY = boxShadow.offsetY;

      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = activeBgColor || 'transparent';
      ctx.fill();
      ctx.restore();
    }

    if (activeBgColor && activeBgColor !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = activeBgColor;
      ctx.fill();
    }

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

    const shouldKeepColor = 
      this.styles.keepColor === true || 
      this.styles.keepColor === 'true' || 
      this.styles.disableHoverColor === true || 
      this.styles.disableHoverColor === 'true';

    let activeTextColor = color;
    if (disabled) {
      activeTextColor = '#94a3b8';
    } else if (shouldKeepColor) {
      activeTextColor = color;
    } else if (this.isPressed && activeColor) {
      activeTextColor = activeColor;
    } else if (this.isHovered && hoverColor) {
      activeTextColor = hoverColor;
    } else if (this.isVisited && (this.styles.trackVisited !== false) && visitedColor) {
      activeTextColor = visitedColor;
    }

    if (text) {
      ctx.font = this.getFontString();
      ctx.fillStyle = activeTextColor;
      ctx.textBaseline = 'middle';

      if (typeof this.styles.letterSpacing === 'number' && 'letterSpacing' in ctx) {
        (ctx as any).letterSpacing = `${this.styles.letterSpacing}px`;
      }

      const innerWidth = Math.max(0, width - padding.left - padding.right);
      const textWidth = ctx.measureText(text).width;
      const textY = height / 2;

      let textX = padding.left;
      let lineStartX = padding.left;
      let lineEndX = padding.left + textWidth;

      if (textAlign === 'center') {
        textX = padding.left + innerWidth / 2;
        ctx.textAlign = 'center';
        lineStartX = textX - textWidth / 2;
        lineEndX = textX + textWidth / 2;
      } else if (textAlign === 'right') {
        textX = padding.left + innerWidth;
        ctx.textAlign = 'right';
        lineStartX = textX - textWidth;
        lineEndX = textX;
      } else {
        ctx.textAlign = 'left';
      }

      ctx.fillText(text, textX, textY);

      // Check underline rule
      const shouldUnderline =
        !disabled &&
        (underline === 'always' ||
          underline === true ||
          (underline === 'hover' && this.isHovered));

      if (shouldUnderline && textWidth > 0) {
        const lineY = Math.round(textY + fontSize / 2 + underlineOffset);
        ctx.beginPath();
        ctx.strokeStyle = activeTextColor;
        ctx.lineWidth = Math.max(1, underlineThickness);
        ctx.moveTo(lineStartX, lineY);
        ctx.lineTo(lineEndX, lineY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

/**
 * UILink is an alias for UIAnchor.
 */
export const UILink = UIAnchor;
export type UILink = UIAnchor;
