# CanvApps 🎨

<p align="center">
  <img src="./logo.svg" width="96" height="96" alt="CanvApps Logo" />
</p>

<p align="center">
  <strong>Next-Generation 100% Canvas-Based UI Framework for Web, PWA, and Native Mobile</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/canvapps"><img src="https://img.shields.io/npm/v/canvapps.svg?style=flat-square&color=2563eb" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/canvapps"><img src="https://img.shields.io/npm/dm/canvapps.svg?style=flat-square&color=059669" alt="npm downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Capacitor-Ready-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor" /></a>
</p>

---

## 🌟 What is CanvApps?

**CanvApps** is an ultra-high-performance UI framework engineered to render user interfaces **entirely inside an HTML5 2D Canvas**. By bypassing the browser's DOM layout engine and Virtual DOM reconciliation, CanvApps delivers deterministic 60–120 FPS performance, zero layout thrashing, pixel-perfect rendering across platforms, and built-in hardware acceleration.

Whether building high-frequency dashboards, data visualizers, games, audio workstation UIs, progressive web apps, or cross-platform mobile apps via Capacitor, CanvApps provides the developer ergonomics of modern component frameworks combined with the raw speed of direct 2D GPU rasterization.

---

## ⚡ Key Features

* 🚀 **Zero DOM Overhead:** The UI layout tree is calculated mathematically in pure TypeScript using a standalone, W3C-compliant Flexbox solver.
* 📐 **Pure Mathematical Flexbox:** Full support for `row`, `column`, `wrap`, `flexGrow`, `flexShrink`, `gap`, `justifyContent`, and `alignItems`.
* ⚡ **Fine-Grained Signals Reactivity:** Direct memory signals (`signal`, `computed`, `effect`, `batch`) that update only dirty Canvas nodes with zero Virtual DOM diffing.
* 📱 **Ghost DOM Technology:** Seamlessly projects transparent HTML elements to support **native mobile virtual keyboards (iOS & Android)**, screen readers (VoiceOver, TalkBack), and system clipboard copy/paste.
* 🎨 **Declarative `.cvs` Single-File Components:** Svelte-like `.cvs` component format with `<script lang="ts">`, `@each` iteration, `@if` conditionals, `:value` two-way bindings, and instant Vite Hot Module Replacement (HMR).
* 🎞️ **Native Animation Engine:** Built-in 60–120 FPS hardware-timed tweening (`animate`, `Easings.easeOutCubic`, `easeInOutCubic`, `easeOutBack`).
* 📦 **Multi-Target Automation:** Build for **SPA**, **PWA** (with automated Service Worker & Web Manifest generation), or **Capacitor Mobile** from a single `canvapps.config.ts`.
* 🛠️ **Dedicated IDE Extension:** Official syntax highlighting, autocompletion, and `Cmd+Click` / `Ctrl+Click` definition navigation for VS Code and Antigravity IDE.

---

## 📦 Installation

```bash
# Using npm
npm install canvapps

# Using pnpm
pnpm add canvapps

# Using yarn
yarn add canvapps

# Using bun
bun add canvapps
```

### CDN Direct `<script>` Tag

Include the pre-bundled UMD build in any HTML file without build tools:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    html, body, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/canvapps/dist/canvapps.umd.cjs"></script>
  <script>
    const { Engine, UIView, UIText, UIButton, signal, effect } = window.CanvApps;

    const count = signal(0);
    const engine = new Engine({ container: '#app', autoResize: true, backgroundColor: '#0f172a' });

    const root = new UIView({ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 14 });
    const text = new UIText('Clicks: 0', { fontSize: 22, color: '#ffffff' });
    const btn = new UIButton('+ Click Me', { padding: [10, 20], backgroundColor: '#2563eb', labelColor: '#ffffff' });

    btn.on('click', () => count.update(n => n + 1));
    effect(() => text.setText(`Clicks: ${count.value}`));

    root.addChild(text).addChild(btn);
    engine.setRoot(root).start();
  </script>
