import { UIElement } from '../core/UIElement';
import { VisualStyles } from '../types/style';

/**
 * Image element visual and layout styles.
 */
export interface ImageStyles extends VisualStyles {
  src?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  alt?: string;
  placeholderColor?: string;
  showLoader?: boolean;
  showErrorIcon?: boolean;
  loaderColor?: string;
  errorColor?: string;
}

/**
 * High-performance UI element for hardware-accelerated image rendering on Canvas 2D.
 *
 * Supports asynchronous image streaming, automatic global memory caching,
 * sub-pixel center cropping (cover/contain/fill), rounded corner clipping,
 * animated loading spinner (toggleable), and broken image error fallback icon.
 */
export class UIImage extends UIElement {
  public declare styles: ImageStyles;

  private static imageCache: Map<string, HTMLImageElement> = new Map();
  private static loadingMap: Map<string, Array<(img: HTMLImageElement | null) => void>> = new Map();

  private imageElement: HTMLImageElement | null = null;
  private isLoaded = false;
  private hasError = false;

  constructor(src = '', styles: ImageStyles = {}) {
    super({
      showLoader: true,
      showErrorIcon: true,
      ...styles,
    });
    this.styles.src = src || styles.src || '';
    this.styles.fit = styles.fit || 'cover';

    if (this.styles.src) {
      this.loadImage(this.styles.src);
    }
  }

  public isImageLoaded(): boolean {
    return this.isLoaded;
  }

  public isError(): boolean {
    return this.hasError;
  }

  public setShowLoader(show: boolean): this {
    this.styles.showLoader = show;
    this.markRenderDirty();
    return this;
  }

  public setShowErrorIcon(show: boolean): this {
    this.styles.showErrorIcon = show;
    this.markRenderDirty();
    return this;
  }

  public setLoaderColor(color: string): this {
    this.styles.loaderColor = color;
    this.markRenderDirty();
    return this;
  }

  /**
   * Updates image source URL and initiates streaming.
   *
   * @param src Image URL or Data URI.
   */
  public setSrc(src: string): this {
    if (this.styles.src !== src) {
      this.styles.src = src;
      this.isLoaded = false;
      this.hasError = false;
      this.loadImage(src);
      this.markRenderDirty();
    }
    return this;
  }

  /**
   * Updates object-fit rendering strategy.
   *
   * @param fit 'cover' | 'contain' | 'fill' | 'none'
   */
  public setFit(fit: 'cover' | 'contain' | 'fill' | 'none'): this {
    if (this.styles.fit !== fit) {
      this.styles.fit = fit;
      this.markRenderDirty();
    }
    return this;
  }

  public static resolveUrl(rawSrc: string): string {
    if (!rawSrc || typeof window === 'undefined') return rawSrc;
    if (
      rawSrc.startsWith('data:') ||
      rawSrc.startsWith('blob:') ||
      rawSrc.startsWith('http://') ||
      rawSrc.startsWith('https://') ||
      rawSrc.startsWith('//')
    ) {
      return rawSrc;
    }

    if (!rawSrc.startsWith('/')) {
      if (typeof document !== 'undefined' && (document.baseURI || window.location.href)) {
        try {
          return new URL(rawSrc, document.baseURI || window.location.href).href;
        } catch {
          return rawSrc;
        }
      }
      return rawSrc;
    }

    const baseEl = typeof document !== 'undefined' ? document.querySelector('base') : null;
    const baseHref = baseEl ? baseEl.getAttribute('href') : null;
    if (baseHref && baseHref !== '/' && baseHref !== './') {
      const cleanBase = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
      try {
        const parsedBase = new URL(cleanBase, window.location.origin);
        const basePath = parsedBase.pathname.endsWith('/') ? parsedBase.pathname.slice(0, -1) : parsedBase.pathname;
        if (basePath && basePath !== '') {
          if (rawSrc === basePath || rawSrc.startsWith(basePath + '/')) {
            return `${parsedBase.origin}${rawSrc}`;
          }
          return `${parsedBase.origin}${basePath}${rawSrc}`;
        }
      } catch {
        if (!rawSrc.startsWith(cleanBase)) {
          return `${cleanBase}${rawSrc}`;
        }
      }
    }

    if (window.location && window.location.hostname.endsWith('github.io')) {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const repoName = pathParts[0];
        if (rawSrc === `/${repoName}` || rawSrc.startsWith(`/${repoName}/`)) {
          return rawSrc;
        }
        return `/${repoName}${rawSrc}`;
      }
    }

