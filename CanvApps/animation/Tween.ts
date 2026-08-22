/**
 * Standard easing functions for smooth 60-120fps UI animations.
 */
export const Easings = {
  linear: (t: number): number => t,
  easeOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export interface AnimationOptions {
  from: number;
  to: number;
  duration?: number;
  easing?: (t: number) => number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

/**
 * Executes a hardware-timed requestAnimationFrame tween.
 *
 * @param options Animation parameters and callbacks.
 * @returns A cancel function to abort the animation early.
 */
export function animate(options: AnimationOptions): () => void {
  const {
    from,
    to,
    duration = 300,
    easing = Easings.easeOutCubic,
    onUpdate,
    onComplete,
  } = options;

  if (typeof window === 'undefined') {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  let rafId: number | null = null;
  const startTime = performance.now();

  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easing(progress);
    const currentValue = from + (to - from) * eased;

    onUpdate(currentValue);

    if (progress < 1) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      onUpdate(to);
      onComplete?.();
    }
  }

  rafId = window.requestAnimationFrame(tick);

  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}
