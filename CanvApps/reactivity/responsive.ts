import { signal, Signal } from './Signal';

export interface ViewportBreakpoints {
  width: Signal<number>;
  height: Signal<number>;
  isMobile: Signal<boolean>;
  isTablet: Signal<boolean>;
  isDesktop: Signal<boolean>;
}

let globalBreakpoints: ViewportBreakpoints | null = null;

/**
 * Hook providing reactive window dimensions and responsive breakpoint signals.
 *
 * Automatically tracks window resize events and triggers reactive updates across
 * component layouts.
 */
export function useBreakpoints(): ViewportBreakpoints {
  if (globalBreakpoints) {
    return globalBreakpoints;
  }

  const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const initialHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  const width = signal(initialWidth);
  const height = signal(initialHeight);
  const isMobile = signal(initialWidth < 640);
  const isTablet = signal(initialWidth >= 640 && initialWidth < 1024);
  const isDesktop = signal(initialWidth >= 1024);

  if (typeof window !== 'undefined') {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      width.value = w;
      height.value = h;
      isMobile.value = w < 640;
      isTablet.value = w >= 640 && w < 1024;
      isDesktop.value = w >= 1024;
    };

    window.addEventListener('resize', onResize);
  }

  globalBreakpoints = { width, height, isMobile, isTablet, isDesktop };
  return globalBreakpoints;
}

/**
 * Evaluates any standard CSS media query string reactively.
 *
 * @param query CSS media query (e.g. '(max-width: 640px)' or '(orientation: landscape)')
 * @returns A reactive boolean signal.
 */
export function useMediaQuery(query: string): Signal<boolean> {
  const getInitialMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const matchSignal = signal(getInitialMatch());

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      matchSignal.value = e.matches;
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handler);
    }
  }

  return matchSignal;
}
