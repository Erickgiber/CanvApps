import { Rect, Size, Insets } from '../types/geometry';
import { VisualStyles, BorderRadius } from '../types/style';
import { UIEventType, CanvasEventListener, CanvasPointerEvent } from '../events/types';
import { Engine } from './Engine';
import { animate, Easings } from '../animation/Tween';
import { getSafeAreaInsets } from './safeArea';

/**
 * Abstract base class for all renderable nodes in the CanvApps UI hierarchy.
 *
 * Provides core tree lifecycle, geometry layout rect calculations, dirty flag
 * propagation, hit-testing mechanics, and Canvas 2D render pipeline orchestration.
 */
export abstract class UIElement {
  public readonly id: string;

  /**
   * Reference to the parent element in the UI tree.
   */
  public parent: UIElement | null = null;

  /**
   * Array of child elements. Rendered in order unless zIndex overrides.
   */
  public children: UIElement[] = [];

  /**
   * Style and layout configuration properties.
   */
  public styles: VisualStyles = {};

  /**
   * Layout rectangle relative to the parent's coordinate space.
   * Calculated during the layout pass.
   */
  public layoutRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  /**
   * Absolute bounding rectangle in Canvas world space coordinates.
   * Used for hit testing, clip regions, and final drawing transforms.
   */
  public worldRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  public isLayoutDirty = true;

  public isRenderDirty = true;

  /**
   * Whether the element is visible and eligible for layout/rendering.
   */
  public visible = true;

  /**
   * Interaction state flags.
   */
  public isHovered = false;
  public isPressed = false;
  public isFocused = false;

  /**
   * Smart Animate / Shared Element dynamic offset & scale properties.
   */
  public smartOffsetX: number = 0;
  public smartOffsetY: number = 0;
  public smartScaleX: number = 1;
  public smartScaleY: number = 1;

  private listeners: Map<UIEventType, Set<CanvasEventListener>> = new Map();
  private static idCounter = 0;
  private static elementRegistry: Map<string, UIElement> = new Map();

  /**
   * Global default text selection flag.
   */
  public static defaultSelectable = false;

  /**
   * Global switch for enabling automatic device safe-area calculations (defaults to true).
   */
  public static enableSafeArea = true;

  /**
   * Global reference to currently open UISelect instance (for priority hit-testing and outside dismissal).
   */
  public static activeOpenSelect: UIElement | null = null;

  public static registerElement(id: string, element: UIElement): void {
    const cleanId = id.startsWith('#') ? id.slice(1) : id;
    this.elementRegistry.set(cleanId, element);
  }

  /**
   * Unregisters an element from the global lookup registry.
   */
  public static unregisterElement(id: string): void {
    const cleanId = id.startsWith('#') ? id.slice(1) : id;
    this.elementRegistry.delete(cleanId);
  }

  /**
   * Retrieves an element by its ID.
   */
  public static getElementById(id: string): UIElement | null {
    const cleanId = id.startsWith('#') ? id.slice(1) : id;
    return this.elementRegistry.get(cleanId) ?? this.elementRegistry.get(id) ?? null;
  }

  /**
   * Scroll offsets and scroll range for overflow containers.
   */
  public scrollTop = 0;
  public scrollLeft = 0;
  public maxScrollTop = 0;
  public maxScrollLeft = 0;

  /**
   * Y-axis scroll offset (alias for scrollTop).
   */
  public get scrollY(): number {
    return this.scrollTop;
  }
  public set scrollY(val: number) {
    this.scrollTop = val;
  }

  /**
   * X-axis scroll offset (alias for scrollLeft).
   */
  public get scrollX(): number {
    return this.scrollLeft;
  }
  public set scrollX(val: number) {
    this.scrollLeft = val;
  }

  /**
   * Creates a new UIElement instance.
   *
   * @param initialStyles Optional initial visual and layout styles.
   */
  constructor(initialStyles: VisualStyles = {}) {
    this.id = initialStyles.id || `ui_element_${++UIElement.idCounter}`;
    this.styles = { ...initialStyles };
    UIElement.registerElement(this.id, this);
    if (initialStyles.id) {
      UIElement.registerElement(initialStyles.id, this);
    }
  }

  // Hierarchy Management

  public addChild(child: UIElement): this {
    if (child.parent === this) {
      return this;
    }

    if (child.parent) {
      child.parent.removeChild(child);
    }

    child.parent = this;
    this.children.push(child);
    child.markLayoutDirty();
    this.markLayoutDirty();
    return this;
  }

