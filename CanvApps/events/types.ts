import { UIElement } from '../core/UIElement';

/**
 * Supported pointer and interaction event types.
 */
export type UIEventType =
  | 'pointerdown'
  | 'pointerup'
  | 'pointermove'
  | 'pointerenter'
  | 'pointerleave'
  | 'pointerover'
  | 'pointerout'
  | 'pointercancel'
  | 'click'
  | 'dblclick'
  | 'hover'
  | 'wheel'
  | 'scroll'
  | 'focus'
  | 'blur'
  | 'keydown'
  | 'keyup'
  | 'keypress'
  | 'input'
  | 'change'
  | 'submit'
  | 'close'
  | 'update'
  | 'finish'
  | 'exitFinish';

/**
 * Event object passed to CanvApps pointer event listeners.
 */
export class CanvasPointerEvent {
  /**
   * The element that originally dispatched the event (the hit element).
   */
  public target: UIElement;

  /**
   * The element currently handling the event during propagation.
   */
  public currentTarget: UIElement;

  /**
   * Event type identifier.
   */
  public readonly type: UIEventType;

  /**
   * X coordinate in canvas logical CSS pixel space.
   */
  public readonly x: number;

  /**
   * Y coordinate in canvas logical CSS pixel space.
   */
  public readonly y: number;

  /**
   * Raw client X coordinate from the native browser event.
   */
  public readonly clientX: number;

  /**
   * Raw client Y coordinate from the native browser event.
   */
  public readonly clientY: number;

  /**
   * Mouse button index (0 = primary, 1 = middle, 2 = secondary).
   */
  public readonly button: number;

  /**
   * Bitmask of active mouse buttons.
   */
  public readonly buttons: number;

  /**
   * Modifier key states.
   */
  public readonly ctrlKey: boolean;
  public readonly shiftKey: boolean;
  public readonly altKey: boolean;
  public readonly metaKey: boolean;

  /**
   * Pointer device type (mouse, touch, pen).
   */
  public readonly pointerType: string;

  /**
   * Native underlying browser event.
   */
  public readonly nativeEvent: Event;

  /**
   * Scroll offsets and deltas (populated for scroll/wheel events).
   */
  public scrollTop?: number;
  public scrollLeft?: number;
  public scrollY?: number;
  public scrollX?: number;
  public deltaX?: number;
  public deltaY?: number;

  private _propagationStopped = false;
  private _defaultPrevented = false;

  constructor(
    type: UIEventType,
    target: UIElement,
    nativeEvent: PointerEvent | MouseEvent | TouchEvent | WheelEvent | Event,
    canvasX: number = 0,
    canvasY: number = 0
  ) {
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.x = canvasX;
    this.y = canvasY;
    this.nativeEvent = nativeEvent;

    if (nativeEvent && 'clientX' in nativeEvent) {
      this.clientX = (nativeEvent as MouseEvent).clientX;
      this.clientY = (nativeEvent as MouseEvent).clientY;
      this.button = (nativeEvent as MouseEvent).button ?? 0;
      this.buttons = (nativeEvent as MouseEvent).buttons ?? 0;
      this.ctrlKey = (nativeEvent as MouseEvent).ctrlKey ?? false;
      this.shiftKey = (nativeEvent as MouseEvent).shiftKey ?? false;
      this.altKey = (nativeEvent as MouseEvent).altKey ?? false;
      this.metaKey = (nativeEvent as MouseEvent).metaKey ?? false;
      this.pointerType = (nativeEvent as PointerEvent).pointerType || 'mouse';
    } else if (nativeEvent && 'touches' in nativeEvent) {
      const touch = (nativeEvent as TouchEvent).touches[0] || (nativeEvent as TouchEvent).changedTouches[0];
      this.clientX = touch?.clientX ?? 0;
      this.clientY = touch?.clientY ?? 0;
      this.button = 0;
      this.buttons = 1;
      this.ctrlKey = false;
      this.shiftKey = false;
      this.altKey = false;
      this.metaKey = false;
      this.pointerType = 'touch';
    } else {
      this.clientX = 0;
      this.clientY = 0;
      this.button = 0;
      this.buttons = 0;
      this.ctrlKey = false;
      this.shiftKey = false;
      this.altKey = false;
      this.metaKey = false;
      this.pointerType = 'custom';
    }
  }

  /**
   * Prevents further propagation of the current event along the UI tree hierarchy.
   */
  public stopPropagation(): void {
    this._propagationStopped = true;
  }

  /**
   * Prevents default browser handling for the native event.
   */
  public preventDefault(): void {
    this._defaultPrevented = true;
    if (this.nativeEvent && typeof this.nativeEvent.preventDefault === 'function') {
      this.nativeEvent.preventDefault();
    }
  }

  public get isPropagationStopped(): boolean {
    return this._propagationStopped;
  }

  public get isDefaultPrevented(): boolean {
    return this._defaultPrevented;
  }
}

/**
 * Event handler callback signature.
 */
export type CanvasEventListener<T = CanvasPointerEvent> = (event: T) => void;
