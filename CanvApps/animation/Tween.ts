import { Engine } from '../core/Engine';

/**
 * Standard & advanced easing functions for ultra-fluid 60/120fps UI animations and physics.
 */
export const Easings = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  easeOutExpo: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  fluidOut: (t: number): number => 1 - Math.pow(1 - t, 3.5),
  easeOutBack: (t: number, overshoot = 1.70158): number => {
    const c1 = overshoot;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  elasticOut: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

export interface AnimationOptions {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export function animate(options: AnimationOptions): () => void {
  const {
    from,
    to,
    duration = 300,
    delay = 0,
    easing = Easings.easeOutCubic,
    onUpdate,
    onComplete,
  } = options;

  if (typeof window === 'undefined' || duration <= 0) {
    onUpdate(to);
    Engine.invalidateActive();
    onComplete?.();
    return () => {};
  }

  let isCancelled = false;
  let rafId: number | null = null;
  let delayTimer: any = null;
  let startTime = 0;

  function tick(now: number) {
    if (isCancelled) return;

    if (startTime === 0) {
      startTime = now;
    }

    const elapsed = now - startTime;
    const rawProgress = Math.max(0, Math.min(1, elapsed / duration));
    const eased = easing(rawProgress);
    const currentValue = from + (to - from) * eased;

    onUpdate(currentValue);
    Engine.invalidateActive();

    if (rawProgress < 1) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      onUpdate(to);
      Engine.invalidateActive();
      onComplete?.();
    }
  }

  const start = () => {
    if (isCancelled) return;
    rafId = window.requestAnimationFrame(tick);
  };

  if (delay > 0) {
    delayTimer = setTimeout(start, delay);
  } else {
    start();
  }

  return () => {
    isCancelled = true;
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}
