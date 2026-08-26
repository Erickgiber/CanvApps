<p align="center">
  <a href="https://github.com/Erickgiber/CanvApps">
    <img src="https://raw.githubusercontent.com/Erickgiber/CanvApps/main/logo.svg" width="96" height="96" alt="CanvApps Logo" />
  </a>
</p>

<h1 align="center">@canvapps/vite-plugin ⚡</h1>

<p align="center">
  <strong>Official Vite Plugin for CanvApps: The 120 FPS Compiled Canvas UI Framework</strong><br>
  <em>Compile declarative Single-File Components (<code>.cvs</code>) with Svelte-like syntax, fine-grained signals, and instant Hot Module Replacement (HMR).</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@canvapps/vite-plugin"><img src="https://img.shields.io/npm/v/@canvapps/vite-plugin.svg?style=flat-square&color=2563eb" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@canvapps/vite-plugin"><img src="https://img.shields.io/npm/dm/@canvapps/vite-plugin.svg?style=flat-square&color=059669" alt="npm downloads" /></a>
  <a href="https://github.com/Erickgiber/CanvApps/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.x%20%7C%206.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <img src="https://img.shields.io/badge/Performance-120%20FPS%20Retina-brightgreen?style=flat-square" alt="120 FPS" />
</p>

---

## 🌟 What is CanvApps?

