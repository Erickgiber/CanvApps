# ⚠️ DEPRECATED — `@canvapps/vite-plugin`

> [!CAUTION]
> ### THIS PACKAGE HAS BEEN DEPRECATED
> **`@canvapps/vite-plugin` is deprecated and will no longer receive updates.**
>
> Please use [**`@canvapps/core`**](https://www.npmjs.com/package/@canvapps/core) instead.
>
> The official Vite plugin is now built-in and directly exported from **`@canvapps/core/vite`**. **`@canvapps/core`** is the **only official and actively maintained stable version**.

---

[![NPM Version](https://img.shields.io/npm/v/@canvapps/core?color=0284c7&label=%40canvapps%2Fcore)](https://www.npmjs.com/package/@canvapps/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/Erickgiber/CanvApps/blob/main/LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Erickgiber%2FCanvApps-181717?logo=github)](https://github.com/Erickgiber/CanvApps)
[![Website](https://img.shields.io/badge/Website-erickgiber.github.io%2FCanvApps-blue)](https://erickgiber.github.io/CanvApps)

---

## 🔄 Migration Guide

Migrating to `@canvapps/core` is seamless and only requires updating your import path.

### 1. Uninstall the deprecated package

```bash
# npm
npm uninstall @canvapps/vite-plugin

# pnpm
pnpm remove @canvapps/vite-plugin

# yarn
yarn remove @canvapps/vite-plugin

# bun
bun remove @canvapps/vite-plugin
```

### 2. Install `@canvapps/core`

Install the official stable package directly from NPM: 👉 [**`@canvapps/core` on npm**](https://www.npmjs.com/package/@canvapps/core)

```bash
# npm
npm install @canvapps/core

# pnpm
pnpm add @canvapps/core

# yarn
yarn add @canvapps/core

# bun
bun add @canvapps/core
```

### 3. Update your `vite.config.ts`

Replace the import from `@canvapps/vite-plugin` with `@canvapps/core/vite`:

```diff
  import { defineConfig } from 'vite';
- import canvappsPlugin from '@canvapps/vite-plugin';
+ import canvappsPlugin from '@canvapps/core/vite';

  export default defineConfig({
    plugins: [
      canvappsPlugin(),
    ],
  });
```

---

## 🌟 Why `@canvapps/core`?

- **Unified Architecture**: No need to manage separate package versions for the compiler, Vite plugin, and runtime engine.
- **Zero Version Mismatches**: Guarantees seamless compatibility between compiler transformations and reactive runtime signals.
- **Single Source of Truth**: All bug fixes, optimizations, and new features are released directly under `@canvapps/core`.
- **Single Dependency**: One clean dependency for your entire Canvas-native 120 FPS application.

---

## 🚀 Scaffolding a New Project

To create a new project with `@canvapps/core` pre-configured:

```bash
npm create canvapps@latest my-app
```

---

## 🔗 Official Links

- 📦 **NPM Package**: [https://www.npmjs.com/package/@canvapps/core](https://www.npmjs.com/package/@canvapps/core)
- 🐙 **GitHub Repository**: [https://github.com/Erickgiber/CanvApps](https://github.com/Erickgiber/CanvApps)
- 🌐 **Documentation & Demos**: [https://erickgiber.github.io/CanvApps](https://erickgiber.github.io/CanvApps)
- 🐞 **Issues & Support**: [https://github.com/Erickgiber/CanvApps/issues](https://github.com/Erickgiber/CanvApps/issues)

---

## 📄 License

MIT © [Erick Ramirez (Erickgiber)](https://github.com/Erickgiber)
