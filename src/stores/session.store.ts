import { createStore, computed } from '../../CanvApps';

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
}

/**
 * Initial Default Session State
 */
const initialSessionState: UserSessionState = {
  user: {
    name: 'Meliodas',
    email: 'meliodas@canvapps.dev',
    role: 'Sinner',
    avatar: '👨‍💻',
  },
  isAuthenticated: true,
  theme: 'dark',
  streakCount: 10,
  lastLogin: new Date().toISOString(),
};

/**
 * Global Reactive Session Store with Auto-Persistence.
 * Can be imported and used across multiple .cvs Single-File Components and .ts files.
 */
export const sessionStore = createStore<UserSessionState>(initialSessionState, {
  name: 'user_session',
  persist: true,
});

/**
 * Computed signal derived from the global store
 */
export const isUserLoggedIn = computed(() => sessionStore.state.isAuthenticated);

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
