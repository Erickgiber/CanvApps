# CanvApps IDE Extension 🎨

Official IDE Extension providing language support, syntax highlighting, definition navigation, and productivity snippets for **[CanvApps](https://github.com/Erickgiber/CanvApps)** declarative `.cvs` Single-File Components.

> **CanvApps: The first compiled UI framework that renders at 120 FPS by eliminating the DOM. Svelte-like syntax, native performance.**

Supports **Visual Studio Code**, **Cursor**, **VSCodium**, **Windsurf**, and **Google Antigravity IDE**.

---

## ✨ Features

* 🌈 **Full Syntax Highlighting:** Embedded TypeScript syntax inside `<script lang="ts">`, Canvas template tags (`<view>`, `<text>`, `<button>`, `<input>`, `<motion>`, `<modal>`, `<slot>`), directives (`@if`, `@each`, `{#if}`, `{#each}`), dynamic attributes (`:value`, `:gap`), and reactive events (`@click`, `@input`, `@finish`).
* 🔍 **Go to Definition (`Cmd+Click` / `Ctrl+Click`):** Jump directly from template event handlers and reactive bindings to their declaration inside `<script lang="ts">`.
* 💡 **Intelligent Autocompletion:** Fast suggestions for Canvas layout props, reactive bindings, and events.
* ⚡ **Productivity Snippets:**
  * `cvs-component` → Full `.cvs` Single-File Component template.
  * `cvs-view` → Flexbox layout container.
  * `cvs-text` → Typography node with bindings.
  * `cvs-button` → Interactive button with hover/active states.
  * `cvs-input` → Ghost DOM-synchronized text input.
  * `cvs-motion` → Hardware-timed motion animation wrapper.
  * `cvs-modal` → Hero shared-element morph modal dialog.
  * `cvs-signal` / `cvs-store` → Reactive state and store templates.
* 🛠️ **Tag Auto-Closing & Bracket Matching:** Native editor ergonomics for `.cvs` files.

---

## 📦 Installation

### Method 1: Command Line (CLI)

```bash
# Visual Studio Code
code --install-extension canvapps-vscode-0.1.0.vsix

# Cursor IDE
cursor --install-extension canvapps-vscode-0.1.0.vsix

# VSCodium
codium --install-extension canvapps-vscode-0.1.0.vsix

# Windsurf IDE
windsurf --install-extension canvapps-vscode-0.1.0.vsix
```

### Method 2: Local Extension Link (Development)

```bash
# VS Code
cp -r CanvApps/extension ~/.vscode/extensions/canvapps-vscode

# Cursor
cp -r CanvApps/extension ~/.cursor/extensions/canvapps-vscode
```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
