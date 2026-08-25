import { UIView } from './UIView';
import { VisualStyles, ScrollDirection, ScrollbarVisibility } from '../types/style';

/**
 * Styling and configuration options specific to UIScrollView containers.
 */
export interface ScrollViewStyles extends VisualStyles {
  scroll?: ScrollDirection;
  scrollDirection?: ScrollDirection;
  showScrollbar?: ScrollbarVisibility;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  scrollbarWidth?: number;
  bounce?: boolean;
}

/**
 * High-performance scrollable viewport container for Canvas 2D hierarchies.
 *
 * Supports vertical, horizontal, and bidirectional scrolling with internal bounding box clipping,
 * touch and mouse wheel inertial momentum deceleration, and subtle hardware-drawn scrollbars.
 */
export class UIScrollView extends UIView {
  public declare styles: ScrollViewStyles;

  constructor(styles: ScrollViewStyles = {}) {
    const scroll = styles.scroll ?? styles.scrollDirection ?? 'vertical';
    const isHorizontal = scroll === 'horizontal';

    super({
      overflow: 'scroll',
      flexDirection: styles.flexDirection ?? (isHorizontal ? 'row' : 'column'),
      flexShrink: styles.flexShrink ?? 0,
      showScrollbar: styles.showScrollbar ?? 'auto',
      scroll,
      ...styles,
    });
  }

  /**
   * Updates the allowed scroll direction.
   */
  public setScroll(scroll: ScrollDirection): this {
    this.setStyle({ scroll });
    return this;
  }

  /**
   * Updates scrollbar visibility strategy.
   */
  public setShowScrollbar(showScrollbar: ScrollbarVisibility): this {
    this.setStyle({ showScrollbar });
    return this;
  }

  /**
   * Sets the vertical scroll offset directly.
   */
  public setScrollTop(top: number): this {
    this.scrollTop = Math.max(0, Math.min(this.maxScrollTop, top));
    this.markRenderDirty();
    return this;
  }

  /**
   * Sets the horizontal scroll offset directly.
   */
  public setScrollLeft(left: number): this {
    this.scrollLeft = Math.max(0, Math.min(this.maxScrollLeft, left));
    this.markRenderDirty();
    return this;
  }

  /**
   * Sets the Y-axis scroll offset (alias for setScrollTop).
   */
  public setScrollY(y: number): this {
    return this.setScrollTop(y);
  }

  /**
   * Sets the X-axis scroll offset (alias for setScrollLeft).
   */
  public setScrollX(x: number): this {
    return this.setScrollLeft(x);
  }
}
