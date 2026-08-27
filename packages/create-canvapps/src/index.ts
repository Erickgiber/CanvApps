import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function formatText(str: string, color: 'cyan' | 'green' | 'yellow' | 'red' | 'bold' | 'dim'): string {
  const codes: Record<string, string> = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
  };
  return `${codes[color] || ''}${str}${codes.reset}`;
}

async function prompt(question: string, defaultVal: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} ${formatText(`(${defaultVal})`, 'dim')}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

export async function run() {
  console.log(`\n${formatText('🎨 Welcome to CanvApps App Generator!', 'cyan')}`);
  console.log(formatText('   100% Canvas 2D Declarative UI Framework\n', 'dim'));

  const args = process.argv.slice(2);
  let targetDir = args[0];

  if (!targetDir) {
    targetDir = await prompt('Project name', 'my-canvapps-app');
  }

  const root = path.resolve(process.cwd(), targetDir);
  const projectName = path.basename(root);

  if (fs.existsSync(root)) {
    const existing = fs.readdirSync(root);
    if (existing.length > 0) {
      console.error(`\n❌ ${formatText('Error:', 'red')} Target directory "${targetDir}" is not empty.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(root, { recursive: true });
  }

  console.log(`\n🚀 Scaffolding project in ${formatText(root, 'green')}...\n`);

  // 1. package.json
  const pkgJson = {
    name: projectName,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'canvapps build',
      preview: 'vite preview',
      format: 'canvapps format',
    },
    dependencies: {
      '@canvapps/core': '^0.2.0',
    },
    devDependencies: {
      typescript: '^5.7.3',
      vite: '^6.2.0',
    },
  };

  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');

  // 2. vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite';
import canvappsPlugin from '@canvapps/core/vite';

export default defineConfig({
  plugins: [canvappsPlugin()],
  resolve: {
    alias: [
      { find: /^@canvapps$/, replacement: '@canvapps/core' },
      { find: /^canvapps$/, replacement: '@canvapps/core' },
    ],
  },
  optimizeDeps: {
    include: ['@canvapps/core'],
  },
  server: {
    port: 3000,
  },
});
`;
  fs.writeFileSync(path.join(root, 'vite.config.ts'), viteConfig);

  // 3. canvapps.config.ts
  const canvappsConfig = `export default {
  appName: '${projectName}',
  target: 'pwa', // 'spa' | 'pwa' | 'capacitor'
  theme: {
    primaryColor: '#0284c7',
    backgroundColor: '#0a0e17',
  },
};
`;
  fs.writeFileSync(path.join(root, 'canvapps.config.ts'), canvappsConfig);

  // 4. tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src/**/*.ts', 'src/**/*.d.ts', 'src/**/*.cvs'],
  };
  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2) + '\n');

  // 5. index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${projectName}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="theme-color" content="#0a0e17" />
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #0a0e17;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }
    #app-container {
      width: 100%;
      height: 100%;
      display: flex;
    }
    canvas {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      outline: none;
    }
  </style>
