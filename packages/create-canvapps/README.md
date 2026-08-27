# create-canvapps 🎨

Scaffold a new **CanvApps** project — the 120 FPS Canvas UI Framework.

## 🚀 Create a Project

```bash
npm create canvapps@latest my-app
cd my-app
npm install
npm run dev
```

### Other package managers

```bash
# pnpm
pnpm create canvapps my-app

# yarn
yarn create canvapps my-app

# bun
bun create canvapps my-app
```

### Or install globally

```bash
npm install -g create-canvapps
create-canvapps my-app
```

## 📁 What you get

```
my-app/
├── public/
│   └── favicon.svg          # CanvApps logo
├── src/
│   ├── App.cvs               # Starter component (counter + theme toggle)
│   ├── main.ts                # App entry point
│   └── canvapps-env.d.ts      # TypeScript declarations for .cvs files
├── index.html                 # Canvas-optimized HTML shell
├── vite.config.ts             # Vite + CanvApps plugin pre-configured
├── canvapps.config.ts         # Build target config (SPA/PWA/Capacitor)
├── tsconfig.json
└── package.json
```

## 📦 Included out of the box

- **Vite + CanvApps Plugin** — Instant HMR for `.cvs` files
- **TypeScript** — Type definitions for Canvas nodes and signals
- **Multi-Target Config** — SPA, PWA, or Capacitor from `canvapps.config.ts`
- **Starter Template** — Working counter + theme toggle at 120 FPS

## 🛠️ Commands

```bash
npm run dev       # Start dev server (Vite + HMR)
npm run build     # Production build
npm run preview   # Preview production build
npm run format    # Format .cvs files
```

## 📚 Documentation

Full docs → [github.com/Erickgiber/CanvApps](https://github.com/Erickgiber/CanvApps)

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
