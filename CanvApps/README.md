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

#### 4. Custom Component Imports & Composition
Import any `.cvs` Single-File Component in `<script lang="ts">` and invoke it directly in templates using standard PascalCase tags:
```html
<script lang="ts">
  import SplashView from './views/SplashView.cvs';
  import DashboardView from './views/DashboardView.cvs';

  const showSplash = signal(true);
</script>

<view width="100%" height="100%">
  @if (showSplash.value) {
    <SplashView @finish="() => showSplash.value = false" />
  } else {
    <DashboardView />
  }
</view>
```

#### 5. Persistent Master Layouts (`AppLayout.cvs`) & Reusable Headers
CanvApps enables building **Persistent Master Layouts** that keep static UI elements (Headers, Sidebars, Toasts, Modals) mounted in memory while dynamic scene content transitions smoothly inside child slots:

```html
<!-- src/layouts/AppLayout.cvs -->
<script lang="ts">
  import AppHeader from '../components/AppHeader.cvs';

  function onNavigate(target: string) {
    props.onNavigate?.(target);
  }
</script>

<view width="100%" height="100%" flexDirection="column" backgroundColor="#f8fafc" padding="[16, 24]" gap="14">
  <!-- Persistent Header with dynamic route switcher & theme toggling -->
  <AppHeader :activeRoute="props.activeRoute" @navigate="onNavigate" />

  <!-- Dynamic Content Slot -->
  <view width="100%" flexGrow="1" position="relative">
    <slot />
  </view>
</view>
```

#### 6. Reactive Router & View Management (`createRouter`, `useRouter`)
CanvApps provides a fine-grained, signal-powered router for Single-Page and Multi-View Applications with zero DOM overhead:
```ts
<script lang="ts">
  import { createRouter, useRouter } from 'canvapps';
  import HomeView from './views/HomeView.cvs';
  import SettingsView from './views/SettingsView.cvs';

  const router = createRouter({
    initialRoute: '/home',
    routes: [
      { path: '/home', component: HomeView },
      { path: '/settings', component: SettingsView },
    ],
  });
</script>

<view width="100%" height="100%">
  @if (router.currentPath.value === '/home') {
    <HomeView />
  }
  @if (router.currentPath.value === '/settings') {
    <SettingsView />
  }
</view>
```

#### 7. Canvas Animations & Intelligent Motion Engine (`<motion>`, `KineticFX`, `animate`)
CanvApps provides first-class, hardware-timed 60/120 FPS declarative animation primitives directly rendered on Canvas 2D nodes with zero Virtual DOM overhead.

##### A. Declarative `<motion>` Component & Presets
Wrap any Canvas view or element in `<motion>` to automate transitions, spring physics, or cinematic sequences without writing imperative animation loops:

```html
<!-- 1. Cinematic Multi-Phase Splash Screen with Sub-pixel Kerning & Negative Exit -->
<motion 
  animation="cinematic-splash" 
  :duration="1100" 
  :hold="800" 
  :exitDuration="450" 
  :initialSpacing="26"
  @finish="onSplashFinish"
  @update="onFrameUpdate"
>
  <view width="100%" height="100%" backgroundColor="#090d16" flexDirection="column" alignItems="center" justifyContent="center">
    <text fontSize="56" fontWeight="bold" color="#ffffff">CanvApps</text>
    <text fontSize="14" color="#94a3b8">Hardware-Timed Canvas Engine</text>
  </view>
</motion>

<!-- 2. Smooth Scene Entrance & Directional Exit Transitions -->
<motion 
  enter="elastic" 
  exit="slide-left" 
  :duration="450" 
  :exitDuration="320"
>
  <view width="100%" height="100%" flexDirection="column" backgroundColor="#f8fafc">
    <DashboardContent />
  </view>
</motion>
```

