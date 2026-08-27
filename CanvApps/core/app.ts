import { Engine, EngineOptions } from './Engine';
import { UIElement } from './UIElement';

export type ComponentFactory = (() => UIElement) | { new (): UIElement } | UIElement;

export interface AppOptions extends EngineOptions {
  config?: Record<string, any>;
}

export interface AppInstance {
  readonly engine: Engine | null;
  readonly options: AppOptions;
  mount(container: HTMLElement | string): Engine;
  unmount(): void;
  setRoot(component: ComponentFactory): this;
  use(plugin: (app: AppInstance, ...args: any[]) => void, ...args: any[]): this;
  provide<T = any>(key: string | symbol, value: T): this;
  inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined;
}

/**
 * Instantiate and configure a new CanvApps Canvas application.
 *
 * @example
 * ```ts
 * import { createApp } from '@canvapps/core';
 * import App from './App.cvs';
 *
 * const app = createApp(App, {
 *   backgroundColor: '#0a0e17',
 *   autoResize: true,
 * });
 *
 * app.mount('#app');
 * ```
 */
export function createApp(rootComponent: ComponentFactory, options: AppOptions = {}): AppInstance {
  let engineInstance: Engine | null = null;
  let currentRootFactory: ComponentFactory = rootComponent;
  const context = new Map<string | symbol, any>();

  function resolveRootNode(factory: ComponentFactory): UIElement {
    if (typeof factory === 'function') {
      try {
        if (factory.prototype && factory.prototype instanceof UIElement) {
          return new (factory as new () => UIElement)();
        }
      } catch {
        // Fallback to calling as function
      }
      return (factory as () => UIElement)();
    }
    return factory;
  }

  const app: AppInstance = {
    get engine() {
      return engineInstance;
    },
    options,
    mount(container: HTMLElement | string) {
      if (engineInstance) {
        return engineInstance;
      }

      engineInstance = new Engine({
        ...options,
        container: typeof container === 'string' ? container : undefined,
        canvas: typeof container !== 'string' && container instanceof HTMLCanvasElement ? container : undefined,
      });

      const rootNode = resolveRootNode(currentRootFactory);
      engineInstance.setRoot(rootNode);
      engineInstance.start();

      // Register automatic Hot Module Replacement (HMR) runtime bridge
      if (typeof window !== 'undefined') {
        (window as any).__CANVAPPS_APP__ = app;
        (window as any).__CANVAPPS_HMR_UPDATE__ = (newComponent: ComponentFactory) => {
          console.log('⚡ [CanvApps HMR]: Hot updating .cvs component tree...');
          app.setRoot(newComponent);
        };
      }

      return engineInstance;
    },
    unmount() {
      if (engineInstance) {
        engineInstance.stop();
        engineInstance = null;
      }
    },
    setRoot(component: ComponentFactory) {
      currentRootFactory = component;
      if (engineInstance) {
        const rootNode = resolveRootNode(component);
        engineInstance.setRoot(rootNode);
      }
      return this;
    },
    use(plugin: (app: AppInstance, ...args: any[]) => void, ...args: any[]) {
      if (typeof plugin === 'function') {
        plugin(app, ...args);
      }
      return this;
    },
    provide<T = any>(key: string | symbol, value: T) {
      context.set(key, value);
      return this;
    },
    inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined {
      return context.has(key) ? context.get(key) : defaultValue;
    },
  };

  return app;
}
