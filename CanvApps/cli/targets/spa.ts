import { CanvAppsConfig } from '../config';

/**
 * Handles standard Single Page Application (SPA) production build transformations.
 */
export class SPATargetBuilder {
  public static async process(_config: CanvAppsConfig, outputDir: string): Promise<void> {
    console.log(`🚀 [CanvApps CLI]: Building standard SPA for target output: "${outputDir}"...`);
    // SPA performs clean Vite bundling
  }
}