##### Supported `<motion>` Animation Presets & Props
| Prop / Attribute | Type | Description |
| :--- | :--- | :--- |
| `animation` / `enter` | `'cinematic-splash' \| 'scale' \| 'scale-in' \| 'zoom-in' \| 'fade' \| 'fade-in' \| 'slide-left' \| 'slide-right' \| 'slide-up' \| 'slide-down' \| 'elastic' \| 'blur-reveal'` | Entrance transition preset (default: `'scale-in'`) |
| `exit` | `'scale' \| 'zoom-out' \| 'fade' \| 'slide-left' \| 'slide-right' \| 'slide-up' \| 'slide-down'` | Exit transition preset (default: `'slide-left'`) |
| `duration` / `entranceDuration` | `number` (ms) | Main entrance transition duration (default: `450ms`) |
| `hold` / `holdDuration` | `number` (ms) | Hold duration before sequence exit (for `cinematic-splash`, default: `500ms`) |
| `exitDuration` | `number` (ms) | Exit transition duration (default: `340ms`) |
| `delay` | `number` (ms) | Initial delay in ms before playing (default: `0`) |
| `autoPlay` | `boolean` | Whether animation begins automatically upon mounting (default: `true`) |
| `initialSpacing` | `number` (px) | Starting letter spacing for `cinematic-splash` continuous convergence (default: `26px`) |
| `@finish` | `(e) => void` | Event emitted upon entrance transition completion |
| `@exitFinish` | `(e) => void` | Event emitted upon exit transition completion |
| `@update` | `(state) => void` | Continuous 60/120 FPS frame callback (`{ scale, opacity, letterSpacing, subtitleOpacity }`) |

---

##### B. Kinetic Flight Tokens & Particle Explosions (`KineticFX`)
`KineticFX` renders high-precision 2D physics simulations, curved parabolic projectile tokens, radial particle bursts, and glowing shockwave rings directly over the active Canvas surface:

```ts
import { KineticFX } from 'canvapps';

// 1. Launch a Parabolic Flying Token (Glides along Bezier curve to target badge or coordinates)
KineticFX.flyToken({
  from: { x: clickEvent.clientX, y: clickEvent.clientY }, // Source coordinates or element
  to: '#counter-badge',                                   // Target UIElement ID selector or { x, y }
  text: '+100 XP',                                        // Pill text badge
  color: '#2563eb',                                       // Pill text and shadow color
  backgroundColor: '#dbeafe',                             // Pill background color
  borderColor: '#93c5fd',                                 // Pill border color
  duration: 480,                                          // Flight duration in ms
  arcHeight: 65,                                          // Parabolic arc curvature height in px
  onHit: () => {
    streakScore.value += 100;                             // Reactively update state upon arrival
  },
});

// 2. Radial Particle Burst with Glowing Shockwave
KineticFX.burst({
  x: clickEvent.clientX,
  y: clickEvent.clientY,
  colors: ['#38bdf8', '#34d399', '#818cf8', '#f43f5e'],
  count: 24,                                              // Number of stardust particles
  radius: 60,                                             // Shockwave expansion radius in px
});
```

---

##### C. Low-Level Animation Tweening & Easing Engine (`animate`, `Easings`, `Motion`)
For custom Canvas graphics, game loops, or procedural transitions, CanvApps includes a sub-millisecond precision tweening engine with a rich library of mathematical easing curves:

```ts
import { animate, Easings, Motion } from 'canvapps';

// 1. Sub-millisecond Hardware-Timed RAF Tween
const stopTween = animate({
  from: 0,
  to: 100,
  duration: 500,
  easing: Easings.easeOutBack,
  onUpdate: (value) => {
    progressBarWidth.value = value;
  },
  onComplete: () => {
    console.log('Tween completed!');
  },
});

// 2. Imperative Element Transition Helpers
const stopEnter = Motion.enter(myViewElement, {
  type: 'elastic',
  duration: 600,
  fromScale: 0.5,
  toScale: 1.0,
  onComplete: () => console.log('Element entered scene!'),
});

const stopExit = Motion.exit(myViewElement, {
  type: 'slide-down',
  duration: 300,
  onComplete: () => console.log('Element exited scene!'),
});
```

