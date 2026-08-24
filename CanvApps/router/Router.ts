import { UIElement } from '../core/UIElement';
import { UIView } from '../nodes/UIView';
import { signal, Signal, effect } from '../reactivity/Signal';

/**
 * Parsed active route matching context.
 */
export interface RouteMatch {
  path: string;
  route: RouteDefinition;
  params: Record<string, string>;
  query: Record<string, string>;
}

/**
 * Route definition with dynamic path pattern, metadata, and component factory.
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
  mode?: 'history' | 'hash' | 'memory';
}

/**
 * High-performance, Signal-driven reactive Router for CanvApps.
 * Supports dynamic path parameters (:id), query strings (?tab=overview),
 * zero-DOM scene transitions, and universal HTML5 history / Hash routing.
 */
export class Router {
  public readonly currentPath: Signal<string>;
  public readonly currentParams: Signal<Record<string, string>>;
  public readonly currentQuery: Signal<Record<string, string>>;
  public readonly isTransitioning: Signal<boolean>;
  public routerContainer: UIView | null = null;
  private routes: RouteDefinition[] = [];
  private mode: 'history' | 'hash' | 'memory';

  constructor(options: RouterOptions) {
    this.routes = [...options.routes];
    this.mode = options.mode ?? 'history';

    const initial = options.initialRoute ?? this.getInitialLocation();
    this.currentPath = signal(this.normalizePath(initial));
    this.currentParams = signal({});
    this.currentQuery = signal(this.parseQueryParams(initial));
    this.isTransitioning = signal(false);

    this.updateRouteContext(this.currentPath.value);

    if (typeof window !== 'undefined') {
      if (this.mode === 'hash') {
        window.addEventListener('hashchange', () => {
          const hashPath = window.location.hash.replace(/^#\/?/, '') || '/';
          this.navigate(hashPath, { skipHistory: true });
        });
      } else if (this.mode === 'history') {
        window.addEventListener('popstate', () => {
          this.navigate(window.location.pathname + window.location.search, { skipHistory: true });
        });
      }
    }
  }

  /**
   * Resolves initial route from browser URL based on active router mode.
   */
  private getInitialLocation(): string {
    if (typeof window === 'undefined') {
      return this.routes[0]?.path ?? '/';
    }

    // Check search params first (SPA redirect fallback e.g. ?p=/profile)
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const p = searchParams.get('p') || searchParams.get('route');
      if (p) {
        return p;
      }
    } catch {
      // Fallback
    }

    if (this.mode === 'hash') {
      const hash = window.location.hash.replace(/^#\/?/, '');
      return hash ? `/${hash}` : '/';
    }

    const path = window.location.pathname + window.location.search;
    return path || '/';
  }

  /**
   * Normalizes route path string with clean leading and trailing slash handling.
   */
  public normalizePath(rawPath: string): string {
    if (!rawPath) return '/';
    const clean = rawPath.split('?')[0].split('#')[0];
    if (!clean || clean === '/') return '/';
    const formatted = clean.startsWith('/') ? clean : `/${clean}`;
    return formatted.endsWith('/') && formatted.length > 1 ? formatted.slice(0, -1) : formatted;
  }

  /**
   * Parses query parameters from URL string into a key-value dictionary.
   */
  public parseQueryParams(url: string): Record<string, string> {
    const query: Record<string, string> = {};
    if (!url || !url.includes('?')) return query;

    const queryString = url.split('?')[1].split('#')[0];
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k) {
        query[decodeURIComponent(k)] = v !== undefined ? decodeURIComponent(v) : '';
      }
    }
    return query;
  }

  /**
   * Finds matching route and extracts dynamic path parameters.
   */
  public matchRoute(targetPath: string): RouteMatch | null {
    const cleanPath = this.normalizePath(targetPath);
    const query = this.parseQueryParams(targetPath);

    for (const route of this.routes) {
      const routePattern = this.normalizePath(route.path);

      // Exact match
      if (routePattern === cleanPath) {
        return { path: cleanPath, route, params: {}, query };
      }

      // Dynamic parameter matching (/users/:id)
      if (routePattern.includes(':') || routePattern.includes('*')) {
        const paramNames: string[] = [];
        const regexStr = '^' + routePattern
          .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
            paramNames.push(name);
            return '([^\\/]+)';
          })
          .replace(/\*/g, '(.*)') + '$';

        const regex = new RegExp(regexStr);
        const match = cleanPath.match(regex);

        if (match) {
          const params: Record<string, string> = {};
          paramNames.forEach((name, idx) => {
            params[name] = decodeURIComponent(match[idx + 1] || '');
          });
          return { path: cleanPath, route, params, query };
        }
      }
    }

    // Fallback wildcard or root route
    const fallbackRoute = this.routes.find((r) => r.path === '*' || r.path === '/');
    if (fallbackRoute) {
      return { path: cleanPath, route: fallbackRoute, params: {}, query };
    }

    return null;
  }

  /**
   * Updates internal signals when navigating to a new path.
   */
  private updateRouteContext(path: string): void {
    const match = this.matchRoute(path);
    if (match) {
      this.currentParams.value = match.params;
      this.currentQuery.value = match.query;
    }
  }

  /**
   * Navigates to any target route path or name dynamically.
   */
  public navigate(
    path: string,
    options: { replace?: boolean; skipHistory?: boolean } = {}
  ): void {
    const normalized = this.normalizePath(path);
    const query = this.parseQueryParams(path);

    if (this.currentPath.value !== normalized) {
      this.currentPath.value = normalized;
      this.currentQuery.value = query;
      this.updateRouteContext(path);

      if (!options.skipHistory && typeof window !== 'undefined') {
        if (this.mode === 'hash') {
          const hashUrl = normalized === '/' ? '#/' : `#${normalized}`;
          if (options.replace) {
            window.location.replace(hashUrl);
          } else {
            window.location.hash = hashUrl;
          }
        } else if (this.mode === 'history' && window.history) {
          if (options.replace) {
            window.history.replaceState(null, '', normalized);
          } else {
            window.history.pushState(null, '', normalized);
          }
        }
      }
    }
  }

  /**
   * Navigates back in browser history.
   */
  public back(): void {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  }

  /**
   * Navigates forward in browser history.
   */
  public forward(): void {
    if (typeof window !== 'undefined' && window.history) {
      window.history.forward();
    }
  }

  /**
   * Retrieves the current active route match details.
   */
  public getActiveRoute(): RouteMatch | null {
    return this.matchRoute(this.currentPath.value);
  }

  /**
   * Creates a reactive RouterView container node that dynamically mounts and transitions scenes.
   */
  public createView(styles: any = {}): UIView {
    const container = new UIView({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      display: 'contents',
      ...styles,
    });
    this.routerContainer = container;

    effect(() => {
      const match = this.getActiveRoute();
      container.removeAllChildren();

      if (match && typeof match.route.component === 'function') {
        const view = match.route.component({
          router: this,
          params: match.params,
          query: match.query,
        });
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
 * Creates and initializes the global application router.
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
