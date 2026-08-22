/**
 * Represents a point in 2D coordinate space.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents dimensions of a rectangular area.
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Represents a 2D bounding rectangle.
 */
export interface Rect extends Point, Size {}

/**
 * Represents 4-directional box model offsets (padding, margin, border).
 */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