    return rawSrc;
  }

  /**
   * Asynchronously loads or retrieves cached image element.
   */
  private loadImage(rawSrc: string): void {
    const src = UIImage.resolveUrl(rawSrc);
    if (!src || typeof window === 'undefined') {
      this.imageElement = null;
      this.isLoaded = false;
      return;
    }

    // Check memory cache
    const cached = UIImage.imageCache.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      this.imageElement = cached;
      this.isLoaded = true;
      this.hasError = false;
      this.markRenderDirty();
      return;
    }

    // Check if another component is already downloading this source
    if (UIImage.loadingMap.has(src)) {
      UIImage.loadingMap.get(src)!.push((img) => {
        if (this.styles.src === rawSrc || this.styles.src === src) {
          if (img) {
            this.imageElement = img;
            this.isLoaded = true;
            this.hasError = false;
          } else {
            this.hasError = true;
          }
          this.markRenderDirty();
        }
      });
      return;
    }

    // Initialize new image download
    UIImage.loadingMap.set(src, []);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const onDone = () => {
      UIImage.imageCache.set(src, img);
      if (this.styles.src === rawSrc || this.styles.src === src) {
        this.imageElement = img;
        this.isLoaded = true;
        this.hasError = false;
        this.markRenderDirty();
      }

      const callbacks = UIImage.loadingMap.get(src) || [];
      UIImage.loadingMap.delete(src);
      callbacks.forEach((cb) => cb(img));
    };

    img.onload = () => {
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode().then(onDone).catch(onDone);
      } else {
        onDone();
      }
    };

    img.onerror = () => {
      if (this.styles.src === rawSrc || this.styles.src === src) {
        this.imageElement = null;
        this.isLoaded = false;
        this.hasError = true;
        this.markRenderDirty();
      }

      const callbacks = UIImage.loadingMap.get(src) || [];
      UIImage.loadingMap.delete(src);
      callbacks.forEach((cb) => cb(null));
    };

    img.src = src;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.layoutRect;
    if (width <= 0 || height <= 0) {
      return;
    }

    const {
      backgroundColor,
      borderRadius,
      fit = 'cover',
      border,
      borderColor,
      borderWidth,
      boxShadow,
      placeholderColor,
      showLoader = true,
      showErrorIcon = true,
      loaderColor = '#0284c7',
      errorColor = '#94a3b8',
    } = this.styles;

    ctx.save();

    if (boxShadow) {
      ctx.save();
      ctx.shadowColor = boxShadow.color;
      ctx.shadowBlur = boxShadow.blur;
      ctx.shadowOffsetX = boxShadow.offsetX;
      ctx.shadowOffsetY = boxShadow.offsetY;

      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = backgroundColor || '#000000';
      ctx.fill();
      ctx.restore();
    }

    const bgFill = backgroundColor || placeholderColor;
    if (bgFill && bgFill !== 'transparent') {
      ctx.beginPath();
      this.applyPath(ctx, 0, 0, width, height, borderRadius);
      ctx.fillStyle = bgFill;
      ctx.fill();
    }

    if (this.isLoaded && this.imageElement) {
      const img = this.imageElement;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;

      if (imgW > 0 && imgH > 0) {
        ctx.save();

        // Clip to rounded border radius if specified
        if (borderRadius) {
          ctx.beginPath();
          this.applyPath(ctx, 0, 0, width, height, borderRadius);
          ctx.clip();
        }

        if (fit === 'cover') {
          const imgAspect = imgW / imgH;
          const containerAspect = width / height;
          let sx = 0;
          let sy = 0;
          let sw = imgW;
          let sh = imgH;

          if (imgAspect > containerAspect) {
            sw = imgH * containerAspect;
            sx = (imgW - sw) / 2;
          } else {
            sh = imgW / containerAspect;
            sy = (imgH - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
        } else if (fit === 'contain') {
          const imgAspect = imgW / imgH;
          const containerAspect = width / height;
          let dx = 0;
          let dy = 0;
          let dw = width;
          let dh = height;

          if (imgAspect > containerAspect) {
            dh = width / imgAspect;
            dy = (height - dh) / 2;
          } else {
            dw = height * imgAspect;
            dx = (width - dw) / 2;
          }

          ctx.drawImage(img, 0, 0, imgW, imgH, dx, dy, dw, dh);
        } else {
          // 'fill' / 'none'
          ctx.drawImage(img, 0, 0, width, height);
        }

        ctx.restore();
      }
    } else if (this.hasError) {
      if (showErrorIcon) {
        ctx.save();
        if (borderRadius) {
          ctx.beginPath();
          this.applyPath(ctx, 0, 0, width, height, borderRadius);
          ctx.clip();
        }

        const centerX = width / 2;
        const centerY = height / 2;

        // Draw warning / broken image indicator
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = errorColor;
        const iconSize = Math.max(16, Math.min(28, Math.min(width, height) * 0.22));
        ctx.font = `${iconSize}px system-ui, sans-serif`;
        ctx.fillText('🖼️', centerX, centerY - (height > 60 ? 10 : 0));

        if (height > 60) {
          ctx.font = `600 ${Math.max(10, Math.min(12, width * 0.08))}px system-ui, sans-serif`;
          ctx.fillText('Unable to load image', centerX, centerY + 14);
        }
        ctx.restore();
      }
    } else if (showLoader && this.styles.src) {
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(8, Math.min(18, Math.min(width, height) * 0.16));
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const angle = ((now % 1000) / 1000) * Math.PI * 2;

      // Track circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(150, 150, 160, 0.2)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Spinning arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, angle + Math.PI * 0.7);
      ctx.strokeStyle = loaderColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // Request next frame to keep spinner revolving
      this.markRenderDirty();
    }

    const effectiveBorderWidth = borderWidth ?? border?.width ?? 0;
    const effectiveBorderColor = borderColor ?? border?.color;

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

    ctx.restore();
  }
}
