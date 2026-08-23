import { defineConfig } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts';
import { canvappsPlugin } from './CanvApps/compiler/vitePlugin';

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
          minify: 'esbuild',
          sourcemap: true,
          emptyOutDir: true,
        }
      : {
          // Development / Playground build
          outDir: 'dist-demo',
        },
    esbuild: {
      legalComments: 'none', // Strips all comments for clean, production-grade output
    },
    plugins: [
      canvappsPlugin(),
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
