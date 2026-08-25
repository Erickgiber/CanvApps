# @canvapps/vite-plugin ⚡

Official [Vite](https://vitejs.dev/) plugin for compiling **[CanvApps](https://github.com/Erickgiber/CanvApps)** declarative `.cvs` Single-File Canvas UI Components with instant Hot Module Replacement (HMR).

---

## 📦 Installation

```bash
# Using npm
npm install -D @canvapps/vite-plugin @canvapps/core

# Using pnpm
pnpm add -D @canvapps/vite-plugin @canvapps/core

# Using yarn
yarn add -D @canvapps/vite-plugin @canvapps/core
```

---

## 🚀 Usage

Configure `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { canvappsPlugin } from '@canvapps/vite-plugin';

export default defineConfig({
  plugins: [
    canvappsPlugin(),
  ],
});
```

---

## 🎨 Single-File Component Example (`App.cvs`)

```html
<script lang="ts">
  import { signal } from '@canvapps/core';

  const count = signal(0);

  function increment() {
    count.update(n => n + 1);
  }
</script>

<view width="100%" height="100%" alignItems="center" justifyContent="center" gap="16">
  <text fontSize="24" color="#ffffff">
    Clicks: {count.value}
  </text>

  <button
    label="+ Click Me"
    backgroundColor="#2563eb"
    labelColor="#ffffff"
    padding="[10, 20]"
    onClick="increment()"
  />
</view>
```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