  /**
   * Inserts a child element at a specific index.
   *
   * @param child The child element to insert.
   * @param index The 0-based index to insert at.
   * @returns This instance for chaining.
   */
  public insertChild(child: UIElement, index: number): this {
    if (child.parent === this) {
      const currIndex = this.children.indexOf(child);
      if (currIndex !== -1) {
        this.children.splice(currIndex, 1);
      }
    } else if (child.parent) {
      child.parent.removeChild(child);
    }

    child.parent = this;
    const clampedIndex = Math.max(0, Math.min(index, this.children.length));
    this.children.splice(clampedIndex, 0, child);
    child.markLayoutDirty();
    this.markLayoutDirty();
    return this;
  }

  /**
   * Removes a child element from this node.
   *
   * @param child The child element to remove.
   * @returns The removed child, or null if not found.
   */
  public removeChild(child: UIElement): UIElement | null {
    const index = this.children.indexOf(child);
    if (index === -1) {
      return null;
    }

    child.parent = null;
    this.children.splice(index, 1);
    this.markLayoutDirty();
    return child;
  }

  public removeFromParent(): void {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  public removeAllChildren(): void {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children = [];
    this.markLayoutDirty();
  }

  private static readonly LAYOUT_AFFECTING_KEYS = new Set<string>([
    'width',
    'height',
    'minWidth',
    'maxWidth',
    'minHeight',
    'maxHeight',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'margin',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'safeArea',
    'safeAreaTop',
    'safeAreaBottom',
    'safeAreaLeft',
    'safeAreaRight',
    'flexDirection',
    'flexWrap',
    'justifyContent',
    'alignItems',
    'alignSelf',
    'flexGrow',
    'flexShrink',
    'gap',
    'rowGap',
    'columnGap',
    'display',
    'position',
    'left',
    'top',
    'right',
    'bottom',
    'fontSize',
    'fontWeight',
    'fontFamily',
    'lineHeight',
    'wordWrap',
    'maxLines',
    'overflow',
    'scroll',
    'scrollDirection',
    'showScrollbar',
    'text',
    'label',
  ]);

  // Style and Invalidation

  public setStyle(styles: Partial<VisualStyles>): this {
    if (styles.scrollTop !== undefined) {
      this.scrollTop = Math.max(0, styles.scrollTop);
    }
    if (styles.scrollY !== undefined) {
      this.scrollTop = Math.max(0, styles.scrollY);
    }
    if (styles.scrollLeft !== undefined) {
      this.scrollLeft = Math.max(0, styles.scrollLeft);
    }
    if (styles.scrollX !== undefined) {
      this.scrollLeft = Math.max(0, styles.scrollX);
    }

    let requiresLayout = false;
    for (const key of Object.keys(styles)) {
      if (UIElement.LAYOUT_AFFECTING_KEYS.has(key)) {
        requiresLayout = true;
        break;
      }
    }

    Object.assign(this.styles, styles);

    if (requiresLayout) {
      this.markLayoutDirty();
    } else {
      this.markRenderDirty();
    }
    return this;
  }

  public markLayoutDirty(): void {
    this.isLayoutDirty = true;
    this.isRenderDirty = true;

    let curr: UIElement | null = this.parent;
    while (curr) {
      curr.isLayoutDirty = true;
      curr.isRenderDirty = true;
      curr = curr.parent;
    }
    Engine.invalidateActive();
  }

  public markRenderDirty(): void {
    this.isRenderDirty = true;

    let curr: UIElement | null = this.parent;
    while (curr) {
      curr.isRenderDirty = true;
      curr = curr.parent;
    }
    Engine.invalidateActive();
  }

  // Coordinate Space and Box Model

  /**
   * Parses arbitrary insets into a normalized Insets object.
   */
  private static parseInsetValues(val: any): Insets | null {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') {
      return { top: val, right: val, bottom: val, left: val };
    }
    if (Array.isArray(val)) {
      if (val.length === 2) {
        const [vertical, horizontal] = val.map(Number);
        return { top: vertical || 0, right: horizontal || 0, bottom: vertical || 0, left: horizontal || 0 };
      }
      if (val.length === 4) {
        const [top, right, bottom, left] = val.map(Number);
        return { top: top || 0, right: right || 0, bottom: bottom || 0, left: left || 0 };
      }
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return UIElement.parseInsetValues(parsed);
          }
        } catch {
          const parts = trimmed.slice(1, -1).split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
          return UIElement.parseInsetValues(parts);
        }
      }
      const parts = trimmed.replace(/px/g, '').split(/[\s,]+/).map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
      if (parts.length === 1) {
        return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
      }
      if (parts.length === 2) {
        return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
      }
      if (parts.length === 4) {
        return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
      }
    }
    return null;
  }

  /**
   * Resolves the 4-directional computed padding insets including safe-area insets.
   */
  public getComputedPadding(): Insets {
    const { padding, paddingTop, paddingRight, paddingBottom, paddingLeft } = this.styles;

    const insets: Insets = {
      top: paddingTop ?? 0,
      right: paddingRight ?? 0,
      bottom: paddingBottom ?? 0,
      left: paddingLeft ?? 0,
    };

    const parsed = UIElement.parseInsetValues(padding);
    if (parsed) {
      insets.top = paddingTop ?? parsed.top;
      insets.right = paddingRight ?? parsed.right;
      insets.bottom = paddingBottom ?? parsed.bottom;
      insets.left = paddingLeft ?? parsed.left;
    }

    // Apply safe area insets (Notch, Status Bar, Home Indicator) if configured
    if (
      UIElement.enableSafeArea &&
      (this.styles.safeArea ||
        this.styles.safeAreaTop !== undefined ||
        this.styles.safeAreaBottom !== undefined ||
        this.styles.safeAreaLeft !== undefined ||
        this.styles.safeAreaRight !== undefined)
    ) {
      const deviceInsets = getSafeAreaInsets();
      const sa = this.styles.safeArea;

      const addTop = sa === true || sa === 'top' || sa === 'all' || sa === 'vertical' || Boolean(this.styles.safeAreaTop);
      const addBottom = sa === true || sa === 'bottom' || sa === 'all' || sa === 'vertical' || Boolean(this.styles.safeAreaBottom);
      const addLeft = sa === true || sa === 'left' || sa === 'all' || sa === 'horizontal' || Boolean(this.styles.safeAreaLeft);
      const addRight = sa === true || sa === 'right' || sa === 'all' || sa === 'horizontal' || Boolean(this.styles.safeAreaRight);

      if (addTop) insets.top += typeof this.styles.safeAreaTop === 'number' ? this.styles.safeAreaTop : deviceInsets.top;
      if (addBottom) insets.bottom += typeof this.styles.safeAreaBottom === 'number' ? this.styles.safeAreaBottom : deviceInsets.bottom;
      if (addLeft) insets.left += typeof this.styles.safeAreaLeft === 'number' ? this.styles.safeAreaLeft : deviceInsets.left;
      if (addRight) insets.right += typeof this.styles.safeAreaRight === 'number' ? this.styles.safeAreaRight : deviceInsets.right;
    }

    return insets;
  }

  /**
   * Resolves the 4-directional computed margin insets.
   */
  public getComputedMargin(): Insets {
    const { margin, marginTop, marginRight, marginBottom, marginLeft } = this.styles;

    const insets: Insets = {
      top: marginTop ?? 0,
      right: marginRight ?? 0,
      bottom: marginBottom ?? 0,
      left: marginLeft ?? 0,
    };

    const parsed = UIElement.parseInsetValues(margin);
    if (parsed) {
      insets.top = marginTop ?? parsed.top;
      insets.right = marginRight ?? parsed.right;
      insets.bottom = marginBottom ?? parsed.bottom;
      insets.left = marginLeft ?? parsed.left;
    }

    return insets;
  }

  /**
   * Measures the intrinsic size of the element given available constraints.
   * Can be overridden by nodes with intrinsic sizing logic (e.g. UIText).
   *
   * @param availableWidth Maximum width constraint.
   * @param availableHeight Maximum height constraint.
   * @returns Calculated intrinsic dimensions.
   */
  public measure(availableWidth: number, availableHeight: number): Size {
    const padding = this.getComputedPadding();

    let containerResolvedW = availableWidth;
    if (typeof this.styles.width === 'number') {
      containerResolvedW = this.styles.width;
    } else if (typeof this.styles.width === 'string') {
      if (this.styles.width.endsWith('%')) {
        const pct = parseFloat(this.styles.width);
        if (!isNaN(pct)) {
          containerResolvedW = (pct / 100) * availableWidth;
        }
      } else {
        const num = parseFloat(this.styles.width);
        if (!isNaN(num)) {
          containerResolvedW = num;
        }
      }
    }
    if (this.styles.maxWidth !== undefined) {
      const maxVal = this.styles.maxWidth as any;
      const maxW = typeof maxVal === 'number' ? maxVal : typeof maxVal === 'string' && maxVal.endsWith('%') ? (parseFloat(maxVal) / 100) * availableWidth : parseFloat(maxVal);
      if (!isNaN(maxW)) containerResolvedW = Math.min(maxW, containerResolvedW);
    }
    if (this.styles.minWidth !== undefined) {
      const minVal = this.styles.minWidth as any;
      const minW = typeof minVal === 'number' ? minVal : typeof minVal === 'string' && minVal.endsWith('%') ? (parseFloat(minVal) / 100) * availableWidth : parseFloat(minVal);
      if (!isNaN(minW)) containerResolvedW = Math.max(minW, containerResolvedW);
    }

    const innerAvailableW = Math.max(0, containerResolvedW - padding.left - padding.right);
    const innerAvailableH = Math.max(0, availableHeight - padding.top - padding.bottom);

    let intrinsicW = 0;
    let intrinsicH = 0;

    const isColumn = this.styles.flexDirection === 'column' || this.styles.flexDirection === 'column-reverse' || !this.styles.flexDirection;
    const gap = this.styles.gap ?? 0;
    const mainGap = isColumn ? (this.styles.rowGap ?? gap) : (this.styles.columnGap ?? gap);

    const getFlowChildren = (parent: UIElement): UIElement[] => {
      const flow: UIElement[] = [];
      for (const child of parent.children) {
        if (!child.visible || child.styles.display === 'none' || child.styles.position === 'absolute') continue;
        if (child.styles.display === 'contents') {
          flow.push(...getFlowChildren(child));
        } else {
          flow.push(child);
        }
      }
      return flow;
    };

    const flowChildren = getFlowChildren(this);

    if (flowChildren.length > 0) {
      if (isColumn) {
        for (let i = 0; i < flowChildren.length; i++) {
          const child = flowChildren[i];
          const childMargin = child.getComputedMargin();
          const childSize = child.measure(innerAvailableW, innerAvailableH);
          intrinsicW = Math.max(intrinsicW, childSize.width + childMargin.left + childMargin.right);
          intrinsicH += childSize.height + childMargin.top + childMargin.bottom;
          if (i > 0) intrinsicH += mainGap;
        }
      } else {
        const isWrap = this.styles.flexWrap === 'wrap' || this.styles.flexWrap === 'wrap-reverse';
        if (isWrap && innerAvailableW > 0) {
          let currentLineMain = 0;
          let currentLineCrossMax = 0;
          let maxMainWidth = 0;
          let totalCrossHeight = 0;
          let lineIndex = 0;
          const crossGap = this.styles.rowGap ?? gap;

          for (let i = 0; i < flowChildren.length; i++) {
            const child = flowChildren[i];
            const childMargin = child.getComputedMargin();
            const childSize = child.measure(innerAvailableW, innerAvailableH);
            const itemOuterW = childSize.width + childMargin.left + childMargin.right;
            const itemOuterH = childSize.height + childMargin.top + childMargin.bottom;

            if (currentLineMain > 0 && currentLineMain + mainGap + itemOuterW > innerAvailableW) {
              maxMainWidth = Math.max(maxMainWidth, currentLineMain);
              totalCrossHeight += currentLineCrossMax + (lineIndex > 0 ? crossGap : 0);
              lineIndex++;
              currentLineMain = itemOuterW;
              currentLineCrossMax = itemOuterH;
            } else {
              currentLineMain = currentLineMain > 0 ? currentLineMain + mainGap + itemOuterW : itemOuterW;
              currentLineCrossMax = Math.max(currentLineCrossMax, itemOuterH);
            }
          }

          if (currentLineMain > 0) {
            maxMainWidth = Math.max(maxMainWidth, currentLineMain);
            totalCrossHeight += currentLineCrossMax + (lineIndex > 0 ? crossGap : 0);
          }

          intrinsicW = maxMainWidth;
          intrinsicH = totalCrossHeight;
        } else {
          for (let i = 0; i < flowChildren.length; i++) {
            const child = flowChildren[i];
            const childMargin = child.getComputedMargin();
            const childSize = child.measure(innerAvailableW, innerAvailableH);
            intrinsicW += childSize.width + childMargin.left + childMargin.right;
            intrinsicH = Math.max(intrinsicH, childSize.height + childMargin.top + childMargin.bottom);
            if (i > 0) intrinsicW += mainGap;
          }
        }
      }
    } else {
      const absChildren = this.children.filter(
        (c) => c.visible && c.styles.display !== 'none' && c.styles.position === 'absolute'
      );
      for (const abs of absChildren) {
        const absMargin = abs.getComputedMargin();
        const absSize = abs.measure(innerAvailableW, innerAvailableH);
        intrinsicW = Math.max(intrinsicW, absSize.width + absMargin.left + absMargin.right);
        intrinsicH = Math.max(intrinsicH, absSize.height + absMargin.top + absMargin.bottom);
      }
    }

    let width = intrinsicW + padding.left + padding.right;
    if (typeof this.styles.width === 'number') {
      width = this.styles.width;
    } else if (typeof this.styles.width === 'string') {
      if (this.styles.width.endsWith('%')) {
        width = (parseFloat(this.styles.width) / 100) * availableWidth;
      } else {
        const num = parseFloat(this.styles.width);
        if (!isNaN(num)) {
          width = num;
        }
      }
    }

    let height = intrinsicH + padding.top + padding.bottom;
    if (typeof this.styles.height === 'number') {
      height = this.styles.height;
    } else if (typeof this.styles.height === 'string') {
      if (this.styles.height.endsWith('%')) {
        height = (parseFloat(this.styles.height) / 100) * availableHeight;
      } else {
        const num = parseFloat(this.styles.height);
        if (!isNaN(num)) {
          height = num;
        }
      }
    }

    // Apply min/max width constraints
    if (this.styles.minWidth !== undefined) {
      const minVal = this.styles.minWidth as any;
      const minW = typeof minVal === 'number' ? minVal : typeof minVal === 'string' && minVal.endsWith('%') ? (parseFloat(minVal) / 100) * availableWidth : parseFloat(minVal);
      if (!isNaN(minW)) width = Math.max(minW, width);
    }
    if (this.styles.maxWidth !== undefined) {
      const maxVal = this.styles.maxWidth as any;
      const maxW = typeof maxVal === 'number' ? maxVal : typeof maxVal === 'string' && maxVal.endsWith('%') ? (parseFloat(maxVal) / 100) * availableWidth : parseFloat(maxVal);
      if (!isNaN(maxW)) width = Math.min(maxW, width);
    }

    // Apply min/max height constraints
    if (this.styles.minHeight !== undefined) {
      const minHVal = this.styles.minHeight as any;
      const minH = typeof minHVal === 'number' ? minHVal : typeof minHVal === 'string' && minHVal.endsWith('%') ? (parseFloat(minHVal) / 100) * availableHeight : parseFloat(minHVal);
      if (!isNaN(minH)) height = Math.max(minH, height);
    }
    if (this.styles.maxHeight !== undefined) {
      const maxHVal = this.styles.maxHeight as any;
      const maxH = typeof maxHVal === 'number' ? maxHVal : typeof maxHVal === 'string' && maxHVal.endsWith('%') ? (parseFloat(maxHVal) / 100) * availableHeight : parseFloat(maxHVal);
      if (!isNaN(maxH)) height = Math.min(maxH, height);
    }

    return { width, height };
  }

  public setLayout(x: number, y: number, width: number, height: number): void {
    this.layoutRect.x = x;
    this.layoutRect.y = y;
    this.layoutRect.width = width;
    this.layoutRect.height = height;
    this.isLayoutDirty = false;
  }

  /**
   * Updates world coordinates recursively using parent world offsets.
   *
   * @param parentWorldX Absolute X offset of parent.
   * @param parentWorldY Absolute Y offset of parent.
   */
  public updateWorldTransform(parentWorldX = 0, parentWorldY = 0): void {
    if (this.styles.display === 'contents') {
      this.worldRect.x = parentWorldX;
      this.worldRect.y = parentWorldY;
      this.worldRect.width = 0;
      this.worldRect.height = 0;
      for (const child of this.children) {
        if (child.visible && child.styles.display !== 'none') {
          child.updateWorldTransform(parentWorldX, parentWorldY);
        }
      }
      return;
    }

    this.worldRect.x = parentWorldX + this.layoutRect.x;
    this.worldRect.y = parentWorldY + this.layoutRect.y;
    this.worldRect.width = this.layoutRect.width;
    this.worldRect.height = this.layoutRect.height;

    const childOffsetX = this.worldRect.x - this.scrollLeft;
    const childOffsetY = this.worldRect.y - this.scrollTop;

    for (const child of this.children) {
      if (child.visible && child.styles.display !== 'none') {
        child.updateWorldTransform(childOffsetX, childOffsetY);
      }
    }
  }

  /**
   * Scrolls this container to the specified coordinates with optional smooth animation.
   */
  public scrollTo(options: { top?: number; left?: number; behavior?: 'smooth' | 'auto'; duration?: number } = {}): () => void {
    const targetTop = options.top !== undefined ? Math.max(0, Math.min(this.maxScrollTop || Infinity, options.top)) : this.scrollTop;
    const targetLeft = options.left !== undefined ? Math.max(0, Math.min(this.maxScrollLeft || Infinity, options.left)) : this.scrollLeft;
    const behavior = options.behavior ?? 'auto';
    const duration = options.duration ?? 350;

    if (behavior === 'auto' || duration <= 0 || typeof window === 'undefined') {
      this.scrollTop = targetTop;
      this.scrollLeft = targetLeft;
      this.emit('scroll', new CanvasPointerEvent('scroll', this, {} as any));
      Engine.invalidateActive();
      return () => {};
    }

    const startTop = this.scrollTop;
    const startLeft = this.scrollLeft;

    return animate({
      from: 0,
      to: 1,
      duration,
      easing: Easings.easeOutCubic,
      onUpdate: (progress) => {
        this.scrollTop = startTop + (targetTop - startTop) * progress;
        this.scrollLeft = startLeft + (targetLeft - startLeft) * progress;
        this.emit('scroll', new CanvasPointerEvent('scroll', this, {} as any));
        Engine.invalidateActive();
      },
      onComplete: () => {
        this.scrollTop = targetTop;
        this.scrollLeft = targetLeft;
        this.emit('scroll', new CanvasPointerEvent('scroll', this, {} as any));
        Engine.invalidateActive();
      },
    });
  }

  /**
   * Scrolls to the top of the container.
   */
  public scrollToTop(behavior: 'smooth' | 'auto' = 'smooth'): () => void {
    return this.scrollTo({ top: 0, behavior });
  }

  /**
   * Scrolls to the bottom of the container.
   */
  public scrollToBottom(behavior: 'smooth' | 'auto' = 'smooth'): () => void {
    return this.scrollTo({ top: this.maxScrollTop, behavior });
  }

  /**
   * Scrolls by relative coordinate offsets.
   */
  public scrollBy(options: { top?: number; left?: number; behavior?: 'smooth' | 'auto'; duration?: number } = {}): () => void {
    const top = options.top !== undefined ? this.scrollTop + options.top : this.scrollTop;
    const left = options.left !== undefined ? this.scrollLeft + options.left : this.scrollLeft;
    return this.scrollTo({ top, left, behavior: options.behavior, duration: options.duration });
  }

  /**
   * Returns normalized scroll progression between 0 and 1.
   */
  public getScrollProgress(): { x: number; y: number } {
    return {
      x: this.maxScrollLeft > 0 ? Math.min(1, Math.max(0, this.scrollLeft / this.maxScrollLeft)) : 0,
      y: this.maxScrollTop > 0 ? Math.min(1, Math.max(0, this.scrollTop / this.maxScrollTop)) : 0,
    };
  }

  // Hit Testing

  /**
   * Determines if a world coordinate point falls within this element's bounding rect.
   *
   * @param worldX World X coordinate.
   * @param worldY World Y coordinate.
   * @returns True if point is inside bounds.
   */
  public containsPoint(worldX: number, worldY: number): boolean {
    return (
      worldX >= this.worldRect.x &&
      worldX <= this.worldRect.x + this.worldRect.width &&
      worldY >= this.worldRect.y &&
      worldY <= this.worldRect.y + this.worldRect.height
    );
  }

  /**
   * Performs recursive spatial hit-testing returning the topmost element at coordinates.
   *
   * @param worldX World X coordinate.
   * @param worldY World Y coordinate.
   * @returns The topmost hit UIElement or null.
   */
  public hitTest(worldX: number, worldY: number): UIElement | null {
    if (!this.visible || this.styles.display === 'none') {
      return null;
    }

    if (this.styles.display === 'contents') {
      for (let i = this.children.length - 1; i >= 0; i--) {
        const hitChild = this.children[i].hitTest(worldX, worldY);
        if (hitChild) {
          return hitChild;
        }
      }
      return null;
    }

    if (!this.containsPoint(worldX, worldY)) {
      return null;
    }

    // Traverse children in reverse paint order (topmost first)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const hitChild = this.children[i].hitTest(worldX, worldY);
      if (hitChild) {
        return hitChild;
      }
    }

    return this;
  }

  // Rendering

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.styles.display === 'none') {
      this.isRenderDirty = false;
      return;
    }

    this.isRenderDirty = false;

    if (this.styles.display === 'contents') {
      for (const child of this.children) {
        if (child.visible && child.styles.display !== 'none') {
          child.render(ctx);
        }
      }
      return;
    }

    ctx.save();

    // Apply composite opacity
    if (typeof this.styles.opacity === 'number' && this.styles.opacity < 1) {
      ctx.globalAlpha *= Math.max(0, Math.min(1, this.styles.opacity));
    }

    // Apply Smart Animate / Shared Element morphing offset and scale
    if (this.smartOffsetX !== 0 || this.smartOffsetY !== 0 || this.smartScaleX !== 1 || this.smartScaleY !== 1) {
      const centerX = this.worldRect.x + this.worldRect.width / 2;
      const centerY = this.worldRect.y + this.worldRect.height / 2;
      ctx.translate(this.smartOffsetX, this.smartOffsetY);
      if (this.smartScaleX !== 1 || this.smartScaleY !== 1) {
        ctx.translate(centerX, centerY);
        ctx.scale(this.smartScaleX, this.smartScaleY);
        ctx.translate(-centerX, -centerY);
      }
    }

    // Apply translate offset (translateX / translateY)
    if (typeof this.styles.translateX === 'number' || typeof this.styles.translateY === 'number') {
      const tx = this.styles.translateX ?? 0;
      const ty = this.styles.translateY ?? 0;
      ctx.translate(tx, ty);
    }

    // Apply composite scale transform around element center
    if (typeof this.styles.scale === 'number' && this.styles.scale !== 1) {
      const centerX = this.worldRect.x + this.worldRect.width / 2;
      const centerY = this.worldRect.y + this.worldRect.height / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(this.styles.scale, this.styles.scale);
      ctx.translate(-centerX, -centerY);
    }

    // Draw current element translated to its world coordinates
    ctx.save();
    ctx.translate(this.worldRect.x, this.worldRect.y);
    this.draw(ctx);
    ctx.restore();

    // Clip child hierarchy if container specifies overflow hidden, scroll, or is actively overflowing
    const isClipped =
      this.styles.overflow === 'hidden' ||
      this.styles.overflow === 'scroll' ||
      ((this.styles.overflow === 'auto' || Boolean(this.styles.scroll)) &&
        (this.maxScrollTop > 0 || this.maxScrollLeft > 0));

    if (isClipped) {
      ctx.save();
      ctx.beginPath();
      this.applyPath(
        ctx,
        this.worldRect.x,
        this.worldRect.y,
        this.worldRect.width,
        this.worldRect.height,
        this.styles.borderRadius
      );
      ctx.clip();
    }

    // Recursively render child elements (drawn at their absolute worldRect)
    for (const child of this.children) {
      if (child.visible && child.styles.display !== 'none') {
        if ((child as any).isModal === true) {
          continue; // Rendered in Engine top-layer overlay portal pass
        }
        child.render(ctx);
      }
    }

    if (isClipped) {
      ctx.restore();
    }

    // Draw native subtle Canvas scrollbars if scrollable
    this.drawScrollbars(ctx);

    ctx.restore();
  }

  /**
   * Renders subtle Canvas scrollbars if the container is scrollable and configured to show them.
   */
  protected drawScrollbars(ctx: CanvasRenderingContext2D): void {
    const showScrollbar = this.styles.showScrollbar;
    if (showScrollbar === false || showScrollbar === 'never') {
      return;
    }

    const isExplicitScroll =
      this.styles.overflow === 'scroll' ||
      this.styles.overflow === 'auto' ||
      Boolean(this.styles.scroll) ||
      showScrollbar === true ||
      showScrollbar === 'always' ||
      showScrollbar === 'auto';

    if (!isExplicitScroll) {
      return;
    }

    const scrollbarSize = this.styles.scrollbarWidth ?? 5;
    const scrollbarColor = this.styles.scrollbarColor ?? 'rgba(140, 140, 140, 0.45)';
    const trackColor = this.styles.scrollbarTrackColor;
    const padding = this.getComputedPadding();
    const radius = scrollbarSize / 2;

    const canScrollY =
      this.maxScrollTop > 0 &&
      this.styles.scroll !== 'horizontal' &&
      this.styles.scrollDirection !== 'horizontal';
    const canScrollX =
      this.maxScrollLeft > 0 &&
      this.styles.scroll !== 'vertical' &&
      this.styles.scrollDirection !== 'vertical';

    ctx.save();

    if (canScrollY && this.worldRect.height > 0) {
      const trackMargin = 3;
      const trackX = this.worldRect.x + this.worldRect.width - scrollbarSize - trackMargin;
      const trackY = this.worldRect.y + padding.top + trackMargin;
      const trackH = Math.max(1, this.worldRect.height - padding.top - padding.bottom - trackMargin * 2);

      if (trackColor) {
        ctx.beginPath();
        this.applyPath(ctx, trackX, trackY, scrollbarSize, trackH, radius);
        ctx.fillStyle = trackColor;
        ctx.fill();
      }

      const ratio = this.worldRect.height / (this.worldRect.height + this.maxScrollTop);
      const thumbH = Math.max(16, Math.min(trackH, trackH * ratio));
      const availableScrollDistance = trackH - thumbH;
      const scrollRatio = this.maxScrollTop > 0 ? Math.min(1, Math.max(0, this.scrollTop / this.maxScrollTop)) : 0;
      const thumbY = trackY + scrollRatio * availableScrollDistance;

      ctx.beginPath();
      this.applyPath(ctx, trackX, thumbY, scrollbarSize, thumbH, radius);
      ctx.fillStyle = scrollbarColor;
      ctx.fill();
    }

    if (canScrollX && this.worldRect.width > 0) {
      const trackMargin = 3;
      const trackX = this.worldRect.x + padding.left + trackMargin;
      const trackY = this.worldRect.y + this.worldRect.height - scrollbarSize - trackMargin;
      const trackW = Math.max(1, this.worldRect.width - padding.left - padding.right - trackMargin * 2);

      if (trackColor) {
        ctx.beginPath();
        this.applyPath(ctx, trackX, trackY, trackW, scrollbarSize, radius);
        ctx.fillStyle = trackColor;
        ctx.fill();
      }

      const ratio = this.worldRect.width / (this.worldRect.width + this.maxScrollLeft);
      const thumbW = Math.max(16, Math.min(trackW, trackW * ratio));
      const availableScrollDistance = trackW - thumbW;
      const scrollRatio = this.maxScrollLeft > 0 ? Math.min(1, Math.max(0, this.scrollLeft / this.maxScrollLeft)) : 0;
      const thumbX = trackX + scrollRatio * availableScrollDistance;

      ctx.beginPath();
      this.applyPath(ctx, thumbX, trackY, thumbW, scrollbarSize, radius);
      ctx.fillStyle = scrollbarColor;
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Helper utility to create rounded rectangular paths on the canvas context.
   */
  protected applyPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius?: BorderRadius
  ): void {
    if (!radius) {
      ctx.rect(x, y, w, h);
      return;
    }

    let tl = 0;
    let tr = 0;
    let br = 0;
    let bl = 0;

    if (typeof radius === 'number') {
      tl = tr = br = bl = radius;
    } else if (Array.isArray(radius) && radius.length === 4) {
      [tl, tr, br, bl] = radius;
    }

    // Clamp corner radii to not exceed half the dimensions
    const maxR = Math.min(w / 2, h / 2);
    tl = Math.min(tl, maxR);
    tr = Math.min(tr, maxR);
    br = Math.min(br, maxR);
    bl = Math.min(bl, maxR);

    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  // Event Handling & Propagation

  /**
   * Registers an event listener on this element.
   *
   * @param type The event type.
   * @param listener The callback function.
   * @returns This instance for chaining.
   */
  public on(type: UIEventType, listener: CanvasEventListener): this {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
    return this;
  }

  /**
   * Alias for `on()`.
   */
  public addEventListener(type: UIEventType, listener: CanvasEventListener): this {
    return this.on(type, listener);
  }

  /**
   * Removes an event listener from this element.
   *
   * @param type The event type.
   * @param listener The callback function to remove.
   * @returns This instance for chaining.
   */
  public off(type: UIEventType, listener: CanvasEventListener): this {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
    return this;
  }

  /**
   * Alias for `off()`.
   */
  public removeEventListener(type: UIEventType, listener: CanvasEventListener): this {
    return this.off(type, listener);
  }

  /**
   * Emits an event on this element and bubbles up along the ancestor tree.
   *
   * @param type The event type.
   * @param event The event payload.
   */
  public emit(type: UIEventType, event: CanvasPointerEvent | any = {}): void {
    if (event && typeof event === 'object') {
      try {
        event.currentTarget = this;
      } catch {
        // Native browser Events have read-only currentTarget getter
      }
    }
    const set = this.listeners.get(type);
    if (set) {
      for (const listener of set) {
        listener(event);
        if (event?.isPropagationStopped) {
          return;
        }
      }
    }

    // Bubble up to parent if not stopped
    if (this.parent && !event?.isPropagationStopped) {
      this.parent.emit(type, event);
    }
  }

  /**
   * Requests focus on this element.
   */
  public focus(): void {
    this.isFocused = true;
    this.markRenderDirty();
  }

  /**
   * Removes focus from this element.
   */
  public blur(): void {
    this.isFocused = false;
    this.markRenderDirty();
  }

  public abstract draw(ctx: CanvasRenderingContext2D): void;
}
