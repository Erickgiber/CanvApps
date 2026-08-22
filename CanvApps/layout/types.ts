import { UIElement } from '../core/UIElement';

/**
 * Internal representation of a flex line during multi-line or single-line flex calculation.
 */
export interface FlexLine {
  items: UIElement[];
  mainSize: number;
  crossSize: number;
  crossOffset: number;
  flexGrowSum: number;
  flexShrinkSum: number;
}

/**
 * Axis coordinate mapping helper to unify Row and Column calculations.
 */
export interface AxisHelper {
  mainSize: (el: UIElement) => number;
  crossSize: (el: UIElement) => number;
  mainMarginStart: (el: UIElement) => number;
  mainMarginEnd: (el: UIElement) => number;
  crossMarginStart: (el: UIElement) => number;
  crossMarginEnd: (el: UIElement) => number;
  containerMainPaddingStart: number;
  containerMainPaddingEnd: number;
  containerCrossPaddingStart: number;
  containerCrossPaddingEnd: number;
  containerInnerMainSize: number;
  containerInnerCrossSize: number;
  isRow: boolean;
  isReverse: boolean;
}
