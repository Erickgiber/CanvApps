import { createStore, computed, setThemeColor } from '@canvapps';


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

// Automatically persist theme changes to localStorage and update status bar meta tags
if (typeof window !== 'undefined') {
  // Sync initial status bar theme color
  setThemeColor({ light: '#f8fafc', dark: '#101010' }, sessionStore.state.theme);

  sessionStore.select('theme').subscribe((theme) => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('canvapps_theme', theme);
      } catch {
        // Ignore quota errors
      }
    }
    // Dynamically update browser/OS status bar theme color
    setThemeColor({ light: '#f8fafc', dark: '#101010' }, theme);
  });

  // Synchronize browser history and hash navigation dynamically
  const syncRouteFromLocation = () => {
    const current = getInitialRoute();
    if (sessionStore.state.activeRoute !== current) {
      sessionStore.update((prev) => ({ ...prev, activeRoute: current }));
    }
  };

  window.addEventListener('popstate', syncRouteFromLocation);
  window.addEventListener('hashchange', syncRouteFromLocation);
}


/**
 * Computed signal derived from the global store
 */
export const isUserLoggedIn = computed(() => sessionStore.state.isAuthenticated);

/**
 * Store Action: Navigates dynamically to ANY target route URL preserving repository base path
 */
export function navigateRoute(route: string): void {
  const target = normalizeRoutePath(route);
  sessionStore.update((prev) => ({
    ...prev,
    activeRoute: target,
  }));

  if (typeof window !== 'undefined' && window.history) {
    try {
      const base = getBasePath();
      const fullUrl = base ? (target === '/' ? `${base}/` : `${base}${target}`) : (target || '/');
      window.history.pushState(null, '', fullUrl);
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
  const nextTheme = sessionStore.state.theme === 'light' ? 'dark' : 'light';
  sessionStore.update((prev) => ({
    ...prev,
    theme: nextTheme,
  }));
  setThemeColor({ light: '#f8fafc', dark: '#101010' }, nextTheme);
}

/**
 * Store Action: Explicitly sets application global theme
 */
export function setTheme(theme: 'dark' | 'light'): void {
  sessionStore.update((prev) => ({
    ...prev,
    theme,
  }));
  setThemeColor({ light: '#f8fafc', dark: '#101010' }, theme);
}

