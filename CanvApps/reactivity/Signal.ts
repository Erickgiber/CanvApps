import { UIElement } from '../core/UIElement';

/**
 * Subscriber callback type with strongly typed value.
 */
export type Subscriber<T = any> = (value: T) => void;
type InternalRunner = () => void;

// Active tracking context stack for computed signals and effects
let activeSubscriber: InternalRunner | null = null;
const subscriberStack: (InternalRunner | null)[] = [];

let isBatching = false;
const batchedSubscribers = new Set<InternalRunner>();

/**
 * Runs a function without establishing reactive subscriptions on any signals accessed within it.
 */
export function untrack<T>(fn: () => T): T {
  const prevSubscriber = activeSubscriber;
  activeSubscriber = null;
  try {
    return fn();
  } finally {
    activeSubscriber = prevSubscriber;
  }
}

/**
 * Runs multiple signal state updates in a batch, notifying subscribers once at the end.
 */
export function batch(fn: () => void): void {
  const prevBatching = isBatching;
  isBatching = true;
  try {
    fn();
  } finally {
    isBatching = prevBatching;
    if (!isBatching) {
      const subscribersToRun = Array.from(batchedSubscribers);
      batchedSubscribers.clear();
      for (const sub of subscribersToRun) {
        sub();
      }
    }
  }
}

/**
 * A reactive state container holding a value.
 */
export class Signal<T> {
  private _value: T;
  private subscribers: Set<Subscriber<T>> = new Set();
  private internalRunners: Set<InternalRunner> = new Set();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  public get value(): T {
    if (activeSubscriber) {
      this.internalRunners.add(activeSubscriber);
    }
    return this._value;
  }

  /**
   * Updates the signal value. If the value changed, notifies all subscribers.
   */
  public set value(newValue: T) {
    if (!Object.is(this._value, newValue)) {
      this._value = newValue;
      this.notify();
    }
  }

  /**
   * Manually notifies all registered subscribers.
   */
  public notify(): void {
    for (const runner of this.internalRunners) {
      if (isBatching) {
        batchedSubscribers.add(runner);
      } else {
        runner();
      }
    }
    for (const sub of this.subscribers) {
      if (isBatching) {
        batchedSubscribers.add(() => sub(this._value));
      } else {
        sub(this._value);
      }
    }
  }

  /**
   * Subscribes a callback to receive notifications when this signal updates.
   *
   * @returns Unsubscribe function.
   */
  public subscribe(sub: Subscriber<T>): () => void {
    this.subscribers.add(sub);
    return () => {
      this.subscribers.delete(sub);
    };
  }

  /**
   * Returns current value without subscribing.
   */
  public peek(): T {
    return this._value;
  }

  /**
   * Functional helper to mutate current value based on previous state.
   */
  public update(updater: (prev: T) => T): void {
    this.value = updater(this._value);
  }
}

/**
 * Creates a new Signal instance.
 */
export function signal<T>(initialValue: T): Signal<T> {
  return new Signal<T>(initialValue);
}

/**
 * Creates a reactive effect that automatically re-runs whenever any accessed signal changes.
 *
 * @param fn The effect function. Can optionally return a cleanup function.
 * @returns Disposer function to stop the effect.
 */
export function effect(fn: () => void | (() => void)): () => void {
  let cleanup: void | (() => void);
  let isDisposed = false;

  const runner: InternalRunner = () => {
    if (isDisposed) {
      return;
    }

    if (typeof cleanup === 'function') {
      cleanup();
    }

    subscriberStack.push(activeSubscriber);
    activeSubscriber = runner;

    try {
      cleanup = fn();
    } finally {
      activeSubscriber = subscriberStack.pop() ?? null;
    }
  };

  runner();

  return () => {
    isDisposed = true;
    if (typeof cleanup === 'function') {
      cleanup();
    }
  };
}

/**
 * Creates a read-only computed signal derived from other signals.
 */
export function computed<T>(getter: () => T): Signal<T> {
  const derivedSignal = new Signal<T>(undefined as unknown as T);

  effect(() => {
    derivedSignal.value = getter();
  });

  return derivedSignal;
}

/**
 * Binds a signal's value to a UIElement property or layout, automatically invalidating
 * the frame whenever the signal updates.
 */
export function bindSignal<T, E extends UIElement>(
  element: E,
  sig: Signal<T>,
  apply: (el: E, val: T) => void
): () => void {
  return effect(() => {
    const val = sig.value;
    apply(element, val);
    element.markRenderDirty();
  });
}
