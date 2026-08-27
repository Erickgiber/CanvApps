<p align="center">
  <a href="https://github.com/Erickgiber/CanvApps">
    <img src="https://raw.githubusercontent.com/Erickgiber/CanvApps/main/logo.svg" width="100" height="100" alt="CanvApps Logo" />
  </a>
</p>

<h1 align="center">CanvApps 🎨</h1>

<p align="center">
  <strong>The First Compiled UI Framework That Renders at 120 FPS by Eliminating the DOM.</strong><br>
  <em>Svelte-like compiled syntax • Native 120 FPS hardware rasterization • Zero DOM layout thrashing • Ghost DOM accessibility</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@canvapps/core"><img src="https://img.shields.io/npm/v/@canvapps/core.svg?style=flat-square&color=2563eb" alt="npm version core" /></a>
  <a href="https://www.npmjs.com/package/@canvapps/core"><img src="https://img.shields.io/npm/dm/@canvapps/core.svg?style=flat-square&color=059669" alt="npm downloads" /></a>
  <a href="https://github.com/Erickgiber/CanvApps/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.x%20%7C%206.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Capacitor-Ready-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor" /></a>
  <img src="https://img.shields.io/badge/Performance-120%20FPS%20Retina-brightgreen?style=flat-square" alt="120 FPS" />
  <img src="https://img.shields.io/badge/Architecture-Ghost%20DOM-purple?style=flat-square" alt="Ghost DOM" />
</p>

---

## ⚡ Why CanvApps?

> **CanvApps is not a canvas drawing library — it's a full compiled UI framework.**

It compiles declarative `.cvs` Single-File Components (Svelte-like syntax) into an HTML5 2D GPU-accelerated Canvas render tree at 120 FPS, backed by **Ghost DOM** for native text editing, mobile keyboards, and accessibility.

```text
┌───────────────────────────────────────┬───────────────────────────────────────┐
│       🎨 2D GPU CANVAS LAYER          │         👻 GHOST DOM LAYER            │
│  (120 FPS Hardware Rasterization)     │  (Zero-Cost Semantic HTML Overlay)    │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Pure Mathematical Flexbox           │ • Native iOS/Android Virtual Keyboards│
│ • Fine-Grained Signals (No VDOM)      │ • Real Browser Text Selection & Copy  │
│ • Hardware-timed Kinetic & Motion FX  │ • Full A11y (VoiceOver / TalkBack)    │
│ • Pixel-Perfect DPR Retina Scale      │ • OS Context Menus & IME Compositions │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

### Key Features

- 🚀 **120 FPS** — Direct Canvas 2D rendering with Retina/HiDPI scaling
- 🚫 **Zero DOM** — Pure TypeScript Flexbox solver, no reflows
- 👻 **Ghost DOM** — Native keyboards, text selection, clipboard, screen readers
- ⚡ **Signals** — `signal`, `computed`, `effect`, `batch` — no Virtual DOM diffing
- 🎨 **`.cvs` SFC** — Svelte-like components compiled at build time
- 🎞️ **Motion & KineticFX** — Declarative animations, hero morphs, particle bursts
- 📦 **Multi-Target** — SPA, PWA, or native mobile (Capacitor) from one config

---

## 🚀 Quick Start

### Create a new project (Recommended)

```bash
npm create canvapps@latest my-app
cd my-app
npm install
npm run dev
```

Also works with other package managers:

```bash
pnpm create canvapps my-app
yarn create canvapps my-app
bun create canvapps my-app
```

### Or install manually

```bash
npm install @canvapps/core
```

### CDN (No build tools)

```html
<!DOCTYPE html>
<html>
<head>
  <style>html, body, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; }</style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@canvapps/core/dist/canvapps.umd.cjs"></script>
  <script>
    const { Engine, UIView, UIText, UIButton, signal, effect } = window.canvapps;

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

## 🎨 `.cvs` Single-File Components

Compiled at build time with zero runtime overhead. Svelte-like syntax:

