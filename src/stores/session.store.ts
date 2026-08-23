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
  theme: 'light',
  streakCount: 10,
  lastLogin: new Date().toISOString(),
  activeRoute: 'dashboard',
};

/**
 * Global In-Memory Reactive Session Store.
 * Holds active runtime state across components without saving to localStorage.
 */
export const sessionStore = createStore<UserSessionState>(initialSessionState, {
  name: 'user_session',
  persist: false,
});

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
    streakCount: prev.streakCount + 1,
  }));
}

/**
 * Store Action: Toggles the application global theme (light / dark)
 */
export function toggleTheme(): void {
  sessionStore.update((prev) => ({
    theme: prev.theme === 'light' ? 'dark' : 'light',
  }));
}
