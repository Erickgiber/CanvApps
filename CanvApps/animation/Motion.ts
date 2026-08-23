import { UIElement } from '../core/UIElement';
import { Easings, animate } from './Tween';

/**
 * Options for multi-phase cinematic splash screen animations.
 */
export interface SplashSequenceOptions {
  entranceDuration?: number; // default 720ms
  holdDuration?: number;     // default 500ms
  exitDuration?: number;     // default 340ms
  initialSpacing?: number;   // default 24px
  initialScale?: number;     // default 0.55
  exitScale?: number;        // default 0.68
  onUpdate?: (state: {
    scale: number;
    opacity: number;
    letterSpacing: number;
    subtitleOpacity: number;
  }) => void;
  onFinish?: () => void;
}

/**
 * Options for element entrance and exit scene transitions.
 */
export interface TransitionOptions {
  type?: 'fade' | 'scale' | 'zoom-in' | 'slide-up' | 'slide-down' | 'elastic';
  duration?: number;
  delay?: number;
  fromScale?: number;
  toScale?: number;
  fromOpacity?: number;
  toOpacity?: number;
  easing?: (t: number) => number;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

/**
 * Centralized High-Performance Motion & Animation Engine for CanvApps.
 * Provides hardware-timed 60/120 FPS transitions, spring physics, and declarative scene animators.
 */
export class Motion {
  /**
   * Hardware-timed 60/120 FPS Cinematic Splash Sequence Engine.
   * Handles sub-pixel letter convergence, elastic scale-in, illumination hold, and negative-scale exit.
   */
  public static splashSequence(options: SplashSequenceOptions = {}): () => void {
    if (typeof window === 'undefined') {
      options.onUpdate?.({
        scale: 1.0,
        opacity: 1.0,
        letterSpacing: 0,
        subtitleOpacity: 1.0,
      });
      options.onFinish?.();
      return () => {};
    }

    const {
      entranceDuration = 720,
      holdDuration = 500,
      exitDuration = 340,
      initialSpacing = 24,
      initialScale = 0.55,
      exitScale = 0.68,
      onUpdate,
      onFinish,
    } = options;

    const totalDuration = entranceDuration + holdDuration + exitDuration;
    const startTime = performance.now();
    let isCancelled = false;
    let rafId: number | null = null;

    function frame(now: number) {
      if (isCancelled) return;

      const elapsed = now - startTime;

      if (elapsed <= entranceDuration) {
        // Phase 1: Sub-pixel letter convergence, scale entrance, and opacity fade-in
        const t = Math.min(1, elapsed / entranceDuration);
        
        // Elastic Ease-Out Scale
        const c4 = (2 * Math.PI) / 3;
        const easedScale = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        const scale = initialScale + (1.0 - initialScale) * Math.min(1.04, Math.max(0, easedScale));

        // Opacity: 0 -> 1
        const opacity = Math.min(1, t * 1.6);

        // Sub-pixel Continuous Letter Convergence: initialSpacing -> 0px (60/120 FPS float)
        const easedSpacing = 1 - Math.pow(1 - t, 3);
        const continuousSpacing = Math.max(0, initialSpacing * (1 - easedSpacing));
        const letterSpacing = Number(continuousSpacing.toFixed(2));

        // Subtitle Fade-in halfway through
        const subtitleOpacity = t > 0.45 ? Math.min(1, (t - 0.45) / 0.55) : 0;

        onUpdate?.({ scale, opacity, letterSpacing, subtitleOpacity });
        rafId = requestAnimationFrame(frame);
      } else if (elapsed <= entranceDuration + holdDuration) {
        // Phase 2: Hold with glowing illumination
        onUpdate?.({ scale: 1.0, opacity: 1.0, letterSpacing: 0, subtitleOpacity: 1.0 });
        rafId = requestAnimationFrame(frame);
      } else if (elapsed <= totalDuration) {
        // Phase 3: Negative Scale Exit Transition (scale 1.0 -> exitScale, opacity 1.0 -> 0.0)
        const exitElapsed = elapsed - (entranceDuration + holdDuration);
        const t = Math.min(1, exitElapsed / exitDuration);
        
        // Ease-In-Cubic zoom out
        const exitEased = t * t * t;
        const scale = Math.max(exitScale, 1.0 - (1.0 - exitScale) * exitEased);
        const opacity = Math.max(0, 1.0 - exitEased);
        const subtitleOpacity = Math.max(0, 1.0 - exitEased * 1.2);

        onUpdate?.({ scale, opacity, letterSpacing: 0, subtitleOpacity });
        rafId = requestAnimationFrame(frame);
      } else {
        // Completed: Reveal target scene
        onUpdate?.({ scale: exitScale, opacity: 0, letterSpacing: 0, subtitleOpacity: 0 });
        onFinish?.();
      }
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      isCancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  /**
   * Plays a smooth entrance animation on a Canvas element or view hierarchy.
   */
  public static enter(element: UIElement, options: TransitionOptions = {}): () => void {
    const {
      type = 'scale',
      duration = 450,
      delay = 0,
      fromOpacity = 0.0,
      toOpacity = 1.0,
      easing = Easings.easeOutCubic,
      onComplete,
    } = options;

    const defaultFromScale = type === 'fade' ? 1.0 : type === 'zoom-in' ? 0.8 : 0.94;
    const fromScale = options.fromScale ?? defaultFromScale;
    const toScale = options.toScale ?? 1.0;

    if (typeof window === 'undefined') {
      element.setStyle({ opacity: toOpacity, scale: toScale, display: 'flex' });
      element.visible = true;
      onComplete?.();
      return () => {};
    }

    // Set initial pre-animation state
    element.setStyle({ opacity: fromOpacity, scale: fromScale, display: 'flex' });
    element.visible = true;

    let cancelTimer: any = null;
    let cancelTween: (() => void) | null = null;

    const startTween = () => {
      cancelTween = animate({
        from: 0,
        to: 1,
        duration,
        easing,
        onUpdate: (progress) => {
          const currentOpacity = fromOpacity + (toOpacity - fromOpacity) * progress;
          const currentScale = fromScale + (toScale - fromScale) * progress;
          element.setStyle({ opacity: currentOpacity, scale: currentScale });
        },
        onComplete: () => {
          element.setStyle({ opacity: toOpacity, scale: toScale });
          onComplete?.();
        },
      });
    };

    if (delay > 0) {
      cancelTimer = setTimeout(startTween, delay);
    } else {
      startTween();
    }

    return () => {
      if (cancelTimer) clearTimeout(cancelTimer);
      if (cancelTween) cancelTween();
    };
  }

  /**
   * Plays a smooth exit animation on a Canvas element or view hierarchy.
   */
  public static exit(element: UIElement, options: TransitionOptions = {}): () => void {
    const {
      type = 'scale',
      duration = 320,
      fromScale = 1.0,
      fromOpacity = 1.0,
      toOpacity = 0.0,
      easing = Easings.easeInOutCubic,
      onComplete,
    } = options;

    const toScale = options.toScale ?? (type === 'fade' ? 1.0 : 0.92);

    if (typeof window === 'undefined') {
      element.setStyle({ opacity: toOpacity, scale: toScale, display: 'none' });
      element.visible = false;
      onComplete?.();
      return () => {};
    }

    return animate({
      from: 0,
      to: 1,
      duration,
      easing,
      onUpdate: (progress) => {
        const currentOpacity = fromOpacity + (toOpacity - fromOpacity) * progress;
        const currentScale = fromScale + (toScale - fromScale) * progress;
        element.setStyle({ opacity: currentOpacity, scale: currentScale });
      },
      onComplete: () => {
        element.setStyle({ opacity: toOpacity, scale: toScale, display: 'none' });
        element.visible = false;
        onComplete?.();
      },
    });
  }
}
