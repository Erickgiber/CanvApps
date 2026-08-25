import { UIElement } from '../core/UIElement';
import { DimensionValue, JustifyContent } from '../types/style';

/**
 * Internal measurement data structure for flex flow items during layout calculation.
 */
interface MeasuredItem {
  element: UIElement;
  mainSize: number;
  crossSize: number;
  mainMarginStart: number;
  mainMarginEnd: number;
  crossMarginStart: number;
  crossMarginEnd: number;
}

/**
 * Pure mathematical Flexbox Layout Engine for canvas hierarchies.
 *
 * Implements W3C Flexbox specification core algorithms without DOM dependencies:
 * - Multi-axis flow calculation (row, column, reverse directions)
 * - Flex growing, shrinking, basis, and line wrapping
 * - Alignment distribution (justify-content, align-items, align-self)
 * - Absolute positioning and box-model padding/margin offsets
 */
export class FlexLayout {
  private static currentViewportWidth = 0;
  private static currentViewportHeight = 0;

  /**
   * Primary entry point for calculating the layout of an entire UI tree.
   *
   * @param root The root UIElement to lay out.
   * @param containerWidth The available canvas/viewport width.
   * @param containerHeight The available canvas/viewport height.
   */
  public static calculateLayout(
    root: UIElement,
    containerWidth: number,
    containerHeight: number
  ): void {
    if (!root.visible || root.styles.display === 'none') {
      return;
    }

    this.currentViewportWidth = containerWidth;
    this.currentViewportHeight = containerHeight;

    // Resolve root dimensions
    const rootWidth = this.resolveDimension(root.styles.width, containerWidth, containerWidth);
    const rootHeight = this.resolveDimension(root.styles.height, containerHeight, containerHeight);

    root.setLayout(
      root.styles.left ?? 0,
      root.styles.top ?? 0,
      rootWidth,
      rootHeight
    );

    // Recursively lay out children
    this.layoutElement(root, rootWidth, rootHeight);

    // Update all world-space absolute matrices
    root.updateWorldTransform(0, 0);
  }

