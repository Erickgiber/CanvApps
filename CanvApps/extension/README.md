<p align="center">
  <a href="https://github.com/Erickgiber/CanvApps">
    <img src="https://raw.githubusercontent.com/Erickgiber/CanvApps/main/logo.svg" width="96" height="96" alt="CanvApps Logo" />
  </a>
</p>

<h1 align="center">CanvApps IDE Extension 🎨</h1>

<p align="center">
  <strong>Official IDE Extension for CanvApps: The 120 FPS Compiled Canvas UI Framework</strong><br>
  <em>Language support, syntax highlighting, definition navigation, and productivity snippets for <code>.cvs</code> Single-File Components.</em>
</p>

<p align="center">
  <a href="https://github.com/Erickgiber/CanvApps/blob/main/canvapps-vscode-0.1.0.vsix"><img src="https://img.shields.io/badge/VSIX-v0.1.0-blue.svg?style=flat-square" alt="VSIX Version" /></a>
  <a href="https://github.com/Erickgiber/CanvApps/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Platform-VS%20Code%20%7C%20Cursor%20%7C%20Windsurf%20%7C%20Antigravity-646CFF?style=flat-square" alt="Supported IDEs" />
</p>

---

## 🌟 Overview

Provides first-class editor tooling when authoring **[CanvApps](https://github.com/Erickgiber/CanvApps)** declarative `.cvs` Single-File Canvas UI Components across **Visual Studio Code**, **Cursor**, **Windsurf**, **VSCodium**, and **Google Antigravity IDE**.

### 📥 Direct Download Link
The extension is packaged and ready to install directly from the repository:  
👉 **[canvapps-vscode-0.1.0.vsix (Download on GitHub)](https://github.com/Erickgiber/CanvApps/blob/main/canvapps-vscode-0.1.0.vsix)**

---

## ✨ Features

* 🌈 **Full Syntax Highlighting:** Embedded TypeScript syntax inside `<script lang="ts">`, Canvas template tags (`<view>`, `<text>`, `<button>`, `<input>`, `<motion>`, `<modal>`, `<slot>`), directives (`@if`, `@each`), dynamic attributes (`:value`, `:gap`), and reactive events (`@click`, `@input`, `@finish`).
* 🔍 **Go to Definition (`Cmd+Click` / `Ctrl+Click`):** Jump directly from template event handlers and reactive bindings to their declaration inside `<script lang="ts">`.
* 💡 **Intelligent Autocompletion:** Fast suggestions for Canvas layout props, reactive bindings, colors, and events.
* ⚡ **Productivity Snippets:**
  * `cvs-component` → Full `.cvs` Single-File Component template.
  * `cvs-view` → Mathematical Flexbox layout container.
  * `cvs-text` → Typography node with bindings.
  * `cvs-button` → Interactive button with hover/active states.
  * `cvs-input` → Ghost DOM-synchronized text input.
  * `cvs-motion` → Hardware-timed motion animation wrapper.
  * `cvs-modal` → Hero shared-element morph modal dialog.
  * `cvs-signal` / `cvs-store` → Reactive state and store templates.
* 🛠️ **Tag Auto-Closing & Bracket Matching:** Native editor ergonomics for `.cvs` files.

---

## 📦 How to Install

### Method 1: Visual Installation (GUI)
1. Download the [**`canvapps-vscode-0.1.0.vsix`**](https://github.com/Erickgiber/CanvApps/blob/main/canvapps-vscode-0.1.0.vsix) file.
2. In your IDE (**VS Code**, **Cursor**, **Windsurf**, **VSCodium**, or **Antigravity IDE**), open the **Extensions** panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the three dots menu (**`···`**) at the top right of the Extensions panel.
4. Select **"Install from VSIX..."** (*Instalar desde VSIX...*).
5. Choose the downloaded `canvapps-vscode-0.1.0.vsix` file and reload the editor.

### Method 2: Command Line (CLI)
```bash
# Download the VSIX file directly
curl -LO https://raw.githubusercontent.com/Erickgiber/CanvApps/main/canvapps-vscode-0.1.0.vsix

# Visual Studio Code
code --install-extension canvapps-vscode-0.1.0.vsix

# Cursor IDE
cursor --install-extension canvapps-vscode-0.1.0.vsix

# Windsurf IDE
windsurf --install-extension canvapps-vscode-0.1.0.vsix

# VSCodium
codium --install-extension canvapps-vscode-0.1.0.vsix
```

### Method 3: Local Extension Link (Development)
```bash
# VS Code
cp -r CanvApps/extension ~/.vscode/extensions/canvapps-vscode

# Cursor
cp -r CanvApps/extension ~/.cursor/extensions/canvapps-vscode
```

---

## 📄 License

MIT © [Erickgiber](https://github.com/Erickgiber)
