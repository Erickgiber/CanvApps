import { createStore, signal, computed, setThemeColor, Engine, SmartAnimate } from '@canvapps';
import { soundManager } from '../utils/sound';

/**
 * User Profile & Session State Model
 */
export interface UserSessionState {
  user: {
    name: string;
    email: string;
    role: string;
    avatar: string;
  } | null;
  isAuthenticated: boolean;
  theme: 'dark' | 'light';
  isSoundEnabled: boolean;
  streakCount: number;
  lastLogin: string | null;
  activeRoute: string;
}

/**
 * Automatically detects repository base path (e.g. '/CanvApps' on GitHub Pages)
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') return '';
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  if (window.location.hostname.endsWith('github.io') && pathSegments.length > 0) {
    return '/' + pathSegments[0];
  }
  return '';
}

/**
 * Normalizes any route string with leading slash and strips base path
 */
export function normalizeRoutePath(route: string): string {
  if (!route) return '/';
  let clean = route.split('?')[0].split('#')[0];
  const base = getBasePath();
  if (base && clean.startsWith(base)) {
    clean = clean.slice(base.length);
  }
  if (!clean || clean === '/') return '/';
  const withLeading = clean.startsWith('/') ? clean : `/${clean}`;
  return withLeading.endsWith('/') && withLeading.length > 1 ? withLeading.slice(0, -1) : withLeading;
}

/**
 * Dynamically resolves initial route from browser URL, search queries, or hash
 */
function getInitialRoute(): string {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) {
      return normalizeRoutePath(hash);
    }

    const pathname = window.location.pathname;
    const cleanPath = normalizeRoutePath(pathname);
    if (cleanPath && cleanPath !== '/') {
      return cleanPath;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const pParam = params.get('p') || params.get('route');
      if (pParam) {
        return normalizeRoutePath(pParam);
      }
    } catch {
      // Fallback
    }

    if (cleanPath) {
      return cleanPath;
    }
  }
  return '/';
}

/**
 * Retrieves the persisted theme preference from localStorage.
 */
function getInitialTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('canvapps_theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // Fallback on restricted storage environments
    }
  }
  return 'light';
}

/**
 * Initial Default Session State with a handsome fictional test user
 */
const initialSessionState: UserSessionState = {
  user: {
    name: 'Julian Vance',
    email: 'julian.vance@canvapps.dev',
    role: 'Principal Engineer',
    avatar: '👨‍💼',
  },
  isAuthenticated: true,
  theme: getInitialTheme(),
  isSoundEnabled: typeof window !== 'undefined' ? soundManager.isSoundEnabled() : true,
  streakCount: 10,
  lastLogin: new Date().toISOString(),
  activeRoute: getInitialRoute(),
};

/**
 * Global In-Memory Reactive Session Store.
 * Holds active runtime state across components in memory.
 */
export const sessionStore = createStore<UserSessionState>(initialSessionState, {
  name: 'user_session',
  persist: false,
});

/**
 * Reactive signal representing current active route URL for instantaneous scene switching
 */
export const currentRoute = signal<string>(getInitialRoute());

// Automatically persist theme changes to localStorage and update status bar meta tags
if (typeof window !== 'undefined') {
  // Sync initial status bar theme color
  setThemeColor({ light: '#f8fafc', dark: '#080c14' }, sessionStore.state.theme);

  sessionStore.select('theme').subscribe((theme) => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('canvapps_theme', theme);
      } catch {
        // Ignore quota errors
      }
    }
    // Dynamically update browser/OS status bar theme color
    setThemeColor({ light: '#f8fafc', dark: '#080c14' }, theme);
  });

  // Synchronize browser history and hash navigation dynamically
  const syncRouteFromLocation = () => {
    const current = getInitialRoute();
    if (currentRoute.value !== current) {
      SmartAnimate.snapshot(Engine.getActiveRoot());
      currentRoute.value = current;
      if (sessionStore.state.activeRoute !== current) {
        sessionStore.update((prev) => ({ ...prev, activeRoute: current }));
      }
      updateDocumentTitle(current);
      Engine.invalidateActive();
      requestAnimationFrame(() => {
        SmartAnimate.prepare(Engine.getActiveRoot(), 350);
      });
    }
  };

  window.addEventListener('popstate', syncRouteFromLocation);
  window.addEventListener('hashchange', syncRouteFromLocation);
  window.addEventListener('canvapps:navigate', (e: any) => {
    if (e && e.detail && e.detail.href) {
      navigateRoute(e.detail.href, true, Boolean(e.detail.replace));
    }
  });

  // Initial title synchronization on load
  updateDocumentTitle(currentRoute.value);
}

