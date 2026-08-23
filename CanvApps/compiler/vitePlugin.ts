import { compileCVS } from './transformer';
import { transformSync } from 'esbuild';
import type { Plugin } from 'vite';

/**
 * Official Vite Plugin for compiling CanvApps `.cvs` declarative canvas components.
 */
export function canvappsPlugin(): Plugin {
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
