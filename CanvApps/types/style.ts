/**
 * Supported display types in the layout engine.
 */
export type DisplayMode = 'flex' | 'none';

/**
 * Positioning strategy for an element relative to its parent container.
 */
export type PositionType = 'relative' | 'absolute';

/**
 * Direction in which flex items are placed in the flex container.
 */
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

/**
 * Alignment of items along the main axis of the flex container.
 */
export type JustifyContent =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

/**
 * Alignment of items along the cross axis inside the flex container.
 */
export type AlignItems = 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

/**
 * Overrides default alignment along the cross axis for an individual item.
 */
export type AlignSelf = 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';

/**
 * Controls whether flex items wrap onto multiple lines.
 */
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

/**
 * Defines dimensional values (pixels, auto, or percentage strings).
 */
export type DimensionValue = number | 'auto' | `${number}%`;

/**
 * Box-shadow visual configuration.
 */
export interface BoxShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  color: string;
}

/**
 * Border configuration for rendering rectangular or rounded nodes.
 */
export interface Border {
  width: number;
  color: string;
  style?: 'solid' | 'dashed';
}

/**
 * Corner radii configuration [topLeft, topRight, bottomRight, bottomLeft] or uniform radius.
 */
export type BorderRadius = number | [number, number, number, number];

/**
 * Layout and box-model style properties handled by the layout engine.
 */
export interface LayoutStyles {
  id?: string;
  display?: DisplayMode;
  position?: PositionType;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignSelf?: AlignSelf;
  flexWrap?: FlexWrap;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: DimensionValue;
  gap?: number;
  rowGap?: number;
  columnGap?: number;

  padding?: number | [number, number] | [number, number, number, number];
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  margin?: number | [number, number] | [number, number, number, number];
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  zIndex?: number;
}

/**
 * Visual styling properties used during Canvas 2D paint passes.
 */
export interface VisualStyles extends LayoutStyles {
  backgroundColor?: string;
  opacity?: number;
  scale?: number;
  letterSpacing?: number;
  borderRadius?: BorderRadius;
  border?: Border;
  borderColor?: string;
  borderWidth?: number;
  boxShadow?: BoxShadow;
  overflow?: 'visible' | 'hidden';
  cursor?: string;

  // Animation & Motion Properties
  animation?: string;
  enter?: 'scale' | 'fade' | 'zoom-in' | 'slide-up' | 'slide-down' | 'cinematic-splash';
  duration?: number;
  entranceDuration?: number;
  hold?: number;
  holdDuration?: number;
  exitDuration?: number;
  delay?: number;
  autoPlay?: boolean;
  initialSpacing?: number;
  animated?: boolean;

  // Modal & Overlay Backdrop Properties
  backdropColor?: string;
  backdropColors?: [string, string];
  gradient?: boolean;
  backdropGradient?: boolean;
  blur?: boolean;
  blurBackdrop?: boolean;
  blurRadius?: number;
  closeOnBackdropClick?: boolean;
}