###### Built-in Mathematical Easing Curves (`Easings`)
* **Linear:** `Easings.linear`
* **Quadratic:** `Easings.easeInQuad`, `Easings.easeOutQuad`, `Easings.easeInOutQuad`
* **Cubic:** `Easings.easeInCubic`, `Easings.easeOutCubic`, `Easings.easeInOutCubic`
* **Quartic & Exponential:** `Easings.easeInQuart`, `Easings.easeOutQuart`, `Easings.easeOutExpo`
* **Fluid Deceleration:** `Easings.fluidOut` (quartic-out curve for natural UI settling)
* **Back & Elastic Spring Curves:** `Easings.easeOutBack(t, overshoot?)`, `Easings.easeInOutBack`, `Easings.elasticOut`

---

#### 8. Modal Dialogs & Hero Shared-Element Morph Transitions (`<modal>`)
CanvApps includes a high-performance `<modal>` Canvas node that supports **Figma Smart Animate-style Hero Shared-Element Morph Transitions**, fluid deceleration curves, frosted glass background blur, and radial gradient backdrops:

```html
<!-- 1. Figma-Grade Shared-Element Hero Morph Expansion Lightbox -->
<script lang="ts">
  const isModalOpen = signal(false);
  const originRect = signal<{ x: number; y: number; width: number; height: number } | null>(null);

  function openLightbox(item: any, event: any) {
    // Capture spatial world bounding box of clicked thumbnail
    if (event?.target?.worldRect) {
      originRect.value = { ...event.target.worldRect };
    }
    isModalOpen.value = true;
  }

  function closeModal() {
    isModalOpen.value = false;
  }
</script>

<modal 
  :open="isModalOpen.value" 
  :originRect="originRect.value" 
  animation="hero" 
  :duration="340" 
  :blur="true"
  :blurRadius="12"
  backdropColor="rgba(0, 0, 0, 0.85)"
  @close="closeModal"
>
  <view width="760" backgroundColor="#ffffff" borderRadius="20" padding="28" flexDirection="column" gap="18">
    <view width="100%" flexDirection="row" justifyContent="space-between" alignItems="center">
      <text fontSize="20" fontWeight="bold" color="#0f172a">Hero Expanded Dialog</text>
      <button label="✕ Close" backgroundColor="#f1f5f9" labelColor="#475569" borderRadius="14" padding="[6, 12]" @click="closeModal" />
    </view>
    <text fontSize="14" color="#64748b">
      Smoothly expanded from thumbnail bounding box directly into full dialog with zero DOM lag.
    </text>
  </view>
</modal>

<!-- 2. Scale-In Dialog with Radial Gradient Backdrop -->
<modal 
  animation="scale-in" 
  :gradient="true" 
  :backdropColors="['rgba(37, 99, 235, 0.45)', 'rgba(15, 23, 42, 0.92)']" 
  :duration="320" 
  @close="closeModal"
>
  <view width="380" backgroundColor="#ffffff" borderRadius="20" padding="24" flexDirection="column" gap="16">
    <text fontSize="18" fontWeight="bold">Streak Reached! 🔥</text>
    <button label="Continue" backgroundColor="#2563eb" labelColor="#ffffff" @click="closeModal" />
  </view>
</modal>
```

##### Supported `<modal>` Animation Presets & Props
| Prop / Attribute | Type | Description |
| :--- | :--- | :--- |
| `animation` | `'hero' \| 'zoom-center' \| 'scale-in' \| 'slide-up' \| 'fade' \| 'zoom-in' \| 'none'` | Entrance animation style preset (default: `'hero'`) |
| `originRect` / `:originRect` | `{ x: number, y: number, width: number, height: number }` | Source spatial bounding box for **Hero Shared-Element Morph** expansion |
| `open` / `:open` | `boolean` | Controls open/closed modal visibility with bidirectional animated transition |
| `animated` / `:animated` | `boolean` | Enable or disable transition animations (default: `true`) |
| `duration` / `:duration` | `number` (ms) | Modal entrance duration (exit duration is automatically fluidly scaled, default: `300ms`) |
| `blur` / `blurBackdrop` | `boolean` | Enable frosted glass background blur over underlying scene (default: `false`) |
| `blurRadius` | `number` (px) | Blur radius in pixels (default: `8px`) |
| `gradient` / `backdropGradient` | `boolean` | Use radial gradient backdrop instead of solid color (default: `true`) |
| `backdropColor` | `string` | Backdrop overlay color or gradient start color (default: `'rgba(0, 0, 0, 0.78)'`) |
| `backdropColors` | `[string, string]` | Two-stop custom radial gradient array `[innerColor, outerColor]` |
| `closeOnBackdropClick` | `boolean` | Dismiss modal when tapping outside dialog card (default: `true`) |
| `@close` | `(e) => void` | Event emitted when backdrop or close action is triggered |

