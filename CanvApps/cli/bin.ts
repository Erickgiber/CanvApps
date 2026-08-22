#!/usr/bin/env node

import { CLIBuilder } from './builder';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  if (command === 'build' && (args.includes('--preview-code') || args.includes('-p'))) {
    await CLIBuilder.buildPreviewCode();
    return;
  }

  switch (command) {
    case 'build':
      await CLIBuilder.build();
      break;

    case 'preview-code':
    case 'build:preview-code':
    case 'inspect':
      await CLIBuilder.buildPreviewCode();
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
CanvApps CLI - Multi-Target Canvas UI Build Tool

Usage:
  canvapps build              Builds production minified project according to canvapps.config.ts (SPA, PWA, or CAPACITOR)
  canvapps preview-code       Builds unminified, inspectable preview code and compiled TypeScript components
  canvapps help               Show this help message
`);
      break;

    default:
      console.error(`Unknown command "${command}". Run "canvapps help" for available commands.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ [CanvApps Build Error]:', err);
  process.exit(1);
});
