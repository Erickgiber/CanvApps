import { createStore, computed } from '@canvapps';

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
 * Normalizes any route string with leading slash
 */
export function normalizeRoutePath(route: string): string {
  if (!route) return '/';
  const clean = route.split('?')[0].split('#')[0];
  if (!clean || clean === '/' || clean === '/dashboard' || clean === 'dashboard') return '/';
  const withLeading = clean.startsWith('/') ? clean : `/${clean}`;
  return withLeading.endsWith('/') && withLeading.length > 1 ? withLeading.slice(0, -1) : withLeading;
}

/**
 * Dynamically resolves initial route from browser URL, search queries, or hash
 */
function getInitialRoute(): string {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const pParam = params.get('p') || params.get('route');
      if (pParam) {
        return normalizeRoutePath(pParam);
      }
    } catch {
      // Fallback
    }

    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) {
      return normalizeRoutePath(hash);
    }

    const pathname = window.location.pathname;
    if (pathname) {
      return normalizeRoutePath(pathname);
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

// Automatically persist theme changes to localStorage whenever theme updates
if (typeof window !== 'undefined') {
  if (typeof localStorage !== 'undefined') {
    sessionStore.select('theme').subscribe(() => {
      try {
        localStorage.setItem('canvapps_theme', sessionStore.state.theme);
      } catch {
        // Ignore quota errors
      }
    });
  }

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
 * Store Action: Navigates dynamically to ANY target route URL
 */
export function navigateRoute(route: string): void {
  const target = normalizeRoutePath(route);
  sessionStore.update((prev) => ({
    ...prev,
    activeRoute: target,
  }));

  if (typeof window !== 'undefined' && window.history) {
    try {
      window.history.pushState(null, '', target);
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
  sessionStore.update((prev) => ({
    ...prev,
    theme: prev.theme === 'light' ? 'dark' : 'light',
  }));
}

/**
 * Store Action: Explicitly sets application global theme
 */
export function setTheme(theme: 'dark' | 'light'): void {
  sessionStore.update((prev) => ({
    ...prev,
    theme,
  }));
}
