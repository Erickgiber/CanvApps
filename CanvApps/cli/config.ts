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
