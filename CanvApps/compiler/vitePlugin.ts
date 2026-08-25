import { compileCVS } from './transformer';
import { transformSync } from 'esbuild';
import type { Plugin } from 'vite';

export const CANVAPPS_BANNER = `/*!
 * Built with CanvApps Framework
 * Open Source • MIT License • https://github.com/Erickgiber/CanvApps
 */`;

export const CANVAPPS_HTML_BANNER = `<!--
  ⚡ Built with CanvApps Framework
  🌐 Open Source • MIT License • https://github.com/Erickgiber/CanvApps
-->`;

/**
 * Options for configuring the CanvApps Vite plugin.
 */
export interface CanvAppsPluginOptions {
  /**
   * Whether to inject the official CanvApps open-source build watermark comments into final application bundles and HTML.
   * Defaults to true.
   */
  banner?: boolean;
}

/**
 * Official Vite Plugin for compiling CanvApps `.cvs` declarative canvas components.
 */
export function canvappsPlugin(options?: CanvAppsPluginOptions): Plugin {
  const includeBanner = options?.banner !== false;

  return {
    name: 'vite-plugin-canvapps',
    enforce: 'pre',

    transform(rawCode: string, id: string) {
      if (!id.endsWith('.cvs')) {
        return null;
      }

      try {
        const { code: tsCode } = compileCVS(rawCode);

        // Inject Hot Module Replacement (HMR) runtime for development
        const hmrCode = `
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && typeof (window as any).__CANVAPPS_HMR_UPDATE__ === 'function') {
      (window as any).__CANVAPPS_HMR_UPDATE__(newModule.default);
    }
  });
}
`;

        const combinedCode = `${tsCode}\n${hmrCode}`;

        // Transpile TypeScript syntax into clean JS
        const result = transformSync(combinedCode, {
          loader: 'ts',
          target: 'esnext',
          sourcemap: true,
        });

        return {
          code: result.code,
          map: result.map,
        };
      } catch (err: any) {
        this.error(`[CanvApps Compiler Error in ${id}]: ${err.message || err}`);
      }
    },

    transformIndexHtml(html: string) {
      if (!includeBanner || html.includes('Built with CanvApps Framework')) {
        return html;
      }
      if (html.includes('<head>')) {
        return html.replace('<head>', `<head>\n  ${CANVAPPS_HTML_BANNER}`);
      }
      return `${CANVAPPS_HTML_BANNER}\n${html}`;
    },

    generateBundle(_options, bundle) {
      if (!includeBanner) return;
      for (const [fileName, file] of Object.entries(bundle)) {
        if (file.type === 'chunk' && (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs'))) {
          if (!file.code.startsWith('/*!') && !file.code.includes('Built with CanvApps Framework')) {
            file.code = `${CANVAPPS_BANNER}\n${file.code}`;
          }
        }
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith('.cvs')) {
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

export default canvappsPlugin;

