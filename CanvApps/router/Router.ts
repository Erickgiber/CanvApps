import { UIElement } from '../core/UIElement';
import { UIView } from '../nodes/UIView';
import { signal, Signal, effect } from '../reactivity/Signal';

/**
 * Route definition with path, metadata, and component factory.
 */
export interface RouteDefinition {
  path: string;
  name?: string;
  component: (props?: any) => UIElement;
}

/**
 * Configuration options for the CanvApps reactive router.
 */
export interface RouterOptions {
  routes: RouteDefinition[];
  initialRoute?: string;
  mode?: 'memory' | 'hash';
}

/**
 * High-performance, Signal-driven reactive Router for CanvApps.
 * Supports smooth scene mounting, zero DOM overhead, and hot route switching.
 */
export class Router {
  public readonly currentPath: Signal<string>;
  public readonly isTransitioning: Signal<boolean>;
  public routerContainer: UIView | null = null;
  private routes: Map<string, RouteDefinition> = new Map();

  constructor(options: RouterOptions) {
    for (const route of options.routes) {
      this.routes.set(route.path, route);
      if (route.name) {
        this.routes.set(route.name, route);
      }
    }

    const initial = options.initialRoute ?? (options.routes[0]?.path ?? '/');
    this.currentPath = signal(initial);
    this.isTransitioning = signal(false);

    if (options.mode === 'hash' && typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || '/';
        this.navigate(hash);
      });
      const initialHash = window.location.hash.slice(1);
      if (initialHash) {
        this.currentPath.value = initialHash;
      }
    }
  }

  /**
   * Navigates to a target route path or name.
   */
  public navigate(path: string): void {
    if (this.currentPath.value !== path) {
      this.currentPath.value = path;
      if (typeof window !== 'undefined' && window.location.hash) {
        window.location.hash = path.startsWith('/') ? path : `/${path}`;
      }
    }
  }

  /**
   * Retrieves the current active route definition.
   */
  public getActiveRoute(): RouteDefinition | null {
    return this.routes.get(this.currentPath.value) ?? null;
  }

  /**
   * Creates a reactive RouterView container node that mounts and transitions scenes.
   */
  public createView(styles: any = {}): UIView {
    const container = new UIView({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      ...styles,
    });
    this.routerContainer = container;

    effect(() => {
      const path = this.currentPath.value;
      const route = this.routes.get(path) ?? this.routes.get('/');
      container.removeAllChildren();

      if (route && typeof route.component === 'function') {
        const view = route.component({ router: this });
        if (view instanceof UIElement) {
          container.addChild(view);
        }
      }
      container.markLayoutDirty();
    });

    return container;
  }
}

let activeRouter: Router | null = null;

/**
 * Creates and initializes the application router.
 */
export function createRouter(options: RouterOptions): Router {
  activeRouter = new Router(options);
  return activeRouter;
}

/**
 * Hook to access the active router instance.
 */
export function useRouter(): Router {
  if (!activeRouter) {
    activeRouter = new Router({ routes: [] });
  }
  return activeRouter;
}
