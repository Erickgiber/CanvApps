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

    const includeBanner = config.banner !== false;

    // 1. Execute Vite Application Bundling
    console.log(`⚡ [Step 1/2]: Compiling Canvas Application & .cvs Components with Vite...`);
    const localCanvAppsPath = path.resolve(cwd, 'CanvApps');
    const aliasConfig: Record<string, string> = {};
    if (fs.existsSync(localCanvAppsPath)) {
      aliasConfig['@canvapps'] = localCanvAppsPath;
    }

    await viteBuild({
      configFile: false,
      root: cwd,
      base: './',
      plugins: [canvappsPlugin({ banner: includeBanner })],
      esbuild: {
        legalComments: includeBanner ? 'inline' : 'none',
      },
      build: {
        outDir: outputDir,
        emptyOutDir: true,
        minify: 'esbuild',
        sourcemap: false,
      },
      resolve: {
        alias: aliasConfig,
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

    // 3. Automated SPA Hosting Support (GitHub Pages, Vercel, Netlify)
    // GitHub Pages .nojekyll (disables Jekyll engine)
    fs.writeFileSync(path.resolve(outputDir, '.nojekyll'), '', 'utf-8');

    // GitHub Pages 404.html SPA Deep Link Redirector (Restores Clean Paths)
    const github404Comment = includeBanner
      ? `<!--\n  CanvApps SPA Routing Fallback for GitHub Pages\n  Built with CanvApps Framework\n  Open Source • MIT License • https://github.com/Erickgiber/CanvApps\n-->\n`
      : '';
    const github404Html = `${github404Comment}<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>CanvApps</title>
    <script>
      // Single Page Apps for GitHub Pages - Clean Path Routing
      var path = window.location.pathname;
      var pathParts = path.split('/').filter(Boolean);
      var isProject = window.location.hostname.endsWith('github.io') && pathParts.length > 0;
      var repoPrefix = isProject ? '/' + pathParts[0] : '';
      var routePath = isProject ? '/' + pathParts.slice(1).join('/') : path;
      if (!routePath || routePath === '/') routePath = '/';

      var target = window.location.protocol + '//' + window.location.hostname +
        (window.location.port ? ':' + window.location.port : '') +
        repoPrefix + '/?p=' + encodeURIComponent(routePath) +
        (window.location.search ? '&q=' + encodeURIComponent(window.location.search.slice(1)) : '') +
        window.location.hash;

      window.location.replace(target);
    </script>
  </head>
  <body></body>
</html>`;
    fs.writeFileSync(path.resolve(outputDir, '404.html'), github404Html, 'utf-8');

    // Netlify _redirects rule
    const redirectsComment = includeBanner
      ? `# Built with CanvApps Framework | https://github.com/Erickgiber/CanvApps\n`
      : '';
    fs.writeFileSync(path.resolve(outputDir, '_redirects'), `${redirectsComment}/*    /index.html   200\n`, 'utf-8');


    // Vercel vercel.json rewrite configuration
    const vercelConfig = JSON.stringify(
      {
        rewrites: [{ source: '/(.*)', destination: '/index.html' }],
      },
      null,
      2
    );
    fs.writeFileSync(path.resolve(outputDir, 'vercel.json'), vercelConfig, 'utf-8');
    fs.writeFileSync(path.resolve(cwd, 'vercel.json'), vercelConfig, 'utf-8');

    console.log(`  ✓ Generated SPA deployment routing files for GitHub Pages, Netlify & Vercel`);
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