  /**
   * Computes layout for a single container element and all its children.
   */
  private static layoutElement(
    element: UIElement,
    availableWidth: number,
    availableHeight: number
  ): void {
    const padding = element.getComputedPadding();
    const innerWidth = Math.max(0, availableWidth - padding.left - padding.right);
    const innerHeight = Math.max(0, availableHeight - padding.top - padding.bottom);

    const isRow =
      element.styles.flexDirection === 'row' ||
      element.styles.flexDirection === 'row-reverse';

    const isReverse =
      element.styles.flexDirection === 'row-reverse' ||
      element.styles.flexDirection === 'column-reverse';

    const gap = element.styles.gap ?? 0;
    const mainGap = isRow ? (element.styles.columnGap ?? gap) : (element.styles.rowGap ?? gap);
    const crossGap = isRow ? (element.styles.rowGap ?? gap) : (element.styles.columnGap ?? gap);

    const flowChildren: UIElement[] = [];
    const absoluteChildren: UIElement[] = [];

    const collectChildren = (parent: UIElement) => {
      for (const child of parent.children) {
        if (!child.visible || child.styles.display === 'none') {
          continue;
        }
        if (child.styles.display === 'contents') {
          child.isLayoutDirty = false;
          collectChildren(child);
        } else if (child.styles.position === 'absolute') {
          absoluteChildren.push(child);
        } else {
          flowChildren.push(child);
        }
      }
    };

    collectChildren(element);

    // Lay out absolute children
    for (const absChild of absoluteChildren) {
      this.layoutAbsoluteChild(absChild, availableWidth, availableHeight, padding);
    }

    if (flowChildren.length === 0) {
      element.isLayoutDirty = false;
      return;
    }

    // Measure initial size of all flow children
    const measuredItems: MeasuredItem[] = flowChildren.map((child) => {
      const margin = child.getComputedMargin();
      const childAvailableWidth = Math.max(0, innerWidth - margin.left - margin.right);
      const childAvailableHeight = Math.max(0, innerHeight - margin.top - margin.bottom);

      const intrinsic = child.measure(childAvailableWidth, childAvailableHeight);
      const childW = this.resolveDimension(child.styles.width, innerWidth, intrinsic.width);
      const childH = this.resolveDimension(child.styles.height, innerHeight, intrinsic.height);

      if (isRow) {
        return {
          element: child,
          mainSize: childW,
          crossSize: childH,
          mainMarginStart: margin.left,
          mainMarginEnd: margin.right,
          crossMarginStart: margin.top,
          crossMarginEnd: margin.bottom,
        };
      } else {
        return {
          element: child,
          mainSize: childH,
          crossSize: childW,
          mainMarginStart: margin.top,
          mainMarginEnd: margin.bottom,
          crossMarginStart: margin.left,
          crossMarginEnd: margin.right,
        };
      }
    });

    // Group items into flex lines based on flexWrap
    const isWrap = element.styles.flexWrap === 'wrap' || element.styles.flexWrap === 'wrap-reverse';
    const isWrapReverse = element.styles.flexWrap === 'wrap-reverse';
    const isScrollable =
      element.styles.overflow === 'scroll' ||
      element.styles.overflow === 'auto' ||
      element.styles.overflow === 'visible';
    const containerInnerMain = isRow ? innerWidth : innerHeight;
    const containerInnerCross = isRow ? innerHeight : innerWidth;

    interface FlexLineData {
      items: MeasuredItem[];
      mainSizeSum: number;
      crossSizeMax: number;
      flexGrowSum: number;
      flexShrinkSum: number;
    }

    const lines: FlexLineData[] = [];
    let currentLine: MeasuredItem[] = [];
    let currentMainSum = 0;

    for (const item of measuredItems) {
      const itemOuterMain = item.mainSize + item.mainMarginStart + item.mainMarginEnd;
      const proposedMain =
        currentLine.length > 0
          ? currentMainSum + mainGap + itemOuterMain
          : itemOuterMain;

      if (isWrap && currentLine.length > 0 && proposedMain > containerInnerMain) {
        // Wrap to next line
        lines.push(this.buildLineData(currentLine, currentMainSum, isRow, isScrollable));
        currentLine = [item];
        currentMainSum = itemOuterMain;
      } else {
        currentLine.push(item);
        currentMainSum = proposedMain;
      }
    }

    if (currentLine.length > 0) {
      lines.push(this.buildLineData(currentLine, currentMainSum, isRow, isScrollable));
    }

    // Position each flex line along the cross axis
    let crossOffset = isRow ? padding.top : padding.left;
    if (isWrapReverse) {
      // In wrap-reverse, calculate total cross height first
      const totalCross =
        lines.reduce((acc, l) => acc + l.crossSizeMax, 0) +
        Math.max(0, lines.length - 1) * crossGap;
      crossOffset += Math.max(0, containerInnerCross - totalCross);
    }

    for (const line of lines) {
      // Distribute free space along main axis (flex-grow / flex-shrink)
      const totalMarginsAndGaps =
        line.items.reduce((acc, it) => acc + it.mainMarginStart + it.mainMarginEnd, 0) +
        Math.max(0, line.items.length - 1) * mainGap;
      const baseMainSizesSum = line.items.reduce((acc, it) => acc + it.mainSize, 0);
      const freeMainSpace = containerInnerMain - (baseMainSizesSum + totalMarginsAndGaps);

      if (freeMainSpace > 0 && line.flexGrowSum > 0) {
        for (const item of line.items) {
          const grow = item.element.styles.flexGrow ?? 0;
          if (grow > 0) {
            item.mainSize += (freeMainSpace * grow) / line.flexGrowSum;
          }
        }
      } else if (freeMainSpace < 0 && line.flexShrinkSum > 0) {
        const shrinkAmount = Math.abs(freeMainSpace);
        for (const item of line.items) {
          const userShrink = item.element.styles.flexShrink;
          const isScrollable =
            element.styles.overflow === 'scroll' ||
            element.styles.overflow === 'auto' ||
            element.styles.overflow === 'visible';
          const shrink = userShrink !== undefined ? userShrink : (isScrollable || !isRow ? 0 : 1);
          if (shrink > 0 && line.flexShrinkSum > 0) {
            const minSize = isRow
              ? (item.element.styles.minWidth ?? 0)
              : (item.element.styles.minHeight ?? 0);
            const targetSize = item.mainSize - (shrinkAmount * shrink) / line.flexShrinkSum;
            item.mainSize = Math.max(minSize, targetSize);
          }
        }
      }

      // Recompute actual line main size after grow/shrink
      const finalItemsMain = line.items.reduce(
        (acc, it) => acc + it.mainSize + it.mainMarginStart + it.mainMarginEnd,
        0
      );
      const finalFreeSpace = Math.max(
        0,
        containerInnerMain - (finalItemsMain + Math.max(0, line.items.length - 1) * mainGap)
      );

      // Compute main axis offsets based on justifyContent
      const mainPositions = this.computeMainPositions(
        line.items,
        finalFreeSpace,
        mainGap,
        element.styles.justifyContent ?? 'flex-start',
        isReverse
      );

      const mainPaddingStart = isRow ? padding.left : padding.top;

      // Position each item in line
      for (let i = 0; i < line.items.length; i++) {
        const item = line.items[i];
        const mainPos = mainPositions[i] + mainPaddingStart + item.mainMarginStart;

        // Cross axis alignment (alignSelf or alignItems)
        const align = item.element.styles.alignSelf ?? element.styles.alignItems ?? 'flex-start';
        let crossItemSize = item.crossSize;
        const effectiveLineCross = isWrap
          ? line.crossSizeMax
          : Math.max(containerInnerCross, line.crossSizeMax);
        let itemCrossPos = crossOffset + item.crossMarginStart;

        if (align === 'stretch' && item.element.styles[isRow ? 'height' : 'width'] === undefined) {
          crossItemSize = Math.max(0, effectiveLineCross - item.crossMarginStart - item.crossMarginEnd);
        } else if (align === 'center') {
          const availableCross = effectiveLineCross - item.crossMarginStart - item.crossMarginEnd;
          itemCrossPos += (availableCross - crossItemSize) / 2;
        } else if (align === 'flex-end') {
          const availableCross = effectiveLineCross - item.crossMarginStart - item.crossMarginEnd;
          itemCrossPos += availableCross - crossItemSize;
        }

        const childX = isRow ? mainPos : itemCrossPos;
        const childY = isRow ? itemCrossPos : mainPos;
        const childW = isRow ? item.mainSize : crossItemSize;
        const childH = isRow ? crossItemSize : item.mainSize;

        item.element.setLayout(childX, childY, childW, childH);

        // Recursively lay out descendants of child
        this.layoutElement(item.element, childW, childH);
      }

      crossOffset += line.crossSizeMax + crossGap;
    }

    // Calculate scrollable bounds
    let maxContentX = 0;
    let maxContentY = 0;

    const calcBounds = (parent: UIElement) => {
       for (const child of parent.children) {
         if (!child.visible || child.styles.display === 'none' || child.styles.position === 'absolute') continue;
         if (child.styles.display === 'contents') {
           calcBounds(child);
           continue;
         }
         const margin = child.getComputedMargin();
         const childRight = child.layoutRect.x + child.layoutRect.width + margin.right;
         const childBottom = child.layoutRect.y + child.layoutRect.height + margin.bottom;
         if (childRight > maxContentX) maxContentX = childRight;
         if (childBottom > maxContentY) maxContentY = childBottom;
       }
    };

    calcBounds(element);

    const isScrollContainer =
      !element.parent ||
      element.styles.overflow === 'scroll' ||
      element.styles.overflow === 'auto' ||
      Boolean(element.styles.scroll);

    const scrollDirection = element.styles.scroll ?? element.styles.scrollDirection ?? 'both';

    if (isScrollContainer) {
      const allowX = scrollDirection === 'both' || scrollDirection === 'horizontal';
      const allowY = scrollDirection === 'both' || scrollDirection === 'vertical';

      element.maxScrollLeft = allowX ? Math.max(0, maxContentX + padding.right - availableWidth) : 0;
      element.maxScrollTop = allowY ? Math.max(0, maxContentY + padding.bottom - availableHeight) : 0;

      // Clamp existing scroll positions within newly calculated maximums
      element.scrollLeft = Math.max(0, Math.min(element.maxScrollLeft, element.scrollLeft));
      element.scrollTop = Math.max(0, Math.min(element.maxScrollTop, element.scrollTop));
    } else {
      element.maxScrollLeft = 0;
      element.maxScrollTop = 0;
      element.scrollLeft = 0;
      element.scrollTop = 0;
    }

    element.isLayoutDirty = false;
  }