#### 9. Responsive Viewport Hooks
```ts
<script lang="ts">
  const { isMobile, isTablet, isDesktop, width } = useBreakpoints();
  const isLandscape = useMediaQuery('(orientation: landscape)');
</script>
```

#### 10. External Global Reactive Stores & State Persistence (`createStore`, `defineStore`, `persistentSignal`)
CanvApps allows creating reactive stores and persistent signals directly in standard TypeScript files (`.store.ts` or `.ts`), allowing state (user sessions, auth tokens, themes, global cache) to be shared across views, components, and browser tabs with zero reactivity loss:

```ts
// src/stores/session.store.ts
import { createStore, computed, persistentSignal } from 'canvapps';

export interface UserSession {
  user: { name: string; email: string; avatar: string } | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
}

// 1. Create a Global Reactive Store with Auto-Persistence to localStorage
export const sessionStore = createStore<UserSession>({
  user: null,
  isAuthenticated: false,
  theme: 'light',
}, {
  name: 'session',
  persist: true, // Auto-persists & syncs across browser tabs in real-time
});

// 2. Computed signals derived from global stores
export const isUserLoggedIn = computed(() => sessionStore.state.isAuthenticated);

// 3. Store actions in TypeScript
export function login(email: string) {
  sessionStore.set({
    user: { name: 'Meliodas', email, avatar: '👨‍💻' },
    isAuthenticated: true,
  });
}

export function logout() {
  sessionStore.reset();
}

// 4. Standalone Persistent Signals
export const authToken = persistentSignal('jwt_token', '');
```

##### Using Stores inside `.cvs` Single-File Components:
```html
<script lang="ts">
  import { sessionStore, login, logout } from './stores/session.store';
</script>

<view width="100%">
  @if (sessionStore.state.isAuthenticated) {
    <text fontSize="16">Welcome back, {{ sessionStore.state.user.name }}!</text>
    <button label="Log Out" @click="logout" />
  } else {
    <button label="Sign In" @click="() => login('user@canvapps.dev')" />
  }
</view>
```

#### 11. Native Text Selection & Clipboard (`selectable`)
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

