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
    if (fs.existsSync(indexPath) && config.title) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      html = html.replace(/<title>.*?<\/title>/i, `<title>${config.title}</title>`);
      fs.writeFileSync(indexPath, html, 'utf-8');
    }
  }
}
