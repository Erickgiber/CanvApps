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
  /**
   * Performs a layout pass on the root element and all its descendant nodes.
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

    // Separate flow items from absolutely positioned items
    for (const child of element.children) {
      if (!child.visible || child.styles.display === 'none') {
        continue;
      }
      if (child.styles.position === 'absolute') {
        absoluteChildren.push(child);
      } else {
        flowChildren.push(child);
      }
    }

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
        lines.push(this.buildLineData(currentLine, currentMainSum));
        currentLine = [item];
        currentMainSum = itemOuterMain;
      } else {
        currentLine.push(item);
        currentMainSum = proposedMain;
      }
    }

    if (currentLine.length > 0) {
      lines.push(this.buildLineData(currentLine, currentMainSum));
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
          const shrink = item.element.styles.flexShrink ?? 1;
          if (shrink > 0) {
            item.mainSize = Math.max(0, item.mainSize - (shrinkAmount * shrink) / line.flexShrinkSum);
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
        let itemCrossPos = crossOffset + item.crossMarginStart;

        if (align === 'stretch' && item.element.styles[isRow ? 'height' : 'width'] === undefined) {
          crossItemSize = Math.max(0, line.crossSizeMax - item.crossMarginStart - item.crossMarginEnd);
        } else if (align === 'center') {
          const availableCross = line.crossSizeMax - item.crossMarginStart - item.crossMarginEnd;
          itemCrossPos += (availableCross - crossItemSize) / 2;
        } else if (align === 'flex-end') {
          const availableCross = line.crossSizeMax - item.crossMarginStart - item.crossMarginEnd;
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

    element.isLayoutDirty = false;
  }

  /**
   * Helper to aggregate flex line metadata.
   */
  private static buildLineData(items: MeasuredItem[], mainSum: number): {
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
      shrinkSum += item.element.styles.flexShrink ?? 1;
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
    const margin = child.getComputedMargin();
    const intrinsic = child.measure(parentWidth, parentHeight);

    const childW = this.resolveDimension(child.styles.width, parentWidth, intrinsic.width);
    const childH = this.resolveDimension(child.styles.height, parentHeight, intrinsic.height);

    let x = padding.left + margin.left;
    let y = padding.top + margin.top;

    if (typeof child.styles.left === 'number') {
      x = child.styles.left + margin.left;
    } else if (typeof child.styles.right === 'number') {
      x = parentWidth - childW - child.styles.right - margin.right;
    }

    if (typeof child.styles.top === 'number') {
      y = child.styles.top + margin.top;
    } else if (typeof child.styles.bottom === 'number') {
      y = parentHeight - childH - child.styles.bottom - margin.bottom;
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
    if (typeof value === 'string' && value.endsWith('%')) {
      const pct = parseFloat(value);
      if (!isNaN(pct)) {
        return Math.max(0, (pct / 100) * parentDimension);
      }
    }
    return autoFallback;
  }
}