### 💅 Prettier & IDE Code Formatting
Format `.cvs` files automatically on save with Prettier using Svelte parser integration:
```json
// .prettierrc
{
  "overrides": [
    {
      "files": "*.cvs",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}
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
| `UIMotion` | Declarative 60/120 FPS scene entrance, slide, elastic, and cinematic splash transitions. |
| `UIModal` | High-performance modal overlay with Hero Shared-Element Morph expansion and frosted glass blur. |
| `KineticFX` | Curved parabolic flight tokens, stardust trails, and radial shockwave particle bursts. |
| `signal(val)` / `computed(fn)` | Reactive state primitives. |
| `effect(fn)` / `batch(fn)` | Reactive subscription and update batching. |
| `animate(options)` | 60–120 FPS hardware-timed animation tween with standard and advanced easing curves (`Easings`). |
| `defineConfig(config)` | Helper for typed `canvapps.config.ts` configuration. |

---

## 💻 IDE Extension Installation & Tooling (`.vsix`)

The official **CanvApps IDE Extension** provides first-class developer tooling for `.cvs` Single-File Components across **VS Code**, **Cursor**, **VSCodium**, **Windsurf**, and **Google Antigravity IDE**.

```text
canvapps-vscode-0.1.0.vsix (Included in repository root)
```

### ✨ Extension Features
* 🌈 **Full Syntax Highlighting:** Embedded TypeScript syntax inside `<script lang="ts">`, Canvas template tags (`<view>`, `<text>`, `<button>`, `<input>`, `<motion>`, `<modal>`, `<slot>`), directives (`@if`, `@each`), dynamic attributes (`:value`, `:gap`), and reactive events (`@click`, `@input`, `@finish`).
* 🔍 **Go to Definition (`Cmd+Click` / `Ctrl+Click`):** Jump directly from template handlers (`@click="handleTask"`, `:value="taskInput.value"`) to their exact declaration inside `<script lang="ts">`.
* 💡 **Intelligent Autocompletion:** Instant suggestions for Canvas layout props, reactive bindings, and events.
* ⚡ **Productivity Snippets:**
  * `cvs-component` → Full `.cvs` Single-File Component boilerplate.
  * `cvs-view` → Flexbox layout container.
  * `cvs-text` → Typography node with bindings.
  * `cvs-button` → Interactive button with hover/active styles.
  * `cvs-input` → Synchronized Ghost DOM text input.
  * `cvs-motion` → Hardware-accelerated motion transition container.
  * `cvs-modal` → Animated dialog with Hero Shared-Element morph or scale-in.
  * `cvs-signal` / `cvs-store` → Reactive state and store templates.
* 🛠️ **Tag Auto-Closing & Bracket Matching:** Native editor ergonomics for `.cvs` files.

---

### 📦 How to Install the `.vsix` Extension

You can install `canvapps-vscode-0.1.0.vsix` into your preferred code editor using any of the methods below:

#### Method 1: Command Line (CLI) — Fastest

Run the install command corresponding to your IDE in your terminal:

```bash
# 🔹 Visual Studio Code
code --install-extension canvapps-vscode-0.1.0.vsix

# 🔹 Cursor IDE
cursor --install-extension canvapps-vscode-0.1.0.vsix

# 🔹 VSCodium (Open-Source VS Code)
codium --install-extension canvapps-vscode-0.1.0.vsix

# 🔹 Windsurf IDE
windsurf --install-extension canvapps-vscode-0.1.0.vsix

# 🔹 Google Antigravity IDE / Code Server
code --install-extension canvapps-vscode-0.1.0.vsix
```

> **Tip:** If the command is not recognized, open your IDE, press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux), and run **"Shell Command: Install 'code' command in PATH"** (or `'cursor'`, `'codium'`, etc.).

---

#### Method 2: Graphical User Interface (GUI)

1. Open your editor (**VS Code**, **Cursor**, **VSCodium**, **Windsurf**, or **Antigravity IDE**).
2. Open the **Extensions View** by pressing `Cmd+Shift+X` (macOS) or `Ctrl+Shift+X` (Windows/Linux), or by clicking the Extensions icon on the Activity Bar.
3. Click the **`...` (Views and More Actions)** menu button in the top right corner of the Extensions panel.
4. Select **"Install from VSIX..."** from the dropdown list.
5. In the file picker dialog, navigate to the root of this project and choose **`canvapps-vscode-0.1.0.vsix`**.
6. Click **Install**. Once completed, a notification will confirm that the extension was installed successfully.
7. *(Optional)* Reload the IDE if prompted.

---

#### Method 3: Direct Extension Folder Link (Development Mode)

If you are developing or modifying the extension directly in `CanvApps/extension`, you can link or copy the extension folder to your local editor extensions directory:

##### macOS & Linux:
```bash
# For VS Code
cp -r CanvApps/extension ~/.vscode/extensions/canvapps-vscode

# For Cursor
cp -r CanvApps/extension ~/.cursor/extensions/canvapps-vscode

# For VSCodium
cp -r CanvApps/extension ~/.vscode-oss/extensions/canvapps-vscode
```

##### Windows (PowerShell):
```powershell
# For VS Code
Copy-Item -Recurse -Force .\CanvApps\extension $HOME\.vscode\extensions\canvapps-vscode

# For Cursor
Copy-Item -Recurse -Force .\CanvApps\extension $HOME\.cursor\extensions\canvapps-vscode
```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)

