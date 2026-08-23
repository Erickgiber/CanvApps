import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves a module specifier to an absolute file path on disk.
 */
function resolveImportPath(baseDir: string, importPath: string): string | null {
  const extensions = ['', '.cvs', '.ts', '.tsx', '.js', '/index.ts', '/index.cvs', '/index.js'];
  for (const ext of extensions) {
    const candidate = path.resolve(baseDir, importPath + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * CanvApps Extension Activation
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. Definition Provider (Cmd+Click / Ctrl+Click on functions, signals, variables, stores, and components)
  const definitionProvider = vscode.languages.registerDefinitionProvider('canvapps', {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z0-9_$]+/);
      if (!wordRange) {
        return null;
      }

      const word = document.getText(wordRange);
      if (!word) {
        return null;
      }

      const text = document.getText();
      const currentDir = path.dirname(document.uri.fsPath);

      // Extract <script> block
      const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/i;
      const scriptMatch = scriptRegex.exec(text);

      if (scriptMatch) {
        const scriptContent = scriptMatch[1];
        const scriptStartIndex = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

        // A. Search for local definitions (function, const, let, var, class, type, interface) in <script>
        const localDefRegex = new RegExp(
          `(?:function\\s+${word}\\b|(?:const|let|var)\\s+${word}\\b|class\\s+${word}\\b|type\\s+${word}\\b|interface\\s+${word}\\b|enum\\s+${word}\\b)`,
          'g'
        );

        let localMatch: RegExpExecArray | null;
        while ((localMatch = localDefRegex.exec(scriptContent)) !== null) {
          const matchOffset = scriptStartIndex + localMatch.index;
          const targetPos = document.positionAt(matchOffset);
          return new vscode.Location(document.uri, targetPos);
        }

        // B. Search for imported symbols in <script>
        const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
        let impMatch: RegExpExecArray | null;

        while ((impMatch = importRegex.exec(scriptContent)) !== null) {
          const importClause = impMatch[1].trim();
          const importSource = impMatch[2].trim();

          const resolvedFilePath = resolveImportPath(currentDir, importSource);
          if (!resolvedFilePath) continue;

          // Case B1: Default import (e.g. `import DashboardView from './views/DashboardView.cvs'`)
          const defaultImportMatch = importClause.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
          if (defaultImportMatch && defaultImportMatch[0] === word) {
            return new vscode.Location(vscode.Uri.file(resolvedFilePath), new vscode.Position(0, 0));
          }

          // Case B2: Named imports (e.g. `import { sessionStore, navigateRoute } from './stores/session.store'`)
          if (importClause.includes('{') && importClause.includes('}')) {
            const namedClause = importClause.substring(importClause.indexOf('{') + 1, importClause.indexOf('}'));
            const specifiers = namedClause.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);

            if (specifiers.includes(word)) {
              try {
                const targetContent = fs.readFileSync(resolvedFilePath, 'utf8');
                const targetDefRegex = new RegExp(
                  `(?:export\\s+(?:const|let|var|function|class|type|interface|enum)\\s+${word}\\b|(?:const|let|var|function|class|type|interface|enum)\\s+${word}\\b)`,
                  'm'
                );
                const targetMatch = targetDefRegex.exec(targetContent);

                if (targetMatch) {
                  const linesBefore = targetContent.substring(0, targetMatch.index).split('\n');
                  const lineNum = linesBefore.length - 1;
                  const charNum = linesBefore[linesBefore.length - 1].length;
                  return new vscode.Location(vscode.Uri.file(resolvedFilePath), new vscode.Position(lineNum, charNum));
                }
              } catch {
                // Fallback to top of file
              }
              return new vscode.Location(vscode.Uri.file(resolvedFilePath), new vscode.Position(0, 0));
            }
          }
        }
      }

      return null;
    },
  });

  // 2. Hover Provider (Provides instant documentation on CanvApps built-in elements & directives)
  const hoverProvider = vscode.languages.registerHoverProvider('canvapps', {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
      const wordRange = document.getWordRangeAtPosition(position, /[@:A-Za-z0-9_$-]+/);
      if (!wordRange) return null;

      const word = document.getText(wordRange);

      const docs: Record<string, string> = {
        view: '### `<view>` (Pure Canvas 2D Flexbox Container)\n\nUniversal layout container rendered directly on Canvas 2D using sub-pixel flexbox math.',
        text: '### `<text>` (Direct Canvas Text Node)\n\nHardware-accelerated text rendering with automatic line-breaking and sub-pixel glyph alignment.',
        button: '### `<button>` (Interactive Canvas Button)\n\nZero-DOM interactive button with built-in hover, active, and focus states.',
        input: '### `<input>` (Ghost DOM Input Node)\n\nCombines native IME touch keyboard entry and clipboard support with Pure Canvas rendering.',
        modal: '### `<modal>` (Fullscreen Canvas Dialog Overlay)\n\nFrosted glass blur, radial gradient backdrops, and animated dialog cards with zero DOM overhead.',
        motion: '### `<motion>` (GPU-Timed Motion Wrapper)\n\nSpring physics and timeline animations (`scale-in`, `fade`, `slide-up`, `cinematic-splash`).',
        slot: '### `<slot />` (Dynamic Layout Outlet)\n\nRenders child scene content injected from parent layouts.',
        '@if': '### `@if (condition) { ... }`\n\nConditional directive that dynamically mounts or unmounts branches based on reactive signals.',
        '@each': '### `@each array as item, index { ... }`\n\nReactive iteration directive that projects an array of items without Virtual DOM diffing.',
        '@click': '### `@click="handler"`\n\nFires on pointer release when coordinates match element bounding box.',
        signal: '### `signal(initialValue)`\n\nCreates a fine-grained reactive Signal in direct memory.',
        computed: '### `computed(() => expr)`\n\nCreates a memoized reactive value that updates only when dependencies change.',
      };

      if (docs[word]) {
        return new vscode.Hover(new vscode.MarkdownString(docs[word]));
      }

      return null;
    },
  });

  // 3. Completion Item Provider (Suggesting events, directives, attributes, and script symbols)
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'canvapps',
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const items: vscode.CompletionItem[] = [];

        // A. Event completions (@click, @input, @submit, @hover, etc.)
        if (linePrefix.endsWith('@') || /@\w*$/.test(linePrefix)) {
          const events = [
            { name: 'click', doc: 'Fires when a pointer clicks the element.', snippet: '@click="${1:handleClick}"' },
            { name: 'submit', doc: 'Fires when user submits an input via Enter key.', snippet: '@submit="${1:handleSubmit}"' },
            { name: 'input', doc: 'Fires in real-time when text input changes.', snippet: '@input="${1:handleInput}"' },
            { name: 'change', doc: 'Fires when an input value is committed.', snippet: '@change="${1:handleChange}"' },
            { name: 'hover', doc: 'Fires when pointer enters element bounds.', snippet: '@hover="${1:handleHover}"' },
            { name: 'pointerdown', doc: 'Fires when pointer button is pressed.', snippet: '@pointerdown="${1:onPointerDown}"' },
            { name: 'pointerup', doc: 'Fires when pointer button is released.', snippet: '@pointerup="${1:onPointerUp}"' },
            { name: 'pointermove', doc: 'Fires when pointer moves across the element.', snippet: '@pointermove="${1:onPointerMove}"' },
            { name: 'pointerenter', doc: 'Fires when pointer enters element bounds.', snippet: '@pointerenter="${1:onPointerEnter}"' },
            { name: 'pointerleave', doc: 'Fires when pointer leaves element bounds.', snippet: '@pointerleave="${1:onPointerLeave}"' },
            { name: 'dblclick', doc: 'Fires on rapid double-click.', snippet: '@dblclick="${1:handleDblClick}"' },
            { name: 'keydown', doc: 'Fires when a key is pressed down.', snippet: '@keydown="${1:handleKeyDown}"' },
            { name: 'keyup', doc: 'Fires when a key is released.', snippet: '@keyup="${1:handleKeyUp}"' },
            { name: 'focus', doc: 'Fires when the element gains focus.', snippet: '@focus="${1:handleFocus}"' },
            { name: 'blur', doc: 'Fires when the element loses focus.', snippet: '@blur="${1:handleBlur}"' },
            { name: 'each', doc: 'Iterates an array reactively (Svelte-style @each rows as row).', snippet: '@each="${1:items.value} as ${2:item}, ${3:index}"' },
            { name: 'if', doc: 'Conditionally renders the element.', snippet: '@if="${1:condition.value}"' },
          ];

          for (const ev of events) {
            const item = new vscode.CompletionItem(`@${ev.name}`, vscode.CompletionItemKind.Event);
            item.detail = `CanvApps Event @${ev.name}`;
            item.documentation = new vscode.MarkdownString(ev.doc);
            item.insertText = new vscode.SnippetString(ev.snippet);
            items.push(item);
          }
          return items;
        }

        // B. Reactive Property Bindings (:value, :color, :fontSize, etc.)
        if (linePrefix.endsWith(':') || /:\w*$/.test(linePrefix)) {
          const dynamicProps = [
            { name: 'value', doc: 'Two-way reactive value binding for UIInput.' },
            { name: 'text', doc: 'Dynamic text content binding.' },
            { name: 'label', doc: 'Dynamic button label binding.' },
            { name: 'backgroundColor', doc: 'Dynamic background color binding.' },
            { name: 'color', doc: 'Dynamic text color binding.' },
            { name: 'fontSize', doc: 'Dynamic font size binding.' },
            { name: 'padding', doc: 'Dynamic padding binding ([top, right, bottom, left] or number).' },
            { name: 'gap', doc: 'Dynamic flex gap binding.' },
            { name: 'width', doc: 'Dynamic width binding (number or percentage string).' },
            { name: 'height', doc: 'Dynamic height binding (number or percentage string).' },
            { name: 'flexDirection', doc: 'Dynamic flex direction ("row" | "column").' },
            { name: 'alignItems', doc: 'Dynamic flex cross-axis alignment.' },
            { name: 'justifyContent', doc: 'Dynamic flex main-axis alignment.' },
            { name: 'borderRadius', doc: 'Dynamic border radius binding.' },
            { name: 'borderColor', doc: 'Dynamic border color binding.' },
            { name: 'borderWidth', doc: 'Dynamic border width binding.' },
            { name: 'opacity', doc: 'Dynamic opacity binding (0.0 to 1.0).' },
            { name: 'selectable', doc: 'Controls whether text can be selected and copied (boolean).' },
          ];

          for (const prop of dynamicProps) {
            const item = new vscode.CompletionItem(`:${prop.name}`, vscode.CompletionItemKind.Property);
            item.detail = `CanvApps Binding :${prop.name}`;
            item.documentation = new vscode.MarkdownString(prop.doc);
            item.insertText = new vscode.SnippetString(`:${prop.name}="\${1:${prop.name}.value}"`);
            items.push(item);
          }
          return items;
        }

        // C. Standard Tag Attributes
        const staticProps = [
          'width', 'height', 'flexDirection', 'alignItems', 'justifyContent', 'flexGrow',
          'padding', 'gap', 'backgroundColor', 'borderRadius', 'borderWidth', 'borderColor',
          'fontSize', 'fontWeight', 'color', 'placeholder', 'placeholderColor', 'focusBorderColor',
          'cursor', 'label', 'labelColor', 'hoverBackgroundColor', 'activeBackgroundColor', 'selectable'
        ];

        for (const p of staticProps) {
          const item = new vscode.CompletionItem(p, vscode.CompletionItemKind.Field);
          item.detail = `CanvApps Attribute: ${p}`;
          item.insertText = new vscode.SnippetString(`${p}="\${1}"`);
          items.push(item);
        }

        return items;
      },
    },
    '@', ':', '<', '"', ' '
  );

  context.subscriptions.push(definitionProvider, hoverProvider, completionProvider);
}

export function deactivate(): void {}
