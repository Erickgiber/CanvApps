import { signal, Signal } from '../reactivity/Signal';

/**
 * 4-directional safe area insets in logical CSS pixels.
 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Reactive safe area signals matching device notch, status bar, and home indicators.
 */
export interface ReactiveSafeArea {
  top: Signal<number>;
  right: Signal<number>;
  bottom: Signal<number>;
  left: Signal<number>;
  insets: Signal<SafeAreaInsets>;
}

let probeElement: HTMLElement | null = null;
let currentInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
let reactiveSafeArea: ReactiveSafeArea | null = null;
let isInitialized = false;

/**
 * Ensures the invisible DOM probe element is mounted to compute CSS env(safe-area-inset-*).
 */
export function initSafeAreaProbe(): void {
  if (typeof document === 'undefined' || isInitialized) {
    return;
  }

  isInitialized = true;

  if (!probeElement) {
    probeElement = document.createElement('div');
    probeElement.id = 'canvapps-safe-area-probe';
    probeElement.setAttribute('aria-hidden', 'true');
    Object.assign(probeElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      paddingTop: 'max(env(safe-area-inset-top, 0px), env(titlebar-area-height, 0px))',
      paddingRight: 'max(env(safe-area-inset-right, 0px), env(titlebar-area-width, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'max(env(safe-area-inset-left, 0px), env(titlebar-area-x, 0px))',
      visibility: 'hidden',
      pointerEvents: 'none',
      zIndex: '-99999',
    });

    if (document.body) {
      document.body.appendChild(probeElement);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (probeElement && !probeElement.parentElement) {
          document.body.appendChild(probeElement);
          updateSafeArea();
        }
      });
    }
  }

  updateSafeArea();

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateSafeArea);
    }
  }
}

/**
 * Reads the latest computed CSS safe area insets and updates signals.
 */
export function updateSafeArea(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return currentInsets;
  }

  if (!probeElement && document.body) {
    initSafeAreaProbe();
  }

  if (probeElement) {
    try {
      const computed = window.getComputedStyle(probeElement);
      const top = parseFloat(computed.paddingTop) || 0;
      const right = parseFloat(computed.paddingRight) || 0;
      const bottom = parseFloat(computed.paddingBottom) || 0;
      const left = parseFloat(computed.paddingLeft) || 0;

      currentInsets = { top, right, bottom, left };

      if (reactiveSafeArea) {
        reactiveSafeArea.top.value = top;
        reactiveSafeArea.right.value = right;
        reactiveSafeArea.bottom.value = bottom;
        reactiveSafeArea.left.value = left;
        reactiveSafeArea.insets.value = { ...currentInsets };
      }
    } catch {
      // Fallback
    }
  }

  return currentInsets;
}

/**
 * Synchronously retrieves the current safe area insets in logical pixels.
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (!isInitialized && typeof document !== 'undefined') {
    initSafeAreaProbe();
  }
  return currentInsets;
}

/**
 * Hook providing fine-grained reactive signals for device safe area insets.
 *
 * Automatically tracks orientation changes, notches, status bars, and home indicators.
 */
export function useSafeArea(): ReactiveSafeArea {
  if (reactiveSafeArea) {
    return reactiveSafeArea;
  }

  initSafeAreaProbe();

  const top = signal(currentInsets.top);
  const right = signal(currentInsets.right);
  const bottom = signal(currentInsets.bottom);
  const left = signal(currentInsets.left);
  const insets = signal({ ...currentInsets });

  reactiveSafeArea = { top, right, bottom, left, insets };
  return reactiveSafeArea;
}