```html
<script lang="ts">
  const count = signal(0);
  const taskInput = signal('');

  function onInput(e: any) {
    taskInput.value = e?.target?.value ?? e?.value ?? '';
  }

  function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    tasks.update((list) => [{ id: Date.now(), title: text }, ...list]);
    taskInput.value = '';
  }

  const tasks = signal([
    { id: 1, title: 'Eliminate DOM layout thrashing' },
    { id: 2, title: 'Test Ghost DOM on iOS & Android' },
  ]);
</script>

<view width="100%" height="100%" flexDirection="column" backgroundColor="#f8fafc" padding="[20, 32]" gap="16">

  <!-- Dynamic Bindings -->
  <text fontSize="18" :color={count.value > 5 ? '#dc2626' : '#0f172a'}>
    Clicks: {{ count.value }}
  </text>

  <!-- Events -->
  <button label="+1" @click="() => count.update(n => n + 1)" />

  <!-- Inputs (Ghost DOM: native keyboards & clipboard) -->
  <input placeholder="New task..." :value="taskInput.value" @input="onInput" @submit="addTask" />

  <!-- List Iteration -->
  @each tasks.value as item, index {
    <view width="100%" padding="12" flexDirection="row" justifyContent="space-between">
      <text fontSize="13" selectable="true">• {{ item.title }}</text>
    </view>
  }

  <!-- Conditionals -->
  @if (count.value > 10) {
    <text color="#059669">🎉 You passed 10 clicks!</text>
  }

</view>
```

---

## 🌈 Template Syntax

### Dynamic Bindings (`:prop={expr}`)
```html
<view :gap={isMobile.value ? 6 : 12} :flexDirection={isMobile.value ? 'column' : 'row'}>
  <button :backgroundColor={isActive.value ? '#2563eb' : '#64748b'} label="Toggle" />
</view>
```

### Conditionals (`@if / @else`)
```html
@if (isMobile.value) {
  <text>📱 Mobile Layout</text>
} else {
  <text>💻 Desktop Layout</text>
}
```

### List Iteration (`@each`)
```html
@each tasks.value as item, index {
  <view width="100%" padding="12">
    <text selectable="true">• {{ item.title }}</text>
    <button label="✕" @click="() => removeTask(item.id)" />
  </view>
}
```

### Component Composition
```html
<script lang="ts">
  import HomeView from './views/HomeView.cvs';
  import SettingsView from './views/SettingsView.cvs';
  const showSettings = signal(false);
</script>

<view width="100%" height="100%">
  @if (showSettings.value) {
    <SettingsView @close="() => showSettings.value = false" />
  } else {
    <HomeView />
  }
</view>
```

### Events (`@event`)
```html
<button label="Save" @click="handleSave" />
<button label="+1" @click="() => count.update(n => n + 1)" />
<input @input="onInput" @submit="onSubmit" />
<select :options="options" @change="onChange" />
<view @pointerenter="() => hovered.value = true" @pointerleave="() => hovered.value = false">
  <text>Hover me</text>
</view>
```

Supported events: `@click`, `@dblclick`, `@pointerdown`, `@pointerup`, `@pointermove`, `@pointerenter`, `@pointerleave`, `@input`, `@change`, `@submit`, `@keydown`, `@keyup`, `@scroll`, `@wheel`, `@finish`, `@close`.

---

## 🎞️ Motion & Animations

### Declarative `<motion>` Transitions
```html
<motion animation="cinematic-splash" :duration="1100" :hold="800" @finish="onSplashFinish">
  <view width="100%" height="100%" backgroundColor="#090d16" alignItems="center" justifyContent="center">
    <text fontSize="56" fontWeight="bold" color="#ffffff">CanvApps</text>
  </view>
</motion>

<motion enter="elastic" exit="slide-left" :duration="450">
  <GalleryView />
</motion>
```

### KineticFX (Particle Bursts & Flying Tokens)
```ts
import { KineticFX } from '@canvapps/core';

KineticFX.flyToken({
  from: { x: e.clientX, y: e.clientY },
  to: '#counter-badge',
  text: '+100 XP',
  duration: 480,
  onHit: () => score.value += 100,
});

KineticFX.burst({
  x: e.clientX, y: e.clientY,
  colors: ['#38bdf8', '#34d399', '#818cf8'],
  count: 24,
});
```

### Modal with Hero Morph
```html
<modal :open="isOpen.value" :originRect="rect.value" animation="hero" :blur="true" @close="closeModal">
  <view width="760" backgroundColor="#ffffff" borderRadius="20" padding="28">
    <text fontSize="20" fontWeight="bold">Hero Expanded Dialog</text>
  </view>
</modal>
```

### Smart Animate (Shared Element Transitions)
Assign matching `:layoutId` props to elements across views for fluid morph transitions:
```html
<!-- Source -->
<a href="/docs" label="📖 Docs" :layoutId="'nav-docs'" />

<!-- Destination -->
<text :layoutId="'nav-docs'" fontSize="13" fontWeight="bold">📖 Docs</text>
```

---

## 💾 Reactive Stores

