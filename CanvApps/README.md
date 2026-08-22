<p align="center">
  <img src="./logo.svg" width="128" height="128" alt="CanvApps Logo" />
</p>

<h1 align="center">CanvApps</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/canvapps"><img src="https://img.shields.io/npm/v/canvapps.svg?style=flat-square" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict%205.7-blue?style=flat-square" alt="TypeScript" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
</p>

> **High-Performance 100% Canvas-Based UI Framework** for Single Page Applications (SPA), Progressive Web Apps (PWA), and Native Mobile apps via Capacitor JS.

---

## 🌟 Overview

**CanvApps** is a next-generation UI framework engineered from the ground up to render user interfaces entirely onto an HTML5 `<canvas>` element. By bypassing the browser DOM layout engine, CanvApps achieves predictable 60-120 FPS rendering, zero layout thrashing, pixel-perfect cross-platform consistency, and hardware-accelerated graphics.

### Key Highlights

* 🚀 **Zero DOM Overhead:** The UI layout tree is calculated mathematically in pure TypeScript using a standalone W3C Flexbox solver.
* 📐 **Pure Mathematical Flexbox:** Native support for `row`, `column`, `wrap`, `flexGrow`, `flexShrink`, `gap`, `justifyContent`, and `alignItems`.
* 📱 **Multi-Target Automated Builds:** Build for **SPA**, **PWA** (auto-generated `manifest.json` & Service Worker), or **Native Mobile (iOS & Android)** via Capacitor JS from a single `canvapps.config.ts`.
* 👁️ **Ghost DOM Layer:** Injects transparent native DOM inputs for accessible screen readers (VoiceOver, TalkBack) and native mobile virtual keyboards.
* ⚡ **Fine-Grained Signals Reactivity:** Ultra-lightweight reactive primitives (`signal`, `computed`, `effect`, `batch`) with automatic frame invalidation.
* 🎨 **Declarative `.cvs` SFC Compiler:** Single File Components with `<script lang="ts">` and declarative template markup with instant Vite Hot Module Replacement (HMR).
* 📦 **Linear Single-Bundle Distribution:** Compiles to a minified standalone JS bundle without runtime dependencies, suitable for NPM or CDN.

---

## 📦 Installation

```bash
# Using npm
npm install canvapps

# Using pnpm
pnpm add canvapps

# Using yarn
yarn add canvapps
```

### CDN Quick Start

