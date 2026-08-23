import { Rect, Size, Insets } from '../types/geometry';
import { VisualStyles, BorderRadius } from '../types/style';
import { UIEventType, CanvasEventListener, CanvasPointerEvent } from '../events/types';

/**
 * Abstract base class for all renderable nodes in the CanvApps UI hierarchy.
 *
 * Provides core tree lifecycle, geometry layout rect calculations, dirty flag
 * propagation, hit-testing mechanics, and Canvas 2D render pipeline orchestration.
 */
export abstract class UIElement {
  /**
   * Unique identifier for this element.
   */
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

  /**
   * Flag indicating whether this node requires layout recalculation.
   */
  public isLayoutDirty = true;

  /**
   * Flag indicating whether this node requires canvas redraw.
   */
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

  private listeners: Map<UIEventType, Set<CanvasEventListener>> = new Map();
  private static idCounter = 0;
  private static elementRegistry: Map<string, UIElement> = new Map();

  /**
   * Global default text selection flag.
   */
  public static defaultSelectable = false;

  /**
   * Registers an element into the global ID lookup registry.
   */
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
   * Retrieves a UIElement by its unique or custom ID.
   */
  public static getElementById(id: string): UIElement | null {
    const cleanId = id.startsWith('#') ? id.slice(1) : id;
    return this.elementRegistry.get(cleanId) ?? this.elementRegistry.get(id) ?? null;
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

  // ---------------------------------------------------------------------------
  // Hierarchy Management
  // ---------------------------------------------------------------------------

  /**
   * Appends a child element to this node.
   *
   * @param child The child element to add.
   * @returns This instance for chaining.
   */
  public addChild(child: UIElement): this {
    if (child.parent === this) {
      return this;
    }

    if (child.parent) {
      child.parent.removeChild(child);
    }

    child.parent = this;
    this.children.push(child);
    this.markLayoutDirty();
    return this;
  }

  /**
   * Inserts a child element at a specific index.
   *
   * @param child The child element to insert.
   * @param index Zero-based index at which to insert the child.
   * @returns This instance for chaining.
   */
  public insertChild(child: UIElement, index: number): this {
    if (child.parent === this) {
      const currentIndex = this.children.indexOf(child);
      if (currentIndex !== -1) {
        this.children.splice(currentIndex, 1);
      }
    } else if (child.parent) {
      child.parent.removeChild(child);
    }

    child.parent = this;
    const targetIndex = Math.max(0, Math.min(index, this.children.length));
    this.children.splice(targetIndex, 0, child);
    this.markLayoutDirty();
    return this;
  }

  /**
   * Removes a specific child element from this node.
   *
   * @param child The child element to remove.
   * @returns The removed child or null if not found.
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

  /**
   * Removes this element from its current parent.
   */
  public removeFromParent(): void {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  /**
   * Removes all children from this element.
   */
  public removeAllChildren(): void {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children = [];
    this.markLayoutDirty();
  }

  // ---------------------------------------------------------------------------
  // Style and Invalidation
  // ---------------------------------------------------------------------------

  /**
   * Updates styles and marks the element dirty for layout/rendering.
   *
   * @param styles Partial style overrides.
   * @returns This instance for chaining.
   */
  public setStyle(styles: Partial<VisualStyles>): this {
    Object.assign(this.styles, styles);
    this.markLayoutDirty();
    return this;
  }

  /**
   * Marks this element and its ancestor path as requiring layout recalculation.
   */
  public markLayoutDirty(): void {
    this.isLayoutDirty = true;
    this.isRenderDirty = true;

    if (this.parent && !this.parent.isLayoutDirty) {
      this.parent.markLayoutDirty();
    }
  }

  /**
   * Marks this element as requiring canvas repaint without invalidating layout.
   */
  public markRenderDirty(): void {
    this.isRenderDirty = true;
    if (this.parent && !this.parent.isRenderDirty) {
      this.parent.markRenderDirty();
    }
  }

  // ---------------------------------------------------------------------------
  // Coordinate Space and Box Model
  // ---------------------------------------------------------------------------

  /**
   * Resolves the 4-directional computed padding insets.
   */
  public getComputedPadding(): Insets {
    const { padding, paddingTop, paddingRight, paddingBottom, paddingLeft } = this.styles;

    if (typeof padding === 'number') {
      return {
        top: paddingTop ?? padding,
        right: paddingRight ?? padding,
        bottom: paddingBottom ?? padding,
        left: paddingLeft ?? padding,
      };
    }

    if (Array.isArray(padding)) {
      if (padding.length === 2) {
        const [vertical, horizontal] = padding;
        return {
          top: paddingTop ?? vertical,
          right: paddingRight ?? horizontal,
          bottom: paddingBottom ?? vertical,
          left: paddingLeft ?? horizontal,
        };
      }
      if (padding.length === 4) {
        const [top, right, bottom, left] = padding;
        return {
          top: paddingTop ?? top,
          right: paddingRight ?? right,
          bottom: paddingBottom ?? bottom,
          left: paddingLeft ?? left,
        };
      }
    }

    return {
      top: paddingTop ?? 0,
      right: paddingRight ?? 0,
      bottom: paddingBottom ?? 0,
      left: paddingLeft ?? 0,
    };
  }

  /**
   * Resolves the 4-directional computed margin insets.
   */
  public getComputedMargin(): Insets {
    const { margin, marginTop, marginRight, marginBottom, marginLeft } = this.styles;

    if (typeof margin === 'number') {
      return {
        top: marginTop ?? margin,
        right: marginRight ?? margin,
        bottom: marginBottom ?? margin,
        left: marginLeft ?? margin,
      };
    }

    if (Array.isArray(margin)) {
      if (margin.length === 2) {
        const [vertical, horizontal] = margin;
        return {
          top: marginTop ?? vertical,
          right: marginRight ?? horizontal,
          bottom: marginBottom ?? vertical,
          left: marginLeft ?? horizontal,
        };
      }
      if (margin.length === 4) {
        const [top, right, bottom, left] = margin;
        return {
          top: marginTop ?? top,
          right: marginRight ?? right,
          bottom: marginBottom ?? bottom,
          left: marginLeft ?? left,
        };
      }
    }

    return {
      top: marginTop ?? 0,
      right: marginRight ?? 0,
      bottom: marginBottom ?? 0,
      left: marginLeft ?? 0,
    };
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
    const innerAvailableW = Math.max(0, availableWidth - padding.left - padding.right);
    const innerAvailableH = Math.max(0, availableHeight - padding.top - padding.bottom);

    let intrinsicW = 0;
    let intrinsicH = 0;

    const isColumn = this.styles.flexDirection === 'column' || this.styles.flexDirection === 'column-reverse' || !this.styles.flexDirection;
    const gap = this.styles.gap ?? 0;
    const mainGap = isColumn ? (this.styles.rowGap ?? gap) : (this.styles.columnGap ?? gap);

    const flowChildren = this.children.filter(
      (c) => c.visible && c.styles.display !== 'none' && c.styles.position !== 'absolute'
    );

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

    const width =
      typeof this.styles.width === 'number'
        ? this.styles.width
        : typeof this.styles.width === 'string' && this.styles.width.endsWith('%')
        ? (parseFloat(this.styles.width) / 100) * availableWidth
        : intrinsicW + padding.left + padding.right;

    const height =
      typeof this.styles.height === 'number'
        ? this.styles.height
        : typeof this.styles.height === 'string' && this.styles.height.endsWith('%')
        ? (parseFloat(this.styles.height) / 100) * availableHeight
        : intrinsicH + padding.top + padding.bottom;

    return { width, height };
  }

  /**
   * Sets computed layout coordinates and dimensions.
   *
   * @param x Left position relative to parent.
   * @param y Top position relative to parent.
   * @param width Computed width.
   * @param height Computed height.
   */
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
    this.worldRect.x = parentWorldX + this.layoutRect.x;
    this.worldRect.y = parentWorldY + this.layoutRect.y;
    this.worldRect.width = this.layoutRect.width;
    this.worldRect.height = this.layoutRect.height;

    for (const child of this.children) {
      if (child.visible && child.styles.display !== 'none') {
        child.updateWorldTransform(this.worldRect.x, this.worldRect.y);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Hit Testing
  // ---------------------------------------------------------------------------

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
   * Performs hit-testing against this node and its children in reverse rendering order
   * (topmost visually rendered child is evaluated first).
   *
   * @param worldX World X coordinate.
   * @param worldY World Y coordinate.
   * @returns The hit UIElement or null.
   */
  public hitTest(worldX: number, worldY: number): UIElement | null {
    if (!this.visible || this.styles.display === 'none') {
      return null;
    }

    // If overflow is hidden and point is outside this container, ignore subtree
    if (this.styles.overflow === 'hidden' && !this.containsPoint(worldX, worldY)) {
      return null;
    }

    // Traverse children in reverse order (topmost first)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      const hit = child.hitTest(worldX, worldY);
      if (hit) {
        return hit;
      }
    }

    if (this.containsPoint(worldX, worldY)) {
      return this;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Rendering Pipeline
  // ---------------------------------------------------------------------------

  /**
   * Orchestrates the Canvas 2D rendering pipeline: handles transforms, clipping,
   * opacity, delegates to abstract `draw()`, and recursively renders children.
   *
   * @param ctx The Canvas 2D rendering context.
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.styles.display === 'none') {
      return;
    }

    ctx.save();

    // Apply composite opacity
    if (typeof this.styles.opacity === 'number' && this.styles.opacity < 1) {
      ctx.globalAlpha *= Math.max(0, Math.min(1, this.styles.opacity));
    }

    // Draw current element translated to its world coordinates
    ctx.save();
    ctx.translate(this.worldRect.x, this.worldRect.y);
    this.draw(ctx);
    ctx.restore();

    // Clip child hierarchy if container specifies overflow hidden
    if (this.styles.overflow === 'hidden') {
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

    // Recursively render child elements
    for (const child of this.children) {
      if (child.visible && child.styles.display !== 'none') {
        child.render(ctx);
      }
    }

    ctx.restore();
    this.isRenderDirty = false;
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

  // ---------------------------------------------------------------------------
  // Event Handling & Propagation
  // ---------------------------------------------------------------------------

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
  public emit(type: UIEventType, event: CanvasPointerEvent): void {
    event.currentTarget = this;
    const set = this.listeners.get(type);
    if (set) {
      for (const listener of set) {
        listener(event);
        if (event.isPropagationStopped) {
          return;
        }
      }
    }

    // Bubble up to parent if not stopped
    if (this.parent && !event.isPropagationStopped) {
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

  /**
   * Abstract drawing method implemented by concrete visual nodes (e.g. UIView, UIText).
   *
   * Coordinates in this method are relative to the element's local origin (0, 0).
   *
   * @param ctx The Canvas 2D rendering context translated to the element's local origin.
   */
  public abstract draw(ctx: CanvasRenderingContext2D): void;
}
