import { persistentSignal, computed } from '@canvapps';
import { soundManager } from '../utils/sound';
import type { Locale, TranslationSchema } from './types';
import { es } from './es';
import { en } from './en';

export * from './types';
export { es, en };

const dictionaries: Record<Locale, TranslationSchema> = {
  en,
  es,
};

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('canvapps_locale');
      if (saved === 'es' || saved === 'en') {
        return saved;
      }
    } catch {
      // Fallback
    }
  }
  return 'en';
}

/**
 * Reactive Signal with localStorage persistence for current active locale (defaults to 'en')
 */
export const currentLocale = persistentSignal<Locale>('canvapps_locale', getInitialLocale());

/**
 * Reactive Computed Translation Dictionary (Updates at 120 FPS when currentLocale changes)
 */
export const t = computed<TranslationSchema>(() => {
  const loc = currentLocale.value;
  return dictionaries[loc] || dictionaries.en;
});

/**
 * Sets the active locale ('en' | 'es')
 */
export function setLocale(locale: Locale): void {
  if (locale === 'es' || locale === 'en') {
    currentLocale.value = locale;
    soundManager.playChime();
  }
}

/**
 * Toggles between English and Spanish
 */
export function toggleLocale(): void {
  const next = currentLocale.value === 'en' ? 'es' : 'en';
  currentLocale.value = next;
  soundManager.playChime();
}