  /**
   * Helper to aggregate flex line metadata.
   */
  private static buildLineData(items: MeasuredItem[], mainSum: number, isRow = true, isScrollable = false): {
    items: MeasuredItem[];
    mainSizeSum: number;
    crossSizeMax: number;
    flexGrowSum: number;
    flexShrinkSum: number;
  } {
    let crossMax = 0;
    let growSum = 0;
    let shrinkSum = 0;

    for (const item of items) {
      const itemOuterCross = item.crossSize + item.crossMarginStart + item.crossMarginEnd;
      crossMax = Math.max(crossMax, itemOuterCross);
      growSum += item.element.styles.flexGrow ?? 0;
      const userShrink = item.element.styles.flexShrink;
      const defaultShrink = isScrollable || !isRow ? 0 : 1;
      shrinkSum += userShrink !== undefined ? userShrink : defaultShrink;
    }

    return {
      items,
      mainSizeSum: mainSum,
      crossSizeMax: crossMax,
      flexGrowSum: growSum,
      flexShrinkSum: shrinkSum,
    };
  }

  /**
   * Computes main axis item offsets based on `justifyContent` strategy.
   */
  private static computeMainPositions(
    items: MeasuredItem[],
    freeSpace: number,
    gap: number,
    justify: JustifyContent,
    isReverse: boolean
  ): number[] {
    const count = items.length;
    const positions: number[] = new Array(count).fill(0);
    const orderedIndices = isReverse
      ? Array.from({ length: count }, (_, i) => count - 1 - i)
      : Array.from({ length: count }, (_, i) => i);

    let startOffset = 0;
    let extraBetween = 0;

    switch (justify) {
      case 'center':
        startOffset = freeSpace / 2;
        break;
      case 'flex-end':
        startOffset = freeSpace;
        break;
      case 'space-between':
        extraBetween = count > 1 ? freeSpace / (count - 1) : 0;
        break;
      case 'space-around':
        extraBetween = count > 0 ? freeSpace / count : 0;
        startOffset = extraBetween / 2;
        break;
      case 'space-evenly':
        extraBetween = count > 0 ? freeSpace / (count + 1) : 0;
        startOffset = extraBetween;
        break;
      case 'flex-start':
      default:
        startOffset = 0;
        break;
    }

    let runningOffset = startOffset;
    for (const idx of orderedIndices) {
      const item = items[idx];
      positions[idx] = runningOffset;
      runningOffset += item.mainSize + item.mainMarginStart + item.mainMarginEnd + gap + extraBetween;
    }

    return positions;
  }

