# @canvapps/vite-plugin ⚡

Official [Vite](https://vitejs.dev/) plugin for compiling **[CanvApps](https://github.com/Erickgiber/CanvApps)** declarative `.cvs` Single-File Canvas UI Components with instant Hot Module Replacement (HMR).

> **CanvApps: The first compiled UI framework that renders at 120 FPS by eliminating the DOM. Svelte-like syntax, native performance.**

---

## ⚡ Starter Template

You can clone the ready-to-use template repository to get started immediately:

```bash
# Clone the starter template
git clone https://github.com/Erickgiber/google-canvapps.git my-canvapps-app

# Navigate and install dependencies
cd my-canvapps-app
npm install

# Start Vite dev server with instant HMR
npm run dev
```

---

## 📦 Installation

To use `@canvapps/vite-plugin`, you **must** also install `@canvapps/core`, which provides the runtime rendering engine, reactive signals, and UI primitives.

```bash
# Using npm
npm install @canvapps/core
npm install -D @canvapps/vite-plugin

# Using pnpm
pnpm add @canvapps/core
pnpm add -D @canvapps/vite-plugin

# Using yarn
yarn add @canvapps/core
yarn add -D @canvapps/vite-plugin

# Using bun
bun add @canvapps/core
bun add -d @canvapps/vite-plugin
```

---

## 🛠️ Project Configuration & Bootstrap

Here is the complete setup required to initialize a CanvApps project with Vite and TypeScript:

### 1. `index.html`

HTML entry point with full-bleed canvas viewport styles and mount container `#app`:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Your title</title>
    <style>
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background-color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      #app {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        position: relative;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 2. `vite.config.ts`

Configure the CanvApps Vite plugin and module aliases:

```ts
import { defineConfig } from 'vite';
import { canvappsPlugin } from '@canvapps/vite-plugin';
import path from 'node:path';

export default defineConfig({
  base: './',
  plugins: [
    canvappsPlugin(),
  ],
  resolve: {
    alias: [
      { find: /^@canvapps$/, replacement: '@canvapps/core' },
      { find: /^canvapps$/, replacement: '@canvapps/core' },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  server: {
    port: 5173,
    open: false,
  },
});
```

### 3. `tsconfig.json`

Ensure TypeScript recognizes `.cvs` Single-File Components and package path aliases:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@canvapps": ["node_modules/@canvapps/core"],
      "@canvapps/*": ["node_modules/@canvapps/core/*"],
      "canvapps": ["node_modules/@canvapps/core"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.cvs", "vite.config.ts"]
}
```

### 4. `src/vite-env.d.ts`

Declare TypeScript definitions for `.cvs` component imports and the HMR reload bridge:

```ts
/// <reference types="vite/client" />

declare module '*.cvs' {
  import type { UIElement } from '@canvapps/core';
  const createComponent: (props?: Record<string, any>) => UIElement;
  export default createComponent;
}

declare interface Window {
  __CANVAPPS_HMR_UPDATE__?: (newComponent: () => import('@canvapps/core').UIElement) => void;
}
```

### 5. `src/main.ts`

Initialize the CanvApps rendering engine, mount the root component, and connect the Hot Module Replacement (HMR) bridge:

```ts
import { Engine } from '@canvapps/core';
import App from './App.cvs';

// 1. Initialize the CanvApps Rendering Engine
const engine = new Engine({
  container: '#app',
  backgroundColor: '#ffffff',
  autoResize: true,
});

// 2. Instantiate and mount the root component
const rootElement = App();
engine.setRoot(rootElement).start();

// 3. Setup Hot Module Replacement (HMR) Bridge
if (typeof window !== 'undefined') {
  window.__CANVAPPS_HMR_UPDATE__ = (newAppComponent) => {
    if (typeof newAppComponent === 'function') {
      try {
        const updatedRoot = newAppComponent();
        engine.setRoot(updatedRoot).start();
        console.log('[CanvApps HMR] Component hot reloaded successfully.');
      } catch (error) {
        console.error('[CanvApps HMR] Failed to hot reload component:', error);
      }
    }
  };
}
```

### 6. `src/App.cvs`

Create your root Single-File Canvas UI component:

```html
<script lang="ts">
  import { signal } from '@canvapps/core';

  const count = signal(0);

  function increment() {
    count.update(n => n + 1);
  }
</script>

<view width="100%" height="100%" alignItems="center" justifyContent="center" gap="16">
  <text fontSize="24" color="#0f172a">
    Clicks: {{ count.value }}
  </text>

  <button
    label="+ Click Me"
    backgroundColor="#2563eb"
    labelColor="#ffffff"
    padding="[10, 20]"
    @click="increment"
  />
</view>
```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
