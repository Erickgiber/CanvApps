import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts';
import { transformSync } from 'esbuild';
import { canvappsPlugin } from './CanvApps/compiler/vitePlugin';

function libraryMinifierPlugin(): Plugin {
  return {
    name: 'canvapps-library-minifier',
    renderChunk(code) {
      const result = transformSync(code, {
        minify: true,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        legalComments: 'none',
      });
      return {
        code: result.code,
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  const isUnminified = mode === 'unminified';
  const isLibBuild = mode === 'production' || isUnminified;

  return {
    resolve: {
      alias: {
        '@canvapps': path.resolve(__dirname, './CanvApps'),
      },
    },
    build: isLibBuild
      ? {
          lib: {
            entry: path.resolve(__dirname, 'CanvApps/index.ts'),
            name: 'CanvApps',
            fileName: (format) =>
              isUnminified
                ? format === 'es'
                  ? 'canvapps.unminified.js'
                  : 'canvapps.unminified.umd.cjs'
                : format === 'es'
                ? 'canvapps.js'
                : 'canvapps.umd.cjs',
            formats: ['es', 'umd'],
          },
          rollupOptions: {
            // Pure vanilla bundle with zero external dependencies
            external: [],
            output: {
              globals: {},
              exports: 'named',
            },
          },
          target: 'es2020',
          minify: isUnminified ? false : 'esbuild',
          sourcemap: true,
          emptyOutDir: !isUnminified,
        }
      : {
          // Development / Playground build
          outDir: 'dist-demo',
        },
    esbuild: isUnminified
      ? {
          legalComments: 'inline',
        }
      : {
          minifyWhitespace: true,
          minifyIdentifiers: true,
          minifySyntax: true,
          legalComments: 'none',
        },
    plugins: [
      canvappsPlugin(),
      !isUnminified ? libraryMinifierPlugin() : null,
      dts({
        tsconfigPath: './tsconfig.json',
        include: ['CanvApps/**/*'],
        rollupTypes: true,
        insertTypesEntry: true,
      }),
    ].filter(Boolean) as Plugin[],
    server: {
      port: 3000,
      open: true,
    },
  };
});