</body>
</html>
```

---

## 🚀 3-Minute Quickstart (TypeScript)

```ts
import { Engine, UIView, UIText, UIButton, UIInput, signal, effect } from 'canvapps';

// 1. Initialize the Engine
const engine = new Engine({
  container: '#app',
  backgroundColor: '#f8fafc',
  autoResize: true,
});

// 2. Define Reactive State
const cycleCount = signal(0);
const inputValue = signal('');

// 3. Construct Canvas UI Hierarchy
const root = new UIView({
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  gap: 16,
});

const counterText = new UIText('Cycles: 0', {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#0f172a',
});

const incrementButton = new UIButton('+ Increment', {
  padding: [10, 20],
  backgroundColor: '#2563eb',
  hoverBackgroundColor: '#1d4ed8',
  borderRadius: 8,
});

incrementButton.on('click', () => {
  cycleCount.update((n) => n + 1);
});

// 4. Bind Signals Reactively
effect(() => {
  counterText.setText(`Cycles: ${cycleCount.value}`);
});

// 5. Mount and Start the 60-120 FPS Render Loop
root.addChild(counterText).addChild(incrementButton);
engine.setRoot(root).start();
```

---

## 🎨 Declarative `.cvs` Single-File Components

CanvApps supports an elegant Single-File Component format (`.cvs`) that compiles directly to imperative Canvas nodes during build time with **zero runtime compiler overhead**.

### Example Component (`src/App.cvs`)

```html
<script lang="ts">
  interface Task {
    id: number;
    title: string;
  }

  const tasks = signal<Task[]>([
    { id: 1, title: 'Explore Pure Canvas 2D Flexbox' },
    { id: 2, title: 'Test Ghost DOM on iOS/Android' },
  ]);

  const taskInput = signal('');

  function onInput(e: any) {
    taskInput.value = e?.target?.value ?? e?.value ?? '';
  }

  function handleAddTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    tasks.update((list) => [{ id: Date.now(), title: text }, ...list]);
    taskInput.value = ''; // Reactively clears the input
  }

  function removeTask(id: number) {
    tasks.update((list) => list.filter((t) => t.id !== id));
  }
</script>

<view width="100%" height="100%" flexDirection="column" backgroundColor="#f8fafc" padding="[20, 32]" gap="16">
  
  <!-- Header Bar -->
  <view width="100%" flexDirection="row" justifyContent="space-between" alignItems="center" padding="[14, 20]" backgroundColor="#ffffff" borderRadius="12" borderWidth="1" borderColor="#e2e8f0">
    <text fontSize="18" fontWeight="bold" color="#0f172a">🎨 CanvApps Studio</text>
    <view padding="[4, 10]" backgroundColor="#ecfdf5" borderRadius="8">
      <text fontSize="11" fontWeight="600" color="#047857">● 120 FPS Retina</text>
    </view>
  </view>

  <!-- Input Form -->
  <view width="100%" flexDirection="row" gap="10">
    <input 
      placeholder="Type a new task and press Enter..." 
      flexGrow="1" 
      backgroundColor="#ffffff" 
      borderColor="#cbd5e1" 
      focusBorderColor="#2563eb"
      padding="[10, 14]" 
      :value="taskInput.value" 
      @input="onInput" 
      @submit="handleAddTask" 
    />
    <button 
      label="Add Task" 
      backgroundColor="#2563eb" 
      hoverBackgroundColor="#1d4ed8" 
      labelColor="#ffffff" 
      padding="[10, 20]" 
      @click="handleAddTask" 
    />
  </view>

  <!-- Svelte-Style Reactive List Iteration -->
  <view width="100%" flexDirection="column" gap="8" flexGrow="1">
    <view 
      @each="tasks.value as item, index" 
      width="100%" 
      backgroundColor="#ffffff" 
      borderRadius="8" 
      borderWidth="1" 
      borderColor="#e2e8f0" 
      padding="[10, 14]" 
      flexDirection="row" 
      alignItems="center" 
      justifyContent="space-between"
    >
      <text fontSize="13" color="#334155">• {{ item.title }}</text>
      <button 
        label="✕" 
        backgroundColor="#fee2e2" 
        hoverBackgroundColor="#fecaca" 
        labelColor="#dc2626" 
        width="28" 
        height="28" 
        borderRadius="14" 
        fontSize="12" 
        @click="() => removeTask(item.id)" 
      />
    </view>
  </view>

