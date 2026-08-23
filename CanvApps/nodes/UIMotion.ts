import { UIElement } from '../core/UIElement';
import { UIView } from './UIView';
import { UIText } from './UIText';
import { Motion, MotionEnterType, MotionExitType } from '../animation/Motion';
import { VisualStyles } from '../types/style';

export type MotionAnimationType =
  | 'scale-in'
  | 'fade-in'
  | 'zoom-in'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'elastic'
  | 'cinematic-splash';

/**
 * Visual styling and animation options for UIMotion nodes.
 */
export interface MotionStyles extends VisualStyles {
  animation?: MotionAnimationType | string;
  enter?: MotionEnterType | string;
  exit?: MotionExitType | string;
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
 * Automates 60/120 FPS Retina scene entrances, slide-ins, cinematic splash intros,
 * and smooth hardware-accelerated exit transitions.
 */
export class UIMotion extends UIView {
  private cancelFn: (() => void) | null = null;

  constructor(styles: MotionStyles = {}) {
    super({
      width: '100%',
      ...styles,
    });

    if (styles.autoPlay !== false && typeof window !== 'undefined') {
      setTimeout(() => this.play(), 16);
    }
  }

  /**
   * Starts or replays the configured animation sequence.
   */
  public play(onDone?: () => void): void {
    if (this.cancelFn) {
      this.cancelFn();
      this.cancelFn = null;
    }

    const styles = this.styles as MotionStyles;
    const enterType = styles.enter ?? styles.animation ?? 'scale-in';
    const duration = styles.duration ?? styles.entranceDuration ?? 450;
    const hold = styles.hold ?? styles.holdDuration ?? 500;
    const exitDuration = styles.exitDuration ?? 340;
    const delay = styles.delay ?? 0;
    const initialSpacing = styles.initialSpacing ?? 26;

    if (enterType === 'cinematic-splash') {
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
          onDone?.();
        },
      });
    } else {
      const type = enterType === 'scale-in' ? 'scale' : enterType === 'fade-in' ? 'fade' : enterType;
      this.cancelFn = Motion.enter(this, {
        type: type as any,
        duration,
        delay,
        onComplete: () => {
          this.emit('finish', {});
          onDone?.();
        },
      });
    }
  }

  /**
   * Plays a hardware exit transition on this motion node.
   */
  public exit(type?: MotionExitType | string, duration?: number, onDone?: () => void): void {
    if (this.cancelFn) {
      this.cancelFn();
      this.cancelFn = null;
    }

    const styles = this.styles as MotionStyles;
    const exitType = type ?? styles.exit ?? styles.animation ?? 'slide-left';
    const exitDur = duration ?? styles.exitDuration ?? 320;

    this.cancelFn = Motion.exit(this, {
      type: exitType as any,
      duration: exitDur,
      onComplete: () => {
        this.emit('exitFinish', {});
        onDone?.();
      },
    });
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
