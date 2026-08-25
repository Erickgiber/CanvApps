/**
 * Supported deployment targets.
 */
export type BuildTarget = 'SPA' | 'PWA' | 'CAPACITOR';

/**
 * PWA specific configuration options.
 */
export interface PWAConfig {
  name?: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?: 'any' | 'natural' | 'landscape' | 'portrait';
  scope?: string;
  startUrl?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  offlineCache?: boolean;
  cachePatterns?: string[];
}

/**
 * Capacitor JS native mobile configuration options.
 */
export interface CapacitorConfig {
  appId?: string;
  appName?: string;
  webDir?: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
    url?: string;
    cleartext?: boolean;
  };
  android?: {
    minSdkVersion?: number;
    targetSdkVersion?: number;
    allowMixedContent?: boolean;
  };
  ios?: {
    contentInset?: 'automatic' | 'never' | 'always';
    scheme?: string;
  };
  plugins?: Record<string, any>;
}

/**
 * CanvApps master multi-target project configuration.
 */
export interface CanvAppsConfig {
  /**
   * Deployment target: Single Page Application (SPA), Progressive Web App (PWA), or Native Mobile (CAPACITOR).
   * Defaults to 'SPA' (clean standard web build with zero PWA or Capacitor overhead).
   */
  target?: BuildTarget;

  /**
   * Application title displayed in titlebar / browser tab.
   */
  title?: string;

  /**
   * Build output directory.
   */
  outDir?: string;

  /**
   * Whether to inject the official CanvApps open-source build watermark comments into final application bundles and HTML.
   * Defaults to true. Set to false to disable auto-generated watermark banners.
   */
  banner?: boolean;

  /**
   * Global text selection strategy. If true, all text nodes are selectable by default.
   * Defaults to false (only nodes with selectable="true" are mounted in Ghost DOM).
   */
  selectable?: boolean;

  /**
   * Automatic Safe Area Insets (Notch / Dynamic Island / Status Bar) support.
   * When enabled (default: true), CanvApps measures environment safe area insets
   * and allows elements with `safeArea="top"`, `safeArea="all"`, etc., to adapt seamlessly.
   */
  safeArea?: boolean;

  /**
   * Theme Color and Status Bar color management.
   * When enabled (default: true), automatically synchronizes <meta name="theme-color">,
   * Apple mobile web app status bar style, and document background with app theme.
   * Can be a boolean, a single color string (e.g. '#090d16'), or an object with light/dark values:
   * `{ light: '#ffffff', dark: '#090d16' }`.
   */
  themeColor?: boolean | string | { light: string; dark: string };

  /**
   * Mobile status bar configuration.
   */
  statusBar?: {
    /**
     * Status bar appearance: 'light' (white icons), 'dark' (dark icons), 'auto' (tracks theme), or 'translucent'.
     */
    style?: 'light' | 'dark' | 'auto' | 'translucent';
    /**
     * Whether the canvas renders edge-to-edge under the status bar (default: true).
     */
    overlay?: boolean;
  };

  /**
   * PWA metadata and service worker generation options.
   */
  pwa?: PWAConfig;


  /**
   * Capacitor native container configuration.
   */
  capacitor?: CapacitorConfig;
}

/**
 * Type-safe helper for configuring `canvapps.config.ts`.
 */
export function defineConfig(config: CanvAppsConfig): CanvAppsConfig {
  return config;
}
