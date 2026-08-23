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
  const isLibBuild = mode === 'production';

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
            fileName: (format) => (format === 'es' ? 'canvapps.js' : 'canvapps.umd.cjs'),
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
          minify: 'esbuild',
          sourcemap: true,
          emptyOutDir: true,
        }
      : {
          // Development / Playground build
          outDir: 'dist-demo',
        },
    esbuild: {
      minifyWhitespace: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      legalComments: 'none',
    },
    plugins: [
      canvappsPlugin(),
      libraryMinifierPlugin(),
      dts({
        tsconfigPath: './tsconfig.json',
        include: ['CanvApps/**/*'],
        rollupTypes: true,
        insertTypesEntry: true,
      }),
    ],
    server: {
      port: 3000,
      open: true,
    },
  };
});
