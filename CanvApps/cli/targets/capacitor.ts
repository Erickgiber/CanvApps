import * as fs from 'fs';
import * as path from 'path';
import { CanvAppsConfig } from '../config';

/**
 * Handles Native Mobile compilation with Capacitor JS:
 * - Generates capacitor.config.json / capacitor.config.ts
 * - Injects mobile viewport safe-area-inset and touch meta tags into HTML
 * - Orchestrates native build sync instructions
 */
export class CapacitorTargetBuilder {
  public static async process(config: CanvAppsConfig, outputDir: string): Promise<void> {
    const cap = config.capacitor ?? {};
    console.log(`📱 [CanvApps CLI]: Configuring Capacitor Native Mobile container for "${cap.appName || config.title || 'CanvApps App'}"...`);

    const appId = cap.appId || 'com.canvapps.app';
    const appName = cap.appName || config.title || 'CanvApps';
    const webDir = cap.webDir || outputDir;

    // 1. Generate capacitor.config.json in project root
    const capacitorConfig = {
      appId,
      appName,
      webDir,
      bundledWebRuntime: false,
      server: {
        androidScheme: cap.server?.androidScheme || 'https',
        cleartext: cap.server?.cleartext ?? false,
      },
      plugins: cap.plugins || {},
    };

    const configPath = path.resolve(process.cwd(), 'capacitor.config.json');
    fs.writeFileSync(configPath, JSON.stringify(capacitorConfig, null, 2), 'utf-8');
    console.log(`  ✓ Generated Native Configuration: ${configPath}`);

    // 2. Adjust HTML for native mobile safe area and viewport
    const indexPath = path.join(outputDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');

      const lightColor = typeof config.themeColor === 'object'
        ? config.themeColor.light
        : '#f8fafc';
      const darkColor = typeof config.themeColor === 'object'
        ? config.themeColor.dark
        : '#090d16';

      const mobileMetaTags = `
    <!-- CanvApps Capacitor Mobile Safe Area & Status Bar -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="${lightColor}" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="${darkColor}" media="(prefers-color-scheme: dark)" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <style id="canvapps-capacitor-safearea">
      :root {
        --sat: env(safe-area-inset-top, 0px);
        --sar: env(safe-area-inset-right, 0px);
        --sab: env(safe-area-inset-bottom, 0px);
        --sal: env(safe-area-inset-left, 0px);
      }
      body {
        margin: 0;
        padding: 0;
        touch-action: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
    </style>
`;

      html = html.replace('</head>', `${mobileMetaTags}\n  </head>`);
      fs.writeFileSync(indexPath, html, 'utf-8');
      console.log(`  ✓ Injected Mobile Safe Area & Touch optimization into: ${indexPath}`);
    }


    console.log(`\n📲 [Next Steps for Native Mobile]:`);
    console.log(`  1. Add platforms: npx cap add ios / npx cap add android`);
    console.log(`  2. Sync bundle:   npx cap sync`);
    console.log(`  3. Run in Xcode:  npx cap open ios`);
    console.log(`  4. Run in Studio: npx cap open android\n`);
  }
}