Include the UMD bundle directly in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/canvapps/dist/canvapps.umd.cjs"></script>
<script>
  const { Engine, UIView, UIText } = window.CanvApps;

  const engine = new Engine({ container: document.body, autoResize: true });
  const root = new UIView({ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' });
  const text = new UIText('Hello from CanvApps!', { fontSize: 24, color: '#38bdf8' });

  root.addChild(text);
  engine.setRoot(root).start();
</script>
```

---

## 🚀 Quick Start (TypeScript)

```ts
import { Engine, UIView, UIText, UIButton, UIInput, signal, effect } from 'canvapps';

// 1. Initialize the Engine
const engine = new Engine({
  container: '#app',
  backgroundColor: '#0f172a',
  autoResize: true,
});

// 2. Define Reactive State
const count = signal(0);

// 3. Build UI Component Hierarchy
const root = new UIView({
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 32,
  gap: 16,
});

const label = new UIText('Clicks: 0', {
  fontSize: 20,
  color: '#f8fafc',
});

const button = new UIButton('+ Increment', {
  padding: [10, 20],
  backgroundColor: '#0284c7',
  hoverBackgroundColor: '#0369a1',
  activeBackgroundColor: '#075985',
  borderRadius: 8,
});

button.on('click', () => {
  count.update((n) => n + 1);
});

// 4. Bind State to View
effect(() => {
  label.setText(`Clicks: ${count.value}`);
});

// 5. Mount and Start Render Loop
root.addChild(label).addChild(button);
engine.setRoot(root).start();
```

---

## 🎨 Declarative `.cvs` Single File Components

CanvApps provides a custom Single File Component syntax (`.cvs`) powered by its built-in AST compiler and Vite plugin.

### `App.cvs`
```html
<script lang="ts">
  const counter = signal(0);
  const tasks = signal<string[]>(['Learn CanvApps', 'Build Canvas App']);

  function handleIncrement() {
    counter.update((n) => n + 1);
  }
</script>

<view width="100%" height="100%" flexDirection="column" alignItems="center" justifyContent="center" padding="24">
  <view width="480" backgroundColor="#1e293b" borderRadius="16" padding="24" flexDirection="column" gap="16">
    <text fontSize="22" fontWeight="bold" color="#38bdf8" textAlign="center">
      CanvApps Component
    </text>

    <view width="100%" flexDirection="row" justifyContent="space-between" alignItems="center">
      <text fontSize="16" color="#ffffff">Clicks: {{ counter.value }}</text>
      <button label="Click Me" @click="handleIncrement" />
    </view>
  </view>
</view>
```

### Vite Configuration (`vite.config.ts`)
```ts
import { defineConfig } from 'vite';
import { canvappsPlugin } from 'canvapps/compiler';

export default defineConfig({
  plugins: [canvappsPlugin()],
});
```

---

## ⚙️ Multi-Target Configuration (`canvapps.config.ts`)

Configure your application deployment target in `canvapps.config.ts`:

```ts
import { defineConfig } from 'canvapps';

export default defineConfig({
  // Target: 'SPA' | 'PWA' | 'CAPACITOR'
  target: 'PWA',
  title: 'My Canvas App',
  outDir: 'dist-app',

  // PWA Configuration
  pwa: {
    name: 'My Canvas App',
    shortName: 'CanvasApp',
    description: 'High-performance Canvas UI PWA',
    themeColor: '#0f172a',
    backgroundColor: '#0f172a',
    display: 'standalone',
  },

  // Native Mobile Configuration (Capacitor JS)
  capacitor: {
    appId: 'com.mycompany.canvasapp',
    appName: 'My Canvas App',
  },
});
```

### Build Commands

```bash
# Build standalone application bundle according to canvapps.config.ts
npx canvapps build

# Run local development server with Vite
npx vite
```

---

## 🏛️ Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CanvApps Engine                       │
├─────────────────┬──────────────────────┬────────────────────┤
│   UI Hierarchy  │    Pure FlexLayout   │   EventDispatcher  │
│   (UIElement)   │    (W3C Math Spec)   │  (Hitbox/Bubbling) │
├─────────────────┼──────────────────────┼────────────────────┤
│    Ghost DOM    │   Signals Reactive   │    .cvs Compiler   │
│  (A11y/Keyboard)│ (signal/computed/eff)│  (AST/Codegen/HMR) │
└─────────────────┴──────────────────────┴────────────────────┘
```

### 1. Mathematical Flexbox Layout
CanvApps implements a W3C-compliant box model and Flexbox engine directly in TypeScript:
* **Axes:** `flexDirection: 'row' | 'column' | 'row-reverse' | 'column-reverse'`
* **Wrapping:** `flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'`
* **Distribution:** `justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'`
* **Alignment:** `alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch'`, `alignSelf`
* **Spacing:** `gap`, `rowGap`, `columnGap`, `padding`, `margin`
* **Sizing:** Fixed pixels (`width: 300`), percentages (`width: '50%'`), auto, `flexGrow`, `flexShrink`, `flexBasis`.

### 2. Ghost DOM Layer (Mobile Keyboards & Accessibility)
Canvas elements lack native DOM focus, clipboard, and screen reader trees. CanvApps solves this with an automated **Ghost DOM Overlay**:
* Transparent, precisely positioned HTML `<input>` and `<textarea>` elements mirror active Canvas input nodes.
* On iOS & Android (via Capacitor or PWA), focusing a Canvas input triggers the **native mobile keyboard, auto-complete, dictation, and password managers**.
* Full screen-reader accessibility (VoiceOver / TalkBack).

### 3. Fine-Grained Signals
* `signal(initialValue)`: Creates a reactive state container.
* `computed(() => fn)`: Creates a derived read-only memoized signal.
* `effect(() => fn)`: Re-executes when tracked signals change, automatically marking dirty nodes.
* `batch(() => { ... })`: Batches state mutations into a single repaint pass.

---

## 📚 API Reference

### Core
* `new Engine(options)`: Main Canvas renderer, RAF loop, DPR retina scaling.
* `UIElement`: Base abstract class for all nodes.
* `UIView`: Box container with `backgroundColor`, `borderRadius`, `border`, `boxShadow`, `overflow: 'hidden'`.
* `UIText`: High-precision typography with `wordWrap`, `maxLines`, `textAlign`, and `ellipsis`.
* `UIButton`: Interactive button with `hover`, `active`, and `disabled` states.
* `UIInput`: Text input with Ghost DOM integration, native keyboard support, and animated cursor.

### Events
* `element.on(eventType, listener)`: Registers event listeners (`click`, `pointerdown`, `pointermove`, `pointerup`, `pointerenter`, `pointerleave`, `wheel`, `focus`, `blur`).
* `element.off(eventType, listener)`: Removes event listener.
* `CanvasPointerEvent`: Wrapped event object with `x`, `y`, `stopPropagation()`, `preventDefault()`.

---

## 📄 License

MIT © [Erick Giber](https://github.com/Erickgiber)
