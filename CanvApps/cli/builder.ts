import * as path from 'path';
import * as fs from 'fs';
import { build as viteBuild } from 'vite';
import { CanvAppsConfig } from './config';
import { SPATargetBuilder } from './targets/spa';
import { PWATargetBuilder } from './targets/pwa';
import { CapacitorTargetBuilder } from './targets/capacitor';
import { canvappsPlugin } from '../compiler/vitePlugin';

/**
 * Master multi-target build orchestrator for CanvApps.
 */
export class CLIBuilder {
  /**
   * Executes the full multi-target build pipeline based on `canvapps.config.ts`.
   */
  public static async build(configPath?: string): Promise<void> {
    console.log(`\n📦 ============================================`);
    console.log(`🚀 [CanvApps Multi-Target Build Orchestrator]`);
    console.log(`============================================\n`);

    const cwd = process.cwd();
    const resolvedConfigPath = configPath
      ? path.resolve(cwd, configPath)
      : path.resolve(cwd, 'canvapps.config.ts');

    const config = await this.loadConfig(resolvedConfigPath);
    const target = config.target || 'SPA';
    const outputDir = path.resolve(cwd, config.outDir || 'dist-app');

    console.log(`🎯 Target: [${target}]`);
    console.log(`📁 Output Directory: ${outputDir}\n`);

    // 1. Execute Vite Application Bundling
    console.log(`⚡ [Step 1/2]: Compiling Canvas Application & .cvs Components with Vite...`);
    await viteBuild({
      configFile: false,
      root: cwd,
      plugins: [canvappsPlugin()],
      build: {
        outDir: outputDir,
        emptyOutDir: true,
        minify: 'esbuild',
        sourcemap: false,
      },
      resolve: {
        alias: {
          '@canvapps': path.resolve(cwd, 'CanvApps/index.ts'),
        },
      },
    });
    console.log(`  ✓ Application build succeeded!\n`);

    // 2. Execute Target-Specific Post-Processing
    console.log(`🛠️  [Step 2/2]: Running Post-Processing for Target: ${target}...`);
    switch (target) {
      case 'PWA':
        await PWATargetBuilder.process(config, outputDir);
        break;
      case 'CAPACITOR':
        await CapacitorTargetBuilder.process(config, outputDir);
        break;
      case 'SPA':
      default:
        await SPATargetBuilder.process(config, outputDir);
        break;
    }

    console.log(`\n✨ [CanvApps Build Completed Successfully for Target: ${target}] 🎉\n`);
  }

  /**
   * Loads and parses canvapps.config.ts.
   */
  private static async loadConfig(configPath: string): Promise<CanvAppsConfig> {
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️ [CanvApps CLI]: No "canvapps.config.ts" found at ${configPath}. Using default SPA config.`);
      return {
        target: 'SPA',
        title: 'CanvApps Application',
        outDir: 'dist-app',
      };
    }

    try {
      // Dynamic import of the config module
      const imported = await import(configPath);
      return imported.default || imported;
    } catch (err: any) {
      console.warn(`⚠️ [CanvApps CLI]: Error reading config file: ${err.message}. Falling back to default.`);
      return {
        target: 'SPA',
        title: 'CanvApps Application',
        outDir: 'dist-app',
      };
    }
  }
}