</head>
<body oncontextmenu="return false;">
  <div id="app-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, 'index.html'), indexHtml);

  // 6. .gitignore
  const gitIgnore = `node_modules
dist
dist-app
.DS_Store
`;
  fs.writeFileSync(path.join(root, '.gitignore'), gitIgnore);

  // 7. public/favicon.svg
  const publicDir = path.join(root, 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
  <defs>
    <linearGradient id="cvsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <path d="M 18 5 H 8 A 3.5 3.5 0 0 0 4.5 8.5 V 15.5 A 3.5 3.5 0 0 0 8 19 H 18"
        fill="none" stroke="url(#cvsGrad)" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="13" cy="12" r="2.5" fill="#38bdf8" />
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

  // 8. src directory
  const srcDir = path.join(root, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  // src/canvapps-env.d.ts
  const envDts = `/// <reference types="vite/client" />

declare module '*.cvs' {
  const component: any;
  export default component;
  export function createComponent(props?: Record<string, any>): any;
}
`;
  fs.writeFileSync(path.join(srcDir, 'canvapps-env.d.ts'), envDts);

  // src/main.ts
  const mainTs = `import { createApp } from '@canvapps/core';
import App from './App.cvs';

const app = createApp(App);
app.mount('#app-container');
`;
  fs.writeFileSync(path.join(srcDir, 'main.ts'), mainTs);

  // src/App.cvs
  const appCvs = `<script lang="ts">
  const count = signal(0);
  const isDark = signal(true);

  function increment() {
    count.update((n) => n + 1);
  }

  function toggleTheme() {
    isDark.update((v) => !v);
  }
</script>

<view
  width="100%"
  height="100%"
  :backgroundColor={isDark.value ? '#0a0e17' : '#f8fafc'}
  alignItems="center"
  justifyContent="center"
  padding="[40, 20]"
>
  <view
    width="100%"
    maxWidth="560"
    :backgroundColor={isDark.value ? '#111928' : '#ffffff'}
    borderRadius="24"
    borderWidth="1"
    :borderColor={isDark.value ? '#1e293b' : '#e2e8f0'}
    padding="[32, 28]"
    alignItems="center"
    flexDirection="column"
    gap="20"
  >
    <text fontSize="44">🎨</text>

    <text
      fontSize="24"
      fontWeight="bold"
      :color={isDark.value ? '#ffffff' : '#0f172a'}
    >
      CanvApps Starter
    </text>

    <text
      fontSize="13"
      :color={isDark.value ? '#94a3b8' : '#64748b'}
      textAlign="center"
    >
      High-Performance 100% Canvas 2D UI with Reactive Signals & Ghost DOM
    </text>

    <!-- Reactive Counter Widget -->
    <view
      width="100%"
      :backgroundColor={isDark.value ? '#162032' : '#f1f5f9'}
      borderRadius="16"
      padding="[16, 20]"
      alignItems="center"
      justifyContent="space-between"
      flexDirection="row"
    >
      <text
        fontSize="15"
        fontWeight="bold"
        :color={isDark.value ? '#38bdf8' : '#0284c7'}
      >
        Clicks: {{ count.value }}
      </text>

      <button
        label="+1 Increment"
        backgroundColor="#0284c7"
        hoverBackgroundColor="#0369a1"
        labelColor="#ffffff"
        borderRadius="10"
        padding="[8, 16]"
        fontSize="12"
        fontWeight="bold"
        @click="increment"
      />
    </view>

    <!-- Theme Toggle -->
    <button
      :label={isDark.value ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
      :backgroundColor={isDark.value ? '#1e293b' : '#e2e8f0'}
      :labelColor={isDark.value ? '#f1f5f9' : '#0f172a'}
      borderRadius="12"
      padding="[8, 18]"
      fontSize="12"
      fontWeight="bold"
      @click="toggleTheme"
    />
  </view>
</view>
`;
  fs.writeFileSync(path.join(srcDir, 'App.cvs'), appCvs);

  // 8. README.md
  const readme = `# ${projectName}

This is a Canvas-native web application created with [CanvApps](https://github.com/Erickgiber/CanvApps).

## 🚀 Getting Started

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Start the development server (Vite + HMR)
npm run dev

# 3. Build for production (PWA / SPA / Mobile)
npm run build
\`\`\`
`;
  fs.writeFileSync(path.join(root, 'README.md'), readme);

  console.log(formatText('✨ Project created successfully!', 'green'));
  console.log(`\nNext steps:\n`);
  if (targetDir !== '.') {
    console.log(`  ${formatText(`cd ${targetDir}`, 'cyan')}`);
  }
  console.log(`  ${formatText('npm install', 'cyan')}`);
  console.log(`  ${formatText('npm run dev', 'cyan')}\n`);
}

run().catch((err) => {
  console.error('\n❌ Scaffolding failed:', err);
  process.exit(1);
});