/**
 * Updates document.title reactively based on active route
 */
export function updateDocumentTitle(route?: string): void {
  if (typeof document === 'undefined') return;
  const path = normalizeRoutePath(route || currentRoute.value);
  if (path === '/') {
    document.title = 'CanvApps - Canvas UI Framework';
  } else if (path === '/docs') {
    document.title = 'CanvApps - Documentation';
  } else if (path === '/showcases') {
    document.title = 'CanvApps - Showcases';
  } else if (path === '/gallery' || path === '/showcases/gallery') {
    document.title = 'CanvApps - Visual Gallery';
  } else if (path.startsWith('/gallery/') || path.startsWith('/showcases/gallery/')) {
    document.title = 'CanvApps - Artwork Details';
  } else if (path.startsWith('/music') || path.startsWith('/showcases/music')) {
    document.title = 'CanvApps - Music Player';
  } else {
    document.title = 'CanvApps - Canvas UI Framework';
  }
}


/**
 * Computed signal derived from the global store
 */
export const isUserLoggedIn = computed(() => sessionStore.state.isAuthenticated);

/**
 * Store Action: Navigates dynamically to ANY target route URL preserving repository base path
 */
export function navigateRoute(route: string, playSound = true, replace = false): void {
  const target = normalizeRoutePath(route);
  if (playSound && target !== currentRoute.value) {
    soundManager.playSwoosh();
  }

  // 1. Snapshot layoutId positions before switching
  SmartAnimate.snapshot(Engine.getActiveRoot());

  // 2. Perform route transition
  currentRoute.value = target;
  sessionStore.update((prev) => ({
    ...prev,
    activeRoute: target,
  }));
  updateDocumentTitle(target);

  Engine.invalidateActive();

  // 3. Prepare SmartAnimate smooth morphing on next RAF
  requestAnimationFrame(() => {
    SmartAnimate.prepare(Engine.getActiveRoot(), 350);
  });

  if (typeof window !== 'undefined' && window.history) {
    try {
      const base = getBasePath();
      const fullUrl = base ? (target === '/' ? `${base}/` : `${base}${target}`) : (target || '/');
      const currentFull = window.location.pathname + window.location.search + window.location.hash;
      if (currentFull !== fullUrl) {
        if (replace) {
          window.history.replaceState(null, '', fullUrl);
        } else {
          window.history.pushState(null, '', fullUrl);
        }
      }
    } catch {
      // Fallback
    }
  }
}

/**
 * Store Action: Updates the active user profile
 */
export function updateProfile(name: string, email: string): void {
  sessionStore.update((prev) => ({
    ...prev,
    user: prev.user ? { ...prev.user, name, email } : null,
  }));
}

/**
 * Store Action: Logs out the current user and clears session
 */
export function logoutSession(): void {
  sessionStore.set({
    user: null,
    isAuthenticated: false,
    streakCount: 0,
  });
}

/**
 * Store Action: Increments user streak counter
 */
export function incrementSessionStreak(): void {
  sessionStore.update((prev) => ({
    ...prev,
    streakCount: prev.streakCount + 1,
  }));
}

/**
 * Store Action: Toggles the application global theme (light / dark)
 */
export function toggleTheme(): void {
  const current = sessionStore.state.theme;
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  soundManager.playClick(600);
  sessionStore.update((prev) => ({
    ...prev,
    theme: nextTheme,
  }));
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('canvapps_theme', nextTheme);
    } catch {
      // Ignore quota error
    }
  }
  setThemeColor({ light: '#f8fafc', dark: '#080c14' }, nextTheme);
  Engine.invalidateActive();
}

/**
 * Store Action: Explicitly sets application global theme
 */
export function setTheme(theme: 'dark' | 'light'): void {
  sessionStore.update((prev) => ({
    ...prev,
    theme,
  }));
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('canvapps_theme', theme);
    } catch {
      // Ignore quota error
    }
  }
  setThemeColor({ light: '#f8fafc', dark: '#080c14' }, theme);
  Engine.invalidateActive();
}

/**
 * Store Action: Toggles global sound effects
 */
export function toggleGlobalSound(): boolean {
  const next = soundManager.toggleSound();
  sessionStore.update((prev) => ({
    ...prev,
    isSoundEnabled: next,
  }));
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('canvapps_sound_enabled', String(next));
    } catch {
      // Ignore quota error
    }
  }
  Engine.invalidateActive();
  return next;
}

