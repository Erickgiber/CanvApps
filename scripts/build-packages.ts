import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const pluginPkgDir = path.join(rootDir, 'packages', 'vite-plugin-canvapps');
const pluginDistDir = path.join(pluginPkgDir, 'dist');

async function cleanDirs() {
  console.log('🧹 Cleaning dist directories...');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'vite'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'compiler'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'cli'), { recursive: true });

  if (fs.existsSync(pluginDistDir)) {
    fs.rmSync(pluginDistDir, { recursive: true, force: true });
  }
  fs.mkdirSync(pluginDistDir, { recursive: true });
}

async function buildCore() {
  console.log('📦 Building Core Library (ESM, CJS, UMD)...');

  // 1. ESM build
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/index.ts')],
    bundle: true,
    format: 'esm',
    outfile: path.join(distDir, 'canvapps.js'),
    sourcemap: true,
    minify: true,
    target: 'es2020',
  });

  // 2. CJS build
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/index.ts')],
    bundle: true,
    format: 'cjs',
    outfile: path.join(distDir, 'canvapps.cjs'),
    sourcemap: true,
    minify: true,
    target: 'es2020',
  });

  // 3. UMD / Global IIFE build for CDN (<script> tags with window.canvapps)
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/index.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'canvapps',
    outfile: path.join(distDir, 'canvapps.umd.cjs'),
    footer: {
      js: 'if (typeof window !== "undefined") { window.canvapps = canvapps; } if (typeof globalThis !== "undefined") { globalThis.canvapps = canvapps; }',
    },
    sourcemap: true,
    minify: true,
    target: 'es2020',
  });

  console.log('  ✓ Core bundles created in dist/');
}

async function buildVitePluginAndCompiler() {
  console.log('⚡ Building Vite Plugin & Compiler subpath entries...');

  // Vite Plugin (ESM & CJS)
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/vite.ts')],
    bundle: true,
    format: 'esm',
    outfile: path.join(distDir, 'vite/index.js'),
    sourcemap: true,
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/vite.ts')],
    bundle: true,
    format: 'cjs',
    outfile: path.join(distDir, 'vite/index.cjs'),
    sourcemap: true,
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  // Compiler (ESM & CJS)
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/compiler/index.ts')],
    bundle: true,
    format: 'esm',
    outfile: path.join(distDir, 'compiler/index.js'),
    sourcemap: true,
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/compiler/index.ts')],
    bundle: true,
    format: 'cjs',
    outfile: path.join(distDir, 'compiler/index.cjs'),
    sourcemap: true,
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  // Also build dedicated standalone package vite-plugin-canvapps
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/vite.ts')],
    bundle: true,
    format: 'esm',
    outfile: path.join(pluginDistDir, 'index.js'),
    sourcemap: true,
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/vite.ts')],
    bundle: true,
    format: 'cjs',
    outfile: path.join(pluginDistDir, 'index.cjs'),
    sourcemap: true,
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  console.log('  ✓ Vite Plugin & Compiler subpath and standalone packages built');
}

async function buildCLI() {
  console.log('💻 Building CLI binary (dist/cli/bin.js)...');

  await esbuild.build({
    entryPoints: [path.join(rootDir, 'CanvApps/cli/bin.ts')],
    bundle: true,
    format: 'esm',
    outfile: path.join(distDir, 'cli/bin.js'),
    external: ['vite', 'esbuild'],
    platform: 'node',
    target: 'node18',
  });

  // Set executable permissions on Unix systems
  try {
    fs.chmodSync(path.join(distDir, 'cli/bin.js'), 0o755);
  } catch (e) {
    // Ignore on Windows if chmod fails
  }

  console.log('  ✓ CLI binary built with executable permissions');
}

async function generateDeclarations() {
  console.log('📝 Generating TypeScript declaration files (.d.ts)...');

  execSync(
    'npx tsc --project tsconfig.build.json --emitDeclarationOnly --declaration --declarationDir dist/types',
    { stdio: 'inherit' }
  );

  // Standalone vite plugin declarations
  const pluginDts = `import type { Plugin } from 'vite';

export interface CanvAppsPluginOptions {
  /**
   * Whether to inject the official CanvApps open-source build watermark comments into output JS bundles and HTML.
   * Defaults to true.
   */
  banner?: boolean;
}

export declare const CANVAPPS_BANNER: string;
export declare const CANVAPPS_HTML_BANNER: string;
export declare function canvappsPlugin(options?: CanvAppsPluginOptions): Plugin;
export default canvappsPlugin;
export type * from '@canvapps/core/compiler';
`;
  fs.writeFileSync(path.join(pluginDistDir, 'index.d.ts'), pluginDts, 'utf-8');


  console.log('  ✓ Type declarations created');
}

async function copyAssets() {
  console.log('🖼️ Copying assets...');
  if (fs.existsSync(path.join(rootDir, 'logo.svg'))) {
    fs.copyFileSync(path.join(rootDir, 'logo.svg'), path.join(distDir, 'logo.svg'));
  }
  if (fs.existsSync(path.join(rootDir, 'LICENSE'))) {
    fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(pluginPkgDir, 'LICENSE'));
  }
  console.log('  ✓ Assets copied');
}

async function main() {
  console.log('🚀 ============================================');
  console.log('   CanvApps NPM Package Build Pipeline');
  console.log('============================================\n');

  await cleanDirs();
  await buildCore();
  await buildVitePluginAndCompiler();
  await buildCLI();
  await generateDeclarations();
  await copyAssets();

  console.log('\n✨ [CanvApps Build Pipeline Complete!] 🎉\n');
}

main().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