  /**
   * Computes layout coordinates for an absolutely positioned child.
   */
  private static layoutAbsoluteChild(
    child: UIElement,
    parentWidth: number,
    parentHeight: number,
    padding: { top: number; right: number; bottom: number; left: number }
  ): void {
    const isModal = child.constructor.name === 'UIModal' || (child as any).isModal === true;
    const effectiveParentW = isModal && this.currentViewportWidth > 0 ? this.currentViewportWidth : parentWidth;
    const effectiveParentH = isModal && this.currentViewportHeight > 0 ? this.currentViewportHeight : parentHeight;
    const effectivePadding = isModal ? { top: 0, right: 0, bottom: 0, left: 0 } : padding;

    const margin = child.getComputedMargin();
    const intrinsic = child.measure(effectiveParentW, effectiveParentH);

    const childW = this.resolveDimension(child.styles.width, effectiveParentW, intrinsic.width);
    const childH = this.resolveDimension(child.styles.height, effectiveParentH, intrinsic.height);

    let x = effectivePadding.left + margin.left;
    let y = effectivePadding.top + margin.top;

    if (typeof child.styles.left === 'number') {
      x = child.styles.left + margin.left;
    } else if (typeof child.styles.right === 'number') {
      x = effectiveParentW - childW - child.styles.right - margin.right;
    }

    if (typeof child.styles.top === 'number') {
      y = child.styles.top + margin.top;
    } else if (typeof child.styles.bottom === 'number') {
      y = effectiveParentH - childH - child.styles.bottom - margin.bottom;
    }

    child.setLayout(x, y, childW, childH);
    this.layoutElement(child, childW, childH);
  }

  /**
   * Resolves dimension values (pixels, percentage strings, or auto fallback).
   */
  public static resolveDimension(
    value: DimensionValue | undefined,
    parentDimension: number,
    autoFallback: number
  ): number {
    if (typeof value === 'number') {
      return Math.max(0, value);
    }
    if (typeof value === 'string') {
      if (value.endsWith('%')) {
        const pct = parseFloat(value);
        if (!isNaN(pct)) {
          return Math.max(0, (pct / 100) * parentDimension);
        }
      }
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return Math.max(0, num);
      }
    }
    return autoFallback;
  }
}