```ts
import { createStore, computed, persistentSignal } from '@canvapps/core';

export const sessionStore = createStore({
  user: null,
  isAuthenticated: false,
  theme: 'light' as 'light' | 'dark',
}, { name: 'session', persist: true }); // Auto localStorage sync

export const isLoggedIn = computed(() => sessionStore.state.isAuthenticated);
export const authToken = persistentSignal('jwt_token', '');
```

---

## ⚙️ Configuration (`canvapps.config.ts`)

```ts
import { defineConfig } from '@canvapps/core';

export default defineConfig({
  target: 'PWA',        // 'SPA' | 'PWA' | 'CAPACITOR'
  title: 'My App',
  outDir: 'dist-app',
  banner: true,         // Open-source watermark in output
  safeArea: true,       // Auto notch/status bar insets
  themeColor: { light: '#f8fafc', dark: '#090d16' },
  pwa: {
    name: 'My App',
    shortName: 'App',
    themeColor: '#2563eb',
    display: 'standalone',
  },
  capacitor: {
    appId: 'com.myapp.app',
    appName: 'My App',
  },
});
```

---

## 📱 Safe Area & Theme Color

```html
<!-- Auto notch/status bar spacing -->
<view width="100%" safeArea="top" padding={[12, 20]}>
  <text fontSize="18" fontWeight="bold">🎨 My App</text>
</view>
```

```ts
import { useSafeArea, setThemeColor } from '@canvapps/core';

const { top, bottom } = useSafeArea();
// top.value => 47 on iPhone 15, 0 on desktop

setThemeColor('#101010'); // Updates status bar, titlebar, overscroll
```

---

## 🛠️ Vite Plugin Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite';
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
});
```

---

## 🏗️ CLI Commands

```bash
# Create a new project
npm create canvapps@latest my-app

# Development server (Vite + HMR)
npm run dev

# Production build
npx canvapps build

# Format .cvs files
npx canvapps format
```

---

## 💻 IDE Extension

Official extension for **VS Code**, **Cursor**, **Windsurf**, and **Antigravity IDE**:

👉 [**Download canvapps-vscode-0.1.0.vsix**](https://github.com/Erickgiber/CanvApps/blob/main/canvapps-vscode-0.1.0.vsix)

**Features:** Syntax highlighting, Go to Definition, autocompletion, snippets (`cvs-component`, `cvs-view`, `cvs-button`, etc.), and tag auto-closing for `.cvs` files.

```bash
# Install via CLI
code --install-extension canvapps-vscode-0.1.0.vsix
```

---

## 📚 API Reference

| API | Description |
| :--- | :--- |
| `createApp(Component, options?)` | Create and configure an app instance |
| `app.mount('#container')` | Mount app to DOM element |
| `new Engine(options)` | Canvas renderer with 120 FPS loop |
| `UIView` | Flexbox layout container |
| `UIText` | Multiline text with optional selection |
| `UIButton` | Interactive button with hover/active states |
| `UIInput` | Text input with Ghost DOM keyboard sync |
| `UISelect` | Canvas dropdown selector |
| `UIModal` | Modal with hero morph & blur |
| `UIMotion` | Declarative scene transitions |
| `KineticFX` | Flying tokens & particle bursts |
| `signal(val)` | Reactive state primitive |
| `computed(fn)` | Derived reactive value |
| `effect(fn)` | Reactive side effect |
| `batch(fn)` | Batch multiple signal updates |
| `createStore(state, opts?)` | Global reactive store with persistence |
| `persistentSignal(key, val)` | Signal with localStorage sync |
| `createRouter(config)` | Client-side canvas router |
| `useSafeArea()` | Reactive device inset signals |
| `setThemeColor(color)` | Dynamic status bar/titlebar sync |
| `defineConfig(config)` | Typed `canvapps.config.ts` helper |

---

## 📊 Comparison

| | DOM Frameworks | Flutter Web | **CanvApps** |
| :--- | :--- | :--- | :--- |
| **Rendering** | Browser DOM | WebGL/Skia (Wasm) | **Canvas 2D (GPU)** |
| **FPS** | 30–60 | 45–60 | **60–120** |
| **Layout** | Browser reflows | Dart layout | **Math Flexbox (TS)** |
| **Reactivity** | VDOM diffing | Widget rebuild | **Fine-grained signals** |
| **Keyboards** | Native | Emulated | **Native (Ghost DOM)** |
| **A11y** | Native | Emulated | **Native (Ghost DOM)** |
| **Bundle** | Medium–Heavy | >2MB Wasm | **<30KB** |

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
