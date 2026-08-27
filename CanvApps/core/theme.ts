/**
 * Theme & Status Bar Color Management for CanvApps.
 *
 * Dynamically synchronizes HTML5 <meta name="theme-color">, <meta name="color-scheme">,
 * Apple mobile web app status bar, Windows tile colors, and document root backgrounds in real time
 * to match application themes across Desktop PWAs (macOS, Windows, Linux) and Mobile (iOS, Android).
 */

let currentThemeColor = '#f8fafc';
let currentThemeMode: string = 'light';
let registeredThemePalette: { light: string; dark: string; [key: string]: string } = {
  light: '#f8fafc',
  dark: '#101010',
};

/**
 * Determines whether a given color (HEX, RGB, or named) has a dark luminance.
 */
export function isColorDark(color: string): boolean {
  if (!color || color === 'transparent') return false;

  let r = 255;
  let g = 255;
  let b = 255;

  const hex = color.trim().replace('#', '');
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6 || hex.length === 8) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
  }

  // Calculate relative perceived luminance (ITU-R BT.709 standard)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
}

/**
 * Configures the default theme color palette for the application.
 *
 * @example
 * ```ts
 * configureThemePalette({
 *   light: '#ffffff',
 *   dark: '#0d1117',
 *   midnight: '#05050d',
 * });
 * ```
 */
export function configureThemePalette(palette: { light: string; dark: string; [key: string]: string }): void {
  registeredThemePalette = { ...registeredThemePalette, ...palette };
}

/**
 * Options for setting the active theme and status bar colors.
 */
export type ThemeColorInput = string | { light: string; dark: string; [key: string]: string };

/**
 * Sets the active status bar theme color and synchronizes all browser/OS window frame meta tags.
 *
 * Updates:
 * - `<meta name="theme-color">` (Android Chrome, modern iOS Safari 15+, desktop macOS/Windows PWA window titlebars)
 * - `<meta name="color-scheme">` (Signals dark/light window controls to desktop OS window managers)
 * - `<meta name="apple-mobile-web-app-status-bar-style">` (iOS standalone Web App status bar contrast)
 * - `<meta name="msapplication-navbutton-color">` & `<meta name="msapplication-TileColor">`
 * - `document.documentElement.style.backgroundColor` & `colorScheme`
 *
 * @param color Color string (e.g. '#101010') or theme palette object `{ light: '#...', dark: '#...' }`.
 * @param mode Explicit theme mode key ('light', 'dark', or custom mode).
 */
export function setThemeColor(
  color: ThemeColorInput = registeredThemePalette,
  mode?: string
): void {
  if (typeof document === 'undefined') {
    return;
  }

  let resolvedMode: string = mode || currentThemeMode;
  let resolvedColor: string;

  if (typeof color === 'string') {
    resolvedColor = color;
    resolvedMode = isColorDark(color) ? 'dark' : 'light';
  } else if (color && typeof color === 'object') {
    resolvedColor = color[resolvedMode] || (resolvedMode === 'dark' ? color.dark : color.light) || '#f8fafc';
  } else {
    resolvedColor = registeredThemePalette[resolvedMode] || '#f8fafc';
  }

  currentThemeColor = resolvedColor;
  currentThemeMode = resolvedMode;

  const isDark = isColorDark(resolvedColor);

  try {
    const existingMetas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    existingMetas.forEach((meta) => meta.remove());

    const newThemeMeta = document.createElement('meta');
    newThemeMeta.name = 'theme-color';
    newThemeMeta.setAttribute('content', resolvedColor);
    document.head.appendChild(newThemeMeta);
  } catch {
    // Ignore DOM head errors
  }

  try {
    let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (!colorSchemeMeta) {
      colorSchemeMeta = document.createElement('meta');
      colorSchemeMeta.name = 'color-scheme';
      document.head.appendChild(colorSchemeMeta);
    }
    colorSchemeMeta.setAttribute('content', isDark ? 'dark' : 'light');
  } catch {
    // Ignore DOM head errors
  }

  try {
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(appleMeta);
    }
    appleMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
  } catch {
    // Ignore DOM head errors
  }

  try {
    let msMeta = document.querySelector('meta[name="msapplication-navbutton-color"]') as HTMLMetaElement | null;
    if (!msMeta) {
      msMeta = document.createElement('meta');
      msMeta.name = 'msapplication-navbutton-color';
      document.head.appendChild(msMeta);
    }
    msMeta.setAttribute('content', resolvedColor);

    let tileMeta = document.querySelector('meta[name="msapplication-TileColor"]') as HTMLMetaElement | null;
    if (!tileMeta) {
      tileMeta = document.createElement('meta');
      tileMeta.name = 'msapplication-TileColor';
      document.head.appendChild(tileMeta);
    }
    tileMeta.setAttribute('content', resolvedColor);
  } catch {
    // Ignore DOM head errors
  }

  try {
    document.documentElement.style.backgroundColor = resolvedColor;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    if (document.body) {
      document.body.style.backgroundColor = resolvedColor;
      document.body.style.colorScheme = isDark ? 'dark' : 'light';
    }
  } catch {
    // Ignore DOM style errors
  }
}

/**
 * Returns the currently active theme color (e.g. '#101010' or '#f8fafc').
 */
export function getThemeColor(): string {
  return currentThemeColor;
}

/**
 * Returns the currently active theme mode (e.g. 'light' | 'dark').
 */
export function getThemeMode(): string {
  return currentThemeMode;
}
