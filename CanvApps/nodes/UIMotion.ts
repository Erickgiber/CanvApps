import { UIElement } from '../core/UIElement';
import { UIView } from './UIView';
import { UIText } from './UIText';
import { Motion } from '../animation/Motion';
import { VisualStyles } from '../types/style';

export type MotionAnimationType =
  | 'scale-in'
  | 'fade-in'
  | 'zoom-in'
  | 'slide-up'
  | 'slide-down'
  | 'cinematic-splash';

/**
 * Visual styling and animation options for UIMotion nodes.
 */
export interface MotionStyles extends VisualStyles {
  animation?: MotionAnimationType;
  duration?: number;
  entranceDuration?: number;
  hold?: number;
  holdDuration?: number;
  exitDuration?: number;
  delay?: number;
  autoPlay?: boolean;
  initialSpacing?: number;
}

/**
 * Declarative Motion Canvas Node for CanvApps.
 * Automates 60/120 FPS Retina scene entrances, cinematic splash intros, and smooth exit transitions.
 */
export class UIMotion extends UIView {
  private cancelFn: (() => void) | null = null;

  constructor(styles: MotionStyles = {}) {
    super({
      width: '100%',
      height: '100%',
      ...styles,
    });

    if (styles.autoPlay !== false && typeof window !== 'undefined') {
      setTimeout(() => this.play(), 16);
    }
  }

  /**
   * Starts or replays the configured animation sequence.
   */
  public play(): void {
    if (this.cancelFn) {
      this.cancelFn();
      this.cancelFn = null;
    }

    const styles = this.styles as MotionStyles;
    const animation = styles.animation ?? 'scale-in';
    const duration = styles.duration ?? styles.entranceDuration ?? 450;
    const hold = styles.hold ?? styles.holdDuration ?? 500;
    const exitDuration = styles.exitDuration ?? 340;
    const delay = styles.delay ?? 0;
    const initialSpacing = styles.initialSpacing ?? 24;

    if (animation === 'cinematic-splash') {
      this.cancelFn = Motion.splashSequence({
        entranceDuration: duration,
        holdDuration: hold,
        exitDuration,
        initialSpacing,
        onUpdate: (state) => {
          this.setStyle({
            scale: state.scale,
            opacity: state.opacity,
          });

          // Continuously update sub-pixel letter spacing on descendant UIText nodes
          const applyTextSpacing = (el: UIElement) => {
            if (el instanceof UIText) {
              el.setStyle({ letterSpacing: state.letterSpacing });
            }
            if (Array.isArray(el.children)) {
              el.children.forEach(applyTextSpacing);
            }
          };
          applyTextSpacing(this);

          this.emit('update', state);
        },
        onFinish: () => {
          this.emit('finish', {});
        },
      });
    } else {
      const type = animation === 'scale-in' ? 'scale' : animation === 'fade-in' ? 'fade' : animation;
      this.cancelFn = Motion.enter(this, {
        type: type as any,
        duration,
        delay,
        onComplete: () => {
          this.emit('finish', {});
        },
      });
    }
  }

  /**
   * Cancels any active running animation tween.
   */
  public cancel(): void {
    if (this.cancelFn) {
      this.cancelFn();
      this.cancelFn = null;
    }
  }
}
