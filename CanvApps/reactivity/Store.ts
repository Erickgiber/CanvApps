import { Signal, signal, batch } from './Signal';

/**
 * Configuration options for creating a reactive Global Store.
 */
export interface StoreOptions<T> {
  /**
   * Unique name for this store (required if persist is true).
   */
  name?: string;

  /**
   * Whether to automatically persist and sync this store with localStorage.
   */
  persist?: boolean;

  /**
   * Custom serializer for persistence (defaults to JSON.stringify / JSON.parse).
   */
  serializer?: {
    read: (raw: string) => T;
    write: (value: T) => string;
  };
}

/**
 * Creates a reactive signal that automatically persists to and synchronizes with localStorage.
 * Also synchronizes across multiple browser tabs/windows in real time.
 *
 * @param key Storage key.
 * @param initialValue Default fallback value.
 */
export function persistentSignal<T>(key: string, initialValue: T): Signal<T> {
  let startingValue = initialValue;

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        startingValue = JSON.parse(stored);
      }
    } catch {
      startingValue = initialValue;
    }
  }

  const sig = new Signal<T>(startingValue);

  // Sync state mutations to storage
  sig.subscribe(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(sig.peek()));
      } catch {
        // Ignore quota/storage errors
      }
    }
  });

  // Listen to external window storage events for multi-tab synchronization
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          sig.value = parsed;
        } catch {
          // Ignore parse errors
        }
      }
    });
  }

  return sig;
}

/**
 * Reactive Global Store class for managing application-wide state (sessions, themes, user profiles).
 * Can be shared and imported across multiple TypeScript and .cvs Single-File Components.
 */
export class Store<T extends Record<string, any>> {
  public readonly name: string;
  private rawInitialState: T;
  private signal: Signal<T>;
  private propertySignals: Map<keyof T, Signal<any>> = new Map();
  private persistKey?: string;

  constructor(initialState: T, options: StoreOptions<T> = {}) {
    this.name = options.name || `store_${Math.random().toString(36).slice(2, 9)}`;
    this.rawInitialState = { ...initialState };

    let state = initialState;

    if (options.persist && this.name && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.persistKey = `canvapps_store_${this.name}`;
      try {
        const stored = localStorage.getItem(this.persistKey);
        if (stored !== null) {
          const parsed = options.serializer ? options.serializer.read(stored) : JSON.parse(stored);
          state = { ...initialState, ...parsed };
        }
      } catch {
        state = initialState;
      }
    }

    this.signal = new Signal<T>(state);

    if (options.persist && this.persistKey) {
      this.signal.subscribe(() => {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          try {
            const raw = options.serializer
              ? options.serializer.write(this.signal.peek())
              : JSON.stringify(this.signal.peek());
            localStorage.setItem(this.persistKey!, raw);
          } catch {
            // Ignore quota errors
          }
        }
      });
    }
  }

  public get state(): T {
    return new Proxy({} as T, {
      get: (_target, prop: string | symbol) => {
        if (typeof prop === 'symbol' || prop === 'toJSON') {
          return (this.signal.peek() as any)[prop];
        }
        return this.select(prop as keyof T).value;
      },
      set: (_target, prop: string | symbol, val: any) => {
        if (typeof prop === 'string') {
          this.set({ [prop]: val } as Partial<T>);
          return true;
        }
        return false;
      },
    });
  }

  public get value(): T {
    return this.signal.value;
  }

  /**
   * Sets the full store state.
   */
  public set value(newState: T) {
    this.signal.value = newState;
    this.syncPropertySignals(newState);
  }

  /**
   * Partially patches the store state with new values.
   */
  public set(partial: Partial<T>): void {
    batch(() => {
      const next = { ...this.signal.peek(), ...partial };
      this.signal.value = next;
      this.syncPropertySignals(next);
    });
  }

  /**
   * Functionally updates store state based on previous state.
   */
  public update(fn: (prev: T) => Partial<T> | T): void {
    batch(() => {
      const prev = this.signal.peek();
      const res = fn(prev);
      const next = { ...prev, ...res };
      this.signal.value = next;
      this.syncPropertySignals(next);
    });
  }

  /**
   * Resets the store back to its initial state.
   */
  public reset(): void {
    this.set(this.rawInitialState);
  }

  /**
   * Returns a dedicated reactive Signal for a specific property of this store.
   */
  public select<K extends keyof T>(key: K): Signal<T[K]> {
    let sig = this.propertySignals.get(key);
    if (!sig) {
      sig = signal(this.signal.peek()[key]);
      this.propertySignals.set(key, sig);
    }
    return sig;
  }

  /**
   * Subscribes a listener to state changes.
   */
  public subscribe(fn: (state: T) => void): () => void {
    return this.signal.subscribe(() => {
      fn(this.signal.peek());
    });
  }

  /**
   * Returns current un-tracked snapshot.
   */
  public peek(): T {
    return this.signal.peek();
  }

  private syncPropertySignals(nextState: T): void {
    for (const [key, propSig] of this.propertySignals.entries()) {
      if (propSig.peek() !== nextState[key]) {
        propSig.value = nextState[key];
      }
    }
  }
}

/**
 * Creates a new global reactive Store instance in a TypeScript module (.ts or .store.ts).
 *
 * @example
 * ```ts
 * // src/stores/session.ts
 * export const sessionStore = createStore({
 *   user: null as { name: string } | null,
 *   isAuthenticated: false,
 *   theme: 'light' as 'light' | 'dark',
 * }, { name: 'session', persist: true });
 * ```
 */
export function createStore<T extends Record<string, any>>(
  initialState: T,
  options?: StoreOptions<T>
): Store<T> {
  return new Store<T>(initialState, options);
}

/**
 * Defines a structured store with state, getters, and custom actions.
 */
export function defineStore<T extends Record<string, any>, A extends Record<string, (...args: any[]) => any>>(
  name: string,
  setup: {
    state: () => T;
    actions?: (store: Store<T>) => A;
    persist?: boolean;
  }
): {
  store: Store<T>;
  actions: A;
} {
  const store = createStore(setup.state(), { name, persist: setup.persist });
  const actions = setup.actions ? setup.actions(store) : ({} as A);
  return { store, actions };
}