**[CanvApps](https://github.com/Erickgiber/CanvApps)** is a revolutionary compiled UI framework that renders user interfaces directly onto an **HTML5 2D GPU-accelerated Canvas at a deterministic 120 FPS**, eliminating the browser DOM and layout reflows entirely.

It blends the ergonomics of modern declarative frameworks (Svelte-like Single-File Components, reactive signals, mathematical Flexbox) with the extreme performance of native hardware rasterization, backed by the **Ghost DOM** for native mobile virtual keyboards, real text selection, and screen reader accessibility.

`@canvapps/vite-plugin` is the official build tool that transforms your `.cvs` Single-File Components into highly optimized Canvas rendering trees during development and production.

---

> [!IMPORTANT]
> ### 📦 Core Runtime Dependency Required
> `@canvapps/vite-plugin` is a build-time transformation plugin. To run your application, **you must also install [`@canvapps/core`](https://www.npmjs.com/package/@canvapps/core)**, which provides the 120 FPS Canvas rendering engine (`Engine`), reactive signals (`signal`, `computed`, `effect`), mathematical Flexbox solver, and Ghost DOM interaction layer.
>
> | Package | Role | Purpose |
> | :--- | :--- | :--- |
> | **`@canvapps/core`** | **Runtime Engine** *(Required)* | 120 FPS Canvas Loop, Ghost DOM, Mathematical Layout, Reactive Signals |
> | **`@canvapps/vite-plugin`** | **Build Tool & HMR** *(Dev Dependency)* | Compiles `.cvs` Single-File Components into optimized TypeScript/JS |

---

## ⚡ Instant Quickstart (Starter Template)

The fastest way to start a new CanvApps project is using the official starter template:

```bash
# 1. Clone the starter template repository
git clone https://github.com/Erickgiber/google-canvapps.git my-canvapps-app

# 2. Navigate to your project directory
cd my-canvapps-app

# 3. Install all dependencies
npm install

# 4. Launch the Vite development server with instant HMR
npm run dev
```

---

## 📦 Installation

To add CanvApps to an existing Vite project, install both `@canvapps/core` and `@canvapps/vite-plugin`:

### Using npm
```bash
npm install @canvapps/core
npm install -D @canvapps/vite-plugin
```

### Using pnpm
```bash
pnpm add @canvapps/core
pnpm add -D @canvapps/vite-plugin
```

### Using yarn
```bash
yarn add @canvapps/core
yarn add -D @canvapps/vite-plugin
```

### Using bun
```bash
bun add @canvapps/core
bun add -d @canvapps/vite-plugin
```

---

## 🛠️ Step-by-Step Project Configuration

Here is the complete configuration required to bootstrap a full CanvApps application with Vite and TypeScript:

### 1. `index.html` (Application Viewport)

Define a full-bleed HTML viewport container (`#app`) with tap-highlight suppression:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>My CanvApps Application</title>
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
        background-color: #0f172a;
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

---

### 2. `vite.config.ts` (Plugin Registration)

Register `canvappsPlugin()` and configure module path aliases:

```ts
import { defineConfig } from 'vite';
import { canvappsPlugin } from '@canvapps/vite-plugin';
import path from 'node:path';

export default defineConfig({
  base: './',
  plugins: [
    canvappsPlugin({
      banner: true, // Injects open-source watermark comments in production builds
    }),
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

---

### 3. `tsconfig.json` (TypeScript Configuration)

Configure module resolution and path mappings to recognize `.cvs` files:

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

---

### 4. `src/vite-env.d.ts` (Component Typings & HMR Bridge)

Declare ambient module typings for `.cvs` imports:

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

---

### 5. `src/main.ts` (Application Entry Point)

Initialize the `Engine` and mount the root `.cvs` component with HMR support:

```ts
import { Engine } from '@canvapps/core';
import App from './App.cvs';

// 1. Initialize the 120 FPS Hardware-Accelerated Canvas Engine
const engine = new Engine({
  container: '#app',
  backgroundColor: '#0f172a',
  autoResize: true,
});

// 2. Instantiate and mount the root component
const rootElement = App();
engine.setRoot(rootElement).start();

// 3. Connect Hot Module Replacement (HMR) Bridge
if (typeof window !== 'undefined') {
  window.__CANVAPPS_HMR_UPDATE__ = (newAppComponent) => {
    if (typeof newAppComponent === 'function') {
      try {
        const updatedRoot = newAppComponent();
        engine.setRoot(updatedRoot).start();
        console.log('⚡ [CanvApps HMR] Component hot reloaded successfully.');
      } catch (error) {
        console.error('❌ [CanvApps HMR] Failed to hot reload component:', error);
      }
    }
  };
}
```

---

### 6. `src/App.cvs` (Single-File Canvas Component)

Write declarative Canvas UI components with Svelte-like reactivity:

```html
<script lang="ts">
  import { signal } from '@canvapps/core';

  const count = signal(0);

  function increment() {
    count.update((n) => n + 1);
  }
</script>

<view width="100%" height="100%" alignItems="center" justifyContent="center" gap="16">
  <text fontSize="28" fontWeight="bold" color="#ffffff">
    🎨 CanvApps 120 FPS Canvas
  </text>

  <text fontSize="18" color="#94a3b8">
    Clicks: {{ count.value }}
  </text>

  <button
    label="+ Increment Count"
    backgroundColor="#2563eb"
    hoverBackgroundColor="#1d4ed8"
    labelColor="#ffffff"
    padding="[12, 24]"
    borderRadius="8"
    @click="increment"
  />
</view>
```

---

## 🔄 Compilation Pipeline Architecture

```text
┌────────────────────────┐
│     App.cvs (SFC)      │
│  <script> & <template> │
└───────────┬────────────┘
            │
            ▼  Vite Build Hook (@canvapps/vite-plugin)
┌────────────────────────────────────────────────────────┐
│   CanvApps AST Parser & Pure Code Generator            │
│   • Extracts TypeScript logic & reactive signals       │
│   • Compiles Canvas tags (<view>, <text>, <button>)    │
│   • Generates surgical signal subscription effects     │
└───────────┬────────────────────────────────────────────┘
            │
            ▼  Browser Execution (@canvapps/core)
┌────────────────────────────────────────────────────────┐
│            CANVAPPS 120 FPS RUNTIME ENGINE             │
│   ┌────────────────────────┬───────────────────────┐   │
│   │  2D GPU Hardware Loop  │   Ghost DOM Overlay   │   │
│   │  • Mathematical Flexbox│   • Mobile Keyboards  │   │
│   │  • Retina DPR Scaler   │   • Native Clipboard  │   │
│   │  • Zero DOM Reflow     │   • Full WCAG A11y    │   │
│   └────────────────────────┴───────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 💻 Official IDE Extension (`.vsix`)

To get the best developer experience when writing `.cvs` components, install the official **CanvApps IDE Extension**.

### 📥 Download Link
The extension file is available directly in the official GitHub repository:  
👉 **[canvapps-vscode-0.1.0.vsix (Download on GitHub)](https://github.com/Erickgiber/CanvApps/blob/main/canvapps-vscode-0.1.0.vsix)**

### ✨ Features
* 🌈 **Full Syntax Highlighting:** Embedded TypeScript syntax inside `<script lang="ts">`, Canvas template tags (`<view>`, `<text>`, `<button>`, `<input>`, `<motion>`, `<modal>`, `<slot>`), directives (`@if`, `@each`), dynamic bindings (`:prop`), and events (`@click`, `@input`).
* 🔍 **Go to Definition (`Cmd+Click` / `Ctrl+Click`):** Jump directly from template handlers and bindings to their declaration in `<script lang="ts">`.
* 💡 **Intelligent Autocompletion:** Instant suggestions for layout properties, colors, event handlers, and props.
* ⚡ **Productivity Snippets:** `cvs-component`, `cvs-view`, `cvs-text`, `cvs-button`, `cvs-input`, `cvs-motion`, `cvs-modal`, `cvs-signal`, `cvs-store`.

### 🚀 How to Install

#### Option 1: Visual Installation (GUI)
1. Download the [**`canvapps-vscode-0.1.0.vsix`**](https://github.com/Erickgiber/CanvApps/blob/main/canvapps-vscode-0.1.0.vsix) file from GitHub.
2. In **VS Code**, **Cursor**, **Windsurf**, or **Google Antigravity IDE**, open the **Extensions** panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the three dots menu (**`···`**) at the top right of the Extensions view.
4. Select **"Install from VSIX..."** (*Instalar desde VSIX...*).
5. Choose the downloaded `canvapps-vscode-0.1.0.vsix` file and reload the editor.

#### Option 2: Command Line (CLI)
```bash
# Download the VSIX file (if not already downloaded)
curl -LO https://raw.githubusercontent.com/Erickgiber/CanvApps/main/canvapps-vscode-0.1.0.vsix

# Install in Visual Studio Code
code --install-extension canvapps-vscode-0.1.0.vsix

# Install in Cursor IDE
cursor --install-extension canvapps-vscode-0.1.0.vsix

# Install in Windsurf IDE
windsurf --install-extension canvapps-vscode-0.1.0.vsix

# Install in VSCodium
codium --install-extension canvapps-vscode-0.1.0.vsix
```

---

## ⚙️ Plugin Options

```ts
export interface CanvAppsPluginOptions {
  /**
   * Whether to inject the official CanvApps open-source build watermark comments
   * into output JS bundles and HTML.
   * @default true
   */
  banner?: boolean;
}
```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)