</view>
```

### 🌈 `.cvs` Template Syntax Guide

#### 1. Dynamic Property Bindings (`:prop={expr}` or `:prop="expr"`)
Pass reactive signals or ternary conditional expressions directly to layout properties:
```html
<view 
  :gap={isMobile.value ? 6 : 12} 
  :flexDirection={isMobile.value ? 'column' : 'row'} 
  :padding={isMobile.value ? [10, 12] : [18, 28]}
>
  <button :backgroundColor={isActive.value ? '#2563eb' : '#64748b'} label="Toggle" />
</view>
```

#### 2. Conditional Block Rendering (`@if { ... } else { ... }`)
Conditionally render Canvas subtrees reactively without boilerplate:
```html
@if (isMobile.value) {
  <text fontSize="12" color="#64748b">📱 Mobile Layout Active</text>
} else {
  <text fontSize="16" color="#0f172a">💻 Desktop 120 FPS Retina Layout</text>
}
```
*Also supports Svelte-style blocks (`{#if cond} ... {:else} ... {/if}`) and inline directives (`<view @if="cond">`).*

#### 3. Reactive List Iteration Blocks (`@each`)
Iterate signals with sub-millisecond updates directly as blocks:
```html
@each tasks.value as item, index {
  <view width="100%" flexDirection="row" justifyContent="space-between" padding="12">
    <text fontSize="13">• {{ item.title }}</text>
    <button label="✕" @click="() => removeTask(item.id)" />
  </view>
}
```
*Also supports Svelte-style iteration (`{#each tasks.value as item} ... {/each}`).*

#### 4. Responsive Viewport Hooks
```ts
<script lang="ts">
  const { isMobile, isTablet, isDesktop, width } = useBreakpoints();
  const isLandscape = useMediaQuery('(orientation: landscape)');
</script>
```

#### 5. Native Text Selection & Clipboard (`selectable`)
By default, `<text>` nodes rendered on Canvas 2D are selectable with a visible highlight and copyable via Ghost DOM. You can customize text selection per component:
```html
<text fontSize="14" color="#0f172a" selectable="true">
  This text can be selected with native highlight and copied using Cmd+C or the OS context menu.
</text>

<text fontSize="12" color="#94a3b8" selectable="false">
  Non-selectable UI label.
</text>

<text :selectable="isSelectable.value">
  Dynamic selection signal.
</text>
```

### Vite Plugin Setup (`vite.config.ts`)

```ts
import { defineConfig } from 'vite';
import { canvappsPlugin } from 'canvapps/compiler';

export default defineConfig({
  plugins: [canvappsPlugin()],
});
```

---

## ⚙️ Multi-Target Builds (`canvapps.config.ts`)

Configure single-command multi-target distribution across Web, PWA, and Mobile:

```ts
import { defineConfig } from 'canvapps';

export default defineConfig({
  // Target: 'SPA' | 'PWA' | 'CAPACITOR'
  target: 'PWA',
  title: 'CanvApps Production App',
  outDir: 'dist-app',

  // Automated PWA Assets & Offline Service Worker
  pwa: {
    name: 'CanvApps PWA',
    shortName: 'CanvApps',
    description: 'Hardware-accelerated Canvas Application',
    themeColor: '#2563eb',
    backgroundColor: '#f8fafc',
    display: 'standalone',
  },

  // Native Mobile Configuration (Capacitor iOS & Android)
  capacitor: {
    appId: 'com.canvapps.app',
    appName: 'CanvApps',
  },
});
```

### CLI Build Commands

```bash
# Build standalone application bundle for production (minified)
npx canvapps build

# Build unminified, inspectable code preview (shows exact TypeScript transformation)
npx canvapps preview-code

# Build library for npm/CDN distribution
npm run build:lib
```

---

## 🏛️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       CanvApps Engine                       │
├─────────────────┬──────────────────────┬────────────────────┤
│   UI Hierarchy  │    Pure FlexLayout   │   EventDispatcher  │
│   (UIElement)   │    (W3C Math Spec)   │  (Hitbox/Bubbling) │
├─────────────────┼──────────────────────┼────────────────────┤
│    Ghost DOM    │   Signals Reactive   │    .cvs Compiler   │
│  (A11y/Keyboard)│ (signal/computed/eff)│  (AST/Codegen/HMR) │
├─────────────────┴──────────────────────┴────────────────────┤
│                    Hardware Animation Engine                │
│                 (animate / requestAnimationFrame)           │
└─────────────────────────────────────────────────────────────┘
```

### 1. Mathematical Flexbox Layout
* **Direction:** `flexDirection: 'row' | 'column' | 'row-reverse' | 'column-reverse'`
* **Wrapping:** `flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'`
* **Alignment & Distribution:** `justifyContent`, `alignItems`, `alignSelf`
* **Spacing & Sizing:** `gap`, `padding`, `margin`, `flexGrow`, `flexShrink`, fixed (`px`) or relative (`%`).

### 2. Ghost DOM Technology
* Transparent, synchronized HTML `<input>` / `<textarea>` elements mirror Canvas input nodes.
* Full support for mobile virtual keyboards (iOS & Android), dictation, password managers, text selection, and screen readers (VoiceOver, TalkBack).

### 3. Fine-Grained Signals
* `signal(initialValue)`: Creates a reactive state holder.
* `computed(() => fn)`: Creates a derived memoized value.
* `effect(() => fn)`: Subscribes to signals and triggers surgical Canvas node repaints.
* `batch(() => fn)`: Groups state updates into a single frame invalidation.

---

## 📚 API Reference

| Component / Function | Purpose |
| :--- | :--- |
| `new Engine(options)` | Central Canvas renderer, RAF continuous loop, and Retina DPR scale manager. |
| `UIView` | Layout container supporting box models, background colors, borders, shadows, and radii. |
| `UIText` | Typography renderer with multiline word wrapping, alignment, and auto-centering. |
| `UIButton` | Interactive button supporting hover, active, disabled, and icon circular modes. |
| `UIInput` | Native-feeling text input with mouse drag selection, `Cmd/Ctrl+A`, cursor blinking, and mobile keyboard sync. |
| `signal(val)` / `computed(fn)` | Reactive state primitives. |
| `effect(fn)` / `batch(fn)` | Reactive subscription and update batching. |
| `animate(options)` | 60–120 FPS hardware-timed animation tween with standard easing curves. |
| `defineConfig(config)` | Helper for typed `canvapps.config.ts` configuration. |

---

## 💻 VS Code / Antigravity IDE Extension

Install the official extension for first-class developer tooling:

* 🎨 **Full Syntax Highlighting:** Embedded TypeScript and template syntax for `.cvs` files.
* 🔍 **Go to Definition (`Cmd+Click` / `Ctrl+Click`):** Jump directly from template handlers (`@click="addMilestone"`, `:value="taskInput.value"`) to their declarations in `<script>`.
* 💡 **Intelligent Autocompletion:** Instant suggestions for `@click`, `@submit`, `@input`, `@hover`, `@each`, `@if`, `:value`, and styling props.
* 📦 **Installation:**
  ```bash
  code --install-extension canvapps-vscode-0.1.0.vsix
  ```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
