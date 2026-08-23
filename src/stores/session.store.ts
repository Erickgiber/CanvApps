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
  activeRoute: 'dashboard' | 'auth';
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
  activeRoute: 'dashboard',
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
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  sessionStore.select('theme').subscribe(() => {
    try {
      localStorage.setItem('canvapps_theme', sessionStore.state.theme);
    } catch {
      // Ignore quota errors
    }
  });
}

/**
 * Computed signal derived from the global store
 */
export const isUserLoggedIn = computed(() => sessionStore.state.isAuthenticated);

/**
 * Store Action: Navigates between active routes
 */
export function navigateRoute(route: 'dashboard' | 'auth'): void {
  sessionStore.update((prev) => ({
    ...prev,
    activeRoute: route,
  }));
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
