import * as fs from 'fs';
import * as path from 'path';
import { CanvAppsConfig } from '../config';

/**
 * Handles standard Single Page Application (SPA) production build transformations.
 *
 * Produces a clean, lightweight index.html without any PWA service workers,
 * manifest links, or Capacitor mobile viewport safe-area wrappers.
 */
export class SPATargetBuilder {
  public static async process(config: CanvAppsConfig, outputDir: string): Promise<void> {
    console.log(`🚀 [CanvApps CLI]: Generating clean standard SPA bundle in "${outputDir}"...`);

    const indexPath = path.join(outputDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');

      if (config.title) {
        html = html.replace(/<title>.*?<\/title>/i, `<title>${config.title}</title>`);
      }

      // Ensure viewport-fit=cover is configured for edge-to-edge status bar rendering
      if (!html.includes('viewport-fit=cover')) {
        html = html.replace(
          /<meta\s+name=["']viewport["'][^>]*>/i,
          '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />'
        );
      }

      // Inject theme-color and safe-area metadata if enabled
      if (config.themeColor !== false && !html.includes('id="canvapps-spa-meta"')) {
        const initialTheme = typeof config.themeColor === 'object'
          ? config.themeColor.light
          : (typeof config.themeColor === 'string' ? config.themeColor : '#f8fafc');

        const spaMeta = `
    <!-- CanvApps SPA Topnav & Status Bar Metadata -->
    <meta name="theme-color" content="${initialTheme}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="msapplication-TileColor" content="${initialTheme}" />
    <meta name="msapplication-navbutton-color" content="${initialTheme}" />
    <style id="canvapps-spa-meta">
      :root {
        --sat: max(env(safe-area-inset-top, 0px), env(titlebar-area-height, 0px));
        --sar: max(env(safe-area-inset-right, 0px), env(titlebar-area-width, 0px));
        --sab: env(safe-area-inset-bottom, 0px);
        --sal: max(env(safe-area-inset-left, 0px), env(titlebar-area-x, 0px));
      }
    </style>
`;
        html = html.replace('</head>', `${spaMeta}\n  </head>`);
      }

      fs.writeFileSync(indexPath, html, 'utf-8');
    }
  }
}
